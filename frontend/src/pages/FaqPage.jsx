import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FAQ_ITEMS } from '../data/faqContent';

// Public, indexable general FAQ — the broad "how does this work / is my data safe / how do I get
// paid" questions that /pricing and /affiliate (which have their own topic-specific FAQs) don't cover.
// Every answer is grounded in what the platform ACTUALLY does (consent-first funnels, no scraping,
// PromptPay+card THB via Omise, PDPA access/erasure/unsubscribe, order tracking by id+contact,
// dispute/escrow that hears both sides before an admin decides, 35 AI skills in 3 languages) — no
// invented features. Emits FAQPage JSON-LD (same client-side pattern as /pricing + /affiliate) AND
// the prerendered /faq/index.html carries the same schema statically (scripts/route-meta.mjs), so
// non-JS crawlers see it too; accordions follow the site's keyboard/SR-operable pattern.
//
// The Q&A pairs live in ../data/faqContent.js — the SINGLE source the prerender's FAQPage JSON-LD is
// also built from, so the visible FAQ and the structured data can't drift (Google drops the rich
// result if they disagree). faqContent.test.js pins them together.

const UI = {
  th: { title: 'คำถามที่พบบ่อย', sub: 'ทุกอย่างที่อยากรู้เกี่ยวกับ OpenThaiAi — ตรงไปตรงมา', ctaHead: 'พร้อมเริ่มไหม?', cta: 'เลือกประตูของคุณ', privacy: 'อ่านนโยบายความเป็นส่วนตัว' },
  en: { title: 'Frequently asked questions', sub: 'Everything you want to know about OpenThaiAi — straight answers', ctaHead: 'Ready to start?', cta: 'Pick your portal', privacy: 'Read the privacy policy' },
  zh: { title: '常见问题', sub: '关于 OpenThaiAi 你想知道的一切——坦诚作答', ctaHead: '准备好了吗？', cta: '选择你的入口', privacy: '阅读隐私政策' },
};
const T = {
  th: { ...UI.th, faqs: FAQ_ITEMS.th },
  en: { ...UI.en, faqs: FAQ_ITEMS.en },
  zh: { ...UI.zh, faqs: FAQ_ITEMS.zh },
};

const card = { background: '#111', border: '1px solid #6366f133', borderRadius: 12 };

export default function FaqPage() {
  const [lang, setLang] = useState('th');
  const [open, setOpen] = useState(0);
  const t = T[lang];

  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  // FAQPage JSON-LD derived from the SAME visible Q&A (same client-side pattern as /pricing +
  // /affiliate) — Google renders the SPA and reads it, making /faq eligible for FAQ rich results.
  const faqLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faqs.map(([q, a]) => ({ '@type': 'Question', name: String(q), acceptedAnswer: { '@type': 'Answer', text: String(a) } })),
  }).replace(/</g, '\\u003c');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', gap: 8 }}>
        {['th', 'en', 'zh'].map((l) => (
          <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang === l} style={{ background: lang === l ? '#5e61f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{l === 'th' ? 'ไทย' : l === 'en' ? 'English' : '中文'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>❓</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#818cf8', margin: '0 0 12px' }}>{t.title}</h1>
          <p style={{ color: '#aaa', fontSize: 16, lineHeight: 1.6 }}>{t.sub}</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {t.faqs.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={card}>
                <div
                  role="button" tabIndex={0} aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? -1 : i); } }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', cursor: 'pointer', outline: 'none' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{q}</span>
                  <span style={{ color: '#818cf8', fontSize: 18, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <div style={{ padding: '0 18px 16px', color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>{a}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ ...card, borderColor: '#6366f155', marginTop: 36, textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{t.ctaHead}</div>
          <Link to="/portals" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginRight: 10 }}>{t.cta}</Link>
          <Link to="/privacy" style={{ display: 'inline-block', color: '#a5b4fc', padding: '12px', fontSize: 14, textDecoration: 'none' }}>{t.privacy} →</Link>
        </div>
      </div>
    </div>
  );
}
