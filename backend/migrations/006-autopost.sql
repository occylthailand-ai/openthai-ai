-- 006 — Auto-Post + Link Tracker tables
-- รัน 1 ครั้ง: psql $DATABASE_URL -f migrations/006-autopost.sql

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
