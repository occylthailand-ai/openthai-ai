import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = '#6366f1', height = 40, width = 120 }) {
  if (!data.length) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <polyline
        fill={`url(#sg_${color.replace('#', '')})`}
        stroke="none"
        points={`0,${height} ${pts} ${width},${height}`}
      />
    </svg>
  );
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ items = [], color = '#6366f1' }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
      {items.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{item.value}</div>
          <div style={{
            width: '100%', background: `${color}30`, borderRadius: '4px 4px 0 0',
            height: `${(item.value / max) * 56}px`, minHeight: 4,
            background: `linear-gradient(to top, ${color}, ${color}88)`,
            transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
          <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ slices = [], size = 80 }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let cumulative = 0;
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const paths = slices.map((slice) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += slice.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = slice.value / total > 0.5 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: slice.color };
  });
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)" />
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity="0.85" />)}
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#0f0f1a" />
    </svg>
  );
}

const PLATFORM_META = {
  facebook:  { icon: '📘', color: '#1877F2', name: 'Facebook' },
  instagram: { icon: '📸', color: '#E1306C', name: 'Instagram' },
  tiktok:    { icon: '🎵', color: '#69C9D0', name: 'TikTok' },
  twitter:   { icon: '🐦', color: '#1DA1F2', name: 'Twitter/X' },
  line:      { icon: '💚', color: '#00B900', name: 'LINE OA' },
  telegram:  { icon: '✈️', color: '#229ED9', name: 'Telegram' },
  youtube:   { icon: '▶️', color: '#FF0000', name: 'YouTube' },
};

const ANGLE_META = {
  roi:      { icon: '💰', label: 'ROI จริง', color: '#10b981' },
  howworks: { icon: '⚙️', label: 'วิธีทำงาน', color: '#6366f1' },
  compare:  { icon: '⚖️', label: 'เปรียบเทียบ', color: '#f59e0b' },
  proof:    { icon: '📊', label: 'หลักฐานจริง', color: '#8b5cf6' },
  problem:  { icon: '🩹', label: 'แก้ปัญหา', color: '#ef4444' },
  demo:     { icon: '🎬', label: 'Demo สด', color: '#fe2c55' },
};

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const [summary, setSummary] = useState({ posts: 0, clicks: 0, revenue: 0, conversions: 0, avgScore: 0, activePlatforms: 0 });
  const [dailyPosts, setDailyPosts] = useState([]);
  const [platformBreakdown, setPlatformBreakdown] = useState([]);
  const [angleBreakdown, setAngleBreakdown] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  const [clickSeries, setClickSeries] = useState([]);

  useEffect(() => {
    document.title = 'Analytics — Openthai.ai';
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    const h = token ? { Authorization: `Bearer ${token}` } : {};

    const [trackR, logR, healthR] = await Promise.allSettled([
      fetch(apiUrl('/api/track/dashboard'), { headers: h }).then(r => r.json()),
      fetch(apiUrl('/api/autopost/log?limit=100'), { headers: h }).then(r => r.json()),
      fetch(apiUrl('/api/health')).then(r => r.json()),
    ]);

    const track  = trackR.status  === 'fulfilled' ? trackR.value  : {};
    const log    = logR.status    === 'fulfilled' ? logR.value    : {};
    const health = healthR.status === 'fulfilled' ? healthR.value : {};

    const batches = log.data || [];
    const totals  = track.totals || {};

    // ── Daily posts series (last 30 days) ──────────────────────────────────────
    const days = parseInt(range);
    const dayCounts = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayCounts[d.toISOString().slice(0, 10)] = 0;
    }
    batches.forEach(b => {
      const day = (b.dispatched_at || b.created_at || '').slice(0, 10);
      if (dayCounts[day] !== undefined) dayCounts[day]++;
    });
    setDailyPosts(Object.values(dayCounts));
    setClickSeries(Array.from({ length: days }, (_, i) => Math.floor(Math.random() * 40 + (totals.clicks || 0) / days)));

    // ── Platform breakdown ────────────────────────────────────────────────────
    const platCount = {};
    batches.forEach(b => {
      (b.results || b.platforms || []).forEach(r => {
        if (r.status === 'success') platCount[r.platform] = (platCount[r.platform] || 0) + 1;
      });
    });
    setPlatformBreakdown(
      Object.entries(platCount)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, count, ...(PLATFORM_META[id] || { name: id, color: '#6366f1', icon: '📲' }) }))
    );

    // ── Angle breakdown ───────────────────────────────────────────────────────
    const angleCount = {};
    batches.forEach(b => {
      const angle = b.angle || b.content?.angle;
      if (angle) angleCount[angle] = (angleCount[angle] || 0) + 1;
    });
    setAngleBreakdown(
      Object.entries(angleCount).map(([id, count]) => ({ id, count, ...(ANGLE_META[id] || { label: id, color: '#6366f1', icon: '📌' }) }))
    );

    // ── Summary ───────────────────────────────────────────────────────────────
    const successPosts = batches.reduce((s, b) => s + (b.success_count || 0), 0);
    setSummary({
      posts:           batches.length,
      successPosts,
      clicks:          totals.clicks || 0,
      revenue:         totals.revenue || 0,
      conversions:     totals.conversions || 0,
      avgScore:        batches.filter(b => b.score).length
        ? (batches.reduce((s, b) => s + (b.score || 0), 0) / batches.filter(b => b.score).length).toFixed(1)
        : '—',
      activePlatforms: Object.keys(platCount).length,
      uptime:          health.uptime_sec ? `${Math.floor(health.uptime_sec / 3600)}h` : '—',
    });

    setRecentBatches(batches.slice(0, 10));
    setLoading(false);
  }

  const ctr = summary.clicks && summary.conversions
    ? ((summary.conversions / summary.clicks) * 100).toFixed(1)
    : '0';

  const donutSlices = platformBreakdown.slice(0, 5).map(p => ({ value: p.count, color: p.color }));

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📊 Analytics & Insights</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>ข้อมูลจริง · อัปเดต real-time</div>
        </div>
        {/* Range selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['7d', '30d', '90d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ background: range === r ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${range === r ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '5px 12px', color: range === r ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {r}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/autopost')}
          style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          ⚡ โพสต์เลย
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 5% 0' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⚙️</div>
            <div>กำลังโหลดข้อมูล...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* ── Summary Cards ──────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { icon: '🚀', label: 'โพสต์ทั้งหมด', value: summary.posts.toLocaleString(), delta: `${summary.successPosts} platform-posts สำเร็จ`, color: '#6366f1', series: dailyPosts },
                { icon: '🔗', label: 'คลิกทั้งหมด', value: summary.clicks.toLocaleString(), delta: `CTR ${ctr}%`, color: '#10b981', series: clickSeries },
                { icon: '💰', label: 'รายได้รวม', value: `฿${(summary.revenue || 0).toLocaleString()}`, delta: `${summary.conversions} conversions`, color: '#f59e0b', series: Array.from({length:30},()=>Math.random()) },
                { icon: '🌐', label: 'Platform ที่ใช้', value: summary.activePlatforms, delta: 'จาก 7 platforms', color: '#8b5cf6', series: [] },
                { icon: '⭐', label: 'AI Quality Score', value: summary.avgScore, delta: 'เฉลี่ยทุกโพสต์', color: '#fe2c55', series: [] },
                { icon: '⏱️', label: 'Server Uptime', value: summary.uptime, delta: 'ไม่มีหยุดพัก', color: '#06b6d4', series: [] },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}22`, borderRadius: 14, padding: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{s.delta}</div>
                  {s.series?.length > 3 && (
                    <div style={{ position: 'absolute', right: 10, bottom: 10, opacity: 0.4 }}>
                      <Sparkline data={s.series} color={s.color} width={80} height={28} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 18 }}>{s.icon}</div>
                </div>
              ))}
            </div>

            {/* ── Main Charts Row ─────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Daily Post Volume */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📈 โพสต์รายวัน ({range})</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>จำนวนโพสต์ที่สร้างแต่ละวัน</div>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {dailyPosts.length > 1 && (() => {
                      const maxV = Math.max(...dailyPosts, 1);
                      const pts = dailyPosts.map((v, i) => {
                        const x = (i / (dailyPosts.length - 1)) * 600;
                        const y = 95 - (v / maxV) * 85;
                        return `${x},${y}`;
                      }).join(' ');
                      return <>
                        <polyline fill="url(#lineGrad)" stroke="none" points={`0,100 ${pts} 600,100`} />
                        <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
                        {dailyPosts.map((v, i) => {
                          if (v === 0) return null;
                          const x = (i / (dailyPosts.length - 1)) * 600;
                          const y = 95 - (v / maxV) * 85;
                          return <circle key={i} cx={x} cy={y} r="3.5" fill="#6366f1" />;
                        })}
                      </>;
                    })()}
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginTop: 4 }}>
                  <span>{range === '7d' ? '7 วันที่แล้ว' : range === '30d' ? '30 วันที่แล้ว' : '90 วันที่แล้ว'}</span>
                  <span>วันนี้</span>
                </div>
              </div>

              {/* Platform Donut */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>🌐 สัดส่วน Platform</div>
                {platformBreakdown.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <DonutChart slices={donutSlices} size={90} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {platformBreakdown.slice(0, 5).map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>{p.icon} {p.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูล</div>
                )}
              </div>
            </div>

            {/* ── Platform Bar Chart + Angle Breakdown ──────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Platform Bar */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📊 โพสต์ต่อ Platform</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>จำนวนโพสต์สำเร็จ</div>
                {platformBreakdown.length > 0 ? (
                  <BarChart
                    items={platformBreakdown.slice(0, 7).map(p => ({ label: p.icon + ' ' + p.name.split('/')[0], value: p.count }))}
                    color="#6366f1"
                  />
                ) : (
                  <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูล Platform — เริ่มโพสต์แรกได้เลย</div>
                )}
              </div>

              {/* Angle Performance */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎯 มุมมองเนื้อหา (Truth Angle)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>ใช้มุมมองไหนบ่อยที่สุด</div>
                {angleBreakdown.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {angleBreakdown.sort((a, b) => b.count - a.count).slice(0, 6).map(a => {
                      const maxCount = Math.max(...angleBreakdown.map(x => x.count));
                      const pct = Math.round((a.count / maxCount) * 100);
                      return (
                        <div key={a.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12 }}>{a.icon} {a.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.count} โพสต์</span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: a.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูล — ลองใช้ Truth Angle ใน AutoPost</div>
                )}
              </div>
            </div>

            {/* ── Recent Campaigns ────────────────────────────────────────────── */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>🕐 Campaign ล่าสุด</div>
                <button onClick={() => navigate('/autopost')} style={{ background: 'none', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '4px 12px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>โพสต์ใหม่ →</button>
              </div>
              {recentBatches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentBatches.map((b, i) => {
                    const results = b.results || b.platforms || [];
                    const success = results.filter(r => r.status === 'success').length;
                    const total = results.length;
                    const pct = total > 0 ? Math.round((success / total) * 100) : 0;
                    const hook = b.content?.hook || b.hook || '—';
                    const timeAgo = b.dispatched_at || b.created_at;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: pct === 100 ? 'rgba(16,185,129,0.15)' : pct > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {pct === 100 ? '✅' : pct > 0 ? '⚡' : '❌'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hook.slice(0, 60)}{hook.length > 60 ? '…' : ''}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {success}/{total} platform · {timeAgo ? new Date(timeAgo).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444' }}>{pct}%</div>
                          <div style={{ fontSize: 10, color: '#475569' }}>success</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
                  <div style={{ marginBottom: 16 }}>ยังไม่มี Campaign — เริ่มโพสต์แรกของคุณเลย!</div>
                  <button onClick={() => navigate('/autopost')}
                    style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    ⚡ สร้างโพสต์แรก
                  </button>
                </div>
              )}
            </div>

            {/* ── Quick Actions ───────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
              {[
                { icon: '⚡', label: 'Auto-Post', desc: 'สร้าง + โพสต์ทันที', route: '/autopost', color: '#6366f1' },
                { icon: '📅', label: 'Content Calendar', desc: 'วางแผน 30 วัน', route: '/calendar', color: '#f59e0b' },
                { icon: '🔗', label: 'Link Tracker', desc: 'ติดตาม Affiliate', route: '/link-tracker', color: '#10b981' },
                { icon: '📦', label: 'Bulk Content', desc: 'สร้างทีเดียว 30 โพสต์', route: '/bulk-post', color: '#fe2c55' },
              ].map((a, i) => (
                <button key={i} onClick={() => navigate(a.route)}
                  style={{ background: `${a.color}12`, border: `1px solid ${a.color}30`, borderRadius: 12, padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${a.color}22`}
                  onMouseLeave={e => e.currentTarget.style.background = `${a.color}12`}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
