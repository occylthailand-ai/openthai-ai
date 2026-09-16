import React, { useEffect, useMemo, useState } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiFetch } from '../../apiBase';
import { useLang } from '../../i18n';

const STATUS_META = {
  covered: { color: '#34d399', icon: '🟢' },
  partial: { color: '#fbbf24', icon: '🟡' },
  gap: { color: '#f87171', icon: '🔴' },
};

const CLUSTER_META = {
  knowledge: '🧠',
  growth: '📈',
  people: '👥',
  communications: '📢',
  operations: '⚙️',
  leadership: '👔',
  innovation: '🔬',
  technology: '💻',
  quality: '✅',
  finance: '💰',
  governance: '🏛️',
  global: '🌐',
  strategy: '♟️',
};

const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '18px',
};

export default function DepartmentToolsPage() {
  const { lang, t } = useLang();
  const [overview, setOverview] = useState(null);
  const [briefs, setBriefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    document.title = '🛠️ Department Tool Builder — Openthai.ai';
    apiFetch('/api/department-tools')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setOverview(d); setError(''); }
        else setError('load');
      })
      .catch(() => setError('load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const departments = overview?.departments || [];
    if (!needle) return departments;
    return departments.filter((dept) => [
      dept.name_th,
      dept.name_en,
      dept.summary_th,
      dept.cluster,
      ...(dept.requests || []).map((r) => r.label_th),
      ...(dept.skills || []).map((s) => s.name || ''),
    ].join(' ').toLowerCase().includes(needle));
  }, [overview, q]);

  const statusText = (status) => t(`dtb.status.${status}`);
  const clusterText = (cluster) => t(`dtb.cluster.${cluster}`);
  const policyGuardrails = lang === 'th'
    ? (overview?.policy_defaults?.record_guardrails_th || [])
    : (overview?.policy_defaults?.record_guardrails_en || overview?.policy_defaults?.record_guardrails_th || []);

  const runSingle = async (departmentId) => {
    setRunning(departmentId);
    try {
      const res = await apiFetch('/api/department-tools/develop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: departmentId, goal: t('dtb.goal.default') }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBriefs((prev) => ({ ...prev, [departmentId]: data }));
        setActionError('');
      } else {
        setActionError('single');
      }
    } catch {
      setActionError('single');
    } finally {
      setRunning('');
    }
  };

  const runAll = async () => {
    setRunning('all');
    try {
      const res = await apiFetch('/api/department-tools/develop-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: t('dtb.goal.default') }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBriefs(Object.fromEntries((data.briefs || []).map((brief) => [brief.department_id, brief])));
        setActionError('');
      } else {
        setActionError('all');
      }
    } catch {
      setActionError('all');
    } finally {
      setRunning('');
    }
  };

  return (
    <CorporateLayout title={t('dtb.title')} subtitle={t('dtb.subtitle')}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ ...card, borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '860px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#c7d2fe' }}>{t('dtb.hero.title')}</div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.7 }}>{t('dtb.hero.desc')}</div>
            </div>
            <button onClick={runAll} disabled={running === 'all' || !overview} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontWeight: 700, cursor: running === 'all' || !overview ? 'not-allowed' : 'pointer', opacity: running === 'all' || !overview ? 0.65 : 1 }}>
              {running === 'all' ? t('dtb.btn.runningAll') : t('dtb.btn.runAll')}
            </button>
          </div>
        </div>

        {loading && <div style={card}>{t('dtb.loading')}</div>}
        {!loading && error && <div style={{ ...card, color: '#fca5a5' }}>⚠️ {t('dtb.error.load')}</div>}
        {!!actionError && <div style={{ ...card, color: '#fca5a5' }}>⚠️ {t(actionError === 'all' ? 'dtb.error.batch' : 'dtb.error.single')}</div>}

        {overview && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
              {[
                { label: t('dtb.stats.requested'), value: overview.stats?.requested_headings, color: '#6366f1', icon: '🧾' },
                { label: t('dtb.stats.canonical'), value: overview.stats?.canonical_departments, color: '#34d399', icon: '🧩' },
                { label: t('dtb.stats.duplicates'), value: overview.stats?.duplicate_headings, color: '#f59e0b', icon: '♻️' },
                { label: t('dtb.stats.covered'), value: overview.coverage_summary?.covered, color: '#38bdf8', icon: '✅' },
              ].map((item) => (
                <div key={item.label} style={{ ...card, padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: item.color }}>{item.value ?? 0}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>{t('dtb.guardrails.title')}</div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', lineHeight: 1.7, fontSize: '13px' }}>
                {policyGuardrails.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>

            <div style={card}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('dtb.search.placeholder')}
                aria-label={t('dtb.search.label')}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '11px 14px', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '14px' }}>
              {filtered.map((dept) => {
                const meta = STATUS_META[dept.status] || STATUS_META.gap;
                const brief = briefs[dept.id];
                return (
                  <div key={dept.id} style={{ ...card, borderColor: `${meta.color}33` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '24px' }}>{dept.icon || CLUSTER_META[dept.cluster] || '🛠️'}</div>
                        <div style={{ marginTop: '8px', fontWeight: 800, fontSize: '15px' }}>{lang === 'en' ? dept.name_en : dept.name_th}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{(CLUSTER_META[dept.cluster] || '🗂️')} {clusterText(dept.cluster)} · {dept.request_count} {t('dtb.requestCount')}</div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: meta.color, background: `${meta.color}20`, border: `1px solid ${meta.color}33`, borderRadius: '999px', padding: '4px 10px' }}>
                        {meta.icon} {statusText(dept.status)}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.6 }}>{lang === 'th' ? dept.summary_th : (dept.summary_en || dept.summary_th)}</div>

                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{t('dtb.requestedHeadings')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(dept.requests || []).map((item) => (
                          <span key={`${dept.id}-${item.index}`} style={{ fontSize: '11px', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '3px 9px' }}>
                            #{item.index} {item.label_th}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{t('dtb.skills')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(dept.skills || []).map((skill) => (
                          <span key={skill.id} style={{ fontSize: '11px', color: skill.status === 'active' ? '#86efac' : '#fcd34d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '3px 9px' }}>
                            {skill.id} {skill.name || t('dtb.missingSkill')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => runSingle(dept.id)} disabled={running === dept.id} style={{ marginTop: '14px', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '10px', padding: '9px 14px', color: '#c7d2fe', fontWeight: 700, cursor: running === dept.id ? 'not-allowed' : 'pointer', opacity: running === dept.id ? 0.65 : 1 }}>
                      {running === dept.id ? t('dtb.btn.runningOne') : t('dtb.btn.runOne')}
                    </button>

                    {brief && (
                      <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'grid', gap: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{t('dtb.source')}: {brief.source}</div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', marginBottom: '4px' }}>{t('dtb.brief.mission')}</div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>{lang === 'th' ? brief.mission_th : (brief.mission_en || brief.mission_th)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', marginBottom: '4px' }}>{t('dtb.brief.tools')}</div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', lineHeight: 1.7, fontSize: '13px' }}>
                            {(brief.suggested_tools || []).map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', marginBottom: '4px' }}>{t('dtb.brief.flow')}</div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', lineHeight: 1.7, fontSize: '13px' }}>
                            {(brief.automation_flow || []).map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>{t('dtb.brief.guardrails')}</div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: '#fde68a', lineHeight: 1.7, fontSize: '13px' }}>
                            {((lang === 'th' ? brief.record_guardrails : (brief.record_guardrails_en || brief.record_guardrails)) || []).map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div style={{ fontSize: '13px', color: '#86efac' }}><strong>{t('dtb.brief.firstAction')}</strong> {brief.first_action}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </CorporateLayout>
  );
}
