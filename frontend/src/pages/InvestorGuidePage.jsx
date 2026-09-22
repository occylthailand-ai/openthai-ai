import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const RISK_OPTIONS = [
  { key: 'low', label: '🟢 ต่ำ', desc: 'ปลอดภัย ผลตอบแทนสม่ำเสมอ' },
  { key: 'medium', label: '🟡 กลาง', desc: 'สมดุลระหว่างความเสี่ยงและผลตอบแทน' },
  { key: 'high', label: '🔴 สูง', desc: 'โอกาสได้มาก แต่มีความเสี่ยงสูง' },
];
const GOALS = [
  { key: 'passive_income', label: '💰 รายได้ passive', desc: 'รายได้ประจำโดยไม่ต้องทำงาน' },
  { key: 'capital_growth', label: '📈 เพิ่มทุน', desc: 'ให้เงินงอกเงย long-term' },
  { key: 'business_partner', label: '🤝 ร่วมทุนธุรกิจ', desc: 'เป็นพาร์ทเนอร์กับ OpenThai.ai' },
];

export default function InvestorGuidePage() {
  const [budget, setBudget] = useState(10000);
  const [risk, setRisk] = useState('medium');
  const [goal, setGoal] = useState('passive_income');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGuide = useCallback(async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const r = await fetch(apiUrl('/api/investor-guide'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, risk_level: risk, goal }),
      });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      setResult(await r.json());
    } catch (e) {
      setError('เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally { setLoading(false); }
  }, [budget, risk, goal]);

  const RISK_COLOR = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };

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
          <div style={{ fontSize: 15, fontWeight: 800 }}>💎 Smart Investor Guide</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>ช่องทางลงทุนใน OpenThai.ai สำหรับคนมีทุน</div>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.12))',
          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '20px',
          textAlign: 'center', marginBottom: 28,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💎</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fcd34d', marginBottom: 6 }}>
            ให้เงินทำงานแทนคุณ
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            AI วิเคราะห์แผนการลงทุนที่เหมาะสมที่สุดกับงบและเป้าหมายของคุณ
          </div>
        </div>

        <div style={{
          background: '#1e293b', borderRadius: 14, padding: 24,
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28,
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              งบลงทุน: <span style={{ color: '#fcd34d', fontWeight: 700 }}>{budget.toLocaleString()} บาท</span>
            </div>
            <input type="range" min={1000} max={5000000} step={1000} value={budget}
              onChange={e => setBudget(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
              <span>1,000 บาท</span><span>5,000,000 บาท</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {[5000, 10000, 50000, 100000, 500000].map(v => (
                <button key={v} onClick={() => setBudget(v)} style={{
                  background: budget === v ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${budget === v ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 6, padding: '4px 10px', color: budget === v ? '#fcd34d' : '#94a3b8',
                  cursor: 'pointer', fontSize: 11,
                }}>{v.toLocaleString()}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>ระดับความเสี่ยงที่รับได้</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {RISK_OPTIONS.map(r => (
                <button key={r.key} onClick={() => setRisk(r.key)} style={{
                  flex: 1, background: risk === r.key ? RISK_COLOR[r.key] + '22' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${risk === r.key ? RISK_COLOR[r.key] + '66' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: risk === r.key ? RISK_COLOR[r.key] : '#94a3b8' }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>เป้าหมายการลงทุน</div>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              {GOALS.map(g => (
                <button key={g.key} onClick={() => setGoal(g.key)} style={{
                  background: goal === g.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${goal === g.key ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: goal === g.key ? '#a5b4fc' : '#94a3b8' }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={getGuide} disabled={loading} style={{
            width: '100%', background: loading ? '#374151' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            {loading ? '💎 AI กำลังวิเคราะห์...' : '💎 วิเคราะห์แผนลงทุนของฉัน'}
          </button>
        </div>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 13, color: '#fcd34d', lineHeight: 1.7 }}>{result.summary}</div>
              <div style={{ fontSize: 12, color: '#6ee7b7', marginTop: 10, fontWeight: 600 }}>
                ⚡ เริ่มวันนี้: {result.start_today}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.plans?.map((plan, i) => (
                <div key={i} style={{
                  background: '#1e293b', borderRadius: 12, padding: '16px 18px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{plan.plan_name}</div>
                    <span style={{
                      background: 'rgba(245,158,11,0.15)', color: '#fcd34d',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>{plan.risk}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{plan.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { l: 'เงินลงทุน', v: plan.investment },
                      { l: 'ผลตอบแทน', v: plan.expected_return },
                      { l: 'ระยะเวลา', v: plan.timeline },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fcd34d' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {plan.steps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {plan.steps.map((s, j) => (
                        <div key={j} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 6 }}>
                          <span style={{ color: '#6ee7b7' }}>{j + 1}.</span><span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {result.warning && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#fca5a5',
              }}>⚠️ {result.warning}</div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginTop: 16,
          }}>⚠️ {error}</div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 11 }}>
          ข้อมูลนี้เป็นการให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่คำแนะนำทางการเงินอย่างเป็นทางการ
        </div>
      </div>
    </div>
  );
}
