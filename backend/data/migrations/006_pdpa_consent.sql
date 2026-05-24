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
