import struct
import zlib

from fastapi.testclient import TestClient

from app.gemini_adapter import (
    GeminiAdapterError,
    GeminiAdapterResult,
    GeminiFinding,
    GeminiStructuredAnalysis,
)
from app.main import app

client = TestClient(app)


def png_image(width=1, height=1):
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    scanlines = b"".join(b"\x00" + (b"\x00\x00\x00" * width) for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(scanlines))
        + chunk(b"IEND", b"")
    )


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
        files={"image": ("lesion.png", png_image(), "image/png")},
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


def test_form_validation_uses_stable_failure_envelope():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.png", png_image(), "image/png")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "requestId": "request-invalid-form",
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": {
            "failureCode": "INVALID_PROVIDER_REQUEST",
            "requestId": "request-invalid-form",
        }
    }


def test_experimental_demo_is_explicit_and_not_presented_as_model_result(monkeypatch):
    monkeypatch.setenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "true")

    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.png", png_image(), "image/png")},
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
        files={"image": ("eye.png", png_image(), "image/png")},
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


def test_gemini_multimodal_result_preserves_mode_and_limitations(monkeypatch):
    class FakeGeminiAdapter:
        model = "gemini-test"

        def is_configured(self):
            return True

        async def analyze(self, **_kwargs):
            return GeminiAdapterResult(
                model=self.model,
                model_version="test-version",
                analysis=GeminiStructuredAnalysis(
                    findings=[GeminiFinding(finding="피부 발적 소견", confidence=72.5)],
                    limitations=["사진 한 장만 분석했습니다."],
                ),
            )

    monkeypatch.setattr("app.main.get_gemini_adapter", lambda: FakeGeminiAdapter())

    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.png", png_image(), "image/png")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": '["가려움/긁음"]',
            "description": "붉은 부위를 계속 긁습니다.",
            "requestId": "request-gemini",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "GEMINI_MULTIMODAL"
    assert body["model"] == "gemini-test"
    assert body["modelVersion"] == "test-version"
    assert body["predictions"] == [
        {"diseaseName": "피부 발적 소견", "probability": 72.5}
    ]
    assert any("임상 확률" in limitation for limitation in body["limitations"])


def test_inference_rejects_image_larger_than_ten_megabytes():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("oversized.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-too-large",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"]["failureCode"] == "IMAGE_TOO_LARGE"


def test_inference_rejects_declared_jpeg_with_gif_body():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("spoofed.jpg", b"GIF89a", "image/jpeg")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-spoofed",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["failureCode"] == "INVALID_IMAGE"


def test_inference_rejects_direct_webp_until_internal_decoder_is_available():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.webp", b"RIFF\x00\x00\x00\x00WEBP", "image/webp")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-webp",
        },
    )

    assert response.status_code == 415
    assert response.json()["detail"]["failureCode"] == "UNSUPPORTED_MEDIA_TYPE"


def test_inference_rejects_excessive_image_dimensions():
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("wide.png", png_image(width=8001), "image/png")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-wide",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"]["failureCode"] == "IMAGE_DIMENSIONS_TOO_LARGE"


def test_unknown_provider_failure_is_normalized(monkeypatch):
    class UnknownFailureAdapter:
        model = "gemini-test"

        def is_configured(self):
            return True

        async def analyze(self, **_kwargs):
            raise GeminiAdapterError("INTERNAL_PROVIDER_DETAIL")

    monkeypatch.setattr("app.main.get_gemini_adapter", lambda: UnknownFailureAdapter())
    response = client.post(
        "/v1/diagnoses/infer",
        files={"image": ("lesion.png", png_image(), "image/png")},
        data={
            "petId": "1",
            "species": "DOG",
            "affectedArea": "SKIN",
            "symptoms": "[]",
            "description": "환부 설명",
            "requestId": "request-normalized",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"]["failureCode"] == "PROVIDER_UNAVAILABLE"
