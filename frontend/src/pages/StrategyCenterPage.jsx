import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Data ─────────────────────────────────────────────────────────────────────
const COMPETITORS = [
  { id: 'canva',    name: 'Canva',          type: 'Design + Content',      users: '170M',  color: '#00c4cc', icon: '🎨' },
  { id: 'jasper',   name: 'Jasper AI',      type: 'AI Copywriting',        users: '100K+', color: '#ff5c00', icon: '✍️' },
  { id: 'hubspot',  name: 'HubSpot',        type: 'Marketing Automation',  users: '205K',  color: '#ff7a59', icon: '🔧' },
  { id: 'hootsuite',name: 'Hootsuite',      type: 'Social Scheduling',     users: '18M',   color: '#1d3e5e', icon: '📅' },
  { id: 'chatgpt',  name: 'ChatGPT',        type: 'General AI',            users: '200M',  color: '#10a37f', icon: '🤖' },
  { id: 'shopify',  name: 'Shopify',        type: 'E-commerce',            users: '4.6M',  color: '#96bf48', icon: '🛒' },
  { id: 'semrush',  name: 'Semrush',        type: 'SEO + Analytics',       users: '10M',   color: '#ff642b', icon: '🔍' },
  { id: 'alibaba',  name: 'Alibaba AI',     type: 'B2B Trade Asia',        users: '30M',   color: '#ff6a00', icon: '🏢' },
];

const DIMENSIONS = [
  { key: 'thai',      label: '🇹🇭 ภาษาไทย Native',       us: 5, canva: 2, jasper: 1, hubspot: 1, hootsuite: 1, chatgpt: 3, shopify: 1, alibaba: 1 },
  { key: 'trilang',   label: '🌐 3 ภาษาในสื่อเดียว',      us: 5, canva: 0, jasper: 2, hubspot: 0, hootsuite: 0, chatgpt: 3, shopify: 0, alibaba: 2 },
  { key: 'otop',      label: '🏭 OTOP / SME / เกษตร',    us: 5, canva: 0, jasper: 0, hubspot: 2, hootsuite: 0, chatgpt: 1, shopify: 1, alibaba: 2 },
  { key: 'agri',      label: '🌾 Agricultural Export',    us: 5, canva: 0, jasper: 0, hubspot: 0, hootsuite: 0, chatgpt: 1, shopify: 0, alibaba: 3 },
  { key: 'continent', label: '🌍 7-Continent Strategy',   us: 5, canva: 0, jasper: 0, hubspot: 2, hootsuite: 2, chatgpt: 2, shopify: 2, alibaba: 3 },
  { key: 'scheduler', label: '📅 Auto Scheduler',         us: 3, canva: 2, jasper: 0, hubspot: 5, hootsuite: 5, chatgpt: 0, shopify: 1, alibaba: 0 },
  { key: 'analytics', label: '📊 Analytics Depth',        us: 3, canva: 2, jasper: 2, hubspot: 5, hootsuite: 4, chatgpt: 0, shopify: 4, alibaba: 3 },
  { key: 'design',    label: '🎨 Design Tools',           us: 2, canva: 5, jasper: 0, hubspot: 2, hootsuite: 2, chatgpt: 0, shopify: 2, alibaba: 1 },
  { key: 'kol',       label: '🌟 KOL Brief',              us: 5, canva: 0, jasper: 2, hubspot: 3, hootsuite: 2, chatgpt: 2, shopify: 0, alibaba: 0 },
  { key: 'catalog',   label: '🏪 Product Catalog 3 ภาษา', us: 5, canva: 2, jasper: 0, hubspot: 3, hootsuite: 0, chatgpt: 0, shopify: 2, alibaba: 4 },
  { key: 'b2b',       label: '📦 B2B Export Tools',       us: 4, canva: 0, jasper: 0, hubspot: 2, hootsuite: 0, chatgpt: 1, shopify: 1, alibaba: 5 },
  { key: 'benchmark', label: '🔍 Content Benchmark',      us: 5, canva: 0, jasper: 2, hubspot: 2, hootsuite: 2, chatgpt: 2, shopify: 0, alibaba: 0 },
  { key: 'ai18',      label: '💡 18-Skill AI Framework',  us: 5, canva: 0, jasper: 3, hubspot: 3, hootsuite: 0, chatgpt: 4, shopify: 0, alibaba: 0 },
  { key: 'culture',   label: '🏛️ Cultural Intelligence',  us: 5, canva: 0, jasper: 1, hubspot: 0, hootsuite: 0, chatgpt: 2, shopify: 0, alibaba: 3 },
  { key: 'price',     label: '💰 ราคา SME Accessible',    us: 5, canva: 4, jasper: 2, hubspot: 1, hootsuite: 2, chatgpt: 3, shopify: 2, alibaba: 3 },
];

const MOATS = [
  { icon: '🇹🇭', title: 'Thai Cultural Data Moat', desc: 'AI เราเข้าใจ OTOP, เกษตรไทย, วัฒนธรรมไทย — คู่แข่งต้องใช้เวลา 3-5 ปีสะสม context นี้', strength: 95, color: '#10b981' },
  { icon: '🏛️', title: 'Government & Institutional Trust', desc: 'BOI/DITP/สสว. เป็น Partner → Network Effect ที่คู่แข่งเข้าไม่ถึง', strength: 78, color: '#6366f1' },
  { icon: '🌐', title: '3-Language ASEAN Expertise', desc: 'TH/EN/ZH ในบริบท Thai Export ≠ Google Translate — เข้าใจ Halal, GI, GAP ในแต่ละตลาด', strength: 90, color: '#f59e0b' },
  { icon: '💰', title: 'Price-Value Moat (10x)', desc: 'HubSpot: $45-3,600/mo vs เรา: ฿299-2,999/mo — SME ไทยได้ Value สูงกว่า 10 เท่า', strength: 88, color: '#ec4899' },
];

const REVENUE_STREAMS = [
  { icon: '💳', label: 'SaaS Subscription', sub: 'ทำแล้ว ✅', detail: '฿299 SME · ฿999 Pro · ฿2,999 Enterprise', color: '#10b981', status: 'live' },
  { icon: '📦', label: 'Export Commission', sub: 'Blue Ocean 🔵', detail: '1-3% Success Fee จาก Export Order — Model เดียวกับ Alibaba แต่ Focus ไทย', color: '#6366f1', status: 'planned' },
  { icon: '🏛️', label: 'B2G Government', sub: 'High Value 🎯', detail: 'BOI · DITP · สสว. Contract 3-5 ปี มูลค่าหลักสิบล้าน', color: '#f59e0b', status: 'planned' },
  { icon: '🤝', label: 'Partner API Revenue', sub: 'Ecosystem 🌐', detail: 'Canva · LINE · Alibaba Integration Fee + Revenue Share', color: '#ec4899', status: 'q2' },
];

const ROADMAP = [
  {
    period: 'Q1 2026', label: 'ทำแล้ว ✅', color: '#10b981',
    items: [
      { done: true,  text: 'Global PR Creator — 7 groups × 3 languages × 7 continents' },
      { done: true,  text: 'Content Benchmark — 5 มิติ vs Top Performer' },
      { done: true,  text: 'KOL Brief Generator — Nano→Macro · Script · KPI' },
      { done: true,  text: 'Product Catalog AI — 3 ภาษา · HS Code · Export Info' },
      { done: true,  text: 'Auto-Post Scheduler — 8 Platforms' },
      { done: true,  text: 'Analytics Pro Dashboard — Reach · Engagement' },
      { done: true,  text: 'Image Prompt AI — Midjourney · DALL-E · SD' },
    ]
  },
  {
    period: 'Q2 2026', label: 'ถัดไป 🔲', color: '#6366f1',
    items: [
      { done: false, text: 'LINE OA API Integration — โพสต์จริง ไม่ใช่ simulate' },
      { done: false, text: 'Facebook / Instagram Graph API — Scheduler ทำงานจริง' },
      { done: false, text: 'TikTok Shop Product Listing — Upload ตรงจาก Catalog AI' },
      { done: false, text: 'Canva Plugin — Export Catalog ไป Canva ได้เลย' },
      { done: false, text: 'Team Workspace — Role Management + Approval Flow' },
    ]
  },
  {
    period: 'Q3 2026', label: 'วางแผน 📋', color: '#f59e0b',
    items: [
      { done: false, text: 'Real Analytics — ดึง Insight จาก Platform จริง' },
      { done: false, text: 'AI Image Generation — Generate รูปจริงบน Server' },
      { done: false, text: 'Mobile App — PWA → Native iOS / Android' },
      { done: false, text: 'Multilingual SEO — ดัน Catalog ขึ้น Google 3 ภาษา' },
    ]
  },
  {
    period: 'Q4 2026', label: 'Launch 20/12 🚀', color: '#ef4444',
    items: [
      { done: false, text: 'Export Dashboard — B2G + Government Partner Program' },
      { done: false, text: 'Export Commission Engine — 1-3% Success Fee' },
      { done: false, text: 'ASEAN Expansion — Vietnam · Indonesia · Malaysia' },
      { done: false, text: 'Alibaba Catalog Integration — Thai Products on 1688' },
    ]
  },
];

const MARKETS = [
  { icon: '🌾', label: 'เกษตรกรส่งออก', size: '2.7 ล้านครัวเรือน', color: '#10b981', opp: 'Blue Ocean — ไม่มีคู่แข่งเลย', action: '/global-pr' },
  { icon: '🏭', label: 'OTOP / SME ไทย', size: '3.1 ล้านราย', color: '#6366f1', opp: 'Blue Ocean — Canva/Jasper ไม่รู้จัก OTOP', action: '/catalog-ai' },
  { icon: '📦', label: 'B2B Export Agent', size: '42,000 บริษัท', color: '#f59e0b', opp: 'Underserved — Alibaba ไม่มี Thai-first', action: '/kol-brief' },
  { icon: '🏛️', label: 'B2G Government', size: 'งบปีละ ฿100B+', color: '#ec4899', opp: 'High Value — ไม่มี AI Platform ไทย', action: '/corporate' },
];

const GROWTH_HACKS = [
  { campaign: '"Canva ไม่รู้จัก OTOP — เราสร้างมาเพื่อคุณ"', platform: 'TikTok · Facebook', target: 'ผู้ผลิต OTOP ทั่วไทย', color: '#fe2c55' },
  { campaign: '"Jasper พูดไทยไม่ได้ — เราพูดได้ทุกสำเนียง"', platform: 'LinkedIn · Facebook', target: 'Marketing Agency ไทย', color: '#ff5c00' },
  { campaign: '"ChatGPT ไม่รู้ว่า GI คืออะไร — เราช่วยขอ GI ได้"', platform: 'YouTube · LINE', target: 'เกษตรกรส่งออก', color: '#10b981' },
  { campaign: '"HubSpot ฿3,000+/เดือน — เราทำได้ทุกอย่างในราคา ฿299"', platform: 'Google Ads · SEO', target: 'SME เจ้าของกิจการ', color: '#f59e0b' },
];

const THAILAND_NEEDS = [
  { key: 'thai', label: 'ภาษาไทยจริง + สำเนียง + บริบทท้องถิ่น', color: '#10b981' },
  { key: 'social', label: 'Social commerce + แชทปิดการขาย', color: '#6366f1' },
  { key: 'marketplace', label: 'Marketplace conversion + affiliate', color: '#f59e0b' },
  { key: 'ads', label: 'Ads / SEO / discovery scale', color: '#06b6d4' },
  { key: 'export', label: 'Cross-border / B2B / catalog export', color: '#ec4899' },
  { key: 'ops', label: 'CRM / analytics / workflow / enterprise ops', color: '#f97316' },
];

const THAILAND_PLATFORM_MATRIX = [
  {
    id: 'facebook', icon: '👥', name: 'Facebook', color: '#1877f2', fit: 86, category: 'Social + community',
    strongest: ['community reach', 'ads targeting', 'group commerce'],
    differences: ['ไทยใช้เพจ + กลุ่ม + inbox ปิดการขายหนักกว่าตะวันตก', 'คอนเทนต์ยาวและ social proof ยังสำคัญมากในไทย'],
    missing: ['workflow สำหรับ reply/inbox ไทยแบบไว', 'เชื่อม lead → LINE/OA → order เป็นเส้นเดียว'],
    add: ['FB lead sync เข้า OpenThai CRM', 'template สำหรับโพสต์ขายแบบไทย + คอมเมนต์ปิดการขาย'],
  },
  {
    id: 'tiktok', icon: '▶️', name: 'TikTok', color: '#fe2c55', fit: 92, category: 'Video commerce',
    strongest: ['viral discovery', 'creator commerce', 'short video conversion'],
    differences: ['ไทยพึ่ง hook 3 วินาที + live ขาย + creator review มาก', 'สินค้าท้องถิ่นต้องเล่าเรื่องชุมชน/ที่มาเพิ่ม'],
    missing: ['brief ที่ผูกสินค้าไทยกับ trend รายวัน', 'flow จาก script → shoot → caption → shop listing'],
    add: ['trend-to-script engine รายสินค้าไทย', 'creator brief + live selling checklist'],
  },
  {
    id: 'shopee', icon: '🟠', name: 'Shopee', color: '#f97316', fit: 89, category: 'Marketplace',
    strongest: ['conversion intent', 'promo mechanics', 'affiliate/e-commerce ops'],
    differences: ['ไทยตอบสนองต่อ flash sale, voucher, free shipping สูงมาก', 'หน้าร้านต้องใช้ภาพ/หัวข้อ/รีวิวแบบ local มากกว่า generic marketplace'],
    missing: ['listing optimizer ภาษาไทย', 'price-pack-bundle recommendation สำหรับผู้ขายไทย'],
    add: ['Shopee title/attribute optimizer', 'campaign calendar + voucher strategy'],
  },
  {
    id: 'lazada', icon: '🔵', name: 'Lazada', color: '#0ea5e9', fit: 78, category: 'Marketplace',
    strongest: ['official store trust', 'mid-to-premium catalog', 'campaign commerce'],
    differences: ['ผู้ซื้อไทยมองความน่าเชื่อถือร้านและข้อมูลสินค้าละเอียดมาก', 'สินค้าพรีเมียมต้องมี comparison ชัดเจน'],
    missing: ['brand-style listing assistant', 'เปรียบเทียบจุดเด่นสินค้าไทยกับคู่แข่งในหน้าเดียว'],
    add: ['premium catalog formatter', 'comparison block generator สำหรับ Lazada'],
  },
  {
    id: 'instagram', icon: '📸', name: 'Instagram', color: '#e1306c', fit: 74, category: 'Visual brand',
    strongest: ['brand perception', 'reels', 'creator aesthetics'],
    differences: ['ตลาดไทยต้องผสม beauty/aspirational กับ CTA ขายจริง', 'ภาษาไทยบนภาพและ caption ต้องดู natural ไม่แข็ง'],
    missing: ['visual storytelling สำหรับสินค้าไทย', 'reels/caption ที่บาลานซ์แบรนด์กับ conversion'],
    add: ['IG visual brief + Thai caption tone presets', 'UGC/reels storyboard สำหรับ SME'],
  },
  {
    id: 'whatsapp', icon: '🟢', name: 'WhatsApp', color: '#22c55e', fit: 57, category: 'Messaging',
    strongest: ['global chat', 'cross-border buyer follow-up', 'direct negotiation'],
    differences: ['ในไทย LINE แข็งแรงกว่าอย่างมาก', 'WhatsApp สำคัญเมื่อออกต่างประเทศมากกว่าขายในประเทศ'],
    missing: ['cross-border conversation kit', 'buyer follow-up ภาษาอังกฤษ/อาหรับ/อินโด'],
    add: ['export chat assistant', 'handoff จาก catalog ไทยไป WhatsApp follow-up'],
  },
  {
    id: 'xiaohongshu', icon: '📕', name: 'Xiaohongshu', color: '#ef4444', fit: 68, category: 'China discovery',
    strongest: ['lifestyle discovery', 'Chinese trust content', 'review-driven intent'],
    differences: ['คนจีนต้องการ narrative แบบ review/community ไม่ใช่ hard sell ตรงๆ', 'สินค้าไทยต้องแปลบริบทและความน่าเชื่อถือให้เข้าระบบจีน'],
    missing: ['Chinese-localized product storytelling', 'social proof สำหรับนักท่องเที่ยว/consumer จีน'],
    add: ['Xiaohongshu note generator', 'จีนย่อ/จีนเต็ม + trust claims formatter'],
  },
  {
    id: 'pinduoduo', icon: '🧺', name: 'Pinduoduo', color: '#dc2626', fit: 49, category: 'Price commerce',
    strongest: ['price sensitivity', 'bulk demand', 'group buying'],
    differences: ['ไม่เหมาะกับ positioning สินค้าไทยทุกประเภท โดยเฉพาะ premium/OTOP story-first', 'เน้นราคาหนักกว่าแบรนด์'],
    missing: ['SKU strategy สำหรับสินค้าที่แข่งขันด้วยราคาได้จริง', 'rule ว่าสินค้าไทยแบบไหนควร/ไม่ควรลง'],
    add: ['channel-fit scorer', 'bulk pack / margin guardrail'],
  },
  {
    id: 'amazon', icon: '🛒', name: 'Amazon', color: '#f59e0b', fit: 71, category: 'Global marketplace',
    strongest: ['global reach', 'search intent', 'fulfillment standards'],
    differences: ['Amazon ต้องข้อมูลสินค้าเชิงมาตรฐานและ compliance มากกว่า social commerce ไทย', 'คีย์เวิร์ดและรีวิวมีผลสูงกว่าการ live ขาย'],
    missing: ['export catalog compliance pack', 'SEO copy + attribute completeness สำหรับตลาด US/EU'],
    add: ['Amazon listing/export doc builder', 'review acquisition and catalog QA flow'],
  },
  {
    id: 'microsoft', icon: '🪟', name: 'Microsoft', color: '#2563eb', fit: 58, category: 'Enterprise stack',
    strongest: ['copilot/workflow', 'B2B productivity', 'enterprise trust'],
    differences: ['ไม่ใช่ consumer commerce platform ตรงๆ', 'มีประโยชน์ฝั่ง internal ops มากกว่าหาลูกค้าไทยปลายทาง'],
    missing: ['SME workflow bridge', 'เอกสาร/approval/reporting ที่เชื่อมกับงานขายไทย'],
    add: ['Excel/Teams export', 'proposal/report co-pilot สำหรับ B2G/B2B ไทย'],
  },
  {
    id: 'line', icon: '💚', name: 'LINE', color: '#06c755', fit: 95, category: 'Thai messaging',
    strongest: ['Thai chat commerce', 'OA broadcast', 'trust + repeat purchase'],
    differences: ['ไทยใช้ LINE เป็น CRM/lightweight sales desk จริง', 'ต้องตอบเร็ว ส่งบรอดแคสต์ และปิดการขายในแชท'],
    missing: ['OA sync ที่ลึกกว่าเดิม', 'segmentation + follow-up ไทยอัตโนมัติ'],
    add: ['LINE OA campaign orchestration', 'rich menu / broadcast / sales funnel analytics'],
  },
  {
    id: 'google', icon: '🔎', name: 'Google', color: '#34a853', fit: 84, category: 'Search + discovery',
    strongest: ['search intent', 'maps', 'SEO', 'ads scale'],
    differences: ['สินค้าไทยต้องมีคำค้นไทย + อังกฤษ + จีนควบกัน', 'Google เป็นจุดเริ่มต้น แต่ร้านไทยมักไปปิดการขายต่อใน LINE'],
    missing: ['place_id ยังไม่ผูกกับ LINE OA journey', 'gclid ยังไม่รวมกับ fbclid/ttclid เพื่อวัด ROI ไทยแบบครบ funnel'],
    add: ['Google SEO pack 3 ภาษา', 'search-to-LINE attribution bridge + place/schema assistant'],
  },
  {
    id: 'alibaba', icon: '🏢', name: 'Alibaba', color: '#ff6a00', fit: 81, category: 'B2B export',
    strongest: ['B2B sourcing', 'MOQ/export discovery', 'international buyer access'],
    differences: ['Alibaba/1688 เป็น supply chain ขาเข้าที่ใหญ่มาก แต่ไม่มองต้นทุนไทยปลายทางแบบครบวง', 'ผู้ผลิตไทยต้องการ catalog + trust narrative + compliance ที่แปลเป็นภาษาธุรกิจไทยได้'],
    missing: ['HS code + landed cost + e-Tax layer สำหรับผู้ประกอบการไทย', 'catalog mapping ไทย → Alibaba/1688 fields พร้อม guardrail กำไร'],
    add: ['Alibaba-ready export/import cost pack', 'trade inquiry response assistant + landed-margin calculator'],
  },
];

const THAI_LIFE_FLOWS = [
  {
    id: 'search-to-chat',
    title: 'Search → Chat → Pay → Delivery',
    color: '#34a853',
    summary: 'เส้นชีวิตคนไทยที่เริ่มจาก Google แล้วจบที่ LINE / PromptPay / ขนส่งท้องถิ่น',
    steps: ['Google Search / Maps', 'LINE OA / แชทขาย', 'PromptPay / โอน', 'Kerry / Flash / ไปรษณีย์'],
    gap: 'ยังไม่มีระบบเดียวที่มอง attribution, แชท, ชำระเงิน, และ fulfillment ครบ',
  },
  {
    id: 'import-to-marketplace',
    title: '1688 Import → Thai Marketplace',
    color: '#ff6a00',
    summary: 'ร้านไทยส่อง Alibaba/1688, คิดต้นทุน, นำเข้า, แล้วไปขาย Shopee/Lazada ก่อนปิดลูกค้าซ้ำที่ LINE',
    steps: ['Alibaba / 1688', 'Landed cost / HS code', 'Shopee / Lazada', 'LINE repeat sale'],
    gap: 'ต้นทุนจริง, ภาษี, และ margin guardrail ยังไม่ถูกร้อยเข้าด้วยกัน',
  },
  {
    id: 'social-to-commerce',
    title: 'Content → Live → Marketplace',
    color: '#fe2c55',
    summary: 'TikTok/Facebook สร้าง demand แต่การแปลงเป็น listing, voucher, และ follow-up ยังขาดชั้นเชื่อมไทย',
    steps: ['TikTok / Facebook', 'Live / Creator Review', 'Shopee / Lazada Offer', 'LINE Follow-up'],
    gap: 'ยังไม่มี trend-to-order workflow สำหรับบริบทไทยแบบครบลูป',
  },
  {
    id: 'export-b2b',
    title: 'Thai Catalog → Global Buyer',
    color: '#10b981',
    summary: 'ผู้ผลิตไทยต้องแปลงเรื่องราว, มาตรฐาน, และเอกสาร ไปสู่ buyer journey ข้ามประเทศ',
    steps: ['Thai Product Story', 'HS / Compliance / SEO', 'Alibaba / Amazon / Google', 'WhatsApp / LINE / Buyer Reply'],
    gap: 'ไม่มี co-pilot ที่ถือทั้ง story, compliance, และ follow-up พร้อมกัน',
  },
];

const THAI_PEOPLE_SEGMENTS = [
  { id: 'farmer', icon: '🌾', name: 'เกษตรกรส่งออก', size: '2.7M ครัวเรือน', impact: 95, color: '#10b981', gains: ['ขายได้มูลค่าสูงขึ้น', 'เข้าถึงตลาดต่างประเทศ', 'ลดการพึ่งพาพ่อค้าคนกลาง'] },
  { id: 'otop', icon: '🏺', name: 'ผู้ผลิต OTOP', size: 'หลายหมื่นชุมชน', impact: 92, color: '#8b5cf6', gains: ['เล่าเรื่องสินค้าได้ดีขึ้น', 'ขยายยอดขายออนไลน์', 'เพิ่มรายได้ชุมชน'] },
  { id: 'sme', icon: '🏪', name: 'SME ท้องถิ่น', size: '3.1M ราย', impact: 90, color: '#6366f1', gains: ['วัด ROI ได้จริง', 'รวมช่องทางขายไว้จุดเดียว', 'ลดต้นทุนการตลาด'] },
  { id: 'importer', icon: '📦', name: 'ร้านนำเข้า 1688', size: 'โตต่อเนื่อง', impact: 88, color: '#f97316', gains: ['คิด landed cost แม่นขึ้น', 'รู้ margin ก่อนสั่งเข้า', 'ลดของค้างสต็อก'] },
  { id: 'creator', icon: '🎥', name: 'ครีเอเตอร์/ไลฟ์สด', size: 'เศรษฐกิจ creator โตเร็ว', impact: 84, color: '#fe2c55', gains: ['ได้ brief ตรงสินค้า', 'ขายผ่าน live ง่ายขึ้น', 'เพิ่ม conversion'] },
  { id: 'tourism', icon: '🧳', name: 'ธุรกิจท่องเที่ยวชุมชน', size: 'จังหวัดรองจำนวนมาก', impact: 82, color: '#06b6d4', gains: ['ค้นหาเจอง่ายขึ้น', 'รับลูกค้าต่างชาติได้ดีขึ้น', 'เชื่อม Maps + LINE ได้'] },
  { id: 'export-agent', icon: '🤝', name: 'ตัวแทนส่งออก/B2B', size: '42K บริษัท', impact: 87, color: '#f59e0b', gains: ['ตอบ buyer เร็วขึ้น', 'ทำ catalog + quote ง่ายขึ้น', 'ปิดดีลเร็วขึ้น'] },
  { id: 'citizen', icon: '🏠', name: 'ครัวเรือนผู้บริโภค', size: 'หลายสิบล้านคน', impact: 78, color: '#22c55e', gains: ['เข้าถึงสินค้าคุณภาพ', 'บริการรวดเร็วขึ้น', 'รายได้ท้องถิ่นหมุนกลับชุมชน'] },
];

const THAI_LIVED_JOURNEYS = [
  {
    id: 'lamphun-otop',
    person: 'เกษตรกร OTOP ลำพูน',
    color: '#8b5cf6',
    impact: 94,
    journey: ['ถ่ายรูปสินค้า', 'ค้นหาคำขายใน Google', 'รับออเดอร์ผ่าน LINE', 'ส่งพัสดุ Flash/Kerry'],
    gaps: ['ไม่มีคำอธิบาย 3 ภาษา', 'ไม่รู้ว่าคีย์เวิร์ดไหนพาลูกค้ามา', 'ตอบแชทไม่ทันช่วงไลฟ์/โปร'],
    fix: ['SEO + catalog 3 ภาษา', 'Google-to-LINE attribution', 'reply assistant + order summary'],
  },
  {
    id: '1688-import-shop',
    person: 'ร้านนำเข้าจาก 1688',
    color: '#ff6a00',
    impact: 91,
    journey: ['ส่อง 1688/Alibaba', 'คำนวณต้นทุน', 'ลง Shopee/Lazada', 'ปิดลูกค้าซ้ำผ่าน LINE'],
    gaps: ['HS code / ภาษี / shipping รวมไม่ครบ', 'ตั้งราคาขายจากต้นทุนผิด', 'ไม่มี guardrail ก่อนยิงโปร'],
    fix: ['landed cost calculator', 'margin-safe pricing recommendation', 'LINE repeat sale workflow'],
  },
  {
    id: 'tiktok-creator-sme',
    person: 'SME ที่ขายผ่าน TikTok + Shopee',
    color: '#fe2c55',
    impact: 89,
    journey: ['จับเทรนด์ TikTok', 'ทำคลิป/ไลฟ์', 'แปลงเป็น listing', 'เก็บลูกค้ากลับมาที่ LINE'],
    gaps: ['ไม่มี brief ไทยที่ผูกกับสินค้า', 'listing/caption ไม่ต่อกัน', 'โปรจากคลิปไป marketplace หลุดระหว่างทาง'],
    fix: ['trend-to-script engine', 'caption-to-listing bridge', 'voucher + retargeting playbook'],
  },
  {
    id: 'b2b-exporter',
    person: 'ผู้ส่งออกสินค้าไทย B2B',
    color: '#10b981',
    impact: 90,
    journey: ['ทำ catalog', 'ดัน SEO/Google', 'ลง Alibaba/Amazon', 'คุย buyer ใน WhatsApp/LINE'],
    gaps: ['เอกสาร compliance ไม่ครบ', 'story ไทยไม่แปลเป็น trust narrative', 'ตอบ buyer ช้าและไม่เป็นระบบ'],
    fix: ['export document pack', 'trust-content generator', 'buyer reply co-pilot'],
  },
];

const THAILAND_GAP_DRILLDOWNS = [
  { label: '📊 Cross-platform attribution ไทย', gap: 'Google gclid ยังไม่ผูกกับ LINE OA และ fbclid/ttclid', action: 'สร้าง Thai commerce attribution graph', urgency: 'critical', color: '#ef4444', journeyId: 'lamphun-otop' },
  { label: '💬 Chat-commerce orchestration', gap: 'เส้นทาง Facebook/TikTok → LINE → PromptPay ยังแยกกัน', action: 'เชื่อม inbox, OA, payment proof, และ order state', urgency: 'critical', color: '#ef4444', journeyId: 'tiktok-creator-sme' },
  { label: '📦 1688 landed cost intelligence', gap: 'Alibaba/1688 ยังไม่มี HS code + landed cost + e-Tax ชั้นไทย', action: 'เพิ่ม cost pack และ margin guardrail', urgency: 'critical', color: '#ef4444', journeyId: '1688-import-shop' },
  { label: '🚚 Fulfillment visibility', gap: 'PromptPay และ Kerry/Flash ยังไม่ถูกรวมเป็น evidence เดียว', action: 'รวม payment + parcel checkpoints', urgency: 'critical', color: '#ef4444', journeyId: 'lamphun-otop' },
  { label: '🌐 Export compliance workflow', gap: 'catalog ไทยยังไม่ไหลต่อไป Amazon/Alibaba พร้อม buyer follow-up', action: 'ทำ export pack + reply co-pilot', urgency: 'moderate', color: '#f59e0b', journeyId: 'b2b-exporter' },
  { label: '🎥 Trend-to-marketplace bridge', gap: 'TikTok/Facebook content ยังไม่ต่อ Shopee/Lazada แบบครบลูป', action: 'เชื่อม script, listing, voucher, retargeting', urgency: 'moderate', color: '#f59e0b', journeyId: 'tiktok-creator-sme' },
];

const PLATFORM_COST_REGISTRY = [
  { id: 'line', name: 'LINE OA', color: '#06c755', commissionRate: 0, paymentRate: 0.005, logisticsRate: 0.04, note: 'แชทคอมเมิร์ซตรง ไม่มี marketplace commission', capability: 'Consent required' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#fe2c55', commissionRate: 0.05, paymentRate: 0.02, logisticsRate: 0.05, note: 'คอมมิชชัน + ค่าโปร/affiliate สูงถ้าไลฟ์หนัก', capability: 'Audit + consent' },
  { id: 'shopee', name: 'Shopee', color: '#f97316', commissionRate: 0.085, paymentRate: 0.025, logisticsRate: 0.045, note: 'มีค่าธรรมเนียม marketplace + payment + campaign pressure', capability: 'Audit gated' },
  { id: 'lazada', name: 'Lazada', color: '#0ea5e9', commissionRate: 0.075, paymentRate: 0.022, logisticsRate: 0.04, note: 'เหมาะร้านทางการ/พรีเมียมมากกว่าแข่งราคา', capability: 'Audit gated' },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', commissionRate: 0.02, paymentRate: 0.005, logisticsRate: 0.04, note: 'ต้นทุนหลักอยู่ที่ ads และทีมตอบ inbox', capability: 'Consent required' },
  { id: 'instagram', name: 'Instagram', color: '#e1306c', commissionRate: 0.025, paymentRate: 0.005, logisticsRate: 0.04, note: 'ต้นทุน content/creator เด่นกว่าค่าธรรมเนียมตรง', capability: 'Consent required' },
  { id: 'google', name: 'Google', color: '#34a853', commissionRate: 0.015, paymentRate: 0.005, logisticsRate: 0.04, note: 'ค่าใช้จ่ายหลักคือ ads/SEO และ attribution gap', capability: 'Available + consent' },
  { id: 'alibaba', name: 'Alibaba / 1688', color: '#ff6a00', commissionRate: 0.03, paymentRate: 0.015, logisticsRate: 0.08, note: 'ต้องบวก landed cost, ภาษี, ค่าขนส่ง, และ margin safety', capability: 'Audit + docs' },
];

const CHANNEL_CAPABILITY_NEGOTIATOR = [
  { id: 'line', name: 'LINE', color: '#06c755', apis: [{ label: 'Messaging API', status: 'available' }, { label: 'Audience sync', status: 'consent' }, { label: 'Broadcast analytics', status: 'audit' }, { label: 'Payment capture', status: 'unavailable' }] },
  { id: 'tiktok', name: 'TikTok', color: '#fe2c55', apis: [{ label: 'Content planning', status: 'available' }, { label: 'Shop listing', status: 'audit' }, { label: 'Creator data', status: 'consent' }, { label: 'Direct wallet control', status: 'unavailable' }] },
  { id: 'shopee', name: 'Shopee', color: '#f97316', apis: [{ label: 'Catalog sync', status: 'audit' }, { label: 'Order sync', status: 'audit' }, { label: 'Buyer re-engagement', status: 'consent' }, { label: 'Ad campaign control', status: 'unavailable' }] },
  { id: 'google', name: 'Google', color: '#34a853', apis: [{ label: 'Business Profile', status: 'available' }, { label: 'Ads attribution import', status: 'audit' }, { label: 'Lead routing', status: 'consent' }, { label: 'LINE identity join', status: 'unavailable' }] },
  { id: 'alibaba', name: 'Alibaba', color: '#ff6a00', apis: [{ label: 'Catalog mapping', status: 'audit' }, { label: 'Inquiry workflow', status: 'available' }, { label: 'Importer profile data', status: 'consent' }, { label: 'Thai tax clearance', status: 'unavailable' }] },
];

const LIFE_PLATFORM_GROUPS = [
  { title: 'Discovery Platforms', color: '#34a853', items: ['Google', 'TikTok', 'Facebook', 'Instagram'], detail: 'เก่งเรื่องหา demand แต่ไม่ถือเส้นทางไทยจนจบการขาย' },
  { title: 'Marketplace Platforms', color: '#f97316', items: ['Shopee', 'Lazada', 'Amazon', 'Pinduoduo'], detail: 'เก่งเรื่อง conversion แต่ไม่รู้บริบทครัวเรือนไทยและ repeat sale ผ่านแชท' },
  { title: 'Messaging Platforms', color: '#06c755', items: ['LINE', 'WhatsApp'], detail: 'เก่งปิดการขายและดูแลลูกค้า แต่ไม่ผูก search / tax / cost / fulfillment ครบ' },
  { title: 'Trade & Enterprise Platforms', color: '#6366f1', items: ['Alibaba', 'Microsoft'], detail: 'เก่ง B2B และ workflow แต่ไม่จับ livelihood ไทยตั้งแต่ต้นน้ำถึงปลายน้ำ' },
];

const THAI_LIFE_GAPS = [
  'Household Ledger ที่เห็นเงินจริงเข้า-ออกระดับครัวเรือน',
  'OTOP Demand Pool ที่รวมดีมานด์จากหลายช่องทางแล้วกระจายกลับชุมชน',
  'Thai Product Notes สำหรับบันทึกบริบทสินค้าและเรื่องเล่าท้องถิ่น',
  'Assisted Mode สำหรับผู้ใช้ที่ไม่ถนัดดิจิทัลหรือมีเวลาจำกัด',
  'Search-to-LINE attribution graph แบบไทย',
  '1688 landed cost + HS code + e-Tax guardrail',
  'PromptPay + parcel evidence chain สำหรับการค้ารายวัน',
];

const THAI_LIFE_OUTCOMES = [
  { title: 'SME รายได้สุทธิ +20–35%', color: '#10b981', detail: 'ลดคอมมิชชันเกินจำเป็น ปรับโฆษณา และตั้งราคาจากต้นทุนจริง' },
  { title: 'เวลาทำบัญชีลด 60%', color: '#6366f1', detail: 'รวมรายรับ รายจ่าย ค่าธรรมเนียม และหลักฐานการชำระเงินไว้จุดเดียว' },
  { title: 'ตอบลูกค้าเร็วขึ้น 3x', color: '#06c755', detail: 'มี assisted reply, follow-up, และ consent-aware CRM' },
  { title: 'สูญเสียจากต้นทุนผิดลด 25%', color: '#f97316', detail: 'คำนวณ landed cost, HS code, และ margin ก่อนนำเข้า/ยิงโปร' },
  { title: 'ชุมชนท้องถิ่นเข้าถึงตลาดใหม่', color: '#ec4899', detail: 'สินค้าไทยถูกแปลงเป็น SEO, catalog, และ buyer-ready content ได้เร็วขึ้น' },
];

const LIFE_AXIS_OPTIONS = [
  { id: 'incomeLeft', label: 'รายได้เหลือ', color: '#10b981' },
  { id: 'access', label: 'การเข้าถึง', color: '#06b6d4' },
  { id: 'dignity', label: 'ศักดิ์ศรี', color: '#8b5cf6' },
  { id: 'coverage', label: 'ความทั่วถึง', color: '#f59e0b' },
  { id: 'timeSaved', label: 'เวลาที่ประหยัด', color: '#ef4444' },
];

const LIFE_AXIS_PLATFORM_SCORES = [
  { id: 'openthai', name: 'OpenThaiAi', color: '#10b981', category: 'Thai-first OS', incomeLeft: 95, access: 92, dignity: 94, coverage: 90, timeSaved: 93 },
  { id: 'line', name: 'LINE', color: '#06c755', category: 'Messaging', incomeLeft: 82, access: 90, dignity: 79, coverage: 88, timeSaved: 84 },
  { id: 'google', name: 'Google', color: '#34a853', category: 'Discovery', incomeLeft: 70, access: 95, dignity: 72, coverage: 93, timeSaved: 88 },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', category: 'Social', incomeLeft: 68, access: 89, dignity: 66, coverage: 86, timeSaved: 71 },
  { id: 'tiktok', name: 'TikTok', color: '#fe2c55', category: 'Video commerce', incomeLeft: 74, access: 87, dignity: 64, coverage: 84, timeSaved: 77 },
  { id: 'shopee', name: 'Shopee', color: '#f97316', category: 'Marketplace', incomeLeft: 61, access: 86, dignity: 63, coverage: 82, timeSaved: 69 },
  { id: 'lazada', name: 'Lazada', color: '#0ea5e9', category: 'Marketplace', incomeLeft: 63, access: 76, dignity: 67, coverage: 74, timeSaved: 68 },
  { id: 'instagram', name: 'Instagram', color: '#e1306c', category: 'Visual brand', incomeLeft: 58, access: 78, dignity: 71, coverage: 70, timeSaved: 62 },
  { id: 'whatsapp', name: 'WhatsApp', color: '#22c55e', category: 'Messaging', incomeLeft: 65, access: 61, dignity: 74, coverage: 60, timeSaved: 66 },
  { id: 'xiaohongshu', name: 'Xiaohongshu', color: '#ef4444', category: 'China discovery', incomeLeft: 59, access: 57, dignity: 68, coverage: 53, timeSaved: 55 },
  { id: 'pinduoduo', name: 'Pinduoduo', color: '#dc2626', category: 'Price commerce', incomeLeft: 52, access: 64, dignity: 48, coverage: 58, timeSaved: 60 },
  { id: 'amazon', name: 'Amazon', color: '#f59e0b', category: 'Global marketplace', incomeLeft: 64, access: 75, dignity: 70, coverage: 72, timeSaved: 67 },
  { id: 'microsoft', name: 'Microsoft', color: '#2563eb', category: 'Enterprise stack', incomeLeft: 57, access: 62, dignity: 73, coverage: 55, timeSaved: 79 },
  { id: 'alibaba', name: 'Alibaba', color: '#ff6a00', category: 'B2B trade', incomeLeft: 69, access: 73, dignity: 65, coverage: 69, timeSaved: 64 },
];

const NET_INCOME_PY = `def net_income(gross_revenue, commission_rate, cogs, ads, shipping, packaging, misc=0):\n    commission = gross_revenue * commission_rate\n    net = gross_revenue - commission - cogs - ads - shipping - packaging - misc\n    return {\n        "gross_revenue": gross_revenue,\n        "commission": commission,\n        "net_income": net,\n        "margin_pct": 0 if gross_revenue == 0 else (net / gross_revenue) * 100,\n    }`;

const CONSENT_LEDGER_PY = `from dataclasses import dataclass, field\nfrom datetime import datetime\nimport hashlib, hmac, json\n\n@dataclass\nclass ConsentLedger:\n    secret: bytes\n    records: list[dict] = field(default_factory=list)\n\n    def _append(self, platform, subject_id, action, purpose=None, section=None):\n        prev_hash = self.records[-1]["entry_hash"] if self.records else "GENESIS"\n        payload = {\n            "platform": platform,\n            "subject_id": subject_id,\n            "purpose": purpose,\n            "action": action,\n            "legal_basis": section,\n            "recorded_at": datetime.utcnow().isoformat() + "Z",\n        }\n        entry_hash = hmac.new(self.secret, f"{prev_hash}|{json.dumps(payload, ensure_ascii=False, sort_keys=True)}".encode(), hashlib.sha256).hexdigest()\n        self.records.append({\n            "id": f"consent-{len(self.records)+1}",\n            "prev_hash": prev_hash,\n            "entry_hash": entry_hash,\n            "payload": payload,\n        })\n\n    def grant(self, platform, purpose, subject_id):\n        self._append(platform, subject_id, "granted", purpose=purpose)\n\n    def withdraw_19(self, platform, subject_id):\n        self._append(platform, subject_id, "withdraw_19", section="PDPA §19")\n\n    def erase_33(self, platform, subject_id):\n        self._append(platform, subject_id, "erase_33", section="PDPA §33")`;

const HOUSEHOLD_LEDGER_PY = `from dataclasses import dataclass, field\n\n@dataclass\nclass HouseholdLedger:\n    income: list[dict] = field(default_factory=list)\n    expenses: list[dict] = field(default_factory=list)\n\n    def add_income(self, source, amount):\n        self.income.append({"source": source, "amount": amount})\n\n    def add_expense(self, category, amount):\n        self.expenses.append({"category": category, "amount": amount})\n\n    def net_position(self):\n        total_income = sum(item["amount"] for item in self.income)\n        total_expense = sum(item["amount"] for item in self.expenses)\n        return total_income - total_expense`;

const CONSENT_PLATFORM_OPTIONS = [
  { id: 'line', name: 'LINE OA', color: '#06c755' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#fe2c55' },
  { id: 'shopee', name: 'Shopee', color: '#f97316' },
  { id: 'google', name: 'Google', color: '#34a853' },
  { id: 'alibaba', name: 'Alibaba / 1688', color: '#ff6a00' },
];

const CONSENT_ACTION_LABELS = {
  granted: 'Grant',
  withdraw_19: 'ถอนยินยอม §19',
  erase_33: 'ลบข้อมูล §33',
};

function formatMoney(value) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
}

function encodeHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeHex(hex) {
  return new Uint8Array((hex.match(/.{1,2}/g) || []).map((chunk) => parseInt(chunk, 16)));
}

function createSessionSecret() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return encodeHex(bytes);
  }
  return encodeHex(new TextEncoder().encode(`${Date.now()}-${Math.random()}`)).slice(0, 32);
}

function buildEmvField(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

export function crc16Ccitt(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizePromptPayPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 13) return { ok: false, error: 'PromptPay tool นี้ไม่รับเลขบัตรประชาชน 13 หลัก' };
  if (!/^0\d{9}$/.test(digits)) return { ok: false, error: 'กรอกเบอร์มือถือไทย 10 หลักที่ขึ้นต้นด้วย 0' };
  return { ok: true, digits, international: `0066${digits.slice(1)}`, masked: `${digits.slice(0, 3)}-***-${digits.slice(-3)}` };
}

function normalizeAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric.toFixed(2).replace(/\.00$/, '');
}

function thaiIntegerText(number) {
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  if (number === 0) return digits[0];
  if (number >= 1000000) {
    const millions = Math.floor(number / 1000000);
    const remainder = number % 1000000;
    return `${thaiIntegerText(millions)}ล้าน${remainder ? thaiIntegerText(remainder) : ''}`;
  }
  let result = '';
  const chars = String(number).split('').map(Number);
  chars.forEach((digit, index) => {
    if (digit === 0) return;
    const position = chars.length - index - 1;
    if (position === 0 && digit === 1 && chars.length > 1) {
      result += 'เอ็ด';
      return;
    }
    if (position === 1) {
      if (digit === 1) {
        result += 'สิบ';
        return;
      }
      if (digit === 2) {
        result += 'ยี่สิบ';
        return;
      }
    }
    result += `${digits[digit]}${positions[position] || ''}`;
  });
  return result.replace('หนึ่งสิบ', 'สิบ');
}

export function amountToThaiText(amount) {
  const numeric = Number(amount) || 0;
  const whole = Math.floor(numeric);
  const satang = Math.round((numeric - whole) * 100);
  const bahtText = `${thaiIntegerText(whole)}บาท`;
  if (satang === 0) return `${bahtText}ถ้วน`;
  return `${bahtText}${thaiIntegerText(satang)}สตางค์`;
}

export function buildPromptPayPayload({ phone, amount, merchantName = 'OPENTHAI AI', city = 'BANGKOK' }) {
  const normalizedPhone = normalizePromptPayPhone(phone);
  if (!normalizedPhone.ok) {
    return { ok: false, error: normalizedPhone.error };
  }

  const normalizedAmount = normalizeAmount(amount);
  if (!normalizedAmount) {
    return { ok: false, error: 'จำนวนเงินต้องมากกว่า 0' };
  }

  const merchantAccount = buildEmvField('00', 'A000000677010111') + buildEmvField('01', normalizedPhone.international);
  const body = [
    buildEmvField('00', '01'),
    buildEmvField('01', '12'),
    buildEmvField('29', merchantAccount),
    buildEmvField('53', '764'),
    buildEmvField('54', normalizedAmount),
    buildEmvField('58', 'TH'),
    buildEmvField('59', merchantName.slice(0, 25).toUpperCase()),
    buildEmvField('60', city.slice(0, 15).toUpperCase()),
    '6304',
  ].join('');
  const crc = crc16Ccitt(body);

  return {
    ok: true,
    payload: `${body}${crc}`,
    crc,
    maskedPhone: normalizedPhone.masked,
    amountText: amountToThaiText(Number(amount)),
  };
}

export function buildQrVisualMatrix(payload, size = 21) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const stampFinder = (row, col) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const onBorder = y === 0 || y === 6 || x === 0 || x === 6;
        const inCore = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        matrix[row + y][col + x] = onBorder || inCore;
      }
    }
  };

  stampFinder(0, 0);
  stampFinder(0, size - 7);
  stampFinder(size - 7, 0);

  const bits = payload.split('').flatMap((char) => char.charCodeAt(0).toString(2).padStart(8, '0').split('').map((bit) => bit === '1'));
  let cursor = 0;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder = (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
      if (inFinder) continue;
      matrix[row][col] = bits[cursor % bits.length];
      cursor += 1;
    }
  }

  return matrix;
}

export function computeIncomeModel(input, platform) {
  const grossRevenue = Number(input.grossRevenue) || 0;
  const cogs = Number(input.cogs) || 0;
  const ads = Number(input.ads) || 0;
  const shipping = Number(input.shipping) || 0;
  const packaging = Number(input.packaging) || 0;
  const misc = Number(input.misc) || 0;
  const commission = grossRevenue * (platform?.commissionRate ?? 0);
  const paymentFee = grossRevenue * (platform?.paymentRate ?? 0);
  const logisticsFee = grossRevenue * (platform?.logisticsRate ?? 0);
  const totalCosts = commission + paymentFee + logisticsFee + cogs + ads + shipping + packaging + misc;
  const netIncome = grossRevenue - totalCosts;
  const marginPct = grossRevenue > 0 ? (netIncome / grossRevenue) * 100 : 0;

  return {
    grossRevenue,
    cogs,
    ads,
    shipping,
    packaging,
    misc,
    commission,
    paymentFee,
    logisticsFee,
    totalCosts,
    netIncome,
    marginPct,
  };
}

export function getIncomeAlerts(model) {
  const alerts = [];
  const gross = model.grossRevenue || 1;

  if ((model.commission / gross) >= 0.1) {
    alerts.push({ level: 'warn', text: 'Commission ≥10% ของยอดขาย ควรลดการพึ่ง marketplace หรือดัน repeat sale ผ่าน LINE' });
  }
  if ((model.ads / gross) >= 0.15) {
    alerts.push({ level: 'warn', text: 'ค่าโฆษณา ≥15% ของยอดขาย ควรทบทวน creative, targeting และใช้ลูกค้าเดิมให้มากขึ้น' });
  }
  if (model.netIncome < 0) {
    alerts.push({ level: 'danger', text: 'ขาดทุนอยู่ตอนนี้ ระบบไม่แนะนำเพิ่มงบโฆษณา จนกว่าจะลดต้นทุนหรือปรับราคาได้ก่อน' });
  }
  if (!alerts.length) {
    alerts.push({ level: 'ok', text: 'ต้นทุนหลักยังอยู่ในกรอบปลอดภัยสำหรับ pre-pilot' });
  }

  return alerts;
}

export function getIncomeInsights(model) {
  const insights = [];
  const gross = model.grossRevenue || 1;

  if ((model.ads / gross) >= 0.15) insights.push('ค่าโฆษณาแตะระดับเตือน ควรปรับ creative, targeting และวัดผลรายแคมเปญให้ละเอียดขึ้น');
  if (((model.shipping + model.logisticsFee) / gross) > 0.12) insights.push('ค่าส่งและโลจิสติกส์สูง ควรทบทวนขนาดพัสดุ โปรโมชั่นส่งฟรี และพาร์ตเนอร์ขนส่ง');
  if ((model.cogs / gross) > 0.55) insights.push('ต้นทุนสินค้ากินสัดส่วนสูง ควรปรับ bundle, MOQ หรือ negotiated sourcing');
  if ((model.commission / gross) >= 0.1) insights.push('ค่า commission แตะระดับเตือน ควรออกแบบเส้นทางซื้อซ้ำผ่าน LINE/CRM ให้มากขึ้น');
  if (model.netIncome < 0) insights.push('ตอนนี้ต้องหยุดเพิ่มงบโฆษณา แล้วแก้ต้นทุน/ราคา/commission ก่อนเพื่อกลับมาเป็นบวก');
  if (model.netIncome >= 0 && model.marginPct < 15) insights.push('กำไรสุทธิต่ำกว่า 15% ควรปรับราคา ลดต้นทุนแฝง หรือเพิ่มยอดจากลูกค้าเดิม');
  if (!insights.length) insights.push('โครงสร้างต้นทุนยังสมดุล ใช้ข้อมูลนี้ต่อยอดเพื่อขยายยอดขายโดยไม่เสีย margin');

  return insights;
}

function statusTone(status) {
  if (status === 'available') return { label: 'ใช้ได้จริง', color: '#10b981' };
  if (status === 'audit') return { label: 'ต้องผ่าน audit', color: '#f59e0b' };
  if (status === 'consent') return { label: 'ต้องมี consent', color: '#6366f1' };
  return { label: 'ทำไม่ได้', color: '#ef4444' };
}

async function hmacSha256Hex(secretHex, message) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeHex(secretHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return encodeHex(new Uint8Array(signature));
}

export async function verifyConsentChain(entries, secretHex) {
  let previousHash = 'GENESIS';
  for (const entry of entries) {
    if (entry.prev_hash !== previousHash) {
      return { ok: false, reason: `Broken prev_hash at ${entry.id}` };
    }
    const expectedHash = await hmacSha256Hex(secretHex, `${entry.prev_hash}|${JSON.stringify(entry.payload)}`);
    if (entry.entry_hash !== expectedHash) {
      return { ok: false, reason: `Broken entry_hash at ${entry.id}` };
    }
    previousHash = entry.entry_hash;
  }
  return { ok: true };
}

export async function appendConsentLedgerEntry(entries, secretHex, payload) {
  const verification = await verifyConsentChain(entries, secretHex);
  if (!verification.ok) {
    return { ok: false, frozen: true, reason: verification.reason, entries };
  }
  const prevHash = entries.length ? entries[entries.length - 1].entry_hash : 'GENESIS';
  const entryPayload = { ...payload, timestamp: new Date().toISOString() };
  const entryHash = await hmacSha256Hex(secretHex, `${prevHash}|${JSON.stringify(entryPayload)}`);
  const entry = {
    id: `consent-${entries.length + 1}`,
    prev_hash: prevHash,
    entry_hash: entryHash,
    payload: entryPayload,
  };
  return { ok: true, frozen: false, entry, entries: [...entries, entry] };
}

export function tamperConsentLedger(entries) {
  if (!entries.length) return entries;
  return entries.map((entry, index) => (index === 0 ? { ...entry, prev_hash: 'tampered' } : entry));
}

export function rankLifePlatforms(axisId) {
  return [...LIFE_AXIS_PLATFORM_SCORES].sort((a, b) => (b[axisId] ?? 0) - (a[axisId] ?? 0));
}

const VISION = [
  { year: '2026', title: "Thailand's #1 AI Marketing Platform", desc: 'Thai Exporters · OTOP · SME · Agriculture · 7 Continents · Launch 20/12', icon: '🇹🇭', color: '#10b981' },
  { year: '2027', title: 'ASEAN Export Intelligence OS', desc: 'Vietnam · Indonesia · Malaysia · Philippines · TH+EN+ZH+ID+VI+MY+TL', icon: '🌏', color: '#6366f1' },
  { year: '2028', title: 'Global Thai Trade Network — IPO Ready', desc: '100,000+ Thai/ASEAN Businesses · $500M+ Export Value Facilitated per Year', icon: '🌐', color: '#f59e0b' },
];

// ── Sub Components ────────────────────────────────────────────────────────────
function Stars({ n, max = 5, color = '#6366f1' }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: i < n ? color : 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s',
        }} />
      ))}
      {n === 0 && <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>N/A</span>}
    </div>
  );
}

function MoatBar({ pct, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
      <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 1s ease' }} />
    </div>
  );
}

function ScoreBar({ score, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
      <div style={{ background: color, height: '100%', width: `${score}%`, borderRadius: 999, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{ fontSize: 11, color, background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 999, padding: '3px 8px', lineHeight: 1.4 }}>
      {text}
    </span>
  );
}

function TabBtn({ id, label, active, onClick, color }) {
  return (
    <button onClick={() => onClick(id)} style={{
      background: active ? `${color}20` : 'transparent',
      border: active ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, color: active ? '#fff' : '#64748b',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
      padding: '8px 14px', whiteSpace: 'nowrap', transition: 'all .2s',
    }}>{label}</button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'compare',   label: '⚔️ เปรียบเทียบ',     color: '#6366f1' },
  { id: 'thailand',  label: '🇹🇭 Thailand vs Platforms', color: '#14b8a6' },
  { id: 'income',    label: '💰 รายได้สุทธิ',      color: '#22c55e' },
  { id: 'promptpay', label: '📱 PromptPay QR',    color: '#0ea5e9' },
  { id: 'fees',      label: '📋 ค่าธรรมเนียม',     color: '#f97316' },
  { id: 'consent',   label: '🔐 Consent Ledger', color: '#8b5cf6' },
  { id: 'life',      label: '🌱 ชีวิต',          color: '#06b6d4' },
  { id: 'people',    label: '🧑‍🤝‍🧑 คน',          color: '#22c55e' },
  { id: 'advantage', label: '🛡️ จุดแข็งเรา',      color: '#10b981' },
  { id: 'gap',       label: '⚠️ Gap Analysis',     color: '#f59e0b' },
  { id: 'revenue',   label: '💰 Revenue Streams',  color: '#ec4899' },
  { id: 'roadmap',   label: '🗺️ Roadmap',          color: '#f97316' },
  { id: 'market',    label: '🌊 Blue Ocean',        color: '#06b6d4' },
  { id: 'growth',    label: '🚀 Growth Hacks',      color: '#fe2c55' },
  { id: 'vision',    label: '🔭 Vision 2028',       color: '#8b5cf6' },
];

export default function StrategyCenterPage() {
  const [tab, setTab] = useState('compare');
  const [focusCols, setFocusCols] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState(THAI_LIVED_JOURNEYS[0].id);
  const [incomePlatformId, setIncomePlatformId] = useState(PLATFORM_COST_REGISTRY[0].id);
  const [lifeAxisId, setLifeAxisId] = useState(LIFE_AXIS_OPTIONS[0].id);
  const [costFocusId, setCostFocusId] = useState(PLATFORM_COST_REGISTRY[0].id);
  const [capabilityFocusId, setCapabilityFocusId] = useState(CHANNEL_CAPABILITY_NEGOTIATOR[0].id);
  const [consentProfiles, setConsentProfiles] = useState(() => CONSENT_PLATFORM_OPTIONS.map((item) => ({
    ...item,
    purpose: item.id === 'line' ? 'Broadcast + CRM' : 'Analytics + order routing',
    status: item.id === 'line' || item.id === 'google' ? 'granted' : 'pending',
    updatedAt: '2026-09-03T12:00:00Z',
  })));
  const [consentLedgerEntries, setConsentLedgerEntries] = useState([]);
  const [consentLedgerFrozen, setConsentLedgerFrozen] = useState(false);
  const [consentLedgerStatus, setConsentLedgerStatus] = useState('');
  const [consentSecret] = useState(() => createSessionSecret());
  const [promptPayInput, setPromptPayInput] = useState({
    phone: '0812345678',
    amount: 1000,
    merchantName: 'OPENTHAI AI',
    city: 'BANGKOK',
  });
  const [incomeInput, setIncomeInput] = useState({
    grossRevenue: 50000,
    cogs: 22000,
    ads: 6000,
    shipping: 2500,
    packaging: 1000,
    misc: 1500,
  });
  const navigate = useNavigate();

  const activeTab = TABS.find(t => t.id === tab);
  const selectedJourney = THAI_LIVED_JOURNEYS.find((item) => item.id === selectedJourneyId) ?? THAI_LIVED_JOURNEYS[0];
  const incomePlatform = PLATFORM_COST_REGISTRY.find((item) => item.id === incomePlatformId) ?? PLATFORM_COST_REGISTRY[0];
  const costFocus = PLATFORM_COST_REGISTRY.find((item) => item.id === costFocusId) ?? PLATFORM_COST_REGISTRY[0];
  const capabilityFocus = CHANNEL_CAPABILITY_NEGOTIATOR.find((item) => item.id === capabilityFocusId) ?? CHANNEL_CAPABILITY_NEGOTIATOR[0];
  const incomeModel = computeIncomeModel(incomeInput, incomePlatform);
  const incomeAlerts = getIncomeAlerts(incomeModel);
  const incomeInsights = getIncomeInsights(incomeModel);
  const grantedConsents = consentProfiles.filter((item) => item.status === 'granted').length;
  const promptPayModel = buildPromptPayPayload(promptPayInput);
  const promptPayMatrix = promptPayModel.ok ? buildQrVisualMatrix(promptPayModel.payload) : [];
  const rankedLifePlatforms = rankLifePlatforms(lifeAxisId);

  const updateIncomeField = (key, value) => {
    setIncomeInput((current) => ({ ...current, [key]: value }));
  };

  const updatePromptPayField = (key, value) => {
    setPromptPayInput((current) => ({ ...current, [key]: value }));
  };

  const updateConsentStatus = async (id, action) => {
    if (consentLedgerFrozen) {
      setConsentLedgerStatus('Consent chain ถูก freeze แล้ว จึงไม่รับ entry ใหม่');
      return;
    }

    const profile = consentProfiles.find((item) => item.id === id);
    if (!profile) return;

    const result = await appendConsentLedgerEntry(consentLedgerEntries, consentSecret, {
      platform: profile.name,
      platform_id: profile.id,
      purpose: profile.purpose,
      action,
    });

    if (!result.ok) {
      setConsentLedgerFrozen(true);
      setConsentLedgerStatus(`หยุดเขียนทันที: ${result.reason}`);
      return;
    }

    setConsentLedgerEntries(result.entries);
    setConsentProfiles((current) => current.map((item) => (
      item.id === id
        ? {
            ...item,
            status: action === 'erase_33' ? 'erased' : action === 'withdraw_19' ? 'withdrawn' : 'granted',
            updatedAt: result.entry.payload.timestamp,
          }
        : item
    )));
    setConsentLedgerStatus(`${profile.name}: ${CONSENT_ACTION_LABELS[action]}`);
  };

  const onTamperConsentLedger = async () => {
    const tampered = tamperConsentLedger(consentLedgerEntries);
    setConsentLedgerEntries(tampered);
    const verification = await verifyConsentChain(tampered, consentSecret);
    if (!verification.ok) {
      setConsentLedgerFrozen(true);
      setConsentLedgerStatus(`Consent chain ถูกแก้ไข — freeze การเขียนทันที (${verification.reason})`);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', fontFamily: 'system-ui, sans-serif' },
    header: { background: 'linear-gradient(180deg,rgba(99,102,241,0.12) 0%,transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px 0' },
    body: { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 14 },
    h3: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 28 }}>🧠</div>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#6366f1,#10b981,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Strategy & Competitive Intelligence Center
                </h1>
              </div>
              <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                OpenThai AI vs global platforms + Thailand life journeys · GAP Analysis · People impact · Vision 2028
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>9/15</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>มิติที่นำโลก</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>4/15</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>ต้องปิด Gap</div>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 1 }}>
            {TABS.map(t => <TabBtn key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={setTab} color={t.color} />)}
          </div>
        </div>
      </div>

      <div style={s.body}>

        {/* ── TAB: Compare ──────────────────────────────────────────────────── */}
        {tab === 'compare' && (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b' }}>
              ⭐ = เต็ม 5 คะแนน · ⚫ = ไม่รองรับ · คลิกชื่อคู่แข่งเพื่อ Highlight คอลัมน์
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(99,102,241,0.4)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, minWidth: 180 }}>มิติ / Dimension</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.08)', minWidth: 100 }}>
                      🇹🇭 OpenThai AI
                    </th>
                    {COMPETITORS.map(c => (
                      <th key={c.id} onClick={() => setFocusCols(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                        style={{ padding: '10px 10px', textAlign: 'center', color: focusCols.includes(c.id) ? c.color : '#64748b', fontWeight: 600, fontSize: 11, cursor: 'pointer', minWidth: 90, background: focusCols.includes(c.id) ? `${c.color}10` : 'transparent', transition: 'all .2s' }}>
                        {c.icon} {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((dim, i) => {
                    const isOurBest = dim.us >= 5 && Math.max(dim.canva, dim.jasper, dim.hubspot, dim.hootsuite, dim.chatgpt, dim.shopify, dim.alibaba) < 5;
                    return (
                      <tr key={dim.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOurBest ? 'rgba(16,185,129,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 14px', color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>
                          {dim.label}
                          {isOurBest && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>WE LEAD</span>}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', background: 'rgba(16,185,129,0.06)' }}>
                          <Stars n={dim.us} color="#10b981" />
                        </td>
                        {['canva','jasper','hubspot','hootsuite','chatgpt','shopify','semrush','alibaba'].map(k => {
                          const v = dim[k] ?? 0;
                          const comp = COMPETITORS.find(c => c.id === k);
                          const isFocus = focusCols.includes(k);
                          return (
                            <td key={k} style={{ padding: '9px 10px', textAlign: 'center', background: isFocus ? `${comp?.color}08` : 'transparent' }}>
                              <Stars n={v} color={isFocus ? comp?.color : '#475569'} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>รวมคะแนน</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 900, color: '#10b981', fontSize: 16 }}>
                      {DIMENSIONS.reduce((s, d) => s + d.us, 0)}
                    </td>
                    {['canva','jasper','hubspot','hootsuite','chatgpt','shopify','semrush','alibaba'].map(k => (
                      <td key={k} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 14 }}>
                        {DIMENSIONS.reduce((s, d) => s + (d[k] ?? 0), 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {tab === 'income' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,1.1fr) minmax(280px,0.9fr)', gap: 14, marginBottom: 14 }}>
              <div style={s.card}>
                <h3 style={{ ...s.h3, color: '#86efac' }}>💰 Net Income Calculator</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    Platform
                    <select value={incomePlatformId} onChange={(e) => setIncomePlatformId(e.target.value)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }}>
                      {PLATFORM_COST_REGISTRY.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  {[
                    ['grossRevenue', 'ยอดขายรวม'],
                    ['cogs', 'ต้นทุนสินค้า'],
                    ['ads', 'ค่าโฆษณา'],
                    ['shipping', 'ค่าส่งตรง'],
                    ['packaging', 'แพ็กกิ้ง'],
                    ['misc', 'อื่น ๆ'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                      {label}
                      <input
                        type="number"
                        min="0"
                        value={incomeInput[key]}
                        onChange={(e) => updateIncomeField(key, e.target.value)}
                        style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }}
                      />
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: incomePlatform.color }}>
                  Commission จะอัปเดตอัตโนมัติตาม {incomePlatform.name}: {(incomePlatform.commissionRate * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{ ...s.card, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <h3 style={{ ...s.h3, color: '#86efac' }}>📊 รายได้สุทธิทันที</h3>
                {[
                  ['ยอดขายรวม', incomeModel.grossRevenue, '#fff'],
                  ['Commission', incomeModel.commission, incomePlatform.color],
                  ['Payment fee', incomeModel.paymentFee, '#a78bfa'],
                  ['Logistics overhead', incomeModel.logisticsFee, '#38bdf8'],
                  ['ต้นทุนรวม', incomeModel.totalCosts, '#fca5a5'],
                  ['กำไรสุทธิ', incomeModel.netIncome, incomeModel.netIncome >= 0 ? '#86efac' : '#fca5a5'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#94a3b8' }}>{label}</span>
                    <span style={{ color, fontWeight: 700 }}>{formatMoney(value)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Net margin</span>
                  <span style={{ color: incomeModel.marginPct >= 15 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: 20 }}>{incomeModel.marginPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,1fr) minmax(320px,1fr)', gap: 14 }}>
              <div style={{ ...s.card, background: 'rgba(15,23,42,0.82)' }}>
                <h3 style={{ ...s.h3, color: '#fbbf24' }}>🚨 Automatic Alerts</h3>
                {incomeAlerts.map((alert) => {
                  const tone = alert.level === 'danger'
                    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#fca5a5', label: 'BLOCK' }
                    : alert.level === 'warn'
                      ? { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', color: '#fbbf24', label: 'WARN' }
                      : { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#86efac', label: 'OK' };
                  return (
                    <div key={alert.text} style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ color: tone.color, fontWeight: 800, fontSize: 11, marginBottom: 4 }}>{tone.label}</div>
                      <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }}>{alert.text}</div>
                    </div>
                  );
                })}
              </div>
              <div style={s.card}>
                <h3 style={{ ...s.h3, color: '#a5b4fc' }}>🧠 Cost Insights</h3>
                {incomeInsights.map((insight) => (
                  <div key={insight} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#22c55e' }}>•</span>
                    <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{insight}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...s.card, background: 'rgba(15,23,42,0.8)', gridColumn: '1 / -1' }}>
                <h3 style={{ ...s.h3, color: '#fbbf24' }}>🐍 Python: net_income()</h3>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{NET_INCOME_PY}</pre>
              </div>
            </div>
          </>
        )}

        {tab === 'promptpay' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,0.95fr) minmax(320px,1.05fr)', gap: 14 }}>
              <div style={s.card}>
                <h3 style={{ ...s.h3, color: '#7dd3fc' }}>📱 PromptPay QR</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    เบอร์ PromptPay (มือถือเท่านั้น)
                    <input value={promptPayInput.phone} onChange={(e) => updatePromptPayField('phone', e.target.value)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    จำนวนเงิน
                    <input type="number" min="1" value={promptPayInput.amount} onChange={(e) => updatePromptPayField('amount', e.target.value)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    Merchant Name
                    <input value={promptPayInput.merchantName} onChange={(e) => updatePromptPayField('merchantName', e.target.value)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                    City
                    <input value={promptPayInput.city} onChange={(e) => updatePromptPayField('city', e.target.value)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 12px' }} />
                  </label>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  สร้าง EMVCo payload + CRC16-CCITT ในเครื่องเท่านั้น และไม่บันทึกเบอร์โทรลง log
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  รองรับเฉพาะเบอร์มือถือไทย 10 หลัก และไม่รับเลขบัตรประชาชน 13 หลัก
                </div>
              </div>

              <div style={{ ...s.card, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.25)' }}>
                <h3 style={{ ...s.h3, color: '#7dd3fc' }}>🧾 EMVCo Output</h3>
                {promptPayModel.ok ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
                      <div style={{ background: '#fff', borderRadius: 12, padding: 10, width: 220 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${promptPayMatrix.length || 21}, 1fr)`, gap: 1 }}>
                          {promptPayMatrix.flatMap((row, rowIndex) => row.map((cell, cellIndex) => (
                            <div key={`${rowIndex}-${cellIndex}`} style={{ width: 8, height: 8, background: cell ? '#111827' : '#ffffff' }} />
                          )))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8 }}>จำนวนเงิน: <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{amountToThaiText(promptPayInput.amount)}</span></div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8 }}>เบอร์ที่ใช้: <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{promptPayModel.maskedPhone}</span></div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8 }}>CRC16-CCITT: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{promptPayModel.crc}</span></div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(15,23,42,0.9)', borderRadius: 10, padding: 12 }}>{promptPayModel.payload}</pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 14px', color: '#fca5a5', fontSize: 13 }}>
                    {promptPayModel.error}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'fees' && (
          <>
            <div style={{ ...s.card, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#fdba74' }}>📋 Platform Cost Registry</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Platform', 'Commission', 'Payment', 'Logistics', 'หมายเหตุ'].map((head) => (
                        <th key={head} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORM_COST_REGISTRY.map((item) => (
                      <tr key={item.id} onClick={() => setCostFocusId(item.id)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', background: costFocusId === item.id ? `${item.color}12` : 'transparent' }}>
                        <td style={{ padding: '10px', color: item.color, fontWeight: 700 }}>{item.name}</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{(item.commissionRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{(item.paymentRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{(item.logisticsRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,0.8fr) minmax(320px,1.2fr)', gap: 14 }}>
              <div style={s.card}>
                <h3 style={{ ...s.h3, color: costFocus.color }}>🔎 Cost Focus: {costFocus.name}</h3>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 10 }}>{costFocus.note}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#94a3b8' }}>Commission</span><span style={{ color: '#fff' }}>{(costFocus.commissionRate * 100).toFixed(1)}%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#94a3b8' }}>Payment</span><span style={{ color: '#fff' }}>{(costFocus.paymentRate * 100).toFixed(1)}%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#94a3b8' }}>Logistics overhead</span><span style={{ color: '#fff' }}>{(costFocus.logisticsRate * 100).toFixed(1)}%</span></div>
                </div>
              </div>

              <div style={{ ...s.card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <h3 style={{ ...s.h3, color: '#c4b5fd' }}>🤝 Channel Capability Negotiator</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {CHANNEL_CAPABILITY_NEGOTIATOR.map((item) => (
                    <button key={item.id} onClick={() => setCapabilityFocusId(item.id)} style={{ background: capabilityFocusId === item.id ? `${item.color}20` : 'transparent', border: `1px solid ${capabilityFocusId === item.id ? `${item.color}50` : 'rgba(255,255,255,0.1)'}`, borderRadius: 999, color: capabilityFocusId === item.id ? item.color : '#94a3b8', cursor: 'pointer', padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
                      {item.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  {capabilityFocus.apis.map((api) => {
                    const tone = statusTone(api.status);
                    return (
                      <div key={api.label} style={{ background: `${tone.color}10`, border: `1px solid ${tone.color}25`, borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 6 }}>{api.label}</div>
                        <div style={{ color: tone.color, fontSize: 12, fontWeight: 700 }}>{tone.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'consent' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,1fr) minmax(320px,1fr)', gap: 14, marginBottom: 14 }}>
              <div style={{ ...s.card, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <h3 style={{ ...s.h3, color: '#c4b5fd' }}>🔐 Consent Chain Ledger</h3>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
                  HMAC-SHA256 ผูกทุก entry เข้าหากัน หาก chain ถูกแก้ไข ระบบจะหยุดเขียนทันที
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: '#10b981', fontWeight: 900, fontSize: 20 }}>{grantedConsents}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>granted</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 20 }}>{consentProfiles.filter((item) => item.status === 'withdrawn' || item.status === 'erased').length}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>restricted</div>
                  </div>
                  <div style={{ background: consentLedgerFrozen ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', border: `1px solid ${consentLedgerFrozen ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: consentLedgerFrozen ? '#ef4444' : '#a5b4fc', fontWeight: 900, fontSize: 20 }}>{consentLedgerEntries.length}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{consentLedgerFrozen ? 'frozen' : 'entries'}</div>
                  </div>
                </div>
                {consentLedgerStatus && (
                  <div style={{ marginBottom: 12, background: consentLedgerFrozen ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', border: `1px solid ${consentLedgerFrozen ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`, borderRadius: 10, padding: '10px 12px', color: consentLedgerFrozen ? '#fca5a5' : '#c4b5fd', fontSize: 12 }}>
                    {consentLedgerStatus}
                  </div>
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {consentProfiles.map((item) => (
                    <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ color: item.color, fontWeight: 800, fontSize: 13 }}>{item.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.purpose}</div>
                        </div>
                        <span style={{ fontSize: 11, color: item.status === 'granted' ? '#10b981' : item.status === 'pending' ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button disabled={consentLedgerFrozen} onClick={() => updateConsentStatus(item.id, 'granted')} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', cursor: consentLedgerFrozen ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '7px 10px', opacity: consentLedgerFrozen ? 0.5 : 1 }}>Grant</button>
                        <button disabled={consentLedgerFrozen} onClick={() => updateConsentStatus(item.id, 'withdraw_19')} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#fbbf24', cursor: consentLedgerFrozen ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '7px 10px', opacity: consentLedgerFrozen ? 0.5 : 1 }}>ถอนยินยอม §19</button>
                        <button disabled={consentLedgerFrozen} onClick={() => updateConsentStatus(item.id, 'erase_33')} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: consentLedgerFrozen ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '7px 10px', opacity: consentLedgerFrozen ? 0.5 : 1 }}>ลบข้อมูล §33</button>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>ล่าสุด: {item.updatedAt}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ ...s.card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ ...s.h3, color: '#c4b5fd', marginBottom: 0 }}>⛓️ Chain Entries</h3>
                    <button disabled={consentLedgerFrozen || !consentLedgerEntries.length} onClick={onTamperConsentLedger} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: consentLedgerFrozen || !consentLedgerEntries.length ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '7px 10px', opacity: consentLedgerFrozen || !consentLedgerEntries.length ? 0.5 : 1 }}>Tamper chain</button>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {consentLedgerEntries.length ? consentLedgerEntries.map((entry) => (
                      <div key={entry.id} style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{entry.id} · {CONSENT_ACTION_LABELS[entry.payload.action]}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>prev_hash · {entry.prev_hash}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>entry_hash · {entry.entry_hash}</div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{entry.payload.platform} · {entry.payload.timestamp}</div>
                      </div>
                    )) : (
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>ยังไม่มี entry — กด action ด้านซ้ายเพื่อเริ่ม chain</div>
                    )}
                  </div>
                </div>
                <div style={{ ...s.card, background: 'rgba(15,23,42,0.85)' }}>
                  <h3 style={{ ...s.h3, color: '#fbbf24' }}>🐍 Python: ConsentLedger</h3>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{CONSENT_LEDGER_PY}</pre>
                </div>
                <div style={{ ...s.card, background: 'rgba(15,23,42,0.85)' }}>
                  <h3 style={{ ...s.h3, color: '#67e8f9' }}>🐍 Python: HouseholdLedger</h3>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{HOUSEHOLD_LEDGER_PY}</pre>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'life' && (
          <>
            <div style={{ ...s.card, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#67e8f9' }}>🌱 4 กลุ่มแพลตฟอร์มโลกเทียบไทย</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {LIFE_PLATFORM_GROUPS.map((group) => (
                  <div key={group.title} style={{ background: `${group.color}10`, border: `1px solid ${group.color}25`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ color: group.color, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{group.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>{group.detail}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.items.map((item) => <Tag key={item} text={item} color={group.color} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, background: 'rgba(15,23,42,0.85)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <h3 style={{ ...s.h3, color: '#67e8f9', marginBottom: 0 }}>📊 ชีวิต 5 แกน · 14 แพลตฟอร์ม</h3>
                <div style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999, padding: '6px 10px' }}>
                  pre-pilot ยังไม่กล่าวอ้างผลจริง
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {LIFE_AXIS_OPTIONS.map((axis) => (
                  <button key={axis.id} onClick={() => setLifeAxisId(axis.id)} style={{ background: lifeAxisId === axis.id ? `${axis.color}20` : 'transparent', border: `1px solid ${lifeAxisId === axis.id ? `${axis.color}55` : 'rgba(255,255,255,0.1)'}`, borderRadius: 999, color: lifeAxisId === axis.id ? axis.color : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>
                    {axis.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {rankedLifePlatforms.map((item, index) => (
                  <div key={item.id} style={{ background: `${item.color}10`, border: `1px solid ${item.color}25`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ color: item.color, fontWeight: 800, fontSize: 13 }}>{index + 1}. {item.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{item.category}</div>
                      </div>
                      <div style={{ color: item.color, fontWeight: 900, fontSize: 24 }}>{item[lifeAxisId]}</div>
                    </div>
                    <ScoreBar score={item[lifeAxisId]} color={item.color} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px,1fr) minmax(320px,1fr)', gap: 14 }}>
              <div style={s.card}>
                <h3 style={{ ...s.h3, color: '#a5b4fc' }}>🧩 7 สิ่งที่ยังไม่มีใครทำ</h3>
                {THAI_LIFE_GAPS.map((item) => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#6366f1' }}>•</span>
                    <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(236,72,153,0.08))', border: '1px solid rgba(16,185,129,0.25)' }}>
                <h3 style={{ ...s.h3, color: '#86efac' }}>🎯 5 เป้าหมายวัดผลได้จริง</h3>
                {THAI_LIFE_OUTCOMES.map((item) => (
                  <div key={item.title} style={{ background: `${item.color}10`, border: `1px solid ${item.color}25`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ color: item.color, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'thailand' && (
          <>
            <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(52,168,83,0.08))', border: '1px solid rgba(20,184,166,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#5eead4' }}>🧭 ภาพรวมที่ชัดที่สุดของไทย</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                {THAI_LIFE_FLOWS.map((flow) => (
                  <div key={flow.id} style={{ background: `${flow.color}10`, border: `1px solid ${flow.color}25`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: flow.color, fontSize: 14, marginBottom: 6 }}>{flow.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{flow.summary}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {flow.steps.map((step) => <Tag key={step} text={step} color={flow.color} />)}
                    </div>
                    <div style={{ fontSize: 12, color: '#f8fafc' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>Gap:</span> {flow.gap}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#5eead4' }}>🇹🇭 Thailand Reality Map</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {THAILAND_NEEDS.map((need) => (
                  <div key={need.key} style={{ background: `${need.color}10`, border: `1px solid ${need.color}25`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ color: need.color, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>THAILAND NEED</div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }}>{need.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
              {THAILAND_PLATFORM_MATRIX.map((item) => (
                <div key={item.id} style={{ ...s.card, borderTop: `3px solid ${item.color}`, marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{item.icon}</span>
                        <div style={{ fontWeight: 800, fontSize: 15, color: item.color }}>{item.name}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{item.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: 24, color: item.color }}>{item.fit}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Thailand fit</div>
                    </div>
                  </div>

                  <ScoreBar score={item.fit} color={item.color} />

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>แข็งที่สุด</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.strongest.map((point) => <Tag key={point} text={point} color={item.color} />)}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>มีข้อแตกอย่างไร</div>
                    {item.differences.map((point) => (
                      <div key={point} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: item.color }}>•</span>
                        <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{point}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ขาดอะไร</div>
                    {item.missing.map((point) => (
                      <div key={point} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#f59e0b' }}>⚠</span>
                        <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{point}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>สมควรเสริมอะไร</div>
                    {item.add.map((point) => (
                      <div key={point} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#10b981' }}>✓</span>
                        <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#a5b4fc' }}>🎯 สิ่งที่ OpenThai ควรเสริมก่อน</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                {[
                  { title: 'LINE OA orchestration', why: 'ช่องทางไทยที่ fit สูงสุดและใช้ปิดการขายจริง', color: '#06c755' },
                  { title: 'TikTok + Shopee workflow', why: 'ช่วยเปลี่ยน trend เป็นยอดขายใน social commerce ไทย', color: '#fe2c55' },
                  { title: 'Google SEO 3 ภาษา', why: 'ทำให้สินค้าค้นหาเจอทั้งไทย-อังกฤษ-จีน', color: '#34a853' },
                  { title: 'Alibaba / Amazon export pack', why: 'เปิด B2B + cross-border สำหรับผู้ผลิตไทย', color: '#ff6a00' },
                  { title: 'Facebook inbox CRM', why: 'เก็บ lead/comment/inbox ไว้ใน flow เดียว', color: '#1877f2' },
                  { title: 'China-localized content layer', why: 'ปิดช่องว่าง Xiaohongshu/Pinduoduo/จีน consumer discovery', color: '#ef4444' },
                ].map((row) => (
                  <div key={row.title} style={{ background: `${row.color}10`, border: `1px solid ${row.color}25`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ color: row.color, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{row.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 }}>{row.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'people' && (
          <>
            <div style={{ ...s.card, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#86efac' }}>🧑‍🤝‍🧑 8 กลุ่มคนที่ได้ประโยชน์โดยตรง</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {THAI_PEOPLE_SEGMENTS.map((person) => (
                  <div key={person.id} style={{ background: `${person.color}10`, border: `1px solid ${person.color}25`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{person.icon}</div>
                        <div style={{ color: person.color, fontWeight: 800, fontSize: 14 }}>{person.name}</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{person.size}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: person.color, fontWeight: 900, fontSize: 24 }}>{person.impact}</div>
                        <div style={{ color: '#64748b', fontSize: 10 }}>impact</div>
                      </div>
                    </div>
                    <ScoreBar score={person.impact} color={person.color} />
                    <div style={{ marginTop: 10 }}>
                      {person.gains.map((gain) => (
                        <div key={gain} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: person.color }}>✓</span>
                          <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{gain}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(34,197,94,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#a5b4fc' }}>🛤️ 4 เส้นทางชีวิตจริง</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
                {THAI_LIVED_JOURNEYS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedJourneyId(item.id)}
                    style={{
                      textAlign: 'left',
                      background: selectedJourneyId === item.id ? `${item.color}18` : 'rgba(255,255,255,0.03)',
                      border: selectedJourneyId === item.id ? `1px solid ${item.color}45` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ color: item.color, fontWeight: 800, fontSize: 13 }}>{item.person}</div>
                      <div style={{ color: item.color, fontWeight: 900 }}>{item.impact}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{item.journey.join(' → ')}</div>
                  </button>
                ))}
              </div>

              <div style={{ background: `${selectedJourney.color}10`, border: `1px solid ${selectedJourney.color}25`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: selectedJourney.color, fontWeight: 900, fontSize: 16 }}>{selectedJourney.person}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>impact score {selectedJourney.impact} · journey จริงที่ควรยกระดับก่อน</div>
                  </div>
                  <button
                    onClick={() => setTab('gap')}
                    style={{ background: `${selectedJourney.color}20`, border: `1px solid ${selectedJourney.color}40`, borderRadius: 8, color: selectedJourney.color, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}
                  >
                    ดู gap ที่เกี่ยวข้อง →
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Journey</div>
                    {selectedJourney.journey.map((step) => (
                      <div key={step} style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 6 }}>• {step}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Gap ปัจจุบัน</div>
                    {selectedJourney.gaps.map((step) => (
                      <div key={step} style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>⚠ {step}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>OpenThai fix</div>
                    {selectedJourney.fix.map((step) => (
                      <div key={step} style={{ fontSize: 12, color: '#86efac', marginBottom: 6 }}>✓ {step}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Advantage ────────────────────────────────────────────────── */}
        {tab === 'advantage' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(480px,1fr))', gap: 14, marginBottom: 14 }}>
              {[
                { icon: '🇹🇭', title: 'Thai-First AI Platform', color: '#10b981',
                  points: ['Jasper/ChatGPT เป็น English-first — ไม่เข้าใจบริบทไทย', 'ภาษาไทย Context · วัฒนธรรมไทย · ตลาดไทย ครบในที่เดียว', '18-Skill Framework สร้างมาสำหรับสินค้าไทยโดยเฉพาะ'] },
                { icon: '🌾', title: 'OTOP + SME + Agriculture ครบ 3 กลุ่ม', color: '#f59e0b',
                  points: ['Canva ไม่รู้จัก OTOP · Jasper ไม่รู้จัก GI/GAP Certification', 'Farm-to-Table AI สำหรับเกษตรกรไทย — ไม่มีในโลก', 'Catalog 3 ภาษา + HS Code + Export Info ครบจบ'] },
                { icon: '🌐', title: '3-Language Single Post', color: '#6366f1',
                  points: ['ไม่มีแพลตฟอร์มไหนทำ TH/EN/ZH ในชิ้นเดียว', 'B2B Export ต้องการ 3 ภาษาพร้อมกัน — เราทำได้ทันที', 'ผลิตสื่อ 7 กลุ่มเป้าหมาย × 3 ภาษา = 21 ชิ้นในคลิกเดียว'] },
                { icon: '🌍', title: '7-Continent Continental Strategy', color: '#ec4899',
                  points: ['HubSpot คิดแค่ "global" — ไม่รู้ว่าแอฟริกาต้อง WhatsApp', 'เราเดียวที่มี Region-specific Channel Strategy ครบ 7 ทวีป', 'รวมถึง Antarctic B2G Government Procurement'] },
                { icon: '🌟', title: 'All-in-One ราคา SME ไทยเข้าถึงได้', color: '#f97316',
                  points: ['ปกติต้องใช้ 5-6 tools แยกกัน (Jasper + Canva + Hootsuite + Semrush + ...)', 'เรารวม KOL Brief · Catalog · Scheduler · Analytics · Benchmark ในที่เดียว', '฿299/เดือน vs HubSpot $45-3,600/เดือน = Cost Value 10x ดีกว่า'] },
                { icon: '🏛️', title: 'Cultural Intelligence Layer', color: '#8b5cf6',
                  points: ['S17 ปรัชญาจีน 八德 · พระไตรปิฎก · ภูมิปัญญาไทย', 'เข้าใจ Halal, Buddhist marketing, Confucian values', 'Content ที่ AI ทั่วไปเขียนไม่ได้ — เราเขียนได้'] },
              ].map((item, i) => (
                <div key={i} style={{ ...s.card, borderLeft: `3px solid ${item.color}`, marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <div style={{ fontWeight: 800, fontSize: 15, color: item.color }}>{item.title}</div>
                  </div>
                  {item.points.map((p, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: item.color, minWidth: 16, fontWeight: 700, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{p}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(99,102,241,0.08))', border: '1px solid rgba(16,185,129,0.3)' }}>
              <h3 style={{ ...s.h3, color: '#6ee7b7' }}>🛡️ Defensibility Moats — ทำไมคู่แข่งลอกไม่ได้</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {MOATS.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{m.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: m.color }}>{m.title}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: m.color, minWidth: 40, textAlign: 'right' }}>{m.strength}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <MoatBar pct={m.strength} color={m.color} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', paddingLeft: 30 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Gap Analysis ─────────────────────────────────────────────── */}
        {tab === 'gap' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <h3 style={{ ...s.h3, color: '#10b981' }}>✅ มิติที่เรา LEAD (9/15)</h3>
                {DIMENSIONS.filter(d => {
                  const maxComp = Math.max(d.canva ?? 0, d.jasper ?? 0, d.hubspot ?? 0, d.hootsuite ?? 0, d.chatgpt ?? 0, d.shopify ?? 0, d.alibaba ?? 0);
                  return d.us > maxComp;
                }).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>{d.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stars n={d.us} color="#10b981" />
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700, minWidth: 28 }}>{d.us}/5</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ ...s.h3, color: '#ef4444' }}>⚠️ Gap ที่ต้องปิด (4 Critical + 3 Moderate)</h3>
                {THAILAND_GAP_DRILLDOWNS.map((g, i) => (
                  <div key={i} style={{ background: `${g.color}08`, border: `1px solid ${g.color}25`, borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 10, background: `${g.color}20`, color: g.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>{g.urgency.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{g.gap}</div>
                    <div style={{ fontSize: 12, color: g.color, marginTop: 4, fontWeight: 600 }}>→ {g.action}</div>
                    <button
                      onClick={() => setSelectedJourneyId(g.journeyId)}
                      style={{ marginTop: 8, background: `${g.color}20`, border: `1px solid ${g.color}35`, borderRadius: 8, color: g.color, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px' }}
                    >
                      ⚡ หลอมช่องว่างนี้
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <h3 style={{ ...s.h3, marginBottom: 0 }}>🔬 Deep Dive: {selectedJourney.person}</h3>
                <button
                  onClick={() => setTab('people')}
                  style={{ background: `${selectedJourney.color}20`, border: `1px solid ${selectedJourney.color}40`, borderRadius: 8, color: selectedJourney.color, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}
                >
                  เปิดแท็บ คน →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
                <div style={{ background: `${selectedJourney.color}10`, border: `1px solid ${selectedJourney.color}25`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Journey จริง</div>
                  {selectedJourney.journey.map((step) => <div key={step} style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 6 }}>• {step}</div>)}
                </div>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Gap ปัจจุบัน</div>
                  {selectedJourney.gaps.map((step) => <div key={step} style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>⚠ {step}</div>)}
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Fix ที่ควรทำ</div>
                  {selectedJourney.fix.map((step) => <div key={step} style={{ fontSize: 12, color: '#86efac', marginBottom: 6 }}>✓ {step}</div>)}
                </div>
              </div>
              <h3 style={s.h3}>📊 GAP → OUTCOME Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Gap ที่พบ','Strategic Outcome','Timeline','Priority'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { gap: 'Design tools ไม่มี', outcome: 'Partnership กับ Canva API', time: 'Q2 2026', pri: '🔴 High' },
                    { gap: 'Scheduler ยัง mock', outcome: 'LINE/FB/TikTok OAuth จริง', time: 'Q2 2026', pri: '🔴 High' },
                    { gap: 'Analytics ยัง simulate', outcome: 'Platform Insight API', time: 'Q3 2026', pri: '🟡 Mid' },
                    { gap: 'ไม่มีคู่แข่งใน OTOP/Agri', outcome: 'ยึด Category: Thai Export AI', time: 'Now', pri: '🟢 Done' },
                    { gap: 'HubSpot แพงเกิน SME', outcome: 'ตั้งราคา 10x better value', time: 'Now', pri: '🟢 Done' },
                    { gap: 'ไม่มีใครทำ 7-Continent', outcome: 'B2G + Government Contract', time: 'Q4 2026', pri: '🔴 High' },
                    { gap: '3-Language Moat', outcome: 'Defensibility 3-5 ปี', time: 'Ongoing', pri: '🟢 Maintained' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', color: '#fca5a5', fontSize: 12 }}>{row.gap}</td>
                      <td style={{ padding: '9px 12px', color: '#6ee7b7', fontSize: 12, fontWeight: 600 }}>{row.outcome}</td>
                      <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: 12 }}>{row.time}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12 }}>{row.pri}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TAB: Revenue ──────────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14, marginBottom: 14 }}>
              {REVENUE_STREAMS.map((r, i) => (
                <div key={i} style={{ ...s.card, borderTop: `3px solid ${r.color}`, marginBottom: 0 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: r.color, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, background: r.status === 'live' ? 'rgba(16,185,129,0.2)' : r.status === 'q2' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)', color: r.status === 'live' ? '#6ee7b7' : r.status === 'q2' ? '#a5b4fc' : '#fbbf24', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                      {r.sub}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{r.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ ...s.card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <h3 style={{ ...s.h3, color: '#a5b4fc' }}>📈 Revenue Projection (Conservative)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { year: '2026', label: 'Year 1', saas: '฿3.6M', commission: '฿500K', gov: '฿5M', total: '฿9.1M', color: '#10b981' },
                  { year: '2027', label: 'Year 2 (+ASEAN)', saas: '฿18M', commission: '฿8M', gov: '฿25M', total: '฿51M', color: '#6366f1' },
                  { year: '2028', label: 'Year 3 (IPO Ready)', saas: '฿72M', commission: '฿45M', gov: '฿80M', total: '฿197M', color: '#f59e0b' },
                ].map((y, i) => (
                  <div key={i} style={{ background: `${y.color}08`, border: `1px solid ${y.color}25`, borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontWeight: 800, color: y.color, fontSize: 16, marginBottom: 4 }}>{y.year}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{y.label}</div>
                    {[['SaaS', y.saas], ['Export Commission', y.commission], ['B2G', y.gov]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#94a3b8' }}>{k}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${y.color}30`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: y.color, fontWeight: 700, fontSize: 13 }}>รวม</span>
                      <span style={{ color: y.color, fontWeight: 900, fontSize: 16 }}>{y.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Roadmap ──────────────────────────────────────────────────── */}
        {tab === 'roadmap' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {ROADMAP.map((q, i) => (
              <div key={i} style={{ ...s.card, borderTop: `3px solid ${q.color}`, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: q.color }}>{q.period}</div>
                  <span style={{ fontSize: 12, color: q.color, background: `${q.color}15`, border: `1px solid ${q.color}30`, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{q.label}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, minWidth: 18, marginTop: 1 }}>{item.done ? '✅' : '🔲'}</span>
                      <span style={{ fontSize: 12, color: item.done ? '#6ee7b7' : '#94a3b8', lineHeight: 1.5 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${q.color}20`, fontSize: 12, color: '#475569' }}>
                  {q.items.filter(i => i.done).length}/{q.items.length} เสร็จแล้ว
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Market Entry (Blue Ocean) ────────────────────────────────── */}
        {tab === 'market' && (
          <>
            <div style={{ ...s.card, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)', marginBottom: 14 }}>
              <h3 style={{ ...s.h3, color: '#67e8f9' }}>🌊 Blue Ocean Markets — ตลาดที่คู่แข่งยักษ์ใหญ่ไม่อยู่</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                {MARKETS.map((m, i) => (
                  <div key={i} style={{ background: `${m.color}10`, border: `1px solid ${m.color}30`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }} onClick={() => navigate(m.action)}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontWeight: 800, color: m.color, fontSize: 15, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{m.size}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{m.opp}</div>
                    <div style={{ marginTop: 10, fontSize: 12, color: m.color, fontWeight: 600 }}>→ เข้าถึงได้เลย</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <h3 style={s.h3}>🗺️ Partner Ecosystem — จับมือแทนที่จะสร้างใหม่</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                {[
                  { partner: 'Canva', icon: '🎨', value: 'Export Catalog → Canva Template โดยตรง', status: 'Q2', color: '#00c4cc' },
                  { partner: 'LINE Business', icon: '💚', value: 'Auto-post LINE OA Broadcast API', status: 'Q2', color: '#06c755' },
                  { partner: 'Alibaba / 1688', icon: '🏢', value: 'Thai Catalog → Alibaba Listing ทันที', status: 'Q4', color: '#ff6a00' },
                  { partner: 'กรมส่งเสริมการส่งออก', icon: '🇹🇭', value: 'HS Code + Market Entry ข้อมูลจริง', status: 'Q3', color: '#10b981' },
                  { partner: 'สสว.', icon: '🏛️', value: 'Platform ทางการ SME ไทย', status: 'Q3', color: '#6366f1' },
                  { partner: 'TikTok Shop', icon: '▶️', value: 'Upload Listing ตรงจาก Catalog AI', status: 'Q2', color: '#fe2c55' },
                ].map((p, i) => (
                  <div key={i} style={{ background: `${p.color}08`, border: `1px solid ${p.color}20`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{p.icon}</span>
                      <span style={{ fontWeight: 700, color: p.color, fontSize: 13 }}>{p.partner}</span>
                      <span style={{ fontSize: 10, background: `${p.color}15`, color: p.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700, marginLeft: 'auto' }}>{p.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Growth Hacks ─────────────────────────────────────────────── */}
        {tab === 'growth' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {GROWTH_HACKS.map((g, i) => (
                <div key={i} style={{ ...s.card, borderLeft: `3px solid ${g.color}`, marginBottom: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>"{g.campaign}"</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Platform: <span style={{ color: '#94a3b8' }}>{g.platform}</span> · Target: <span style={{ color: '#94a3b8' }}>{g.target}</span></div>
                  </div>
                  <button style={{ background: `${g.color}20`, border: `1px solid ${g.color}40`, borderRadius: 8, color: g.color, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 14px', whiteSpace: 'nowrap' }} onClick={() => navigate('/global-pr')}>
                    สร้างสื่อ →
                  </button>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <h3 style={s.h3}>🔗 Comparison SEO Pages — ใช้ Gap ของคู่แข่งเป็น Growth</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                {[
                  { slug: '/vs/canva', title: 'OpenThai AI vs Canva', keyword: '"canva alternative thailand"', volume: '~2,400/mo' },
                  { slug: '/vs/jasper', title: 'OpenThai AI vs Jasper AI', keyword: '"jasper ai thai language"', volume: '~890/mo' },
                  { slug: '/vs/chatgpt', title: 'OpenThai AI vs ChatGPT', keyword: '"AI marketing tool Thai"', volume: '~12,000/mo' },
                  { slug: '/vs/hubspot', title: 'OpenThai AI vs HubSpot', keyword: '"hubspot alternative SME Thailand"', volume: '~1,800/mo' },
                ].map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: '#6366f1', marginBottom: 4 }}>{p.slug}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Keyword: {p.keyword}</div>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>~{p.volume} searches</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Vision ───────────────────────────────────────────────────── */}
        {tab === 'vision' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              {VISION.map((v, i) => (
                <div key={i} style={{ ...s.card, borderLeft: `4px solid ${v.color}`, marginBottom: 0, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32 }}>{v.icon}</div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: v.color, marginTop: 4 }}>{v.year}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 6 }}>{v.title}</div>
                    <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.3)' }}>
              <h3 style={{ ...s.h3, color: '#c4b5fd' }}>🌐 ASEAN Expansion Map — 2027</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {[
                  { country: 'ไทย', flag: '🇹🇭', lang: 'TH', status: 'Live ✅', color: '#10b981' },
                  { country: 'เวียดนาม', flag: '🇻🇳', lang: 'VI', status: 'Q4 2026', color: '#6366f1' },
                  { country: 'อินโดนีเซีย', flag: '🇮🇩', lang: 'ID', status: 'Q1 2027', color: '#6366f1' },
                  { country: 'มาเลเซีย', flag: '🇲🇾', lang: 'MY', status: 'Q1 2027', color: '#6366f1' },
                  { country: 'ฟิลิปปินส์', flag: '🇵🇭', lang: 'TL', status: 'Q2 2027', color: '#f59e0b' },
                  { country: 'สิงคโปร์', flag: '🇸🇬', lang: 'EN', status: 'Q2 2027', color: '#f59e0b' },
                  { country: 'จีน', flag: '🇨🇳', lang: 'ZH', status: 'Integrated ✅', color: '#10b981' },
                  { country: 'ญี่ปุ่น', flag: '🇯🇵', lang: 'JA', status: 'Q3 2027', color: '#f59e0b' },
                ].map((c, i) => (
                  <div key={i} style={{ background: `${c.color}10`, border: `1px solid ${c.color}25`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24 }}>{c.flag}</div>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginTop: 4 }}>{c.country}</div>
                    <div style={{ fontSize: 11, color: c.color, fontWeight: 700 }}>{c.lang}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
