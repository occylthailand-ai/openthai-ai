import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── Smart Model Router — แดชบอร์ดต้นทุนโทเคน + สถานะ provider ────────────────────
export default function RouterStatusPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch(apiUrl('/api/router/status'))
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError('โหลดสถานะไม่สำเร็จ'); })
      .catch(() => setError('เชื่อมต่อไม่ได้'));
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' };
  const usd = (n) => `$${Number(n || 0).toFixed(4)}`;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← กลับ</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🧠 Smart Model Router</h1>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>🔄</button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px', display: 'grid', gap: '16px' }}>
        {error && <div style={{ ...card, color: '#fca5a5' }}>{error}</div>}

        {data && (
          <>
            {/* งบประมาณวันนี้ */}
            <div style={{ ...card, border: data.eco_mode ? '1px solid rgba(245,158,11,0.4)' : card.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>💰 งบ Token วันนี้ ({data.day})</div>
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '3px 12px', borderRadius: '12px', background: data.eco_mode ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.15)', color: data.eco_mode ? '#fbbf24' : '#6ee7b7' }}>
                  {data.eco_mode ? '🌱 ECO MODE' : '🟢 ปกติ'}
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900 }}>{usd(data.spent_usd)} <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>/ {usd(data.budget_usd)}</span></div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                <div style={{ height: '100%', width: `${Math.min(data.budget_used_pct, 100)}%`, background: data.eco_mode ? 'linear-gradient(90deg,#f59e0b,#f59e0bcc)' : 'linear-gradient(90deg,#10b981,#059669)', transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>ใช้ไป {data.budget_used_pct}% · เรียก AI {data.calls} ครั้งวันนี้{data.eco_mode ? ' · เกินงบ → ใช้เฉพาะรุ่นถูกสุด' : ''}</div>
            </div>

            {/* providers */}
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>⚙️ Provider & ต้นทุน</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {data.providers.map(p => {
                  const bp = data.by_provider[p.id];
                  const healthy = data.health[p.id];
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '12px' }}>{healthy ? '🟢' : '🔴'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.label} {!p.available && <span style={{ fontSize: '11px', color: '#fbbf24' }}>(ยังไม่ตั้ง key)</span>}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>~${p.cost_per_1k_usd}/1k tokens{bp ? ` · ใช้ไป ${bp.calls} ครั้ง · ${usd(bp.usd)}` : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* tiers */}
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>🎚️ การจัดสรรงาน (Tiers)</div>
              {Object.entries(data.tiers).map(([tier, order]) => (
                <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#a5b4fc', fontWeight: 700, textTransform: 'capitalize' }}>{tier}</span>
                  <span style={{ color: '#cbd5e1' }}>{order.join(' → ')}</span>
                </div>
              ))}
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', lineHeight: 1.6 }}>{data.note}</div>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>
              💡 ตั้ง <code>AI_DAILY_BUDGET_USD</code> ใน Vercel เพื่อกำหนดเพดานงบ/วัน · ตั้ง key ของแต่ละค่าย (ANTHROPIC/GEMINI/XAI) เพื่อเปิดใช้ provider จริง — ระบบจะเลือกถูกสุด/สลับค่ายให้อัตโนมัติ
            </div>
          </>
        )}
      </div>
    </div>
  );
}
