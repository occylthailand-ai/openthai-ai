-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 010 — Digital Bank Phase 2
-- OpenThaiAi · OTOP/SME/สินค้าอื่นๆ · ไทย–ASEAN–สากล
-- Adds: loans, insurance, investments, bill payments, trade finance, payroll
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Loans ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_loans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES bank_accounts(id),
  loan_type       text NOT NULL CHECK (loan_type IN (
                    'personal','sme','otop','housing','vehicle','education')),
  amount          numeric(18,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL DEFAULT 'THB',
  interest_rate   numeric(6,4) NOT NULL,
  term_months     integer NOT NULL CHECK (term_months > 0),
  monthly_payment numeric(18,2),
  total_interest  numeric(18,2),
  purpose         text,
  collateral      text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','under_review','approved',
                                      'active','paid_off','rejected','defaulted')),
  disbursed_at    timestamptz,
  matures_at      timestamptz,
  balance_owing   numeric(18,2) DEFAULT 0,
  reviewer_id     uuid REFERENCES auth.users(id),
  reviewer_notes  text,
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_loan_repayments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid NOT NULL REFERENCES bank_loans(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  amount          numeric(18,2) NOT NULL,
  principal       numeric(18,2),
  interest        numeric(18,2),
  due_date        date,
  paid_at         timestamptz,
  status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','paid','overdue','waived')),
  tx_id           uuid REFERENCES bank_transactions(id),
  created_at      timestamptz DEFAULT now()
);

-- ─── Insurance ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_insurance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type     text NOT NULL CHECK (policy_type IN (
                    'life','health','property','vehicle','liability',
                    'sme_business','crop','travel')),
  plan_code       text NOT NULL,
  plan_name_th    text NOT NULL,
  plan_name_en    text NOT NULL,
  coverage_amount numeric(18,2) NOT NULL,
  premium_monthly numeric(18,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'THB',
  beneficiary     text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','suspended','cancelled','expired')),
  policy_number   text UNIQUE,
  starts_at       timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_insurance_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_id    uuid NOT NULL REFERENCES bank_insurance(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  claim_type      text,
  description     text NOT NULL,
  amount_claimed  numeric(18,2),
  amount_approved numeric(18,2),
  docs_url        text,
  status          text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','under_review','approved','rejected','paid')),
  reviewed_at     timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ─── Investments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_investment_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  category        text NOT NULL CHECK (category IN (
                    'mutual_fund','government_bond','corporate_bond',
                    'equity','otai_token','gold','crypto_stable')),
  name_th         text NOT NULL,
  name_en         text NOT NULL,
  description_th  text,
  expected_return numeric(6,4),
  risk_level      text CHECK (risk_level IN ('low','medium','high','very_high')),
  min_investment  numeric(18,2) NOT NULL DEFAULT 1000,
  currency        text DEFAULT 'THB',
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_investments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES bank_accounts(id),
  product_code    text NOT NULL REFERENCES bank_investment_products(code),
  direction       text NOT NULL CHECK (direction IN ('buy','sell')),
  units           numeric(18,6),
  amount          numeric(18,2) NOT NULL,
  nav_price       numeric(18,6),
  currency        text DEFAULT 'THB',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','executed','cancelled','failed')),
  settled_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ─── Bill Payments ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_bill_billers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  name_th         text NOT NULL,
  name_en         text NOT NULL,
  category        text NOT NULL CHECK (category IN (
                    'utility','telecom','tax','insurance','loan','rent',
                    'government','education','hospital','subscription')),
  logo_url        text,
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bank_bill_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES bank_accounts(id),
  biller_code     text NOT NULL REFERENCES bank_bill_billers(code),
  ref1            text,
  ref2            text,
  amount          numeric(18,2) NOT NULL,
  currency        text DEFAULT 'THB',
  fee             numeric(18,2) DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','reversed')),
  paid_at         timestamptz,
  tx_id           uuid REFERENCES bank_transactions(id),
  created_at      timestamptz DEFAULT now()
);

-- ─── Trade Finance ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_trade_finance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES bank_accounts(id),
  instrument      text NOT NULL CHECK (instrument IN (
                    'lc_import','lc_export','tt','invoice_finance',
                    'trust_receipt','bank_guarantee')),
  counterparty    text NOT NULL,
  counterparty_country text,
  amount          numeric(18,2) NOT NULL,
  currency        text NOT NULL,
  purpose         text,
  documents_url   text,
  swift_ref       text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','under_review','approved',
                                      'active','settled','cancelled','rejected')),
  expires_at      timestamptz,
  settled_at      timestamptz,
  reviewer_notes  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── Payroll ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_payroll_employees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  national_id     text,
  bank_account    text,
  promptpay_id    text,
  base_salary     numeric(18,2) NOT NULL,
  currency        text DEFAULT 'THB',
  department      text,
  position        text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_payroll_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES bank_accounts(id),
  period_month    integer NOT NULL,
  period_year     integer NOT NULL,
  total_gross     numeric(18,2) NOT NULL,
  total_tax       numeric(18,2) DEFAULT 0,
  total_social    numeric(18,2) DEFAULT 0,
  total_net       numeric(18,2) NOT NULL,
  employee_count  integer,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','processing','completed','failed')),
  run_at          timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_payroll_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL REFERENCES bank_payroll_runs(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES bank_payroll_employees(id),
  gross           numeric(18,2) NOT NULL,
  tax             numeric(18,2) DEFAULT 0,
  social_security numeric(18,2) DEFAULT 0,
  other_deductions numeric(18,2) DEFAULT 0,
  net             numeric(18,2) NOT NULL,
  status          text DEFAULT 'pending',
  paid_at         timestamptz
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE bank_loans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_loan_repayments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_insurance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_insurance_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_investments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_bill_billers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_bill_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_trade_finance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payroll_employees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payroll_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payroll_lines       ENABLE ROW LEVEL SECURITY;

-- Users read/write own rows; service role bypasses RLS
CREATE POLICY "bank_loans_owner" ON bank_loans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_loan_repayments_owner" ON bank_loan_repayments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_insurance_owner" ON bank_insurance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_insurance_claims_owner" ON bank_insurance_claims FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_investment_products_read" ON bank_investment_products FOR SELECT USING (true);
CREATE POLICY "bank_investments_owner" ON bank_investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_bill_billers_read" ON bank_bill_billers FOR SELECT USING (true);
CREATE POLICY "bank_bill_payments_owner" ON bank_bill_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_trade_finance_owner" ON bank_trade_finance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bank_payroll_employees_employer" ON bank_payroll_employees FOR ALL USING (auth.uid() = employer_id);
CREATE POLICY "bank_payroll_runs_employer" ON bank_payroll_runs FOR ALL USING (auth.uid() = employer_id);
CREATE POLICY "bank_payroll_lines_employer" ON bank_payroll_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM bank_payroll_runs r WHERE r.id = run_id AND r.employer_id = auth.uid()
  ));

-- ─── updated_at triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_bank_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER tg_bank_loans_upd         BEFORE UPDATE ON bank_loans          FOR EACH ROW EXECUTE FUNCTION update_bank_updated_at();
CREATE TRIGGER tg_bank_insurance_upd     BEFORE UPDATE ON bank_insurance       FOR EACH ROW EXECUTE FUNCTION update_bank_updated_at();
CREATE TRIGGER tg_bank_trade_finance_upd BEFORE UPDATE ON bank_trade_finance   FOR EACH ROW EXECUTE FUNCTION update_bank_updated_at();
CREATE TRIGGER tg_bank_payroll_emp_upd   BEFORE UPDATE ON bank_payroll_employees FOR EACH ROW EXECUTE FUNCTION update_bank_updated_at();

-- ─── Seed data ────────────────────────────────────────────────────────────────

-- Investment products
INSERT INTO bank_investment_products (code, category, name_th, name_en, expected_return, risk_level, min_investment, sort_order)
VALUES
  ('GOVT_1Y',    'government_bond',  'พันธบัตรรัฐบาล 1 ปี',          'Government Bond 1Y',     2.50, 'low',       10000,  1),
  ('GOVT_3Y',    'government_bond',  'พันธบัตรรัฐบาล 3 ปี',          'Government Bond 3Y',     3.20, 'low',       10000,  2),
  ('CORP_IG',    'corporate_bond',   'หุ้นกู้เอกชน IG',               'Corporate Bond IG',      4.50, 'medium',    50000,  3),
  ('MF_MONEY',   'mutual_fund',      'กองทุนตลาดเงิน',                'Money Market Fund',      1.80, 'low',        1000,  4),
  ('MF_EQUITY',  'mutual_fund',      'กองทุนหุ้น SET50',              'SET50 Equity Fund',      8.00, 'high',       5000,  5),
  ('MF_ASEAN',   'mutual_fund',      'กองทุนหุ้น ASEAN',             'ASEAN Equity Fund',      9.50, 'high',       5000,  6),
  ('GOLD_ETF',   'gold',             'ทองคำ ETF',                     'Gold ETF',               5.00, 'medium',     1000,  7),
  ('OTAI_INVEST','otai_token',       'OTAI Token Investment',          'OTAI Token Investment', 12.00, 'very_high',   500,  8)
ON CONFLICT (code) DO NOTHING;

-- Bill billers (common Thai billers)
INSERT INTO bank_bill_billers (code, name_th, name_en, category, sort_order)
VALUES
  ('MEA',        'การไฟฟ้านครหลวง',            'Metropolitan Electricity Authority',  'utility',      1),
  ('PEA',        'การไฟฟ้าส่วนภูมิภาค',         'Provincial Electricity Authority',    'utility',      2),
  ('MWA',        'การประปานครหลวง',             'Metropolitan Waterworks Authority',   'utility',      3),
  ('PWA',        'การประปาส่วนภูมิภาค',          'Provincial Waterworks Authority',     'utility',      4),
  ('AIS',        'AIS',                          'AIS',                                 'telecom',      5),
  ('TRUE',       'True Move H',                  'True Move H',                         'telecom',      6),
  ('DTAC',       'DTAC',                         'DTAC',                                'telecom',      7),
  ('NT',         'NTPLC',                        'NTPLC (National Telecom)',            'telecom',      8),
  ('TOT',        'TOT',                          'TOT',                                 'telecom',      9),
  ('RD_PIT',     'กรมสรรพากร (ภ.ง.ด.)',          'Revenue Dept - Personal Income Tax',  'tax',         10),
  ('RD_CIT',     'กรมสรรพากร (ภ.ง.ด.50)',        'Revenue Dept - Corporate Tax',        'tax',         11),
  ('SSO',        'สำนักงานประกันสังคม',           'Social Security Office',              'government',  12),
  ('CUSTOMS',    'กรมศุลกากร',                   'Thai Customs Department',             'government',  13),
  ('KRUNG_LOAN', 'กรุงไทย สินเชื่อ',              'Krungthai Loan Payment',              'loan',        14),
  ('OTAI_LOAN',  'OpenThaiAi สินเชื่อ',           'OpenThaiAi Loan',                     'loan',        15),
  ('CHULA',      'จุฬาลงกรณ์มหาวิทยาลัย',         'Chulalongkorn University',            'education',   16),
  ('MAHIDOL',    'มหาวิทยาลัยมหิดล',              'Mahidol University',                  'education',   17),
  ('BUMRUNGRAD', 'โรงพยาบาลบำรุงราษฎร์',          'Bumrungrad Hospital',                 'hospital',    18),
  ('SAMITIVEJ',  'โรงพยาบาลสมิติเวช',             'Samitivej Hospital',                  'hospital',    19),
  ('NETFLIX',    'Netflix',                        'Netflix',                             'subscription', 20),
  ('YOUTUBE',    'YouTube Premium',                'YouTube Premium',                     'subscription', 21)
ON CONFLICT (code) DO NOTHING;
