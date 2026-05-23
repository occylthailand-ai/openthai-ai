-- ═══════════════════════════════════════════════════════════
--  AFFILIATE HUB — Supabase Schema
--  OpenThai AI — Affiliate System
--  Run in: Supabase → SQL Editor
--  Note: Tables prefixed with "aff_" to avoid conflicts
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Affiliate Users (separate from main users table)
CREATE TABLE IF NOT EXISTS public.aff_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  ref_code      TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verify_token  TEXT,
  verify_expires_at TIMESTAMPTZ,
  level         TEXT DEFAULT 'Silver' CHECK (level IN ('Silver','Gold','Platinum')),
  bank_account  TEXT,
  promptpay_id  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clicks tracking
CREATE TABLE IF NOT EXISTS public.aff_clicks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_code    TEXT NOT NULL REFERENCES public.aff_users(ref_code) ON DELETE CASCADE,
  ip          TEXT,
  user_agent  TEXT,
  converted   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Commission records
CREATE TABLE IF NOT EXISTS public.aff_commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.aff_users(id) ON DELETE CASCADE,
  ref_code        TEXT NOT NULL,
  buyer_name      TEXT,
  product         TEXT NOT NULL,
  order_amount    NUMERIC(12,2) NOT NULL,
  rate            NUMERIC(5,4) DEFAULT 0.35,
  commission      NUMERIC(12,2) NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  omise_charge_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ
);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS public.aff_withdrawals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.aff_users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('promptpay','bank')),
  destination     TEXT NOT NULL,
  status          TEXT DEFAULT 'requested' CHECK (status IN ('requested','processing','completed','failed')),
  scb_transfer_id TEXT,
  note            TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Row Level Security
ALTER TABLE public.aff_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_clicks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_commissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_withdrawals  ENABLE ROW LEVEL SECURITY;

-- Service role full access (DROP first = idempotent re-run safe)
DROP POLICY IF EXISTS "aff_users_service_all"       ON public.aff_users;
DROP POLICY IF EXISTS "aff_clicks_service_all"      ON public.aff_clicks;
DROP POLICY IF EXISTS "aff_commissions_service_all" ON public.aff_commissions;
DROP POLICY IF EXISTS "aff_withdrawals_service_all" ON public.aff_withdrawals;

CREATE POLICY "aff_users_service_all"       ON public.aff_users       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "aff_clicks_service_all"      ON public.aff_clicks      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "aff_commissions_service_all" ON public.aff_commissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "aff_withdrawals_service_all" ON public.aff_withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_aff_clicks_ref     ON public.aff_clicks(ref_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_comm_user      ON public.aff_commissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_withdraw_user  ON public.aff_withdrawals(user_id, requested_at DESC);

-- Stats view
CREATE OR REPLACE VIEW public.aff_user_stats AS
SELECT
  u.id, u.ref_code, u.level, u.name, u.email,
  COUNT(DISTINCT cl.id)                                                            AS total_clicks,
  COUNT(DISTINCT c.id)                                                             AS total_referrals,
  COALESCE(SUM(c.commission) FILTER (WHERE c.status IN ('approved','paid')), 0)   AS total_earned,
  COALESCE(SUM(c.commission) FILTER (WHERE c.status = 'approved'), 0)             AS balance
FROM public.aff_users u
LEFT JOIN public.aff_clicks      cl ON cl.ref_code = u.ref_code
LEFT JOIN public.aff_commissions c  ON c.user_id   = u.id
GROUP BY u.id, u.ref_code, u.level, u.name, u.email;

SELECT 'Affiliate schema created successfully' AS result;
