import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';

export default function CatalogPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [products, setProducts] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    document.title = 'ตลาดสินค้าไทย — OpenThaiAi';
    fetch(apiUrl('/api/catalog')).then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => setProducts([]));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/track')} style={navBtn}>{t('mk.nav.track')}</button>
        <button onClick={() => navigate('/find-producers')} style={navBtn}>{t('mk.nav.find')}</button>
        <button onClick={() => navigate('/join')} style={navBtn}>{t('mk.nav.sell')}</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '48px 5% 24px' }}>
        <div style={badge}>{t('mk.cat.badge')}</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 900, margin: '12px 0 8px' }}>{t('mk.cat.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>{t('mk.cat.sub')}</p>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        {products === null && <div style={{ ...card, color: '#64748b', textAlign: 'center' }}>{t('mk.cat.loading')}</div>}
        {products && products.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🏭</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('mk.cat.empty.title')}</div>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>{t('mk.cat.empty.desc')}</p>
            <button onClick={() => navigate('/join')} style={primaryBtn}>{t('mk.cat.empty.cta')}</button>
          </div>
        )}
        {products && products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
            {products.map((p, i) => (
              <div key={p.email + i} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>{p.category || 'สินค้าไทย'}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.product_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{t('mk.cat.by')} {p.producer}</div>
                {p.description && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{p.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{p.price ? `฿${Number(p.price).toLocaleString('th-TH')}` : t('mk.cat.ask')}</span>
                  <button onClick={() => setOrder(p)} style={{ ...primaryBtn, padding: '9px 18px', fontSize: 13 }}>{t('mk.cat.order')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {order && <OrderModal product={order} onClose={() => setOrder(null)} t={t} />}
    </div>
  );
}

function OrderModal({ product, onClose, t }) {
  const [form, setForm] = useState({ customer_name: '', contact: '', qty: 1, address: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const total = product.price ? Number(product.price) * (parseInt(form.qty, 10) || 1) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.customer_name.trim() || !form.contact.trim()) { setErr(t('mk.ord.err')); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producer_email: product.email, product_name: product.product_name, price: product.price, ...form }),
      });
      const d = await res.json();
      if (d.success) { setOrderId(d.id || ''); setDone(true); } else setErr(d.error || t('mk.ord.err'));
    } catch { setErr('เชื่อมต่อไม่ได้ ลองใหม่'); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 400, position: 'relative' }}>
        <button onClick={onClose} aria-label="close" style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer' }}>×</button>
        {done ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
            <h3 style={{ fontWeight: 900, marginBottom: 6 }}>{t('mk.ord.ok.title')}</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{product.producer} {t('mk.ord.ok.desc')}</p>
            {orderId && (
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, marginTop: 14, fontSize: 12 }}>
                <div style={{ color: '#64748b' }}>{t('mk.track.id')}</div>
                <div style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all', marginBottom: 8 }}>{orderId}</div>
                <a href={`/track?id=${encodeURIComponent(orderId)}&contact=${encodeURIComponent(form.contact)}`} style={{ ...primaryBtn, display: 'inline-block', textDecoration: 'none', padding: '8px 18px', fontSize: 13 }}>{t('mk.nav.track')}</a>
              </div>
            )}
            <button onClick={onClose} style={{ ...primaryBtn, marginTop: 14 }}>{t('mk.ord.close')}</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{t('mk.ord.title')}: {product.product_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{t('mk.ord.by')} {product.producer}{product.price ? ` · ฿${Number(product.price).toLocaleString('th-TH')}` : ''}</div>
            <label style={lab}>{t('mk.ord.name')}</label>
            <input style={inp} value={form.customer_name} onChange={set('customer_name')} placeholder={t('mk.ord.name.ph')} />
            <label style={lab}>{t('mk.ord.contact')}</label>
            <input style={inp} value={form.contact} onChange={set('contact')} placeholder={t('mk.ord.contact.ph')} />
            <label style={lab}>{t('mk.ord.qty')}</label>
            <input style={inp} type="number" min="1" value={form.qty} onChange={set('qty')} />
            <label style={lab}>{t('mk.ord.address')}</label>
            <textarea style={{ ...inp, minHeight: 52, resize: 'vertical' }} value={form.address} onChange={set('address')} placeholder={t('mk.ord.address.ph')} />
            <label style={lab}>{t('mk.ord.note')}</label>
            <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={form.note} onChange={set('note')} placeholder={t('mk.ord.note.ph')} />
            {total != null && <div style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', margin: '4px 0 12px' }}>{t('mk.ord.total')} ฿{total.toLocaleString('th-TH')}</div>}
            {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.ord.submitting') : t('mk.ord.submit')}</button>
          </form>
        )}
      </div>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#34d399', fontWeight: 600 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const overlay = { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '10px 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
