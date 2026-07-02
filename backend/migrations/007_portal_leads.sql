-- Openthai.ai — Portal leads (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บฟอร์มจากหน้า /portals/* ถาวร
-- (ก่อนหน้านี้ 7 หน้า portal ยิงไป POST /api/leads/submit ที่ไม่มีอยู่จริงใน backend —
--  ทุกฟอร์มที่ส่งมาหายไปเงียบๆ ตารางนี้คือที่เก็บของ endpoint ที่เพิ่งเพิ่มเข้ามา)
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

create table if not exists public.portal_leads (
  id         text primary key,
  type       text not null,  -- gov-thai | gov-intl | intl-org | foundation | creator | affiliate | producer
  lang       text,
  name       text,
  email      text,
  form_data  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_leads_type_idx  on public.portal_leads (type);
create index if not exists portal_leads_email_idx on public.portal_leads (email);

alter table public.portal_leads enable row level security;
