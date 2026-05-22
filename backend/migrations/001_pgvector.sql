-- OpenThai AI — pgvector Migration
-- Run this in Supabase SQL Editor → Database → SQL Editor
-- Required: supabase.com → project → Extensions → enable vector

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Memory entries table
CREATE TABLE IF NOT EXISTS memory_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL DEFAULT 'global',
  type        TEXT NOT NULL DEFAULT 'content',
  text        TEXT NOT NULL,
  embedding   vector(768),          -- Google text-embedding-004 / 768-dim
  metadata    JSONB DEFAULT '{}',
  score       FLOAT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_memory_tenant    ON memory_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memory_type      ON memory_entries(type);
CREATE INDEX IF NOT EXISTS idx_memory_created   ON memory_entries(created_at DESC);

-- 4. IVFFlat index for vector similarity search (ดีกว่า HNSW สำหรับ <1M rows)
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. RLS — tenants เห็นแค่ข้อมูลตัวเอง
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON memory_entries
  USING (tenant_id = current_setting('app.tenant_id', true)::TEXT OR current_setting('app.is_admin', true) = 'true');

-- 6. Helper function: cosine similarity search
CREATE OR REPLACE FUNCTION search_memory(
  p_tenant_id  TEXT,
  p_embedding  vector(768),
  p_type       TEXT DEFAULT NULL,
  p_top_k      INT  DEFAULT 10,
  p_threshold  FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID, tenant_id TEXT, type TEXT, text TEXT,
  metadata JSONB, score FLOAT, similarity FLOAT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id, me.tenant_id, me.type, me.text,
    me.metadata, me.score,
    1 - (me.embedding <=> p_embedding) AS similarity,
    me.created_at
  FROM memory_entries me
  WHERE me.tenant_id = p_tenant_id
    AND (p_type IS NULL OR me.type = p_type)
    AND (1 - (me.embedding <=> p_embedding)) >= p_threshold
  ORDER BY me.embedding <=> p_embedding
  LIMIT p_top_k;
END;
$$;

-- 7. Webhook registrations table
CREATE TABLE IF NOT EXISTS webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL DEFAULT 'global',
  url         TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',
  secret      TEXT NOT NULL,
  description TEXT DEFAULT '',
  active      BOOLEAN DEFAULT TRUE,
  fail_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);

-- 8. Webhook deliveries log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id   UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,
  status_code  INT,
  ok           BOOLEAN DEFAULT FALSE,
  payload      JSONB,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered ON webhook_deliveries(delivered_at DESC);

-- 9. Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  api_key_hash  TEXT UNIQUE NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free',
  business_type TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  active        BOOLEAN DEFAULT TRUE,
  daily_usage   INT DEFAULT 0,
  last_reset    DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_email   ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key_hash);

-- 10. Video jobs table
CREATE TABLE IF NOT EXISTS video_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL DEFAULT 'global',
  job_id      TEXT,
  provider    TEXT NOT NULL DEFAULT 'mock',
  status      TEXT NOT NULL DEFAULT 'queued',
  script      JSONB,
  preview_url TEXT,
  form        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_tenant  ON video_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_status  ON video_jobs(status);

-- 11. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL DEFAULT 'global',
  charge_id     TEXT UNIQUE,
  subscription_id TEXT,
  customer_id   TEXT,
  plan          TEXT,
  amount_thb    INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant  ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge  ON payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);

COMMENT ON TABLE memory_entries IS 'OpenThai AI Vector Memory — pgvector powered';
COMMENT ON TABLE webhooks IS 'Webhook registrations per tenant';
COMMENT ON TABLE tenants IS 'Multi-tenant accounts';
COMMENT ON TABLE video_jobs IS 'Video generation job queue';
COMMENT ON TABLE payments IS 'Omise payment records';
