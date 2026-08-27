import argparse
import json
from pathlib import Path

from app.aihub_adapter import extract_candidate_index, inspect_aihub_zip


def main() -> int:
    parser = argparse.ArgumentParser(description="AI-Hub 561 ZIP Intake Adapter")
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    inspection = inspect_aihub_zip(args.archive)
    print(json.dumps({
        "records": len(inspection.records),
        "errors": inspection.errors,
        "classCounts": inspection.class_counts,
        "speciesCounts": inspection.species_counts,
        "groupCandidates": inspection.group_candidate_count,
        "readyForGroupSplit": inspection.ready_for_group_split,
    }, ensure_ascii=False, indent=2))
    if inspection.errors:
        return 1
    if args.output_root:
        extract_candidate_index(args.archive, inspection, args.output_root)
    return 0 if inspection.ready_for_group_split else 2


if __name__ == "__main__":
    raise SystemExit(main())
