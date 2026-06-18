import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const levelColor = l => ({
  'C-Level': '#f59e0b', VP: '#f97316', Lead: '#8b5cf6', Manager: '#6366f1',
  Senior: '#06b6d4', Mid: '#10b981', Junior: '#6b7280',
}[l] || '#6b7280');

const TechnologyPage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [selectedCat, setSelectedCat] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/corporate/it')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  if (!data) return (
    <CorporateLayout title="🤖 Technology & AI" subtitle="IT Department · Roles & Positions">
      <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div>
    </CorporateLayout>
  );

  const { overview, categories, staff_members } = data;
  const activeCategories = selectedCat ? categories.filter(c => c.id === selectedCat) : categories;

  return (
    <CorporateLayout title="🤖 Technology & AI" subtitle="IT Department · Staff Roles · Positions — บริษัทไอทียักษ์ใหญ่">

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { icon: '📂', label: 'ประเภทหลัก', value: overview.total_categories, sub: 'Categories',      color: '#8b5cf6' },
          { icon: '🎭', label: 'บทบาท',      value: overview.total_roles,       sub: 'Unique Roles',   color: '#6366f1' },
          { icon: '💼', label: 'ตำแหน่ง',    value: overview.total_positions,   sub: 'Total Positions',color: '#06b6d4' },
          { icon: '👤', label: 'ทีมปัจจุบัน', value: overview.current_headcount, sub: 'Active Staff',  color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px' }}>{s.icon}</div>
            <div style={{ fontSize: '34px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          ['overview', '📊 ภาพรวม'],
          ['roles',    '💼 ตำแหน่งทั้งหมด'],
          ['team',     '👥 ทีมปัจจุบัน'],
          ['stack',    '⚙️ Tech Stack'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === k ? 700 : 400, background: tab === k ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)', color: tab === k ? '#67e8f9' : '#9ca3af' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => { setSelectedCat(cat.id === selectedCat ? null : cat.id); setTab('roles'); }}
                style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}30`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${cat.color}18`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${cat.color}08`; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{cat.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb', marginBottom: '4px' }}>{cat.nameT}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>{cat.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: cat.color, background: `${cat.color}20`, padding: '2px 8px', borderRadius: '10px' }}>
                    {cat.roles.length} บทบาท
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {cat.roles.reduce((s, r) => s + r.count, 0)} ตำแหน่ง
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Table */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: '#9ca3af' }}>📋 สรุปตำแหน่งทั้งหมด</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '13px' }}>{cat.icon} {cat.nameT}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{cat.roles.length} roles</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: cat.color }}>{cat.roles.reduce((s, r) => s + r.count, 0)} pos</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(6,182,212,0.08)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>รวมทั้งหมด</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{overview.total_roles} บทบาท</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#67e8f9' }}>{overview.total_positions} ตำแหน่ง</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === 'roles' && (
        <div>
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedCat(null)}
              style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', background: !selectedCat ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)', color: !selectedCat ? '#67e8f9' : '#9ca3af' }}>
              ทั้งหมด
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', background: selectedCat === cat.id ? `${cat.color}25` : 'rgba(255,255,255,0.05)', color: selectedCat === cat.id ? cat.color : '#9ca3af' }}>
                {cat.icon} {cat.nameT}
              </button>
            ))}
          </div>

          {/* Roles List */}
          {activeCategories.map(cat => (
            <div key={cat.id} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 16px', background: `${cat.color}10`, borderRadius: '10px', border: `1px solid ${cat.color}25` }}>
                <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: cat.color }}>{cat.nameT}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{cat.name} · {cat.roles.length} roles · {cat.roles.reduce((s, r) => s + r.count, 0)} positions</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cat.roles.map(role => (
                  <div key={role.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{role.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {role.skills.map((s, si) => (
                          <span key={si} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', padding: '2px 7px', borderRadius: '8px' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', background: `${levelColor(role.level)}20`, color: levelColor(role.level), padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>{role.level}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: cat.color }}>{role.count}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>ตำแหน่ง</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#10b981' }}>{role.salary}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>เงินเดือน</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {staff_members.map(member => (
              <div key={member.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${levelColor(member.level)}20`, border: `2px solid ${levelColor(member.level)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {member.dept === 'leadership' ? '👑' : '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{member.role}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {member.skills.map((s, si) => (
                      <span key={si} style={{ fontSize: '10px', background: 'rgba(6,182,212,0.1)', color: '#67e8f9', padding: '2px 8px', borderRadius: '8px' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '11px', background: `${levelColor(member.level)}20`, color: levelColor(member.level), padding: '3px 10px', borderRadius: '10px', flexShrink: 0, fontWeight: 600 }}>{member.level}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#67e8f9', fontSize: '13px' }}>
            🚀 กำลังรับสมัครงาน — สนใจร่วมทีม:{' '}
            <a href="mailto:hr@openthai.ai" style={{ color: '#a5b4fc' }}>hr@openthai.ai</a>
          </div>
        </div>
      )}

      {/* Tech Stack Tab */}
      {tab === 'stack' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>⚙️ Tech Stack หลัก</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {overview.tech_stack.map((t, i) => (
                <span key={i} style={{ fontSize: '12px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.25)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>📋 Methodologies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overview.methodologies.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </CorporateLayout>
  );
};

export default TechnologyPage;
