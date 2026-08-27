import json
from pathlib import Path
from zipfile import ZipFile

from app.aihub_adapter import extract_candidate_index, inspect_aihub_zip


def make_sample_zip(path: Path, *, include_json: bool = True) -> None:
    image_path = "라벨링데이터/TL01/반려묘/피부/일반카메라/유증상/A2/sample.jpg"
    metadata = {
        "metaData": {
            "Raw data ID": "IMG_C_A2_23_201354.jpg",
            "species": "C",
            "lesions": "A2",
        },
        "labelingInfo": [],
    }
    with ZipFile(path, "w") as archive:
        archive.writestr(image_path, b"jpeg-content")
        if include_json:
            archive.writestr(
                image_path.removesuffix(".jpg") + ".json", json.dumps(metadata)
            )


def test_inspection_reads_pair_without_trusting_group_candidate(tmp_path):
    archive_path = tmp_path / "sample.zip"
    make_sample_zip(archive_path)

    result = inspect_aihub_zip(archive_path)

    assert result.errors == []
    assert len(result.records) == 1
    assert result.records[0].species == "CAT"
    assert result.records[0].label == "A2"
    assert result.records[0].group_candidate == "23"
    assert result.ready_for_group_split is False


def test_inspection_rejects_missing_json_pair(tmp_path):
    archive_path = tmp_path / "sample.zip"
    make_sample_zip(archive_path, include_json=False)

    result = inspect_aihub_zip(archive_path)

    assert result.records == []
    assert any("JPG·JSON Pair 누락" in error for error in result.errors)


def test_extraction_keeps_pet_id_empty_until_confirmed(tmp_path):
    archive_path = tmp_path / "sample.zip"
    output_root = tmp_path / "output"
    make_sample_zip(archive_path)
    inspection = inspect_aihub_zip(archive_path)

    index_path = extract_candidate_index(archive_path, inspection, output_root)

    index = index_path.read_text(encoding="utf-8")
    assert "images/sample.jpg,,CAT,A2,IMG_C_A2_23_201354.jpg,23" in index
    assert (output_root / "images/sample.jpg").read_bytes() == b"jpeg-content"
