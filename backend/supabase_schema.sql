-- ============================================================
-- OpenThai AI — Supabase Database Schema
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ===== 1. USERS PROFILE =====
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  content_count INTEGER DEFAULT 0,
  ota_balance   NUMERIC DEFAULT 0,
  wallet_address TEXT,
  referral_code TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  referred_by   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 2. SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('pro','business')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  price_thb     INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'promptpay',
  payment_ref   TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 3. CONTENT HISTORY =====
CREATE TABLE IF NOT EXISTS public.content_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  product_category TEXT,
  platform        TEXT DEFAULT 'tiktok',
  language        TEXT DEFAULT 'th',
  hook_type       TEXT,
  result_hook     TEXT,
  result_script   TEXT,
  result_hashtags TEXT[],
  result_cta      TEXT,
  critic_score    NUMERIC,
  ota_earned      INTEGER DEFAULT 5,
  is_nft          BOOLEAN DEFAULT FALSE,
  nft_token_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 4. OTA WALLET TRANSACTIONS =====
CREATE TABLE IF NOT EXISTS public.ota_transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tx_type       TEXT NOT NULL CHECK (tx_type IN ('earn','spend','stake','unstake','affiliate','nft_royalty')),
  amount        NUMERIC NOT NULL,
  balance_after NUMERIC,
  reference_id  UUID,
  tx_hash       TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 5. NFT BADGES =====
CREATE TABLE IF NOT EXISTS public.nft_badges (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id    UUID REFERENCES public.content_history(id),
  token_id      TEXT UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  ipfs_hash     TEXT,
  price_ota     NUMERIC DEFAULT 150,
  is_listed     BOOLEAN DEFAULT FALSE,
  sale_count    INTEGER DEFAULT 0,
  royalty_earned NUMERIC DEFAULT 0,
  minted_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 6. AFFILIATE =====
CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code   TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_earned_thb NUMERIC DEFAULT 0,
  total_earned_ota NUMERIC DEFAULT 0,
  payout_status   TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 7. B2G INQUIRIES =====
CREATE TABLE IF NOT EXISTS public.b2g_inquiries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id),
  ministry      TEXT NOT NULL,
  inquiry_type  TEXT NOT NULL,
  business_name TEXT NOT NULL,
  details       TEXT,
  status        TEXT DEFAULT 'submitted',
  reference_id  TEXT UNIQUE,
  response      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ota_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2g_inquiries ENABLE ROW LEVEL SECURITY;

-- Profiles: ดูได้เฉพาะของตัวเอง
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Content History: CRUD เฉพาะของตัวเอง
CREATE POLICY "Users can view own content"
  ON public.content_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content"
  ON public.content_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- OTA Transactions: ดูได้เฉพาะของตัวเอง
CREATE POLICY "Users can view own transactions"
  ON public.ota_transactions FOR SELECT USING (auth.uid() = user_id);

-- NFT: ดูได้ทุกคน (marketplace), แก้ได้เฉพาะเจ้าของ
CREATE POLICY "Anyone can view listed NFTs"
  ON public.nft_badges FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own NFTs"
  ON public.nft_badges FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: ดูได้เฉพาะของตัวเอง
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- B2G: Insert ได้ทุกคน (ไม่บังคับ login), ดูได้เฉพาะของตัวเอง
CREATE POLICY "Anyone can submit B2G inquiry"
  ON public.b2g_inquiries FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view own B2G inquiries"
  ON public.b2g_inquiries FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- AUTO-CREATE PROFILE เมื่อ User สมัครใหม่
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES (เพิ่มความเร็ว query)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_content_history_user ON public.content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_history_created ON public.content_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_tx_user ON public.ota_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_listed ON public.nft_badges(is_listed) WHERE is_listed = TRUE;
CREATE INDEX IF NOT EXISTS idx_b2g_status ON public.b2g_inquiries(status);

-- Allow only one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id) WHERE status = 'active';

-- ============================================================
-- 8. PAYMENT NOTIFICATIONS (PromptPay manual verify)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ref_number  TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL CHECK (plan IN ('pro','business')),
  amount      INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit payment notification"
  ON public.payment_notifications FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view own payment notifications"
  ON public.payment_notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_payment_status  ON public.payment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_ref     ON public.payment_notifications(ref_number);
CREATE INDEX IF NOT EXISTS idx_payment_created ON public.payment_notifications(created_at DESC);

-- ============================================================
-- RPC: activate_subscription (เรียกจาก /api/admin/activate)
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_ref_number TEXT,
  p_plan       TEXT,
  p_months     INTEGER DEFAULT 1
) RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  -- หา user_id จาก payment ที่ pending
  SELECT user_id INTO v_user_id
    FROM public.payment_notifications
    WHERE ref_number = p_ref_number AND status = 'pending';

  IF v_user_id IS NULL THEN
    RETURN 'ERROR: ref_number not found or already processed';
  END IF;

  v_expires := NOW() + (p_months || ' months')::INTERVAL;

  -- upsert subscription
  INSERT INTO public.subscriptions
    (user_id, plan, status, price_thb, payment_method, payment_ref, expires_at)
  VALUES
    (v_user_id, p_plan, 'active', 0, 'promptpay', p_ref_number, v_expires)
  ON CONFLICT (user_id) WHERE status = 'active'
  DO UPDATE SET
    plan        = EXCLUDED.plan,
    status      = 'active',
    expires_at  = EXCLUDED.expires_at,
    payment_ref = EXCLUDED.payment_ref;

  -- mark payment approved
  UPDATE public.payment_notifications
    SET status = 'approved', reviewed_at = NOW()
    WHERE ref_number = p_ref_number;

  -- update profile plan
  UPDATE public.profiles SET plan = p_plan WHERE id = v_user_id;

  RETURN 'OK: activated ' || p_plan || ' until ' || v_expires::DATE::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: check_free_limit (ตรวจสอบ free tier quota)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_free_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan  TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'plan', 'free', 'count', 0, 'limit', 3);
  END IF;

  IF v_plan != 'free' THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'count', 0, 'limit', -1);
  END IF;

  -- นับ content เดือนนี้
  SELECT COUNT(*) INTO v_count
    FROM public.content_history
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('month', NOW());

  RETURN jsonb_build_object(
    'allowed', v_count < 3,
    'plan',    'free',
    'count',   v_count,
    'limit',   3,
    'remaining', GREATEST(0, 3 - v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. PAYMENT NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ref_number  TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL CHECK (plan IN ('pro','business')),
  amount      INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own payment" ON public.payment_notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users view own payment" ON public.payment_notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_payment_status ON public.payment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_ref ON public.payment_notifications(ref_number);

-- ============================================================
-- RPC: activate_subscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_ref_number TEXT,
  p_plan TEXT,
  p_months INTEGER DEFAULT 1
) RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT user_id INTO v_user_id FROM public.payment_notifications WHERE ref_number = p_ref_number AND status = 'pending';
  IF v_user_id IS NULL THEN RETURN 'ERROR: ref_number not found or already processed'; END IF;
  v_expires := NOW() + (p_months || ' months')::INTERVAL;
  INSERT INTO public.subscriptions (user_id, plan, status, price_thb, payment_method, payment_ref, expires_at)
    VALUES (v_user_id, p_plan, 'active', 0, 'promptpay', p_ref_number, v_expires)
    ON CONFLICT (user_id) DO UPDATE SET plan = p_plan, status = 'active', expires_at = v_expires, payment_ref = p_ref_number;
  UPDATE public.payment_notifications SET status = 'approved', reviewed_at = NOW() WHERE ref_number = p_ref_number;
  UPDATE public.profiles SET plan = p_plan WHERE id = v_user_id;
  RETURN 'OK: subscription activated until ' || v_expires::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
