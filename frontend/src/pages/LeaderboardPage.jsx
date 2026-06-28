import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── Affiliate Leaderboard — อันดับพันธมิตร (กระตุ้นการแข่งขัน) ────────────────────
const TIER_META = {
  starter: { label: 'Starter', color: '#10b981' },
  pro:     { label: 'Pro',     color: '#6366f1' },
  elite:   { label: 'Elite',   color: '#f59e0b' },
};
const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetch(apiUrl('/api/affiliate/leaderboard?limit=20'))
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError('โหลดอันดับไม่สำเร็จ'); })
      .catch(() => setError('เชื่อมต่อไม่ได้'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' };
  const baht = (n) => `฿${Number(n || 0).toLocaleString('th-TH')}`;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/earn')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← ศูนย์รายได้</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🏆 อันดับพันธมิตร</h1>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>🔄 รีเฟรช</button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px', display: 'grid', gap: '16px' }}>

        {/* สรุปรวม */}
        {data?.totals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'พันธมิตรทั้งหมด', v: data.totals.affiliates, c: '#a5b4fc' },
              { label: 'ยอดขายรวม', v: data.totals.sales, c: '#6ee7b7' },
              { label: 'ค่าคอมจ่ายรวม', v: baht(data.totals.earned), c: '#fbbf24' },
            ].map((s, i) => (
              <div key={i} style={{ ...card, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>⏳ กำลังโหลดอันดับ…</div>}
        {error && <div style={{ ...card, color: '#fca5a5' }}>{error}</div>}

        {data && !loading && data.leaderboard.length === 0 && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏁</div>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>ยังไม่มีอันดับ — เป็นคนแรกสิ!</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>สมัครพันธมิตร แชร์ลิงก์ ปิดดีลแรก แล้วชื่อคุณจะขึ้นบอร์ดนี้</div>
            <button onClick={() => navigate('/affiliate')} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>สมัครพันธมิตร →</button>
          </div>
        )}

        {/* ตารางอันดับ */}
        {data && data.leaderboard.map(row => {
          const tier = TIER_META[row.tier] || TIER_META.starter;
          const top3 = row.rank <= 3;
          return (
            <div key={row.rank} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', border: top3 ? `1px solid ${tier.color}55` : card.border, background: top3 ? `${tier.color}10` : card.background }}>
              <div style={{ width: '40px', textAlign: 'center', fontSize: top3 ? '24px' : '16px', fontWeight: 900, color: top3 ? undefined : '#64748b' }}>
                {MEDAL[row.rank - 1] || row.rank}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{row.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  <span style={{ color: tier.color, fontWeight: 700 }}>{tier.label}</span> · {row.platform} · {row.total_sales} ดีล · CR {row.conversion_rate}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '16px', color: '#6ee7b7' }}>{baht(row.total_earned)}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ค่าคอมสะสม</div>
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div style={{ ...card, textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
          <div style={{ fontWeight: 800, marginBottom: '6px' }}>อยากขึ้นบอร์ดนี้?</div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>สมัครพันธมิตร รับค่าคอม 20–40% · ยิ่งขายยิ่งเลื่อนขั้น Tier</div>
          <button onClick={() => navigate('/affiliate')} style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>เริ่มเลย →</button>
        </div>
      </div>
    </div>
  );
}
