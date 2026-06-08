import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

const TOOLS = [
  {
    id: 'generator',
    icon: '⚡',
    name: 'AI Content Generator',
    desc: 'สร้าง Hook · Script · Caption · Hashtag สำหรับทุกแพลตฟอร์ม ด้วย AI ในไม่กี่วินาที',
    tags: ['TikTok', 'Facebook', 'Instagram', 'ภาษาไทย'],
    color: '#6366f1',
    status: 'live',
    route: '/ai-generator',
    badge: 'HOT',
  },
  {
    id: 'critic',
    icon: '🎯',
    name: 'AI Critic',
    desc: 'วิเคราะห์และให้คะแนนคอนเทนต์ของคุณ 0–10 พร้อมคำแนะนำปรับปรุงแบบละเอียด',
    tags: ['วิเคราะห์', 'ปรับปรุง', 'คะแนน'],
    color: '#10b981',
    status: 'live',
    route: '/ai-generator',
    badge: null,
  },
  {
    id: 'hashtag',
    icon: '#️⃣',
    name: 'Smart Hashtag Finder',
    desc: 'ค้นหา Hashtag ที่กำลังเทรนด์สำหรับสินค้าไทยและ OTOP บน TikTok และ Instagram',
    tags: ['TikTok', 'Trending', 'OTOP'],
    color: '#f59e0b',
    status: 'live',
    route: '/ai-generator',
    badge: null,
  },
  {
    id: 'product',
    icon: '📦',
    name: 'Product Description AI',
    desc: 'เขียนคำอธิบายสินค้าสำหรับ Shopee, Lazada, TikTok Shop ได้ทันที ครบทุกรายละเอียด',
    tags: ['Shopee', 'Lazada', 'TikTok Shop'],
    color: '#fe2c55',
    status: 'beta',
    route: '/ai-generator',
    badge: 'BETA',
  },
  {
    id: 'translate',
    icon: '🌐',
    name: 'Thai–English AI Translator',
    desc: 'แปลคอนเทนต์ไทย–อังกฤษ สำหรับขยายตลาดต่างประเทศ 35 ประเทศ ในภาษาธรรมชาติ',
    tags: ['แปลภาษา', 'ส่งออก', 'Global'],
    color: '#06b6d4',
    status: 'beta',
    route: '/ai-generator',
    badge: 'BETA',
  },
  {
    id: 'affiliate',
    icon: '🔗',
    name: 'Affiliate Link Generator',
    desc: 'สร้าง Affiliate link อัตโนมัติสำหรับสินค้า OTOP พร้อม UTM tracking และ analytics',
    tags: ['Commission', 'TikTok', 'Shopee'],
    color: '#8b5cf6',
    status: 'soon',
    route: null,
    badge: 'SOON',
  },
  {
    id: 'scheduler',
    icon: '📅',
    name: 'Content Scheduler',
    desc: 'วางแผนและตั้งเวลาโพสต์คอนเทนต์อัตโนมัติข้ามแพลตฟอร์ม ในเวลาที่ engagement สูงสุด',
    tags: ['Auto-post', 'Analytics', 'Multi-platform'],
    color: '#ec4899',
    status: 'soon',
    route: null,
    badge: 'SOON',
  },
  {
    id: 'analytics',
    icon: '📊',
    name: 'AI Analytics Dashboard',
    desc: 'วิเคราะห์ performance คอนเทนต์, ยอดขาย, และ ROI จากทุกแพลตฟอร์มในหน้าเดียว',
    tags: ['Analytics', 'ROI', 'Dashboard'],
    color: '#64748b',
    status: 'soon',
    route: null,
    badge: 'SOON',
  },
];

const SKILLS_INFO = [
  { code: 'S1', name: 'RCCF Prompt', desc: 'Role · Context · Command · Format — โครงสร้าง prompt ที่ได้ผลลัพธ์ดีที่สุด', color: '#6366f1' },
  { code: 'S2', name: 'Taste Check', desc: 'ตรวจสอบความถูกต้องของเนื้อหา วัฒนธรรม และความเหมาะสมสำหรับตลาดไทย', color: '#10b981' },
  { code: 'S3', name: 'Master Prompt', desc: 'Prompt Engineering ขั้นสูงพัฒนาเฉพาะสำหรับสินค้าไทยและ OTOP', color: '#f59e0b' },
  { code: 'S5', name: 'Category System', desc: 'ระบบจัดหมวดหมู่สินค้าอัจฉริยะรองรับ 300+ ประเภทสินค้าไทย', color: '#fe2c55' },
  { code: 'S6', name: 'AI Critic', desc: 'ประเมินคุณภาพคอนเทนต์ 0–10 พร้อมคำแนะนำเฉพาะเจาะจง', color: '#8b5cf6' },
  { code: 'S7', name: 'Context Card', desc: 'วิเคราะห์บริบทสินค้า, กลุ่มเป้าหมาย, และ positioning ในตลาด', color: '#06b6d4' },
  { code: 'S8', name: 'Knowledge Base', desc: 'ฐานข้อมูลสินค้า OTOP 300+ รายการ, 5 Hook Types, 35 ประเทศ', color: '#ec4899' },
  { code: 'S9', name: 'Learning Layer', desc: 'ระบบเรียนรู้จากผลลัพธ์จริง ปรับปรุงคุณภาพคอนเทนต์ต่อเนื่อง', color: '#64748b' },
];

const PRICING = [
  {
    plan: 'Free',
    price: '฿0',
    period: '/เดือน',
    color: '#64748b',
    features: [
      '3 คอนเทนต์/วัน',
      'TikTok · Facebook',
      'สินค้า OTOP เท่านั้น',
      'Hashtag พื้นฐาน',
    ],
    cta: 'ใช้ฟรีเลย',
    active: false,
  },
  {
    plan: 'Pro',
    price: '฿149',
    period: '/เดือน',
    color: '#6366f1',
    features: [
      'ไม่จำกัดจำนวนคอนเทนต์',
      'ทุกแพลตฟอร์ม (241)',
      'ทุกหมวดหมู่สินค้า',
      'AI Critic Score',
      'Content Scheduler',
      'Priority Support',
    ],
    cta: '⚡ เริ่มใช้ Pro',
    active: true,
    badge: 'ยอดนิยม',
  },
  {
    plan: 'Business',
    price: '฿299',
    period: '/เดือน',
    color: '#f59e0b',
    features: [
      'ทุกฟีเจอร์ Pro',
      'API Access',
      'ทีม 5 คน',
      'AI Analytics',
      'White-label Export',
      'Dedicated Manager',
    ],
    cta: 'ติดต่อทีม',
    active: false,
  },
];

const AIToolsHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tools');
  const [filter, setFilter] = useState('all');

  const filteredTools = filter === 'all' ? TOOLS
    : filter === 'live' ? TOOLS.filter(t => t.status === 'live')
    : TOOLS.filter(t => t.status !== 'live');

  return (
    <div className="hub-app">
      {/* Header */}
      <header className="hub-header glass-panel">
        <button className="gen-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <Logo size="md" />
        <div className="hub-header-tabs">
          {['tools', 'skills', 'pricing'].map(tab => (
            <button key={tab} className={`hub-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'tools' ? '🛠️ เครื่องมือ AI' : tab === 'skills' ? '🧠 9-Skills Framework' : '💰 ราคา'}
            </button>
          ))}
        </div>
        <button className="gen-generate-btn" style={{ padding: '8px 20px', fontSize: '14px' }}
          onClick={() => navigate('/ai-generator')}>
          ⚡ เริ่มสร้างคอนเทนต์
        </button>
      </header>

      {/* ─── TAB: TOOLS ─── */}
      {activeTab === 'tools' && (
        <div className="hub-content">
          <div className="hub-hero">
            <h1 className="hub-hero-title">เครื่องมือ AI ระดับมืออาชีพ<br /><span style={{ color: '#a5b4fc' }}>สำหรับผู้ผลิตสินค้าไทยทุกคน</span></h1>
            <p className="hub-hero-sub">241 แพลตฟอร์ม · 35 ประเทศ · 9-Skills AI Framework · สร้างคอนเทนต์ที่ขายได้จริง</p>
            <div className="hub-filter-row">
              {['all', 'live', 'soon'].map(f => (
                <button key={f} className={`hub-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}>
                  {f === 'all' ? 'ทั้งหมด' : f === 'live' ? '✅ พร้อมใช้' : '🔜 เร็วๆ นี้'}
                </button>
              ))}
            </div>
          </div>

          <div className="hub-tools-grid">
            {filteredTools.map(tool => (
              <div key={tool.id}
                className={`hub-tool-card glass-panel ${tool.status === 'soon' ? 'hub-card-soon' : ''}`}
                style={{ '--tc': tool.color }}
                onClick={() => tool.route && navigate(tool.route)}>
                {tool.badge && (
                  <span className="hub-tool-badge"
                    style={{ background: tool.status === 'live' ? tool.color : tool.status === 'beta' ? '#f59e0b' : '#64748b' }}>
                    {tool.badge}
                  </span>
                )}
                <div className="hub-tool-icon" style={{ background: `${tool.color}20`, color: tool.color }}>
                  {tool.icon}
                </div>
                <h3 className="hub-tool-name">{tool.name}</h3>
                <p className="hub-tool-desc">{tool.desc}</p>
                <div className="hub-tool-tags">
                  {tool.tags.map((t, i) => <span key={i} className="hub-tool-tag">{t}</span>)}
                </div>
                <div className="hub-tool-footer">
                  <span className={`hub-tool-status status-${tool.status}`}>
                    {tool.status === 'live' ? '● พร้อมใช้' : tool.status === 'beta' ? '◑ Beta' : '○ เร็วๆ นี้'}
                  </span>
                  {tool.route && <span className="hub-tool-arrow">→</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: SKILLS ─── */}
      {activeTab === 'skills' && (
        <div className="hub-content">
          <div className="hub-hero">
            <h1 className="hub-hero-title">9-Skills AI Framework<br /><span style={{ color: '#a5b4fc' }}>พัฒนาเฉพาะสำหรับสินค้าไทย</span></h1>
            <p className="hub-hero-sub">ระบบ AI ของ OpenThaiAi ถูกออกแบบมาเพื่อเข้าใจสินค้า วัฒนธรรม และตลาดไทยอย่างลึกซึ้ง</p>
          </div>
          <div className="hub-skills-grid">
            {SKILLS_INFO.map((s, i) => (
              <div key={i} className="hub-skill-card glass-panel" style={{ '--sc': s.color }}>
                <div className="hub-skill-code" style={{ color: s.color }}>{s.code}</div>
                <h3 className="hub-skill-name" style={{ color: s.color }}>{s.name}</h3>
                <p className="hub-skill-desc">{s.desc}</p>
                <div className="hub-skill-bar-bg">
                  <div className="hub-skill-bar" style={{ background: s.color, width: `${75 + i * 3}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="hub-framework-note glass-panel">
            <h3>🧠 ทำไม 9-Skills Framework ถึงแตกต่าง?</h3>
            <div className="hub-notes-grid">
              {[
                { icon: '🇹🇭', title: 'Thai-First AI', desc: 'เข้าใจภาษา วัฒนธรรม และพฤติกรรมผู้บริโภคไทยอย่างแท้จริง' },
                { icon: '📊', title: 'Data-Driven', desc: 'เรียนรู้จากคอนเทนต์ที่ขายดีจริง 300+ สินค้า OTOP' },
                { icon: '🔄', title: 'Self-Improving', desc: 'S9 Learning Layer ปรับปรุงคุณภาพทุกครั้งที่ใช้งาน' },
                { icon: '🌏', title: 'Multi-Market', desc: 'รองรับ 35 ประเทศ ปรับ messaging ตามวัฒนธรรมท้องถิ่น' },
              ].map((n, i) => (
                <div key={i} className="hub-note-item glass-panel">
                  <span className="hub-note-icon">{n.icon}</span>
                  <strong>{n.title}</strong>
                  <p>{n.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: PRICING ─── */}
      {activeTab === 'pricing' && (
        <div className="hub-content">
          <div className="hub-hero">
            <h1 className="hub-hero-title">ราคาที่คุ้มค่า<br /><span style={{ color: '#a5b4fc' }}>สำหรับทุกขนาดธุรกิจ</span></h1>
            <p className="hub-hero-sub">ไม่มีค่าธรรมเนียมแอบแฝง · ยกเลิกได้ทุกเมื่อ · ชำระผ่าน PromptPay หรือบัตรเครดิต</p>
          </div>
          <div className="hub-pricing-row">
            {PRICING.map((plan, i) => (
              <div key={i} className={`hub-price-card glass-panel ${plan.active ? 'hub-price-active' : ''}`}
                style={{ '--pc': plan.color }}>
                {plan.badge && <span className="hub-price-badge" style={{ background: plan.color }}>{plan.badge}</span>}
                <div className="hub-price-plan">{plan.plan}</div>
                <div className="hub-price-amount">
                  <span style={{ color: plan.color }}>{plan.price}</span>
                  <span className="hub-price-period">{plan.period}</span>
                </div>
                <ul className="hub-price-features">
                  {plan.features.map((f, j) => (
                    <li key={j}><span style={{ color: plan.color }}>✓</span> {f}</li>
                  ))}
                </ul>
                <button className="hub-price-btn" style={{
                  background: plan.active ? plan.color : 'transparent',
                  border: `2px solid ${plan.color}`,
                  color: plan.active ? '#fff' : plan.color,
                }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="hub-guarantee glass-panel">
            🛡️ <strong>รับประกัน 30 วัน</strong> — ถ้าไม่พอใจ คืนเงินเต็มจำนวน ไม่มีเงื่อนไข
          </div>
        </div>
      )}
    </div>
  );
};

export default AIToolsHub;
