-- producer-schema.sql
-- Run ใน Supabase SQL Editor: https://supabase.com/dashboard/project/tpeskbbhuuqztwyllnli/sql/new

-- ─────────────────────────────────────────────────────────
-- 1. Extension
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- 2. Producers Table
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aff_producers (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id        UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        UNIQUE NOT NULL,
  contact_name        TEXT        NOT NULL,
  company             TEXT        NOT NULL,
  phone               TEXT,
  website             TEXT,
  logo_url            TEXT,
  category            TEXT,
  description         TEXT,
  email_verified      BOOLEAN     DEFAULT FALSE,
  status              TEXT        DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','rejected','suspended')),
  bank_account        TEXT,
  bank_name           TEXT,
  promptpay_id        TEXT,
  commission_default  NUMERIC(5,4) DEFAULT 0.30,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  approved_at         TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────
-- 3. Products Table
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aff_products (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id     UUID        NOT NULL REFERENCES public.aff_producers(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  short_desc      TEXT,
  price           NUMERIC(12,2) NOT NULL,
  image_url       TEXT,
  category        TEXT,
  commission_rate NUMERIC(5,4) DEFAULT 0.35,
  status          TEXT        DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected','active','inactive')),
  product_url     TEXT,
  sku             TEXT,
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────
-- 4. Link commissions → product (optional column)
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.aff_commissions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.aff_products(id);

-- ─────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.aff_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_products  ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS for server-side operations
DROP POLICY IF EXISTS "aff_producers_service_all" ON public.aff_producers;
CREATE POLICY "aff_producers_service_all" ON public.aff_producers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aff_products_service_all" ON public.aff_products;
CREATE POLICY "aff_products_service_all" ON public.aff_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read only active products
DROP POLICY IF EXISTS "aff_products_public_read" ON public.aff_products;
CREATE POLICY "aff_products_public_read" ON public.aff_products
  FOR SELECT TO anon, authenticated USING (status = 'active');

-- Producers can read approved/active producers publicly (for catalog)
DROP POLICY IF EXISTS "aff_producers_public_read" ON public.aff_producers;
CREATE POLICY "aff_producers_public_read" ON public.aff_producers
  FOR SELECT TO anon, authenticated USING (status = 'approved');

-- ─────────────────────────────────────────────────────────
-- 6. Indexes
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aff_products_producer
  ON public.aff_products(producer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aff_products_status
  ON public.aff_products(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aff_producers_status
  ON public.aff_producers(status, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 7. Stats View
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.aff_producer_stats AS
SELECT
  p.id                                   AS producer_id,
  p.company,
  p.contact_name,
  p.email,
  p.status,
  COUNT(DISTINCT pr.id)                  AS total_products,
  COUNT(DISTINCT CASE WHEN pr.status = 'active' THEN pr.id END) AS active_products,
  COALESCE(SUM(c.commission), 0)         AS total_commissions_generated,
  p.created_at
FROM public.aff_producers p
LEFT JOIN public.aff_products   pr ON pr.producer_id = p.id
LEFT JOIN public.aff_commissions c  ON c.product_id  = pr.id
GROUP BY p.id, p.company, p.contact_name, p.email, p.status, p.created_at;
