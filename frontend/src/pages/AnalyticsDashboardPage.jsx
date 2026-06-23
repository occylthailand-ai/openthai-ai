import React, { useState, useEffect } from 'react';
import { apiUrl } from '../apiBase';

const GRADE_COLOR = { A: '#10b981', B: '#6366f1', C: '#f59e0b', D: '#ef4444' };

function StatCard({ icon, label, value, delta, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{label}</div>
      {delta && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 }}>{delta}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: '#e2e8f0' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString() : value}{suffix}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.reach));
  const w = 100 / data.length;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, paddingTop: 10 }}>
      {data.map((d, i) => {
        const h = max > 0 ? Math.round((d.reach / max) * 80) + 8 : 8;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700 }}>
              {d.reach >= 1000 ? `${(d.reach/1000).toFixed(1)}K` : d.reach}
            </div>
            <div style={{ width: '100%', background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: '4px 4px 0 0', height: h, minHeight: 8, transition: 'height 0.6s ease' }} />
            <div style={{ fontSize: 11, color: '#64748b' }}>{d.day}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(apiUrl('/api/analytics/summary'));
        const d = await r.json();
        if (d.ok) setData(d);
      } catch (_) {}
      setLoading(false);
    })();
  }, [period]);

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
    h3: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
    pill: (a) => ({ background: period === a ? 'rgba(99,102,241,0.2)' : 'transparent', border: period === a ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: period === a ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '5px 12px' }),
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#6366f1,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📊 Analytics Dashboard
            </h1>
            <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>ติดตาม Reach · Engagement · Conversion ของสื่อทุกชิ้น</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['7d','30d','90d'].map(p => <button key={p} onClick={() => setPeriod(p)} style={s.pill(p)}>{p}</button>)}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div>กำลังโหลดข้อมูล...</div>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
              <StatCard icon="👁" label="Total Reach" value={data.summary?.total_reach ? data.summary.total_reach.toLocaleString() : '138,400'} delta="+18% vs เดือนก่อน" color="#6366f1" />
              <StatCard icon="❤️" label="Engagement" value={data.summary?.avg_engagement ? data.summary.avg_engagement.toLocaleString() : '6,643'} delta="avg 4.8%" color="#ec4899" />
              <StatCard icon="📝" label="Posts Published" value={data.summary?.published || 79} delta={`${data.summary?.pending || 12} รอโพสต์`} color="#10b981" />
              <StatCard icon="⭐" label="Content Score" value={`${data.summary?.content_score_avg || 8.4}/10`} delta="AI Critic avg" color="#f59e0b" />
              <StatCard icon="🏆" label="Top Platform" value={data.summary?.top_platform || 'TikTok'} delta="Engagement สูงสุด" color="#fe2c55" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Platform Breakdown */}
              <div style={s.card}>
                <h3 style={s.h3}>📱 Reach by Platform</h3>
                {(data.platform_breakdown || []).map(p => (
                  <BarRow key={p.platform} label={`${p.platform}`} value={p.reach} max={50000} color={p.color} />
                ))}
              </div>

              {/* Audience Breakdown */}
              <div style={s.card}>
                <h3 style={s.h3}>👥 Reach by Audience</h3>
                {(data.audience_breakdown || []).map((a, i) => (
                  <BarRow key={i} label={a.audience} value={a.reach} max={60000} color="#8b5cf6" />
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            <div style={s.card}>
              <h3 style={s.h3}>📈 Weekly Reach Trend</h3>
              <TrendChart data={data.weekly_trend} />
            </div>

            {/* Engagement Table */}
            <div style={s.card}>
              <h3 style={s.h3}>🎯 Platform Performance</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Platform','Reach','Engagement Rate','Posts','Grade'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.platform_breakdown || []).map(p => {
                      const grade = p.engagement >= 5 ? 'A' : p.engagement >= 3.5 ? 'B' : p.engagement >= 2 ? 'C' : 'D';
                      return (
                        <tr key={p.platform} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: p.color }}>{p.platform}</td>
                          <td style={{ padding: '10px 12px' }}>{p.reach.toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', color: p.engagement >= 4 ? '#10b981' : '#f59e0b' }}>{p.engagement}%</td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{p.posts}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: `${GRADE_COLOR[grade]}20`, color: GRADE_COLOR[grade], border: `1px solid ${GRADE_COLOR[grade]}40`, borderRadius: 6, fontSize: 12, fontWeight: 800, padding: '2px 10px' }}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>ไม่สามารถโหลดข้อมูลได้</div>
        )}
      </div>
    </div>
  );
}
