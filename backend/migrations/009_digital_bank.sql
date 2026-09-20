-- ================================================================
-- 009_digital_bank.sql  —  OpenThaiAi Digital Bank of Thailand
-- ธนาคารดิจิทัลไทย ภายใต้ OpenThaiAi
-- OTOP / SME / สินค้าอื่นๆ  |  ไทย–ASEAN–สากล
-- ================================================================
-- NOTE: This migration requires PDPA Gate G1 sign-off from Legal
-- before any real-money operations go live.
-- ================================================================

-- ─── KYC Applications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_kyc_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','under_review','approved','rejected','requires_info')),
  kyc_level      TEXT NOT NULL DEFAULT 'basic'
                   CHECK (kyc_level IN ('basic','enhanced','business')),
  full_name_th   TEXT,
  full_name_en   TEXT,
  id_type        TEXT CHECK (id_type IN ('thai_id','passport','foreigner_id')),
  id_number      TEXT,
  id_expiry      DATE,
  date_of_birth  DATE,
  address_th     JSONB,
  address_en     JSONB,
  selfie_url     TEXT,
  id_front_url   TEXT,
  id_back_url    TEXT,
  business_reg_url TEXT,
  reviewer_id    UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  pdpa_consent_at TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ DEFAULT now(),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON bank_kyc_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON bank_kyc_applications(status);

-- ─── Bank Accounts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_id           UUID REFERENCES bank_kyc_applications(id),
  account_number   TEXT UNIQUE NOT NULL,
  account_type     TEXT NOT NULL DEFAULT 'savings'
                     CHECK (account_type IN ('savings','current','business','escrow','otai_staking')),
  currency         TEXT NOT NULL DEFAULT 'THB',
  balance          NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  hold_balance     NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (hold_balance >= 0),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('pending','active','suspended','closed')),
  interest_rate    NUMERIC(6,4) DEFAULT 0,
  interest_accrued NUMERIC(18,6) DEFAULT 0,
  promptpay_id     TEXT,
  is_primary       BOOLEAN DEFAULT false,
  tier             TEXT DEFAULT 'standard'
                     CHECK (tier IN ('standard','silver','gold','platinum')),
  opened_at        TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_acc_user   ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_acc_number ON bank_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_bank_acc_status ON bank_accounts(status);

-- ─── Bank Transactions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES bank_accounts(id),
  ref_account_id   UUID REFERENCES bank_accounts(id),
  type             TEXT NOT NULL
                     CHECK (type IN (
                       'deposit','withdrawal','transfer_in','transfer_out',
                       'payment','refund','interest','fee','fx_buy','fx_sell',
                       'staking_in','staking_out','escrow_hold','escrow_release',
                       'otai_reward','promptpay_in','promptpay_out'
                     )),
  amount           NUMERIC(18,6) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'THB',
  fx_rate          NUMERIC(18,8),
  thb_equivalent   NUMERIC(18,6),
  balance_before   NUMERIC(18,6) NOT NULL,
  balance_after    NUMERIC(18,6) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('pending','completed','failed','reversed')),
  description      TEXT,
  reference        TEXT,
  counterparty_name TEXT,
  counterparty_bank TEXT,
  counterparty_account TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txn_account ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_txn_created ON bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_type    ON bank_transactions(type);
CREATE INDEX IF NOT EXISTS idx_txn_status  ON bank_transactions(status);

-- ─── Bank Products (Loans, FDs, etc.) ───────────────────────────
CREATE TABLE IF NOT EXISTS bank_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  name_th          TEXT NOT NULL,
  name_en          TEXT NOT NULL,
  category         TEXT NOT NULL
                     CHECK (category IN (
                       'savings','fixed_deposit','loan_personal',
                       'loan_sme','loan_otop','insurance','investment',
                       'fx_forward','trade_finance','otai_staking'
                     )),
  currency         TEXT DEFAULT 'THB',
  min_amount       NUMERIC(18,2),
  max_amount       NUMERIC(18,2),
  interest_rate    NUMERIC(6,4),
  term_months      INT,
  eligibility      JSONB DEFAULT '{}',
  features         JSONB DEFAULT '[]',
  is_active        BOOLEAN DEFAULT true,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FX Rates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_fx_rates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency    TEXT NOT NULL,
  quote_currency   TEXT NOT NULL,
  buy_rate         NUMERIC(18,8) NOT NULL,
  sell_rate        NUMERIC(18,8) NOT NULL,
  mid_rate         NUMERIC(18,8) GENERATED ALWAYS AS ((buy_rate + sell_rate) / 2) STORED,
  source           TEXT DEFAULT 'BOT',
  valid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, quote_currency, valid_at)
);

CREATE INDEX IF NOT EXISTS idx_fx_pair ON bank_fx_rates(base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS idx_fx_valid ON bank_fx_rates(valid_at DESC);

-- ─── Cards ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES bank_accounts(id),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  card_type        TEXT NOT NULL CHECK (card_type IN ('debit','virtual','prepaid')),
  network          TEXT DEFAULT 'visa' CHECK (network IN ('visa','mastercard','unionpay')),
  masked_number    TEXT,
  expiry_month     INT,
  expiry_year      INT,
  name_on_card     TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('pending','active','frozen','cancelled')),
  daily_limit      NUMERIC(18,2) DEFAULT 50000,
  monthly_limit    NUMERIC(18,2) DEFAULT 500000,
  contactless      BOOLEAN DEFAULT true,
  online_enabled   BOOLEAN DEFAULT true,
  issued_at        TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_account ON bank_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_card_user    ON bank_cards(user_id);

-- ─── Beneficiaries (saved payees) ────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_beneficiaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname         TEXT NOT NULL,
  bank_name        TEXT,
  account_number   TEXT,
  promptpay_id     TEXT,
  account_name     TEXT,
  currency         TEXT DEFAULT 'THB',
  is_favourite     BOOLEAN DEFAULT false,
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benef_user ON bank_beneficiaries(user_id);

-- ─── Staking Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_staking (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  account_id       UUID NOT NULL REFERENCES bank_accounts(id),
  product_code     TEXT NOT NULL,
  staked_amount    NUMERIC(18,6) NOT NULL CHECK (staked_amount > 0),
  currency         TEXT DEFAULT 'OTAI',
  apy              NUMERIC(6,4) NOT NULL,
  term_days        INT NOT NULL,
  reward_accrued   NUMERIC(18,6) DEFAULT 0,
  status           TEXT DEFAULT 'active'
                     CHECK (status IN ('active','matured','withdrawn','cancelled')),
  starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  matures_at       TIMESTAMPTZ NOT NULL,
  withdrawn_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staking_user ON bank_staking(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_status ON bank_staking(status);

-- ─── mBridge / Cross-border Transfers ────────────────────────────
-- NOTE: mBridge operations require Bank of Thailand regulatory approval.
-- This table stores intent records; actual settlement is via BOT API.
CREATE TABLE IF NOT EXISTS bank_mbridge_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  from_account_id  UUID NOT NULL REFERENCES bank_accounts(id),
  send_amount      NUMERIC(18,6) NOT NULL,
  send_currency    TEXT NOT NULL,
  receive_amount   NUMERIC(18,6),
  receive_currency TEXT NOT NULL,
  recipient_name   TEXT,
  recipient_bank   TEXT,
  recipient_country TEXT,
  corridor         TEXT CHECK (corridor IN ('TH_CN','TH_HK','TH_AE','TH_SA','TH_SG','TH_MY','TH_ID','TH_VN','TH_PH')),
  bot_ref          TEXT,
  status           TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  fee_amount       NUMERIC(18,6),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mbridge_user ON bank_mbridge_transfers(user_id);

-- ─── Seed: Default Bank Products ─────────────────────────────────
INSERT INTO bank_products (code, name_th, name_en, category, currency, interest_rate, min_amount, max_amount, features)
VALUES
  ('SAV_BASIC',    'บัญชีออมทรัพย์ดิจิทัล',     'Digital Savings Account',      'savings',        'THB', 1.50,    500,    NULL,    '["PromptPay ฟรี","ถอน ATM ฟรี 5 ครั้ง/เดือน","ดอกเบี้ยทบต้นรายวัน"]'),
  ('SAV_BIZ',      'บัญชีธุรกิจ SME',             'SME Business Account',         'savings',        'THB', 1.75,   5000,    NULL,    '["รายงานทางบัญชีอัตโนมัติ","API Integration","สินเชื่อ OD"]'),
  ('FD_3M',        'ฝากประจำ 3 เดือน',            '3-Month Fixed Deposit',        'fixed_deposit',  'THB', 2.25,  10000, 10000000,'["รับดอกเบี้ยตอนครบกำหนด","ต่ออายุอัตโนมัติ"]'),
  ('FD_12M',       'ฝากประจำ 12 เดือน',           '12-Month Fixed Deposit',       'fixed_deposit',  'THB', 3.50,  10000, 10000000,'["รับดอกเบี้ยรายเดือน","ต่ออายุอัตโนมัติ"]'),
  ('LOAN_SME',     'สินเชื่อ SME ดิจิทัล',         'SME Digital Loan',             'loan_sme',       'THB', 6.99,  50000, 5000000, '["อนุมัติภายใน 24 ชม.","ไม่ต้องมีหลักทรัพย์ค้ำประกันสูงสุด 500,000 บาท","AI Credit Scoring"]'),
  ('LOAN_OTOP',    'สินเชื่อ OTOP เพื่อการส่งออก', 'OTOP Export Loan',             'loan_otop',      'THB', 4.50,  20000, 2000000, '["อัตราพิเศษสำหรับสินค้า OTOP","เงื่อนไขผ่อนปรน","คู่มือส่งออก"]'),
  ('OTAI_STAKE',   'OTAI Staking',                'OTAI Token Staking',           'otai_staking',   'OTAI',12.00,   100,    NULL,    '["APY 12% ต่อปี","ถอนก่อนกำหนดได้","ได้รับสิทธิ์ Premium"]')
ON CONFLICT (code) DO NOTHING;

-- ─── Triggers: updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN VALUES ('bank_kyc_applications'),('bank_accounts'),('bank_products'),('bank_cards')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_%I ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ─── Row-Level Security ──────────────────────────────────────────
ALTER TABLE bank_kyc_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_beneficiaries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_staking          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_mbridge_transfers ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by backend with SUPABASE_SERVICE_KEY)
