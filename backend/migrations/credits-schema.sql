-- OpenThaiAi — Credit ledger table (Supabase / Postgres)
-- รันครั้งเดียวใน Supabase SQL editor เพื่อเปิดเครดิตถาวรข้าม instance
-- backend จะใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

create table if not exists public.credits (
  id          text primary key,            -- identity: e:<email> | d:<device> | i:<ip>
  balance     integer     not null default 0,
  streak_days integer     not null default 0,
  streak_date text,                          -- 'YYYY-MM-DD' ของ check-in ล่าสุด
  spun        boolean     not null default false,
  prize       text,
  claims      jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- index ช่วย query/housekeeping
create index if not exists credits_updated_at_idx on public.credits (updated_at);

-- ใช้ service key เท่านั้น (เรียกจาก backend) — ปิด RLS public access
alter table public.credits enable row level security;
-- ไม่สร้าง policy ใดๆ → ผ่านได้เฉพาะ service_role (bypass RLS) เท่านั้น
