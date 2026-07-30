import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const authHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TABS = [
  { key: 'all',   label: 'ทั้งหมด', icon: '🔄' },
  { key: 'B2B',   label: 'B2B',     icon: '🏢', desc: 'ผู้ผลิต ↔ คนกลาง / ครีเอเตอร์ / Affiliate' },
  { key: 'B2C',   label: 'B2C',     icon: '🛍️', desc: 'ผู้ผลิต ↔ ผู้บริโภค' },
  { key: 'B2G',   label: 'B2G',     icon: '🏛️', desc: 'ผู้ผลิต ↔ ภาครัฐ / องค์กรระหว่างประเทศ' },
  { key: 'B2B2C', label: 'B2B2C',   icon: '🔗', desc: 'ผู้ผลิต → คนกลาง → ผู้บริโภค (ห่วงโซ่ครบวงจร)' },
  { key: 'C2B',   label: 'C2B',     icon: '👥', desc: 'ผู้บริโภคค้นหาผู้ผลิต (Consumer-initiated)' },
  { key: 'G2G',   label: 'G2G',     icon: '🌐', desc: 'ภาครัฐไทย ↔ ภาครัฐ / องค์กรระหว่างประเทศ' },
  { key: 'G2B',   label: 'G2B',     icon: '🏗️', desc: 'ภาครัฐจัดซื้อจากผู้ผลิต (Government Procurement)' },
];

const TYPE_BADGE = {
  middleman:  { label: 'คนกลาง',               color: '#f97316' },
  creator:    { label: 'ครีเอเตอร์',           color: '#ec4899' },
  affiliate:  { label: 'Affiliate',             color: '#f59e0b' },
  consumer:   { label: 'ผู้บริโภค',            color: '#0ea5e9' },
  'gov-thai': { label: 'หน่วยงานรัฐไทย',       color: '#10b981' },
  'gov-intl': { label: 'รัฐต่างประเทศ',        color: '#3b82f6' },
  'intl-org': { label: 'องค์กรระหว่างประเทศ',  color: '#8b5cf6' },
  foundation: { label: 'มูลนิธิ/NGO',          color: '#059669' },
};

const MATCH_COLOR = {
  B2B:   '#f97316',
  B2C:   '#0ea5e9',
  B2G:   '#10b981',
  B2B2C: '#8b5cf6',
  C2B:   '#06b6d4',
  G2G:   '#3b82f6',
  G2B:   '#14b8a6',
};

const MATCH_LABEL = {
  B2B:   'ผู้ผลิต',
  B2C:   'ผู้ผลิต',
  B2G:   'ผู้ผลิต',
  B2B2C: 'ผู้ผลิต',
  C2B:   'ผู้ผลิต',
  G2G:   'หน่วยงานรัฐไทย',
  G2B:   'ผู้ผลิต',
};

const PARTNER_LABEL = {
  B2B:   'คู่ที่แนะนำ (Channel)',
  B2C:   'ผู้บริโภคเป้าหมาย',
  B2G:   'หน่วยงานภาครัฐ',
  B2B2C: 'Channel Partner',
  C2B:   'ผู้บริโภคที่ต้องการ',
  G2G:   'คู่หน่วยงานต่างประเทศ',
  G2B:   'ผู้ผลิต (ซัพพลายเออร์)',
};

// Max score per type (for ScoreBar normalization)
const MAX_SCORE = { B2B2C: 29, G2G: 15, default: 23 };

function ScoreBar({ score, matchType }) {
  const max = MAX_SCORE[matchType] || MAX_SCORE.default;
  const pct = Math.min(100, Math.round((score / max) * 100));
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
  const matchColor = MATCH_COLOR[m.match_type] || '#64748b';
  const producerLabel = MATCH_LABEL[m.match_type] || 'ผู้ผลิต';
  const partnerLabel  = PARTNER_LABEL[m.match_type] || 'คู่ที่แนะนำ';

  async function handleRequest() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/match/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ producer_email: m.producer_email, lead_id: m.lead_id }),
      });
      if (res.ok) { setSent(true); onRequest?.(); }
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div style={{
      background: '#0f172a', border: `1px solid ${matchColor}33`, borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              background: matchColor + '22', color: matchColor,
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            }}>{m.match_type}</span>
            <span style={{
              background: badge.color + '22', color: badge.color,
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>{badge.label}</span>
            {m.match_type === 'B2B2C' && m.consumer_count > 0 && (
              <span style={{ background: '#0ea5e933', color: '#0ea5e9', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                👥 {m.consumer_count} end-consumers
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>{producerLabel}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.producer_name || m.producer_email || '—'}
          </div>
          {(m.producer_category || m.producer_product) && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {m.producer_category}{m.producer_product ? ` · ${m.producer_product}` : ''}
            </div>
          )}
        </div>
        <ScoreBar score={m.score} matchType={m.match_type} />
      </div>

      {/* B2B2C chain indicator */}
      {m.match_type === 'B2B2C' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
          <span style={{ color: '#f97316' }}>ผู้ผลิต</span>
          <span>→</span>
          <span style={{ color: '#8b5cf6' }}>Channel</span>
          <span>→</span>
          <span style={{ color: '#0ea5e9' }}>ผู้บริโภค</span>
        </div>
      )}

      {/* partner */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{partnerLabel}</div>
        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{m.lead_name || '—'}</div>
        {m.lead_email && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.lead_email}</div>}
      </div>

      {/* action */}
      <button
        onClick={handleRequest}
        disabled={sent || loading}
        style={{
          background: sent ? '#1e293b' : matchColor,
          color: sent ? '#64748b' : '#fff',
          border: 'none', borderRadius: 8, padding: '9px 0',
          fontSize: 13, fontWeight: 600, cursor: sent ? 'default' : 'pointer',
          transition: 'background .2s', opacity: loading ? 0.7 : 1,
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
      const headers = authHeader();
      const [mRes, sRes] = await Promise.all([
        fetch(apiUrl(`/api/match/suggestions?type=${activeTab}&limit=40`), { headers }),
        fetch(apiUrl('/api/match/summary'), { headers }),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();
      if (mData.success) setMatches(mData.matches || []);
      if (sData.success) setSummary(sData);
    } catch {
      setError('โหลดข้อมูลไม่ได้ กรุณาลองใหม่');
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const statItems = summary ? [
    { label: 'ผู้ผลิตอนุมัติ',  value: summary.approved_producers ?? 0, color: '#f97316' },
    { label: 'B2B Leads',      value: summary.b2b_leads  ?? 0,          color: '#f97316' },
    { label: 'B2C Leads',      value: summary.b2c_leads  ?? 0,          color: '#0ea5e9' },
    { label: 'B2G Leads',      value: summary.b2g_leads  ?? 0,          color: '#10b981' },
    { label: 'G2G ไทย',        value: summary.g2g_thai   ?? 0,          color: '#3b82f6' },
    { label: 'G2G นานาชาติ',   value: summary.g2g_intl   ?? 0,          color: '#8b5cf6' },
    { label: 'คำขอจับคู่',     value: summary.total_requests ?? 0,      color: '#64748b' },
  ] : [];

  const activeTabInfo = TABS.find(t => t.key === activeTab);

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', fontFamily: 'sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>
            🔄 ระบบจับคู่อัตโนมัติ
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            B2B · B2C · B2G · B2B2C · C2B · G2G · G2B — จับคู่อัตโนมัติตาม category และ region
          </p>
        </div>

        {/* summary stats */}
        {summary && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            {statItems.map(s => (
              <div key={s.label} style={{
                background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
                padding: '10px 14px', minWidth: 90, flex: '1 1 90px',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              background: activeTab === t.key ? '#1e40af' : '#0f172a',
              border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#1e293b'}`,
              color: activeTab === t.key ? '#93c5fd' : '#94a3b8',
              borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* tab description */}
        {activeTab !== 'all' && activeTabInfo?.desc && (
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            {activeTabInfo.icon} {activeTabInfo.desc}
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
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
            {matches.map((m, i) => (
              <MatchCard key={`${m.producer_email}-${m.lead_id}-${i}`} m={m} onRequest={load} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
