import { useState, useEffect } from 'react';
import { apiBase } from '../apiBase';

const GUILDS = [
  { id: 'ai_ml',      name: 'AI/ML',               icon: '🤖', color: '#6366f1' },
  { id: 'frontend',   name: 'Frontend',             icon: '🎨', color: '#ec4899' },
  { id: 'backend',    name: 'Backend',              icon: '⚙️', color: '#14b8a6' },
  { id: 'data',       name: 'Data/Analytics',       icon: '📊', color: '#f59e0b' },
  { id: 'security',   name: 'Security',             icon: '🔐', color: '#ef4444' },
  { id: 'legal',      name: 'Legal/Compliance',     icon: '⚖️', color: '#8b5cf6' },
  { id: 'blockchain', name: 'Blockchain/Web3',      icon: '🔗', color: '#06b6d4' },
  { id: 'devops',     name: 'DevOps/SRE',           icon: '🚀', color: '#22c55e' },
  { id: 'growth',     name: 'Growth/Community',     icon: '📈', color: '#f97316' },
  { id: 'content',    name: 'Content/Localization', icon: '✍️', color: '#a855f7' },
];

const BIZ_KPIS = [
  { id: 'products_live',    label: 'สินค้าในร้าน',      icon: '📦', target: 20,     fmt: v => v },
  { id: 'producers',        label: 'ผู้ผลิต',           icon: '🏭', target: 50,     fmt: v => v },
  { id: 'orders_total',     label: 'คำสั่งซื้อ',        icon: '🛒', target: 100,    fmt: v => v },
  { id: 'revenue_thb',      label: 'รายได้',            icon: '💰', target: 100000, fmt: v => `฿${(v||0).toLocaleString()}` },
  { id: 'system_readiness', label: 'System Ready',      icon: '✅', target: 100,    fmt: v => `${v}%` },
  { id: 'omise_live',       label: 'Payment Live',      icon: '💳', target: 1,      fmt: v => v ? 'LIVE' : 'Mock' },
];

function RadialGauge({ score, size = 120, color = '#22c55e', label }) {
  const r = (size / 2) - 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor}
          strokeWidth={10} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: scoreColor, fontSize: size * 0.2, fontWeight: 700, transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
          {score}%
        </text>
      </svg>
      {label && <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', maxWidth: size }}>{label}</span>}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = '#22c55e', showLabel = true }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      {showLabel && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{pct}%</div>}
    </div>
  );
}

function GuildCard({ guild, data, onClick, selected }) {
  const score = data?.score ?? 0;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <div onClick={onClick} style={{
      background: selected ? '#1e293b' : '#0f172a',
      border: `1.5px solid ${selected ? guild.color : '#1e293b'}`,
      borderRadius: 12, padding: '16px 14px', cursor: 'pointer',
      transition: 'all .2s', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22 }}>{guild.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginTop: 4 }}>{guild.name}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor }}>{score}%</div>
      </div>
      <ProgressBar value={score} showLabel={false} />
    </div>
  );
}

function KpiDetail({ guild, data }) {
  if (!data?.kpis) return null;
  return (
    <div style={{ background: '#0f172a', border: `1px solid ${guild.color}33`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
        {guild.icon} {guild.name} — KPI Breakdown
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(data.kpis).map(([k, kpi]) => {
          const isLower = ['latency_ms','response_ms','error_rate_pct','lcp_ms','cve_count','last_scan_days','data_fresh_min','mean_recovery_min'].includes(k);
          return (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                  {typeof kpi.value === 'boolean' ? (kpi.value ? 'Yes' : 'No')
                    : kpi.value !== null && kpi.value !== undefined ? String(kpi.value) : '—'}
                  <span style={{ color: '#475569', marginLeft: 6 }}>/ {typeof kpi.target === 'boolean' ? (kpi.target ? 'Yes' : 'No') : kpi.target}</span>
                </span>
              </div>
              <ProgressBar value={kpi.score} showLabel={true} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ history }) {
  if (!history || history.length < 2) return null;
  const w = 560, h = 120, pad = 32;
  const scores = history.map(d => d.overallScore);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((s - minS) / (maxS - minS)) * (h - pad * 2);
    return `${x},${y}`;
  });
  const color = '#6366f1';
  return (
    <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>📉 Trend 30 วัน (Overall Score)</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {scores.map((s, i) => {
          const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
          const y = h - pad - ((s - minS) / (maxS - minS)) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
        })}
        {scores.map((s, i) => {
          const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
          return <text key={i} x={x} y={h - 4} textAnchor="middle" fill="#475569" fontSize={9}>
            {history[i]?.date?.slice(5)}
          </text>;
        })}
      </svg>
    </div>
  );
}

export default function ProgressDashboard() {
  const [snap, setSnap]     = useState(null);
  const [hist, setHist]     = useState([]);
  const [sel, setSel]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);
  const adminKey = localStorage.getItem('adminKey') || '';

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/progress/snapshot`).then(r => r.json()),
      fetch(`${apiBase}/api/progress/history?days=30`).then(r => r.json()),
    ]).then(([s, h]) => {
      if (s.success) setSnap(s);
      if (h.success) setHist(h.history || []);
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const sendReport = async () => {
    setSending(true);
    try {
      const r = await fetch(`${apiBase}/api/progress/daily-report`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      }).then(r => r.json());
      if (r.success) setSent(true);
      else setErr(r.error || 'ส่งไม่สำเร็จ');
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  };

  const overallColor = !snap ? '#475569'
    : snap.overallScore >= 80 ? '#22c55e'
    : snap.overallScore >= 60 ? '#f59e0b'
    : snap.overallScore >= 40 ? '#f97316' : '#ef4444';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: 18 }}>⏳ กำลังโหลดข้อมูล 360°...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>OpenThai.ai</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            360° Progress Dashboard
          </h1>
          <div style={{ color: '#64748b', marginTop: 8, fontSize: 14 }}>
            {snap?.thaiDate || 'ไม่มีข้อมูล'} · อัปเดตอัตโนมัติทุกวัน 23:30 น.
          </div>
        </div>

        {/* Overall Score */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: '32px 48px', textAlign: 'center' }}>
            <RadialGauge score={snap?.overallScore ?? 0} size={160} />
            <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: overallColor }}>
              Overall Score
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>เฉลี่ยจาก 10 Guild</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button onClick={sendReport} disabled={sending || sent} style={{
                background: sent ? '#22c55e' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', cursor: sending || sent ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                {sent ? '✅ ส่งแล้ว' : sending ? '⏳ กำลังส่ง...' : '📤 ส่งรายงานไป Slack'}
              </button>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {hist.length >= 2 && <div style={{ marginBottom: 32 }}><TrendChart history={hist} /></div>}

        {/* Business KPIs */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>📈 Business KPIs</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {BIZ_KPIS.map(k => {
              const biz = snap?.bizKpis?.[k.id];
              const pct = biz?.pct ?? 0;
              const barColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444';
              return (
                <div key={k.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: barColor, marginBottom: 8 }}>
                    {biz ? k.fmt(biz.value) : '—'}
                  </div>
                  <ProgressBar value={pct} showLabel={true} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 10 Guild Grid */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>🏆 10 Guild — ความคืบหน้า</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {GUILDS.map(g => (
              <GuildCard key={g.id} guild={g} data={snap?.guilds?.[g.id]}
                selected={sel === g.id} onClick={() => setSel(sel === g.id ? null : g.id)} />
            ))}
          </div>
        </div>

        {/* KPI Detail Panel */}
        {sel && snap?.guilds?.[sel] && (
          <div style={{ marginBottom: 32 }}>
            <KpiDetail guild={GUILDS.find(g => g.id === sel)} data={snap.guilds[sel]} />
          </div>
        )}

        {/* Error */}
        {err && <div style={{ background: '#7f1d1d', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginTop: 16 }}>⚠️ {err}</div>}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, color: '#334155', fontSize: 12 }}>
          รายงานส่งอัตโนมัติทุกวัน 23:30 น. → #all-openthai-ai · OpenThai.ai AI Monitoring Agent
        </div>
      </div>
    </div>
  );
}
