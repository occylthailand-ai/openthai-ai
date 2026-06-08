-- คลังสินค้า first-party (รันใน Supabase ถ้าเปิดใช้)
create table if not exists public.products (
  id          text primary key,
  sku         text,
  name        text not null,
  category    text,
  price       numeric not null default 0,
  cost        numeric not null default 0,
  stock       integer not null default 0,
  low_stock   integer not null default 5,
  status      text not null default 'active' check (status in ('active','inactive')),
  image_url   text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.stock_movements (
  id         text primary key,
  product_id text not null,
  delta      integer not null,
  type       text not null check (type in ('restock','sale','adjust')),
  reason     text,
  ref        text,
  platform   text,
  at         timestamptz not null default now()
);
create index if not exists stock_mv_product_idx on public.stock_movements (product_id);
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
