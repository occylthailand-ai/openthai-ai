import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ─── AI Business Starter Kit ──────────────────────────────────────────────────
// ใส่สินค้าครั้งเดียว → มัดรวมหลายทักษะให้ชุดเริ่มต้นในหน้าเดียว (สำหรับ SME ที่ไม่รู้จะเริ่มไหน)
const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'ทั่วไป'];
const card = (extra = {}) => ({ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 18, ...extra });
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputSt = { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '11px 14px', color: '#1e293b', fontSize: 14, boxSizing: 'border-box', outline: 'none' };

export default function StarterKitPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ product: '', category: 'OTOP' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setData(null);
    const body = JSON.stringify({ product: form.product, category: form.category, platform: 'TikTok' });
    const call = (p) => fetch(apiUrl(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.json()).catch(() => null);
    try {
      // มัดรวม 3 ทักษะ: 🎭 Persona (S30) · 🔥 Trend (S10) · #️⃣ Hashtag (S11)
      const [persona, trend, hashtag] = await Promise.all([
        call('/api/skills/persona'), call('/api/skills/trend'), call('/api/skills/hashtag'),
      ]);
      setData({ persona, trend, hashtag });
    } catch { setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
    setLoading(false);
  };

  const indigo = '#6366f1';
  const Section = ({ icon, title, color, children, skill }) => (
    <div style={card({ borderTop: `3px solid ${color}` })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color }}>{icon} {title}</div>
        {skill && <button onClick={() => navigate(`/skills?skill=${skill}`)} style={{ background: 'none', border: `1px solid ${color}55`, color, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>เปิดเต็ม →</button>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>🚀 AI Business Starter Kit</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>ใส่สินค้าครั้งเดียว — ได้ชุดเริ่มต้นจาก 30 ทักษะ AI</div>
        </div>
        <button onClick={() => navigate('/skills')} style={{ background: `linear-gradient(135deg,${indigo},#8b5cf6)`, border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🧠 ทักษะทั้งหมด</button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 5% 0', display: 'grid', gap: 20 }}>
        <div style={card()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12, marginBottom: 12 }}>
            <div><label style={labelSt}>สินค้า/บริการของคุณ *</label><input style={inputSt} placeholder="เช่น น้ำพริกเผา, ครีมสมุนไพร, ผ้าไหม" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} onKeyDown={e => e.key === 'Enter' && run()} /></div>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button onClick={run} disabled={loading} style={{ width: '100%', background: loading ? '#94a3b8' : `linear-gradient(135deg,${indigo},#8b5cf6)`, border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            {loading ? '⏳ AI กำลังเตรียมชุดเริ่มต้น (3 ทักษะ)...' : '🚀 สร้างชุดเริ่มต้นธุรกิจ'}
          </button>
        </div>

        {data && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 🎭 ลูกค้าของคุณ (Persona) */}
            {data.persona?.personas?.length > 0 && (
              <Section icon="🎭" title="ลูกค้าของคุณคือใคร" color="#8b5cf6" skill="S30">
                <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 10 }}>
                  {data.persona.personas.slice(0, 2).map((p, i) => (
                    <div key={i} style={{ background: '#faf5ff', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#8b5cf6', fontStyle: 'italic', marginBottom: 4 }}>{p.tagline}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.demographics}</div>
                      {p.desires?.[0] && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>✨ {p.desires[0]}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 🔥 เทรนด์ (Trend) */}
            {data.trend?.trending_angles?.length > 0 && (
              <Section icon="🔥" title="มุมคอนเทนต์ที่กำลังมา" color="#f97316" skill="S10">
                {data.trend.trending_angles.slice(0, 3).map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, background: '#fff7ed', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1e293b' }}>{a.angle}</span>
                    {a.momentum && <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', whiteSpace: 'nowrap' }}>{a.momentum}</span>}
                  </div>
                ))}
                {data.trend.top_hooks?.[0] && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>🎣 Hook: "{data.trend.top_hooks[0]}"</div>}
              </Section>
            )}

            {/* #️⃣ Hashtags */}
            {data.hashtag?.recommended && (
              <Section icon="#️⃣" title="แฮชแท็กแนะนำ" color="#ec4899" skill="S11">
                <div style={{ background: '#fdf2f8', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1e293b', lineHeight: 1.8, wordBreak: 'break-word' }}>{data.hashtag.recommended}</div>
              </Section>
            )}

            {/* Next steps */}
            <div style={card({ background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', border: '1px solid rgba(99,102,241,0.2)' })}>
              <div style={{ fontWeight: 800, fontSize: 14, color: indigo, marginBottom: 10 }}>👉 ขั้นต่อไป — เจาะลึกแต่ละด้าน</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[['S20', '💰 ตั้งราคา'], ['S18', '🚀 ปั้นยอดขาย'], ['S25', '🔴 สคริปต์ไลฟ์'], ['S22', '📣 วางงบแอด'], ['S24', '📆 ปฏิทินแคมเปญ']].map(([sid, lbl]) => (
                  <button key={sid} onClick={() => navigate(sid === 'S18' ? '/promo-engine' : `/skills?skill=${sid}`)} style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.3)', color: indigo, borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div style={card({ textAlign: 'center', color: '#94a3b8', padding: '36px 20px' })}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>เริ่มต้นธุรกิจด้วย AI ใน 1 คลิก</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>ใส่ชื่อสินค้า แล้ว AI จะวิเคราะห์ลูกค้า · เทรนด์ · แฮชแท็ก ให้พร้อมลุย</div>
          </div>
        )}
      </div>
    </div>
  );
}
