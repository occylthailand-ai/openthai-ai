import React, { useState, useEffect, useMemo } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const LEVEL_COLOR = {
  'C-Level': '#f59e0b', VP: '#f97316', Lead: '#8b5cf6', Manager: '#6366f1',
  Senior: '#06b6d4', Mid: '#10b981', Junior: '#6b7280',
};
const levelColor = l => LEVEL_COLOR[l] || '#6b7280';

const StatusBadge = ({ status }) => (
  <span style={{
    fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
    background: status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
    color: status === 'active' ? '#6ee7b7' : '#fcd34d',
    border: `1px solid ${status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`,
  }}>
    {status === 'active' ? '● Active' : '○ Open'}
  </span>
);

const TechnologyPage = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('positions');
  const [filterCat, setFilterCat] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(apiUrl('/api/corporate/it')).then(r => r.json()).then(d => setData(d.data)).catch(() => {});
  }, []);

  const filteredPositions = useMemo(() => {
    if (!data) return [];
    return data.positions.filter(p => {
      if (filterCat !== 'all' && p.category_id !== filterCat) return false;
      if (filterLevel !== 'all' && p.level !== filterLevel) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, filterCat, filterLevel, filterStatus, search]);

  if (!data) return (
    <CorporateLayout title="🤖 Technology & AI" subtitle="IT Department · Roles & Positions">
      <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>⏳ Loading...</div>
    </CorporateLayout>
  );

  const { overview, categories, positions } = data;
  const activeCount = positions.filter(p => p.status === 'active').length;
  const openCount = positions.filter(p => p.status === 'open').length;

  const levels = [...new Set(positions.map(p => p.level))];
  const levelOrder = ['C-Level', 'VP', 'Lead', 'Manager', 'Senior', 'Mid', 'Junior'];
  levels.sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b));

  return (
    <CorporateLayout title="🤖 Technology & AI" subtitle="IT Department · 8 ประเภท · 37 บทบาท · 90 ตำแหน่ง">

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { icon: '📂', label: 'ประเภทหลัก',   value: overview.total_categories, color: '#8b5cf6' },
          { icon: '🎭', label: 'บทบาท',         value: overview.total_roles,       color: '#6366f1' },
          { icon: '💼', label: 'ตำแหน่งทั้งหมด', value: overview.total_positions,   color: '#06b6d4' },
          { icon: '✅', label: 'มีผู้ดำรงตำแหน่ง', value: activeCount,              color: '#10b981' },
          { icon: '📋', label: 'รอบรรจุ',        value: openCount,                  color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>{s.icon}</div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          ['positions', `💼 ทุกตำแหน่ง (${positions.length})`],
          ['overview',  '📊 ภาพรวมหมวดหมู่'],
          ['stack',     '⚙️ Tech Stack'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === k ? 700 : 400, background: tab === k ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)', color: tab === k ? '#67e8f9' : '#9ca3af' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── All Positions Tab ── */}
      {tab === 'positions' && (
        <div>
          {/* Filters */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="🔍 ค้นหาตำแหน่ง..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '180px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 12px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }}
            />
            {/* Category Filter */}
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 12px', color: '#e5e7eb', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
              <option value="all">ทุกประเภท</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nameT}</option>)}
            </select>
            {/* Level Filter */}
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 12px', color: '#e5e7eb', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
              <option value="all">ทุก Level</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['all', 'ทั้งหมด'], ['active', '✅ Active'], ['open', '📋 Open']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', background: filterStatus === v ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)', color: filterStatus === v ? '#67e8f9' : '#9ca3af', fontWeight: filterStatus === v ? 700 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
              {filteredPositions.length} / {positions.length} ตำแหน่ง
            </span>
          </div>

          {/* Positions Grid — grouped by category */}
          {categories
            .filter(cat => filterCat === 'all' || cat.id === filterCat)
            .map(cat => {
              const catPositions = filteredPositions.filter(p => p.category_id === cat.id);
              if (!catPositions.length) return null;
              return (
                <div key={cat.id} style={{ marginBottom: '28px' }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 16px', background: `${cat.color}0d`, borderRadius: '10px', border: `1px solid ${cat.color}22` }}>
                    <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: cat.color }}>{cat.nameT}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '10px' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      <strong style={{ color: cat.color }}>{catPositions.filter(p => p.status === 'active').length}</strong> active
                      &nbsp;·&nbsp;
                      <strong style={{ color: '#fcd34d' }}>{catPositions.filter(p => p.status === 'open').length}</strong> open
                      &nbsp;·&nbsp;{catPositions.length} ตำแหน่ง
                    </span>
                  </div>

                  {/* Position Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                    {catPositions.map(pos => (
                      <div key={pos.id} style={{ background: pos.status === 'active' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${pos.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1, paddingRight: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb', lineHeight: 1.3 }}>
                              {pos.title}
                              {pos.total_slots > 1 && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '5px' }}>#{pos.slot}/{pos.total_slots}</span>}
                            </div>
                            {pos.name && (
                              <div style={{ fontSize: '12px', color: '#67e8f9', marginTop: '3px', fontWeight: 600 }}>👤 {pos.name}</div>
                            )}
                          </div>
                          <StatusBadge status={pos.status} />
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', background: `${levelColor(pos.level)}18`, color: levelColor(pos.level), padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>{pos.level}</span>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', padding: '2px 8px', borderRadius: '8px' }}>{pos.id}</span>
                          <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '8px' }}>{pos.salary}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {pos.skills.slice(0, 3).map((s, si) => (
                            <span key={si} style={{ fontSize: '9px', background: 'rgba(255,255,255,0.04)', color: '#6b7280', padding: '2px 6px', borderRadius: '6px' }}>{s}</span>
                          ))}
                          {pos.skills.length > 3 && <span style={{ fontSize: '9px', color: '#4b5563' }}>+{pos.skills.length - 3}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {filteredPositions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>ไม่พบตำแหน่งที่ค้นหา</div>
          )}

          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(6,182,212,0.06)', borderRadius: '10px', border: '1px solid rgba(6,182,212,0.15)', color: '#67e8f9', fontSize: '13px' }}>
            🚀 สนใจร่วมทีม Openthai.ai —{' '}
            <a href="mailto:hr@openthai.ai" style={{ color: '#a5b4fc' }}>hr@openthai.ai</a>
          </div>
        </div>
      )}

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div>
          {/* Progress Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {categories.map(cat => {
              const catPos = positions.filter(p => p.category_id === cat.id);
              const filledCount = catPos.filter(p => p.status === 'active').length;
              const totalCount = catPos.length;
              const pct = totalCount ? Math.round((filledCount / totalCount) * 100) : 0;
              return (
                <div key={cat.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb' }}>{cat.nameT}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{cat.roles.length} roles</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: cat.color }}>{totalCount}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>ตำแหน่ง</div>
                    </div>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '3px', transition: 'width 0.8s', minWidth: pct > 0 ? '4px' : '0' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#10b981' }}>{filledCount} บรรจุแล้ว</span>
                    <span style={{ color: '#fcd34d' }}>{totalCount - filledCount} รอบรรจุ</span>
                    <span style={{ color: '#6b7280' }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Roles Detail per Category */}
          {categories.map(cat => (
            <div key={cat.id} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 14px', background: `${cat.color}0d`, borderRadius: '8px', border: `1px solid ${cat.color}20` }}>
                <span>{cat.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: cat.color }}>{cat.nameT}</span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>· {cat.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cat.roles.map(role => (
                  <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{role.title}</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {role.skills.slice(0, 4).map((s, si) => (
                          <span key={si} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#6b7280', padding: '2px 7px', borderRadius: '6px' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>{role.salary}</span>
                      <span style={{ fontSize: '11px', color: levelColor(role.level), background: `${levelColor(role.level)}18`, padding: '3px 10px', borderRadius: '8px' }}>{role.level}</span>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: cat.color }}>{role.count}</div>
                        <div style={{ fontSize: '9px', color: '#6b7280' }}>pos</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>รวมทั้งหมด</span>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#8b5cf6' }}>{overview.total_categories}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>ประเภท</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#6366f1' }}>{overview.total_roles}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>บทบาท</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#67e8f9' }}>{overview.total_positions}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>ตำแหน่ง</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tech Stack Tab ── */}
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
            <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>📋 Engineering Methodologies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overview.methodologies.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
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
