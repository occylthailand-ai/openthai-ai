-- ═══════════════════════════════════════════════════════════════════
--  Migration 002 — Subscriptions & Payments (Omise)
--  ต้องรัน Migration 001 ก่อน
-- ═══════════════════════════════════════════════════════════════════

-- 1. ตาราง plans (ราคาแพ็คเกจ)
CREATE TABLE IF NOT EXISTS public.plans (
  id            TEXT PRIMARY KEY,  -- 'free','starter','pro','enterprise'
  name          TEXT NOT NULL,
  price_thb     INTEGER NOT NULL DEFAULT 0,
  credits       INTEGER NOT NULL DEFAULT 10,
  features      JSONB DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (id, name, price_thb, credits, features) VALUES
  ('free',       'ฟรี',          0,     10,  '["สร้างคอนเทนต์ 10 ครั้ง/เดือน","AI Mock Mode"]'),
  ('starter',    'Starter',      299,   100, '["สร้างคอนเทนต์ 100 ครั้ง/เดือน","Claude AI จริง","News & Trending"]'),
  ('pro',        'Pro',          799,   500, '["สร้างคอนเทนต์ไม่จำกัด","AI Agent Scheduler","Competitor Analysis","A/B Testing"]'),
  ('enterprise', 'Enterprise',  1999,  9999, '["ทุก Feature ใน Pro","White-label","API Access","Priority Support"]')
ON CONFLICT (id) DO NOTHING;

-- 2. ตาราง subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id           TEXT NOT NULL REFERENCES public.plans(id),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  omise_customer_id TEXT,
  omise_charge_id   TEXT,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ตาราง payments
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  plan_id         TEXT NOT NULL,
  amount_thb      INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','failed','refunded','voided')),
  method          TEXT NOT NULL DEFAULT 'promptpay'
                  CHECK (method IN ('promptpay','credit_card','truemoney','mobile_banking')),
  omise_charge_id TEXT UNIQUE,
  omise_source_id TEXT,
  qr_image_url    TEXT,
  expires_at      TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id      ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status       ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_omise        ON public.payments(omise_charge_id);

-- 5. Auto-update updated_at
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE public.plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;

-- ✅ Migration 002 เสร็จสมบูรณ์
