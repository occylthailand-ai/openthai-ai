-- AI Worker — recurring automated AI tasks (content drafts, summaries, monitoring notes)
-- Migration 009: ai_worker_jobs + ai_worker_runs
-- วันที่สร้าง: 2026-09-23
--
-- ขอบเขต: งานเหล่านี้ "สร้างข้อความ" ให้ผู้ใช้ไปใช้เอง (คัดลอก/นำไปโพสต์ด้วยตัวเอง)
-- ไม่ใช่ระบบโพสต์อัตโนมัติแทนผู้ใช้ไปยังแพลตฟอร์มภายนอกที่ไม่ได้เป็นเจ้าของ (เหมือน /api/scheduler)

CREATE TABLE IF NOT EXISTS ai_worker_jobs (
  id                   TEXT PRIMARY KEY,
  owner_id             TEXT NOT NULL,             -- e:<email> หรือ d:<deviceId> (เดียวกับ credits.identityFrom)
  title                TEXT NOT NULL,
  prompt               TEXT NOT NULL,
  system_prompt        TEXT,
  interval_minutes     INTEGER NOT NULL CHECK (interval_minutes >= 15),
  credits_per_run      INTEGER NOT NULL DEFAULT 1,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at          TIMESTAMPTZ,
  last_status          TEXT,                      -- 'ok' | 'error' | 'paused_no_credit'
  run_count            INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_worker_jobs_owner_idx    ON ai_worker_jobs (owner_id);
CREATE INDEX IF NOT EXISTS ai_worker_jobs_due_idx      ON ai_worker_jobs (active, next_run_at);

CREATE TABLE IF NOT EXISTS ai_worker_runs (
  id             TEXT PRIMARY KEY,
  job_id         TEXT NOT NULL REFERENCES ai_worker_jobs(id) ON DELETE CASCADE,
  owner_id       TEXT NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  provider       TEXT,                            -- 'anthropic' | 'openrouter' | 'gemini'
  attempts       JSONB,                            -- [{provider, ok, error}]
  status         TEXT NOT NULL,                    -- 'ok' | 'error'
  output_preview TEXT,
  error          TEXT
);

CREATE INDEX IF NOT EXISTS ai_worker_runs_job_idx   ON ai_worker_runs (job_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ai_worker_runs_owner_idx ON ai_worker_runs (owner_id, started_at DESC);
