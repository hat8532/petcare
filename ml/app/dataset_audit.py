import csv
import hashlib
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from app.manifest import DatasetManifest, sha256_file

REQUIRED_COLUMNS = {"image_path", "pet_id", "species", "label"}


@dataclass(frozen=True)
class DatasetRow:
    image_path: str
    pet_id: str
    species: str
    label: str
    split: str


@dataclass(frozen=True)
class AuditResult:
    rows: list[DatasetRow]
    errors: list[str]
    image_counts: dict[str, int]
    pet_counts: dict[str, int]

    @property
    def passed(self) -> bool:
        return not self.errors


def assign_split(dataset_id: str, pet_id: str, policy: dict[str, float]) -> str:
    value = int.from_bytes(
        hashlib.sha256(f"{dataset_id}:{pet_id}".encode()).digest()[:8], "big"
    ) / 2**64
    train_end = policy["train"]
    validation_end = train_end + policy["validation"]
    if value < train_end:
        return "train"
    if value < validation_end:
        return "validation"
    return "test"


def audit_dataset_index(
    index_path: Path, image_root: Path, manifest: DatasetManifest
) -> AuditResult:
    errors: list[str] = []
    rows: list[DatasetRow] = []
    image_hash_owners: dict[str, tuple[str, str]] = {}
    pet_splits: dict[str, set[str]] = defaultdict(set)
    resolved_root = image_root.resolve()

    with index_path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing_columns:
            return AuditResult(
                rows=[],
                errors=[f"필수 Column 누락: {', '.join(sorted(missing_columns))}"],
                image_counts={},
                pet_counts={},
            )

        for line_number, raw in enumerate(reader, start=2):
            image_path = (raw["image_path"] or "").strip()
            pet_id = (raw["pet_id"] or "").strip()
            species = (raw["species"] or "").strip().upper()
            label = (raw["label"] or "").strip()
            if not image_path or not pet_id or not species or not label:
                errors.append(f"{line_number}행: 빈 필수 값")
                continue
            if species not in manifest.species:
                errors.append(f"{line_number}행: 허용되지 않은 species={species}")
            if label not in manifest.classes:
                errors.append(f"{line_number}행: Manifest에 없는 label={label}")

            split = assign_split(manifest.dataset_id, pet_id, manifest.split_policy)
            pet_splits[pet_id].add(split)
            row = DatasetRow(image_path, pet_id, species, label, split)
            rows.append(row)

            file_path = (resolved_root / image_path).resolve()
            if not file_path.is_relative_to(resolved_root):
                errors.append(f"{line_number}행: Image Root 밖 경로={image_path}")
                continue
            if not file_path.is_file():
                errors.append(f"{line_number}행: Image File 없음={image_path}")
                continue
            digest = sha256_file(file_path)
            previous = image_hash_owners.get(digest)
            if previous:
                errors.append(
                    f"{line_number}행: 중복 Image={image_path}, 최초={previous[0]}({previous[1]})"
                )
            else:
                image_hash_owners[digest] = (image_path, pet_id)

    for pet_id, splits in pet_splits.items():
        if len(splits) != 1:
            errors.append(f"Pet Group Split 누수: pet_id={pet_id}, splits={sorted(splits)}")

    pet_count_values = Counter(
        next(iter(splits)) for splits in pet_splits.values() if splits
    )
    return AuditResult(
        rows=rows,
        errors=errors,
        image_counts=dict(Counter(row.split for row in rows)),
        pet_counts={split: pet_count_values[split] for split in manifest.split_policy},
    )


def write_split_index(rows: list[DatasetRow], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["image_path", "pet_id", "species", "label", "split"],
        )
        writer.writeheader()
        writer.writerows(row.__dict__ for row in rows)
