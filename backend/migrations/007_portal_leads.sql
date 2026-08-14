-- Openthai.ai — Portal leads (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บฟอร์มจากหน้า /portals/* ถาวร
-- (ก่อนหน้านี้ 7 หน้า portal ยิงไป POST /api/leads/submit ที่ไม่มีอยู่จริงใน backend —
--  ทุกฟอร์มที่ส่งมาหายไปเงียบๆ ตารางนี้คือที่เก็บของ endpoint ที่เพิ่งเพิ่มเข้ามา)
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

create table if not exists public.portal_leads (
  id         text primary key,
  type       text not null,  -- gov-thai | gov-intl | intl-org | foundation | creator | affiliate | producer | consumer | middleman
  lang       text,
  name       text,
  email      text,
  form_data  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- consent + unsubscribed คือฟิลด์ที่ backend เขียน/อ่านจริงบน portal_leads แต่ตารางเดิม
-- (ตอนสร้างครั้งแรก) ไม่มี — submit() เพิ่ม consent:true ลงทุกเรคคอร์ด (PDPA: ต้องพิสูจน์การยินยอม
-- ได้) และ unsubscribe() ตั้ง unsubscribed:true (PDPA: ผู้สมัครต้องถอนความยินยอมได้ และ
-- sendConsumerDigest() กรอง !unsubscribed ก่อนส่ง). ถ้าคอลัมน์ไม่มี PostgREST ปฏิเสธ write ที่มี
-- คอลัมน์ไม่รู้จัก (PGRST204/400) → persist() ตกไป file store เงียบๆ (บน Vercel = /tmp หายตอน
-- redeploy → lead หาย) และ unsubscribe() กลายเป็น no-op (digest ยังส่งให้คนที่กดยกเลิก). alter
-- แบบ idempotent ให้ schema ตรงกับที่โค้ดเขียนจริง รันซ้ำได้ปลอดภัย
alter table public.portal_leads add column if not exists consent      boolean not null default false;
alter table public.portal_leads add column if not exists unsubscribed boolean not null default false;

create index if not exists portal_leads_type_idx  on public.portal_leads (type);
create index if not exists portal_leads_email_idx on public.portal_leads (email);

alter table public.portal_leads enable row level security;
