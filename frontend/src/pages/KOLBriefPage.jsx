import React, { useState } from 'react';
import { apiUrl } from '../apiBase';

const PLATFORMS = [
  { id: 'tiktok', icon: '▶️', label: 'TikTok', color: '#fe2c55' },
  { id: 'instagram', icon: '📸', label: 'Instagram', color: '#e1306c' },
  { id: 'facebook', icon: '👥', label: 'Facebook', color: '#1877f2' },
  { id: 'youtube', icon: '🎬', label: 'YouTube', color: '#ff0000' },
  { id: 'line', icon: '💚', label: 'LINE OA', color: '#06c755' },
  { id: 'xiaohongshu', icon: '📕', label: 'Xiaohongshu', color: '#ff2442' },
];

const REGIONS = [
  { id: 'thailand', label: 'ไทย' }, { id: 'china', label: 'จีน' },
  { id: 'asean', label: 'ASEAN' }, { id: 'usa', label: 'USA' },
  { id: 'europe', label: 'ยุโรป' }, { id: 'japan', label: 'ญี่ปุ่น' },
];

const TIERS = [
  { id: 'nano', label: 'Nano KOL', sub: '1K–10K followers', color: '#10b981' },
  { id: 'micro', label: 'Micro KOL', sub: '10K–100K', color: '#6366f1' },
  { id: 'mid', label: 'Mid-tier KOL', sub: '100K–1M', color: '#f59e0b' },
  { id: 'macro', label: 'Macro KOL', sub: '1M+ followers', color: '#ef4444' },
];

const CATEGORIES = ['สินค้าอาหาร','สินค้าเกษตร','ความงาม','สุขภาพ','แฟชัน','หัตถกรรม','SME','OTOP'];

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      style={{ background: c ? '#10b981' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '3px 10px' }}>
      {c ? '✓' : '⧉'}
    </button>
  );
}

function Section({ title, color = '#6366f1', children }) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontSize: 13, color, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      {children}
    </div>
  );
}

export default function KOLBriefPage() {
  const [form, setForm] = useState({ product: '', category: 'สินค้าอาหาร', platform: 'tiktok', region: 'thailand', usp: '', target_audience: 'ผู้บริโภคทั่วไป', budget_tier: 'micro' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.product.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/skills/kol-brief'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) setResult(d);
    } catch (_) {}
    setLoading(false);
  };

  const exportBrief = () => {
    if (!result) return;
    const lines = [
      `# KOL BRIEF — ${result.campaign_name}`,
      `Product: ${form.product} | Platform: ${form.platform} | Region: ${form.region}`,
      `Generated: ${new Date().toLocaleDateString('th-TH')}`,
      '', '---', '',
      `## Campaign Objective`, result.objective, '',
      `## KOL Profile`, JSON.stringify(result.kol_profile, null, 2), '',
      `## Key Messages`, ...(result.key_messages || []).map(m => `- ${m}`), '',
      `## Content Brief`,
      `Hook: ${result.content_brief?.hook || ''}`, '',
      `Talking Points:`, ...(result.content_brief?.talking_points || []).map(p => `- ${p}`), '',
      `DOs:`, ...(result.content_brief?.dos || []).map(d => `✅ ${d}`), '',
      `DON'Ts:`, ...(result.content_brief?.donts || []).map(d => `❌ ${d}`), '',
      `## Deliverables`, ...(result.deliverables || []).map(d => `- ${d.type} (${d.duration}) × ${d.quantity} — Due: ${d.deadline}`), '',
      `## Hashtags`, `Mandatory: ${(result.hashtags_mandatory || []).join(' ')}`, `Suggested: ${(result.hashtags_suggested || []).join(' ')}`, '',
      `## Compensation`, `Type: ${result.compensation?.type}`, `Estimate: ${result.compensation?.estimate}`, `Notes: ${result.compensation?.notes}`, '',
      `## KPIs`, `${result.kpi?.primary}: ${result.kpi?.target}`, `${result.kpi?.secondary}: ${result.kpi?.target2}`, '',
      `## Script Outline`, result.script_outline || '',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kol-brief-${form.product.replace(/\s/g, '-')}.md`;
    a.click();
  };

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
    lbl: { fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' },
    chip: (sel, color = '#6366f1') => ({ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 400, background: sel ? `${color}25` : 'rgba(255,255,255,0.05)', color: sel ? '#fff' : '#64748b', border: sel ? `1px solid ${color}60` : '1px solid transparent' }),
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🌟 KOL Brief Generator
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>สร้าง Brief ครบสำหรับ Influencer Marketing — ทุก Platform · ทุกภูมิภาค</p>
        </div>

        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.lbl}>ชื่อสินค้า *</label>
              <input value={form.product} onChange={e => setF('product', e.target.value)} placeholder="เช่น กาแฟดอยอินทนนท์..." style={s.inp} />
            </div>
            <div>
              <label style={s.lbl}>หมวดหมู่</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)} style={s.inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Platform */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>Platform หลัก</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setF('platform', p.id)} style={s.chip(form.platform === p.id, p.color)}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>ภูมิภาค / Target Market</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REGIONS.map(r => (
                <button key={r.id} onClick={() => setF('region', r.id)} style={s.chip(form.region === r.id, '#10b981')}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* KOL Tier */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>ระดับ KOL</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {TIERS.map(t => (
                <button key={t.id} onClick={() => setF('budget_tier', t.id)} style={{
                  padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: form.budget_tier === t.id ? `${t.color}25` : 'rgba(255,255,255,0.04)',
                  border: form.budget_tier === t.id ? `1px solid ${t.color}60` : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.budget_tier === t.id ? t.color : '#e2e8f0' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={s.lbl}>USP / จุดเด่น</label>
              <input value={form.usp} onChange={e => setF('usp', e.target.value)} placeholder="เช่น ออร์แกนิก 100%..." style={s.inp} />
            </div>
            <div>
              <label style={s.lbl}>กลุ่มเป้าหมาย</label>
              <input value={form.target_audience} onChange={e => setF('target_audience', e.target.value)} placeholder="เช่น คนรักสุขภาพ อายุ 25-40..." style={s.inp} />
            </div>
          </div>

          <button onClick={generate} disabled={loading || !form.product.trim()} style={{
            background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: 12, color: '#fff',
            cursor: 'pointer', fontSize: 15, fontWeight: 800, padding: '13px 28px', width: '100%', opacity: !form.product.trim() ? 0.5 : 1,
          }}>
            {loading ? '⏳ กำลังสร้าง KOL Brief...' : '🌟 สร้าง KOL Brief'}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#f59e0b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>กำลังสร้าง KOL Brief...</div>
          </div>
        )}

        {result && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fbbf24' }}>{result.campaign_name}</h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>{result.objective}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={exportBrief} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#fbbf24', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '7px 14px' }}>⬇️ Export .md</button>
              </div>
            </div>

            {/* KOL Profile */}
            <Section title="👤 KOL Profile" color="#6366f1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Followers', result.kol_profile?.followers_range], ['Niche', (result.kol_profile?.niche || []).join(' · ')], ['Tone', result.kol_profile?.tone], ['Demographics', result.kol_profile?.demographics]].map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>{v}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Key Messages */}
            <Section title="💬 Key Messages" color="#10b981">
              {(result.key_messages || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#10b981', fontWeight: 800, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{m}</span>
                </div>
              ))}
            </Section>

            {/* Content Brief */}
            <Section title="🎬 Content Brief" color="#ec4899">
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#ec4899', fontWeight: 700, marginBottom: 6 }}>HOOK (3 วิแรก)</div>
                <div style={{ background: 'rgba(236,72,153,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fce7f3', lineHeight: 1.6 }}>{result.content_brief?.hook}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>TALKING POINTS</div>
                  {(result.content_brief?.talking_points || []).map((p, i) => <div key={i} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #10b981' }}>• {p}</div>)}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>✅ DOs</div>
                  {(result.content_brief?.dos || []).map((d, i) => <div key={i} style={{ fontSize: 12, color: '#6ee7b7', marginBottom: 4 }}>✅ {d}</div>)}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>❌ DON'Ts</div>
                  {(result.content_brief?.donts || []).map((d, i) => <div key={i} style={{ fontSize: 12, color: '#fca5a5', marginBottom: 4 }}>❌ {d}</div>)}
                </div>
              </div>
            </Section>

            {/* Deliverables */}
            <Section title="📦 Deliverables" color="#f59e0b">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(result.deliverables || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '10px 14px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13 }}>{d.type}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{d.duration} · ×{d.quantity}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>⏰ {d.deadline}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Hashtags */}
            <Section title="# Hashtags" color="#8b5cf6">
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>MANDATORY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(result.hashtags_mandatory || []).map((h, i) => (
                    <span key={i} style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 12, padding: '3px 10px', fontWeight: 700 }}>{h}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 6 }}>SUGGESTED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(result.hashtags_suggested || []).map((h, i) => (
                    <span key={i} style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 6, fontSize: 12, padding: '3px 10px' }}>{h}</span>
                  ))}
                </div>
              </div>
            </Section>

            {/* Compensation + KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Section title="💰 Compensation" color="#10b981">
                <div style={{ fontSize: 14, color: '#6ee7b7', fontWeight: 700, marginBottom: 4 }}>{result.compensation?.type}</div>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 800 }}>{result.compensation?.estimate}</div>
                {result.compensation?.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{result.compensation.notes}</div>}
              </Section>
              <Section title="🎯 KPIs" color="#6366f1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{result.kpi?.primary}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc' }}>{result.kpi?.target}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{result.kpi?.secondary}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc' }}>{result.kpi?.target2}</div>
                  </div>
                </div>
              </Section>
            </div>

            {/* Script Outline */}
            {result.script_outline && (
              <Section title="📝 Script Outline" color="#f97316">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#fed7aa', lineHeight: 1.8, flex: 1 }}>{result.script_outline}</div>
                  <CopyBtn text={result.script_outline} />
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
