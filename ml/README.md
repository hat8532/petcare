# PetCare FastAPI Vision Service

현재 단계는 Spring과 FastAPI 사이의 Image Inference Contract를 검증한다. 승인된 Model Artifact가 없으므로 질환 예측을 성공으로 위장하지 않고 `MODEL_UNAVAILABLE` 을 반환한다.

## Local Run

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Spring Backend에서 Local Service를 호출하려면 실행 Environment에 다음을 설정한다.

```text
DIAGNOSIS_VISION_ENABLED=true
DIAGNOSIS_VISION_BASE_URL=http://127.0.0.1:8000
```

## Endpoints

- `GET /health`: Service Process 상태
- `GET /version`: Service·Model 준비 상태
- `POST /v1/diagnoses/infer`: Image·Pet·환부·증상 Inference Contract

## Test

```bash
.venv/bin/python -m pytest -q
```

Model Loader를 추가할 때는 Dataset·License·Label Map·Model Version·Preprocessing·Threshold를 결속한 Manifest를 먼저 승인받아야 한다.

## Model Gate

- Dataset 후보와 선택 Gate: `manifests/DATASET-CANDIDATES.md`
- Dataset Manifest 예시: `manifests/dataset-manifest.example.json`
- Model Manifest 예시: `manifests/model-manifest.example.json`
- 실행 환경변수: `PETCARE_MODEL_MANIFEST=<승인된 model manifest 경로>`

FastAPI는 `APPROVED` Manifest, 존재하는 TorchScript Artifact, Manifest에 기록된 SHA-256이 모두 일치해야 Artifact를 유효하게 본다. 현재는 실제 Loader와 승인된 Artifact가 없으므로 이 검증을 통과하더라도 `MODEL_LOADER_NOT_IMPLEMENTED`를 반환한다.

## Dataset Intake Audit

Dataset 원본을 Git에 넣지 않고, 먼저 `image_path,pet_id,species,label` Column을 가진 정규화 CSV를 만든다. 같은 `pet_id`의 Image는 SHA-256 기반으로 항상 같은 Split에 배정된다.

```bash
.venv/bin/python -m tools.audit_dataset \
  --manifest manifests/dataset-manifest.example.json \
  --index /path/to/dataset-index.csv \
  --image-root /path/to/images \
  --output /path/to/split-index.csv
```

누락 File, Manifest 밖 Species·Label, 내용이 같은 중복 Image가 발견되면 Exit Code `1`로 실패하며 Split Index를 만들지 않는다. AI-Hub 원본 Annotation을 이 정규화 CSV로 변환하는 Adapter는 실제 제공 Schema를 확인한 뒤 별도로 작성한다.
