import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';

const CATS = ['ทั้งหมด', 'OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อื่นๆ'];

export default function ProducerDirectoryPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('ทั้งหมด');
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = useCallback(async (query, category) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category && category !== 'ทั้งหมด') params.set('category', category);
      const res = await fetch(apiUrl(`/api/producers/search?${params.toString()}`));
      const d = await res.json();
      setItems(d.producers || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { document.title = 'ค้นหาผู้ผลิต — Openthai.ai'; search('', 'ทั้งหมด'); }, [search]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q, cat), 350);
    return () => clearTimeout(timer.current);
  }, [q, cat, search]);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{t('mk.nav.home')}</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/catalog')} style={navBtn}>{t('mk.nav.market')}</button>
        <button onClick={() => navigate('/join')} style={navBtn}>{t('mk.nav.sell')}</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '44px 5% 18px' }}>
        <div style={badge}>{t('mk.find.badge')}</div>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, margin: '12px 0 8px' }}>{t('mk.find.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('mk.find.sub')}</p>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 5% 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mk.find.search.ph')} style={{ ...inp, flex: 1, minWidth: 220 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, maxWidth: 180 }}>
            {CATS.map((c) => <option key={c} value={c}>{c === 'ทั้งหมด' ? t('mk.find.all') : c}</option>)}
          </select>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ fontSize: 12, color: '#64748b', margin: '8px 2px 14px' }}>
          {loading ? t('mk.find.searching') : items ? t('mk.find.found').replace('{n}', items.length) : ''}
        </div>
        {items && items.length === 0 && !loading && (
          <div style={{ ...card, textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔎</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('mk.find.empty.title')}</div>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>{t('mk.find.empty.desc')}</p>
            <button onClick={() => navigate('/join')} style={primaryBtn}>{t('mk.find.empty.cta')}</button>
          </div>
        )}
        {items && items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {items.map((p, i) => (
              <div key={p.email + i} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>{p.category || 'สินค้าไทย'}</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{p.company}</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>{p.product_name}</div>
                {p.description && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: '8px 0', flex: 1 }}>{p.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 }}>
                  <span style={{ fontWeight: 900, color: '#10b981' }}>{p.price ? `฿${Number(p.price).toLocaleString('th-TH')}` : t('mk.cat.ask')}</span>
                  <button onClick={() => navigate('/catalog')} style={{ ...primaryBtn, padding: '8px 16px', fontSize: 13 }}>{t('mk.find.order')}</button>
                </div>
                {p.website && <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#64748b', marginTop: 8, textDecoration: 'none' }}>🔗 {p.website}</a>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const inp = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
