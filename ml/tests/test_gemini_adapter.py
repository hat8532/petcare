import asyncio
import base64
import json

import httpx
from app.gemini_adapter import GeminiAdapterError, GeminiMultimodalAdapter


def test_sends_inline_image_and_validates_structured_response():
    captured_request = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured_request["headers"] = request.headers
        captured_request["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "modelVersion": "gemini-test-version",
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "findings": [
                                                {"finding": "피부 발적 소견", "confidence": 72.5}
                                            ],
                                            "limitations": ["사진 한 장만 분석했습니다."],
                                        },
                                        ensure_ascii=False,
                                    )
                                }
                            ]
                        }
                    }
                ],
            },
        )

    adapter = GeminiMultimodalAdapter(
        api_key="test-key",
        model="gemini-test",
        transport=httpx.MockTransport(handler),
    )
    result = asyncio.run(
        adapter.analyze(
            image_bytes=b"image-bytes",
            mime_type="image/jpeg",
            species="DOG",
            affected_area="SKIN",
            symptoms='["가려움"]',
            description="붉은 부위",
        )
    )

    assert result.model == "gemini-test"
    assert result.model_version == "gemini-test-version"
    assert result.analysis.findings[0].finding == "피부 발적 소견"
    assert captured_request["headers"]["x-goog-api-key"] == "test-key"
    inline_data = captured_request["body"]["contents"][0]["parts"][1]["inlineData"]
    assert base64.b64decode(inline_data["data"]) == b"image-bytes"
    assert captured_request["body"]["generationConfig"]["responseMimeType"] == "application/json"


def test_rejects_response_outside_structured_contract():
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {"content": {"parts": [{"text": '{"findings": [], "limitations": []}'}]}}
                ]
            },
        )

    adapter = GeminiMultimodalAdapter(
        api_key="test-key",
        transport=httpx.MockTransport(handler),
    )

    try:
        asyncio.run(adapter.analyze(b"image", "image/jpeg", "DOG", "SKIN", "[]", "설명"))
        raise AssertionError("GeminiAdapterError was not raised")
    except GeminiAdapterError as error:
        assert error.failure_code == "INVALID_PROVIDER_RESPONSE"


def test_maps_rate_limit_without_leaking_provider_body():
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "sensitive provider detail"}})

    adapter = GeminiMultimodalAdapter(
        api_key="test-key",
        transport=httpx.MockTransport(handler),
    )

    try:
        asyncio.run(adapter.analyze(b"image", "image/jpeg", "DOG", "SKIN", "[]", "설명"))
        raise AssertionError("GeminiAdapterError was not raised")
    except GeminiAdapterError as error:
        assert error.failure_code == "PROVIDER_RATE_LIMITED"
        assert "sensitive" not in str(error)
