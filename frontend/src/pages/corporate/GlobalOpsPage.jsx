import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const GlobalOpsPage = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(apiUrl('/api/corporate/global')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  if (!data) return <CorporateLayout title="🌏 Global Operations" subtitle="6 Regions · 241 Platforms · 8 Languages"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const stColor = s => ({ active: '#10b981', expanding: '#f59e0b', planned: '#6b7280' }[s] || '#6b7280');

  return (
    <CorporateLayout title="🌏 Global Operations" subtitle="6 Regions · 241 Platforms Connected · 8 Languages · 35 Countries">

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { icon: '🌍', label: 'Regions',           value: data.regions.length,              color: '#10b981' },
          { icon: '🤖', label: 'Platforms',          value: data.platforms_count,             color: '#6366f1' },
          { icon: '🗣️', label: 'Languages',         value: data.languages_supported.length,  color: '#f59e0b' },
          { icon: '🏢', label: 'Legal Entities',     value: data.entities.length,             color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px' }}>{s.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Regional Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {data.regions.map((r, i) => (
          <div key={i} style={{ background: r.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${stColor(r.status)}30`, borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{r.name}</span>
              <span style={{ fontSize: '11px', color: stColor(r.status), background: `${stColor(r.status)}20`, padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                {r.status === 'active' ? '● Active' : r.status === 'expanding' ? '◑ Expanding' : '○ Planned'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {r.countries.map(c => (
                <span key={c} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', padding: '2px 6px', borderRadius: '6px' }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.countries.length} countries · {r.revenue_pct}% revenue share</div>
          </div>
        ))}
      </div>

      {/* Legal Entities */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>🏢 Legal Entities</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {data.entities.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{e.type} · {e.country}</div>
              </div>
              <span style={{ fontSize: '11px', color: e.status === 'active' ? '#10b981' : '#6b7280', background: e.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '10px' }}>
                {e.status === 'active' ? '✅ Active' : '○ Planned'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>🗣️ Languages Supported</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {data.languages_supported.map((l, i) => (
            <span key={i} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600 }}>{l}</span>
          ))}
        </div>
      </div>
    </CorporateLayout>
  );
};

export default GlobalOpsPage;
