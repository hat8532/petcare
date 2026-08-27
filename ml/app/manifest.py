import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, ValidationError, field_validator


class DatasetManifest(BaseModel):
    schema_version: Literal["petcare-dataset-manifest/v1"] = Field(alias="schemaVersion")
    dataset_id: str = Field(alias="datasetId", min_length=1)
    dataset_version: str = Field(alias="datasetVersion", min_length=1)
    approval_status: Literal["DRAFT", "APPROVED", "REJECTED"] = Field(alias="approvalStatus")
    source_url: HttpUrl = Field(alias="sourceUrl")
    source_revision: str = Field(alias="sourceRevision", min_length=1)
    license_name: str = Field(alias="licenseName", min_length=1)
    license_url: HttpUrl = Field(alias="licenseUrl")
    species: list[Literal["DOG", "CAT"]]
    body_area: Literal["SKIN"] = Field(alias="bodyArea")
    group_key: str = Field(alias="groupKey", min_length=1)
    classes: dict[str, str]
    split_policy: dict[str, float] = Field(alias="splitPolicy")

    model_config = {"populate_by_name": True}

    @field_validator("classes")
    @classmethod
    def require_classes(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) < 2:
            raise ValueError("classes는 2개 이상이어야 합니다.")
        return value

    @field_validator("split_policy")
    @classmethod
    def validate_split(cls, value: dict[str, float]) -> dict[str, float]:
        if set(value) != {"train", "validation", "test"}:
            raise ValueError("splitPolicy는 train·validation·test를 모두 포함해야 합니다.")
        if abs(sum(value.values()) - 1.0) > 1e-9:
            raise ValueError("splitPolicy 합은 1이어야 합니다.")
        return value


class Artifact(BaseModel):
    path: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    format: Literal["torchscript"]


class ModelManifest(BaseModel):
    schema_version: Literal["petcare-model-manifest/v1"] = Field(alias="schemaVersion")
    model_name: str = Field(alias="modelName", min_length=1)
    model_version: str = Field(alias="modelVersion", min_length=1)
    approval_status: Literal["DRAFT", "APPROVED", "REJECTED"] = Field(alias="approvalStatus")
    dataset_manifest_sha256: str = Field(
        alias="datasetManifestSha256", pattern=r"^[0-9a-f]{64}$"
    )
    artifact: Artifact
    labels: list[str]
    preprocessing: dict[str, object]
    thresholds: dict[str, float]

    model_config = {"populate_by_name": True}

    @field_validator("labels")
    @classmethod
    def require_unique_labels(cls, value: list[str]) -> list[str]:
        if len(value) < 2 or len(set(value)) != len(value):
            raise ValueError("labels는 중복 없는 2개 이상이어야 합니다.")
        return value


class ManifestState(BaseModel):
    valid: bool
    approved: bool
    artifact_valid: bool
    failure_code: str | None = Field(alias="failureCode")
    model_name: str | None = Field(alias="modelName")
    model_version: str | None = Field(alias="modelVersion")

    model_config = {"populate_by_name": True}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_model_manifest(manifest_path: str) -> ManifestState:
    if not manifest_path:
        return ManifestState(
            valid=False,
            approved=False,
            artifact_valid=False,
            failureCode="MODEL_MANIFEST_MISSING",
            modelName=None,
            modelVersion=None,
        )

    path = Path(manifest_path)
    if not path.is_file():
        return ManifestState(
            valid=False,
            approved=False,
            artifact_valid=False,
            failureCode="MODEL_MANIFEST_MISSING",
            modelName=None,
            modelVersion=None,
        )

    try:
        manifest = ModelManifest.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError):
        return ManifestState(
            valid=False,
            approved=False,
            artifact_valid=False,
            failureCode="MODEL_MANIFEST_INVALID",
            modelName=None,
            modelVersion=None,
        )

    if manifest.approval_status != "APPROVED":
        return ManifestState(
            valid=True,
            approved=False,
            artifact_valid=False,
            failureCode="MODEL_NOT_APPROVED",
            modelName=manifest.model_name,
            modelVersion=manifest.model_version,
        )

    artifact_path = (path.parent / manifest.artifact.path).resolve()
    if not artifact_path.is_file():
        return ManifestState(
            valid=True,
            approved=True,
            artifact_valid=False,
            failureCode="MODEL_ARTIFACT_MISSING",
            modelName=manifest.model_name,
            modelVersion=manifest.model_version,
        )

    if sha256_file(artifact_path) != manifest.artifact.sha256:
        return ManifestState(
            valid=True,
            approved=True,
            artifact_valid=False,
            failureCode="MODEL_ARTIFACT_DIGEST_MISMATCH",
            modelName=manifest.model_name,
            modelVersion=manifest.model_version,
        )

    return ManifestState(
        valid=True,
        approved=True,
        artifact_valid=True,
        failureCode=None,
        modelName=manifest.model_name,
        modelVersion=manifest.model_version,
    )
