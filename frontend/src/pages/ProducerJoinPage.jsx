import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';

const FALLBACK_CATS = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อื่นๆ'];

export default function ProducerJoinPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [cats, setCats] = useState(FALLBACK_CATS);
  const [form, setForm] = useState({ company: '', contact_name: '', email: '', phone: '', website: '', category: 'OTOP', product_name: '', price: '', stock: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = 'ผู้ผลิต/แบรนด์ มาสังกัด — OpenThaiAi';
    fetch(apiUrl('/api/producers/categories')).then(r => r.json()).then(d => { if (d.success) setCats(d.categories); }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!form.company.trim() || !form.contact_name.trim() || !form.email.trim()) { setErr(t('mk.join.err')); return; }
    setBusy(true);
    try {
      const res = await fetch(apiUrl('/api/producers/apply'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (d.success) setDone(true);
      else setErr(d.error || t('mk.join.err'));
    } catch { setErr('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/affiliate')} style={navBtn}>{t('mk.nav.aff')}</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '52px 5% 24px' }}>
        <div style={badge}>{t('mk.join.badge')}</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,46px)', fontWeight: 900, margin: '12px 0 10px' }}>{t('mk.join.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>{t('mk.join.sub')}</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
          {[t('mk.join.vp1'), t('mk.join.vp2'), t('mk.join.vp3')].map((v) => (
            <div key={v} style={{ ...card, padding: '12px 18px', fontSize: 13, color: '#cbd5e1' }}>{v}</div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 5% 80px' }}>
        {done ? (
          <div style={{ ...card, textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontWeight: 900, marginBottom: 8 }}>{t('mk.join.ok.title')}</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>{t('mk.join.ok.desc')}</p>
            <button onClick={() => navigate('/')} style={{ ...primaryBtn, marginTop: 20 }}>{t('mk.join.ok.back')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={card}>
            <Field label={t('mk.join.f.company')}><input style={inp} value={form.company} onChange={set('company')} placeholder={t('mk.join.f.company.ph')} /></Field>
            <Row>
              <Field label={t('mk.join.f.contact')}><input style={inp} value={form.contact_name} onChange={set('contact_name')} placeholder={t('mk.join.f.contact.ph')} /></Field>
              <Field label={t('mk.join.f.phone')}><input style={inp} value={form.phone} onChange={set('phone')} placeholder="08x-xxx-xxxx" /></Field>
            </Row>
            <Row>
              <Field label={t('mk.join.f.email')}><input style={inp} type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></Field>
              <Field label={t('mk.join.f.web')}><input style={inp} value={form.website} onChange={set('website')} placeholder="facebook.com/..." /></Field>
            </Row>
            <Row>
              <Field label={t('mk.join.f.cat')}>
                <select style={inp} value={form.category} onChange={set('category')}>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={t('mk.join.f.price')}><input style={inp} type="number" value={form.price} onChange={set('price')} placeholder={t('mk.join.f.price.ph')} /></Field>
            </Row>
            <Row>
              <Field label={t('mk.join.f.product')}><input style={inp} value={form.product_name} onChange={set('product_name')} placeholder={t('mk.join.f.product.ph')} /></Field>
              <Field label={t('mk.join.f.stock')}><input style={inp} type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="—" /></Field>
            </Row>
            <Field label={t('mk.join.f.desc')}><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder={t('mk.join.f.desc.ph')} /></Field>
            {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 4 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: busy ? 0.7 : 1 }}>
              {busy ? t('mk.join.submitting') : t('mk.join.submit')}
            </button>
            <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 12 }}>{t('mk.join.note')}</p>
          </form>
        )}
      </section>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);
const Row = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#fbbf24', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
