import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DisputeTrackPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [sp] = useSearchParams();
  const [id, setId] = useState(sp.get('id') || '');
  const [contact, setContact] = useState(sp.get('contact') || '');
  const [dispute, setDispute] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async (e) => {
    e?.preventDefault?.();
    if (!id.trim() || !contact.trim() || busy) return;
    setBusy(true); setErr(''); setDispute(null);
    try {
      const res = await fetch(apiUrl(`/api/disputes/${encodeURIComponent(id.trim())}/track?contact=${encodeURIComponent(contact.trim())}`));
      const d = await res.json();
      if (d.success) setDispute(d.dispute); else setErr(d.error || t('mk.dispute.notfound'));
    } catch { setErr(t('mk.dispute.notfound')); }
    finally { setBusy(false); }
  };

  useEffect(() => { document.title = t('mk.dispute.title') + ' — Openthai.ai'; if (sp.get('id') && sp.get('contact')) check(); }, []); // eslint-disable-line

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/track')} style={navBtn}>{t('mk.track.title')}</button>
      </nav>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '52px 5% 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.dispute.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.dispute.sub')}</p>
      </section>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 30px' }}>
        <form onSubmit={check} style={card}>
          <label style={lab}>{t('mk.dispute.id')}</label>
          <input style={inp} value={id} onChange={(e) => setId(e.target.value)} placeholder={t('mk.dispute.id.ph')} />
          <label style={lab}>{t('mk.dispute.contact')}</label>
          <input style={inp} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@line / email / 08x" />
          {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>⚠️ {err}</div>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.dispute.searching') : t('mk.dispute.btn')}</button>
        </form>
      </section>

      {dispute && (
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 80px' }}>
          <div style={card}>
            <div style={{ ...pill, ...statusStyle(dispute.status) }}>{t('mk.dispute.st.' + dispute.status)}</div>

            <div style={detail}><span style={{ color: '#94a3b8' }}>{t('mk.dispute.order')}</span><strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{dispute.order_id}</strong></div>
            <div style={detail}><span style={{ color: '#94a3b8' }}>{t('mk.dispute.openedby')}</span><strong>{t('mk.dispute.openedby.' + dispute.opened_by)}</strong></div>
            <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{t('mk.dispute.reason')}</div>
              <div style={{ fontSize: 14 }}>{dispute.reason}</div>
            </div>

            {dispute.counter_response?.note && (
              <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{t('mk.dispute.counter')}</div>
                <div style={{ fontSize: 14 }}>{dispute.counter_response.note}</div>
              </div>
            )}

            {dispute.resolution?.decision && (
              <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{t('mk.dispute.resolution')}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{t('mk.dispute.dec.' + dispute.resolution.decision)}</div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function statusStyle(status) {
  if (status === 'open' || status === 'ai_reviewed') return { background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' };
  if (status === 'resolved_buyer' || status === 'refunded') return { background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' };
  return { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' };
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '10px 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const pill = { display: 'inline-block', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, marginBottom: 16 };
const detail = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.04)' };
