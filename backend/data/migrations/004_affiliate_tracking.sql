-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Affiliate Click & Conversion Tracking
-- Directive: DIR-007 (Demeter) + DIR-002 (Apollo)
-- Purpose: Track affiliate link clicks, conversions, commission payouts
-- Applied: 2026-05-14
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Affiliate Links ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ref_code      TEXT UNIQUE NOT NULL,          -- e.g. "zuejai2026"
  custom_slug   TEXT UNIQUE,                  -- optional custom slug
  campaign      TEXT DEFAULT 'general',       -- tiktok / facebook / line / etc.
  total_clicks  INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission_thb NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Affiliate Clicks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code      TEXT NOT NULL,
  affiliate_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash       TEXT,                         -- hashed IP (PDPA-safe)
  user_agent    TEXT,
  referrer      TEXT,
  landing_page  TEXT,
  converted     BOOLEAN DEFAULT false,
  converted_at  TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Affiliate Conversions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ref_code        TEXT NOT NULL,
  plan            TEXT NOT NULL,              -- pro / business
  amount_thb      NUMERIC(12,2) NOT NULL,     -- payment amount
  commission_rate NUMERIC(5,4) DEFAULT 0.10,  -- 10% lifetime
  commission_thb  NUMERIC(12,2) NOT NULL,     -- commission amount
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  payment_date    DATE,                       -- paid on this date
  invoice_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Affiliate Payouts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_thb      NUMERIC(12,2) NOT NULL,
  bank_name       TEXT,
  bank_account    TEXT,                       -- masked: xxx-x-xxxxx-x
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  payout_date     DATE,
  slip_url        TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aff_links_affiliate  ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_links_refcode    ON affiliate_links(ref_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_refcode   ON affiliate_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_clicked   ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate   ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_status      ON affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_aff_payouts_aff      ON affiliate_payouts(affiliate_id);

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE affiliate_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aff_links_own" ON affiliate_links
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_conv_own" ON affiliate_conversions
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_payouts_own" ON affiliate_payouts
  FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "aff_admin_all" ON affiliate_links
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan = 'admin'));

-- ── 7. Function: Record Click ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_affiliate_click(
  p_ref_code TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_click_id UUID;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM affiliate_links WHERE ref_code = p_ref_code AND is_active = true;

  INSERT INTO affiliate_clicks (ref_code, affiliate_id, ip_hash, user_agent, referrer, landing_page)
  VALUES (p_ref_code, v_affiliate_id, p_ip_hash, p_user_agent, p_referrer, p_landing_page)
  RETURNING id INTO v_click_id;

  -- Increment click counter
  UPDATE affiliate_links SET total_clicks = total_clicks + 1 WHERE ref_code = p_ref_code;

  RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Function: Record Conversion ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_affiliate_conversion(
  p_ref_code TEXT,
  p_referred_user_id UUID,
  p_plan TEXT,
  p_amount_thb NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_commission NUMERIC(12,2);
  v_conv_id UUID;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM affiliate_links WHERE ref_code = p_ref_code;

  v_commission := p_amount_thb * 0.10;  -- 10% lifetime commission

  INSERT INTO affiliate_conversions (affiliate_id, referred_user_id, ref_code, plan, amount_thb, commission_thb)
  VALUES (v_affiliate_id, p_referred_user_id, p_ref_code, p_plan, p_amount_thb, v_commission)
  RETURNING id INTO v_conv_id;

  -- Update totals
  UPDATE affiliate_links SET
    total_conversions = total_conversions + 1,
    total_commission_thb = total_commission_thb + v_commission
  WHERE ref_code = p_ref_code;

  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- END Migration 004
-- ─────────────────────────────────────────────────────────────────────────────
