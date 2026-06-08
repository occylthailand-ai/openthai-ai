-- OpenThaiAi — ALL-IN-ONE migration (รันครั้งเดียวใน Supabase SQL Editor)
-- เปิดใช้ persistence ถาวรของ: เครดิต/รางวัล · ผู้ผลิต · คำสั่งซื้อ
-- backend จะใช้ตารางเหล่านี้อัตโนมัติเมื่อ SUPABASE_URL + SUPABASE_SERVICE_KEY ถูกตั้ง

-- ── credits (เครดิต/รางวัล/streak/ส่วนลด) ──────────────────────────────────────
create table if not exists public.credits (
  id          text primary key,
  balance     integer     not null default 0,
  streak_days integer     not null default 0,
  streak_date text,
  spun        boolean     not null default false,
  prize       text,
  claims      jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists credits_updated_at_idx on public.credits (updated_at);
alter table public.credits enable row level security;

-- ── producers (ผู้ผลิตที่สมัครมาสังกัด) ────────────────────────────────────────
create table if not exists public.producers (
  email        text primary key,
  company      text not null,
  contact_name text not null,
  phone        text,
  website      text,
  category     text,
  description  text,
  product_name text,
  price        numeric,
  stock        integer,
  status       text not null default 'pending'
                    check (status in ('pending','approved','rejected','suspended')),
  created_at   timestamptz not null default now()
);
create index if not exists producers_status_idx on public.producers (status);
alter table public.producers enable row level security;

-- ── orders (คำสั่งซื้อจากลูกค้า) ───────────────────────────────────────────────
create table if not exists public.orders (
  id             text primary key,
  producer_email text,
  product_name   text not null,
  customer_name  text not null,
  contact        text not null,
  qty            integer not null default 1,
  amount         numeric,
  note           text,
  address        text,
  tracking_no    text,
  carrier        text,
  delivered_at   timestamptz,
  received_by    text,
  drop_off       text,
  proof_note     text,
  history        jsonb       not null default '[]'::jsonb,
  status         text not null default 'new'
                      check (status in ('new','contacted','confirmed','shipped','cancelled')),
  created_at     timestamptz not null default now()
);
create index if not exists orders_status_idx   on public.orders (status);
create index if not exists orders_producer_idx on public.orders (producer_email);
alter table public.orders enable row level security;

-- เสร็จ! ตารางทั้งหมดเปิด RLS ไว้ — เข้าถึงได้เฉพาะ service_role (backend) เท่านั้น
