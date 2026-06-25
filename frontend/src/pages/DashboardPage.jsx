import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

const STATS = [
  { icon: '⚡', label: 'คอนเทนต์สร้างแล้ว', value: '24,891', delta: '+12% วันนี้', color: '#6366f1' },
  { icon: '👥', label: 'ผู้ใช้งานแอคทีฟ', value: '3,241', delta: '+8% สัปดาห์นี้', color: '#10b981' },
  { icon: '🌏', label: 'แพลตฟอร์มเชื่อมต่อ', value: '241', delta: 'ครอบคลุม 35 ประเทศ', color: '#f59e0b' },
  { icon: '💰', label: 'รายได้ Affiliate', value: '฿182,450', delta: '+24% เดือนนี้', color: '#fe2c55' },
];

const QUICK_ACTIONS = [
  { icon: '🎯', label: 'Pitch Deck', desc: 'Investor & Partner Deck · 10 สไลด์ · Present Mode · Export PDF · ระดมทุน/B2G', route: '/pitch', color: '#8b5cf6', hot: true },
  { icon: '🔌', label: 'Integration Hub', desc: 'เชื่อม Platform จริง · LINE · FB · TikTok · Canva · Alibaba · พร้อมเสียบ API', route: '/integrations', color: '#10b981', hot: true },
  { icon: '🧠', label: 'Strategy Center', desc: 'วิเคราะห์ตนเอง vs 8 ยักษ์ใหญ่โลก · 15 มิติ · GAP · Roadmap · Vision 2028', route: '/strategy', color: '#8b5cf6', hot: true },
  { icon: '📅', label: 'Auto-Post Scheduler', desc: 'วางตารางโพสต์อัตโนมัติ · TikTok · Facebook · LINE · Shopee · 8 Platforms', route: '/scheduler', color: '#10b981', hot: true },
  { icon: '📊', label: 'Analytics Pro', desc: 'Reach · Engagement · Conversion · Platform Breakdown · Weekly Trend', route: '/analytics-pro', color: '#f59e0b', hot: true },
  { icon: '🎨', label: 'Image Prompt AI', desc: 'Prompt สำหรับ Midjourney · DALL-E · SD · ทุก Mood · ทุก Style', route: '/image-prompt', color: '#ec4899', hot: true },
  { icon: '🏪', label: 'Product Catalog AI', desc: 'Catalog 3 ภาษา · Export Info · HS Code · FOB/CIF · MOQ', route: '/catalog-ai', color: '#6366f1', hot: true },
  { icon: '🌟', label: 'KOL Brief Generator', desc: 'Brief ครบ · Nano→Macro · Script · Hashtag · KPI · ทุก Platform', route: '/kol-brief', color: '#f97316', hot: true },
  { icon: '🔍', label: 'Content Benchmark', desc: 'เทียบสื่อกับ Top Performer ตลาดจริง · 5 มิติ · ทันสมัย · เทรนด์ · Hashtag', route: '/benchmark', color: '#6366f1', hot: true },
  { icon: '🌐', label: 'Global PR Creator', desc: '3 ภาษา · 5 กลุ่มเป้าหมาย · 7 ทวีป · TH/EN/ZH ครบจบ', route: '/global-pr', color: '#10b981', hot: true },
  { icon: '📣', label: 'Daily PR Creator', desc: 'สร้างสื่อ PR ทุกช่องทาง · ปฏิทินธันวาคม · 🚀 Launch 20/12', route: '/daily-pr', color: '#dc2626', hot: true },
  { icon: '💥', label: 'Ultra Promo Engine', desc: '10 โมดูล · Hook 3วิ · Psychology · KOL Brief · Funnel ครบจบ', route: '/ultra-promo', color: '#7c3aed', hot: true },
  { icon: '🚀', label: 'Sales Conversion Engine', desc: 'Hook · Psychology · Copy · Video · Funnel ครบทุกมิติ', route: '/promo-engine', color: '#f97316', hot: true },
  { icon: '🤖', label: 'AI Generator', desc: 'สร้างคอนเทนต์ด้วย AI', route: '/ai-generator', color: '#6366f1', hot: true },
  { icon: '🧠', label: 'AI Skills Hub', desc: 'Trend · Hashtag · SEO · Video · แปลภาษา · ปัญญาโบราณ · Supply Chain', route: '/skills', color: '#f97316', hot: true },
  { icon: '🔗', label: 'Supply Chain Tower', desc: 'สต๊อก · สั่งซื้อซ้ำ · ผู้ผลิต · พยากรณ์ดีมานด์ · ความเสี่ยง · S19 AI', route: '/supply-chain', color: '#0ea5e9', hot: true },
  { icon: '🦾', label: 'AI Agent', desc: 'ตั้งแล้วลืม · 24/7 Auto', route: '/agent', color: '#10b981', hot: true },
  { icon: '🔥', label: 'Trending Now', desc: 'Hashtag ยอดนิยมวันนี้', route: '/trending', color: '#fe2c55' },
  { icon: '📅', label: 'Content Calendar', desc: 'วางแผนโพสต์ 30 วัน', route: '/calendar', color: '#f59e0b' },
  { icon: '🧠', label: 'Brand Memory', desc: 'AI จำข้อมูลแบรนด์คุณ', route: '/brand', color: '#8b5cf6' },
  { icon: '🎙️', label: 'Voice Commander', desc: 'สั่งงาน AI ด้วยเสียง', route: '/voice', color: '#ef4444', hot: true },
  { icon: '🎬', label: 'Video Generator', desc: 'สร้างวีดีโอด้วย AI', route: '/video', color: '#8b5cf6', hot: true },
  { icon: '💳', label: 'Upgrade Plan',    desc: 'PromptPay · Subscription', route: '/payment', color: '#f59e0b' },
  { icon: '🏛️', label: 'Corporate HQ',   desc: 'บริษัทมหาชน · Board · IR · ESG', route: '/corporate', color: '#f59e0b', hot: true },
  { icon: '🎯', label: 'Command Center', desc: 'ติดตามงานทุกแผนก · KPI Live',    route: '/corporate/command', color: '#ef4444', hot: true },
  { icon: '📣', label: 'PR & Comms',    desc: 'Press Release · Media · KOL',   route: '/corporate/pr', color: '#06b6d4' },
  { icon: '🛠️', label: 'AI Tools Hub', desc: 'เครื่องมือ AI ทั้งหมด', route: '/ai-tools', color: '#06b6d4' },
  { icon: '▶️', label: 'TikTok Feed', desc: 'Feed สินค้า OTOP', route: '/tiktok', color: '#fe2c55' },
  { icon: '👥', label: 'Facebook Feed', desc: 'โพสต์ + Marketplace', route: '/facebook', color: '#1877f2' },
  { icon: '💰', label: 'Affiliate', desc: 'รับ commission 20–40%', route: '/affiliate', color: '#f59e0b' },
];

const ACTIVITY = [
  { icon: '✅', text: 'สร้างคอนเทนต์ TikTok "ผ้าไหมอุบล" สำเร็จ', time: '2 นาทีที่แล้ว', score: 9.2 },
  { icon: '🛒', text: 'ลูกค้าสั่งซื้อ "น้ำพริกป้าแดง" ผ่าน Affiliate link', time: '15 นาทีที่แล้ว', score: null },
  { icon: '⚡', text: 'AI Critic วิเคราะห์คอนเทนต์ 12 ชิ้น — เฉลี่ย 8.7/10', time: '1 ชั่วโมงที่แล้ว', score: 8.7 },
  { icon: '🌿', text: 'เพิ่มสินค้าใหม่ "เซรั่มข้าวไทย" เข้าฐานข้อมูล', time: '3 ชั่วโมงที่แล้ว', score: null },
  { icon: '🔗', text: 'เชื่อมต่อ TikTok Shop API สำเร็จ', time: 'เมื่อวาน', score: null },
];

const AI_SKILLS = [
  { name: 'S1 · RCCF Prompt',       desc: 'สร้าง Hook ที่ดึงดูดใจ',             pct: 95, color: '#6366f1' },
  { name: 'S2 · Taste Check',        desc: 'ตรวจสอบความถูกต้องของเนื้อหา',      pct: 88, color: '#8b5cf6' },
  { name: 'S3 · Master Prompt',      desc: 'Prompt Engineering ขั้นสูง',         pct: 92, color: '#10b981' },
  { name: 'S6 · AI Critic',          desc: 'ประเมินคุณภาพคอนเทนต์ 0-10',        pct: 97, color: '#f59e0b' },
  { name: 'S7 · Context Card',       desc: 'วิเคราะห์บริบทสินค้าไทย',            pct: 90, color: '#fe2c55' },
  { name: 'S9 · Learning Layer',     desc: 'เรียนรู้จากผลลัพธ์จริง · Pattern Memory', pct: 88, color: '#06b6d4', isNew: true },
  { name: 'S10 · Trend Analyzer',    desc: 'วิเคราะห์เทรนด์ TikTok ตามสินค้า',  pct: 88, color: '#f97316', isNew: true },
  { name: 'S11 · Hashtag Generator', desc: 'สร้าง Hashtag Set อัจฉริยะ',         pct: 91, color: '#ec4899', isNew: true },
  { name: 'S12 · SEO Thai',          desc: 'Keyword ภาษาไทย + Title formula',    pct: 85, color: '#84cc16', isNew: true },
  { name: 'S13 · Sentiment Scanner', desc: 'วิเคราะห์ความรู้สึกจากรีวิว',        pct: 82, color: '#a855f7', isNew: true },
  { name: 'S14 · Video Script',      desc: 'Script + Storyboard ครบทุกฉาก',      pct: 79, color: '#ef4444', isNew: true },
  { name: 'S15 · Multi-Language',    desc: 'แปล 5 ภาษา เจาะตลาด ASEAN',          pct: 86, color: '#14b8a6', isNew: true },
  { name: 'S16 · Prompt Builder',    desc: 'Zero-shot · Few-shot · CoT · ToT',    pct: 93, color: '#f59e0b', isNew: true },
  { name: 'S17 · Cultural Wisdom',   desc: 'ปรัชญาจีน 八德 · พระไตรปิฎก · ไทย',   pct: 88, color: '#b45309', isNew: true },
  { name: 'S18 · Sales Conv. Engine',desc: 'Hook · Psychology · Funnel ครบทุกมิติ', pct: 88, color: '#dc2626', isNew: true },
];

const PLATFORMS_STATUS = [
  { name: 'TikTok Shop', icon: '▶️', status: 'live', users: '1.2M' },
  { name: 'Shopee', icon: '🟠', status: 'live', users: '890K' },
  { name: 'Lazada', icon: '🔵', status: 'live', users: '650K' },
  { name: 'Facebook', icon: '👥', status: 'live', users: '2.1M' },
  { name: 'LINE Shopping', icon: '💚', status: 'beta', users: '340K' },
  { name: 'Instagram', icon: '📸', status: 'soon', users: '-' },
];

const DashboardPage = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [ticker, setTicker] = useState(24891);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(prev => prev + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const NAV = [
    { id: 'overview', icon: '🏠', label: 'ภาพรวม' },
    { id: 'ai', icon: '🤖', label: 'AI Tools', routes: ['/ai-generator', '/ai-tools'] },
    { id: 'social', icon: '📱', label: 'Social Feed' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'settings', icon: '⚙️', label: 'ตั้งค่า' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar pro-sidebar">
        <div className="sidebar-brand">
          <Logo size="sm" style={{ maxWidth: '160px' }} />
          <div className="pro-badge">PRO</div>
        </div>

        <div className="nav-links">
          {NAV.map(item => (
            <div
              key={item.id}
              className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </div>
          ))}

          <div className="nav-separator" />
          <div className="nav-section-label">AI Automation</div>
          <div className="nav-link" onClick={() => navigate('/agent')}>
            <span>🦾</span> AI Agent
            <span className="nav-badge-new" style={{ background: '#10b981' }}>24/7</span>
          </div>

          <div className="nav-separator" />
          <div className="nav-section-label">โซเชียลมีเดีย</div>
          <div className="nav-link" onClick={() => navigate('/tiktok')}>
            <span className="tiktok-nav-icon">▶</span> TikTok Feed
            <span className="nav-badge-new">LIVE</span>
          </div>
          <div className="nav-link" onClick={() => navigate('/facebook')}>
            <span style={{ color: '#1877f2', fontWeight: 900 }}>f</span> Facebook Feed
            <span className="nav-badge-new" style={{ background: '#1877f2' }}>LIVE</span>
          </div>
        </div>

        {/* AI Status Indicator */}
        <div className="ai-status-box">
          <div className="ai-status-dot" />
          <div>
            <div className="ai-status-label">Claude AI</div>
            <div className="ai-status-sub">ออนไลน์ · พร้อมใช้งาน</div>
          </div>
        </div>

        <button className="logout-btn" onClick={onLogout}>ออกจากระบบ</button>
      </aside>

      {/* Main Content */}
      <main className="main-content pro-main">

        {/* Top Bar */}
        <div className="pro-topbar">
          <div>
            <h2 className="pro-greeting">สวัสดีผู้จัดการ 👋</h2>
            <p className="pro-subgreeting">Openthai.ai Pro · วันนี้ระบบสร้างคอนเทนต์ไปแล้ว <strong style={{ color: '#a5b4fc' }}>{ticker.toLocaleString()}</strong> ชิ้น</p>
          </div>
          <button className="pro-cta-btn" onClick={() => navigate('/ai-generator')}>
            ⚡ สร้างคอนเทนต์ AI
          </button>
        </div>

        {/* Stats Row */}
        <div className="pro-stats-row">
          {STATS.map((s, i) => (
            <div key={i} className="pro-stat-card glass-panel" style={{ '--accent': s.color }}>
              <div className="pro-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
              <div className="pro-stat-value">{i === 0 ? ticker.toLocaleString() : s.value}</div>
              <div className="pro-stat-label">{s.label}</div>
              <div className="pro-stat-delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pro-section-title">⚡ Quick Actions</div>
        <div className="pro-quick-actions">
          {QUICK_ACTIONS.map((a, i) => (
            <div key={i} className="pro-action-card glass-panel" onClick={() => navigate(a.route)}
                 style={{ '--acolor': a.color }}>
              {a.hot && <span className="pro-hot-badge">HOT</span>}
              <div className="pro-action-icon" style={{ background: `${a.color}20`, color: a.color }}>{a.icon}</div>
              <div className="pro-action-label">{a.label}</div>
              <div className="pro-action-desc">{a.desc}</div>
            </div>
          ))}
        </div>

        <div className="pro-two-col">
          {/* Left: Activity + Platform Status */}
          <div>
            <div className="pro-section-title">🕐 กิจกรรมล่าสุด</div>
            <div className="pro-activity-list glass-panel">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="pro-activity-item">
                  <span className="pro-activity-icon">{a.icon}</span>
                  <span className="pro-activity-text">{a.text}</span>
                  <div className="pro-activity-right">
                    {a.score && <span className="pro-score-badge">{a.score}</span>}
                    <span className="pro-activity-time">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pro-section-title" style={{ marginTop: '24px' }}>🌐 สถานะแพลตฟอร์ม</div>
            <div className="pro-platforms-grid glass-panel">
              {PLATFORMS_STATUS.map((p, i) => (
                <div key={i} className="pro-platform-row">
                  <span className="pro-platform-icon">{p.icon}</span>
                  <span className="pro-platform-name">{p.name}</span>
                  <span className={`pro-platform-status status-${p.status}`}>
                    {p.status === 'live' ? '● Live' : p.status === 'beta' ? '◑ Beta' : '○ Soon'}
                  </span>
                  <span className="pro-platform-users">{p.users}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Skills */}
          <div>
            <div className="pro-section-title">🧠 16-Skills AI Framework</div>
            <div className="pro-skills-list glass-panel">
              <div className="pro-skills-header">
                ระบบ AI ของ Openthai.ai ประกอบด้วย 16 ทักษะ (S1–S16) พัฒนาเฉพาะสำหรับสินค้าไทยและตลาด ASEAN
              </div>
              {AI_SKILLS.map((s, i) => (
                <div key={i} className="pro-skill-row" style={{ cursor: s.isNew ? 'pointer' : 'default' }} onClick={() => s.isNew && navigate('/skills')}>
                  <div className="pro-skill-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="pro-skill-name">{s.name}</span>
                      {s.isNew && <span style={{ fontSize: 9, background: s.color, color: '#fff', borderRadius: 5, padding: '1px 5px', fontWeight: 700 }}>NEW</span>}
                    </div>
                    <span className="pro-skill-pct" style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                  <div className="pro-skill-desc">{s.desc}</div>
                  <div className="pro-skill-bar-bg">
                    <div className="pro-skill-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="pro-view-all-btn" onClick={() => navigate('/skills')}>
                  ✨ ใช้ Skills ใหม่ S10-S16 →
                </button>
                <button className="pro-view-all-btn" onClick={() => navigate('/ai-tools')} style={{ background: 'transparent' }}>
                  ดูเครื่องมือทั้งหมด →
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;
