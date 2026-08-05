-- Openthai.ai — Video generation jobs (/api/video/*) — Supabase / Postgres
-- รันใน Supabase SQL editor เพื่อให้งานสร้างวิดีโอ (ที่จ่ายเงินจริงต่อคลิป) ตามผลได้จริงบน Vercel
--
-- ปัญหาเดิม: POST /api/video/generate ส่งงานไปผู้ให้บริการวิดีโอ (Runway/Pika/Kling/Luma/Veo — คิดเงิน
-- จริงต่อคลิป) แล้วเก็บ job_id ไว้ในไฟล์ video_jobs.json เท่านั้น บน Vercel ไฟล์นี้อยู่ใน /tmp ซึ่ง
-- ถูกล้างทุกครั้งที่ redeploy และเป็นของ lambda แต่ละตัวแยกกัน → GET /api/video/jobs/:id/status คืน
-- 404 "job not found" หลัง redeploy หรือเมื่อโดน instance อื่น ผู้ใช้จึงดึงผลวิดีโอที่ "จ่ายเงินไปแล้ว"
-- ไม่ได้อีก
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate งานกลับเข้า
-- หน่วยความจำตอน boot, upsert ทุกครั้งที่สร้าง/อัปเดตสถานะ, และ /status จะค้นหางานจาก Supabase
-- โดยตรงถ้าไม่พบในหน่วยความจำ (poll ได้ข้าม instance และรอด redeploy). ก่อน owner รัน migration นี้
-- โค้ด fall back ไปที่ไฟล์เหมือนเดิม (ไม่ regress)

create table if not exists public.video_jobs (
  id         text primary key,
  form       jsonb,
  script     jsonb,
  job        jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_jobs_created_idx
  on public.video_jobs (created_at desc);

alter table public.video_jobs enable row level security;
