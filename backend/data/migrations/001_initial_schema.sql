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
