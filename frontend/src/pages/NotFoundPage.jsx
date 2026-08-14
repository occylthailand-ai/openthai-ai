import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';

// Trilingual so a mistyped URL / broken inbound link recovers a visitor in THEIR language, not just
// Thai — the rest of the site is th/en/zh, and this recovery page is the same funnel entry as any other.
const T = {
  th: {
    doc: '404 — หน้าไม่พบ | Openthai.ai',
    title: 'หน้านี้ไม่มีอยู่',
    desc1: 'ขออภัย ไม่พบหน้าที่คุณต้องการ',
    desc2: 'อาจถูกย้ายหรือ URL ไม่ถูกต้อง',
    home: '🏠 กลับหน้าหลัก',
    tools: '⚡ ดูเครื่องมือ AI',
  },
  en: {
    doc: '404 — Page not found | Openthai.ai',
    title: "This page doesn't exist",
    desc1: "Sorry, we couldn't find the page you're looking for.",
    desc2: 'It may have moved, or the URL is incorrect.',
    home: '🏠 Back to home',
    tools: '⚡ Explore AI tools',
  },
  zh: {
    doc: '404 — 页面未找到 | Openthai.ai',
    title: '页面不存在',
    desc1: '抱歉，找不到你要访问的页面。',
    desc2: '它可能已被移动，或网址有误。',
    home: '🏠 返回首页',
    tools: '⚡ 探索 AI 工具',
  },
};

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = T[lang] || T.th;

  useEffect(() => { document.title = t.doc; }, [t.doc]);

  useEffect(() => {
    // Soft-404 guard: this SPA is served from Vercel, so EVERY unknown URL returns
    // HTTP 200 with index.html — whose <meta name="robots" content="index, follow">
    // (index.html:12) tells Google every junk/mistyped/spam-crawled URL is indexable.
    // Googlebot renders JS, lands here, and can index the 404 as a real (thin,
    // duplicate) page — polluting the index and wasting crawl budget. Flip robots to
    // noindex while this page is mounted, and restore the original on unmount so
    // navigating to a real route re-enables indexing (SPA navigation doesn't reload
    // index.html, so we must put it back ourselves).
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    const prev = meta ? meta.getAttribute('content') : null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, follow');
    return () => {
      if (created) { meta.remove(); }
      else { meta.setAttribute('content', prev); }
    };
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#080812', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: "'Inter','Sarabun',sans-serif", color: '#f8fafc' }}>
      <div>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🤖</div>
        <div style={{ fontSize: 'clamp(60px,12vw,120px)', fontWeight: 900, background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '16px 0 8px' }}>{t.title}</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>
          {t.desc1}<br />
          {t.desc2}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {t.home}
          </button>
          <button onClick={() => navigate('/ai-skills')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '12px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
            {t.tools}
          </button>
        </div>
      </div>
    </div>
  );
}
