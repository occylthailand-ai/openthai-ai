-- ─── 001_initial_schema.sql ─────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — Initial Schema
-- Applied: 2026-05-11
-- Supabase Project: tpeskbbhuuqztwyllnli
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Users / Profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  plan_expires  TIMESTAMPTZ,
  ota_balance   NUMERIC(18,6) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Content History ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product     TEXT NOT NULL,
  platform    TEXT NOT NULL,
  language    TEXT DEFAULT 'th',
  hook        TEXT,
  script      JSONB,
  hashtags    TEXT[],
  ai_source   TEXT CHECK (ai_source IN ('claude','gemini','mock')),
  tokens_used INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Affiliates ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  commission_pct NUMERIC(5,2) DEFAULT 20.00,
  total_earned   NUMERIC(12,2) DEFAULT 0,
  total_clicks   INTEGER DEFAULT 0,
  total_signups  INTEGER DEFAULT 0,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Payments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plan            TEXT NOT NULL,
  amount_thb      NUMERIC(10,2) NOT NULL,
  amount_usd      NUMERIC(10,2),
  payment_method  TEXT NOT NULL,
  gateway         TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed','refunded')),
  slip_url        TEXT,
  confirmed_at    TIMESTAMPTZ,
  affiliate_code  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. OTA Token Transactions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ota_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(18,6) NOT NULL,
  type        TEXT CHECK (type IN ('earn','spend','stake','unstake','reward')),
  reason      TEXT,
  tx_hash     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Audit Log (Supabase-side) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ DEFAULT NOW(),
  action    TEXT NOT NULL,
  user_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip        TEXT,
  meta      JSONB,
  success   BOOLEAN DEFAULT true
);

-- ── 7. System Config ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key       TEXT PRIMARY KEY,
  value     JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_user     ON content_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user    ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_code  ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_ota_user         ON ota_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ts         ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);

-- ── Auto-create profile on signup ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_profile"  ON profiles        FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_own_content"  ON content_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_affiliate" ON affiliates     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_payments" ON payments        FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_own_ota"      ON ota_transactions FOR SELECT USING (auth.uid() = user_id);

-- ─── 002_payment_methods.sql ─────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Add payment_method_id + gateway tracking
-- Applied: 2026-05-13
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_group     TEXT,
  ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS exchange_rate     NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS gateway_ref       TEXT;

-- index สำหรับ query ตาม payment method
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_group  ON payments(payment_group);

-- ใส่ข้อมูล system_config เริ่มต้น
INSERT INTO system_config (key, value) VALUES
  ('payment_manual_enabled', 'true'),
  ('payment_omise_enabled',  'false'),
  ('payment_stripe_enabled', 'false'),
  ('payment_crypto_enabled', 'false'),
  ('promptpay_number', '"0972560801"'),
  ('line_id', '"@openthaiai"'),
  ('support_email', '"occylthailand@gmail.com"')
ON CONFLICT (key) DO NOTHING;

-- ─── 003_ai_usage_log.sql ─────────────────────────────────────────
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

-- ─── 004_affiliate_tracking.sql ─────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Affiliate Click & Conversion Tracking
-- Directive: DIR-007 (Demeter) + DIR-002 (Apollo)
-- Purpose: Track affiliate link clicks, conversions, commission payouts
-- Applied: 2026-05-14
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Affiliate Links ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ref_code      TEXT UNIQUE NOT NULL,          -- e.g. "zuejai2026"
  custom_slug   TEXT UNIQUE,                  -- optional custom slug
  campaign      TEXT DEFAULT 'general',       -- tiktok / facebook / line / etc.
  total_clicks  INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission_thb NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Affiliate Clicks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code      TEXT NOT NULL,
  affiliate_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash       TEXT,                         -- hashed IP (PDPA-safe)
  user_agent    TEXT,
  referrer      TEXT,
  landing_page  TEXT,
  converted     BOOLEAN DEFAULT false,
  converted_at  TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Affiliate Conversions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ref_code        TEXT NOT NULL,
  plan            TEXT NOT NULL,              -- pro / business
  amount_thb      NUMERIC(12,2) NOT NULL,     -- payment amount
  commission_rate NUMERIC(5,4) DEFAULT 0.10,  -- 10% lifetime
  commission_thb  NUMERIC(12,2) NOT NULL,     -- commission amount
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  payment_date    DATE,                       -- paid on this date
  invoice_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Affiliate Payouts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_thb      NUMERIC(12,2) NOT NULL,
  bank_name       TEXT,
  bank_account    TEXT,                       -- masked: xxx-x-xxxxx-x
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  payout_date     DATE,
  slip_url        TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aff_links_affiliate  ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_links_refcode    ON affiliate_links(ref_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_refcode   ON affiliate_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_clicked   ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate   ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_status      ON affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_aff_payouts_aff      ON affiliate_payouts(affiliate_id);

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE affiliate_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aff_links_own" ON affiliate_links
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_conv_own" ON affiliate_conversions
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_payouts_own" ON affiliate_payouts
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_admin_all" ON affiliate_links
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin'));

-- ── 7. Function: Record Click ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_affiliate_click(
  p_ref_code TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_click_id UUID;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM affiliate_links WHERE ref_code = p_ref_code AND is_active = true;

  INSERT INTO affiliate_clicks (ref_code, affiliate_id, ip_hash, user_agent, referrer, landing_page)
  VALUES (p_ref_code, v_affiliate_id, p_ip_hash, p_user_agent, p_referrer, p_landing_page)
  RETURNING id INTO v_click_id;

  -- Increment click counter
  UPDATE affiliate_links SET total_clicks = total_clicks + 1 WHERE ref_code = p_ref_code;

  RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Function: Record Conversion ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_affiliate_conversion(
  p_ref_code TEXT,
  p_referred_user_id UUID,
  p_plan TEXT,
  p_amount_thb NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_commission NUMERIC(12,2);
  v_conv_id UUID;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM affiliate_links WHERE ref_code = p_ref_code;

  v_commission := p_amount_thb * 0.10;  -- 10% lifetime commission

  INSERT INTO affiliate_conversions (affiliate_id, referred_user_id, ref_code, plan, amount_thb, commission_thb)
  VALUES (v_affiliate_id, p_referred_user_id, p_ref_code, p_plan, p_amount_thb, v_commission)
  RETURNING id INTO v_conv_id;

  -- Update totals
  UPDATE affiliate_links SET
    total_conversions = total_conversions + 1,
    total_commission_thb = total_commission_thb + v_commission
  WHERE ref_code = p_ref_code;

  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- END Migration 004
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 005_slack_notifications.sql ─────────────────────────────────────────
-- Migration 005 — Slack & Notification Channel Tracking
-- Applied: 2026-05-24

-- Track notification channels configured
CREATE TABLE IF NOT EXISTS notification_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL CHECK (channel IN ('slack','line','email','sms')),
  endpoint    TEXT NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Track Slack-specific events sent
CREATE TABLE IF NOT EXISTS slack_events (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ DEFAULT NOW(),
  event_type  TEXT NOT NULL,
  channel     TEXT,
  message     TEXT,
  status      TEXT CHECK (status IN ('sent','failed','skipped')),
  meta        JSONB
);

-- Skills gap tracking (from system_charter skills_radar pillar)
CREATE TABLE IF NOT EXISTS skills_gap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill       TEXT NOT NULL,
  status      TEXT CHECK (status IN ('missing','partial','complete')),
  priority    TEXT CHECK (priority IN ('critical','high','medium','low')),
  notes       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial skills gap data
INSERT INTO skills_gap (skill, status, priority, notes) VALUES
  ('Supabase Auth integration', 'missing', 'critical', 'P5 DIRECTIVE-003'),
  ('Omise PromptPay live', 'missing', 'critical', 'P4 DIRECTIVE-003'),
  ('Claude API production', 'missing', 'critical', 'P1 DIRECTIVE-003 — needs ANTHROPIC_API_KEY'),
  ('Slack webhook notifications', 'complete', 'high', 'SHIFT-003 완료'),
  ('LINE notification', 'partial', 'high', 'Code ready, needs LINE_NOTIFY_TOKEN'),
  ('Redis session cache', 'missing', 'medium', 'docker-compose has Redis, backend not wired'),
  ('PDPA consent tracking', 'missing', 'high', 'Thai law requirement'),
  ('Affiliate Supabase migration', 'missing', 'high', 'Currently file-based, needs DB'),
  ('n8n automation active', 'partial', 'medium', 'workflow file exists, needs n8n running')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_slack_events_ts ON slack_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills_gap(status, priority);

-- ─── 006_pdpa_consent.sql ─────────────────────────────────────────
-- Migration 006 — PDPA Consent Tracking
-- Applied: 2026-05-24
-- Required by: PDPA B.E. 2562 (Thailand Personal Data Protection Act)

CREATE TABLE IF NOT EXISTS pdpa_consent (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing','analytics','essential','third_party')),
  granted      BOOLEAN NOT NULL,
  ip_address   INET,
  user_agent   TEXT,
  version      TEXT DEFAULT '1.0',
  granted_at   TIMESTAMPTZ DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pdpa_user    ON pdpa_consent(user_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdpa_type    ON pdpa_consent(consent_type);

