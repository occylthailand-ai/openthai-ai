-- ============================================================
-- OpenThai AI — Supabase Database Schema
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → วาง SQL นี้ → Run
-- ============================================================

-- ============================================================
-- 1. PROFILES — ข้อมูลผู้ใช้ (ต่อจาก auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text,
  phone       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- ผู้ใช้อ่าน/แก้ได้เฉพาะโปรไฟล์ตัวเอง
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile เมื่อ user สมัคร
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. SUBSCRIPTIONS — แพ็กเกจของผู้ใช้
-- ============================================================
create table if not exists public.subscriptions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  plan        text not null default 'free',  -- 'free' | 'pro' | 'business'
  status      text not null default 'active', -- 'active' | 'expired' | 'cancelled'
  paid_at     timestamptz,
  expires_at  timestamptz,
  ref_number  text,
  amount      integer,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.subscriptions enable row level security;

-- ผู้ใช้อ่านได้เฉพาะของตัวเอง
create policy "subscriptions: own read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Auto-create free subscription เมื่อ profile ถูกสร้าง
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ============================================================
-- 3. PAYMENT_NOTIFICATIONS — การแจ้งชำระเงิน
-- ============================================================
create table if not exists public.payment_notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete set null,
  ref_number  text not null,
  plan        text not null,
  amount      integer not null,
  name        text,
  phone       text,
  email       text,
  status      text default 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_by text,
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.payment_notifications enable row level security;

create policy "payments: own read" on public.payment_notifications
  for select using (auth.uid() = user_id);

-- ============================================================
-- 4. ADMIN VIEW — ดู pending payments (สำหรับ admin activate)
-- ============================================================
create or replace view public.admin_pending_payments as
  select
    pn.id, pn.ref_number, pn.plan, pn.amount,
    pn.name, pn.phone, pn.email,
    pn.status, pn.created_at,
    p.name as profile_name
  from public.payment_notifications pn
  left join public.profiles p on p.id = pn.user_id
  where pn.status = 'pending'
  order by pn.created_at desc;

-- ============================================================
-- 5. FUNCTION: activate_subscription (admin ใช้ activate)
-- ============================================================
create or replace function public.activate_subscription(
  p_ref_number text,
  p_plan       text default 'pro',
  p_months     integer default 1
)
returns text language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  -- หา user จาก payment notification
  select user_id into v_user_id
  from public.payment_notifications
  where ref_number = p_ref_number and status = 'pending'
  limit 1;

  if v_user_id is null then
    return 'ERROR: ref_number not found or already processed';
  end if;

  -- อัปเดต subscription
  insert into public.subscriptions (user_id, plan, status, paid_at, expires_at, ref_number)
  values (
    v_user_id, p_plan, 'active',
    now(),
    now() + (p_months || ' months')::interval,
    p_ref_number
  )
  on conflict (user_id) do update set
    plan       = excluded.plan,
    status     = 'active',
    paid_at    = excluded.paid_at,
    expires_at = excluded.expires_at,
    ref_number = excluded.ref_number,
    updated_at = now();

  -- Mark notification as approved
  update public.payment_notifications
  set status = 'approved', reviewed_at = now()
  where ref_number = p_ref_number;

  return 'OK: activated ' || p_plan || ' for user ' || v_user_id;
end;
$$;

-- ============================================================
-- วิธี activate ผู้ใช้ (admin):
-- select public.activate_subscription('OTP-ABC123', 'pro', 1);
-- ============================================================
