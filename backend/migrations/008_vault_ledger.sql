-- หมวด 3 — Storage / Vault: Vault + Ledger Schema
-- Migration 008: Secret Vault + Financial Ledger + PCR Ledger
-- วันที่สร้าง: 2026-08-20

-- ===== SECRET VAULT =====

CREATE TABLE IF NOT EXISTS vault_secrets (
  id            BIGSERIAL PRIMARY KEY,
  key_name      TEXT NOT NULL UNIQUE,           -- ชื่อ secret เช่น 'rd_gateway_api_key'
  encrypted_val BYTEA NOT NULL,                  -- ค่าที่เข้ารหัสด้วย AES-256-GCM
  iv            BYTEA NOT NULL,                  -- initialization vector
  tag           BYTEA NOT NULL,                  -- authentication tag
  kek_id        TEXT NOT NULL DEFAULT 'default', -- Key Encryption Key ID (from SoftHSM2)
  owner_id      BIGINT REFERENCES users(id),
  scope         TEXT NOT NULL DEFAULT 'system',  -- 'system' | 'tenant' | 'user'
  expires_at    TIMESTAMPTZ,
  rotated_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_secrets_scope_idx ON vault_secrets (scope);
CREATE INDEX IF NOT EXISTS vault_secrets_expires_idx ON vault_secrets (expires_at) WHERE expires_at IS NOT NULL;

-- Secret access audit log
CREATE TABLE IF NOT EXISTS vault_access_log (
  id          BIGSERIAL PRIMARY KEY,
  secret_id   BIGINT REFERENCES vault_secrets(id),
  accessed_by BIGINT REFERENCES users(id),
  action      TEXT NOT NULL CHECK (action IN ('read', 'write', 'rotate', 'delete')),
  ip_address  INET,
  user_agent  TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== FINANCIAL LEDGER =====

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id            BIGSERIAL PRIMARY KEY,
  account_code  TEXT NOT NULL UNIQUE,   -- เช่น 'REVENUE-AFFILIATE', 'REVENUE-API'
  account_name  TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  currency      TEXT NOT NULL DEFAULT 'THB',
  balance       NUMERIC(18,4) NOT NULL DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id             BIGSERIAL PRIMARY KEY,
  txn_ref        TEXT NOT NULL,                          -- อ้างอิง transaction
  debit_account  BIGINT REFERENCES ledger_accounts(id),
  credit_account BIGINT REFERENCES ledger_accounts(id),
  amount         NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  currency       TEXT NOT NULL DEFAULT 'THB',
  description    TEXT,
  user_id        BIGINT REFERENCES users(id),
  order_id       TEXT,
  affiliate_id   BIGINT,
  source         TEXT NOT NULL CHECK (source IN ('api_usage','affiliate_commission','subscription','marketplace','manual')),
  posted_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_entries_txn_ref_idx ON ledger_entries (txn_ref);
CREATE INDEX IF NOT EXISTS ledger_entries_posted_at_idx ON ledger_entries (posted_at);
CREATE INDEX IF NOT EXISTS ledger_entries_user_id_idx ON ledger_entries (user_id);

-- ===== PCR LEDGER (Proof-of-Compliance Record) =====

CREATE TABLE IF NOT EXISTS pcr_ledger (
  id              BIGSERIAL PRIMARY KEY,
  pcr_hash        TEXT NOT NULL UNIQUE,        -- SHA-256 ของ XAdES verification result
  invoice_ref     TEXT NOT NULL,               -- เลขที่ใบแจ้งหนี้
  xades_level     TEXT NOT NULL CHECK (xades_level IN ('BES','T','EPES','A')),
  issuer_tin      TEXT,                        -- เลขประจำตัวผู้เสียภาษีผู้ออก
  receiver_tin    TEXT,
  verification_ok BOOLEAN NOT NULL,
  cert_serial     TEXT,
  ocsp_status     TEXT,
  tsa_timestamp   TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ DEFAULT NOW(),
  engine_version  TEXT NOT NULL DEFAULT 'v1.5.1-dev',
  raw_result      JSONB                        -- ผลดิบจาก XAdES verifier
);

CREATE INDEX IF NOT EXISTS pcr_ledger_invoice_ref_idx ON pcr_ledger (invoice_ref);
CREATE INDEX IF NOT EXISTS pcr_ledger_verified_at_idx ON pcr_ledger (verified_at);
CREATE INDEX IF NOT EXISTS pcr_ledger_issuer_tin_idx ON pcr_ledger (issuer_tin);

-- Seed บัญชีพื้นฐาน
INSERT INTO ledger_accounts (account_code, account_name, account_type) VALUES
  ('ASSET-CASH-THB',         'เงินสด / บัญชีธนาคาร (THB)',        'asset'),
  ('REVENUE-API',            'รายได้จากการใช้ API',                'revenue'),
  ('REVENUE-SUBSCRIPTION',   'รายได้จาก Subscription',            'revenue'),
  ('REVENUE-AFFILIATE',      'รายได้จาก Affiliate Commission',     'revenue'),
  ('REVENUE-MARKETPLACE',    'รายได้จาก Marketplace',             'revenue'),
  ('EXPENSE-INFRA',          'ค่าใช้จ่าย Infrastructure',          'expense'),
  ('EXPENSE-AFFILIATE-PAY',  'ค่าคอมมิชชันจ่าย Affiliate',        'expense'),
  ('LIABILITY-VAT',          'ภาษีมูลค่าเพิ่ม 7% ค้างจ่าย',      'liability')
ON CONFLICT (account_code) DO NOTHING;
