-- Openthai.ai — Auto-post Scheduler queue (/api/scheduler/*) — Supabase / Postgres
-- รันใน Supabase SQL editor เพื่อให้ "โพสต์ตั้งเวลา" ของหน้า Scheduler ทำงานได้จริงบน Vercel
--
-- ปัญหาเดิม: /api/scheduler/create เก็บโพสต์ตั้งเวลาไว้ในไฟล์ scheduler.json เท่านั้น บน Vercel ไฟล์นี้
-- อยู่ใน /tmp ซึ่ง (1) ถูกล้างทุกครั้งที่ redeploy และ (2) เป็นของ lambda แต่ละตัวแยกกัน. Vercel Cron
-- ยิง GET /api/scheduler/process ทุกวัน (09:00 UTC) แต่มันเป็นคนละ invocation กับตอนสร้างโพสต์ จึง
-- "ไม่เห็น" โพสต์ในไฟล์เดียวกัน → โพสต์ที่ตั้งเวลาไว้ (รวมถึง LINE OA broadcast อัตโนมัติเมื่อถึงเวลา)
-- ไม่เคยถูกประมวลผลจริงบน production อย่างเงียบ ๆ
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate คิวกลับเข้า
-- หน่วยความจำตอน boot, upsert ทุกครั้งที่สร้าง/เปลี่ยนสถานะ/execute, ลบเมื่อ DELETE และ
-- /api/scheduler/process (+ /due) จะดึงงานที่ถึงเวลา (status=pending & scheduled_at<=now) จาก Supabase
-- โดยตรง จึงเห็นงานข้าม invocation และรอด redeploy. ก่อน owner รัน migration นี้ โค้ด fall back ไปที่
-- ไฟล์เหมือนเดิม (ไม่ regress)

create table if not exists public.scheduler_posts (
  id           text primary key,
  platform     text,
  content      text,
  audience     text,
  language     text,
  scheduled_at timestamptz,
  status       text not null default 'pending',
  channel      text,
  error        text,
  reach_mock   integer,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  ready_at     timestamptz,
  updated_at   timestamptz not null default now()
);

-- ดัชนีสำหรับ cron: หา "โพสต์ที่ถึงเวลาแล้ว" เร็ว ๆ
create index if not exists scheduler_posts_due_idx
  on public.scheduler_posts (status, scheduled_at);

alter table public.scheduler_posts enable row level security;
