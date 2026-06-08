import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const FLOW = ['new', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const ICON = { new: '📝', confirmed: '✅', packed: '📦', shipped: '🚚', out_for_delivery: '🛵', delivered: '🏠', cancelled: '❌' };

export default function TrackOrderPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [sp] = useSearchParams();
  const [id, setId] = useState(sp.get('id') || '');
  const [contact, setContact] = useState(sp.get('contact') || '');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const track = async (e) => {
    e?.preventDefault?.();
    if (!id.trim() || !contact.trim() || busy) return;
    setBusy(true); setErr(''); setOrder(null);
    try {
      const res = await fetch(apiUrl(`/api/orders/track?id=${encodeURIComponent(id.trim())}&contact=${encodeURIComponent(contact.trim())}`));
      const d = await res.json();
      if (d.success) setOrder(d.order); else setErr(d.error || t('mk.track.notfound'));
    } catch { setErr(t('mk.track.notfound')); }
    finally { setBusy(false); }
  };

  useEffect(() => { document.title = 'Track — Openthai.ai'; if (sp.get('id') && sp.get('contact')) track(); }, []); // eslint-disable-line

  const stLabel = (s) => t('mk.track.st.' + s);
  const curIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/catalog')} style={navBtn}>{t('mk.nav.market')}</button>
      </nav>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '52px 5% 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.track.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.track.sub')}</p>
      </section>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 30px' }}>
        <form onSubmit={track} style={card}>
          <label style={lab}>{t('mk.track.id')}</label>
          <input style={inp} value={id} onChange={(e) => setId(e.target.value)} placeholder="ord_..." />
          <label style={lab}>{t('mk.track.contact')}</label>
          <input style={inp} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@line / email / 08x" />
          {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>⚠️ {err}</div>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.track.searching') : t('mk.track.btn')}</button>
        </form>
      </section>

      {order && (
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 80px' }}>
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{order.product_name} <span style={{ color: '#10b981' }}>×{order.qty}</span></div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{t('mk.track.placed')}: {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</div>

            {order.status === 'cancelled' ? (
              <div style={{ ...pill, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>❌ {stLabel('cancelled')}</div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                {FLOW.map((s, i) => {
                  const done = i <= curIdx;
                  return (
                    <div key={s} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      {i > 0 && <div style={{ position: 'absolute', top: 16, left: '-50%', width: '100%', height: 2, background: i <= curIdx ? '#10b981' : 'rgba(255,255,255,0.1)' }} />}
                      <div style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: done ? '#10b981' : 'rgba(255,255,255,0.06)', opacity: done ? 1 : 0.5 }}>{ICON[s]}</div>
                      <div style={{ fontSize: 9, color: done ? '#cbd5e1' : '#475569', lineHeight: 1.2 }}>{stLabel(s)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* shipping detail */}
            {(order.carrier || order.tracking_no) && (
              <div style={detail}><span style={{ color: '#64748b' }}>🚚 {t('mk.track.carrier')}/{t('mk.track.trackno')}</span><strong>{order.carrier} {order.tracking_no}</strong></div>
            )}
            {order.received_by && <div style={detail}><span style={{ color: '#64748b' }}>✍️ {t('mk.track.received')}</span><strong>{order.received_by}</strong></div>}
            {order.drop_off && <div style={detail}><span style={{ color: '#64748b' }}>📍 {t('mk.track.dropoff')}</span><strong>{order.drop_off}</strong></div>}
            {order.delivered_at && <div style={detail}><span style={{ color: '#64748b' }}>🏠 {stLabel('delivered')}</span><strong style={{ color: '#10b981' }}>{new Date(order.delivered_at).toLocaleString()}</strong></div>}

            {/* timeline */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              {[...(order.history || [])].reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', fontSize: 13 }}>
                  <span>{ICON[h.status] || '•'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{stLabel(h.status)}{h.note ? <span style={{ color: '#64748b', fontWeight: 400 }}> · {h.note}</span> : ''}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{h.at ? new Date(h.at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '10px 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const pill = { display: 'inline-block', borderRadius: 20, padding: '6px 16px', fontSize: 14, fontWeight: 700 };
const detail = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.04)' };
