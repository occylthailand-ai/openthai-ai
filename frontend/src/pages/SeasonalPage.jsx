import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// Public, indexable evergreen content page: "what's in demand this season" for the Thai/ASEAN
// market, driven by the deterministic seasonal engine (GET /api/seasonal/recommend, zone=tropical).
// It answers a real, recurring buyer/seller question ("ช่วงนี้ขายอะไรดี") without an LLM and without
// scraping — the 24 solar terms (节气) × the local season × durable demand categories. Fully th/en/zh.
// Complements /showcase (a general tour) and the per-portal SeasonalAnglesPanel (a group-specific
// teaser): this page shows the FULL localized recommendation — every category + why, the countdown to
// the next solar term, and a concrete play for each of the five groups — with links into the funnel.

const T = {
  th: {
    title: 'สินค้ามาแรงตามฤดูกาล',
    sub: 'ช่วงนี้ควรผลิต ขาย หรือซื้ออะไร — อิงปฏิทิน 24 ฤดูกาลจีน (节气) + ฤดูกาลของพื้นที่ คำนวณสด ไม่ใช้ AI ไม่เก็บข้อมูลคุณ',
    now: 'ช่วงนี้',
    nextTerm: 'ปักษ์ถัดไป',
    inDays: (n) => `ในอีก ${n} วัน`,
    catsHeading: 'หมวดสินค้าที่ดีมานด์ช่วงนี้',
    why: 'ทำไม',
    groupsHeading: 'ทำอะไรได้บ้าง — แยกตามบทบาทของคุณ',
    groups: { producer: 'ผู้ผลิต', middleman: 'คนกลาง/ตัวแทน', affiliate: 'affiliate/ครีเอเตอร์', partner_agent: 'พาร์ทเนอร์/เอเจนต์', consumer: 'ผู้บริโภค' },
    ctaHeading: 'อยากใช้สัญญาณนี้จริงจัง?',
    ctaText: 'เข้าประตูสมาชิกของคุณ แล้วเห็นโอกาสประจำฤดูกาลของกลุ่มคุณทันที',
    cta: 'เลือกประตูของคุณ',
    tour: 'ดูทัวร์นำชมทั้งหมด',
    loading: 'กำลังคำนวณ…',
    offline: 'ตอนนี้ยังดึงข้อมูลสดไม่ได้ ลองรีเฟรชอีกครั้ง — เครื่องมือนี้คำนวณจากปฏิทิน จึงตอบได้เสมอเมื่อเชื่อมต่อ',
  },
  en: {
    title: 'What sells by season',
    sub: 'What to make, sell, or buy right now — from the 24 solar terms (节气) + your local season, computed live, no AI, no data collected.',
    now: 'Right now',
    nextTerm: 'Next term',
    inDays: (n) => `in ${n} day${n === 1 ? '' : 's'}`,
    catsHeading: 'In-demand categories this period',
    why: 'Why',
    groupsHeading: 'What you can do — by your role',
    groups: { producer: 'Producer', middleman: 'Middleman', affiliate: 'Affiliate / creator', partner_agent: 'Partner / agent', consumer: 'Consumer' },
    ctaHeading: 'Want to use this signal for real?',
    ctaText: 'Enter your member portal and see the seasonal opportunities for your group instantly.',
    cta: 'Pick your portal',
    tour: 'See the full tour',
    loading: 'Computing…',
    offline: 'Live data is unavailable right now — try refreshing. This tool computes from the calendar, so it always answers when connected.',
  },
  zh: {
    title: '应季畅销品',
    sub: '当下该生产、销售或采购什么——基于二十四节气 + 本地季节实时计算，无AI、不采集数据。',
    now: '当前',
    nextTerm: '下一节气',
    inDays: (n) => `还有 ${n} 天`,
    catsHeading: '本季高需求品类',
    why: '原因',
    groupsHeading: '你能做什么——按角色',
    groups: { producer: '生产商', middleman: '中间商', affiliate: '推广者/达人', partner_agent: '合作伙伴', consumer: '消费者' },
    ctaHeading: '想认真用好这个信号？',
    ctaText: '进入你的成员入口，立即看到你所属群体的季节机会。',
    cta: '选择你的入口',
    tour: '查看完整导览',
    loading: '计算中…',
    offline: '当前无法获取实时数据，请刷新重试。本工具依据历法计算，联网时始终可答。',
  },
};

const card = { background: '#111', border: '1px solid #6366f133', borderRadius: 14, padding: '18px 20px' };
const catName = (c, lang) => (lang === 'en' ? c.en : lang === 'zh' ? c.zh : c.th);
const catWhy = (c, lang) => (lang === 'en' ? c.why_en : lang === 'zh' ? c.why_zh : c.why) || c.why;
const termLabel = (nt, lang) => (lang === 'en' ? nt.en : lang === 'zh' ? nt.cn : nt.th);

export default function SeasonalPage() {
  const [lang, setLang] = useState('th');
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const t = T[lang];

  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  useEffect(() => {
    let alive = true;
    setData(null); setFailed(false);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/seasonal/recommend?zone=tropical&lang=${encodeURIComponent(lang)}`));
        const json = await res.json();
        if (!alive) return;
        if (json && json.success && Array.isArray(json.categories)) setData(json);
        else setFailed(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [lang]);

  const groupOrder = ['producer', 'middleman', 'affiliate', 'partner_agent', 'consumer'];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', gap: 8 }}>
        {['th', 'en', 'zh'].map((l) => (
          <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang === l} style={{ background: lang === l ? '#5e61f1' : 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{l === 'th' ? 'ไทย' : l === 'en' ? 'English' : '中文'}</button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🌦️</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#818cf8', margin: '0 0 12px' }}>{t.title}</h1>
          <p style={{ color: '#aaa', fontSize: 16, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>{t.sub}</p>
        </div>

        {!data && !failed && <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.loading}</p>}
        {failed && <p style={{ textAlign: 'center', color: '#94a3b8', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>{t.offline}</p>}

        {data && (
          <>
            <div style={{ ...card, marginBottom: 28 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
                <span style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 700 }}>{t.now}:</span>
                <span style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{data.local_season?.label}</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>· {data.solar_term?.label}</span>
                <span style={{ color: '#64748b', fontSize: 13 }}>· {data.date}</span>
              </div>
              {data.next_term && (
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                  {t.nextTerm}: <span style={{ color: '#cbd5e1' }}>{termLabel(data.next_term, lang)}</span> — {t.inDays(data.next_term.days_until)}
                </div>
              )}
            </div>

            <h2 style={{ color: '#6366f1', fontSize: 19, margin: '0 0 14px' }}>{t.catsHeading}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 32 }}>
              {data.categories.map((c) => (
                <div key={c.key} style={card}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}>{catName(c, lang)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{t.why}: {catWhy(c, lang)}</div>
                </div>
              ))}
            </div>

            {data.group_actions && (
              <>
                <h2 style={{ color: '#6366f1', fontSize: 19, margin: '0 0 14px' }}>{t.groupsHeading}</h2>
                <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'grid', gap: 10 }}>
                  {groupOrder.filter((g) => data.group_actions[g]).map((g) => (
                    <li key={g} style={{ background: '#0f0f1a', border: '1px solid #232338', borderRadius: 10, padding: '12px 14px' }}>
                      <span style={{ background: '#6366f122', color: '#a5b4fc', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{t.groups[g]}</span>
                      <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.55, marginTop: 6 }}>{data.group_actions[g]}</div>
                    </li>
                  ))}
                </ul>
                {data.note && <p style={{ color: '#475569', fontSize: 11, margin: '14px 0 0', lineHeight: 1.5 }}>{data.note}</p>}
              </>
            )}
          </>
        )}

        <div style={{ ...card, borderColor: '#6366f155', marginTop: 40, textAlign: 'center' }}>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t.ctaHeading}</div>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 auto 16px', maxWidth: 520, lineHeight: 1.6 }}>{t.ctaText}</p>
          <Link to="/portals" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginRight: 10 }}>{t.cta}</Link>
          <Link to="/showcase" style={{ display: 'inline-block', color: '#a5b4fc', padding: '12px 12px', fontSize: 14, textDecoration: 'none' }}>{t.tour} →</Link>
        </div>
      </div>
    </div>
  );
}
