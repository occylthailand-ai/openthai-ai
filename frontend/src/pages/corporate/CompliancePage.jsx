import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const statusStyle = s => ({
  ok:          { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7', label: '✅ OK' },
  in_progress: { bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', label: '▶ In Progress' },
  pending:     { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', label: '⏳ Pending' },
  overdue:     { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', label: '🚨 Overdue' },
  partial:     { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', label: '◑ Partial' },
}[s] || { bg: 'rgba(255,255,255,0.05)', color: '#9ca3af', label: s });

const priorityStyle = p => ({
  critical: { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
  high:     { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)' },
  medium:   { color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
  low:      { color: '#6b7280', bg: 'rgba(255,255,255,0.05)' },
}[p] || { color: '#9ca3af', bg: 'transparent' });

const CompliancePage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('sec');

  useEffect(() => {
    fetch(apiUrl('/api/corporate/compliance')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  const updateStatus = async (type, id, status) => {
    const token = localStorage.getItem('auth_token');
    const updated = { ...data };
    const arr = type === 'sec' ? updated.sec_filings : updated.global_compliance;
    const item = arr.find(x => x.id === id);
    if (item) item.status = status;
    setData({ ...updated });
    await fetch(apiUrl('/api/corporate/compliance'), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updated) });
  };

  if (!data) return <CorporateLayout title="⚖️ Compliance & Legal" subtitle="SEC · SET · GDPR · PDPA · Global"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const secOk    = data.sec_filings.filter(x => x.status === 'ok').length;
  const globalOk = data.global_compliance.filter(x => x.status === 'ok').length;

  return (
    <CorporateLayout title="⚖️ Compliance & Legal" subtitle="SEC Thailand · SET · GDPR · PDPA · ISO 27001 · AI Act">

      {/* Summary Scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'SEC/SET Filing',    ok: secOk,    total: data.sec_filings.length,         color: '#6366f1' },
          { label: 'Global Compliance', ok: globalOk, total: data.global_compliance.length,   color: '#10b981' },
          { label: 'Critical Items',    ok: data.sec_filings.filter(x=>x.priority==='critical'&&x.status==='ok').length, total: data.sec_filings.filter(x=>x.priority==='critical').length, color: '#ef4444' },
          { label: 'Overall Score',     ok: Math.round(((secOk + globalOk) / (data.sec_filings.length + data.global_compliance.length)) * 100), total: 100, color: '#f59e0b', percent: true },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: s.color }}>{s.percent ? `${s.ok}%` : `${s.ok}/${s.total}`}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['sec', '🏛️ SEC/SET Filings (Thailand)'], ['global', '🌏 Global Compliance'], ['policies', '📋 Legal Policies']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: tab === key ? '#a5b4fc' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* SEC Filings */}
      {tab === 'sec' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['รายการ', 'รอบ', 'กำหนด', 'Priority', 'สถานะ', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sec_filings.map(item => {
                const st = statusStyle(item.status);
                const pr = priorityStyle(item.priority);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{item.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#9ca3af' }}>{item.period}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#9ca3af' }}>{item.due}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '11px', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{item.priority}</span></td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '12px', color: st.color, background: st.bg, padding: '3px 10px', borderRadius: '10px' }}>{st.label}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={item.status} onChange={e => updateStatus('sec', item.id, e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                        {['pending','in_progress','ok','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Global Compliance */}
      {tab === 'global' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {data.global_compliance.map(item => {
            const st = statusStyle(item.status);
            const pr = priorityStyle(item.priority);
            return (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{item.region}</span>
                    <span style={{ fontSize: '11px', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '10px' }}>{item.priority}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: st.color, background: st.bg, padding: '4px 12px', borderRadius: '10px', display: 'block', marginBottom: '8px' }}>{st.label}</span>
                  <select value={item.status} onChange={e => updateStatus('global', item.id, e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}>
                    {['pending','in_progress','ok'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legal Policies */}
      {tab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { icon: '📜', name: 'Code of Conduct',          status: 'active', version: 'v1.0', link: '#' },
            { icon: '🚫', name: 'Anti-Bribery Policy',      status: 'active', version: 'v1.0', link: '#' },
            { icon: '🔒', name: 'Data Privacy (PDPA)',       status: 'active', version: 'v1.1', link: '#' },
            { icon: '📣', name: 'Whistleblower Policy',      status: 'active', version: 'v1.0', link: '#' },
            { icon: '🌐', name: 'GDPR Policy',               status: 'in_progress', version: 'Draft', link: '#' },
            { icon: '🤖', name: 'AI Ethics Policy',          status: 'active', version: 'v1.0', link: '#' },
            { icon: '💼', name: 'Remote Work Policy',        status: 'active', version: 'v1.0', link: '#' },
            { icon: '🛡️', name: 'Cybersecurity Policy',      status: 'in_progress', version: 'Draft', link: '#' },
            { icon: '♻️', name: 'Conflict of Interest',     status: 'active', version: 'v1.0', link: '#' },
          ].map((p, i) => {
            const st = statusStyle(p.status);
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{p.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#e5e7eb' }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: st.color, background: st.bg, padding: '2px 8px', borderRadius: '10px' }}>{st.label}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CorporateLayout>
  );
};

export default CompliancePage;
