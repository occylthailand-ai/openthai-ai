import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../apiBase';

// "เจอครั้งแรก → เห็นประโยชน์จริงใน 10 วินาที" — a value panel for each /portals/* group.
// Pulls the deterministic seasonal engine (GET /api/seasonal/angles) and shows, for THIS group,
// what's worth pushing/buying this season (24 solar terms 节气 × climate zone × structural trends).
// No LLM, no scraping — it answers instantly. It is purely additive: on any error/empty it renders
// nothing, so it can never break the portal page it sits in.
//
// Props: group ∈ producer | middleman | affiliate | partner_agent | consumer; lang ∈ th | en | zh.
// zone defaults to 'tropical' (the Thai/ASEAN audience these portals serve).

const LABELS = {
  th: { heading: 'โอกาสประจำฤดูกาลนี้', forYou: 'สำหรับคุณตอนนี้', why: 'ทำไม', poweredBy: 'อิงปฏิทิน 24 ฤดูกาลจีน (节气) + ฤดูกาลของพื้นที่ — คำนวณสด ไม่ใช้ AI ไม่เก็บข้อมูลคุณ' },
  en: { heading: "This season's opportunities", forYou: 'For you right now', why: 'Why', poweredBy: 'From the 24 solar terms (节气) + your zone\'s season — computed live, no AI, no data collected' },
  zh: { heading: '本季机会', forYou: '现在适合你', why: '原因', poweredBy: '基于二十四节气 + 本地季节实时计算 — 无AI、不采集数据' },
};
const GROUP_LABEL = {
  producer:      { th: 'ผู้ผลิต', en: 'Producer', zh: '生产商' },
  middleman:     { th: 'คนกลาง/ตัวแทน', en: 'Middleman', zh: '中间商' },
  affiliate:     { th: 'affiliate/ครีเอเตอร์', en: 'Affiliate', zh: '推广者' },
  partner_agent: { th: 'พาร์ทเนอร์/เอเจนต์', en: 'Partner', zh: '合作伙伴' },
  consumer:      { th: 'ผู้บริโภค', en: 'Consumer', zh: '消费者' },
};

export default function SeasonalAnglesPanel({ group = 'producer', lang = 'th', zone = 'tropical' }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const L = LABELS[lang] || LABELS.th;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/seasonal/angles?zone=${encodeURIComponent(zone)}`));
        const json = await res.json();
        if (!alive) return;
        if (json && json.success && Array.isArray(json.angles) && json.angles.length) setData(json);
        else setFailed(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [zone]);

  if (failed || !data) return null; // purely additive — never break the page

  const play = (data.group_plays && data.group_plays[group]) || (data.group_plays && data.group_plays.producer) || '';
  const angles = data.angles.slice(0, 6);
  const groupTh = (GROUP_LABEL[group] || GROUP_LABEL.producer)[lang] || (GROUP_LABEL[group] || GROUP_LABEL.producer).th;

  return (
    <section aria-label={L.heading} data-testid="seasonal-angles" style={{ background:'#111', border:'1px solid #6366f133', borderRadius:16, padding:'22px 24px', marginBottom:32 }}>
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'baseline', gap:10, marginBottom:14 }}>
        <span style={{ fontSize:22 }}>🌦️</span>
        <h3 style={{ margin:0, color:'#818cf8', fontSize:18, fontWeight:800 }}>{L.heading}</h3>
        <span style={{ color:'#94a3b8', fontSize:13 }}>
          {data.solar_term?.th} · {data.local_season?.th} · <span style={{ color:'#64748b' }}>{data.date}</span>
        </span>
      </div>

      {play && (
        <div style={{ background:'#1a1a2e', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
          <span style={{ color:'#a5b4fc', fontSize:12, fontWeight:700 }}>{L.forYou} ({groupTh}):</span>
          <div style={{ color:'#e2e8f0', fontSize:14, marginTop:4, lineHeight:1.6 }}>{play}</div>
        </div>
      )}

      <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gap:10 }}>
        {angles.map((a, i) => (
          <li key={i} style={{ background:'#0f0f1a', border:'1px solid #232338', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ background:'#6366f122', color:'#a5b4fc', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999 }}>{a.trend_th}</span>
              <span style={{ color:'#cbd5e1', fontSize:12 }}>{a.category_th}</span>
            </div>
            <div style={{ color:'#f1f5f9', fontSize:14, lineHeight:1.55 }}>{a.angle}</div>
            {a.why && <div style={{ color:'#64748b', fontSize:12, marginTop:4 }}>{L.why}: {a.why}</div>}
          </li>
        ))}
      </ul>

      <p style={{ color:'#475569', fontSize:11, margin:'14px 0 0', lineHeight:1.5 }}>{L.poweredBy}</p>
    </section>
  );
}
