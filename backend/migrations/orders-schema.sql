-- Openthai.ai — Orders table (Supabase / Postgres)
-- รันใน Supabase SQL editor เพื่อเก็บคำสั่งซื้อถาวร
-- backend ใช้ตารางนี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

create table if not exists public.orders (
  id             text primary key,
  producer_email text,
  product_name   text not null,
  customer_name  text not null,
  contact        text not null,
  qty            integer not null default 1,
  amount         numeric,
  note           text,
  status         text not null default 'new'
                      check (status in ('new','contacted','confirmed','shipped','cancelled')),
  created_at     timestamptz not null default now()
);

create index if not exists orders_status_idx     on public.orders (status);
create index if not exists orders_producer_idx   on public.orders (producer_email);

alter table public.orders enable row level security;
