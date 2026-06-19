import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const DIFFICULTY_CFG = {
  'ง่าย': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'ปานกลาง': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'ท้าทาย': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function PathCard({ path }) {
  const diff = DIFFICULTY_CFG[path.difficulty] || DIFFICULTY_CFG['ปานกลาง'];
  return (
    <div style={{
      background: '#1e293b', borderRadius: 14, padding: 20,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{path.path_name}</div>
        <span style={{
          background: diff.bg, color: diff.color,
          borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600,
        }}>{path.difficulty}</span>
      </div>

      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
        {path.description}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: '⏱️ เริ่มมีรายได้', val: path.timeline },
          { label: '💰 งบที่ต้องใช้', val: path.required_budget },
          { label: '📈 รายได้โดยประมาณ', val: path.income_potential },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{val}</div>
          </div>
        ))}
        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>🚀 ขั้นตอนแรก</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>{path.first_step}</div>
        </div>
      </div>

      {path.tools && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {path.tools.map(t => (
            <span key={t} style={{
              background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
              borderRadius: 6, padding: '2px 8px', fontSize: 11,
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  { icon: '😔', text: 'เพิ่งถูกเลิกจ้าง ไม่รู้จะเริ่มต้นยังไง' },
  { icon: '🎓', text: 'เพิ่งเรียนจบ หางานไม่ได้ มีเวลาว่าง' },
  { icon: '👩‍🍳', text: 'แม่บ้าน อยากหารายได้เสริมจากบ้าน' },
  { icon: '👨‍🌾', text: 'เกษตรกร อยากขายสินค้าออนไลน์' },
];

export default function HopePage() {
  const [situation, setSituation] = useState('');
  const [skills, setSkills] = useState('');
  const [budget, setBudget] = useState('0');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getGuide = useCallback(async () => {
    if (!situation.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/hope'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: situation.trim(), skills: skills.trim(), budget: parseInt(budget) || 0 }),
      });
      setResult(await r.json());
    } catch { } finally { setLoading(false); }
  }, [situation, skills, budget]);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <header style={{
        background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← กลับ</a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🌱 Hope — คนตกงานมีหวัง</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>AI แนะนำเส้นทางสร้างรายได้ใหม่ผ่าน OpenThai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px' }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(99,102,241,0.12))',
          border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '24px',
          textAlign: 'center', marginBottom: 28,
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 }}>
            ทุกคนมีโอกาสเริ่มต้นใหม่
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>
            บอก AI ถึงสถานการณ์ของคุณ — เราจะแนะนำเส้นทางที่เหมาะที่สุด<br />
            เริ่มได้เลย แม้ไม่มีประสบการณ์ ไม่มีทุน
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: '#1e293b', borderRadius: 14, padding: 24,
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>สถานการณ์ของคุณตอนนี้ *</div>
            <textarea
              value={situation}
              onChange={e => setSituation(e.target.value)}
              placeholder="เช่น เพิ่งถูกเลิกจ้าง มีเวลาว่าง แต่ไม่รู้จะเริ่มต้นอะไรดี..."
              rows={3}
              style={{
                width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 13,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {EXAMPLES.map(e => (
                <button key={e.text} onClick={() => setSituation(e.text)} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '4px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 11,
                }}>{e.icon} {e.text}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>ทักษะหรือประสบการณ์ที่มี (ไม่บังคับ)</div>
              <input
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="เช่น ขับรถได้, ทำอาหาร, ใช้มือถือคล่อง..."
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>งบสำรองที่มี (บาท)</div>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            onClick={getGuide}
            disabled={loading || !situation.trim()}
            style={{
              width: '100%', background: loading ? '#374151' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            {loading ? '🌱 AI กำลังวิเคราะห์...' : '🌱 หาเส้นทางใหม่ให้ฉัน'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <>
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, color: '#6ee7b7', lineHeight: 1.7, marginBottom: 10 }}>
                💬 {result.message}
              </div>
              <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>⚡ ทำได้เลยวันนี้</div>
                <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600 }}>{result.today_action}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>เส้นทางที่แนะนำ {result.paths?.length} ทาง</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {result.paths?.map((p, i) => <PathCard key={i} path={p} />)}
            </div>

            {result.encouragement && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(99,102,241,0.1))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 12, padding: '16px 20px', marginTop: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 14, color: '#a5b4fc', lineHeight: 1.7 }}>{result.encouragement}</div>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Hope Program v1.0 · คลิกเดียว ชีวิตเปลี่ยน
        </div>
      </div>
    </div>
  );
}
