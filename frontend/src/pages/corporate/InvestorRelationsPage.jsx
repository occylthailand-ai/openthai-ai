import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const InvestorRelationsPage = () => {
  const [ir, setIR] = useState(null);
  const [editFinancials, setEditFinancials] = useState(false);
  const [fin, setFin] = useState({});

  useEffect(() => {
    fetch(apiUrl('/api/corporate/ir')).then(r => r.json()).then(d => { setIR(d.data); setFin(d.data?.financials || {}); }).catch(() => {});
  }, []);

  const save = async () => {
    const token = localStorage.getItem('auth_token');
    await fetch(apiUrl('/api/corporate/ir'), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ financials: fin }) });
    setIR(prev => ({ ...prev, financials: fin }));
    setEditFinancials(false);
  };

  if (!ir) return <CorporateLayout title="📈 Investor Relations" subtitle="Shareholder Information · Financial Data · AGM"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const { company, financials, shareholders, ipo_roadmap } = ir;

  return (
    <CorporateLayout title="📈 Investor Relations" subtitle="Shareholder Information · Financial Data · Annual Meeting">

      {/* Company Profile */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 900 }}>{company.name}</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Ticker: {company.ticker}</span>
              <span style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{company.market}</span>
              <span style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af', padding: '3px 12px', borderRadius: '20px', fontSize: '12px' }}>Founded: {company.founded}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>HQ: {company.hq}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '280px' }}>{company.business}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Key Financials */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>💰 Key Financials FY{financials.fiscal_year}</h3>
            <button onClick={() => setEditFinancials(!editFinancials)} style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#a5b4fc', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              {editFinancials ? 'Cancel' : '✏️ Edit'}
            </button>
          </div>
          {[
            { label: 'Revenue (THB)',              key: 'revenue_thb',            prefix: '฿' },
            { label: 'MRR (Monthly Recurring)',    key: 'mrr_thb',               prefix: '฿' },
            { label: 'ARR (Annual Recurring)',     key: 'arr_thb',               prefix: '฿' },
            { label: 'Paying Customers',           key: 'paying_customers',       prefix: ''  },
            { label: 'IPO Target Year',            key: 'target_ipo_year',       prefix: ''  },
            { label: 'Valuation Target (THB)',     key: 'valuation_target_thb',  prefix: '฿' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{f.label}</span>
              {editFinancials ? (
                <input value={fin[f.key] || ''} onChange={e => setFin(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '13px', width: '140px' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb' }}>{f.prefix}{typeof financials[f.key] === 'number' ? financials[f.key].toLocaleString() : financials[f.key]}</span>
              )}
            </div>
          ))}
          {editFinancials && <button onClick={save} style={{ marginTop: '12px', width: '100%', background: '#6366f1', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>💾 Save</button>}
        </div>

        {/* Shareholders */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>🥧 Shareholder Structure</h3>
          {shareholders.map((s, i) => {
            const colors = ['#6366f1', '#10b981', '#f59e0b'];
            return (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{s.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: colors[i % 3] }}>{s.pct}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: colors[i % 3], borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', textTransform: 'capitalize' }}>{s.type}</div>
              </div>
            );
          })}
          <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', fontSize: '12px', color: '#fcd34d' }}>
            ⚠️ Pre-IPO Structure · ยังไม่ได้จดทะเบียนในตลาดหลักทรัพย์
          </div>
        </div>
      </div>

      {/* IPO Roadmap */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>🗺️ IPO Roadmap — MAI/SET Thailand</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {(ipo_roadmap || []).map((p, i) => (
            <div key={i} style={{ background: p.status === 'in_progress' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.status === 'in_progress' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: p.status === 'in_progress' ? '#a5b4fc' : '#4b5563', marginBottom: '4px' }}>{p.phase}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{p.title}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>{p.milestone}</div>
              <div style={{ fontSize: '12px', color: p.status === 'in_progress' ? '#6366f1' : '#4b5563', fontWeight: 700 }}>{p.year}</div>
              <div style={{ marginTop: '6px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', background: p.status === 'in_progress' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: p.status === 'in_progress' ? '#a5b4fc' : '#4b5563' }}>
                {p.status === 'in_progress' ? '▶ In Progress' : '○ Planned'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IR Contact */}
      <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#6ee7b7' }}>📬 IR Contact</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
          <div><div style={{ color: '#6b7280', marginBottom: '4px' }}>Email</div><div>ir@openthaiAI.com</div></div>
          <div><div style={{ color: '#6b7280', marginBottom: '4px' }}>Phone</div><div>+66 (0) 2 XXX XXXX</div></div>
          <div><div style={{ color: '#6b7280', marginBottom: '4px' }}>X (Twitter)</div><div>@OCCYL2</div></div>
        </div>
      </div>
    </CorporateLayout>
  );
};

export default InvestorRelationsPage;
