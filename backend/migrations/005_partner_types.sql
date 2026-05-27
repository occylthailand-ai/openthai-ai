-- ═══════════════════════════════════════════════════════════════════
--  Migration 005 — Partner Types
--  พันธมิตร 4 ประเภท: ขาย, ผู้ผลิต (มีแล้ว), นักพัฒนา, คอนเทนต์
-- ═══════════════════════════════════════════════════════════════════

-- 1. พันธมิตรนักพัฒนา (API Partner applications)
CREATE TABLE IF NOT EXISTS public.partner_api_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT,
  email        TEXT UNIQUE NOT NULL,
  website      TEXT,
  usecase      TEXT NOT NULL,
  plan         TEXT DEFAULT 'Growth' CHECK (plan IN ('Starter','Growth','Scale')),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

-- 2. พันธมิตรคอนเทนต์ (Content Partner applications)
CREATE TABLE IF NOT EXISTS public.partner_content_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  platform      TEXT,
  followers     TEXT,
  channel_url   TEXT NOT NULL,
  content_type  TEXT,
  collab_idea   TEXT,
  tier          TEXT GENERATED ALWAYS AS (
    CASE
      WHEN followers::BIGINT >= 100000 THEN 'Macro'
      WHEN followers::BIGINT >= 10000  THEN 'Micro'
      ELSE 'Nano'
    END
  ) STORED,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

-- 3. Partner type enum สำหรับ view รวม
CREATE OR REPLACE VIEW public.all_partners AS
  SELECT id, name, email, 'sale'     AS partner_type, level::TEXT AS tier, created_at FROM public.aff_users
  UNION ALL
  SELECT id, contact_name, email, 'producer'  AS partner_type, status AS tier, created_at FROM public.aff_producers
  UNION ALL
  SELECT id, name, email, 'api'      AS partner_type, plan AS tier, created_at FROM public.partner_api_applications   WHERE status = 'approved'
  UNION ALL
  SELECT id, name, email, 'content'  AS partner_type, COALESCE(tier,'Nano') AS tier, created_at FROM public.partner_content_applications WHERE status = 'approved';

-- 4. RLS
ALTER TABLE public.partner_api_applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_content_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_app_service_all"     ON public.partner_api_applications;
DROP POLICY IF EXISTS "content_app_service_all" ON public.partner_content_applications;

CREATE POLICY "api_app_service_all"     ON public.partner_api_applications     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "content_app_service_all" ON public.partner_content_applications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_api_app_email     ON public.partner_api_applications(email);
CREATE INDEX IF NOT EXISTS idx_api_app_status    ON public.partner_api_applications(status);
CREATE INDEX IF NOT EXISTS idx_content_app_email ON public.partner_content_applications(email);
CREATE INDEX IF NOT EXISTS idx_content_app_status ON public.partner_content_applications(status);

-- ✅ Migration 005 เสร็จสมบูรณ์
-- ─────────────────────────────────────────────────────────────────────
-- ตารางที่สร้าง:
--   partner_api_applications     — ใบสมัครพันธมิตรนักพัฒนา
--   partner_content_applications — ใบสมัครพันธมิตรคอนเทนต์
-- View:
--   all_partners                 — รวมทุก partner type
-- ═══════════════════════════════════════════════════════════════════
