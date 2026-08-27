import os
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

SERVICE_VERSION = "0.1.0"
MODEL_MANIFEST_PATH = os.getenv("PETCARE_MODEL_MANIFEST", "")


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


def model_is_available() -> bool:
    return bool(MODEL_MANIFEST_PATH) and Path(MODEL_MANIFEST_PATH).is_file()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.get("/version")
def version() -> dict[str, str | bool]:
    return {
        "serviceVersion": SERVICE_VERSION,
        "modelAvailable": model_is_available(),
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
    del pet_id, species, affected_area, symptoms, description

    if image.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=415,
            detail={"failureCode": "UNSUPPORTED_MEDIA_TYPE", "requestId": request_id},
        )

    if not model_is_available():
        raise HTTPException(
            status_code=503,
            detail={
                "failureCode": "MODEL_UNAVAILABLE",
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
