-- Openthai.ai — Auto-post queue (scheduled social posts) — Supabase / Postgres
-- รันใน Supabase SQL editor เพื่อให้ "โพสต์ตั้งเวลา" ทำงานได้จริงบน Vercel
--
-- ปัญหาเดิม: POST /api/autopost/queue เก็บงานโพสต์ตั้งเวลาไว้ในไฟล์ autopost_queue.json เท่านั้น
-- บน Vercel ไฟล์นี้อยู่ใน /tmp ซึ่ง (1) ถูกล้างทุกครั้งที่ redeploy (Vercel redeploy ทุก push) และ
-- (2) เป็นของ lambda instance แต่ละตัวแยกกัน — invocation ที่รับคำสั่ง queue กับ invocation ที่
-- cron (/api/autopost/process) เรียกทีหลัง "ไม่เห็น" ไฟล์เดียวกัน. อีกทั้ง cron ในเครื่อง
-- (cron.schedule) ถูกกันด้วย if (!IS_VERCEL) จึงไม่ทำงานบน production เลย. ผลคือโพสต์ที่ตั้งเวลา
-- ไว้ล่วงหน้า "ไม่ถูกส่งจริง" บน production อย่างเงียบ ๆ — ระบบการตลาดอัตโนมัติตายทั้งฟีเจอร์
-- (โพสต์ทันที schedule_at ≈ ตอนนี้ ยังส่งได้ เพราะ dispatch ใน request เลย — เฉพาะโพสต์ตั้งเวลาที่พัง)
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate คิวกลับ
-- เข้าหน่วยความจำตอน boot, upsert ทุกครั้งที่มีการ queue/เปลี่ยนสถานะ, และ /api/autopost/process
-- จะ "ดึงงานที่ถึงเวลา" จาก Supabase โดยตรง (status=queued & schedule_at<=now) จึงเห็นงานข้าม
-- invocation และรอด redeploy. ก่อน owner รัน migration นี้ โค้ด fall back ไปที่ไฟล์เหมือนเดิม
-- (ไม่ regress) — พอรันแล้วโพสต์ตั้งเวลาจะทำงานทันทีโดยไม่ต้องแก้โค้ด

create table if not exists public.autopost_queue (
  id          text primary key,
  product     text,
  content     jsonb,
  platforms   jsonb,
  schedule_at timestamptz,
  video_path  text,
  status      text not null default 'queued',
  results     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ดัชนีสำหรับ cron: หา "งานที่ถึงเวลาแล้ว" เร็ว ๆ
create index if not exists autopost_queue_due_idx
  on public.autopost_queue (status, schedule_at);

alter table public.autopost_queue enable row level security;
