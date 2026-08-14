-- Openthai.ai — Producer onboarding table (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บใบสมัครผู้ผลิตถาวร
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง
-- (โครงเบา — แยกจาก aff_producers ที่ผูกกับ Supabase auth)

create table if not exists public.producers (
  email        text primary key,
  company      text not null,
  contact_name text not null,
  phone        text,
  website      text,
  category     text,
  description  text,
  product_name text,
  price        numeric,
  status       text not null default 'pending'
                    check (status in ('pending','approved','rejected','suspended')),
  created_at   timestamptz not null default now()
);

-- consent คือฟิลด์ที่ backend เขียนจริงบน producers (register() ใส่ consent:true ทุกใบสมัคร —
-- PDPA: ต้องพิสูจน์การยินยอมได้) แต่ตารางเดิมไม่มี. PostgREST ตรวจ "ทุก key" ใน payload กับ schema
-- → ถ้าคอลัมน์ไม่มี จะปฏิเสธ (PGRST204/400) → persist() ตกไป file store เงียบๆ (/tmp บน Vercel =
-- หายตอน redeploy) → ใบสมัครผู้ผลิตหายทั้งหมดใน production. (stock ถูกเพิ่มแล้วใน
-- 001-shipping-stock.sql). alter แบบ idempotent ให้ schema ตรงกับที่โค้ดเขียน รันซ้ำได้ปลอดภัย
alter table public.producers add column if not exists consent boolean not null default false;

create index if not exists producers_status_idx on public.producers (status);

-- ใช้ service key เท่านั้น (เรียกจาก backend) — เปิด RLS, ไม่มี policy = bypass เฉพาะ service_role
alter table public.producers enable row level security;
