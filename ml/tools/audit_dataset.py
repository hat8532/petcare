import argparse
import json
from pathlib import Path

from app.dataset_audit import audit_dataset_index, write_split_index
from app.manifest import DatasetManifest


def main() -> int:
    parser = argparse.ArgumentParser(description="PetCare Dataset Intake Audit")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--image-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    manifest = DatasetManifest.model_validate_json(
        args.manifest.read_text(encoding="utf-8")
    )
    result = audit_dataset_index(args.index, args.image_root, manifest)
    print(json.dumps({
        "passed": result.passed,
        "errors": result.errors,
        "imageCounts": result.image_counts,
        "petCounts": result.pet_counts,
    }, ensure_ascii=False, indent=2))
    if not result.passed:
        return 1

    write_split_index(result.rows, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
