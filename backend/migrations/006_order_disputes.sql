-- Openthai.ai — Order disputes + escrow status (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเปิดใช้ระบบเปิดข้อพิพาท + พักเงินประกัน (escrow ledger)
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

alter table public.orders add column if not exists escrow_status text not null default 'none'
  check (escrow_status in ('none','held','released','refunded'));
create index if not exists orders_escrow_idx on public.orders (escrow_status);

create table if not exists public.order_disputes (
  id             text primary key,
  order_id       text not null,
  opened_by      text not null check (opened_by in ('buyer','producer')),
  opener_contact text not null,
  reason         text not null,
  evidence       text,
  status         text not null default 'open'
                      check (status in ('open','ai_reviewed','resolved_supplier','resolved_buyer','refunded')),
  ai_suggestion  jsonb,
  resolution     jsonb,
  history        jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

-- counter_response คือฟิลด์ที่ backend เขียนจริงบน order_disputes แต่ตารางเดิม (ตอนสร้างครั้งแรก)
-- ไม่มี — open() ใส่ counter_response:null ลงทุกเรคคอร์ด และ respond() ตั้งเป็น object เมื่ออีกฝ่าย
-- ตอบโต้ (parties อ่านค่านี้ในมุมมองสาธารณะ). PostgREST ตรวจ "ทุก key" ใน payload กับ schema แม้ค่า
-- เป็น null → ถ้าคอลัมน์ไม่มี จะปฏิเสธ (PGRST204/400) → persist() ตกไป file store เงียบๆ (/tmp บน
-- Vercel = หายตอน redeploy). ข้อพิพาทคือกลไก escrow (พักเงินไว้) การหายเงียบจึงร้ายแรง — alter
-- แบบ idempotent ให้ schema ตรงกับที่โค้ดเขียน รันซ้ำได้ปลอดภัย
alter table public.order_disputes add column if not exists counter_response jsonb;

create index if not exists order_disputes_order_idx  on public.order_disputes (order_id);
create index if not exists order_disputes_status_idx on public.order_disputes (status);

alter table public.order_disputes enable row level security;
