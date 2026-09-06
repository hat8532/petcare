# 진단 중복 저장 방지 적용 안내

이 폴더는 기존 팀 DB 전체를 재구축하는 Schema가 아니라 **이번 진단 보완의 추가 SQL**만 담는다.
공유 PetCare Supabase에는 **2026-09-06 적용·실제 연동 검증을 완료했다.** `db reset`이나 전체 이력 Push를 하지 않는다.

## 현재 공유 DB 적용 상태

- `20260903054921_add_diagnosis_inference_columns`: 이미 적용됐던 원격 이력의 SQL 원문을 로컬 파일로 복원했다. `vision_result_json`, `rag_report` 두 nullable TEXT Column이며 이번에 다시 적용하지 않았다.
- `20260905161906_diagnosis_idempotency`: 이번에 Supabase CLI로 적용했다. 기존 진단 3행의 원래 14열 내용은 전후 동일하고, 새 두 Column은 기존 행에서 모두 NULL이다. UNIQUE/CHECK와 Migration 이력도 확인했다.
- 검증용으로 계정 2개(`users.id=81,82`), 반려동물 1개(`pets.id=10`), 진단 1개(`diagnosis_records.id=4`)를 새로 만들었다. 기존 사용자·반려동물·진단은 수정/삭제하지 않았다. Test Data와 진단 사진은 삭제하지 않고 보존했다.
- 같은 공유 DB를 쓰는 팀원은 **SQL을 다시 실행하지 말고** 아래 이력 확인 후 Frontend/Backend·호출 Script를 함께 갱신한다. 다른 DB라면 그 DB의 기존 Schema/이력을 먼저 확인한다. 이 두 파일만으로 팀 전체 DB를 새로 구축할 수는 없다.

## 변경과 적용 순서

1. DB 담당자가 대상 Project, `public.diagnosis_records`, Migration 이력을 확인한다. 아래는 **아직 적용하지 않은 DB**에 대한 절차다.
2. 대상 테이블을 백업한 뒤 [추가 SQL](migrations/20260905161906_diagnosis_idempotency.sql)을 한 번 적용한다. 기존 Row를 수정/삭제하지 않으며 `idempotency_key VARCHAR(36)`, `request_hash VARCHAR(64)` 두 nullable Column과 owner/key UNIQUE·필드 쌍 CHECK를 추가한다. 잠금을 5초 안에 얻지 못하면 Transaction이 실패하므로 조용한 시간에 재시도한다. 원격 Migration에 대응하는 로컬 파일이 없으면 원본 파일을 먼저 복원하며, 적용된 이력을 임의로 `reverted` 처리하지 않는다.
3. Backend와 Frontend를 함께 갱신한다. 새 Backend의 `POST /api/v1/diagnosis` Multipart `request` JSON에는 **필수 `idempotencyKey` UUID**가 추가된다. 누락/잘못된 형식은 `400`이다. 기존 API 호출 Script에도 UUID를 추가해야 한다. `schema.sql`은 새 H2 DB 생성용이며 기존 PostgreSQL을 자동 변경하지 않는다.
4. 로그인·소유 Pet의 생성/상세/사진/이력을 확인하고, 같은 입력·Key를 다시 전송했을 때 같은 `diagnosisId`가 반환되는지 확인한다. 다른 입력에 같은 Key를 쓰면 `409`다.

```json
{
  "idempotencyKey": "00000000-0000-4000-8000-000000000001",
  "petId": 1,
  "affectedArea": "SKIN",
  "symptoms": ["가려움/긁음"],
  "description": "환부 증상 설명"
}
```

UUID는 예시를 복사해 계속 쓰는 것이 아니라 **새 분석마다 새로 생성**한다. Network/Timeout으로 결과를 받지 못한 동일 제출만 같은 Key를 재사용한다. 저장된 Provider 실패를 확인한 뒤 분석을 다시 실행할 때는 새 Key다. 현재 화면은 같은 Mount 내 동일 입력/File의 전송 재시도 Key를 유지하며, 새로고침/화면 종료 후까지 요청을 복구하는 기능은 아니다.

## 검증·복구·한계

- 2026-09-06 실제 React 로그인 → 소유 Pet 선택 → 환부 업로드 → Spring/FastAPI/Gemini → 공유 DB 저장 → 결과/사진/이력 조회가 통과했다. `GEMINI_RAG_PROTOTYPE`, 소견 3건·검색 출처 2건·실패 Code 없음이었다. 이는 실제 연동 확인이며 학습 Model 정확도 측정은 아니다.
- 실제 공유 DB에서 동일 Key/입력 재전송은 같은 진단 ID와 1행을 유지했고, 다른 입력은 409·Key 누락은 400이었다. 만료 Access Token의 401→Refresh 200→재조회 200, Refresh까지 만료된 경우 로그인 상태 해제, 비소유 계정의 생성/상세/사진/이력 404·익명 조회 401도 확인했다. 404는 타인 기록의 존재 여부를 드러내지 않는 현재 Contract다.
- 격리 PostgreSQL 17에서 이전 Schema + 기존 행 1건에 SQL 적용 후 원본 행과 두 NULL Column을 확인했다. 실제 Service/MyBatis/DB의 순차 재전송·동시 저장·Service 객체 재생성·다른 입력/Owner·legacy NULL 테스트 5개가 통과했다. AI/Storage Provider는 Mock이다.
- 동일 owner/key는 DB UNIQUE가 최종적으로 한 행만 허용한다. 충돌에서 패자가 만든 이미지 파일만 보상 정리한다. 동시에 시작된 AI Provider 호출까지 한 번으로 줄이지는 않는다.
- 코드 복구는 이전 Backend/Frontend를 함께 사용한다. 새 nullable Column/제약은 남겨도 기존 INSERT를 허용하므로 급히 Column을 삭제하지 않는다. 기존/새 기록 삭제는 필요하지 않다.
- 기존 Supabase RLS/Data API 공개 설정, JWT/계정 정책, 이미지 파일 보존·삭제 연동은 변경하지 않았다. 별도 보안 검토가 필요하다. 이 SQL이 그 문제까지 해결하지 않는다.
- 공통 Auth 보완: Filter `401/403`은 팀 명세의 `code/message/data`로 정리했고 HTTP 상태와 인증 Matcher는 그대로다. Frontend Refresh/Login/Logout의 과거 응답을 무효화한다. Auth Owner가 PR에서 이 경로를 함께 검토해야 한다.
- 기존 `AuthExtendedControllerTest.testForgotPassword`는 임시 비밀번호가 응답에 있다고 기대하지만 현재 제품 응답에는 없다. 본 PR은 이를 되살리거나 비밀번호 찾기/전달 기능을 변경하지 않는다.

## 적용 전후 읽기 전용 확인 SQL

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260903054921', '20260905161906')
ORDER BY version;
SELECT count(*) FROM public.diagnosis_records;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'diagnosis_records'
  AND column_name IN ('idempotency_key', 'request_hash');
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.diagnosis_records'::regclass
  AND conname IN ('diagnosis_owner_request_unique', 'diagnosis_request_pair_check');
```

기존 행을 NULL로 보존하면서 사용자·요청 조합을 UNIQUE로 제한하는 PostgreSQL 동작과 Migration 관리 근거:
[PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html),
[Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations).
