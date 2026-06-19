import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const OCCUPATIONS = ['นักเรียน/นักศึกษา', 'พนักงานออฟฟิศ', 'แม่บ้าน', 'เกษตรกร', 'คนขับรถ', 'ช่างฝีมือ', 'ครู/อาจารย์', 'ผู้สูงอายุ'];
const PLATFORMS = ['LINE', 'Facebook', 'TikTok', 'Instagram', 'YouTube'];

export default function AffiliateEveryonePage() {
  const [occupation, setOccupation] = useState('');
  const [dailyTime, setDailyTime] = useState(1);
  const [platform, setPlatform] = useState('LINE');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getGuide = useCallback(async () => {
    if (!occupation) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/affiliate-guide'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occupation, daily_time: dailyTime, platform }),
      });
      setResult(await r.json());
    } catch { } finally { setLoading(false); }
  }, [occupation, dailyTime, platform]);

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
          <div style={{ fontSize: 15, fontWeight: 800 }}>🔗 Affiliate สำหรับทุกคน</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>แนะนำสินค้า รับค่าคอม ไม่ต้องสต็อก ทำได้ทุกอาชีพ</div>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{
          background: '#1e293b', borderRadius: 14, padding: 24,
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 18 }}>
            บอก AI เพื่อรับแผน Affiliate ที่เหมาะกับคุณ
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>อาชีพของคุณ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {OCCUPATIONS.map(o => (
                <button key={o} onClick={() => setOccupation(o)} style={{
                  background: occupation === o ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${occupation === o ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, padding: '6px 14px', color: occupation === o ? '#a5b4fc' : '#94a3b8',
                  cursor: 'pointer', fontSize: 12,
                }}>{o}</button>
              ))}
              <input
                placeholder="หรือระบุเอง..."
                value={OCCUPATIONS.includes(occupation) ? '' : occupation}
                onChange={e => setOccupation(e.target.value)}
                style={{
                  background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '6px 12px', color: '#f1f5f9', fontSize: 12,
                  outline: 'none', width: 120,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>เวลาว่างต่อวัน ({dailyTime} ชั่วโมง)</div>
              <input type="range" min={0.5} max={8} step={0.5} value={dailyTime}
                onChange={e => setDailyTime(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
                <span>0.5 ชม.</span><span>8 ชม.</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>แพลตฟอร์มหลัก</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    background: platform === p ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${platform === p ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 6, padding: '4px 10px', color: platform === p ? '#a5b4fc' : '#94a3b8',
                    cursor: 'pointer', fontSize: 11,
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={getGuide} disabled={loading || !occupation} style={{
            width: '100%', background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            {loading ? '🔗 AI กำลังวางแผน...' : '🔗 รับแผน Affiliate ของฉัน'}
          </button>
        </div>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', marginBottom: 4 }}>
                💰 รายได้โดยประมาณ: {result.income_estimate}
              </div>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{result.strategy}</div>
            </div>

            {[
              { title: '📅 Daily Routine', items: result.daily_routine },
              { title: '🛍️ สินค้าที่เหมาะโปรโมท', items: result.best_products },
              { title: '💡 ไอเดียคอนเทนต์', items: result.content_ideas },
              { title: '📆 แผน 7 วันแรก', items: result.first_week_plan },
              { title: '⭐ เคล็ดลับ', items: result.tips },
            ].map(({ title, items }) => items && (
              <div key={title} style={{
                background: '#1e293b', borderRadius: 12, padding: '14px 18px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>{title}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                    <span style={{ color: '#6ee7b7', minWidth: 20 }}>{i + 1}.</span><span>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Affiliate Program v1.0 · แนะนำสินค้า รับค่าคอม ไม่ต้องสต็อก
        </div>
      </div>
    </div>
  );
}
