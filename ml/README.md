# PetCare FastAPI Vision Service

현재 단계는 Spring과 FastAPI 사이의 Image Inference Contract를 검증한다. Gemini Multimodal과 소규모 수의학 자료 검색을 결합한 Local RAG Prototype을 명시적으로 활성화할 수 있으며, 비활성 상태이거나 호출에 실패하면 실제 분석 성공으로 위장하지 않고 안정된 Failure Code를 반환한다.

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

실제 Model 없이 화면·API 구조만 확인하는 Local Demo는 FastAPI 실행 환경에 아래 값을 별도로 설정한다. 기본값은 비활성화다.

```text
PETCARE_EXPERIMENTAL_DEMO_ENABLED=true
```

Demo는 `DOG·CAT + SKIN` 요청만 받고 `EXPERIMENTAL_DEMO` Mode와 예시 후보를 반환한다. Score는 임상 확률이나 Model 성능이 아니며 실제 평가 Evidence로 사용할 수 없다.

## Gemini + RAG Prototype

Gemini Adapter는 기본 비활성화다. Local `dev` 환경에서 승인된 Sample Image로 확인할 때만 FastAPI Process에 다음 환경변수를 전달한다.

```text
PETCARE_GEMINI_ENABLED=true
PETCARE_GEMINI_API_KEY=<local secret>
PETCARE_GEMINI_MODEL=gemini-3.1-flash-lite
```

기본 Corpus는 `knowledge/veterinary_skin_prototype.json`이다. 별도 파일을 검증할 때만 아래 경로를 추가한다.

```text
PETCARE_RAG_CORPUS=/absolute/path/to/corpus.json
```

- API Key는 Git·Log·명령 출력에 남기지 않는다.
- 실제 사용자 Image 전송과 운영 활성화는 별도 Privacy·비용·Secret Gate를 통과한 뒤 진행한다.
- 응답은 제한된 관찰·한계 Code와 검색된 Source ID만 허용하는 Structured JSON Validator를 통과해야 하며, `confidence`는 임상 확률이나 검증된 정확도가 아니다.
- Provider 인증·Rate limit·Timeout·Model 부재·Contract 불일치는 안정된 Failure Code로 축소한다.
- Gemini 각 HTTP 요청의 대기 설정은 15초이며 사진 Gate와 본 분석을 합친 Adapter 실행은 30초로 제한한다. 초과하면 대기 중 요청을 취소하고 `INFERENCE_TIMEOUT`으로 변환한다. Spring read timeout은 35초, Frontend 분석 Abort는 45초로 두어 상위 계층에 응답·저장 여유를 둔다.
- 브라우저 Abort는 이미 전송된 Provider 요청이나 DB 저장의 취소·중복 방지를 보장하지 않는다. 재시도 Idempotency는 별도 Contract가 필요하다.
- Gemini 호출 전 `DOG·CAT + SKIN` 범위의 Source를 TF-IDF 방식으로 최대 3건 검색한다.
- 사용자 입력과 RAG 문맥을 보내기 전에 별도 Gemini Image Gate를 호출하며, 실제 반려동물 피부 환부가 선명한 사진이 아니면 `PROVIDER_REJECTED`로 실패 처리하고 본 분석을 호출하지 않는다.
- Gemini는 자유 형식 Report를 작성하지 않는다. 검색 결과에서 관련 Source ID만 선택하고, 사용자에게 보이는 Report는 선택된 로컬 한국어 요약을 그대로 조합한다.
- Spring은 허용된 6개 Source의 ID·제목·발행처·URL과 로컬 요약문을 다시 대조해 일치하지 않는 응답을 폐기한다.
- 분석 성공 시 `GEMINI_RAG_PROTOTYPE` Mode와 Model·Version·Report·Source·Limitations를 보존한다.
- 이 구현은 작은 실제 검색 Prototype이지 Vector DB·Embedding·FAISS 기반 Production RAG가 아니다. 이미지 Gate도 별도 학습된 독립 검증 Model이 아니라 분리된 Gemini 요청이므로 임상 검증으로 간주하지 않는다.
- Corpus는 원문을 복제하지 않고 직접 작성한 한국어 요약과 출처 링크만 보관한다. 상용 사용 전에는 출처별 이용 조건을 다시 검토한다.

## Endpoints

- `GET /health`: Service Process 상태
- `GET /version`: Service·Model 준비 상태
- `POST /v1/diagnoses/infer`: Image·Pet·환부·증상 Inference Contract

## Test

```bash
PYTHONPATH=. .venv/bin/python -m pytest -q
```

Model Loader를 추가할 때는 Dataset·License·Label Map·Model Version·Preprocessing·Threshold를 결속한 Manifest를 먼저 승인받아야 한다. 현재 Custom PyTorch Vision Model은 구현된 것으로 간주하지 않는다.

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

## AI-Hub 561 Sample

AI-Hub 경량 Sample ZIP은 CP949 경로와 `라벨링데이터/TL*/**/*.jpg + *.json` Pair를 사용한다. 전체 압축을 풀지 않고 구조만 확인하려면 다음을 실행한다.

```bash
.venv/bin/python -m tools.prepare_aihub_sample \
  --archive /path/to/New_Sample.zip
```

`Raw data ID`의 일부에는 개체로 보이는 숫자 Segment가 있지만 공식 개체 ID Field로 확인되지 않았고 일부 Record에는 Segment가 없다. Adapter는 이를 `group_candidate`로만 기록하고 `pet_id`는 비워 두며 Exit Code `2`로 Group Split을 차단한다. AI-Hub에 개체 식별 기준을 확인하기 전에는 Sample 성능을 Test 성능으로 발표하지 않는다.
