import os
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.gemini_adapter import GeminiAdapterError, GeminiMultimodalAdapter
from app.image_validation import ImageValidationError, read_validated_image
from app.manifest import ManifestState, inspect_model_manifest
from app.rag_retriever import RagCorpusError, RagRetriever

SERVICE_VERSION = "0.1.0"
DEMO_MODEL_NAME = "petcare-contract-demo"
ALLOWED_PROVIDER_FAILURE_CODES = {
    "INVALID_INPUT",
    "INVALID_PROVIDER_REQUEST",
    "INVALID_PROVIDER_RESPONSE",
    "INFERENCE_TIMEOUT",
    "PROVIDER_AUTH_FAILED",
    "PROVIDER_MODEL_UNAVAILABLE",
    "PROVIDER_RATE_LIMITED",
    "PROVIDER_REJECTED",
    "PROVIDER_UNAVAILABLE",
}


def experimental_demo_enabled() -> bool:
    return os.getenv("PETCARE_EXPERIMENTAL_DEMO_ENABLED", "false").lower() == "true"


def get_gemini_adapter() -> GeminiMultimodalAdapter:
    return GeminiMultimodalAdapter.from_environment()


def get_rag_retriever() -> RagRetriever:
    return RagRetriever.from_environment()


class Prediction(BaseModel):
    disease_name: str = Field(alias="diseaseName")
    probability: float = Field(ge=0, le=100)

    model_config = {"populate_by_name": True}


class RagSource(BaseModel):
    source_id: str = Field(alias="sourceId")
    title: str
    publisher: str
    source_url: str = Field(alias="sourceUrl")

    model_config = {"populate_by_name": True}


class InferenceResponse(BaseModel):
    mode: str
    model: str | None
    model_version: str | None = Field(alias="modelVersion")
    predictions: list[Prediction]
    limitations: list[str]
    rag_report: str | None = Field(default=None, alias="ragReport")
    rag_sources: list[RagSource] = Field(default_factory=list, alias="ragSources")
    failure_code: str | None = Field(alias="failureCode")
    request_id: str = Field(alias="requestId")

    model_config = {"populate_by_name": True}


app = FastAPI(title="PetCare Vision Inference", version=SERVICE_VERSION)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    _request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    body = exception.body
    request_id = body.get("requestId") if hasattr(body, "get") else None
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "failureCode": "INVALID_PROVIDER_REQUEST",
                "requestId": request_id,
            }
        },
    )


def model_state() -> ManifestState:
    return inspect_model_manifest(os.getenv("PETCARE_MODEL_MANIFEST", ""))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP"}


@app.get("/version")
def version() -> dict[str, str | bool | int | None]:
    state = model_state()
    gemini = get_gemini_adapter()
    try:
        rag_metadata = get_rag_retriever().metadata()
    except RagCorpusError:
        rag_metadata = None
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
        "ragAvailable": rag_metadata is not None,
        "ragMode": "LEXICAL_TFIDF_PROTOTYPE" if rag_metadata else None,
        "ragCorpusId": rag_metadata.corpus_id if rag_metadata else None,
        "ragCorpusVersion": rag_metadata.version if rag_metadata else None,
        "ragDocumentCount": rag_metadata.document_count if rag_metadata else 0,
    }


@app.post(
    "/v1/diagnoses/infer",
    response_model=InferenceResponse,
    response_model_by_alias=True,
)
async def infer(
    image: Annotated[UploadFile, File()],
    pet_id: Annotated[int, Form(alias="petId", gt=0)],
    species: Annotated[str, Form(min_length=1, max_length=30)],
    affected_area: Annotated[str, Form(alias="affectedArea", min_length=1, max_length=30)],
    symptoms: Annotated[str, Form(min_length=2, max_length=4000)],
    description: Annotated[str, Form(min_length=1, max_length=2000)],
    request_id: Annotated[str, Form(alias="requestId", min_length=1, max_length=100)],
) -> InferenceResponse:
    del pet_id

    try:
        validated_image = await read_validated_image(image)
    except ImageValidationError as exception:
        raise HTTPException(
            status_code=exception.status_code,
            detail={"failureCode": exception.failure_code, "requestId": request_id},
        ) from exception

    if experimental_demo_enabled():
        if species not in {"DOG", "CAT"} or affected_area != "SKIN":
            raise HTTPException(
                status_code=422,
                detail={"failureCode": "OUT_OF_SCOPE", "requestId": request_id},
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
            evidence = get_rag_retriever().search(
                species=species,
                affected_area=affected_area,
                query=f"{symptoms}\n{description}",
            )
        except RagCorpusError as exception:
            raise HTTPException(
                status_code=503,
                detail={
                    "failureCode": exception.failure_code,
                    "requestId": request_id,
                },
            ) from exception
        if not evidence:
            raise HTTPException(
                status_code=422,
                detail={"failureCode": "RAG_NO_EVIDENCE", "requestId": request_id},
            )
        try:
            result = await gemini.analyze(
                image_bytes=validated_image.content,
                mime_type=validated_image.mime_type,
                species=species,
                affected_area=affected_area,
                symptoms=symptoms,
                description=description,
                evidence=evidence,
            )
        except GeminiAdapterError as exception:
            failure_code = (
                exception.failure_code
                if exception.failure_code in ALLOWED_PROVIDER_FAILURE_CODES
                else "PROVIDER_UNAVAILABLE"
            )
            status_code = {
                "INVALID_INPUT": 400,
                "PROVIDER_REJECTED": 422,
                "PROVIDER_RATE_LIMITED": 429,
                "INFERENCE_TIMEOUT": 504,
            }.get(failure_code, 503)
            raise HTTPException(
                status_code=status_code,
                detail={"failureCode": failure_code, "requestId": request_id},
            ) from exception

        evidence_by_id = {item.source_id: item for item in evidence}
        selected_evidence = [
            evidence_by_id[source_id]
            for source_id in result.analysis.relevant_source_ids
        ]
        rag_report = "\n\n".join(
            f"{item.excerpt} [{item.source_id}]"
            for item in selected_evidence
        )

        return InferenceResponse(
            mode="GEMINI_RAG_PROTOTYPE",
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
            ragReport=rag_report,
            ragSources=[
                RagSource(
                    sourceId=item.source_id,
                    title=item.title,
                    publisher=item.publisher,
                    sourceUrl=item.source_url,
                )
                for item in selected_evidence
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
