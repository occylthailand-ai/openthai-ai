-- Openthai.ai — Durable KV store (เก็บ ledger สำคัญแบบถาวร กัน serverless /tmp หาย)
-- รันใน Supabase SQL Editor ครั้งเดียว แล้วตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน env
-- backend (backend/kv-store.js) จะใช้ตารางนี้อัตโนมัติสำหรับ payments + entitlements

create table if not exists public.kv_store (
  key        text primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

create index if not exists kv_store_updated_at_idx on public.kv_store (updated_at);

-- เข้าถึงผ่าน service key เท่านั้น (ฝั่ง server) — ปิด anon ด้วย RLS
alter table public.kv_store enable row level security;
