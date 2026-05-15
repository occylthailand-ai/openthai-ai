-- ═══════════════════════════════════════════════════════════════════
--  Migration 001 — Users & Auth
--  รัน: Supabase Dashboard → SQL Editor → วางทั้งหมด → Run
-- ═══════════════════════════════════════════════════════════════════

-- 1. ตาราง users
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  plan          TEXT NOT NULL DEFAULT 'free'    CHECK (plan IN ('free','starter','pro','enterprise')),
  credits       INTEGER NOT NULL DEFAULT 10,
  credits_used  INTEGER NOT NULL DEFAULT 0,
  google_id     TEXT UNIQUE,
  line_user_id  TEXT UNIQUE,
  status        TEXT NOT NULL DEFAULT 'active'  CHECK (status IN ('active','suspended','deleted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตาราง sessions (JWT blacklist + refresh tokens)
CREATE TABLE IF NOT EXISTS public.sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    INET,
  user_agent    TEXT
);

-- 3. ตาราง waitlist
CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  source     TEXT DEFAULT 'landing',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email         ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan          ON public.users(plan);

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS — เปิดใช้งาน Row Level Security
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ✅ Migration 001 เสร็จสมบูรณ์
