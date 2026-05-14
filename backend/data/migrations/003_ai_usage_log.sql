-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — AI Usage Log & Cost Tracking
-- Directive: DIR-001 (Athena) + DIR-007 (Demeter)
-- Purpose: Track Claude API usage, prompt caching savings, cost per request
-- Applied: 2026-05-14
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. AI Usage Log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id              TEXT,                          -- anonymous session
  model                   TEXT NOT NULL,                 -- claude-haiku-4-5 / gemini / mock
  ai_source               TEXT NOT NULL,                 -- claude / gemini / mock
  platform                TEXT,                          -- tiktok / facebook / shopee
  input_tokens            INTEGER DEFAULT 0,
  output_tokens           INTEGER DEFAULT 0,
  cache_creation_tokens   INTEGER DEFAULT 0,             -- tokens written to cache (costly)
  cache_read_tokens       INTEGER DEFAULT 0,             -- tokens read from cache (cheap)
  estimated_cost_thb      NUMERIC(10,4) DEFAULT 0,       -- estimated cost in THB
  response_ms             INTEGER,                       -- response time ms
  success                 BOOLEAN DEFAULT true,
  error_message           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Daily Cost Summary (materialized-style view via cron) ─────────────────
CREATE TABLE IF NOT EXISTS ai_cost_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL UNIQUE,
  total_requests  INTEGER DEFAULT 0,
  claude_requests INTEGER DEFAULT 0,
  gemini_requests INTEGER DEFAULT 0,
  mock_requests   INTEGER DEFAULT 0,
  total_tokens    INTEGER DEFAULT 0,
  cache_hit_tokens INTEGER DEFAULT 0,
  cache_miss_tokens INTEGER DEFAULT 0,
  cache_hit_rate  NUMERIC(5,2) DEFAULT 0,               -- percentage
  total_cost_thb  NUMERIC(10,4) DEFAULT 0,
  estimated_saving_thb NUMERIC(10,4) DEFAULT 0,         -- saving from caching
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_usage_user     ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created  ON ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model    ON ai_usage_log(model);
CREATE INDEX IF NOT EXISTS idx_ai_cost_date      ON ai_cost_daily(date DESC);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE ai_usage_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_daily ENABLE ROW LEVEL SECURITY;

-- Users see only their own usage
CREATE POLICY "ai_usage_own" ON ai_usage_log
  FOR SELECT USING (user_id = auth.uid());

-- Admin sees all
CREATE POLICY "ai_usage_admin" ON ai_usage_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin')
  );

CREATE POLICY "ai_cost_admin" ON ai_cost_daily
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin')
  );

-- ── 5. Function: Log AI usage ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_model TEXT,
  p_ai_source TEXT,
  p_platform TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cache_creation_tokens INTEGER DEFAULT 0,
  p_cache_read_tokens INTEGER DEFAULT 0,
  p_response_ms INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_cost NUMERIC(10,4);
  v_saving NUMERIC(10,4);
  v_log_id UUID;
  -- Pricing in THB (approximate, 1 USD = 36 THB)
  -- Claude Haiku 4.5: $1/M input, $5/M output
  -- Cache read: $0.10/M (90% savings)
  -- Cache write: $1.25/M (25% more expensive)
  input_price_per_token  CONSTANT NUMERIC := 0.000036;   -- $1/M * 36
  output_price_per_token CONSTANT NUMERIC := 0.00018;    -- $5/M * 36
  cache_read_price       CONSTANT NUMERIC := 0.0000036;  -- $0.10/M * 36
  cache_write_price      CONSTANT NUMERIC := 0.000045;   -- $1.25/M * 36
BEGIN
  -- Calculate cost
  v_cost := (p_input_tokens * input_price_per_token)
           + (p_output_tokens * output_price_per_token)
           + (p_cache_creation_tokens * cache_write_price)
           + (p_cache_read_tokens * cache_read_price);

  -- Calculate saving vs no-cache scenario
  v_saving := (p_cache_read_tokens * (input_price_per_token - cache_read_price));

  INSERT INTO ai_usage_log (
    user_id, model, ai_source, platform,
    input_tokens, output_tokens,
    cache_creation_tokens, cache_read_tokens,
    estimated_cost_thb, response_ms, success, error_message
  ) VALUES (
    p_user_id, p_model, p_ai_source, p_platform,
    p_input_tokens, p_output_tokens,
    p_cache_creation_tokens, p_cache_read_tokens,
    v_cost, p_response_ms, p_success, p_error_message
  ) RETURNING id INTO v_log_id;

  -- Upsert daily summary
  INSERT INTO ai_cost_daily (date, total_requests, total_tokens, total_cost_thb, estimated_saving_thb)
  VALUES (CURRENT_DATE, 1, p_input_tokens + p_output_tokens, v_cost, v_saving)
  ON CONFLICT (date) DO UPDATE SET
    total_requests = ai_cost_daily.total_requests + 1,
    total_tokens = ai_cost_daily.total_tokens + p_input_tokens + p_output_tokens,
    total_cost_thb = ai_cost_daily.total_cost_thb + EXCLUDED.total_cost_thb,
    estimated_saving_thb = ai_cost_daily.estimated_saving_thb + EXCLUDED.estimated_saving_thb,
    updated_at = NOW();

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- END Migration 003
-- ─────────────────────────────────────────────────────────────────────────────
