ALTER TABLE public.diagnosis_records
    ADD COLUMN IF NOT EXISTS vision_result_json TEXT,
    ADD COLUMN IF NOT EXISTS rag_report TEXT;
