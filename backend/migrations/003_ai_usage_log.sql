-- ═══════════════════════════════════════════════════════════════════
--  Migration 003 — AI Usage Log & Cost Tracking
--  ต้องรัน Migration 001+002 ก่อน
-- ═══════════════════════════════════════════════════════════════════

-- 1. ตาราง ai_usage_log — บันทึกทุก AI generate request
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id    TEXT,
  ai_source     TEXT NOT NULL DEFAULT 'mock'
                CHECK (ai_source IN ('claude','gemini','mock','mock-fallback')),
  model_id      TEXT,
  endpoint      TEXT NOT NULL,   -- '/api/generate', '/api/generate-ab', '/api/analyze-image'
  product       TEXT,
  platform      TEXT,
  category      TEXT,
  style         TEXT,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd      NUMERIC(10,6)  DEFAULT 0,
  cost_thb      NUMERIC(10,2)  DEFAULT 0,
  response_ms   INTEGER,
  critic_score  NUMERIC(4,1),
  is_cached     BOOLEAN DEFAULT FALSE,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตาราง daily_cost_summary — สรุปค่าใช้จ่าย AI รายวัน
CREATE TABLE IF NOT EXISTS public.daily_cost_summary (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL UNIQUE,
  total_requests INTEGER NOT NULL DEFAULT 0,
  claude_requests INTEGER NOT NULL DEFAULT 0,
  gemini_requests INTEGER NOT NULL DEFAULT 0,
  mock_requests   INTEGER NOT NULL DEFAULT 0,
  total_input_tokens  BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost_usd  NUMERIC(12,6) DEFAULT 0,
  total_cost_thb  NUMERIC(12,2) DEFAULT 0,
  unique_users    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id    ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_source     ON public.ai_usage_log(ai_source);
CREATE INDEX IF NOT EXISTS idx_daily_cost_date     ON public.daily_cost_summary(date DESC);

-- 4. View: cost ต่อ user รายเดือน
CREATE OR REPLACE VIEW public.monthly_cost_per_user AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                         AS total_requests,
  SUM(cost_thb)                    AS total_cost_thb,
  SUM(input_tokens + output_tokens) AS total_tokens
FROM public.ai_usage_log
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- 5. RLS
ALTER TABLE public.ai_usage_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cost_summary ENABLE ROW LEVEL SECURITY;

-- ✅ Migration 003 เสร็จสมบูรณ์
