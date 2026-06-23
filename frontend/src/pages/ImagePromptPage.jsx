import React, { useState } from 'react';
import { apiUrl } from '../apiBase';

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '▶️', ratio: '9:16' },
  { id: 'instagram', label: 'Instagram', icon: '📸', ratio: '1:1' },
  { id: 'facebook', label: 'Facebook', icon: '👥', ratio: '4:5' },
  { id: 'shopee', label: 'Shopee', icon: '🟠', ratio: '1:1' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', ratio: '16:9' },
];

const MOODS = [
  { id: 'vibrant', label: 'สดใส / Vibrant', icon: '🎨' },
  { id: 'elegant', label: 'หรูหรา / Elegant', icon: '✨' },
  { id: 'natural', label: 'ธรรมชาติ / Natural', icon: '🌿' },
  { id: 'bold', label: 'โดดเด่น / Bold', icon: '💥' },
];

const STYLES = [
  { id: 'photorealistic', label: 'Photo Real', icon: '📷' },
  { id: 'illustrative', label: 'Illustration', icon: '🎭' },
  { id: 'minimal', label: 'Minimal', icon: '⬜' },
  { id: 'luxury', label: 'Luxury', icon: '👑' },
];

const CATEGORIES = ['สินค้าอาหาร','สินค้าเกษตร','ความงาม','สุขภาพ','แฟชัน/สิ่งทอ','หัตถกรรม','SME / ธุรกิจ','ท่องเที่ยว'];
const AUDIENCES = ['ผู้ผลิต','ผู้ขาย','ผู้บริโภค','ตัวแทนจำหน่าย','ตัวแทนข้ามชาติ','SME ไทย','เกษตรกรรม'];

function CopyBlock({ label, text, color = '#6366f1' }) {
  const [c, setC] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
          style={{ background: c ? '#10b981' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '3px 10px' }}>
          {c ? '✓ Copied!' : '⧉ Copy'}
        </button>
      </div>
      <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, wordBreak: 'break-word' }}>
        {text}
      </div>
    </div>
  );
}

export default function ImagePromptPage() {
  const [form, setForm] = useState({ product: '', category: 'สินค้าอาหาร', platform: 'tiktok', mood: 'vibrant', style: 'photorealistic', audience: 'ผู้บริโภค' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.product.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/skills/image-prompt'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) setResult(d);
    } catch (_) {}
    setLoading(false);
  };

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
    lbl: { fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    chip: (sel, color = '#6366f1') => ({ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 400, background: sel ? `${color}25` : 'rgba(255,255,255,0.05)', color: sel ? '#fff' : '#64748b', border: sel ? `1px solid ${color}60` : '1px solid transparent' }),
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎨 Image Prompt Generator
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>สร้าง Prompt ภาพสำหรับ Midjourney · DALL-E · Stable Diffusion</p>
        </div>

        <div style={s.card}>
          {/* Product */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>ชื่อสินค้า / Product</label>
            <input value={form.product} onChange={e => setF('product', e.target.value)} placeholder="เช่น น้ำพริกป้าแดง, ผ้าไหมอุบล, กาแฟดอยอินทนนท์..." style={s.inp} />
          </div>

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>หมวดหมู่</label>
            <select value={form.category} onChange={e => setF('category', e.target.value)} style={s.inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Platform */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>Platform (Aspect Ratio)</label>
            <div style={s.chipRow}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setF('platform', p.id)} style={s.chip(form.platform === p.id, '#ec4899')}>
                  {p.icon} {p.label} <span style={{ opacity: 0.6, fontSize: 11 }}>{p.ratio}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood + Style */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={s.lbl}>Mood / อารมณ์</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => setF('mood', m.id)} style={s.chip(form.mood === m.id, '#8b5cf6')}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={s.lbl}>Style / สไตล์</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STYLES.map(st => (
                  <button key={st.id} onClick={() => setF('style', st.id)} style={s.chip(form.style === st.id, '#f59e0b')}>
                    {st.icon} {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audience */}
          <div style={{ marginBottom: 18 }}>
            <label style={s.lbl}>กลุ่มเป้าหมาย</label>
            <div style={s.chipRow}>
              {AUDIENCES.map(a => (
                <button key={a} onClick={() => setF('audience', a)} style={s.chip(form.audience === a, '#10b981')}>{a}</button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading || !form.product.trim()} style={{
            background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff',
            cursor: 'pointer', fontSize: 15, fontWeight: 800, padding: '13px 28px', width: '100%', opacity: !form.product.trim() ? 0.5 : 1,
          }}>
            {loading ? '🎨 กำลังสร้าง Prompt...' : '🎨 สร้าง Image Prompt'}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#8b5cf6' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1s infinite' }}>🎨</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>กำลังสร้าง Prompt สำหรับ AI Image...</div>
          </div>
        )}

        {result && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>🎨 Image Prompts — {form.product}</h2>
              <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, fontSize: 11, padding: '3px 10px', fontWeight: 700 }}>{result.source?.toUpperCase()}</span>
            </div>

            <CopyBlock label="🅜 Midjourney Prompt" text={result.midjourney || ''} color="#6366f1" />
            <CopyBlock label="🅓 DALL-E 3 Prompt" text={result.dalle || ''} color="#10b981" />
            <CopyBlock label="🅢 Stable Diffusion Prompt" text={result.stable_diffusion || ''} color="#f59e0b" />

            {result.negative_prompt && (
              <CopyBlock label="🚫 Negative Prompt" text={result.negative_prompt} color="#ef4444" />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              {result.composition && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>📐 Composition</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{result.composition}</div>
                </div>
              )}
              {result.color_palette?.length > 0 && (
                <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#ec4899', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>🎨 Color Palette</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {result.color_palette.map((c, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: c, border: '2px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ fontSize: 10, color: '#64748b' }}>{c}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {result.thai_caption && (
              <div style={{ marginTop: 14 }}>
                <CopyBlock label="🇹🇭 Thai Caption" text={result.thai_caption} color="#10b981" />
                <CopyBlock label="🇬🇧 English Caption" text={result.en_caption || ''} color="#6366f1" />
              </div>
            )}

            {result.style_tags?.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.style_tags.map((t, i) => (
                  <span key={i} style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, fontSize: 12, padding: '3px 10px' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
