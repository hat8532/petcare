from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_version_expose_service_state():
    assert client.get("/health").json() == {"status": "UP"}

    version = client.get("/version")
    assert version.status_code == 200
    assert version.json()["serviceVersion"] == "0.1.0"
    assert version.json()["modelAvailable"] is False


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
