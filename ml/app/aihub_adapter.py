import csv
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile, ZipInfo

SPECIES_MAP = {"D": "DOG", "C": "CAT"}
GROUP_CANDIDATE_PATTERN = re.compile(
    r"^IMG_(?P<species>[DC])_(?P<label>A\d+)_(?P<candidate>\d+)_(?P<sequence>\d+)\.jpg$"
)


@dataclass(frozen=True)
class AihubRecord:
    image_member: str
    image_name: str
    raw_data_id: str
    species: str
    label: str
    group_candidate: str


@dataclass(frozen=True)
class AihubInspection:
    records: list[AihubRecord]
    errors: list[str]
    class_counts: dict[str, int]
    species_counts: dict[str, int]
    group_candidate_count: int

    @property
    def ready_for_group_split(self) -> bool:
        # 공식 Schema가 개체 ID Field를 명시하지 않아 후보 값이 있어도 Pet ID로 확정하지 않는다.
        return False


def decode_zip_name(name: str) -> str:
    try:
        return name.encode("cp437").decode("cp949")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def _is_label_member(name: str, suffix: str) -> bool:
    path = PurePosixPath(name)
    return (
        len(path.parts) >= 3
        and path.parts[0] == "라벨링데이터"
        and path.parts[1].startswith("TL")
        and path.suffix.lower() == suffix
    )


def inspect_aihub_zip(archive_path: Path) -> AihubInspection:
    errors: list[str] = []
    records: list[AihubRecord] = []
    try:
        with ZipFile(archive_path) as archive:
            members = {
                decode_zip_name(info.filename): info
                for info in archive.infolist()
                if not info.is_dir()
            }
            image_members = {
                PurePosixPath(name).stem: name
                for name in members
                if _is_label_member(name, ".jpg")
            }
            json_members = {
                PurePosixPath(name).stem: name
                for name in members
                if _is_label_member(name, ".json")
            }
            for stem in sorted(set(image_members) | set(json_members)):
                image_member = image_members.get(stem)
                json_member = json_members.get(stem)
                if not image_member or not json_member:
                    errors.append(f"JPG·JSON Pair 누락: {stem}")
                    continue
                try:
                    payload = json.loads(archive.read(members[json_member]))
                    metadata = payload["metaData"]
                    raw_data_id = str(metadata["Raw data ID"])
                    species = SPECIES_MAP[str(metadata["species"])]
                    label = str(metadata["lesions"])
                except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exception:
                    errors.append(f"Metadata 오류: {json_member} ({type(exception).__name__})")
                    continue
                match = GROUP_CANDIDATE_PATTERN.fullmatch(raw_data_id)
                records.append(AihubRecord(
                    image_member=image_member,
                    image_name=PurePosixPath(image_member).name,
                    raw_data_id=raw_data_id,
                    species=species,
                    label=label,
                    group_candidate=match.group("candidate") if match else "",
                ))
    except (BadZipFile, OSError) as exception:
        errors.append(f"ZIP 읽기 실패: {type(exception).__name__}")
    return AihubInspection(
        records=records,
        errors=errors,
        class_counts=dict(Counter(record.label for record in records)),
        species_counts=dict(Counter(record.species for record in records)),
        group_candidate_count=sum(bool(record.group_candidate) for record in records),
    )


def extract_candidate_index(
    archive_path: Path, inspection: AihubInspection, output_root: Path
) -> Path:
    images_root = output_root / "images"
    images_root.mkdir(parents=True, exist_ok=True)
    index_path = output_root / "aihub-intake-candidates.csv"
    with ZipFile(archive_path) as archive, index_path.open(
        "w", encoding="utf-8", newline=""
    ) as index_file:
        members: dict[str, ZipInfo] = {
            decode_zip_name(info.filename): info for info in archive.infolist()
        }
        writer = csv.DictWriter(index_file, fieldnames=[
            "image_path", "pet_id", "species", "label", "raw_data_id", "group_candidate"
        ])
        writer.writeheader()
        seen_names: set[str] = set()
        for record in inspection.records:
            if record.image_name in seen_names:
                raise ValueError(f"중복 Image Filename: {record.image_name}")
            seen_names.add(record.image_name)
            destination = images_root / record.image_name
            destination.write_bytes(archive.read(members[record.image_member]))
            writer.writerow({
                "image_path": f"images/{record.image_name}",
                "pet_id": "",
                "species": record.species,
                "label": record.label,
                "raw_data_id": record.raw_data_id,
                "group_candidate": record.group_candidate,
            })
    return index_path
