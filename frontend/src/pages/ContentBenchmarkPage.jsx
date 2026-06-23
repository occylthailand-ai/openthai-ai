import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

// ── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    icon: '▶️',  label: 'TikTok',     color: '#fe2c55' },
  { id: 'facebook',  icon: '👥',  label: 'Facebook',   color: '#1877f2' },
  { id: 'instagram', icon: '📸',  label: 'Instagram',  color: '#e1306c' },
  { id: 'shopee',    icon: '🟠',  label: 'Shopee',     color: '#f97316' },
  { id: 'line',      icon: '💚',  label: 'LINE',       color: '#06c755' },
  { id: 'x',         icon: '🐦',  label: 'X (Twitter)',color: '#14b8a6' },
  { id: 'linkedin',  icon: '💼',  label: 'LinkedIn',   color: '#0a66c2' },
  { id: 'youtube',   icon: '🎬',  label: 'YouTube',    color: '#ef4444' },
];

const CATEGORIES = [
  'สินค้าอาหาร','ความงาม/สกินแคร์','สุขภาพ/อาหารเสริม','แฟชัน/เสื้อผ้า',
  'หัตถกรรม/OTOP','อิเล็กทรอนิกส์','ท่องเที่ยว','บริการ','AI/Tech','อื่นๆ',
];

const LANGUAGES = [
  { id: 'thai', flag: '🇹🇭', label: 'ภาษาไทย' },
  { id: 'english', flag: '🇬🇧', label: 'English' },
  { id: 'chinese', flag: '🇨🇳', label: '中文' },
];

const DIM_COLORS = {
  modernity:       '#6366f1',
  trend_words:     '#f97316',
  readability:     '#10b981',
  hashtags:        '#06b6d4',
  market_standard: '#f59e0b',
};

const GRADE_STYLE = {
  'A+': { bg: '#14532d', border: '#16a34a', text: '#4ade80' },
  'A':  { bg: '#14532d', border: '#22c55e', text: '#86efac' },
  'B+': { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  'B':  { bg: '#1e3a5f', border: '#60a5fa', text: '#bfdbfe' },
  'C+': { bg: '#4a1d1d', border: '#f97316', text: '#fdba74' },
  'C':  { bg: '#4a1d1d', border: '#ef4444', text: '#fca5a5' },
  'D':  { bg: '#3b1f1f', border: '#dc2626', text: '#f87171' },
};

// ── Helper Components ────────────────────────────────────────────────────────
function ScoreBar({ score, color }) {
  return (
    <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
      <div style={{
        height: '100%', width: `${score}%`, borderRadius: 4,
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        transition: 'width 1s ease',
      }} />
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: copied ? '#10b981' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '3px 10px',
      }}>
      {copied ? '✓' : '⧉ Copy'}
    </button>
  );
}

function Tag({ text, color = '#6366f1' }) {
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#e2e8f0', display: 'inline-block',
    }}>{text}</span>
  );
}

function ScoreGauge({ score }) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#6366f1' : score >= 55 ? '#f97316' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 32, fontWeight: 900, color }}>{score}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>/ 100</div>
      </div>
    </div>
  );
}

function DimCard({ id, d }) {
  const color = DIM_COLORS[id] || '#6366f1';
  const verdictColor = d.verdict === 'ดีมาก' ? '#4ade80' : d.verdict === 'ดี' ? '#86efac'
    : d.verdict === 'ปานกลาง' ? '#fdba74' : '#f87171';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{d.label}</div>
        <div style={{ fontWeight: 800, fontSize: 18, color }}>{d.score}</div>
      </div>
      <ScoreBar score={d.score} color={color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: verdictColor, fontWeight: 600 }}>● {d.verdict}</span>
      </div>
      {d.detail && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>{d.detail}</div>}
      {d.found?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>✅ พบในเนื้อหา:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {d.found.map((w, i) => <Tag key={i} text={w} color="#10b981" />)}
          </div>
        </div>
      )}
      {(d.missing?.length > 0 || d.missing_hot?.length > 0) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>⚠️ ที่ขาด:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(d.missing || d.missing_hot || []).map((w, i) => <Tag key={i} text={w} color="#f97316" />)}
          </div>
        </div>
      )}
      {d.tip && (
        <div style={{
          marginTop: 10, background: `${color}12`, borderRadius: 8,
          padding: '6px 10px', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5,
        }}>
          💡 {d.tip}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ContentBenchmarkPage() {
  const [form, setForm] = useState({
    content: '', platform: 'tiktok', language: 'thai', category: 'สินค้าอาหาร',
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('scores'); // 'scores'|'compare'|'improved'

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const analyze = useCallback(async () => {
    if (!form.content.trim()) { setError('กรุณาวาง Content ที่ต้องการวิเคราะห์'); return; }
    setError(''); setLoading(true); setProgress(2); setResult(null);
    const timer = setInterval(() => setProgress(p => Math.min(p + 3, 88)), 350);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(apiUrl('/api/content-benchmark'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok && !data.overall_score) throw new Error(data.error || 'Server error');
      clearInterval(timer); setProgress(100);
      setTimeout(() => { setResult(data); setLoading(false); setProgress(0); setActiveView('scores'); }, 400);
    } catch (e) {
      clearInterval(timer); setError(e.message); setLoading(false); setProgress(0);
    }
  }, [form]);

  const plat = PLATFORMS.find(p => p.id === form.platform) || PLATFORMS[0];
  const gradeStyle = result ? (GRADE_STYLE[result.grade] || GRADE_STYLE['B']) : null;

  return (
    <div style={{
      minHeight: '100vh', background: '#080812', color: '#e2e8f0',
      fontFamily: "'Sarabun', sans-serif", padding: '24px 16px 60px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔍</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
            Content Benchmark
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 14 }}>
            เทียบสื่อของคุณกับ <strong style={{ color: '#f97316' }}>Top Performer ในตลาดจริง</strong> —
            วิเคราะห์ 5 มิติ: ทันสมัย · คำเทรนด์ · น่าอ่าน · Hashtag · มาตรฐานตลาด
          </p>
        </div>

        {/* Input Form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '22px 20px', marginBottom: 20,
        }}>
          {/* Platform selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Platform ที่จะโพสต์</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setF('platform', p.id)} style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  background: form.platform === p.id ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                  color: form.platform === p.id ? '#fff' : '#64748b',
                  border: form.platform === p.id ? `1px solid ${p.color}60` : '1px solid transparent',
                  fontWeight: form.platform === p.id ? 700 : 400, fontSize: 13,
                  transition: 'all .15s',
                }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>ภาษาของ Content</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setF('language', l.id)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: form.language === l.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    color: form.language === l.id ? '#a5b4fc' : '#64748b',
                    fontWeight: form.language === l.id ? 700 : 400, fontSize: 13,
                  }}>{l.flag} {l.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>หมวดหมู่สินค้า/บริการ</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Content textarea */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>
              วาง Content ของคุณที่นี่ — Headline, Body, CTA, Hashtag ทั้งหมดได้เลย
            </label>
            <textarea
              rows={8}
              placeholder={`ตัวอย่าง:\n\n✨ สินค้าดีที่สุดในไทย!\nคุณภาพสูง ราคาถูก ส่งฟรีทั่วประเทศ\nสั่งวันนี้ได้เลย!\n\n#สินค้าไทย #ขายออนไลน์`}
              value={form.content}
              onChange={e => setF('content', e.target.value)}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
            <div style={{ color: '#475569', fontSize: 12, marginTop: 4, textAlign: 'right' }}>
              {form.content.length} ตัวอักษร
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
              background: loading ? '#334155' : `linear-gradient(135deg, #6366f1, ${plat.color})`,
              color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
            }}
          >
            {loading ? '⏳ กำลังเทียบกับตลาด...' : `🔍 วิเคราะห์เทียบ Top Performer ใน ${plat.icon} ${plat.label}`}
          </button>

          {/* Progress */}
          {loading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progress}%`, borderRadius: 3,
                  background: `linear-gradient(90deg, #6366f1, ${plat.color})`,
                  transition: 'width .3s ease',
                }} />
              </div>
              <div style={{ color: '#475569', fontSize: 12, marginTop: 5, textAlign: 'center' }}>
                AI กำลังเปรียบเทียบกับ Top Content ในตลาด {plat.label}... ({progress}%)
              </div>
            </div>
          )}
          {error && (
            <div style={{
              marginTop: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 14px', color: '#f87171', fontSize: 13,
            }}>⚠️ {error}</div>
          )}
        </div>

        {/* ── Results ── */}
        {result && (
          <>
            {/* Overall score */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '24px 22px', marginBottom: 16,
              display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
            }}>
              <ScoreGauge score={result.overall_score} />
              <div style={{ flex: 1, minWidth: 200 }}>
                {/* Grade badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    background: gradeStyle.bg, border: `2px solid ${gradeStyle.border}`,
                    borderRadius: 10, padding: '4px 16px', fontSize: 22, fontWeight: 900,
                    color: gradeStyle.text,
                  }}>
                    {result.grade}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {result.source === 'mock' ? '🔵 Demo' : result.source === 'claude' ? '🟣 Claude AI' : '🟢 Gemini AI'}
                  </div>
                </div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  {result.verdict}
                </div>
                {/* Mini scores */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(result.dimensions || {}).map(([k, d]) => (
                    <span key={k} style={{
                      background: `${DIM_COLORS[k] || '#6366f1'}18`,
                      border: `1px solid ${DIM_COLORS[k] || '#6366f1'}30`,
                      borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#cbd5e1',
                    }}>
                      {d.label} {d.score}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* View tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'scores',   label: '📊 5 มิติ' },
                { id: 'trending', label: '🔥 เทรนด์ตลาด' },
                { id: 'compare',  label: '⚔️ เทียบ Top Performer' },
                { id: 'improved', label: '✨ Version ปรับแล้ว' },
              ].map(v => (
                <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: activeView === v.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                  color: activeView === v.id ? '#a5b4fc' : '#64748b',
                  fontWeight: activeView === v.id ? 700 : 400, fontSize: 13,
                  whiteSpace: 'nowrap',
                }}>{v.label}</button>
              ))}
            </div>

            {/* ── 5 มิติ ── */}
            {activeView === 'scores' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {Object.entries(result.dimensions || {}).map(([k, d]) => (
                  <DimCard key={k} id={k} d={d} />
                ))}
              </div>
            )}

            {/* ── เทรนด์ตลาด ── */}
            {activeView === 'trending' && result.trending_now && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Trending words */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{ color: '#fdba74', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
                    🔥 คำที่กำลังฮิตในตลาดตอนนี้ — ควรใส่ใน Content
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {(result.trending_now.words || []).map((w, i) => (
                      <span key={i} style={{
                        background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)',
                        borderRadius: 20, padding: '4px 14px', color: '#fdba74', fontSize: 13, fontWeight: 600,
                      }}>🔥 {w}</span>
                    ))}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>วลีฮิต:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(result.trending_now.phrases || []).map((p, i) => (
                      <span key={i} style={{
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: 8, padding: '5px 12px', color: '#c7d2fe', fontSize: 13,
                      }}>"{p}"</span>
                    ))}
                  </div>
                </div>

                {/* Trending hashtags */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ color: '#67e8f9', fontWeight: 700, fontSize: 15 }}>
                      #️⃣ Trending Hashtags — {plat.icon} {plat.label}
                    </div>
                    <CopyBtn text={(result.trending_now.hashtags || []).join(' ')} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(result.trending_now.hashtags || []).map((h, i) => (
                      <span key={i} onClick={() => navigator.clipboard.writeText(h)} style={{
                        background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                        borderRadius: 20, padding: '4px 14px', color: '#67e8f9', fontSize: 13,
                        cursor: 'pointer', transition: 'all .15s',
                      }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 10 }}>
                    คลิก # เพื่อ copy ทีละตัว หรือกด Copy All
                  </div>
                </div>
              </div>
            )}

            {/* ── เทียบ Top Performer ── */}
            {activeView === 'compare' && result.market_comparison && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Your content */}
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: 18,
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                      📄 Content ของคุณ
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {form.content.slice(0, 300)}{form.content.length > 300 ? '...' : ''}
                    </div>
                  </div>
                  {/* Top performer */}
                  <div style={{
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 14, padding: 18,
                  }}>
                    <div style={{ color: '#34d399', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                      🏆 Top Performer Style
                    </div>
                    <div style={{ color: '#d1fae5', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {result.market_comparison.top_example}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <CopyBtn text={result.market_comparison.top_example} />
                    </div>
                  </div>
                </div>

                {/* Strengths + Gaps */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 10 }}>✅ จุดแข็ง</div>
                    {(result.market_comparison.strengths || []).map((s, i) => (
                      <div key={i} style={{ color: '#d1fae5', fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
                        • {s}
                      </div>
                    ))}
                  </div>
                  <div style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 10 }}>⚠️ สิ่งที่ขาด</div>
                    {(result.market_comparison.gaps || []).map((g, i) => (
                      <div key={i} style={{ color: '#fecaca', fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
                        • {g}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competitor tactics */}
                <div style={{
                  background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 10 }}>
                    🎯 กลยุทธ์ที่ Top Performer ใช้
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {(result.market_comparison.competitor_tactics || []).map((t, i) => (
                      <div key={i} style={{
                        background: 'rgba(99,102,241,0.1)', borderRadius: 8, padding: '8px 12px',
                        color: '#c7d2fe', fontSize: 13, lineHeight: 1.5,
                      }}>
                        ⚡ {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Improved Version ── */}
            {activeView === 'improved' && result.improved && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 14, padding: '20px 22px',
              }}>
                <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                  ✨ Content Version ปรับแล้ว — ใช้คำเทรนด์ + มาตรฐาน Top Performer
                </div>

                {/* Headline */}
                <Section label="🔥 Headline" value={result.improved.headline} />
                {/* Body */}
                <Section label="📝 Body" value={result.improved.body} multi />
                {/* CTA */}
                <Section label="📢 CTA" value={result.improved.cta} accent />
                {/* Hashtags */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                    #️⃣ Hashtags (เทรนด์)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {(result.improved.hashtags || []).map((h, i) => (
                      <span key={i} style={{
                        background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                        borderRadius: 20, padding: '4px 14px', color: '#67e8f9', fontSize: 13,
                      }}>{h}</span>
                    ))}
                  </div>
                  <CopyBtn text={(result.improved.hashtags || []).join(' ')} />
                </div>

                {/* Copy all improved */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <CopyBtn text={`${result.improved.headline}\n\n${result.improved.body}\n\n${result.improved.cta}\n\n${(result.improved.hashtags || []).join(' ')}`} />
                  <span style={{ color: '#475569', fontSize: 13, marginLeft: 10 }}>Copy ทั้งหมด (Headline + Body + CTA + Hashtags)</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 15, color: '#64748b' }}>
              วาง Content ของคุณแล้วกด <strong style={{ color: '#6366f1' }}>วิเคราะห์</strong>
            </div>
            <div style={{ fontSize: 13, marginTop: 8, color: '#475569' }}>
              AI จะเทียบกับ Top Performer จริงๆ ใน 5 มิติ พร้อม Version ที่ปรับแล้ว
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section helper ───────────────────────────────────────────────────────────
function Section({ label, value, multi, accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{
        background: accent ? 'rgba(254,44,85,0.08)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${accent ? 'rgba(254,44,85,0.2)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8, padding: '10px 14px',
        color: accent ? '#fb7185' : '#e2e8f0',
        fontSize: 14, lineHeight: 1.7, whiteSpace: multi ? 'pre-wrap' : 'normal',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ flex: 1 }}>{value}</span>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const lbl = { display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 };
const inp = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px',
  color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit',
};
