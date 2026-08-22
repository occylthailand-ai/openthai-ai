-- Migration 008: PDPA Consent Audit Trail
-- รัน: Supabase Dashboard → SQL Editor → วางทั้งหมด → Run
-- หรือ: psql $DATABASE_URL < migrations/008_pdpa_consents.sql
-- เสิร์ฟ: กลุ่มทั้ง 6 — บันทึกหลักฐานความยินยอมตาม พ.ร.บ. PDPA มาตรา 19–20

-- ────────────────────────────────────────────────────────────────────────────
-- ตาราง consent_records — บันทึกทุกครั้งที่ผู้ใช้ให้/ถอน consent
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         text          NOT NULL,           -- UUID ผู้ใช้ หรือ "anon_xxxx"
  action          text          NOT NULL            -- 'grant' | 'withdraw' | 'withdraw-all'
                  CHECK (action IN ('grant', 'withdraw', 'withdraw-all')),
  privacy_version text          NOT NULL,           -- เวอร์ชัน Privacy Notice เช่น '1.0.0'
  -- วัตถุประสงค์การประมวลผล (ฐาน "ความยินยอม")
  consent_analytics   boolean   NOT NULL DEFAULT false,
  consent_marketing   boolean   NOT NULL DEFAULT false,
  consent_ai_training boolean   NOT NULL DEFAULT false,
  -- วัตถุประสงค์บริการหลัก (ฐาน "สัญญา" — เปลี่ยนได้เฉพาะตอนยกเลิกบัญชี)
  consent_service     boolean   NOT NULL DEFAULT true,
  -- ข้อมูลเพิ่มเติมสำหรับ Audit
  fingerprint     text,                             -- HMAC-SHA256 ของ IP+UA (truncated 16 chars)
  user_agent      text,                             -- truncated 200 chars
  source          text          DEFAULT 'web',      -- 'web' | 'consumer-portal' | 'api' | 'mobile'
  ip_hash         text,                             -- SHA-256 ของ IP (ไม่เก็บ raw IP ตาม PDPA)
  created_at      timestamptz   DEFAULT now() NOT NULL
);

-- index สำหรับ query ประวัติของผู้ใช้คนหนึ่ง
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id
  ON consent_records (user_id, created_at DESC);

-- index สำหรับ DPO audit — ค้นตามวันที่
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at
  ON consent_records (created_at DESC);

-- index สำหรับ version migration — หา user ที่ consent version เก่า
CREATE INDEX IF NOT EXISTS idx_consent_records_version
  ON consent_records (privacy_version);

-- ────────────────────────────────────────────────────────────────────────────
-- ตาราง consent_withdrawal_requests — Right to Erasure (มาตรา 33)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_withdrawal_requests (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         text          NOT NULL,
  request_type    text          NOT NULL
                  CHECK (request_type IN ('erasure', 'portability', 'restriction', 'objection')),
  reason          text,
  status          text          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_review', 'completed', 'rejected')),
  dpo_note        text,                             -- บันทึกของ DPO
  requested_at    timestamptz   DEFAULT now() NOT NULL,
  completed_at    timestamptz,
  -- กฎหมาย: ต้องดำเนินการภายใน 30 วัน (มาตรา 33 วรรค 4)
  deadline_at     timestamptz   GENERATED ALWAYS AS (requested_at + INTERVAL '30 days') STORED
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_user_id
  ON consent_withdrawal_requests (user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_status
  ON consent_withdrawal_requests (status, deadline_at);

-- ────────────────────────────────────────────────────────────────────────────
-- View: consent_current_status — สถานะล่าสุดของแต่ละผู้ใช้
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW consent_current_status AS
SELECT DISTINCT ON (user_id)
  user_id,
  privacy_version,
  consent_service,
  consent_analytics,
  consent_marketing,
  consent_ai_training,
  action           AS last_action,
  created_at       AS last_updated
FROM consent_records
ORDER BY user_id, created_at DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Row-Level Security — ผู้ใช้เข้าถึงได้เฉพาะ record ของตัวเอง
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- เจ้าของข้อมูลอ่าน/เขียน record ของตัวเองได้
CREATE POLICY consent_records_owner ON consent_records
  USING (user_id = auth.uid()::text OR user_id LIKE 'anon_%');

-- เจ้าของข้อมูลยื่น request ของตัวเองได้
CREATE POLICY withdrawal_owner ON consent_withdrawal_requests
  USING (user_id = auth.uid()::text);

-- Service role (backend API) เข้าถึงได้ทั้งหมด
CREATE POLICY consent_records_service ON consent_records
  TO service_role USING (true);

CREATE POLICY withdrawal_service ON consent_withdrawal_requests
  TO service_role USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- หมายเหตุ DPO
-- retention policy: consent records → ไม่ลบ (หลักฐานทางกฎหมาย)
--                   anon records    → ลบหลัง 2 ปี หากไม่มี active account
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE consent_records IS
  'บันทึก PDPA consent ทุกรายการ — ลบหรือแก้ไขไม่ได้ (append-only) ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล มาตรา 19–20';

COMMENT ON TABLE consent_withdrawal_requests IS
  'คำร้องสิทธิ์ตาม PDPA มาตรา 30–36 (ลบ/โอน/จำกัด/คัดค้าน) — DPO ต้องตอบสนองภายใน 30 วัน';
