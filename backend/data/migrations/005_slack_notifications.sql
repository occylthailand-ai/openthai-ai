-- Migration 005 — Slack & Notification Channel Tracking
-- Applied: 2026-05-24

-- Track notification channels configured
CREATE TABLE IF NOT EXISTS notification_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL CHECK (channel IN ('slack','line','email','sms')),
  endpoint    TEXT NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Track Slack-specific events sent
CREATE TABLE IF NOT EXISTS slack_events (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ DEFAULT NOW(),
  event_type  TEXT NOT NULL,
  channel     TEXT,
  message     TEXT,
  status      TEXT CHECK (status IN ('sent','failed','skipped')),
  meta        JSONB
);

-- Skills gap tracking (from system_charter skills_radar pillar)
CREATE TABLE IF NOT EXISTS skills_gap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill       TEXT NOT NULL,
  status      TEXT CHECK (status IN ('missing','partial','complete')),
  priority    TEXT CHECK (priority IN ('critical','high','medium','low')),
  notes       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial skills gap data
INSERT INTO skills_gap (skill, status, priority, notes) VALUES
  ('Supabase Auth integration', 'missing', 'critical', 'P5 DIRECTIVE-003'),
  ('Omise PromptPay live', 'missing', 'critical', 'P4 DIRECTIVE-003'),
  ('Claude API production', 'missing', 'critical', 'P1 DIRECTIVE-003 — needs ANTHROPIC_API_KEY'),
  ('Slack webhook notifications', 'complete', 'high', 'SHIFT-003 완료'),
  ('LINE notification', 'partial', 'high', 'Code ready, needs LINE_NOTIFY_TOKEN'),
  ('Redis session cache', 'missing', 'medium', 'docker-compose has Redis, backend not wired'),
  ('PDPA consent tracking', 'missing', 'high', 'Thai law requirement'),
  ('Affiliate Supabase migration', 'missing', 'high', 'Currently file-based, needs DB'),
  ('n8n automation active', 'partial', 'medium', 'workflow file exists, needs n8n running')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_slack_events_ts ON slack_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills_gap(status, priority);
