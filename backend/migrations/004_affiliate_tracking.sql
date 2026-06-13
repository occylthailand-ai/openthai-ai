-- ═══════════════════════════════════════════════════════════════════
--  Migration 004 — Affiliate Tracking
--  ต้องรัน Migration 001+002+003 ก่อน
-- ═══════════════════════════════════════════════════════════════════

-- 1. ตาราง affiliates (ย้ายจาก JSON file มา Supabase)
CREATE TABLE IF NOT EXISTS public.affiliates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  phone            TEXT,
  platform         TEXT DEFAULT 'TikTok',
  followers        TEXT,
  channel_url      TEXT,
  note             TEXT,
  ref_code         TEXT UNIQUE NOT NULL,
  ref_link         TEXT NOT NULL,
  tier             TEXT NOT NULL DEFAULT 'starter'
                   CHECK (tier IN ('starter','silver','gold','platinum','elite')),
  commission_rate  NUMERIC(4,2) NOT NULL DEFAULT 0.20,
  total_sales      INTEGER NOT NULL DEFAULT 0,
  total_earned     NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_payout   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','inactive')),
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตาราง affiliate_conversions — บันทึกทุก conversion
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id        UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_id           TEXT,
  sale_amount_thb   NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_thb    NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate   NUMERIC(4,2)  NOT NULL DEFAULT 0.20,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','paid','voided')),
  ip_address        INET,
  ref_code_used     TEXT,
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);

-- 3. ตาราง affiliate_payouts — บันทึกการจ่ายเงิน affiliate
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_thb      NUMERIC(12,2) NOT NULL,
  method          TEXT DEFAULT 'bank_transfer',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed')),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code      ON public.affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_email         ON public.affiliates(email);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate    ON public.affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_converted_at ON public.affiliate_conversions(converted_at DESC);

-- 5. Auto-update updated_at
DROP TRIGGER IF EXISTS trg_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER trg_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Tier upgrade function — อัปเกรด tier อัตโนมัติตาม total_sales
CREATE OR REPLACE FUNCTION update_affiliate_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.total_sales >= 5000000  THEN 'elite'
    WHEN NEW.total_sales >= 1000000  THEN 'platinum'
    WHEN NEW.total_sales >= 300000   THEN 'gold'
    WHEN NEW.total_sales >= 50000    THEN 'silver'
    ELSE 'starter'
  END;
  NEW.commission_rate := CASE NEW.tier
    WHEN 'elite'    THEN 0.40
    WHEN 'platinum' THEN 0.35
    WHEN 'gold'     THEN 0.30
    WHEN 'silver'   THEN 0.25
    ELSE 0.20
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliate_tier ON public.affiliates;
CREATE TRIGGER trg_affiliate_tier
  BEFORE UPDATE OF total_sales ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_tier();

-- 7. RLS
ALTER TABLE public.affiliates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts      ENABLE ROW LEVEL SECURITY;

-- ✅ Migration 004 เสร็จสมบูรณ์
-- ═══════════════════════════════════════════════════════════════════
--  หลังรัน migration ทั้งหมด (001–004):
--  1. ไปที่ Authentication → Providers → Email → เปิด "Enable Email"
--  2. ไปที่ Settings → API → คัดลอก SUPABASE_URL และ SUPABASE_ANON_KEY
--  3. เพิ่ม ENV vars ใน Vercel Dashboard:
--     SUPABASE_URL=https://xxxx.supabase.co
--     SUPABASE_ANON_KEY=eyJ...
--     SUPABASE_SERVICE_KEY=eyJ...  (สำหรับ admin operations)
-- ═══════════════════════════════════════════════════════════════════
