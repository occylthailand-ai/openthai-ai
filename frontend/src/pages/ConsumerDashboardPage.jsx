import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { producerCategoryLabel } from '../data/portalCategories';

// Consumer self-serve dashboard (/consumer/dashboard) — the post-signup home for someone who joined via
// /portals/consumer. Identity is the email they signed up with (same public, no-login pattern as the
// producer dashboard and /dispute); one call to /api/portals/consumer/my returns their interest + product
// recommendations matched to it from the real approved catalog (producer contact email already stripped
// server-side). The interest + each recommendation's category are localized for display via
// producerCategoryLabel — the stored value stays the canonical Thai category.
export default function ConsumerDashboardPage() {
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
      const res = await fetch(apiUrl(`/api/portals/consumer/my?email=${encodeURIComponent(email.trim())}`));
      const d = await res.json();
      if (d.success) setData(d); else setErr(d.error || t('mk.cdash.notfound'));
    } catch { setErr(t('mk.cdash.notfound')); }
    finally { setBusy(false); }
  };

  useEffect(() => { document.title = t('mk.cdash.title') + ' — Openthai.ai'; }, [t]);
  useEffect(() => { if (sp.get('email')) load(); }, []); // eslint-disable-line — auto-load once on mount

  const c = data?.consumer;
  const recs = data?.recommendations || [];

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/catalog')} style={navBtn}>{t('mk.cdash.shop')}</button>
      </nav>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '46px 5% 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🛍️</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.cdash.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.cdash.sub')}</p>
      </section>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 24px' }}>
        <form onSubmit={load} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label htmlFor="cd-email" style={lab}>{t('mk.cdash.email')}</label>
            <input id="cd-email" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.cdash.loading') : t('mk.cdash.btn')}</button>
        </form>
        {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center' }}>⚠️ {err}</div>}
      </section>

      {data && c && (
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{t('mk.cdash.welcome')}{c.name ? `, ${c.name}` : ''} 👋</div>
            {c.interest && (
              <div style={{ marginTop: 8, fontSize: 14, color: '#94a3b8' }}>
                {t('mk.cdash.interest')}: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{producerCategoryLabel(c.interest, lang)}</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>{t('mk.cdash.recs')}</div>
          {recs.length === 0 && <div style={{ ...card, color: '#94a3b8', fontSize: 14 }}>{t('mk.cdash.norecs')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {recs.map((p, i) => (
              <div key={i} style={{ ...card, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{p.product_name}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{t('mk.cdash.by')} {p.producer || '—'} · {producerCategoryLabel(p.category, lang)}</div>
                {p.description && <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#6ee7b7' }}>{p.price == null ? '—' : `฿${Number(p.price).toLocaleString()}`}</div>
                  <button onClick={() => navigate('/catalog')} style={{ ...primaryBtn, padding: '8px 16px', fontSize: 13 }}>{t('mk.cdash.shop')}</button>
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
