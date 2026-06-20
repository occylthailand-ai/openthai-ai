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
  created_at     timestamptz not null default now()
);
create index if not exists orders_status_idx   on public.orders (status);
create index if not exists orders_producer_idx on public.orders (producer_email);
alter table public.orders enable row level security;

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

-- ════════════════════════════════════════════════════════════════════════
-- เสร็จ! ตารางทั้งหมดเปิด RLS — เข้าถึงได้เฉพาะ service_role (backend)
-- ════════════════════════════════════════════════════════════════════════

-- ── kv_store (005_kv_store.sql) ──────────────────────────────────────────────
-- Openthai.ai — Durable KV store (เก็บ ledger สำคัญแบบถาวร กัน serverless /tmp หาย)
-- รันใน Supabase SQL Editor ครั้งเดียว แล้วตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน env
-- backend (backend/kv-store.js) จะใช้ตารางนี้อัตโนมัติสำหรับ payments + entitlements

create table if not exists public.kv_store (
  key        text primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

create index if not exists kv_store_updated_at_idx on public.kv_store (updated_at);

-- เข้าถึงผ่าน service key เท่านั้น (ฝั่ง server) — ปิด anon ด้วย RLS
alter table public.kv_store enable row level security;

-- ── Carriers & Logistics — ผู้จัดส่ง + งานจัดส่งตามโซน ทุกยานพาหนะ ──────────────
-- ใช้เมื่อเปิด Supabase (ไม่งั้นระบบใช้ไฟล์ JSON อัตโนมัติ)

create table if not exists public.carriers (
  id            text primary key,
  type          text default 'individual',          -- individual | fleet | company
  business_name text,
  contact_name  text,
  phone         text,
  email         text,
  line_id       text,
  vehicles      jsonb default '[]'::jsonb,           -- ['motorcycle','pickup',...]
  zones         jsonb default '[]'::jsonb,           -- ['กรุงเทพและปริมณฑล',...]
  base_province text,
  capacity_kg   numeric,
  rate_type     text default 'per_km',               -- flat | per_km | per_zone
  base_rate     numeric,
  per_km_rate   numeric,
  cod_supported boolean default false,
  express_supported boolean default false,
  refrigerated  boolean default false,
  national_id   text,
  license_plate text,
  driver_license text,
  vehicle_reg   text,
  company_reg   text,
  note          text,
  status        text default 'pending',              -- pending|verified|approved|rejected|suspended
  verified      boolean default false,
  available     boolean default true,
  rating_avg    numeric default 0,
  rating_count  integer default 0,
  jobs_done     integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists carriers_status_idx on public.carriers (status);

create table if not exists public.delivery_jobs (
  id              text primary key,
  carrier_id      text,
  shipper_name    text,
  shipper_contact text,
  pickup_address  text,
  pickup_zone     text,
  dropoff_name    text,
  dropoff_contact text,
  dropoff_address text,
  dropoff_zone    text,
  vehicle         text,
  weight_kg       numeric,
  parcel_desc     text,
  distance_km     numeric,
  express         boolean default false,
  cross_zone      boolean default false,
  cod_amount      numeric,
  quote_price     numeric,
  ref_order       text,
  status          text default 'quoted',             -- requested|quoted|assigned|accepted|picked_up|in_transit|delivered|failed|cancelled
  tracking_no     text,
  delivered_at    text,
  received_by     text,
  drop_off        text,
  proof_note      text,
  rating          integer,
  rating_comment  text,
  history         jsonb default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists delivery_jobs_status_idx on public.delivery_jobs (status);
create index if not exists delivery_jobs_carrier_idx on public.delivery_jobs (carrier_id);

-- ── 006 — Auto-Post + Link Tracker tables ────────────────────────────────────

-- autopost_batches: บันทึกทุก batch ที่โพสต์
CREATE TABLE IF NOT EXISTS autopost_batches (
  id              TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  affiliate_ref   TEXT,
  product_id      TEXT,
  hook            TEXT,
  body            TEXT,
  cta             TEXT,
  hashtags        JSONB DEFAULT '[]',
  success_count   INT DEFAULT 0,
  total_count     INT DEFAULT 0
);

-- autopost_platform_results: ผลต่อ platform
CREATE TABLE IF NOT EXISTS autopost_platform_results (
  id              BIGSERIAL PRIMARY KEY,
  batch_id        TEXT REFERENCES autopost_batches(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  status          TEXT NOT NULL,  -- success | error | skipped
  post_id         TEXT,
  post_url        TEXT,
  tracking_link   TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- tracking_links: short links
CREATE TABLE IF NOT EXISTS tracking_links (
  code            TEXT PRIMARY KEY,
  affiliate_ref   TEXT NOT NULL,
  platform        TEXT,
  post_batch_id   TEXT,
  product_id      TEXT,
  destination     TEXT NOT NULL,
  clicks          BIGINT DEFAULT 0,
  unique_clicks   BIGINT DEFAULT 0,
  conversions     BIGINT DEFAULT 0,
  revenue         NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_click_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tl_affiliate ON tracking_links(affiliate_ref);
CREATE INDEX IF NOT EXISTS idx_tl_platform  ON tracking_links(platform);

-- tracking_clicks: every click event
CREATE TABLE IF NOT EXISTS tracking_clicks (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT REFERENCES tracking_links(code) ON DELETE SET NULL,
  ts              TIMESTAMPTZ DEFAULT NOW(),
  ip              TEXT,
  is_unique       BOOLEAN DEFAULT false,
  country         TEXT,
  platform        TEXT,
  affiliate_ref   TEXT,
  product_id      TEXT,
  ua              TEXT,
  referer         TEXT,
  event_type      TEXT DEFAULT 'click'   -- click | conversion
);
CREATE INDEX IF NOT EXISTS idx_tc_code ON tracking_clicks(code);
CREATE INDEX IF NOT EXISTS idx_tc_ts   ON tracking_clicks(ts DESC);
CREATE INDEX IF NOT EXISTS idx_tc_ref  ON tracking_clicks(affiliate_ref);

ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_clicks ENABLE ROW LEVEL SECURITY;
