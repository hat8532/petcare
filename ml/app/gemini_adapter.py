import base64
import json
import os
from dataclasses import dataclass

import httpx
from pydantic import BaseModel, Field, ValidationError, field_validator


DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-3.1-flash-lite"


class GeminiFinding(BaseModel):
    finding: str = Field(min_length=1, max_length=80)
    confidence: float = Field(ge=0, le=100)

    @field_validator("finding")
    @classmethod
    def normalize_finding(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("finding must not be blank")
        return normalized


class GeminiStructuredAnalysis(BaseModel):
    findings: list[GeminiFinding] = Field(min_length=1, max_length=3)
    limitations: list[str] = Field(min_length=1, max_length=5)

    @field_validator("limitations")
    @classmethod
    def normalize_limitations(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values if value.strip()]
        if not normalized:
            raise ValueError("limitations must not be empty")
        return normalized


@dataclass(frozen=True)
class GeminiAdapterResult:
    model: str
    model_version: str | None
    analysis: GeminiStructuredAnalysis


class GeminiAdapterError(Exception):
    def __init__(self, failure_code: str):
        super().__init__(failure_code)
        self.failure_code = failure_code


class GeminiMultimodalAdapter:
    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: float = 15.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key.strip()
        self.model = model.strip() or DEFAULT_MODEL
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.transport = transport

    @classmethod
    def from_environment(cls) -> "GeminiMultimodalAdapter":
        return cls(
            api_key=os.getenv("PETCARE_GEMINI_API_KEY", ""),
            model=os.getenv("PETCARE_GEMINI_MODEL", DEFAULT_MODEL),
            base_url=os.getenv("PETCARE_GEMINI_BASE_URL", DEFAULT_BASE_URL),
        )

    def is_configured(self) -> bool:
        return (
            os.getenv("PETCARE_GEMINI_ENABLED", "false").lower() == "true"
            and bool(self.api_key)
        )

    async def analyze(
        self,
        image_bytes: bytes,
        mime_type: str,
        species: str,
        affected_area: str,
        symptoms: str,
        description: str,
    ) -> GeminiAdapterResult:
        if not image_bytes:
            raise GeminiAdapterError("INVALID_INPUT")

        request_body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": self._prompt(
                                species, affected_area, symptoms, description
                            )
                        },
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "candidateCount": 1,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "findings": {
                            "type": "ARRAY",
                            "minItems": 1,
                            "maxItems": 3,
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "finding": {"type": "STRING"},
                                    "confidence": {
                                        "type": "NUMBER",
                                        "minimum": 0,
                                        "maximum": 100,
                                    },
                                },
                                "required": ["finding", "confidence"],
                            },
                        },
                        "limitations": {
                            "type": "ARRAY",
                            "minItems": 1,
                            "maxItems": 5,
                            "items": {"type": "STRING"},
                        },
                    },
                    "required": ["findings", "limitations"],
                },
            },
        }

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.post(
                    f"{self.base_url}/models/{self.model}:generateContent",
                    headers={"x-goog-api-key": self.api_key},
                    json=request_body,
                )
        except httpx.TimeoutException as exception:
            raise GeminiAdapterError("INFERENCE_TIMEOUT") from exception
        except httpx.HTTPError as exception:
            raise GeminiAdapterError("PROVIDER_UNAVAILABLE") from exception

        if response.status_code in {401, 403}:
            raise GeminiAdapterError("PROVIDER_AUTH_FAILED")
        if response.status_code == 400:
            raise GeminiAdapterError("INVALID_PROVIDER_REQUEST")
        if response.status_code == 404:
            raise GeminiAdapterError("PROVIDER_MODEL_UNAVAILABLE")
        if response.status_code == 429:
            raise GeminiAdapterError("PROVIDER_RATE_LIMITED")
        if response.status_code >= 400:
            raise GeminiAdapterError("PROVIDER_UNAVAILABLE")

        try:
            payload = response.json()
            if payload.get("promptFeedback", {}).get("blockReason"):
                raise GeminiAdapterError("PROVIDER_REJECTED")
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            analysis = GeminiStructuredAnalysis.model_validate(json.loads(text))
            return GeminiAdapterResult(
                model=self.model,
                model_version=payload.get("modelVersion"),
                analysis=analysis,
            )
        except GeminiAdapterError:
            raise
        except (KeyError, IndexError, TypeError, ValueError, ValidationError) as exception:
            raise GeminiAdapterError("INVALID_PROVIDER_RESPONSE") from exception

    def _prompt(
        self,
        species: str,
        affected_area: str,
        symptoms: str,
        description: str,
    ) -> str:
        return (
            "반려동물 환부 이미지의 관찰 가능한 시각적 소견만 분석하세요. "
            "확정 진단, 처방, 약물 추천은 하지 마세요. confidence는 임상 확률이나 "
            "정확도가 아니라 이미지에서 해당 소견을 확인한 모델 확신도입니다. "
            f"species={species}, affectedArea={affected_area}, "
            f"symptoms={symptoms}, description={description}"
        )
