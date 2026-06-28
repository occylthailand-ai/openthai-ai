import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── OpenThaiAi Council — ห้องที่ AI 3 เจ้าช่วยกันวิเคราะห์ + สังเคราะห์ข้อสรุป ─────
// Claude (Anthropic) · Gemini (Google) · Grok (xAI) วิเคราะห์เรื่องเดียวกัน แล้วสรุปร่วม

const SAMPLE_TOPICS = [
  'ทำยังไงให้ OpenThaiAi เป็นที่ยอมรับในตลาดโลก',
  'จะหารายได้ ฿1,000/วันจากระบบ affiliate อย่างยั่งยืนได้อย่างไร',
  'ฟีเจอร์ไหนควรทำต่อเพื่อให้แพลตฟอร์มโตเร็วที่สุด',
];

export default function CouncilPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async (t) => {
    const q = (t ?? topic).trim();
    if (!q) { setError('พิมพ์หัวข้อที่จะให้ที่ประชุมวิเคราะห์ก่อน'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/council'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'ที่ประชุมขัดข้อง');
      setResult(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← กลับ</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🏛️ OpenThaiAi Council</h1>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 20px', display: 'grid', gap: '18px' }}>

        <div style={{ ...card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
            ห้องประชุมที่ AI 3 เจ้าช่วยกันวิเคราะห์: <strong style={{ color: '#c4b5fd' }}>🟣 Claude</strong> (สถาปัตยกรรม/ความปลอดภัย) · <strong style={{ color: '#93c5fd' }}>🔵 Gemini</strong> (ตลาด/ข้อมูล) · <strong style={{ color: '#e5e7eb' }}>⚫ Grok</strong> (การเติบโต) → แล้วสังเคราะห์เป็นข้อสรุปร่วม
          </div>
        </div>

        <div style={card}>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
            placeholder="พิมพ์หัวข้อ/ปัญหาที่อยากให้ที่ประชุมช่วยวิเคราะห์…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '15px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {SAMPLE_TOPICS.map((s, i) => (
              <button key={i} onClick={() => { setTopic(s); run(s); }} style={{ padding: '7px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#a5b4fc', fontSize: '12px', cursor: 'pointer' }}>💡 {s.length > 32 ? s.slice(0, 32) + '…' : s}</button>
            ))}
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', color: '#fca5a5', marginTop: '12px', fontSize: '13px' }}>{error}</div>}
          <button onClick={() => run()} disabled={loading}
            style={{ width: '100%', marginTop: '14px', padding: '15px', borderRadius: '12px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '🏛️ ที่ประชุมกำลังวิเคราะห์…' : '🏛️ เริ่มประชุม'}
          </button>
        </div>

        {result && (
          <>
            {result.voices.map(v => (
              <div key={v.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>{v.icon} {v.name}</span>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{v.role}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: v.live ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: v.live ? '#6ee7b7' : '#fbbf24', whiteSpace: 'nowrap' }}>
                    {v.live ? '🟢 LIVE' : '🟡 จำลอง'}
                  </span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px', color: '#e5e7eb', lineHeight: 1.65 }}>{v.text}</pre>
              </div>
            ))}

            <div style={{ ...card, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#6ee7b7' }}>📋 ข้อสรุปร่วม (Synthesis)</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: result.synthesis_live ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: result.synthesis_live ? '#6ee7b7' : '#fbbf24' }}>
                  {result.synthesis_live ? '🟢 LIVE' : '🟡 จำลอง'}
                </span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px', color: '#e5e7eb', lineHeight: 1.65 }}>{result.synthesis}</pre>
            </div>

            {!result.any_live && (
              <div style={{ fontSize: '12px', color: '#fbbf24', lineHeight: 1.6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px' }}>
                🟡 ตอนนี้รันโหมดจำลอง — ตั้ง <code>ANTHROPIC_API_KEY</code>, <code>GEMINI_API_KEY</code>, <code>XAI_API_KEY</code> ใน Vercel เพื่อให้ AI จริงทั้ง 3 เจ้าวิเคราะห์
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
