"""48개 메뉴의 연결 검증. 사진 판독의 실제 정확도를 측정하는 테스트는 아니다."""
import asyncio
import itertools
import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.analysis_scope import SPECIES, AREAS, finding_codes, NO_VISIBLE_FINDINGS, NO_MATCHED_EVIDENCE
from app.gemini_adapter import GeminiMultimodalAdapter, GeminiAdapterError, FINDING_LABELS
from app.main import app
from app.rag_retriever import RagRetriever
from test_api import png_image
from test_gemini_adapter import provider_response


@pytest.mark.parametrize("species,area", list(itertools.product(SPECIES, AREAS)))
@pytest.mark.parametrize("empty", [False, True], ids=["외형소견", "소견없음"])
def test_all_menu_combinations_reach_real_adapter_and_preserve_scope(monkeypatch, species, area, empty):
    captured = []
    custom = "오른쪽 꼬리 끝" if area == "CUSTOM" else "이전 숨긴 부위"
    evidence = RagRetriever().search(species, area, "눈 귀 구강 가려움 코 호흡 배 식욕 피부")

    def handler(request):
        payload = json.loads(request.content)
        captured.append(payload)
        if len(captured) == 1:
            return provider_response({"imageSuitable": True, "reasonCode": "CLEAR_PET_AREA"})
        code = sorted(finding_codes(species, area))[0]
        return provider_response({
            "findings": [] if empty else [{"findingCode": code, "confidence": 61}],
            "relevantSourceIds": [item.source_id for item in evidence],
            "limitationCodes": ["SINGLE_IMAGE_ONLY"],
        })

    monkeypatch.setenv("PETCARE_GEMINI_ENABLED", "true")
    monkeypatch.setenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "false")
    adapter = GeminiMultimodalAdapter(api_key="test-key", transport=httpx.MockTransport(handler))
    monkeypatch.setattr("app.main.get_gemini_adapter", lambda: adapter)
    response = TestClient(app).post(
        "/v1/diagnoses/infer", files={"image": ("area.png", png_image(), "image/png")},
        data={"petId": 1, "species": species, "affectedArea": area, "customAreaText": custom,
              "symptoms": "[]", "description": "눈 귀 구강 가려움 코 호흡 배 식욕 피부", "requestId": "scope-test"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["failureCode"] is None
    assert body["requestId"] == "scope-test"
    assert len(captured) == 2
    gate = captured[0]["contents"][0]["parts"][0]["text"]
    prompt = captured[1]["contents"][0]["parts"][0]["text"]
    assert SPECIES[species] in gate and AREAS[area] in gate
    assert species in prompt and area in prompt
    if area == "CUSTOM":
        assert custom in gate and custom in prompt
    else:
        assert custom not in gate and custom not in prompt
    schema = captured[1]["generationConfig"]["responseSchema"]
    assert set(schema["properties"]["findings"]["items"]["properties"]["findingCode"]["enum"]) == finding_codes(species, area)
    assert body["mode"] == ("GEMINI_RAG_PROTOTYPE" if evidence else "GEMINI_MULTIMODAL")
    assert len(body["ragSources"]) == len(evidence)
    if not evidence:
        assert body["ragReport"] is None
        assert NO_MATCHED_EVIDENCE in body["limitations"]
    if empty:
        assert body["predictions"] == []
        assert NO_VISIBLE_FINDINGS in body["limitations"]
    else:
        assert body["predictions"][0]["diseaseName"] in [FINDING_LABELS[code] for code in finding_codes(species, area)]


@pytest.mark.parametrize("species,area,code", [
    ("BIRD", "SKIN", "HAIR_LOSS"), ("DOG", "SKIN", "FEATHER_CHANGE"),
    ("DOG", "EYE", "HAIR_LOSS"), ("CAT", "ABDOMEN", "EYE_CLOUDING"),
    ("DOG", "MOUTH", "BEAK_CHANGE"), ("BIRD", "SKIN", "PNEUMONIA"),
])
def test_wrong_species_or_area_finding_is_rejected_even_if_provider_ignores_schema(species, area, code):
    count = 0
    def handler(_request):
        nonlocal count
        count += 1
        if count == 1:
            return provider_response({"imageSuitable": True, "reasonCode": "CLEAR_PET_AREA"})
        return provider_response({"findings": [{"findingCode": code, "confidence": 80}],
                                  "relevantSourceIds": [], "limitationCodes": ["SINGLE_IMAGE_ONLY"]})
    adapter = GeminiMultimodalAdapter(api_key="test-key", transport=httpx.MockTransport(handler))
    with pytest.raises(GeminiAdapterError, match="INVALID_PROVIDER_RESPONSE"):
        asyncio.run(adapter.analyze(b"image", "image/jpeg", species, area, "[]", "설명", []))


@pytest.mark.parametrize("reason", ["SPECIES_MISMATCH", "AREA_MISMATCH", "LOW_QUALITY"])
def test_scope_or_quality_gate_stops_before_analysis(reason):
    count = 0
    def handler(_request):
        nonlocal count
        count += 1
        return provider_response({"imageSuitable": False, "reasonCode": reason})
    adapter = GeminiMultimodalAdapter(api_key="test-key", transport=httpx.MockTransport(handler))
    with pytest.raises(GeminiAdapterError, match="PROVIDER_REJECTED"):
        asyncio.run(adapter.analyze(b"image", "image/jpeg", "RABBIT", "EYE", "[]", "설명", []))
    assert count == 1


@pytest.mark.parametrize("species,area,custom,code", [
    ("FISH", "SKIN", "", "OUT_OF_SCOPE"), ("DOG", "HEART", "", "OUT_OF_SCOPE"),
    ("DOG", "CUSTOM", "  ", "INVALID_INPUT"),
])
def test_unknown_scope_and_missing_custom_text_fail_before_provider(species, area, custom, code):
    response = TestClient(app).post(
        "/v1/diagnoses/infer", files={"image": ("area.png", png_image(), "image/png")},
        data={"petId": 1, "species": species, "affectedArea": area, "customAreaText": custom,
              "symptoms": "[]", "description": "설명", "requestId": "invalid-scope"},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["failureCode"] == code


def test_corpus_never_crosses_species_or_area_and_broad_buckets_do_not_borrow_sources():
    corpus = json.loads((Path(__file__).parents[1] / "knowledge/veterinary_skin_prototype.json").read_text())
    documents = {d["id"]: d for d in corpus["documents"]}
    retriever = RagRetriever()
    query = "눈 귀 구강 치아 가려움 콧물 호흡 구토 배 식욕 피부 깃털 관절 절뚝"
    for species, area in itertools.product(SPECIES, AREAS):
        for hit in retriever.search(species, area, query):
            assert species in documents[hit.source_id]["species"]
            assert area in documents[hit.source_id]["areas"]
    for species in ("HAMSTER", "OTHER"):
        for area in AREAS:
            assert retriever.search(species, area, query) == []
    for area in ("EYE", "EAR", "MOUTH", "PAW_LIMB", "NOSE_RESPIRATORY", "ABDOMEN"):
        assert retriever.search("DOG", area, query), area
