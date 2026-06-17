import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const DEPT_CARDS = [
  { icon: '👑', label: 'Board of Directors',   route: '/corporate/board',      color: '#f59e0b', status: 'Active', members: 3 },
  { icon: '🔍', label: 'Audit Committee',       route: '/corporate/audit',      color: '#6366f1', status: 'Active', members: 3 },
  { icon: '📈', label: 'Investor Relations',    route: '/corporate/ir',         color: '#10b981', status: 'Setting Up', members: 1 },
  { icon: '⚖️', label: 'Compliance & Legal',    route: '/corporate/compliance', color: '#ef4444', status: 'Active', members: 1 },
  { icon: '💰', label: 'Finance & Accounting',  route: '/corporate/finance',    color: '#f59e0b', status: 'Active', members: 1 },
  { icon: '👥', label: 'Human Resources',        route: '/corporate/hr',         color: '#8b5cf6', status: 'Setting Up', members: 1 },
  { icon: '🤖', label: 'Technology & AI',        route: '/corporate/it',         color: '#06b6d4', status: 'Active', members: 2 },
  { icon: '📢', label: 'Marketing & Sales',      route: '/corporate/marketing',  color: '#fe2c55', status: 'Active', members: 1 },
  { icon: '🌏', label: 'Global Operations',      route: '/corporate/global',     color: '#10b981', status: 'Expanding', members: 1 },
  { icon: '🎯', label: 'Strategy & Biz Dev',     route: '/corporate/strategy',   color: '#6366f1', status: 'Active', members: 1 },
  { icon: '🌿', label: 'ESG & Sustainability',   route: '/corporate/esg',        color: '#22c55e', status: 'Setting Up', members: 1 },
  { icon: '📊', label: 'IPO Roadmap',            route: '/corporate/ipo',        color: '#f59e0b', status: 'Planning', members: 1 },
];

const IPO_PHASES = [
  { phase: 'Phase 1', title: 'Pre-Series A',       year: '2025', milestone: 'MRR ฿500K+',          status: 'in_progress', pct: 15 },
  { phase: 'Phase 2', title: 'Series A',           year: '2026', milestone: '฿5M MRR · 10K users', status: 'planned',     pct: 0  },
  { phase: 'Phase 3', title: 'Series B / Pre-IPO', year: '2026', milestone: '฿100M Revenue',       status: 'planned',     pct: 0  },
  { phase: 'Phase 4', title: 'IPO — MAI/SET',      year: '2027', milestone: 'Market Cap ฿1B+',     status: 'planned',     pct: 0  },
];

const GLOBAL_REGIONS = [
  { flag: '🇹🇭', name: 'Southeast Asia', status: 'active',    color: '#10b981' },
  { flag: '🇨🇳', name: 'East Asia',      status: 'expanding', color: '#f59e0b' },
  { flag: '🇮🇳', name: 'South Asia',     status: 'planned',   color: '#6366f1' },
  { flag: '🇦🇪', name: 'Middle East',    status: 'planned',   color: '#6366f1' },
  { flag: '🇪🇺', name: 'Europe',         status: 'planned',   color: '#6366f1' },
  { flag: '🇺🇸', name: 'North America',  status: 'planned',   color: '#6366f1' },
];

const statusColor = s => ({ active: '#10b981', expanding: '#f59e0b', planned: '#6b7280', 'in_progress': '#6366f1', 'Setting Up': '#f59e0b', Active: '#10b981', Planning: '#6366f1', Expanding: '#f59e0b' }[s] || '#6b7280');

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/health')).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  return (
    <CorporateLayout title="🏛️ Corporate Overview" subtitle="OpenThaiAi Public Company Limited — Global AI Platform">

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: '🌏', label: 'Markets Served',    value: '6',    sub: 'Regions Global',         color: '#10b981' },
          { icon: '🤖', label: 'AI Platform',        value: '241',  sub: 'Platforms Connected',    color: '#6366f1' },
          { icon: '👥', label: 'Global Team',        value: '15',   sub: 'Positions Planned',      color: '#f59e0b' },
          { icon: '📊', label: 'IPO Target',         value: '2027', sub: 'MAI/SET Listing',        color: '#fe2c55' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI System Status */}
      {health && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '28px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc' }}>🤖 AI Engine Live</div>
          <div style={{ fontSize: '13px', color: '#d1d5db' }}>{health.ai_primary}</div>
          <div style={{ fontSize: '13px', color: '#d1d5db' }}>{health.ai_fallback}</div>
          <div style={{ fontSize: '13px', color: '#6ee7b7' }}>✅ {health.active_agents} Active Agents</div>
          <div style={{ fontSize: '13px', color: '#6ee7b7' }}>✅ {health.affiliates} Affiliates</div>
          <div style={{ fontSize: '11px', color: '#4b5563', marginLeft: 'auto' }}>Uptime: {Math.floor((health.uptime_sec || 0) / 3600)}h {Math.floor(((health.uptime_sec||0) % 3600) / 60)}m</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

        {/* IPO Roadmap */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 IPO Roadmap <span style={{ fontSize: '11px', background: 'rgba(245,158,11,0.15)', color: '#fcd34d', padding: '2px 8px', borderRadius: '10px' }}>SET/MAI 2027</span></h3>
          {IPO_PHASES.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: p.status === 'in_progress' ? '#6366f1' : 'rgba(255,255,255,0.08)', border: `2px solid ${p.status === 'in_progress' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{p.title}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.year}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>{p.milestone}</div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${p.pct || (p.status === 'in_progress' ? 15 : 0)}%`, background: p.status === 'in_progress' ? '#6366f1' : '#374151', borderRadius: '2px', transition: 'width 1s' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Presence */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px' }}>🌏 Global Presence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {GLOBAL_REGIONS.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{r.flag}</span>
                <span style={{ flex: 1, fontSize: '13px', color: '#e5e7eb' }}>{r.name}</span>
                <span style={{ fontSize: '11px', color: statusColor(r.status), background: `${statusColor(r.status)}20`, padding: '2px 10px', borderRadius: '20px', fontWeight: 600 }}>
                  {r.status === 'active' ? '● Active' : r.status === 'expanding' ? '◑ Expanding' : '○ Planned'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', fontSize: '12px', color: '#6ee7b7' }}>
            🌐 รองรับ 8 ภาษา · 241 Platforms · 6 Regions
          </div>
        </div>
      </div>

      {/* Department Grid */}
      <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>แผนกทั้งหมด</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {DEPT_CARDS.map((d, i) => (
          <div key={i} onClick={() => navigate(d.route)}
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${d.color}12`; e.currentTarget.style.borderColor = `${d.color}40`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{d.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#e5e7eb' }}>{d.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: statusColor(d.status), fontWeight: 600 }}>● {d.status}</span>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>{d.members} คน</span>
            </div>
          </div>
        ))}
      </div>

    </CorporateLayout>
  );
};

export default CorporateDashboard;
