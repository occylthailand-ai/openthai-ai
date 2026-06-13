import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const BoardPage = () => {
  const [members, setMembers] = useState([]);
  const [meetings] = useState([
    { id: 'm1', no: 1, type: 'Regular',  date: '2025-03-28', agenda: ['อนุมัติงบประมาณ Q1', 'รายงาน KPI', 'ทบทวนกลยุทธ์'], status: 'held',    attendance: '3/3' },
    { id: 'm2', no: 2, type: 'Regular',  date: '2025-06-27', agenda: ['รายงานการเงิน H1', 'แผน Fundraising', 'นโยบาย ESG'], status: 'upcoming', attendance: '-' },
    { id: 'm3', no: 3, type: 'AGM',      date: '2025-09-30', agenda: ['AGM Annual', 'อนุมัติงบการเงิน', 'แต่งตั้งผู้สอบบัญชี'], status: 'upcoming', attendance: '-' },
  ]);

  useEffect(() => {
    fetch(apiUrl('/api/corporate/board')).then(r => r.json()).then(d => setMembers(d.data || [])).catch(() => {});
  }, []);

  const typeColor = t => ({ executive: '#6366f1', independent: '#10b981', non_executive: '#f59e0b' }[t] || '#6b7280');

  return (
    <CorporateLayout title="👑 Board of Directors" subtitle="คณะกรรมการบริษัท · Governance · Fiduciary Duty">

      {/* Board Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Directors',     value: members.length,                                   color: '#6366f1' },
          { label: 'Independent (≥1/3)', value: members.filter(m => m.independent).length,        color: '#10b981' },
          { label: 'Executive',           value: members.filter(m => m.type === 'executive').length, color: '#f59e0b' },
          { label: 'Avg. Tenure',         value: '1 yr',                                           color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Board Members */}
      <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#9ca3af' }}>กรรมการบริษัท</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {members.map(m => (
          <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${typeColor(m.type)}30`, borderRadius: '16px', padding: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${typeColor(m.type)}20`, border: `2px solid ${typeColor(m.type)}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
              {m.type === 'executive' ? '👑' : '🏛️'}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>{m.name}</div>
            <div style={{ fontSize: '13px', color: typeColor(m.type), marginBottom: '2px' }}>{m.title}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>{m.titleT}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {(m.expertise || []).map(e => <span key={e} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', padding: '2px 6px', borderRadius: '6px' }}>{e}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
              <span>{m.tenure}</span>
              <span style={{ color: typeColor(m.type), fontWeight: 700, textTransform: 'capitalize' }}>{m.type}</span>
            </div>
          </div>
        ))}
        {/* Add Member CTA */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', cursor: 'pointer', color: '#4b5563' }}>
          <span style={{ fontSize: '32px' }}>+</span>
          <span style={{ fontSize: '13px' }}>เพิ่มกรรมการ</span>
        </div>
      </div>

      {/* Board Committees */}
      <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#9ca3af' }}>คณะกรรมการชุดย่อย</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { name: 'Audit Committee',                 nameT: 'คณะกรรมการตรวจสอบ',          members: 3, required: true,  status: 'Active'  },
          { name: 'Nomination & Remuneration',       nameT: 'คณะกรรมการสรรหาและค่าตอบแทน', members: 3, required: true,  status: 'Active'  },
          { name: 'Risk Management Committee',       nameT: 'คณะกรรมการบริหารความเสี่ยง',   members: 3, required: false, status: 'Active'  },
          { name: 'Corporate Governance Committee',  nameT: 'คณะกรรมการธรรมาภิบาล',        members: 3, required: false, status: 'Active'  },
          { name: 'ESG Committee',                   nameT: 'คณะกรรมการ ESG',               members: 2, required: false, status: 'Setting' },
          { name: 'Strategy Committee',              nameT: 'คณะกรรมการกลยุทธ์',            members: 3, required: false, status: 'Active'  },
        ].map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>{c.name}</span>
              {c.required && <span style={{ fontSize: '10px', color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px' }}>Required</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>{c.nameT}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#9ca3af' }}>{c.members} members</span>
              <span style={{ color: c.status === 'Active' ? '#10b981' : '#f59e0b' }}>● {c.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meetings */}
      <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#9ca3af' }}>การประชุมคณะกรรมการ</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {meetings.map(m => (
          <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#6366f1' }}>#{m.no}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{m.type}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{m.date}</span>
                <span style={{ fontSize: '12px', color: m.status === 'held' ? '#10b981' : '#f59e0b' }}>{m.status === 'held' ? '✅ Held' : '📅 Upcoming'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {m.agenda.map((a, i) => <span key={i} style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', padding: '2px 8px', borderRadius: '6px' }}>{a}</span>)}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right', minWidth: '60px' }}>
              <div>Attendance</div>
              <div style={{ color: '#10b981', fontWeight: 700, marginTop: '2px' }}>{m.attendance}</div>
            </div>
          </div>
        ))}
      </div>
    </CorporateLayout>
  );
};

export default BoardPage;
