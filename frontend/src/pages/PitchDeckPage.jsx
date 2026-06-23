import React, { useState, useEffect, useCallback } from 'react';

// ── Slide Data ───────────────────────────────────────────────────────────────
const SLIDES = [
  // 1 — Cover
  {
    id: 'cover', bg: 'linear-gradient(135deg,#0a0a1a 0%,#1a1a3e 100%)',
    render: () => (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🇹🇭</div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,56px)', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#6366f1,#10b981,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
          OpenThai AI
        </h1>
        <p style={{ fontSize: 'clamp(16px,3vw,24px)', color: '#cbd5e1', margin: '16px 0 8px', fontWeight: 600 }}>
          Thai Export Intelligence Platform
        </p>
        <p style={{ fontSize: 'clamp(13px,2vw,16px)', color: '#64748b', margin: 0 }}>
          AI ที่ช่วยสินค้าไทยขายทั่วโลก · 3 ภาษา · 7 ทวีป · Launch 20 ธันวาคม 2026
        </p>
        <div style={{ marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🌾 เกษตร', '🏭 OTOP', '💼 SME', '📦 Export'].map(t => (
            <span key={t} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 30, padding: '8px 18px', fontSize: 14, color: '#e2e8f0' }}>{t}</span>
          ))}
        </div>
      </div>
    )
  },
  // 2 — Problem
  {
    id: 'problem', label: 'ปัญหา', bg: 'linear-gradient(135deg,#1a0a0a 0%,#3e1a1a 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>THE PROBLEM</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 32px', color: '#fff' }}>
          สินค้าไทยดีระดับโลก<br/>แต่<span style={{ color: '#ef4444' }}>ขายไม่เป็น</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {[
            { icon: '😰', stat: '5.8M', label: 'ผู้ผลิต/SME/เกษตรกรไทย ไม่มีทีมการตลาด' },
            { icon: '🌐', stat: '3 ภาษา', label: 'B2B Export ต้องการ TH/EN/ZH แต่ทำเองไม่ได้' },
            { icon: '💸', stat: '฿3,000+', label: 'เครื่องมือต่างชาติแพงเกิน SME เข้าถึงไม่ได้' },
            { icon: '🚫', stat: '0', label: 'ไม่มี AI ตัวไหนเข้าใจ OTOP, GI, GAP, Halal' },
          ].map((p, i) => (
            <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '20px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fca5a5', marginBottom: 6 }}>{p.stat}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  // 3 — Solution
  {
    id: 'solution', label: 'ทางออก', bg: 'linear-gradient(135deg,#0a1a0f 0%,#1a3e2a 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#10b981', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>THE SOLUTION</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>
          AI ตัวเดียว <span style={{ color: '#10b981' }}>ครบทุกขั้นตอน</span> การขายไทยสู่โลก
        </h2>
        <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 28px' }}>จากสินค้า → สื่อ 3 ภาษา → KOL → Catalog ส่งออก → โพสต์ → วัดผล ในที่เดียว</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          {[
            { icon: '🌐', t: 'Global PR', s: '3 ภาษา × 7 กลุ่ม × 7 ทวีป' },
            { icon: '🌟', t: 'KOL Brief', s: 'Nano→Macro · Script · KPI' },
            { icon: '🏪', t: 'Catalog AI', s: '3 ภาษา · HS Code · FOB/CIF' },
            { icon: '🎨', t: 'Image Prompt', s: 'Midjourney · DALL-E · SD' },
            { icon: '📅', t: 'Scheduler', s: '8 Platforms อัตโนมัติ' },
            { icon: '📊', t: 'Analytics', s: 'Reach · Engagement · ROI' },
            { icon: '🔍', t: 'Benchmark', s: 'เทียบ Top Performer ตลาดจริง' },
            { icon: '🏛️', t: 'Cultural AI', s: '八德 · พระไตรปิฎก · Halal' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, color: '#6ee7b7', fontSize: 14, marginBottom: 4 }}>{f.t}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{f.s}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  // 4 — Why We Win
  {
    id: 'moat', label: 'จุดแข็ง', bg: 'linear-gradient(135deg,#0a0a1a 0%,#1a1a3e 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#6366f1', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>WHY WE WIN — 4 MOATS</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 28px', color: '#fff' }}>
          ทำไมคู่แข่ง<span style={{ color: '#6366f1' }}>ลอกไม่ได้</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: '🇹🇭', t: 'Thai Cultural Data Moat', s: 'AI เข้าใจ OTOP · เกษตรไทย · วัฒนธรรม — คู่แข่งต้องใช้ 3-5 ปีสะสม', pct: 95 },
            { icon: '🏛️', t: 'Government Trust Moat', s: 'BOI/DITP/สสว. Partner → Network Effect ที่เข้าไม่ถึง', pct: 78 },
            { icon: '🌐', t: '3-Language ASEAN Moat', s: 'TH/EN/ZH + Halal/GI/GAP ≠ Google Translate', pct: 90 },
            { icon: '💰', t: 'Price-Value Moat', s: '฿299 vs HubSpot $45-3,600 = Value สูงกว่า 10 เท่า', pct: 88 },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 32 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: 15, marginBottom: 4 }}>{m.t}</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>{m.s}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1' }}>{m.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  // 5 — Market
  {
    id: 'market', label: 'ตลาด', bg: 'linear-gradient(135deg,#0a1518 0%,#0a2e3e 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#06b6d4', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>MARKET — BLUE OCEAN</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 28px', color: '#fff' }}>
          ตลาดว่าง <span style={{ color: '#06b6d4' }}>5.8 ล้านราย</span> ที่คู่แข่งไม่อยู่
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {[
            { icon: '🌾', label: 'เกษตรกรส่งออก', size: '2.7M', sub: 'ครัวเรือน' },
            { icon: '🏭', label: 'OTOP / SME', size: '3.1M', sub: 'ราย' },
            { icon: '📦', label: 'B2B Export Agent', size: '42K', sub: 'บริษัท' },
            { icon: '🏛️', label: 'B2G Government', size: '฿100B+', sub: 'งบปีละ' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#67e8f9' }}>{m.size}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{m.sub}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          TAM รวม ASEAN 2027: <span style={{ color: '#67e8f9', fontWeight: 700 }}>50M+ businesses</span> · TH → VN → ID → MY → PH
        </div>
      </div>
    )
  },
  // 6 — Competition
  {
    id: 'competition', label: 'คู่แข่ง', bg: 'linear-gradient(135deg,#0a0a1a 0%,#2a1a3e 100%)',
    render: () => (
      <div style={{ maxWidth: 920 }}>
        <div style={{ fontSize: 14, color: '#8b5cf6', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>COMPETITIVE LANDSCAPE</div>
        <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, margin: '0 0 24px', color: '#fff' }}>
          เราชนะ <span style={{ color: '#10b981' }}>9 ใน 15 มิติ</span>
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(139,92,246,0.4)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontSize: 11 }}>มิติเด่น</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)' }}>เรา</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Canva</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Jasper</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>HubSpot</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Alibaba</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['🇹🇭 ภาษาไทย Native', '★★★★★', '★★', '★', '★', '★'],
                ['🌐 3 ภาษาในสื่อเดียว', '★★★★★', '—', '★★', '—', '★★'],
                ['🌾 OTOP/SME/เกษตร', '★★★★★', '—', '—', '★★', '★★'],
                ['🌍 7-Continent Strategy', '★★★★★', '—', '—', '★★', '★★★'],
                ['🏪 Catalog Export 3 ภาษา', '★★★★★', '★★', '—', '★★★', '★★★★'],
                ['💰 ราคา SME เข้าถึง', '★★★★★', '★★★★', '★★', '★', '★★★'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{row[0]}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#10b981', background: 'rgba(16,185,129,0.06)', fontWeight: 700 }}>{row[1]}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{row[2]}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{row[3]}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{row[4]}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{row[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  // 7 — Business Model
  {
    id: 'revenue', label: 'รายได้', bg: 'linear-gradient(135deg,#1a0a14 0%,#3e1a2e 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#ec4899', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>BUSINESS MODEL — 4 STREAMS</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 28px', color: '#fff' }}>
          รายได้ <span style={{ color: '#ec4899' }}>4 ทาง</span> ที่คู่แข่งยังไม่มี
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {[
            { icon: '💳', t: 'SaaS Subscription', s: '฿299 · ฿999 · ฿2,999/mo', tag: 'Live ✅', c: '#10b981' },
            { icon: '📦', t: 'Export Commission', s: '1-3% Success Fee', tag: 'Blue Ocean', c: '#6366f1' },
            { icon: '🏛️', t: 'B2G Government', s: 'Contract 3-5 ปี หลักสิบล้าน', tag: 'High Value', c: '#f59e0b' },
            { icon: '🤝', t: 'Partner API', s: 'Canva·LINE·Alibaba Share', tag: 'Ecosystem', c: '#ec4899' },
          ].map((r, i) => (
            <div key={i} style={{ background: `${r.c}10`, border: `1px solid ${r.c}30`, borderRadius: 14, padding: '18px', borderTop: `3px solid ${r.c}` }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontWeight: 700, color: r.c, fontSize: 14, marginBottom: 4 }}>{r.t}</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>{r.s}</div>
              <span style={{ fontSize: 11, background: `${r.c}20`, color: r.c, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{r.tag}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  // 8 — Projection
  {
    id: 'projection', label: 'การเงิน', bg: 'linear-gradient(135deg,#0a1a0f 0%,#1a3e2a 100%)',
    render: () => (
      <div style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 14, color: '#10b981', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FINANCIAL PROJECTION</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 28px', color: '#fff' }}>
          ฿9.1M → <span style={{ color: '#10b981' }}>฿197M</span> ใน 3 ปี
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, justifyContent: 'center', height: 240, marginBottom: 24 }}>
          {[
            { year: '2026', total: '฿9.1M', h: 50, c: '#10b981', sub: 'Year 1' },
            { year: '2027', total: '฿51M', h: 130, c: '#6366f1', sub: '+ASEAN' },
            { year: '2028', total: '฿197M', h: 220, c: '#f59e0b', sub: 'IPO Ready' },
          ].map((y, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 900, color: y.c }}>{y.total}</div>
              <div style={{ width: 'clamp(60px,12vw,100px)', height: y.h, background: `linear-gradient(180deg,${y.c},${y.c}40)`, borderRadius: '8px 8px 0 0', transition: 'height 1s ease' }} />
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{y.year}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{y.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Conservative · SaaS + Export Commission + B2G · CAGR <span style={{ color: '#10b981', fontWeight: 700 }}>~365%</span>
        </div>
      </div>
    )
  },
  // 9 — Roadmap
  {
    id: 'roadmap', label: 'แผนงาน', bg: 'linear-gradient(135deg,#150a1a 0%,#2e1a3e 100%)',
    render: () => (
      <div style={{ maxWidth: 920 }}>
        <div style={{ fontSize: 14, color: '#f97316', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROADMAP 2026</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, margin: '0 0 28px', color: '#fff' }}>
          จาก <span style={{ color: '#10b981' }}>MVP เสร็จแล้ว</span> สู่ Launch 20/12
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {[
            { q: 'Q1 2026', tag: 'เสร็จ ✅', c: '#10b981', items: ['Global PR 7×3', 'KOL/Catalog/Scheduler', 'Benchmark/Analytics', 'Strategy Center'] },
            { q: 'Q2 2026', tag: 'กำลังทำ', c: '#6366f1', items: ['LINE OA API จริง', 'FB/IG Graph API', 'Canva Plugin', 'TikTok Shop'] },
            { q: 'Q3 2026', tag: 'วางแผน', c: '#f59e0b', items: ['Real Analytics', 'AI Image Gen', 'Mobile Native', 'Multilingual SEO'] },
            { q: 'Q4 2026', tag: 'Launch 🚀', c: '#ef4444', items: ['B2G Dashboard', 'Export Commission', 'ASEAN Expansion', 'Alibaba Integration'] },
          ].map((q, i) => (
            <div key={i} style={{ background: `${q.c}08`, border: `1px solid ${q.c}25`, borderRadius: 12, padding: '16px', borderTop: `3px solid ${q.c}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, color: q.c, fontSize: 15 }}>{q.q}</span>
                <span style={{ fontSize: 10, background: `${q.c}20`, color: q.c, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{q.tag}</span>
              </div>
              {q.items.map((it, j) => (
                <div key={j} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${q.c}40` }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  },
  // 10 — The Ask / Vision
  {
    id: 'ask', label: 'วิสัยทัศน์', bg: 'linear-gradient(135deg,#0a0a1a 0%,#1a1a3e 50%,#2a1a3e 100%)',
    render: () => (
      <div style={{ textAlign: 'center', maxWidth: 850 }}>
        <div style={{ fontSize: 14, color: '#8b5cf6', fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>THE VISION</div>
        <h2 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, margin: '0 0 24px', color: '#fff', lineHeight: 1.2 }}>
          จาก <span style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Thai Platform</span><br/>สู่ <span style={{ background: 'linear-gradient(135deg,#10b981,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ASEAN Export OS</span>
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', margin: '32px 0' }}>
          {[
            { y: '2026', t: "Thailand's #1", c: '#10b981' },
            { y: '2027', t: 'ASEAN Export OS', c: '#6366f1' },
            { y: '2028', t: 'IPO Ready', c: '#f59e0b' },
          ].map((v, i) => (
            <div key={i} style={{ background: `${v.c}12`, border: `1px solid ${v.c}30`, borderRadius: 16, padding: '20px 28px' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: v.c }}>{v.y}</div>
              <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>{v.t}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 'clamp(15px,2.5vw,18px)', color: '#94a3b8', lineHeight: 1.6 }}>
          🌐 100,000+ Thai/ASEAN Businesses · 💰 $500M+ Export Value/Year<br/>
          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 'clamp(18px,3vw,22px)' }}>ร่วมสร้างอนาคตการค้าไทยสู่โลก</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 16, color: '#fff', fontWeight: 700 }}>
          openthai-ai.com · Launch 20 ธันวาคม 2026 🇹🇭
        </div>
      </div>
    )
  },
];

export default function PitchDeckPage() {
  const [idx, setIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const go = useCallback((d) => {
    setIdx(prev => Math.max(0, Math.min(SLIDES.length - 1, prev + d)));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const slide = SLIDES[idx];

  return (
    <div style={{ minHeight: '100vh', background: '#050510', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      {!fullscreen && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Investor & Partner Pitch Deck</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>OpenThai AI · {SLIDES.length} slides · กด ← → เลื่อน · พิมพ์/PDF: Ctrl+P</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '7px 14px' }}>🖨️ Export PDF</button>
            <button onClick={() => setFullscreen(true)} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#6ee7b7', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '7px 14px' }}>⛶ Present</button>
          </div>
        </div>
      )}

      {/* Slide */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: fullscreen ? '20px' : '40px 24px', background: slide.bg, position: 'relative', transition: 'background 0.5s ease' }}>
        {fullscreen && (
          <button onClick={() => setFullscreen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, padding: '6px 12px', zIndex: 10 }}>✕ ออก (Esc)</button>
        )}
        <div style={{ width: '100%', maxWidth: 1000, display: 'flex', justifyContent: slide.id === 'cover' || slide.id === 'ask' ? 'center' : 'flex-start' }}>
          {slide.render()}
        </div>

        {/* Nav arrows */}
        <button onClick={() => go(-1)} disabled={idx === 0} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 20, opacity: idx === 0 ? 0.3 : 1 }}>‹</button>
        <button onClick={() => go(1)} disabled={idx === SLIDES.length - 1} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: idx === SLIDES.length - 1 ? 'default' : 'pointer', fontSize: 20, opacity: idx === SLIDES.length - 1 ? 0.3 : 1 }}>›</button>
      </div>

      {/* Bottom progress */}
      <div style={{ padding: '14px 20px', borderTop: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        {SLIDES.map((sl, i) => (
          <button key={sl.id} onClick={() => setIdx(i)} title={sl.label || sl.id} style={{ width: i === idx ? 28 : 8, height: 8, borderRadius: 4, background: i === idx ? 'linear-gradient(90deg,#6366f1,#10b981)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
        ))}
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{idx + 1} / {SLIDES.length}</span>
      </div>
    </div>
  );
}
