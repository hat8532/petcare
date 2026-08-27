import hashlib
import json

from app.manifest import DatasetManifest, inspect_model_manifest


def test_dataset_manifest_requires_group_split_and_complete_ratio():
    manifest = json.loads(
        open("manifests/dataset-manifest.example.json", encoding="utf-8").read()
    )

    parsed = DatasetManifest.model_validate(manifest)

    assert parsed.approval_status == "DRAFT"
    assert parsed.group_key == "pet_id"
    assert sum(parsed.split_policy.values()) == 1.0


def test_draft_model_manifest_is_not_available():
    state = inspect_model_manifest("manifests/model-manifest.example.json")

    assert state.valid is True
    assert state.approved is False
    assert state.failure_code == "MODEL_NOT_APPROVED"


def test_approved_manifest_rejects_artifact_digest_mismatch(tmp_path):
    artifact = tmp_path / "model.pt"
    artifact.write_bytes(b"not-a-real-model")
    manifest = json.loads(
        open("manifests/model-manifest.example.json", encoding="utf-8").read()
    )
    manifest["approvalStatus"] = "APPROVED"
    manifest["artifact"]["path"] = "model.pt"
    manifest["artifact"]["sha256"] = hashlib.sha256(b"different").hexdigest()
    manifest_path = tmp_path / "model-manifest.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    state = inspect_model_manifest(str(manifest_path))

    assert state.approved is True
    assert state.artifact_valid is False
    assert state.failure_code == "MODEL_ARTIFACT_DIGEST_MISMATCH"


def test_approved_manifest_accepts_matching_artifact(tmp_path):
    artifact = tmp_path / "model.pt"
    artifact.write_bytes(b"verified-model-artifact")
    manifest = json.loads(
        open("manifests/model-manifest.example.json", encoding="utf-8").read()
    )
    manifest["approvalStatus"] = "APPROVED"
    manifest["artifact"]["path"] = "model.pt"
    manifest["artifact"]["sha256"] = hashlib.sha256(artifact.read_bytes()).hexdigest()
    manifest_path = tmp_path / "model-manifest.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    state = inspect_model_manifest(str(manifest_path))

    assert state.artifact_valid is True
    assert state.failure_code is None
