-- Openthai.ai — Landing-page email waitlist / capture (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บอีเมลที่สมัครรับข่าวจากหน้า Landing ให้ถาวร
--
-- ปัญหาเดิม: POST /api/waitlist (ช่องกรอกอีเมลบนหน้าแรก — ต้นทางสุดของ funnel การตลาด) เก็บ
-- รายชื่อไว้ในไฟล์ waitlist.json เท่านั้น บน Vercel ไฟล์นี้อยู่ใน /tmp ซึ่งถูกล้างทุกครั้งที่
-- redeploy (Vercel redeploy ทุก push) → อีเมลที่ผู้สนใจกรอกไว้ "หายเกลี้ยง" ทุกครั้งที่ deploy
-- ทั้งที่เป็นลีดการตลาดที่มีค่าที่สุด (สมัครรับข่าว = ยินยอมแบบ notice พร้อม timestamp+source)
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate ราย
-- ชื่อกลับเข้าหน่วยความจำตอน boot (กู้คืนหลัง redeploy) และ upsert ทุกครั้งที่มีคนสมัครใหม่
-- (on_conflict email → กันซ้ำ). การลบข้อมูล PDPA (/api/privacy/erasure/confirm) จะลบแถวที่ตรง
-- อีเมลออกจากตารางนี้ด้วย. ก่อน owner รัน migration นี้ โค้ด fall back ไปที่ไฟล์เหมือนเดิม
-- (ไม่ regress) — พอรันแล้วรายชื่อจะถาวรทันทีโดยไม่ต้องแก้โค้ด

create table if not exists public.waitlist (
  email     text primary key,
  source    text,
  joined_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
