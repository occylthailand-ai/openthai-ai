import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const stColor = s => ({ ok: '#10b981', in_progress: '#6366f1', pending: '#6b7280', partial: '#f59e0b' }[s] || '#6b7280');

const ESGPage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    fetch(apiUrl('/api/corporate/esg')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  if (!data) return <CorporateLayout title="🌿 ESG & Sustainability" subtitle="Environmental · Social · Governance"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const { score, environmental, social, governance, sdg_alignment } = data;

  return (
    <CorporateLayout title="🌿 ESG & Sustainability" subtitle="UN SDGs · SET ESG Reporting · Carbon Neutral · Social Impact">

      {/* Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Environmental', value: score.environmental, max: 100, color: '#22c55e', icon: '🌍' },
          { label: 'Social',        value: score.social,        max: 100, color: '#06b6d4', icon: '🤝' },
          { label: 'Governance',    value: score.governance,    max: 100, color: '#8b5cf6', icon: '🏛️' },
          { label: 'ESG Total',     value: score.total,         max: 100, color: '#f59e0b', icon: '⭐', rating: score.rating },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: s.color }}>{s.value}<span style={{ fontSize: '16px', fontWeight: 400 }}>/100</span></div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
            {s.rating && <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 700, color: s.color }}>Rating: {s.rating} → Target: {score.target_rating}</div>}
            <div style={{ marginTop: '8px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['overview','📊 Overview'],['env','🌍 Environmental'],['social','🤝 Social'],['gov','🏛️ Governance'],['sdg','🎯 UN SDGs']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === k ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', color: tab === k ? '#86efac' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: tab === k ? 700 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#22c55e' }}>🌍 Top Environmental KPIs</h3>
            {environmental.slice(0,3).map((k, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{k.kpi}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Target: {k.target}</div>
                </div>
                <span style={{ fontSize: '12px', color: stColor(k.status), background: `${stColor(k.status)}20`, padding: '3px 10px', borderRadius: '10px' }}>{k.value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#06b6d4' }}>🤝 Top Social KPIs</h3>
            {social.slice(0,3).map((k, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{k.kpi}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Target: {k.target}</div>
                </div>
                <span style={{ fontSize: '12px', color: stColor(k.status), background: `${stColor(k.status)}20`, padding: '3px 10px', borderRadius: '10px' }}>{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Tables */}
      {['env','social','gov'].includes(tab) && (() => {
        const items   = tab === 'env' ? environmental : tab === 'social' ? social : governance;
        const color   = tab === 'env' ? '#22c55e' : tab === 'social' ? '#06b6d4' : '#8b5cf6';
        const heading = tab === 'env' ? '🌍 Environmental KPIs' : tab === 'social' ? '🤝 Social KPIs' : '🏛️ Governance KPIs';
        return (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '14px', fontWeight: 700, color }}>{heading}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['KPI', 'ค่าปัจจุบัน', 'เป้าหมาย', 'สถานะ'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((k, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{k.kpi}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e5e7eb' }}>{k.value}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>{k.target}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '12px', color: stColor(k.status), background: `${stColor(k.status)}20`, padding: '3px 10px', borderRadius: '10px' }}>{k.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* UN SDGs */}
      {tab === 'sdg' && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>OpenThaiAi มุ่งมั่นต่อเป้าหมายการพัฒนาอย่างยั่งยืนของสหประชาชาติ (UN SDGs) ดังต่อไปนี้</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {sdg_alignment.map((s, i) => {
              const sdgColors = { 4: '#c5192d', 8: '#a21942', 9: '#fd6925', 10: '#dd1367', 17: '#19486a' };
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: sdgColors[s.sdg] || '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{s.sdg}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>SDG {s.sdg}: {s.title}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>{s.contribution}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#86efac' }}>
            🎯 เป้าหมาย: ได้รับ SET ESG Rating ระดับ AA ภายในปี 2027
          </div>
        </div>
      )}
    </CorporateLayout>
  );
};

export default ESGPage;
