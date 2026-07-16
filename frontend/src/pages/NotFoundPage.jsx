import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = '404 — หน้าไม่พบ | Openthai.ai';
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
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '16px 0 8px' }}>หน้านี้ไม่มีอยู่</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>
          ขออภัย ไม่พบหน้าที่คุณต้องการ<br />
          อาจถูกย้ายหรือ URL ไม่ถูกต้อง
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            🏠 กลับหน้าหลัก
          </button>
          <button onClick={() => navigate('/ai-generator')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '12px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
            ⚡ ลอง AI Generator
          </button>
        </div>
      </div>
    </div>
  );
}
