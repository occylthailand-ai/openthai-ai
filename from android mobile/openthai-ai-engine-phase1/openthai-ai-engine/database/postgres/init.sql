-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OpenThai.ai AI Engine - PostgreSQL Schema
-- เครื่องมือ AI OpenThai.ai - Schema PostgreSQL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 
-- Created: May 21, 2026
-- Owner: CEO Mythos (mythos@openthai.ai)
-- Version: 1.0.0
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable required extensions | เปิดใช้ extensions ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search | สำหรับค้นหาข้อความ

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- USERS & AFFILIATES | ผู้ใช้และ Affiliate
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name_thai VARCHAR(255),
    name_chinese VARCHAR(255),
    name_english VARCHAR(255),
    phone VARCHAR(20),
    
    -- Affiliate fields | ฟิลด์ affiliate
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_by UUID REFERENCES users(id),
    affiliate_tier INTEGER DEFAULT 0,  -- 0=user, 1=tier1, 2=tier2
    
    -- Preferences | ความชอบ
    preferred_language VARCHAR(10) DEFAULT 'thai',
    preferred_currency VARCHAR(10) DEFAULT 'THB',
    
    -- Metadata | ข้อมูลเมตา
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_email ON users(email);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRODUCTS | สินค้า
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    
    -- Multilingual content | เนื้อหาหลายภาษา
    name_thai VARCHAR(500),
    name_chinese VARCHAR(500),
    name_english VARCHAR(500),
    description_thai TEXT,
    description_chinese TEXT,
    description_english TEXT,
    
    -- Pricing | ราคา
    price DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'THB',
    
    -- Category & markets | หมวดหมู่และตลาด
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    markets TEXT[],  -- ['thai', 'chinese', 'english']
    
    -- Affiliate rates | อัตรา commission
    commission_rate_tier1 DECIMAL(5, 2) DEFAULT 10.0,
    commission_rate_tier2 DECIMAL(5, 2) DEFAULT 5.0,
    
    -- Inventory | สินค้าคงคลัง
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- AI metadata | ข้อมูลสำหรับ AI
    ai_embedding_id VARCHAR(100),  -- Reference to vector DB
    ai_keywords TEXT[],  -- For better search
    
    -- Metadata | ข้อมูลเมตา
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_markets ON products USING GIN(markets);
CREATE INDEX idx_products_keywords ON products USING GIN(ai_keywords);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TRANSACTIONS | ธุรกรรม
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Parties | คู่ค้า
    buyer_id UUID REFERENCES users(id) NOT NULL,
    seller_id UUID REFERENCES users(id),
    
    -- Product info | ข้อมูลสินค้า
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Pricing | ราคา
    unit_price DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    
    -- Affiliate tracking | ติดตาม affiliate
    referrer_tier1 UUID REFERENCES users(id),
    referrer_tier2 UUID REFERENCES users(id),
    commission_tier1 DECIMAL(15, 2) DEFAULT 0,
    commission_tier2 DECIMAL(15, 2) DEFAULT 0,
    
    -- Status | สถานะ
    status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, refunded, cancelled
    payment_method VARCHAR(50),  -- USDT, OTAI, THB
    payment_gateway_ref VARCHAR(255),
    
    -- Metadata | ข้อมูลเมตา
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE INDEX idx_transactions_code ON transactions(transaction_code);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AI INTERACTIONS | การโต้ตอบกับ AI
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User & session | ผู้ใช้และ session
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    
    -- Query & response | คำถามและคำตอบ
    query TEXT NOT NULL,
    query_language VARCHAR(10),
    response TEXT,
    
    -- Context used | บริบทที่ใช้
    context_ids TEXT[],  -- IDs from vector DB
    context_count INTEGER DEFAULT 0,
    
    -- AI metadata | ข้อมูล AI
    model_used VARCHAR(100),  -- e.g., claude-sonnet-4-20250514
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10, 6),
    
    -- Quality & feedback | คุณภาพและ feedback
    user_feedback_rating INTEGER,  -- 1-5
    user_feedback_helpful BOOLEAN,
    user_feedback_comment TEXT,
    
    -- Performance | ประสิทธิภาพ
    response_time_ms INTEGER,
    
    -- Metadata | ข้อมูลเมตา
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_session ON ai_interactions(session_id);
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at DESC);
CREATE INDEX idx_ai_interactions_rating ON ai_interactions(user_feedback_rating);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- KNOWLEDGE BASE | ฐานความรู้
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_code VARCHAR(100) UNIQUE NOT NULL,
    
    -- Content | เนื้อหา
    title VARCHAR(500),
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'thai',
    
    -- Classification | การจัดประเภท
    type VARCHAR(50),  -- product, pattern, insight, rule, faq
    category VARCHAR(100),
    tags TEXT[],
    
    -- Vector DB reference | อ้างอิงฐานข้อมูลเวกเตอร์
    vector_id VARCHAR(100),
    embedding_model VARCHAR(100),
    
    -- Source & quality | แหล่งที่มาและคุณภาพ
    source VARCHAR(255),
    confidence_score DECIMAL(3, 2),  -- 0.00 - 1.00
    verified BOOLEAN DEFAULT FALSE,
    
    -- Usage stats | สถิติการใช้
    times_retrieved INTEGER DEFAULT 0,
    times_helpful INTEGER DEFAULT 0,
    last_retrieved_at TIMESTAMPTZ,
    
    -- Metadata | ข้อมูลเมตา
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_knowledge_code ON knowledge_entries(entry_code);
CREATE INDEX idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_content_search ON knowledge_entries USING GIN(content gin_trgm_ops);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EXCHANGE RATES | อัตราแลกเปลี่ยน
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(20, 10) NOT NULL,
    source VARCHAR(100),  -- API source
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    UNIQUE(from_currency, to_currency, valid_from)
);

CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_valid ON exchange_rates(valid_from DESC);

-- Initial exchange rates | อัตราแลกเปลี่ยนเริ่มต้น
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
    ('USDT', 'THB', 35.50, 'manual'),
    ('THB', 'USDT', 0.02817, 'manual'),
    ('OTAI', 'THB', 10.00, 'manual'),
    ('THB', 'OTAI', 0.10, 'manual'),
    ('USDT', 'OTAI', 3.55, 'manual'),
    ('OTAI', 'USDT', 0.2817, 'manual');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AFFILIATE PAYOUTS | การจ่าย commission
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- User | ผู้ใช้
    user_id UUID REFERENCES users(id) NOT NULL,
    
    -- Amount | จำนวนเงิน
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,  -- USDT, OTAI, THB
    
    -- Source transactions | ธุรกรรมต้นทาง
    transaction_ids UUID[],
    period_start DATE,
    period_end DATE,
    
    -- Status | สถานะ
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    payment_method VARCHAR(50),
    payment_tx_hash VARCHAR(255),  -- For crypto
    
    -- Metadata | ข้อมูลเมตา
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE INDEX idx_payouts_user ON affiliate_payouts(user_id);
CREATE INDEX idx_payouts_status ON affiliate_payouts(status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- API USAGE TRACKING | ติดตามการใช้ API
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    api_key_id VARCHAR(100),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    cost_usd DECIMAL(10, 6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SYSTEM CONFIG | การตั้งค่าระบบ
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Default config | การตั้งค่าเริ่มต้น
INSERT INTO system_config (key, value, description) VALUES
    ('default_commission_tier1', '10.0', 'Default tier 1 commission rate (%)'),
    ('default_commission_tier2', '5.0', 'Default tier 2 commission rate (%)'),
    ('min_payout_amount', '{"USDT": 10, "OTAI": 100, "THB": 500}', 'Minimum payout amounts'),
    ('ai_default_model', '"claude-sonnet-4-20250514"', 'Default Claude model'),
    ('rag_max_context_entries', '10', 'Maximum context entries for RAG'),
    ('cache_ttl_seconds', '3600', 'Default cache TTL (1 hour)');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEWS | มุมมองข้อมูล
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- View: Affiliate performance | ประสิทธิภาพ affiliate
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT 
    u.id,
    u.referral_code,
    u.name_thai,
    u.name_english,
    COUNT(DISTINCT t1.id) AS tier1_sales_count,
    COALESCE(SUM(t1.commission_tier1), 0) AS tier1_total_commission,
    COUNT(DISTINCT t2.id) AS tier2_sales_count,
    COALESCE(SUM(t2.commission_tier2), 0) AS tier2_total_commission,
    COALESCE(SUM(t1.commission_tier1), 0) + COALESCE(SUM(t2.commission_tier2), 0) AS total_commission
FROM users u
LEFT JOIN transactions t1 ON u.id = t1.referrer_tier1 AND t1.status = 'completed'
LEFT JOIN transactions t2 ON u.id = t2.referrer_tier2 AND t2.status = 'completed'
GROUP BY u.id, u.referral_code, u.name_thai, u.name_english;

-- View: AI usage stats | สถิติการใช้ AI
CREATE OR REPLACE VIEW ai_usage_stats AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_queries,
    COUNT(DISTINCT user_id) AS unique_users,
    AVG(response_time_ms) AS avg_response_time_ms,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(cost_usd) AS total_cost_usd,
    AVG(user_feedback_rating) AS avg_rating,
    SUM(CASE WHEN user_feedback_helpful THEN 1 ELSE 0 END) AS helpful_count
FROM ai_interactions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FUNCTIONS | ฟังก์ชัน
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Auto-update updated_at | อัพเดท updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON knowledge_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SAMPLE DATA | ข้อมูลตัวอย่าง
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Insert CEO Mythos as first user | เพิ่ม CEO Mythos เป็นผู้ใช้คนแรก
INSERT INTO users (
    email, 
    name_thai, 
    name_chinese,
    name_english, 
    referral_code, 
    affiliate_tier,
    preferred_language,
    preferred_currency
) VALUES (
    'mythos@openthai.ai',
    'ซื่อใจ แซ่หย่าง',
    '杨世再',
    'MR. ZUEJAI SAEYANG (Mythos)',
    'MYTHOS001',
    1,
    'thai',
    'THB'
) ON CONFLICT (email) DO NOTHING;

-- Sample products | สินค้าตัวอย่าง
INSERT INTO products (sku, name_thai, name_chinese, name_english, price, category, markets, commission_rate_tier1, commission_rate_tier2, stock) VALUES
    ('SMART-E-001', 'Smart-E แพลตฟอร์มการค้าอัจฉริยะ', 'Smart-E 智能商务平台', 'Smart-E Intelligent Commerce Platform', 99999.00, 'platform', ARRAY['thai','chinese','english'], 10.0, 5.0, 100),
    ('AI-MOD-001', 'โมดูล AI สำหรับการค้า', '商业 AI 模块', 'AI Module for Commerce', 29999.00, 'ai_module', ARRAY['thai','chinese','english'], 15.0, 7.5, 50),
    ('AFF-HUB-001', 'Affiliate Hub Pro', 'Affiliate Hub 专业版', 'Affiliate Hub Pro', 9999.00, 'affiliate', ARRAY['thai','chinese'], 20.0, 10.0, 200)
ON CONFLICT (sku) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- COMPLETION MESSAGE | ข้อความสำเร็จ
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
    RAISE NOTICE '✅ OpenThai.ai AI Engine database initialized successfully!';
    RAISE NOTICE '✅ ฐานข้อมูล OpenThai.ai AI Engine เริ่มต้นสำเร็จ!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created: users, products, transactions, ai_interactions,';
    RAISE NOTICE '                knowledge_entries, exchange_rates, affiliate_payouts,';
    RAISE NOTICE '                api_usage, system_config';
    RAISE NOTICE '';
    RAISE NOTICE 'CEO: Mythos (mythos@openthai.ai) | Date: May 21, 2026';
END $$;
