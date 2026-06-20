import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const TRUTH_ANGLES = [
  { id: 'roi',      icon: '💰', label: 'ROI จริง' },
  { id: 'howworks', icon: '⚙️', label: 'วิธีทำงาน' },
  { id: 'compare',  icon: '⚖️', label: 'เปรียบเทียบ' },
  { id: 'proof',    icon: '📊', label: 'หลักฐาน' },
  { id: 'problem',  icon: '🩹', label: 'แก้ปัญหา' },
  { id: 'demo',     icon: '🎬', label: 'Demo สด' },
];

const PLATFORM_META = {
  facebook:  { icon: '📘', name: 'Facebook',   color: '#1877F2' },
  instagram: { icon: '📸', name: 'Instagram',  color: '#E1306C' },
  tiktok:    { icon: '🎵', name: 'TikTok',     color: '#69C9D0' },
  twitter:   { icon: '🐦', name: 'Twitter/X',  color: '#1DA1F2' },
  line:      { icon: '💚', name: 'LINE OA',    color: '#00B900' },
  telegram:  { icon: '✈️', name: 'Telegram',   color: '#229ED9' },
};

const DAY_OPTIONS = [7, 14, 30];

// Utility: distribute angles across N days
function buildPlan(days, topic, category, selectedAngles) {
  const angles = selectedAngles.length > 0 ? selectedAngles : TRUTH_ANGLES.map(a => a.id);
  return Array.from({ length: days }, (_, i) => {
    const angle = angles[i % angles.length];
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      day: i + 1,
      date: date.toISOString().slice(0, 10),
      angle,
      topic,
      category,
      status: 'pending',
      generated: null,
    };
  });
}

export default function BulkContentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('setup'); // setup | generating | preview | done
  const [form, setForm] = useState({
    topic: '',
    category: 'สินค้าไทย',
    days: 14,
    angles: [],
    platforms: ['facebook', 'instagram'],
    scheduleTime: '09:00',
    affiliateRef: '',
  });
  const [plan, setPlan] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [results, setResults] = useState([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const cancelRef = useRef(false);

  const toggleAngle = id => setForm(f => ({ ...f, angles: f.angles.includes(id) ? f.angles.filter(a => a !== id) : [...f.angles, id] }));
  const togglePlatform = id => setForm(f => ({ ...f, platforms: f.platforms.includes(id) ? f.platforms.filter(p => p !== id) : [...f.platforms, id] }));

  async function startGeneration() {
    if (!form.topic.trim()) return;
    cancelRef.current = false;
    const p = buildPlan(form.days, form.topic, form.category, form.angles);
    setPlan(p);
    setResults([]);
    setProgress({ done: 0, total: p.length, current: '' });
    setStep('generating');

    const token = localStorage.getItem('auth_token');
    const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const generated = [];

    for (let i = 0; i < p.length; i++) {
      if (cancelRef.current) break;
      const item = p[i];
      setProgress({ done: i, total: p.length, current: `วันที่ ${item.day} — ${TRUTH_ANGLES.find(a => a.id === item.angle)?.label || item.angle}` });

      try {
        const res = await fetch(apiUrl('/api/generate'), {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            product: item.topic,
            category: item.category,
            angle: item.angle,
            platform: form.platforms[0] || 'facebook',
            style: 'short',
          }),
        });
        const data = await res.json();
        const g = data.success ? data : null;
        generated.push({ ...item, generated: g, status: g ? 'done' : 'error', error: g ? null : (data.error || 'ล้มเหลว') });
      } catch (e) {
        generated.push({ ...item, generated: null, status: 'error', error: e.message });
      }
      setResults([...generated]);
      // เพิ่ม delay เล็กน้อยเพื่อป้องกัน rate limit
      if (i < p.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    setProgress({ done: p.length, total: p.length, current: '' });
    setStep('preview');
  }

  async function queueAll() {
    const token = localStorage.getItem('auth_token');
    const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let count = 0;
    const successful = results.filter(r => r.status === 'done' && r.generated);

    for (const item of successful) {
      try {
        const scheduleAt = `${item.date}T${form.scheduleTime}:00`;
        await fetch(apiUrl('/api/autopost/queue'), {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            content: {
              hook: item.generated.hook || item.generated.content?.hook || '',
              body: item.generated.body || item.generated.content?.body || '',
              cta:  item.generated.cta  || item.generated.content?.cta  || '',
            },
            hashtags: item.generated.hashtags || [],
            platforms: form.platforms,
            schedule_at: scheduleAt,
            product: item.topic,
            affiliate_ref: form.affiliateRef,
          }),
        });
        count++;
      } catch (_) {}
    }
    setQueuedCount(count);
    setStep('done');
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📦 Bulk Content Generator</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>สร้างเนื้อหา AI 7–30 โพสต์พร้อมกัน · จัดคิวอัตโนมัติ</div>
        </div>
        {step === 'preview' && (
          <button onClick={queueAll}
            style={{ background: 'linear-gradient(135deg,#10b981,#6366f1)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            📅 จัดคิวทั้งหมด ({results.filter(r => r.status === 'done').length} โพสต์)
          </button>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 5% 0' }}>

        {/* ── STEP: SETUP ──────────────────────────────────────────────────────── */}
        {step === 'setup' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Bulk Content Generator</div>
              <div style={{ color: '#64748b', marginTop: 4 }}>กำหนดสินค้า เลือกมุมมอง แล้วปล่อยให้ AI สร้างทั้งเดือน</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>📌 ข้อมูลสินค้า</div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>ชื่อสินค้า / หัวข้อ *</label>
                  <input
                    value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="เช่น ผ้าไหมอุบล, OpenThaiAi, น้ำพริกเผาป้าแดง"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>หมวดหมู่</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', color: '#f8fafc', fontSize: 14, outline: 'none' }}>
                      {['สินค้าไทย', 'อาหาร', 'แฟชั่น', 'ความงาม', 'เทคโนโลยี', 'บริการ', 'อื่นๆ'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Affiliate Ref (optional)</label>
                    <input value={form.affiliateRef} onChange={e => setForm(f => ({ ...f, affiliateRef: e.target.value }))}
                      placeholder="เช่น shop123"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Day selector */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>📅 จำนวนวัน</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {DAY_OPTIONS.map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, days: d }))}
                    style={{ flex: 1, padding: '16px', borderRadius: 12, border: `2px solid ${form.days === d ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: form.days === d ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)', color: form.days === d ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{d}</div>
                    <div style={{ fontSize: 12 }}>วัน · {d} โพสต์</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>เวลาโพสต์แต่ละวัน:</label>
                <input type="time" value={form.scheduleTime} onChange={e => setForm(f => ({ ...f, scheduleTime: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 12px', color: '#f8fafc', fontSize: 13 }} />
              </div>
            </div>

            {/* Truth Angles */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#a5b4fc' }}>🎯 มุมมองเนื้อหา (Truth Angles)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>เลือกหลายมุมมองเพื่อสลับกัน — ถ้าไม่เลือกจะใช้ทุกมุม</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRUTH_ANGLES.map(a => {
                  const on = form.angles.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleAngle(a.id)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${on ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: on ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 400, transition: 'all 0.15s' }}>
                      {a.icon} {a.label}
                    </button>
                  );
                })}
              </div>
              {form.angles.length === 0 && <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>✓ ใช้ทุกมุม ({TRUTH_ANGLES.length} แบบ) สลับวนไป</div>}
            </div>

            {/* Platforms */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>🌐 Platform เป้าหมาย</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(PLATFORM_META).map(([id, meta]) => {
                  const on = form.platforms.includes(id);
                  return (
                    <button key={id} onClick={() => togglePlatform(id)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${on ? meta.color : 'rgba(255,255,255,0.1)'}`, background: on ? `${meta.color}22` : 'rgba(255,255,255,0.03)', color: on ? '#f8fafc' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 400, transition: 'all 0.15s' }}>
                      {meta.icon} {meta.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plan Preview */}
            {form.topic && (
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, marginBottom: 6 }}>📋 แผนที่จะสร้าง</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  สร้าง <strong style={{ color: '#f8fafc' }}>{form.days} โพสต์</strong> เกี่ยวกับ "<strong style={{ color: '#a5b4fc' }}>{form.topic}</strong>"
                  {' '}ด้วย {form.angles.length || TRUTH_ANGLES.length} มุมมอง
                  {' '}→ โพสต์ทุกวันเวลา {form.scheduleTime} น.
                  {' '}บน {form.platforms.map(p => PLATFORM_META[p]?.name || p).join(', ')}
                </div>
              </div>
            )}

            <button onClick={startGeneration} disabled={!form.topic.trim() || form.platforms.length === 0}
              style={{ width: '100%', background: form.topic && form.platforms.length > 0 ? 'linear-gradient(135deg,#6366f1,#10b981)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, padding: '16px', color: '#fff', cursor: form.topic && form.platforms.length > 0 ? 'pointer' : 'not-allowed', fontSize: 16, fontWeight: 700, transition: 'all 0.2s' }}>
              🚀 เริ่มสร้าง {form.days} โพสต์ด้วย AI
            </button>
          </div>
        )}

        {/* ── STEP: GENERATING ─────────────────────────────────────────────────── */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }}>🤖</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>AI กำลังสร้างเนื้อหา...</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>{progress.current}</div>

            <div style={{ maxWidth: 400, margin: '0 auto', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                <span>โพสต์ {progress.done}/{progress.total}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)', borderRadius: 5, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', maxWidth: 600, margin: '24px auto 0' }}>
              {results.map((r, i) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: r.status === 'done' ? '#10b981' : r.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.1)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.3s' }}>
                  {r.status === 'done' ? '✓' : r.status === 'error' ? '✕' : ''}
                </div>
              ))}
            </div>

            <button onClick={() => { cancelRef.current = true; }}
              style={{ marginTop: 32, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 20px', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
              หยุด
            </button>
            <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }`}</style>
          </div>
        )}

        {/* ── STEP: PREVIEW ────────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>✅ สร้างเสร็จแล้ว {results.filter(r => r.status === 'done').length}/{results.length} โพสต์</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ตรวจสอบก่อนจัดคิว หรือจัดคิวทั้งหมดเลย</div>
              </div>
              <button onClick={queueAll}
                style={{ background: 'linear-gradient(135deg,#10b981,#6366f1)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                📅 จัดคิวทั้งหมด
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.map((item, i) => {
                const angle = TRUTH_ANGLES.find(a => a.id === item.angle);
                const hook = item.generated?.hook || item.generated?.content?.hook || '';
                const body = item.generated?.body || item.generated?.content?.body || '';
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${item.status === 'done' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: item.status === 'done' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: item.status === 'done' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {item.status === 'done' ? '✅' : '❌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>วันที่ {item.day}</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{item.date}</span>
                        <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 4, padding: '2px 6px', marginLeft: 8 }}>{angle?.icon} {angle?.label}</span>
                      </div>
                    </div>
                    {item.status === 'done' && hook && (
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fe2c55', marginBottom: 6 }}>🎣 Hook</div>
                        <div style={{ fontSize: 13, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.5 }}>{hook}</div>
                        {body && (
                          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{body.slice(0, 200)}{body.length > 200 ? '…' : ''}</div>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: '#f87171' }}>⚠️ {item.error}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setStep('setup')}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
                ← ตั้งค่าใหม่
              </button>
              <button onClick={queueAll}
                style={{ flex: 2, background: 'linear-gradient(135deg,#10b981,#6366f1)', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                📅 จัดคิว {results.filter(r => r.status === 'done').length} โพสต์ทั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: DONE ───────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>จัดคิวสำเร็จ!</div>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 32 }}>
              {queuedCount} โพสต์เข้าคิวแล้ว · AI จะโพสต์ทุกวันเวลา {form.scheduleTime} น. อัตโนมัติ
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/calendar')}
                style={{ background: 'linear-gradient(135deg,#f59e0b,#fe2c55)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                📅 ดู Content Calendar
              </button>
              <button onClick={() => navigate('/analytics')}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                📊 ดู Analytics
              </button>
              <button onClick={() => { setStep('setup'); setResults([]); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 28px', color: '#94a3b8', cursor: 'pointer', fontSize: 15 }}>
                สร้างชุดใหม่
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
