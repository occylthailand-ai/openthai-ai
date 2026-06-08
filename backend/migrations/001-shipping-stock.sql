-- รันเพิ่มถ้าเคยสร้างตารางก่อนหน้า (เพิ่มคอลัมน์ติดตามการจัดส่ง + สต๊อก)
alter table public.orders add column if not exists address text;
alter table public.orders add column if not exists tracking_no text;
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists received_by text;
alter table public.orders add column if not exists drop_off text;
alter table public.orders add column if not exists proof_note text;
alter table public.orders add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.producers add column if not exists stock integer;
