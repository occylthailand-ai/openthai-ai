-- Openthai.ai — Producer→lead match requests (/api/match/request) — Supabase / Postgres
-- รันใน Supabase SQL editor เพื่อให้ระบบจับคู่ (matching engine) บันทึกคำขอจับคู่ได้จริงบน Vercel
--
-- ปัญหาเดิม: POST /api/match/request (ผู้ผลิตกดสนใจ lead ที่ระบบแนะนำ) เขียนลง Supabase ตาราง
-- `match_requests` ผ่าน matching.js — แต่ไม่มี migration ไหนสร้างตารางนี้เลย บน Vercel เมื่อ
-- SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง โค้ดจะ POST ไปตารางที่ไม่มีอยู่ → Supabase ตอบ error,
-- โค้ด fall back ไปเก็บใน match_requests.json ใน /tmp ซึ่งถูกล้างทุก redeploy และเป็นของ lambda แต่ละ
-- ตัวแยกกัน → แอดมินเปิด /api/match/requests แล้วเห็นคำขอหาย และการจับคู่ producer↔lead ไม่ถาวร
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ Supabase ถูกตั้งค่า: POST /api/match/request upsert แถวใหม่,
-- GET /api/match/requests อ่านจาก Supabase โดยตรง (ข้าม instance และรอด redeploy). ก่อน owner รัน
-- migration นี้ โค้ด fall back ไปที่ไฟล์เหมือนเดิม (ไม่ regress). คอลัมน์ตรงกับ rec ใน matching.js
-- requestMatch(): id / producer_email / lead_id / note / status / created_at.

create table if not exists public.match_requests (
  id             text primary key,
  producer_email text,
  lead_id        text,
  note           text,
  status         text not null default 'pending',
  created_at     timestamptz not null default now()
);

create index if not exists match_requests_created_idx
  on public.match_requests (created_at desc);

alter table public.match_requests enable row level security;
