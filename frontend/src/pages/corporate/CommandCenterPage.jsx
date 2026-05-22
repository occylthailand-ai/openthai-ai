import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const DEPT_COLORS = {
  it: '#6366f1', finance: '#10b981', hr: '#f59e0b', compliance: '#ef4444',
  ir: '#8b5cf6', marketing: '#fe2c55', pr: '#06b6d4', esg: '#22c55e',
  strategy: '#f97316', legal: '#a78bfa',
};
const DEPT_ICONS = {
  it: '🤖', finance: '💰', hr: '👥', compliance: '⚖️',
  ir: '📈', marketing: '📢', pr: '📣', esg: '🌿',
  strategy: '🎯', legal: '🏛️',
};
const PRIORITY_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#6b7280' };
const STATUS_COLOR   = { pending: '#f59e0b', in_progress: '#6366f1', done: '#10b981', blocked: '#ef4444' };

const CommandCenterPage = () => {
  const [tasks, setTasks]   = useState([]);
  const [kpis, setKpis]     = useState(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/corporate/tasks')).then(r => r.json()).then(d => setTasks(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/kpis')).then(r => r.json()).then(d => setKpis(d.data)).catch(() => {});
  }, []);

  const updateTask = async (id, status) => {
    setSaving(id);
    const updated = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(updated);
    await fetch(apiUrl('/api/corporate/tasks'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      body: JSON.stringify(updated),
    }).catch(() => {});
    setSaving(null);
  };

  const depts = [...new Set(tasks.map(t => t.dept))];
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.dept === filter || t.status === filter || t.priority === filter);

  const counts = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    critical: tasks.filter(t => t.priority === 'critical').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
  };

  const card = (extra = {}) => ({ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', ...extra });

  return (
    <CorporateLayout title="🎯 Command Center" subtitle="ท่าน Mythos · ติดตามงานทุกแผนก · KPI Dashboard · Executive Oversight">

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'งานทั้งหมด',   value: counts.total,       color: '#6366f1', icon: '📋' },
          { label: 'กำลังทำ',      value: counts.in_progress, color: '#f59e0b', icon: '⚡' },
          { label: 'เสร็จแล้ว',    value: counts.done,        color: '#10b981', icon: '✅' },
          { label: 'Critical',      value: counts.critical,    color: '#ef4444', icon: '🚨' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '28px' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>ความคืบหน้ารวม</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
            {counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0}%
          </span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${counts.total > 0 ? counts.done / counts.total * 100 : 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: '4px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: '#6b7280' }}>
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} />
              {s}: {tasks.filter(t => t.status === s).length}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Task Board */}
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {['all', 'critical', 'in_progress', 'pending', ...depts].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: filter === f ? 700 : 400, background: filter === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: filter === f ? '#a5b4fc' : '#6b7280', whiteSpace: 'nowrap' }}>
                {DEPT_ICONS[f] || ''} {f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(t => (
              <div key={t.id} style={{ ...card({ padding: '14px 16px' }), borderLeft: `3px solid ${DEPT_COLORS[t.dept] || '#6b7280'}`, opacity: t.status === 'done' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{DEPT_ICONS[t.dept] || '📋'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? '#6b7280' : '#fff' }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', background: `${PRIORITY_COLOR[t.priority]}20`, color: PRIORITY_COLOR[t.priority], padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{t.priority}</span>
                      <span style={{ fontSize: '10px', background: `${DEPT_COLORS[t.dept] || '#6b7280'}15`, color: DEPT_COLORS[t.dept] || '#6b7280', padding: '2px 8px', borderRadius: '8px' }}>{t.dept}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>👤 {t.assignee}</span>
                      <span style={{ fontSize: '11px', color: new Date(t.due) < new Date() && t.status !== 'done' ? '#ef4444' : '#6b7280' }}>📅 {t.due}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <select
                      value={t.status}
                      onChange={e => updateTask(t.id, e.target.value)}
                      disabled={saving === t.id}
                      style={{ background: `${STATUS_COLOR[t.status]}15`, border: `1px solid ${STATUS_COLOR[t.status]}40`, color: STATUS_COLOR[t.status], borderRadius: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
                      <option value="pending">pending</option>
                      <option value="in_progress">in_progress</option>
                      <option value="done">done</option>
                      <option value="blocked">blocked</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4b5563', padding: '40px', fontSize: '14px' }}>ไม่พบงานในตัวกรองนี้</div>
            )}
          </div>
        </div>

        {/* Right: KPI Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', marginBottom: '2px' }}>📊 KPI ทุกแผนก — {kpis?.month}</div>
          {(kpis?.departments || []).map(dep => (
            <div key={dep.dept} style={card({ padding: '14px' })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>{DEPT_ICONS[dep.dept] || '📋'}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: DEPT_COLORS[dep.dept] || '#9ca3af', textTransform: 'uppercase' }}>{dep.dept}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: dep.kpis.every(k => k.ok) ? '#10b981' : dep.kpis.some(k => k.ok) ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                  {dep.kpis.filter(k => k.ok).length}/{dep.kpis.length} ✓
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dep.kpis.map((kpi, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#9ca3af' }}>{kpi.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: kpi.ok ? '#10b981' : '#ef4444', fontWeight: 700 }}>{kpi.actual}</span>
                      <span style={{ color: '#4b5563' }}>/ {kpi.target}</span>
                      <span>{kpi.ok ? '✅' : '❌'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CorporateLayout>
  );
};

export default CommandCenterPage;
