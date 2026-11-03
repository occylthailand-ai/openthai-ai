-- ═══════════════════════════════════════════════════════════════════
--  Migration 009 — ai_usage_log: เพิ่ม 'grok' ใน ai_source
--  ต้องรัน 003_ai_usage_log.sql ก่อน
--  (router ใน server.js มี 3 ค่าย: gemini / grok / claude — ยังไม่เพิ่มค่ายที่ไม่มีโค้ด)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_ai_source_check;

ALTER TABLE public.ai_usage_log
  ADD CONSTRAINT ai_usage_log_ai_source_check
  CHECK (ai_source IN ('claude','gemini','grok','mock','mock-fallback'));

-- เก็บลำดับ provider ที่ router ลองจริง (รวม skip/unavailable) และ token แบบประมาณหรือวัดจริง
ALTER TABLE public.ai_usage_log ADD COLUMN IF NOT EXISTS tried        TEXT[];
ALTER TABLE public.ai_usage_log ADD COLUMN IF NOT EXISTS tokens_est   BOOLEAN DEFAULT TRUE;
