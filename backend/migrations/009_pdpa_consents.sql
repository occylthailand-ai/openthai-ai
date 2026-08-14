-- Openthai.ai — PDPA consent records (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บ "บันทึกความยินยอม" (GAP-001) ให้ถาวร
--
-- ปัญหาเดิม: POST /api/privacy/consent บันทึก record (email, ip, purposes, version, ts) ที่เป็น
-- หลักฐานการยินยอมตาม PDPA ไว้ในไฟล์ pdpa_consents.json เท่านั้น บน Vercel ไฟล์นี้อยู่ใน /tmp
-- ซึ่งถูกล้างทุกครั้งที่ redeploy (Vercel redeploy ทุก push) → บันทึกความยินยอม "ทั้งหมด" หายหลัง
-- deploy → ถ้าถูกถามว่าพิสูจน์ได้ไหมว่าผู้ใช้คนนี้ยินยอมจริง คำตอบคือพิสูจน์ไม่ได้ ทั้งที่ /api/
-- privacy/policy โฆษณาว่า "GAP-001: บันทึก consent record ✅" และ access/erasure อ่านตารางนี้
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate บันทึก
-- กลับเข้าหน่วยความจำตอน boot (กู้คืนหลัง redeploy) และ upsert ทุกครั้งที่มีการบันทึกความยินยอมใหม่
-- ก่อน owner รัน migration นี้ โค้ด fall back ไปที่ไฟล์เหมือนเดิม (ไม่ regress) — พอรันแล้วบันทึก
-- ความยินยอมจะถาวรทันทีโดยไม่ต้องแก้โค้ด (เก็บ record ล่าสุดต่ออีเมล ตาม upsert-by-email เดิม)

create table if not exists public.pdpa_consents (
  email      text primary key,
  id         text,
  ip         text,
  purposes   jsonb not null default '[]'::jsonb,
  version    text,
  consented  boolean not null default true,
  ts         timestamptz not null default now()
);

alter table public.pdpa_consents enable row level security;
