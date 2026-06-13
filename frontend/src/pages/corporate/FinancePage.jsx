import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const FinancePage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    fetch(apiUrl('/api/corporate/finance')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  if (!data) return <CorporateLayout title="💰 Finance & Accounting" subtitle="Financial Dashboard · Budget · IPO Roadmap"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const { summary, ipo_roadmap } = data;

  return (
    <CorporateLayout title="💰 Finance & Accounting" subtitle={`FY${data.fiscal_year} · IFRS · SET Reporting Ready`}>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Revenue (THB)',  value: `฿${summary.revenue.toLocaleString()}`,   color: '#10b981', icon: '💵' },
          { label: 'Expenses',       value: `฿${summary.expenses.toLocaleString()}`,  color: '#ef4444', icon: '📤' },
          { label: 'Net Profit',     value: `฿${summary.profit.toLocaleString()}`,    color: summary.profit >= 0 ? '#10b981' : '#ef4444', icon: '📈' },
          { label: 'Cash & Runway',  value: `${summary.runway_months}mo`,             color: '#f59e0b', icon: '🏦' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px' }}>{s.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['summary','📊 Summary'],['ipo','🚀 IPO Roadmap'],['budget','💼 Budget by Dept'],['reporting','📋 Financial Reporting']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === k ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', color: tab === k ? '#fcd34d' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: tab === k ? 700 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Summary */}
      {tab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#fcd34d' }}>📊 P&L Summary</h3>
            {[
              { label: 'Total Revenue',     value: `฿${summary.revenue.toLocaleString()}`,   style: { color: '#10b981', fontWeight: 900 } },
              { label: 'Cost of Revenue',   value: `฿0`,    style: {} },
              { label: 'Gross Profit',      value: `฿0`,    style: {} },
              { label: 'Operating Expenses',value: `฿${summary.expenses.toLocaleString()}`,  style: { color: '#ef4444' } },
              { label: 'Net Profit/Loss',   value: `฿${summary.profit.toLocaleString()}`,    style: { color: summary.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: '18px' } },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{r.label}</span>
                <span style={{ fontSize: '14px', color: '#e5e7eb', ...r.style }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#fcd34d' }}>📋 Financial Standards</h3>
            {[
              { std: 'IFRS (International)',    status: 'Preparing', color: '#f59e0b' },
              { std: 'Thai GAAP (TFRS)',        status: 'Active',    color: '#10b981' },
              { std: 'SET/MAI Reporting',       status: 'Preparing', color: '#f59e0b' },
              { std: 'SEC Thailand Filing',     status: 'Preparing', color: '#f59e0b' },
              { std: 'CPA Audit (Annual)',       status: 'Pending',   color: '#6b7280' },
              { std: 'Tax — Revenue Dept.',     status: 'Active',    color: '#10b981' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{r.std}</span>
                <span style={{ fontSize: '12px', color: r.color }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IPO Roadmap */}
      {tab === 'ipo' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {ipo_roadmap.map((p, i) => (
              <div key={i} style={{ background: p.status === 'in_progress' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${p.status === 'in_progress' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, marginBottom: '6px' }}>{p.phase}</div>
                <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '6px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>{p.milestone}</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: p.status === 'in_progress' ? '#fcd34d' : '#4b5563' }}>{p.year}</div>
                <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: p.status === 'in_progress' ? '15%' : '0%', background: '#f59e0b', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#fcd34d' }}>
            🎯 เป้าหมาย IPO MAI/SET ภายในปี 2027 · Market Cap Target: ฿1,000M+ · Ticker: OTAI (planned)
          </div>
        </div>
      )}

      {/* Budget */}
      {tab === 'budget' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['แผนก', 'งบประมาณ (THB)', 'ใช้แล้ว (THB)', 'เหลือ', '% ใช้'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.budget_by_dept).map(([dept, b]) => {
                const pct = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
                return (
                  <tr key={dept} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e5e7eb', textTransform: 'capitalize' }}>{dept}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#10b981' }}>฿{b.budget.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#ef4444' }}>฿{b.spent.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>฿{(b.budget - b.spent).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#10b981', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af', minWidth: '30px' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reporting */}
      {tab === 'reporting' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[
            { period: 'Q1 2025',      type: 'Quarterly',   status: 'Filed',    date: 'May 2025' },
            { period: 'Q2 2025',      type: 'Quarterly',   status: 'Pending',  date: 'Aug 2025' },
            { period: 'Q3 2025',      type: 'Quarterly',   status: 'Upcoming', date: 'Nov 2025' },
            { period: 'Q4 2025',      type: 'Quarterly',   status: 'Upcoming', date: 'Feb 2026' },
            { period: 'Annual 2025',  type: 'Annual',      status: 'Upcoming', date: 'Apr 2026' },
            { period: '56-1 One Rep', type: 'SEC Filing',  status: 'Upcoming', date: 'Apr 2026' },
          ].map((r, i) => {
            const stC = { Filed: '#10b981', Pending: '#f59e0b', Upcoming: '#6b7280' }[r.status] || '#6b7280';
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{r.period}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{r.type} · Due: {r.date}</div>
                <span style={{ fontSize: '12px', color: stC, background: `${stC}20`, padding: '3px 10px', borderRadius: '10px' }}>● {r.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </CorporateLayout>
  );
};

export default FinancePage;
