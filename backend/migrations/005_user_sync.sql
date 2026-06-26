-- 005_user_sync.sql — Cloud Sync ข้อมูลผู้ใช้ข้ามอุปกรณ์ (มือถือ + คอม + memory + cloud)
-- เก็บ blob JSON ต่อผู้ใช้ · upsert ตาม user_key
create table if not exists public.user_sync (
  user_key   text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_sync_updated_at_idx on public.user_sync (updated_at desc);

-- service key เท่านั้นที่เข้าถึง (เข้าผ่าน backend ที่ตรวจ JWT แล้ว)
alter table public.user_sync enable row level security;
