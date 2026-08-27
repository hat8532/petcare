from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_version_expose_service_state():
    assert client.get("/health").json() == {"status": "UP"}

    version = client.get("/version")
    assert version.status_code == 200
    assert version.json()["serviceVersion"] == "0.1.0"
    assert version.json()["modelAvailable"] is False
    assert version.json()["modelStateCode"] == "MODEL_MANIFEST_MISSING"


def test_inference_returns_model_unavailable_without_artifact():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.jpg", b"\xff\xd8\xff\x00", "image/jpeg")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": '["가려움/긁음"]',
            "description": "붉은 부위를 계속 긁습니다.",
            "requestId": "request-001",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"]["failureCode"] == "MODEL_UNAVAILABLE"
    assert response.json()["detail"]["reasonCode"] == "MODEL_MANIFEST_MISSING"
    assert response.json()["detail"]["requestId"] == "request-001"


def test_inference_rejects_unsupported_media_type_first():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.gif", b"GIF89a", "image/gif")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-002",
        },
    )

    assert response.status_code == 415
    assert response.json()["detail"]["failureCode"] == "UNSUPPORTED_MEDIA_TYPE"


def test_experimental_demo_is_explicit_and_not_presented_as_model_result(monkeypatch):
    monkeypatch.setenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "true")

    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.jpg", b"\xff\xd8\xff\x00", "image/jpeg")},
        data={
            "petId": "1",
            "species": "CAT",
            "affectedArea": "SKIN",
            "symptoms": '["가려움/긁음"]',
            "description": "구조 확인",
            "requestId": "request-demo",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "EXPERIMENTAL_DEMO"
    assert body["model"] == "petcare-contract-demo"
    assert body["failureCode"] is None
    assert "실제 판정 아님" in body["predictions"][0]["diseaseName"]
    assert any("임상 정확도" in limitation for limitation in body["limitations"])


def test_experimental_demo_rejects_out_of_scope_area(monkeypatch):
    monkeypatch.setenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "true")

    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("eye.jpg", b"\xff\xd8\xff\x00", "image/jpeg")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "EYE",
            "symptoms": "[]",
            "description": "구조 확인",
            "requestId": "request-out-of-scope",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"]["failureCode"] == "OUT_OF_SCOPE"
