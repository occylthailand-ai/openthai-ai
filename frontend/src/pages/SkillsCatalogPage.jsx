import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ─── Skills Catalog — โชว์ทักษะ AI ทั้งหมดจาก Skills Registry ในที่เดียว ──────────
// ดึง /api/skills (live) → จัดกลุ่มตามหมวด → ลิงก์ไปใช้งานแต่ละทักษะ
const card = (extra = {}) => ({ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 18, ...extra });

const CAT_META = {
  content: { icon: '✍️', label: 'คอนเทนต์', color: '#6366f1' },
  quality: { icon: '✅', label: 'คุณภาพ', color: '#8b5cf6' },
  prompt: { icon: '⚡', label: 'Prompt', color: '#f59e0b' },
  vision: { icon: '👁️', label: 'วิเคราะห์ภาพ', color: '#06b6d4' },
  voice: { icon: '🎙️', label: 'เสียง', color: '#ef4444' },
  evaluation: { icon: '🧐', label: 'ประเมินผล', color: '#f59e0b' },
  context: { icon: '🗂️', label: 'บริบท', color: '#fe2c55' },
  integration: { icon: '🔌', label: 'เชื่อมต่อ', color: '#22c55e' },
  learning: { icon: '🧬', label: 'เรียนรู้', color: '#06b6d4' },
  trend: { icon: '🔥', label: 'เทรนด์', color: '#f97316' },
  hashtag: { icon: '#️⃣', label: 'Hashtag', color: '#ec4899' },
  seo: { icon: '📈', label: 'SEO', color: '#84cc16' },
  sentiment: { icon: '💭', label: 'Sentiment', color: '#a855f7' },
  video: { icon: '🎬', label: 'วิดีโอ', color: '#ef4444' },
  translate: { icon: '🌐', label: 'แปลภาษา', color: '#14b8a6' },
  wisdom: { icon: '☯️', label: 'ปัญญา', color: '#b45309' },
  sales: { icon: '🚀', label: 'ปิดการขาย', color: '#fe2c55' },
  operations: { icon: '🔗', label: 'ปฏิบัติการ', color: '#0ea5e9' },
  pricing: { icon: '💰', label: 'ตั้งราคา', color: '#6366f1' },
  support: { icon: '💬', label: 'บริการลูกค้า', color: '#22c55e' },
};
const catMeta = c => CAT_META[c] || { icon: '✨', label: c, color: '#6366f1' };

// ทักษะ hub (มีหน้าใช้งานใน /skills) — deep-link ตรงแท็บ
const HUB = new Set(['S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S19', 'S20', 'S21']);
function routeFor(s) {
  if (s.id === 'S18') return '/promo-engine';
  if (HUB.has(s.id)) return `/skills?skill=${s.id}`;
  if (s.id === 'S5') return '/voice';
  if (s.id === 'S8') return '/integrations';
  if (s.id === 'S4') return '/ai-tools';
  return '/ai-generator';
}

export default function SkillsCatalogPage() {
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch(apiUrl('/api/skills')).then(r => r.json())
      .then(d => { if (d.success) setReg(d); else setErr('โหลดข้อมูลไม่สำเร็จ'); })
      .catch(() => setErr('ไม่สามารถเชื่อมต่อได้'));
  }, []);

  const skills = (reg?.skills || []).filter(s =>
    !q.trim() || (s.name + s.id + s.category).toLowerCase().includes(q.toLowerCase()));
  const grouped = skills.reduce((acc, s) => { (acc[s.category] = acc[s.category] || []).push(s); return acc; }, {});

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>📚 Skills Catalog</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>ทักษะ AI ทั้งหมดในที่เดียว · อัปเดตสดจาก Skills Registry</div>
        </div>
        {reg && <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', background: 'rgba(14,165,233,0.1)', borderRadius: 20, padding: '4px 12px' }}>{reg.active}/{reg.total} พร้อมใช้ · {reg.ai_engine}</span>}
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 5% 0', display: 'grid', gap: 20 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 ค้นหาทักษะ เช่น ราคา, ลูกค้า, supply..."
          style={{ width: '100%', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '12px 16px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />

        {err && <div style={card({ borderLeft: '4px solid #ef4444', color: '#ef4444', fontSize: 13 })}>⚠️ {err}</div>}
        {!reg && !err && <div style={card({ textAlign: 'center', color: '#94a3b8', padding: 40 })}>⏳ กำลังโหลดแคตตาล็อก...</div>}

        {reg && Object.entries(grouped).map(([cat, list]) => {
          const m = catMeta(cat);
          return (
            <div key={cat}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: m.color }}>{m.label}</span>
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>({list.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                {list.map(s => {
                  const needsKey = s.status === 'needs_key';
                  return (
                    <div key={s.id} onClick={() => navigate(routeFor(s))} style={card({ cursor: 'pointer', borderLeft: `4px solid ${m.color}`, transition: 'transform .15s', display: 'flex', flexDirection: 'column', gap: 6 })}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{s.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: m.color, borderRadius: 6, padding: '2px 7px' }}>{s.id}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{s.method} {s.endpoint}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: needsKey ? '#f59e0b' : '#10b981' }}>{needsKey ? `⚠️ ต้องตั้ง ${s.requires || 'API key'}` : '✅ พร้อมใช้งาน'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>เปิด →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {reg && skills.length === 0 && <div style={card({ textAlign: 'center', color: '#94a3b8', padding: 30 })}>ไม่พบทักษะที่ตรงกับ "{q}"</div>}
      </div>
    </div>
  );
}
