import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Producer self-serve dashboard (/producer/dashboard) — the post-signup home for an approved producer.
// Identity is the email they applied with (same public, no-login pattern as /producers/manage and
// /dispute); one call to /api/producers/my-orders returns their status + product/stock + orders +
// an income/work summary (buyer PII already stripped server-side via publicOrderView).
export default function ProducerDashboardPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get('email') || '');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (e) => {
    e?.preventDefault?.();
    if (!email.trim() || busy) return;
    setBusy(true); setErr(''); setData(null);
    try {
      const res = await fetch(apiUrl(`/api/producers/my-orders?email=${encodeURIComponent(email.trim())}`));
      const d = await res.json();
      if (d.success) setData(d); else setErr(d.error || t('mk.pdash.notfound'));
    } catch { setErr(t('mk.pdash.notfound')); }
    finally { setBusy(false); }
  };

  useEffect(() => { document.title = t('mk.pdash.title') + ' — Openthai.ai'; }, [t]);
  useEffect(() => { if (sp.get('email')) load(); }, []); // eslint-disable-line — auto-load once on mount

  const p = data?.producer;
  const s = data?.summary;
  const stTxt = (st) => t('mk.pmanage.st.' + st);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/producers/manage' + (email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''))} style={navBtn}>{t('mk.pdash.manage')}</button>
      </nav>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '46px 5% 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.pdash.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.pdash.sub')}</p>
      </section>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 5% 24px' }}>
        <form onSubmit={load} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label htmlFor="pd-email" style={lab}>{t('mk.pdash.email')}</label>
            <input id="pd-email" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.pdash.loading') : t('mk.pdash.btn')}</button>
        </form>
        {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center' }}>⚠️ {err}</div>}
      </section>

      {data && p && (
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 5% 80px' }}>
          {/* producer status + product */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{t('mk.pdash.product')}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{p.product_name || '—'}</div>
                {p.company && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{p.company}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{t('mk.pdash.stock')}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{p.stock == null ? '∞' : p.stock}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>{stTxt(p.status)}</div>
          </div>

          {/* summary tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tile label={t('mk.pdash.s.total')} value={s.total} />
            <Tile label={t('mk.pdash.s.tohandle')} value={s.to_handle} accent="#fcd34d" />
            <Tile label={t('mk.pdash.s.delivered')} value={s.delivered} accent="#6ee7b7" />
            <Tile label={t('mk.pdash.s.value')} value={`฿${Number(s.value_total || 0).toLocaleString()}`} accent="#a5b4fc" />
          </div>

          {/* orders */}
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>{t('mk.pdash.orders')}</div>
            {(!data.orders || data.orders.length === 0) && (
              <div style={{ color: '#94a3b8', fontSize: 14, padding: '10px 0' }}>{t('mk.pdash.noorders')}</div>
            )}
            {data.orders && data.orders.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{t('mk.pdash.qty')} {o.qty} · {(o.created_at || '').slice(0, 10)}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{o.amount == null ? '—' : `฿${Number(o.amount).toLocaleString()}`}</div>
                  <span style={{ ...badge, ...badgeStyle(o.status) }}>{t('mk.pdash.os.' + o.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, accent = '#f8fafc' }) {
  return (
    <div style={{ ...card, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{value}</div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function badgeStyle(status) {
  if (status === 'cancelled') return { background: 'rgba(248,113,113,0.12)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' };
  if (status === 'delivered') return { background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' };
  if (status === 'new') return { background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' };
  return { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' };
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '0 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const badge = { display: 'inline-block', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, marginTop: 4 };
