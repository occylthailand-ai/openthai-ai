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
