import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const CATS = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อาหารสัตว์เลี้ยง', 'สินค้าดิจิทัล', 'อื่นๆ'];

export default function ProducerManagePage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get('email') || '');
  const [rec, setRec] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => { document.title = t('mk.pmanage.title') + ' — Openthai.ai'; }, [t]);
  React.useEffect(() => { if (sp.get('email')) check(); }, []); // eslint-disable-line

  const check = async (e) => {
    e?.preventDefault?.();
    if (!email.trim() || busy) return;
    setBusy(true); setErr(''); setRec(null); setForm(null); setSaved(false);
    try {
      const res = await fetch(apiUrl(`/api/producers/my-status?email=${encodeURIComponent(email.trim())}`));
      const d = await res.json();
      if (d.success) {
        setRec(d);
        setForm({ product_name: d.product_name || '', category: d.category || CATS[0], price: d.price ?? '', stock: d.stock ?? '', description: d.description || '' });
      } else setErr(d.error || t('mk.pmanage.notfound'));
    } catch { setErr(t('mk.pmanage.notfound')); }
    finally { setBusy(false); }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form || saveBusy) return;
    setSaveBusy(true); setErr(''); setSaved(false);
    try {
      const res = await fetch(apiUrl('/api/producers/update-listing'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), ...form }),
      });
      const d = await res.json();
      if (d.success) setSaved(true); else setErr(d.error || t('mk.pmanage.notfound'));
    } catch { setErr(t('mk.pmanage.notfound')); }
    finally { setSaveBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <button onClick={() => navigate('/join')} style={navBtn}>{t('mk.nav.market')}</button>
      </nav>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '52px 5% 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,38px)', fontWeight: 900, margin: '0 0 8px' }}>{t('mk.pmanage.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.pmanage.sub')}</p>
      </section>

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 30px' }}>
        <form onSubmit={check} style={card}>
          <label htmlFor="pmanage-email" style={lab}>{t('mk.pmanage.email')}</label>
          <input id="pmanage-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>⚠️ {err}</div>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: busy ? 0.7 : 1 }}>{busy ? t('mk.pmanage.searching') : t('mk.pmanage.btn')}</button>
        </form>
      </section>

      {rec && (
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 80px' }}>
          <div style={card}>
            <div style={{ ...pill, background: STATUS_BG[rec.status] || 'rgba(148,163,184,0.12)', color: STATUS_COLOR[rec.status] || '#94a3b8', marginBottom: 16 }}>
              {t('mk.pmanage.st.' + rec.status)}
            </div>

            {rec.status === 'approved' && form && (
              <form onSubmit={save}>
                <label htmlFor="pm-product" style={lab}>{t('mk.pmanage.f.product')}</label>
                <input id="pm-product" style={inp} value={form.product_name} onChange={set('product_name')} />
                <label htmlFor="pm-category" style={lab}>{t('mk.pmanage.f.category')}</label>
                <select id="pm-category" style={inp} value={form.category} onChange={set('category')}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label htmlFor="pm-price" style={lab}>{t('mk.pmanage.f.price')}</label>
                    <input id="pm-price" style={inp} type="number" min="0" value={form.price} onChange={set('price')} />
                  </div>
                  <div>
                    <label htmlFor="pm-stock" style={lab}>{t('mk.pmanage.f.stock')}</label>
                    <input id="pm-stock" style={inp} type="number" min="0" value={form.stock} onChange={set('stock')} />
                  </div>
                </div>
                <label htmlFor="pm-desc" style={lab}>{t('mk.pmanage.f.desc')}</label>
                <textarea id="pm-desc" style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={set('description')} />
                {saved && <div style={{ color: '#6ee7b7', fontSize: 13, marginTop: 10 }}>✅ {t('mk.pmanage.saved')}</div>}
                {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>⚠️ {err}</div>}
                <button type="submit" disabled={saveBusy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: saveBusy ? 0.7 : 1 }}>{saveBusy ? t('mk.pmanage.saving') : t('mk.pmanage.save')}</button>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const STATUS_BG = { pending: 'rgba(245,158,11,0.12)', approved: 'rgba(16,185,129,0.12)', rejected: 'rgba(239,68,68,0.12)', suspended: 'rgba(148,163,184,0.12)' };
const STATUS_COLOR = { pending: '#fcd34d', approved: '#6ee7b7', rejected: '#fca5a5', suspended: '#94a3b8' };

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const lab = { display: 'block', fontSize: 12, color: '#94a3b8', margin: '10px 0 5px', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const pill = { display: 'inline-block', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700 };
