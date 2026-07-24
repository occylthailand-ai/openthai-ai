-- Openthai.ai — Broadcast newsletter opt-out list (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บรายชื่ออีเมลที่ "ยกเลิกรับข่าวสาร broadcast" ให้ถาวร
--
-- ปัญหาเดิม: /api/broadcast/unsubscribe เก็บรายชื่อ opt-out ไว้ในไฟล์ broadcast_unsubscribed.json
-- เท่านั้น บน Vercel ไฟล์นี้อยู่ใน /tmp ซึ่งถูกล้างทุกครั้งที่ redeploy (และ Vercel redeploy ทุก
-- push) → คนที่กด "ยกเลิกรับข่าวสาร" จะถูก re-subscribe เงียบๆ หลัง deploy แล้วได้อีเมลการตลาด
-- ซ้ำ ทั้งที่ถอนความยินยอมไปแล้ว = ละเมิด opt-out (PDPA ม.19 / กันสแปม ต้องเคารพการถอนตัว)
--
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง: hydrate ราย
-- ชื่อกลับเข้าหน่วยความจำตอน boot (กู้คืนหลัง redeploy) และ upsert ทุกครั้งที่มีคนยกเลิกใหม่
-- ก่อน owner รัน migration นี้ โค้ดจะ fall back ไปที่ไฟล์เหมือนเดิม (ไม่ regress) — พอรันแล้ว
-- opt-out จะถาวรทันทีโดยไม่ต้องแก้โค้ด

create table if not exists public.broadcast_unsubscribes (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.broadcast_unsubscribes enable row level security;
