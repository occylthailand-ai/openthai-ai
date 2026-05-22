import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const priorityColor = p => ({ critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#6b7280' }[p] || '#6b7280');

const HRPage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    fetch(apiUrl('/api/corporate/hr')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  if (!data) return <CorporateLayout title="👥 Human Resources" subtitle="Talent · Culture · Policy"><div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div></CorporateLayout>;

  const { headcount, open_positions, policies } = data;

  return (
    <CorporateLayout title="👥 Human Resources" subtitle="Talent Management · Culture · People Operations — Global">

      {/* Headcount */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Headcount', value: headcount.total,      color: '#8b5cf6', icon: '👤' },
          { label: 'Full-Time',       value: headcount.fulltime,    color: '#10b981', icon: '💼' },
          { label: 'Target 2025',     value: headcount.target_2025, color: '#f59e0b', icon: '🎯' },
          { label: 'Target 2026',     value: headcount.target_2026, color: '#6366f1', icon: '🚀' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px' }}>{s.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['overview','📊 Overview'],['openings','💼 Open Positions'],['policies','📋 Policies'],['culture','🌟 Culture']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === k ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', color: tab === k ? '#c4b5fd' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: tab === k ? 700 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>📈 Hiring Roadmap</h3>
            {[
              { quarter: 'Q3 2025', roles: 'CTO, CFO',                count: 2, status: 'Urgent' },
              { quarter: 'Q4 2025', roles: 'VP Marketing, Engineers',  count: 3, status: 'Planning' },
              { quarter: 'Q1 2026', roles: 'Sales, Support, Ops',      count: 5, status: 'Planned' },
              { quarter: 'Q2 2026', roles: 'Data Science, DevOps',     count: 4, status: 'Planned' },
              { quarter: '2026+',   roles: 'Global Team Expansion',    count: 10, status: 'Vision' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.quarter}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{r.roles}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#8b5cf6' }}>+{r.count}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>{r.status}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>🌏 Global Hiring Markets</h3>
            {[
              { country: '🇹🇭 Thailand',    roles: 'HQ · Engineering · Business',      priority: 'Primary' },
              { country: '🇸🇬 Singapore',   roles: 'Regional Hub · Finance · Legal',   priority: 'High' },
              { country: '🇨🇳 China',       roles: 'Sales · Customer Success',         priority: 'High' },
              { country: '🇮🇳 India',       roles: 'Engineering · AI Research',        priority: 'Medium' },
              { country: '🇺🇸 USA',         roles: 'Sales · Partnerships',             priority: 'Future' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.country}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{r.roles}</div>
                </div>
                <span style={{ fontSize: '11px', color: r.priority === 'Primary' ? '#10b981' : r.priority === 'High' ? '#f59e0b' : r.priority === 'Medium' ? '#6366f1' : '#6b7280', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{r.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Positions */}
      {tab === 'openings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {open_positions.map(j => (
            <div key={j.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{j.title}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#9ca3af', padding: '2px 8px', borderRadius: '10px' }}>{j.dept}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#9ca3af', padding: '2px 8px', borderRadius: '10px' }}>{j.level}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: priorityColor(j.priority), background: `${priorityColor(j.priority)}20`, padding: '4px 12px', borderRadius: '10px', fontWeight: 700 }}>{j.priority}</span>
                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '6px' }}>● {j.status}</div>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontSize: '13px' }}>
            สนใจร่วมงาน: <a href="mailto:hr@openthaiAI.com" style={{ color: '#a5b4fc' }}>hr@openthaiAI.com</a>
          </div>
        </div>
      )}

      {/* Policies */}
      {tab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {policies.map((p, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#10b981' }}>✅ {p.status}</span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.version}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Culture */}
      {tab === 'culture' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {[
            { icon: '🌏', title: 'Global First', desc: 'ทำงานจากทุกที่ทั่วโลก — Remote-first, Async culture, ทีมข้ามวัฒนธรรม' },
            { icon: '🤖', title: 'AI-Native', desc: 'ใช้ AI ในทุกกระบวนการ ทุกแผนก ทุกการตัดสินใจ เพื่อประสิทธิภาพสูงสุด' },
            { icon: '🌱', title: 'Growth Mindset', desc: 'เรียนรู้ต่อเนื่อง ทดลองสิ่งใหม่ ไม่กลัวล้มเหลว ส่งเสริมนวัตกรรม' },
            { icon: '🤝', title: 'Impact-Driven', desc: 'ทุกงานวัดผลด้วย Impact ต่อ SME ไทยและ ASEAN ไม่ใช่แค่ metrics' },
            { icon: '⚡', title: 'Move Fast', desc: 'Shipping beats planning — Build, Measure, Learn ทุก 2 สัปดาห์' },
            { icon: '🌿', title: 'Sustainable', desc: 'สร้างธุรกิจที่ยั่งยืน ใส่ใจ ESG ตั้งแต่วันแรก' },
          ].map((v, i) => (
            <div key={i} style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '14px' }}>
              <span style={{ fontSize: '32px' }}>{v.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{v.title}</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CorporateLayout>
  );
};

export default HRPage;
