import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function StorePage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [products, setProducts] = useState(null);
  const [buy, setBuy] = useState(null);

  useEffect(() => {
    document.title = 'Openthai Store';
    fetch(apiUrl('/api/shop/products')).then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => setProducts([]));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/track')} style={navBtn}>{t('mk.nav.track')}</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '48px 5% 24px' }}>
        <div style={badge}>🛍️ {t('mk.store.title')}</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 900, margin: '12px 0 8px' }}>{t('mk.store.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>{t('mk.store.sub')}</p>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        {products === null && <div style={{ ...card, color: '#64748b', textAlign: 'center' }}>{t('mk.cat.loading')}</div>}
        {products && products.length === 0 && <div style={{ ...card, textAlign: 'center', padding: 40, color: '#64748b' }}>🛍️ {t('mk.store.empty')}</div>}
        {products && products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 18 }}>
            {products.map((p) => (
              <div key={p.id} style={{ ...card, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  : <div style={{ height: 150, background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(254,44,85,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>{p.category}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, margin: '2px 0 6px' }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{p.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: 19, fontWeight: 900, color: '#10b981' }}>฿{Number(p.price).toLocaleString('th-TH')}</span>
                    {p.in_stock
                      ? <button onClick={() => setBuy(p)} style={{ ...primaryBtn, padding: '8px 16px', fontSize: 13 }}>{t('mk.store.buy')}</button>
                      : <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{t('mk.store.soldout')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {buy && <BuyModal product={buy} t={t} onClose={() => setBuy(null)} />}
    </div>
  );
}

function BuyModal({ product, t, onClose }) {
  const [form, setForm] = useState({ customer_name: '', contact: '', address: '', qty: 1, method: 'promptpay' });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const total = Number(product.price) * (parseInt(form.qty, 10) || 1);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.customer_name.trim() || !form.contact.trim()) { setErr(t('mk.ord.err')); return; }
    setBusy(true); setErr('');
    try {
      const ref = (() => { try { return localStorage.getItem('otai_ref') || ''; } catch { return ''; } })();
      const r = await fetch(apiUrl('/api/shop/checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: product.id, ref, ...form }) }).then(x => x.json());
      if (r.success) setRes(r); else setErr(r.error || t('mk.ord.err'));
    } catch { setErr('เชื่อมต่อไม่ได้'); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 400, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer' }}>×</button>
        {res ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{res.paid ? '🎉' : '⏳'}</div>
            <h3 style={{ fontWeight: 900, marginBottom: 6 }}>{res.paid ? t('mk.store.paid') : t('mk.store.pending')}</h3>
            {res.qr_image_url && <img src={res.qr_image_url} alt="PromptPay QR" style={{ width: 200, height: 200, background: '#fff', borderRadius: 10, padding: 6, margin: '8px 0' }} />}
            {!res.paid && !res.qr_image_url && <p style={{ color: '#94a3b8', fontSize: 13 }}>{res.message || t('mk.store.qr')}</p>}
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 12 }}>
              <div style={{ color: '#64748b' }}>{t('mk.track.id')}</div>
              <div style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{res.order_id}</div>
            </div>
            <a href={`/track?id=${encodeURIComponent(res.order_id)}&contact=${encodeURIComponent(form.contact)}`} style={{ ...primaryBtn, display: 'inline-block', textDecoration: 'none', padding: '10px 22px' }}>{t('mk.nav.track')}</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{t('mk.store.buy')}: {product.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>฿{Number(product.price).toLocaleString('th-TH')} · {t('mk.cat.by')} Openthai</div>
            <label style={lab}>{t('mk.ord.name')}</label><input style={inp} value={form.customer_name} onChange={set('customer_name')} placeholder={t('mk.ord.name.ph')} />
            <label style={lab}>{t('mk.ord.contact')}</label><input style={inp} value={form.contact} onChange={set('contact')} placeholder={t('mk.ord.contact.ph')} />
            <label style={lab}>{t('mk.ord.qty')}</label><input style={inp} type="number" min="1" value={form.qty} onChange={set('qty')} />
            <label style={lab}>{t('mk.ord.address')}</label><textarea style={{ ...inp, minHeight: 48, resize: 'vertical' }} value={form.address} onChange={set('address')} placeholder={t('mk.ord.address.ph')} />
            <label style={lab}>{t('mk.store.method')}</label>
            <select style={inp} value={form.method} onChange={set('method')}><option value="promptpay">📱 PromptPay</option><option value="card">💳 บัตรเครดิต/เดบิต</option></select>
            <div style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', margin: '10px 0' }}>{t('mk.ord.total')} ฿{total.toLocaleString('th-TH')}</div>
            {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', opacity: busy ? 0.7 : 1 }}>{busy ? '...' : `💳 ${t('mk.store.buy')}`}</button>
          </form>
        )}
      </div>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const badge = { display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#34d399', fontWeight: 600 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const overlay = { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '9px 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
