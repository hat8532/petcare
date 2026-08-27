import csv
import json
from pathlib import Path

from app.dataset_audit import audit_dataset_index
from app.manifest import DatasetManifest


def load_manifest() -> DatasetManifest:
    return DatasetManifest.model_validate(
        json.loads(Path("manifests/dataset-manifest.example.json").read_text())
    )


def write_index(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file, fieldnames=["image_path", "pet_id", "species", "label"]
        )
        writer.writeheader()
        writer.writerows(rows)


def test_audit_assigns_one_deterministic_split_per_pet(tmp_path):
    (tmp_path / "one.jpg").write_bytes(b"image-one")
    (tmp_path / "two.jpg").write_bytes(b"image-two")
    index = tmp_path / "index.csv"
    write_index(index, [
        {"image_path": "one.jpg", "pet_id": "pet-1", "species": "DOG", "label": "A1"},
        {"image_path": "two.jpg", "pet_id": "pet-1", "species": "DOG", "label": "A2"},
    ])

    result = audit_dataset_index(index, tmp_path, load_manifest())

    assert result.passed is True
    assert result.rows[0].split == result.rows[1].split
    assert sum(result.pet_counts.values()) == 1


def test_audit_rejects_missing_unknown_and_duplicate_images(tmp_path):
    (tmp_path / "one.jpg").write_bytes(b"same-image")
    (tmp_path / "copy.jpg").write_bytes(b"same-image")
    index = tmp_path / "index.csv"
    write_index(index, [
        {"image_path": "one.jpg", "pet_id": "pet-1", "species": "DOG", "label": "A1"},
        {"image_path": "copy.jpg", "pet_id": "pet-2", "species": "HORSE", "label": "UNKNOWN"},
        {"image_path": "missing.jpg", "pet_id": "pet-3", "species": "CAT", "label": "A2"},
    ])

    result = audit_dataset_index(index, tmp_path, load_manifest())

    assert result.passed is False
    assert any("허용되지 않은 species" in error for error in result.errors)
    assert any("Manifest에 없는 label" in error for error in result.errors)
    assert any("중복 Image" in error for error in result.errors)
    assert any("Image File 없음" in error for error in result.errors)


def test_audit_rejects_path_outside_image_root(tmp_path):
    image_root = tmp_path / "images"
    image_root.mkdir()
    (tmp_path / "outside.jpg").write_bytes(b"outside")
    index = tmp_path / "index.csv"
    write_index(index, [{
        "image_path": "../outside.jpg",
        "pet_id": "pet-1",
        "species": "DOG",
        "label": "A1",
    }])

    result = audit_dataset_index(index, image_root, load_manifest())

    assert result.passed is False
    assert any("Image Root 밖 경로" in error for error in result.errors)
