-- ═══════════════════════════════════════════════════════════
--  AFFILIATE HUB — Supabase Schema
--  Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  ref_code      TEXT UNIQUE NOT NULL,         -- e.g. "SOMCHAI99"
  email_verified BOOLEAN DEFAULT FALSE,
  verify_token  TEXT,
  verify_expires_at TIMESTAMPTZ,
  level         TEXT DEFAULT 'Silver'         -- Silver | Gold | Platinum
    CHECK (level IN ('Silver','Gold','Platinum')),
  bank_account  TEXT,                         -- for manual payout
  promptpay_id  TEXT,                         -- phone or national ID
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLICKS ─────────────────────────────────────────────────
CREATE TABLE public.clicks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_code    TEXT NOT NULL REFERENCES public.users(ref_code),
  ip          TEXT,
  user_agent  TEXT,
  converted   BOOLEAN DEFAULT FALSE,          -- true when purchase happened
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMISSIONS ────────────────────────────────────────────
CREATE TABLE public.commissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  ref_code      TEXT NOT NULL,
  buyer_name    TEXT,
  product       TEXT NOT NULL,
  order_amount  NUMERIC(12,2) NOT NULL,       -- original sale price
  rate          NUMERIC(5,4) DEFAULT 0.35,    -- 35%
  commission    NUMERIC(12,2) NOT NULL,       -- order_amount × rate
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid')),
  omise_charge_id TEXT,                       -- from payment gateway
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ
);

-- ── WITHDRAWALS ────────────────────────────────────────────
CREATE TABLE public.withdrawals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id),
  amount          NUMERIC(12,2) NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('promptpay','bank')),
  destination     TEXT NOT NULL,              -- phone / account number
  status          TEXT DEFAULT 'requested'
    CHECK (status IN ('requested','processing','completed','failed')),
  scb_transfer_id TEXT,                       -- from SCB Business API
  note            TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals  ENABLE ROW LEVEL SECURITY;

-- Users: read/update own row only
CREATE POLICY "users_own" ON public.users
  FOR ALL USING (id = auth.uid()::UUID);

-- Commissions: read own
CREATE POLICY "commissions_own" ON public.commissions
  FOR SELECT USING (user_id = auth.uid()::UUID);

-- Withdrawals: read / insert own
CREATE POLICY "withdrawals_own" ON public.withdrawals
  FOR ALL USING (user_id = auth.uid()::UUID);

-- Clicks: insert public (tracking link), read own
CREATE POLICY "clicks_insert_public" ON public.clicks
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "clicks_read_own" ON public.clicks
  FOR SELECT USING (
    ref_code IN (SELECT ref_code FROM public.users WHERE id = auth.uid()::UUID)
  );

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_clicks_ref      ON public.clicks(ref_code, created_at DESC);
CREATE INDEX idx_comm_user       ON public.commissions(user_id, created_at DESC);
CREATE INDEX idx_comm_ref        ON public.commissions(ref_code);
CREATE INDEX idx_withdraw_user   ON public.withdrawals(user_id, requested_at DESC);

-- ── HELPER: user stats view ────────────────────────────────
CREATE VIEW public.user_stats AS
SELECT
  u.id,
  u.ref_code,
  u.level,
  COUNT(DISTINCT cl.id)                              AS total_clicks,
  COUNT(DISTINCT c.id)                               AS total_referrals,
  COALESCE(SUM(c.commission) FILTER (WHERE c.status IN ('approved','paid')), 0) AS total_earned,
  COALESCE(SUM(c.commission) FILTER (WHERE c.status = 'approved'), 0)           AS balance
FROM public.users u
LEFT JOIN public.clicks      cl ON cl.ref_code = u.ref_code
LEFT JOIN public.commissions c  ON c.user_id   = u.id
GROUP BY u.id, u.ref_code, u.level;

-- Grant view access
CREATE POLICY "stats_own" ON public.commissions FOR SELECT USING (TRUE);
