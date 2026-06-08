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
