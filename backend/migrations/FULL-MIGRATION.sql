-- ════════════════════════════════════════════════════════════════════════
-- OpenThai.ai — FULL MIGRATION (ครบทุกตาราง รันครั้งเดียวใน Supabase)
-- รันใน: Supabase Dashboard → SQL Editor → วาง SQL นี้ทั้งหมด → Run
-- ════════════════════════════════════════════════════════════════════════

-- ── credits (เครดิต/รางวัล/streak/ส่วนลด) ──────────────────────────────
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

-- ── producers (ผู้ผลิตที่สมัคร) ────────────────────────────────────────
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

-- ── orders (คำสั่งซื้อจากลูกค้า) ────────────────────────────────────────
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
  escrow_status  text not null default 'none'
                      check (escrow_status in ('none','held','released','refunded')),
  created_at     timestamptz not null default now()
);
create index if not exists orders_status_idx   on public.orders (status);
create index if not exists orders_producer_idx on public.orders (producer_email);
create index if not exists orders_escrow_idx   on public.orders (escrow_status);
alter table public.orders enable row level security;

-- ── order_disputes (ข้อพิพาทคำสั่งซื้อ + escrow arbitration) ──────────────
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
create index if not exists order_disputes_order_idx  on public.order_disputes (order_id);
create index if not exists order_disputes_status_idx on public.order_disputes (status);
alter table public.order_disputes enable row level security;

-- ── products (คลังสินค้า first-party) ───────────────────────────────────
create table if not exists public.products (
  id          text primary key,
  sku         text,
  name        text not null,
  category    text,
  price       numeric not null default 0,
  cost        numeric not null default 0,
  stock       integer not null default 0,
  low_stock   integer not null default 5,
  low_alerted boolean default false,
  status      text not null default 'active' check (status in ('active','inactive')),
  image_url   text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.products enable row level security;

-- ── stock_movements (บัญชีเคลื่อนไหวสต๊อก) ─────────────────────────────
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
alter table public.stock_movements enable row level security;

-- ── affiliates (ผู้ขาย Affiliate / ระบบค่าคอมมิชชั่น) ─────────────────
create table if not exists public.affiliates (
  ref_code        text primary key,
  name            text not null,
  email           text unique not null,
  phone           text,
  platform        text default 'TikTok',
  followers       text,
  channel_url     text,
  note            text,
  ref_link        text not null default '',
  tier            text not null default 'starter'
                  check (tier in ('starter','silver','gold','platinum','elite')),
  commission_rate numeric(4,2) not null default 0.20,
  total_sales     integer not null default 0,
  total_earned    numeric(12,2) not null default 0,
  pending_payout  numeric(12,2) not null default 0,
  status          text not null default 'active'
                  check (status in ('active','suspended','inactive')),
  joined_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists affiliates_email_idx  on public.affiliates (email);
create index if not exists affiliates_status_idx on public.affiliates (status);
alter table public.affiliates enable row level security;

-- ── payments (บันทึกการชำระเงิน Omise) ───────────────────────────────
create table if not exists public.payments (
  charge_id   text primary key,
  email       text,
  plan        text not null,
  method      text not null,
  amount_thb  numeric,
  status      text,
  paid        boolean default false,
  paid_at     timestamptz,
  mock_mode   boolean default false,
  created_at  timestamptz not null default now()
);
create index if not exists payments_email_idx  on public.payments (email);
create index if not exists payments_plan_idx   on public.payments (plan);
alter table public.payments enable row level security;

-- ── entitlements (สิทธิ์การใช้งานแผน — key by email) ─────────────────
create table if not exists public.entitlements (
  email           text primary key,
  plan            text not null,
  status          text not null default 'active'
                  check (status in ('active','expired','cancelled')),
  source          text,
  subscription_id text,
  started_at      timestamptz,
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create index if not exists entitlements_status_idx on public.entitlements (status);
alter table public.entitlements enable row level security;

-- ── Cloud Sync — ข้อมูลผู้ใช้ตรงกันทุกอุปกรณ์ (มือถือ + คอม + memory + cloud) ──
create table if not exists public.user_sync (
  user_key   text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists user_sync_updated_at_idx on public.user_sync (updated_at desc);
alter table public.user_sync enable row level security;

-- ════════════════════════════════════════════════════════════════════════
-- เสร็จ! ตารางทั้งหมดเปิด RLS — เข้าถึงได้เฉพาะ service_role (backend)
-- ════════════════════════════════════════════════════════════════════════
