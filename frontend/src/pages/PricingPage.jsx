import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

// ข้อมูลโครงสร้างที่ไม่ขึ้นกับภาษา (ราคา/สี) — ข้อความแปลดึงจาก i18n ผ่าน t('pp.plans')
const PP_META = [
  { id: 'free', thb: 0, usd: 0, color: '#10b981' },
  { id: 'pro', thb: 299, usd: 8, color: '#6366f1', hot: true },
  { id: 'premier', thb: 599, usd: 16, color: '#f59e0b' },
  { id: 'enterprise', thb: 1299, usd: 35, color: '#0ea5e9' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [selected, setSelected] = useState('pro');
  const [openFaq, setOpenFaq] = useState(null);
  // ให้ตรงกับ title ภาษาไทยที่ prerender-meta.mjs ให้ crawler เห็น (pp.hero.title) — เดิมเป็น
  // 'Openthai.ai — Pricing' ภาษาอังกฤษ ทำให้แท็บกระพริบจากไทยเป็นอังกฤษหลัง SPA boot
  // และผิด convention หน้าอื่นทั้งเว็บที่ใช้ '<ชื่อหน้าไทย> — Openthai.ai'
  useEffect(() => { document.title = 'เลือกแพ็กเกจที่ใช่สำหรับคุณ — Openthai.ai'; }, []);

  const plans = t('pp.plans');
  const faq = t('pp.faq');

  // FAQPage structured data — derived from the SAME `faq` array rendered below, so it
  // can never drift from the visible Q&A. Google renders this SPA's JS and reads JSON-LD
  // from the DOM, making /pricing eligible for FAQ rich results in search. FAQ rich
  // results are a Google-only feature (social crawlers ignore FAQPage), and Google runs
  // JS, so client-side injection here is sufficient — no prerender/duplicate-copy needed.
  const faqPairs = Array.isArray(faq) ? faq.filter((x) => Array.isArray(x) && x.length >= 2) : [];
  const faqLd = faqPairs.length
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqPairs.map(([q, a]) => ({
          '@type': 'Question',
          name: String(q),
          acceptedAnswer: { '@type': 'Answer', text: String(a) },
        })),
      }).replace(/</g, '\\u003c')
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('pp.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/affiliate')} style={navBtn}>{t('nav.affiliate')}</button>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '56px 5% 40px' }}>
        <div style={badge}>{t('pp.hero.badge')}</div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, margin: '12px 0 10px' }}>{t('pp.hero.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>{t('pp.hero.sub')}</p>
      </section>

      {/* PLANS */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
          {PP_META.map((m) => {
            const p = plans[m.id];
            return (
            <div key={m.id}
              onClick={() => setSelected(m.id)}
              style={{ ...card, cursor: 'pointer', border: `1.5px solid ${selected === m.id ? m.color + '66' : 'rgba(255,255,255,0.08)'}`, background: selected === m.id ? m.color + '0e' : 'rgba(255,255,255,0.03)', transition: 'all .2s', position: 'relative' }}>
              {m.hot && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${m.color},#fe2c55)`, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('pricing.recommended')}</div>}
              <div style={{ fontWeight: 900, fontSize: 20, color: m.color, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: selected === m.id ? m.color : '#f8fafc' }}>฿{m.thb}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{p.unit}</span>
                {m.usd > 0 && <span style={{ fontSize: 11, color: '#7c8797', marginLeft: 4 }}>≈ ${m.usd} USD</span>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.features.map((f) => (
                  <li key={f.t} style={{ fontSize: 13, color: f.ok ? '#cbd5e1' : '#748293', display: 'flex', gap: 8 }}>
                    <span style={{ color: f.ok ? m.color : '#748293' }}>{f.ok ? '✓' : '✗'}</span>{f.t}
                  </li>
                ))}
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); if (m.id === 'free') { navigate('/ai-generator'); } else { navigate(`/payment?plan=${m.id}`); } }}
                style={{ width: '100%', padding: '13px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', background: m.id === 'free' ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg,${m.color},#fe2c55)`, color: '#fff' }}>
                {p.cta}
              </button>
            </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 5% 80px' }}>
        {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />}
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, marginBottom: 24 }}>{t('pp.faq.title')}</h2>
        {faq.map(([q, a], i) => {
          // role/tabIndex/aria-expanded + Enter/Space handler make this FAQ
          // disclosure keyboard- and screen-reader-operable (WCAG 2.1.1 Keyboard,
          // 4.1.2 Role/State); it was a bare <div onClick> (mouse-only).
          const toggle = () => setOpenFaq(openFaq === i ? null : i);
          return (
            <div key={i} role="button" tabIndex={0} aria-expanded={openFaq === i}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              style={{ ...card, marginBottom: 10, cursor: 'pointer', padding: '14px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                {q} <span style={{ color: '#6366f1' }} aria-hidden="true">{openFaq === i ? '▲' : '▼'}</span>
              </div>
              {openFaq === i && <div style={{ marginTop: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{a}</div>}
            </div>
          );
        })}
      </section>

      {/* AFFILIATE BANNER */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ ...card, background: 'linear-gradient(135deg,rgba(254,44,85,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{t('pp.aff.title')}</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>{t('pp.aff.desc')}</p>
          <button onClick={() => navigate('/affiliate')} style={{ ...primaryBtn }}>{t('pp.aff.cta')}</button>
        </div>
      </section>

      {/* FOOTER LEGAL */}
      <footer style={{ textAlign: 'center', padding: '0 5% 40px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
        <p style={{ color: '#748293', fontSize: 12, margin: '0 0 8px' }}>{t('footer.copyright')}</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#7c8797', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>{t('footer.link.privacy')}</button>
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#7c8797', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>{t('footer.link.terms')}</button>
          <button onClick={() => navigate('/affiliate')} style={{ background: 'none', border: 'none', color: '#7c8797', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>{t('footer.link.affiliate')}</button>
        </div>
      </footer>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 8 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
