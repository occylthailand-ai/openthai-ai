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
  const navigate = useNavigate();

  const activeTab = TABS.find(t => t.id === tab);

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
                OpenThai AI vs 8 Global Giants · 15 มิติ · GAP Analysis · Roadmap · Vision 2028
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
                {[
                  { label: '🎨 Design Tools', gap: 'vs Canva ⭐⭐⭐⭐⭐', action: 'Canva API Integration', urgency: 'critical', color: '#ef4444' },
                  { label: '📊 Real Analytics', gap: 'vs HubSpot ⭐⭐⭐⭐⭐', action: 'Platform Insight API Q3', urgency: 'critical', color: '#ef4444' },
                  { label: '📅 API Scheduler จริง', gap: 'vs Hootsuite ⭐⭐⭐⭐⭐', action: 'LINE/FB/TikTok OAuth Q2', urgency: 'critical', color: '#ef4444' },
                  { label: '🛒 E-commerce Backend', gap: 'vs Shopify ⭐⭐⭐⭐', action: 'TikTok Shop Integration Q2', urgency: 'critical', color: '#ef4444' },
                  { label: '📱 Mobile Native App', gap: 'vs Canva/Buffer', action: 'PWA → Native Q3', urgency: 'moderate', color: '#f59e0b' },
                  { label: '🖼️ AI Image Generate', gap: 'vs Adobe Firefly', action: 'SD Server Q3', urgency: 'moderate', color: '#f59e0b' },
                  { label: '👥 Team Collaboration', gap: 'vs HubSpot', action: 'Workspace + Roles Q2', urgency: 'moderate', color: '#f59e0b' },
                ].map((g, i) => (
                  <div key={i} style={{ background: `${g.color}08`, border: `1px solid ${g.color}25`, borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 10, background: `${g.color}20`, color: g.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>{g.urgency.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{g.gap}</div>
                    <div style={{ fontSize: 12, color: g.color, marginTop: 4, fontWeight: 600 }}>→ {g.action}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, marginTop: 14 }}>
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
