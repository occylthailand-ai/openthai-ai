import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const TABS = [
  { key: 'all', label: 'ทั้งหมด',  icon: '🔄' },
  { key: 'B2B', label: 'B2B',      icon: '🏢', desc: 'ผู้ผลิต ↔ คนกลาง / ครีเอเตอร์ / Affiliate' },
  { key: 'B2C', label: 'B2C',      icon: '🛍️', desc: 'ผู้ผลิต ↔ ผู้บริโภค' },
  { key: 'B2G', label: 'B2G',      icon: '🏛️', desc: 'ผู้ผลิต ↔ ภาครัฐ / องค์กรระหว่างประเทศ' },
];

const TYPE_BADGE = {
  middleman:  { label: 'คนกลาง',        color: '#f97316' },
  creator:    { label: 'ครีเอเตอร์',    color: '#ec4899' },
  affiliate:  { label: 'Affiliate',      color: '#f59e0b' },
  consumer:   { label: 'ผู้บริโภค',     color: '#0ea5e9' },
  'gov-thai': { label: 'หน่วยงานรัฐไทย', color: '#10b981' },
  'gov-intl': { label: 'หน่วยงานรัฐต่างประเทศ', color: '#3b82f6' },
  'intl-org': { label: 'องค์กรระหว่างประเทศ', color: '#8b5cf6' },
  foundation: { label: 'มูลนิธิ/NGO',   color: '#059669' },
};

const MATCH_COLOR = { B2B: '#f97316', B2C: '#0ea5e9', B2G: '#10b981' };

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round((score / 23) * 100));
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ color, fontWeight: 700, minWidth: 32 }}>{score}pt</span>
    </div>
  );
}

function MatchCard({ m, onRequest }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const badge = TYPE_BADGE[m.lead_type] || { label: m.lead_type, color: '#64748b' };

  async function handleRequest() {
    setLoading(true);
    try {
      await fetch(apiUrl('/api/match/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producer_email: m.producer_email, lead_id: m.lead_id }),
      });
      setSent(true);
      onRequest?.();
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              background: MATCH_COLOR[m.match_type] + '22', color: MATCH_COLOR[m.match_type],
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            }}>{m.match_type}</span>
            <span style={{
              background: badge.color + '22', color: badge.color,
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>{badge.label}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
            {m.producer_name || m.producer_email}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {m.producer_category}{m.producer_product ? ` · ${m.producer_product}` : ''}
          </div>
        </div>
        <ScoreBar score={m.score} />
      </div>

      {/* partner info */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>คู่ที่แนะนำ</div>
        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>
          {m.lead_name || '—'}
        </div>
        {m.lead_email && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.lead_email}</div>
        )}
      </div>

      {/* action */}
      <button
        onClick={handleRequest}
        disabled={sent || loading}
        style={{
          background: sent ? '#1e293b' : '#3b82f6',
          color: sent ? '#64748b' : '#fff',
          border: 'none', borderRadius: 8, padding: '9px 0',
          fontSize: 13, fontWeight: 600, cursor: sent ? 'default' : 'pointer',
          transition: 'background .2s',
        }}
      >
        {sent ? '✓ ส่งความสนใจแล้ว' : loading ? 'กำลังส่ง…' : 'แสดงความสนใจ'}
      </button>
    </div>
  );
}

export default function MatchingPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [matches, setMatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(apiUrl(`/api/match/suggestions?type=${activeTab}&limit=40`)),
        fetch(apiUrl('/api/match/summary')),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();
      if (mData.success) setMatches(mData.matches || []);
      if (sData.success) setSummary(sData);
    } catch (e) {
      setError('โหลดข้อมูลไม่ได้ กรุณาลองใหม่');
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const statItems = summary ? [
    { label: 'ผู้ผลิตที่อนุมัติ',    value: summary.approved_producers ?? 0, color: '#f97316' },
    { label: 'B2B Leads',           value: summary.b2b_leads ?? 0,          color: '#f97316' },
    { label: 'B2C Leads',           value: summary.b2c_leads ?? 0,          color: '#0ea5e9' },
    { label: 'B2G Leads',           value: summary.b2g_leads ?? 0,          color: '#10b981' },
    { label: 'คำขอจับคู่',          value: summary.total_requests ?? 0,     color: '#8b5cf6' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', fontFamily: 'sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>
            🔄 ระบบจับคู่อัตโนมัติ
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            จับคู่ผู้ผลิต กับ คนกลาง / ผู้บริโภค / ภาครัฐ — อัตโนมัติตาม category และ region
          </p>
        </div>

        {/* summary stats */}
        {summary && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {statItems.map(s => (
              <div key={s.label} style={{
                background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
                padding: '12px 18px', minWidth: 110, flex: '1 1 110px',
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              background: activeTab === t.key ? '#1e40af' : '#0f172a',
              border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#1e293b'}`,
              color: activeTab === t.key ? '#93c5fd' : '#94a3b8',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              {t.icon} {t.label}
              {t.desc && <span style={{ display: 'none' }}>{t.desc}</span>}
            </button>
          ))}
        </div>

        {/* tab description */}
        {activeTab !== 'all' && (
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            {TABS.find(t => t.key === activeTab)?.desc}
          </div>
        )}

        {/* content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>กำลังคำนวณ matches…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>{error}</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div>ยังไม่มี matches — เพิ่มผู้ผลิตที่อนุมัติแล้วหรือ leads ใหม่เพื่อเริ่มจับคู่</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
            {matches.map((m, i) => (
              <MatchCard key={`${m.producer_email}-${m.lead_id}-${i}`} m={m} onRequest={load} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
