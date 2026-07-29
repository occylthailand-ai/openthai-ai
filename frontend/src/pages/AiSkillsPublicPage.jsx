import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// Public, indexable showcase of the platform's AI skills — the "35 AI tools" headline finally has a
// page a prospective user (or Google) can actually see WITHOUT signing in. The real skill catalog
// (/skills, /skills-catalog) is auth-gated and internal (it exposes endpoints/methods and links into
// the dashboard); this page is marketing/SEO only: live count + names grouped by category, in th/en/zh,
// with a CTA into the funnel. It reads the public GET /api/skills — no execution here (that stays
// behind login). Deterministic content; nothing scraped, no data collected.

// Category → { icon, label:{th,en,zh} }. Keys mirror the backend skill categories; unknown keys fall back.
const CAT = {
  content:     { icon: '✍️', th: 'คอนเทนต์', en: 'Content', zh: '内容' },
  quality:     { icon: '✅', th: 'คุณภาพ', en: 'Quality', zh: '质量' },
  prompt:      { icon: '⚡', th: 'Prompt', en: 'Prompt', zh: '提示词' },
  vision:      { icon: '👁️', th: 'วิเคราะห์ภาพ', en: 'Image analysis', zh: '图像分析' },
  voice:       { icon: '🎙️', th: 'เสียง', en: 'Voice', zh: '语音' },
  evaluation:  { icon: '🧐', th: 'ประเมินผล', en: 'Evaluation', zh: '评估' },
  context:     { icon: '🗂️', th: 'บริบท', en: 'Context', zh: '上下文' },
  integration: { icon: '🔌', th: 'เชื่อมต่อ', en: 'Integration', zh: '集成' },
  learning:    { icon: '🧬', th: 'เรียนรู้', en: 'Learning', zh: '学习' },
  trend:       { icon: '🔥', th: 'เทรนด์', en: 'Trends', zh: '趋势' },
  hashtag:     { icon: '#️⃣', th: 'Hashtag', en: 'Hashtags', zh: '标签' },
  seo:         { icon: '📈', th: 'SEO', en: 'SEO', zh: 'SEO' },
  sentiment:   { icon: '💭', th: 'Sentiment', en: 'Sentiment', zh: '情感分析' },
  video:       { icon: '🎬', th: 'วิดีโอ', en: 'Video', zh: '视频' },
  translate:   { icon: '🌐', th: 'แปลภาษา', en: 'Translation', zh: '翻译' },
  wisdom:      { icon: '☯️', th: 'ปัญญา', en: 'Wisdom', zh: '智慧' },
  sales:       { icon: '🚀', th: 'ปิดการขาย', en: 'Closing sales', zh: '成交' },
  operations:  { icon: '🔗', th: 'ปฏิบัติการ', en: 'Operations', zh: '运营' },
  pricing:     { icon: '💰', th: 'ตั้งราคา', en: 'Pricing', zh: '定价' },
  support:     { icon: '💬', th: 'บริการลูกค้า', en: 'Customer support', zh: '客服' },
  ads:         { icon: '📣', th: 'โฆษณา', en: 'Ads', zh: '广告' },
  finance:     { icon: '⚖️', th: 'การเงิน', en: 'Finance', zh: '财务' },
  planning:    { icon: '📆', th: 'วางแผนแคมเปญ', en: 'Campaign planning', zh: '活动策划' },
  live:        { icon: '🔴', th: 'ไลฟ์ขายของ', en: 'Live selling', zh: '直播带货' },
  solver:      { icon: '🧩', th: 'แก้ปัญหารอบด้าน', en: 'All-round solver', zh: '综合解决' },
  negotiation: { icon: '🤝', th: 'เจรจาต่อรอง', en: 'Negotiation', zh: '谈判' },
  mediation:   { icon: '🕊️', th: 'ไกล่เกลี่ย', en: 'Mediation', zh: '调解' },
  crisis:      { icon: '🚨', th: 'จัดการวิกฤต', en: 'Crisis management', zh: '危机管理' },
  research:    { icon: '🎭', th: 'วิจัย/Persona', en: 'Research / Persona', zh: '研究/画像' },
  commerce:    { icon: '🛒', th: 'หน้าสินค้า', en: 'Product pages', zh: '商品页' },
  reputation:  { icon: '⭐', th: 'ตอบรีวิว', en: 'Review replies', zh: '评价回复' },
  retention:   { icon: '📣', th: 'รักษาฐานลูกค้า', en: 'Retention', zh: '客户留存' },
};
const catMeta = (c, lang) => { const m = CAT[c] || { icon: '✨' }; return { icon: m.icon, label: m[lang] || m.th || c }; };

const T = {
  th: {
    title: 'เครื่องมือ AI เพื่อการค้า',
    sub: (n) => `${n} ทักษะ AI ไทยแท้ ครบทั้งคอนเทนต์ การขาย SEO บริการลูกค้า และอีกมาก — ใช้ได้ 3 ภาษา (ไทย/อังกฤษ/จีน)`,
    ready: 'พร้อมใช้',
    search: '🔍 ค้นหาเครื่องมือ เช่น ราคา, ลูกค้า, SEO...',
    none: 'ไม่พบเครื่องมือที่ตรงกับคำค้น',
    ctaHead: 'พร้อมลองใช้จริงไหม?',
    ctaText: 'สมัครฟรี เลือกประตูของคุณ แล้วเริ่มใช้เครื่องมือเหล่านี้กับสินค้าจริงของคุณได้เลย',
    cta: 'เริ่มเลย — เลือกประตูของคุณ',
    pricing: 'ดูแพ็กเกจ',
    offline: 'ตอนนี้ยังโหลดรายการสดไม่ได้ ลองรีเฟรชอีกครั้ง',
  },
  en: {
    title: 'AI tools for commerce',
    sub: (n) => `${n} genuine Thai-AI skills — content, sales, SEO, customer support and much more, in 3 languages (Thai/English/Chinese)`,
    ready: 'ready',
    search: '🔍 Search tools, e.g. pricing, customer, SEO...',
    none: 'No tools match your search',
    ctaHead: 'Ready to try it for real?',
    ctaText: 'Sign up free, pick your portal, and start using these tools on your own products.',
    cta: 'Get started — pick your portal',
    pricing: 'See pricing',
    offline: 'The live list is unavailable right now — try refreshing.',
  },
  zh: {
    title: '商用 AI 工具',
    sub: (n) => `${n} 款地道泰式 AI 技能——内容、销售、SEO、客服等，支持三语（泰/英/中）`,
    ready: '可用',
    search: '🔍 搜索工具，如 定价、客户、SEO...',
    none: '未找到匹配的工具',
    ctaHead: '准备好实际试用了吗？',
    ctaText: '免费注册，选择你的入口，即可在自己的商品上使用这些工具。',
    cta: '开始 — 选择你的入口',
    pricing: '查看套餐',
    offline: '当前无法加载实时列表，请刷新重试。',
  },
};

const card = { background: '#111', border: '1px solid #6366f133', borderRadius: 12, padding: '12px 14px' };

export default function AiSkillsPublicPage() {
  const [lang, setLang] = useState('th');
  const [reg, setReg] = useState(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const t = T[lang];

  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/skills'));
        const d = await res.json();
        if (!alive) return;
        if (d && d.success && Array.isArray(d.skills)) setReg(d); else setFailed(true);
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, []);

  const skills = (reg?.skills || []).filter((s) =>
    !q.trim() || `${s.name} ${s.id} ${s.category}`.toLowerCase().includes(q.toLowerCase()));
  const grouped = skills.reduce((acc, s) => { (acc[s.category] = acc[s.category] || []).push(s); return acc; }, {});
  const total = reg?.total || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', gap: 8 }}>
        {['th', 'en', 'zh'].map((l) => (
          <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang === l} style={{ background: lang === l ? '#5e61f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{l === 'th' ? 'ไทย' : l === 'en' ? 'English' : '中文'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🧠</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#818cf8', margin: '0 0 12px' }}>{t.title}</h1>
          <p style={{ color: '#aaa', fontSize: 16, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>{t.sub(total || '35')}</p>
          {reg && <div style={{ marginTop: 14, display: 'inline-block', color: '#a5b4fc', background: '#6366f122', borderRadius: 999, padding: '5px 16px', fontSize: 13, fontWeight: 700 }}>{reg.active}/{reg.total} {t.ready}</div>}
        </div>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search}
          style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: 10, padding: '12px 16px', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 24 }} />

        {failed && !reg && <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.offline}</p>}

        {reg && Object.entries(grouped).map(([cat, list]) => {
          const m = catMeta(cat, lang);
          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#818cf8' }}>{m.label}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>({list.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {list.map((s) => (
                  <div key={s.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{s.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', background: '#6366f122', borderRadius: 6, padding: '2px 7px' }}>{s.id}</span>
                    </div>
                    <div style={{ fontSize: 11, color: s.status === 'active' ? '#10b981' : '#f59e0b', marginTop: 6, fontWeight: 600 }}>{s.status === 'active' ? '✅' : '⚙️'}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {reg && skills.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.none} "{q}"</p>}

        <div style={{ ...card, borderColor: '#6366f155', marginTop: 36, textAlign: 'center', padding: '22px 20px' }}>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t.ctaHead}</div>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 auto 16px', maxWidth: 520, lineHeight: 1.6 }}>{t.ctaText}</p>
          <Link to="/portals" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginRight: 10 }}>{t.cta}</Link>
          <Link to="/pricing" style={{ display: 'inline-block', color: '#a5b4fc', padding: '12px', fontSize: 14, textDecoration: 'none' }}>{t.pricing} →</Link>
        </div>
      </div>
    </div>
  );
}
