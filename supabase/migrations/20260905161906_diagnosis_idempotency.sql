-- 기존 Row를 보존하는 additive Migration. Backend 교체 전에 대상 DB에 한 번 적용한다.
-- Auth는 Spring JWT/Pet Ownership을 유지한다. Role/Grant/RLS 정책을 변경하지 않는다.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.diagnosis_records
    ADD COLUMN idempotency_key VARCHAR(36),
    ADD COLUMN request_hash VARCHAR(64),
    ADD CONSTRAINT diagnosis_owner_request_unique UNIQUE (user_id, idempotency_key),
    ADD CONSTRAINT diagnosis_request_pair_check CHECK (
        (idempotency_key IS NULL AND request_hash IS NULL)
        OR (idempotency_key IS NOT NULL AND request_hash IS NOT NULL AND user_id IS NOT NULL)
    );
COMMIT;
