import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { producerCategoryLabel } from '../data/portalCategories';
import { businessTypeLabel } from '../data/businessTypes';

// Middleman self-serve dashboard (/middleman/dashboard) — the post-signup home for a distributor who
// joined via /portals/middleman. Identity is the email they signed up with (same public, no-login pattern
// as the producer/consumer dashboards). One call to /api/portals/middleman/my returns their signup +
// products they can distribute (approved catalog, producer email stripped server-side) and demand signals
// (aggregate consumer-signup counts per category — no buyer identities). business_type + every category
// are localized for display; stored values stay canonical.
export default function MiddlemanDashboardPage() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
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
      const res = await fetch(apiUrl(`/api/portals/middleman/my?email=${encodeURIComponent(email.trim())}`));
      const d = await res.json();
      if (d.success) setData(d); else setErr(d.error || t('mk.mdash.notfound'));
    } catch { setErr(t('mk.mdash.notfound')); }
    finally { setBusy(false); }
  };

  useEffect(() => { document.title = t('mk.mdash.title') + ' — Openthai.ai'; }, [t]);
  useEffect(() => { if (sp.get('email')) load(); }, []); // eslint-disable-line — auto-load once on mount

  const m = data?.middleman;
  const dist = data?.distribute || [];
  const demand = data?.demand || [];
  const maxDemand = demand.reduce((mx, d) => Math.max(mx, d.count), 0) || 1;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/catalog')} style={navBtn}>{t('mk.mdash.shop')}</button>
      </nav>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '46px 5% 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.mdash.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.mdash.sub')}</p>
      </section>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 24px' }}>
        <form onSubmit={load} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label htmlFor="md-email" style={lab}>{t('mk.mdash.email')}</label>
            <input id="md-email" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.mdash.loading') : t('mk.mdash.btn')}</button>
        </form>
        {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center' }}>⚠️ {err}</div>}
      </section>

      {data && m && (
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{t('mk.mdash.welcome')}{m.name ? `, ${m.name}` : ''} 👋</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, color: '#94a3b8' }}>
              {m.business_type && <div>{t('mk.mdash.biztype')}: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{businessTypeLabel(m.business_type, lang)}</span></div>}
              {m.region && <div>{t('mk.mdash.region')}: <span style={{ color: '#f8fafc', fontWeight: 700 }}>{m.region}</span></div>}
            </div>
          </div>

          {/* demand signals */}
          <div style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>{t('mk.mdash.demand')}</div>
          {demand.length === 0 && <div style={{ ...card, color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>{t('mk.mdash.nodemand')}</div>}
          {demand.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              {demand.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                  <div style={{ width: 120, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{producerCategoryLabel(d.category, lang)}</div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((d.count / maxDemand) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#06b6d4,#6366f1)' }} />
                  </div>
                  <div style={{ width: 90, textAlign: 'right', fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{d.count} {t('mk.mdash.signups')}</div>
                </div>
              ))}
            </div>
          )}

          {/* distributable products */}
          <div style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>{t('mk.mdash.distribute')}</div>
          {dist.length === 0 && <div style={{ ...card, color: '#94a3b8', fontSize: 14 }}>{t('mk.mdash.nodistribute')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {dist.map((p, i) => (
              <div key={i} style={{ ...card, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{p.product_name}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{t('mk.mdash.by')} {p.producer || '—'} · {producerCategoryLabel(p.category, lang)}</div>
                {p.description && <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#6ee7b7' }}>{p.price == null ? '—' : `฿${Number(p.price).toLocaleString()}`}</div>
                  <button onClick={() => navigate('/catalog')} style={{ ...primaryBtn, padding: '8px 16px', fontSize: 13 }}>{t('mk.mdash.shop')}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#06b6d4,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '0 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
