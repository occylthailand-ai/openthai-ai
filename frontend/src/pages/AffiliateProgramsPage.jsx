import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES, PROGRAMS } from '../data/affiliatePrograms';
import { useLang } from '../i18n';

// ── ศูนย์รวมโปรแกรม Affiliate ──────────────────────────────────────────────────
// directory โปรแกรมพันธมิตรทั้งหมด — ค้นหา/กรองหมวด → สมัครได้ทันที
// ปักหมุดลิงก์ /pay ของเรา (เข้าพร้อมเพย์ตรง) ไว้บนสุด
//
// Trilingual (th/en/zh via useLang) — /affiliate-programs is a public, shareable funnel
// (reads ?ref=CODE) reachable from /earn, so an affiliate sharing it, or a non-Thai visitor,
// gets it in their language. Program/category label+note come from the trilingual data file;
// the page's own chrome comes from the local T dict. No in-page switcher (follows the global lang).

const TIKTOK_URL = 'https://vt.tiktok.com/ZSCB66nhQ/';

const T = {
  th: {
    doc: 'ศูนย์รวมโปรแกรม Affiliate — Openthai.ai',
    back: '← ศูนย์รายได้',
    title: '🔗 ศูนย์รวมโปรแกรม Affiliate',
    pinnedKicker: '⭐ จ่ายเข้าพร้อมเพย์ตรง (ของเรา)',
    pinnedTitle: 'แพ็กเกจคอนเทนต์ AI ฿1,000 — คอม 20%',
    pinnedDesc: 'โปรแกรมเดียวในนี้ที่จ่ายเข้าพร้อมเพย์ทันทีอัตโนมัติ · ที่เหลือเป็นโปรแกรมต่างชาติ (จ่ายผ่านธนาคาร/PayPal)',
    pinnedBuy: '📱 ขาย/สั่งซื้อ ฿1,000',
    pinnedJoin: 'สมัครพันธมิตรเรา',
    pinnedClip: '🎬 คลิป TikTok',
    payItemLabel: 'แพ็กเกจคอนเทนต์ AI 30 ชิ้น',
    searchPh: '🔍 ค้นหาโปรแกรม เช่น Amazon, email, hosting…',
    all: 'ทั้งหมด',
    apply: 'สมัคร →',
    noResults: 'ไม่พบโปรแกรมที่ค้นหา',
    discA: '⚠️ ตรงไปตรงมา: นี่คือ ',
    discStrong: 'directory ให้สมัครง่าย',
    discB: ' — รายได้จริงเกิดเมื่อคุณสมัครแล้วเอาลิงก์ไปแชร์ให้คนซื้อ ระบบนี้ไม่ได้การันตี ฿1,000/วัน และโปรแกรมต่างชาติจ่ายผ่านธนาคาร/PayPal (เฉพาะลิงก์ /pay ของเราที่เข้าพร้อมเพย์)',
  },
  en: {
    doc: 'Affiliate Programs Directory — Openthai.ai',
    back: '← Earning Hub',
    title: '🔗 Affiliate Programs Directory',
    pinnedKicker: '⭐ Paid straight to PromptPay (ours)',
    pinnedTitle: 'AI content pack ฿1,000 — 20% commission',
    pinnedDesc: 'The only program here that pays into PromptPay instantly and automatically · the rest are foreign programs (paid via bank / PayPal)',
    pinnedBuy: '📱 Sell / order ฿1,000',
    pinnedJoin: 'Join our affiliate program',
    pinnedClip: '🎬 TikTok clip',
    payItemLabel: 'AI content pack — 30 pieces',
    searchPh: '🔍 Search programs, e.g. Amazon, email, hosting…',
    all: 'All',
    apply: 'Apply →',
    noResults: 'No programs match your search',
    discA: '⚠️ Straight talk: this is a ',
    discStrong: 'directory to make signing up easy',
    discB: ' — real income comes only once you sign up and share your link with buyers. This does not guarantee ฿1,000/day, and foreign programs pay via bank / PayPal (only our /pay link goes to PromptPay).',
  },
  zh: {
    doc: '联盟计划目录 — Openthai.ai',
    back: '← 赚钱中心',
    title: '🔗 联盟计划目录',
    pinnedKicker: '⭐ 直接付入 PromptPay（我们的）',
    pinnedTitle: 'AI 内容套餐 ฿1,000 —— 20% 佣金',
    pinnedDesc: '这里唯一即时自动付入 PromptPay 的计划 · 其余为境外计划（通过银行 / PayPal 付款）',
    pinnedBuy: '📱 销售 / 下单 ฿1,000',
    pinnedJoin: '加入我们的合伙计划',
    pinnedClip: '🎬 TikTok 短片',
    payItemLabel: 'AI 内容套餐 —— 30 条',
    searchPh: '🔍 搜索计划，例如 Amazon、email、hosting…',
    all: '全部',
    apply: '申请 →',
    noResults: '未找到匹配的计划',
    discA: '⚠️ 实话实说：这是一个 ',
    discStrong: '方便你注册的目录',
    discB: ' —— 真实收入只有在你注册并把链接分享给买家后才会产生。本系统不保证 ฿1,000/天，境外计划通过银行 / PayPal 付款（只有我们的 /pay 链接付入 PromptPay）。',
  },
};

export default function AffiliateProgramsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = T[lang] || T.th;
  const L = (obj) => (obj && (obj[lang] || obj.th)) || '';
  useEffect(() => { document.title = t.doc; }, [t.doc]);
  const [searchParams] = useSearchParams();
  const ref = (searchParams.get('ref') || '').replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return PROGRAMS.filter(p =>
      (cat === 'all' || p.cat === cat) &&
      // search across the name + all-language notes so a keyword matches regardless of UI language
      (!kw || [p.name, p.note.th, p.note.en, p.note.zh].join(' ').toLowerCase().includes(kw))
    );
  }, [q, cat]);

  const payLink = `/pay?amount=1000&label=${encodeURIComponent(t.payItemLabel)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const chip = (active) => ({ padding: '8px 14px', borderRadius: '20px', border: `1px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.15)'}`, background: active ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' });

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/earn')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>{t.back}</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{t.title}</h1>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

        {/* PINNED — ลิงก์พร้อมเพย์ของเรา */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.5px' }}>{t.pinnedKicker}</div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 4px' }}>{t.pinnedTitle}</div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>{t.pinnedDesc}</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(payLink)} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{t.pinnedBuy}</button>
            <button onClick={() => navigate('/affiliate')} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.pinnedJoin}</button>
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(254,44,85,0.35)', background: 'rgba(254,44,85,0.12)', color: '#fda4af', fontWeight: 700, textDecoration: 'none' }}>{t.pinnedClip}</a>
          </div>
        </div>

        {/* Search + filter */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchPh}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '15px', outline: 'none', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '20px' }}>
          <button onClick={() => setCat('all')} style={chip(cat === 'all')}>{t.all} ({PROGRAMS.length})</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={chip(cat === c.id)}>{L(c.label)}</button>
          ))}
        </div>

        {cat !== 'all' && (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>{L(CATEGORIES.find(c => c.id === cat)?.note)}</div>
        )}

        {/* Programs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {filtered.map((p) => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: '#fff', background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.hot ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>{p.name}</span>
                {p.hot && <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '10px' }}>HOT</span>}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 12px' }}>{L(p.note)}</div>
              <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700 }}>{t.apply}</div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>{t.noResults}</div>}

        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '24px', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          {t.discA}<strong style={{ color: '#cbd5e1' }}>{t.discStrong}</strong>{t.discB}
        </div>
      </div>
    </div>
  );
}
