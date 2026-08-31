import os
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.gemini_adapter import GeminiAdapterError, GeminiMultimodalAdapter
from app.manifest import ManifestState, inspect_model_manifest

SERVICE_VERSION = "0.1.0"
DEMO_MODEL_NAME = "petcare-contract-demo"


def experimental_demo_enabled() -> bool:
    return os.getenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "false").lower() == "true"


def get_gemini_adapter() -> GeminiMultimodalAdapter:
    return GeminiMultimodalAdapter.from_environment()


class Prediction(BaseModel):
    disease_name: str = Field(alias="diseaseName")
    probability: float = Field(ge=0, le=100)

    model_config = {"populate_by_name": True}


class InferenceResponse(BaseModel):
    mode: str
    model: str | None
    model_version: str | None = Field(alias="modelVersion")
    predictions: list[Prediction]
    limitations: list[str]
    failure_code: str | None = Field(alias="failureCode")
    request_id: str = Field(alias="requestId")

    model_config = {"populate_by_name": True}


app = FastAPI(title="PetCare Vision Inference", version=SERVICE_VERSION)


def model_state() -> ManifestState:
    return inspect_model_manifest(os.getenv("PETCARE_MODEL_MANIFEST", ""))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.get("/version")
def version() -> dict[str, str | bool | None]:
    state = model_state()
    gemini = get_gemini_adapter()
    return {
        "serviceVersion": SERVICE_VERSION,
        "modelAvailable": False,
        "manifestValid": state.valid,
        "modelApproved": state.approved,
        "artifactValid": state.artifact_valid,
        "modelName": state.model_name,
        "modelVersion": state.model_version,
        "modelStateCode": state.failure_code or "MODEL_LOADER_NOT_IMPLEMENTED",
        "experimentalDemoEnabled": experimental_demo_enabled(),
        "geminiEnabled": gemini.is_configured(),
        "geminiModel": gemini.model if gemini.is_configured() else None,
    }


@app.post(
    "/v1/diagnoses/infer",
    response_model=InferenceResponse,
    response_model_by_alias=True,
)
async def infer(
    image: Annotated[UploadFile, File()],
    pet_id: Annotated[int, Form(alias="petId")],
    species: Annotated[str, Form()],
    affected_area: Annotated[str, Form(alias="affectedArea")],
    symptoms: Annotated[str, Form()],
    description: Annotated[str, Form()],
    request_id: Annotated[str, Form(alias="requestId")],
) -> InferenceResponse:
    del pet_id

    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=415,
            detail={"failureCode": "UNSUPPORTED_MEDIA_TYPE", "requestId": request_id},
        )

    if experimental_demo_enabled():
        if species not in {"DOG", "CAT"} or affected_area != "SKIN":
            raise HTTPException(
                status_code=422,
                detail={"failureCode": "OUT_OF_SCOPE", "requestId": request_id},
            )
        if not await image.read():
            raise HTTPException(
                status_code=400,
                detail={"failureCode": "INVALID_INPUT", "requestId": request_id},
            )
        return InferenceResponse(
            mode="EXPERIMENTAL_DEMO",
            model=DEMO_MODEL_NAME,
            modelVersion=SERVICE_VERSION,
            predictions=[
                Prediction(diseaseName="예시 후보 1 (실제 판정 아님)", probability=50),
                Prediction(diseaseName="예시 후보 2 (구조 확인용)", probability=30),
                Prediction(diseaseName="판정 보류", probability=20),
            ],
            limitations=[
                "실제 Vision Model 추론 결과가 아닌 화면·API 구조 확인용 예시입니다.",
                "표시 Score는 임상 정확도나 질환 확률이 아닙니다.",
                "진단과 치료 판단은 수의사의 진료가 필요합니다.",
            ],
            failureCode=None,
            requestId=request_id,
        )

    gemini = get_gemini_adapter()
    if gemini.is_configured():
        if species not in {"DOG", "CAT"} or affected_area != "SKIN":
            raise HTTPException(
                status_code=422,
                detail={"failureCode": "OUT_OF_SCOPE", "requestId": request_id},
            )
        try:
            result = await gemini.analyze(
                image_bytes=await image.read(),
                mime_type=image.content_type,
                species=species,
                affected_area=affected_area,
                symptoms=symptoms,
                description=description,
            )
        except GeminiAdapterError as exception:
            status_code = {
                "INVALID_INPUT": 400,
                "PROVIDER_REJECTED": 422,
                "PROVIDER_RATE_LIMITED": 429,
                "INFERENCE_TIMEOUT": 504,
            }.get(exception.failure_code, 503)
            raise HTTPException(
                status_code=status_code,
                detail={"failureCode": exception.failure_code, "requestId": request_id},
            ) from exception

        return InferenceResponse(
            mode="GEMINI_MULTIMODAL",
            model=result.model,
            modelVersion=result.model_version,
            predictions=[
                Prediction(diseaseName=finding.finding, probability=finding.confidence)
                for finding in result.analysis.findings
            ],
            limitations=[
                *result.analysis.limitations,
                "표시 Score는 임상 확률이나 검증된 정확도가 아닌 Model confidence입니다.",
                "확정 진단과 치료 판단은 수의사의 진료가 필요합니다.",
            ],
            failureCode=None,
            requestId=request_id,
        )

    state = model_state()
    if not state.artifact_valid:
        raise HTTPException(
            status_code=503,
            detail={
                "failureCode": "MODEL_UNAVAILABLE",
                "reasonCode": state.failure_code,
                "message": "승인된 Vision Model Artifact가 없습니다.",
                "requestId": request_id,
            },
        )

    raise HTTPException(
        status_code=503,
        detail={
            "failureCode": "MODEL_LOADER_NOT_IMPLEMENTED",
            "message": "Model Manifest는 있지만 Loader가 아직 없습니다.",
            "requestId": request_id,
        },
    )
