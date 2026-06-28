import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── Content Studio — คลังสินค้า + เครื่องสร้างแคปชั่น (human-in-the-loop) ────────
// ใส่สินค้า → สร้างแคปชั่นเฉพาะแต่ละแพลตฟอร์ม → ก๊อปไปโพสต์เอง (ระบบไม่โพสต์อัตโนมัติ)

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { id: 'facebook',  label: 'Facebook',  icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'line',      label: 'LINE',      icon: '💚' },
];
const STORAGE_KEY = 'content_studio_products';

export default function ContentStudioPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ name: '', price: '', features: '', link: '', hashtags: '' });
  const [sel, setSel] = useState(PLATFORMS.map(p => p.id));
  const [captions, setCaptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [catalog, setCatalog] = useState(null);   // สินค้าจริงจากคลัง (/api/shop/products)
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }, [products]);

  const togglePlatform = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // ดึงสินค้าจริงจากคลัง (เพิ่มได้ที่ /admin → คลังสินค้า) มาสร้างแคปชั่น
  const loadCatalog = async () => {
    setCatalogLoading(true); setError('');
    try {
      const res = await fetch(apiUrl('/api/shop/products'));
      const data = await res.json();
      if (!data.success) throw new Error('โหลดคลังสินค้าไม่สำเร็จ');
      setCatalog(data.products || []);
    } catch (e) { setError(e.message); } finally { setCatalogLoading(false); }
  };

  // เลือกสินค้าจริง → เติมฟอร์ม + สร้างลิงก์ /pay (พร้อมเพย์) อัตโนมัติ
  const pickCatalogProduct = (p) => {
    const payLink = `${window.location.origin}/pay?amount=${encodeURIComponent(p.price || 0)}&label=${encodeURIComponent(p.name || '')}`;
    setForm({ name: p.name || '', price: p.price || '', features: p.description || '', link: payLink, hashtags: '' });
    setCaptions(null); setCatalog(null);
  };

  const saveProduct = () => {
    if (!form.name.trim()) { setError('กรอกชื่อสินค้าก่อน'); return; }
    setProducts(ps => [{ ...form, id: Date.now() }, ...ps].slice(0, 100));
    setError('');
  };
  const loadProduct = (p) => { setForm({ name: p.name, price: p.price, features: p.features, link: p.link, hashtags: p.hashtags }); setCaptions(null); };
  const removeProduct = (id) => setProducts(ps => ps.filter(p => p.id !== id));

  const generate = async () => {
    if (!form.name.trim()) { setError('กรอกชื่อสินค้าก่อน'); return; }
    if (!sel.length) { setError('เลือกอย่างน้อย 1 แพลตฟอร์ม'); return; }
    setError(''); setLoading(true); setCaptions(null);
    try {
      const res = await fetch(apiUrl('/api/captions/generate'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, platforms: sel }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'สร้างแคปชั่นไม่สำเร็จ');
      setCaptions(data.captions);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(key); setTimeout(() => setCopied(''), 2000); };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px', outline: 'none' };
  const lbl = { fontSize: '12px', color: '#a0a0b0', display: 'block', margin: '0 0 6px' };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/earn')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← ศูนย์รายได้</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>✍️ Content Studio — คลังสินค้า + สร้างแคปชั่น</h1>
      </div>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 20px', display: 'grid', gap: '20px' }}>

        {/* ดึงสินค้าจริงจากคลัง */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>🏭 สินค้าจริงจากคลัง</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>เพิ่มสินค้าได้ที่ <strong style={{ color: '#a5b4fc', cursor: 'pointer' }} onClick={() => navigate('/admin')}>/admin → คลังสินค้า</strong> แล้วดึงมาสร้างแคปชั่น + ลิงก์ /pay อัตโนมัติ</div>
            </div>
            <button onClick={loadCatalog} disabled={catalogLoading} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {catalogLoading ? '⏳ กำลังโหลด…' : '📦 ดึงสินค้าจริง'}
            </button>
          </div>
          {catalog && (
            <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
              {catalog.length === 0 && <div style={{ fontSize: '13px', color: '#94a3b8' }}>ยังไม่มีสินค้าในคลัง — ไปเพิ่มที่ <strong style={{ color: '#a5b4fc', cursor: 'pointer' }} onClick={() => navigate('/admin')}>/admin</strong> ก่อน</div>}
              {catalog.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  {p.image_url && <img src={p.image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{p.price ? ` · ฿${Number(p.price).toLocaleString()}` : ''}</div>
                    <div style={{ fontSize: '12px', color: p.in_stock ? '#6ee7b7' : '#fca5a5' }}>{p.in_stock ? `มีสต๊อก ${p.stock}` : 'หมดสต๊อก'}</div>
                  </div>
                  <button onClick={() => pickCatalogProduct(p)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>เลือก</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ฟอร์มสินค้า */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>📦 ข้อมูลสินค้า</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div><label style={lbl}>ชื่อสินค้า *</label><input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น เครื่องฟอกอากาศมินิ" /></div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}><label style={lbl}>ราคา (บาท)</label><input style={input} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="890" inputMode="numeric" /></div>
              <div style={{ flex: 2, minWidth: '180px' }}><label style={lbl}>ลิงก์สั่งซื้อ/affiliate</label><input style={input} value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div><label style={lbl}>จุดเด่นสินค้า</label><input style={input} value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="กรองฝุ่น PM2.5 ใน 10 นาที เงียบ ประหยัดไฟ" /></div>
            <div><label style={lbl}>แฮชแท็ก (เว้นว่างได้ ระบบใส่ให้)</label><input style={input} value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#ของดีบอกต่อ #รีวิวสินค้า" /></div>
          </div>

          {/* เลือกแพลตฟอร์ม */}
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>เลือกแพลตฟอร์ม</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  style={{ padding: '8px 14px', borderRadius: '20px', border: `1px solid ${sel.includes(p.id) ? '#6366f1' : 'rgba(255,255,255,0.15)'}`, background: sel.includes(p.id) ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', color: '#fca5a5', marginTop: '14px', fontSize: '13px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button onClick={generate} disabled={loading} style={{ flex: 1, minWidth: '180px', padding: '13px', borderRadius: '10px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ กำลังสร้าง…' : '✨ สร้างแคปชั่น'}
            </button>
            <button onClick={saveProduct} style={{ padding: '13px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>💾 บันทึกเข้าคลัง</button>
          </div>
        </div>

        {/* แคปชั่นที่สร้าง */}
        {captions && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6ee7b7', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
              ✅ ก๊อปแคปชั่นไปโพสต์เองในแต่ละแอป — ระบบไม่โพสต์อัตโนมัติ (ป้องกันบัญชีโดนแบนจากการละเมิด ToS)
            </div>
            {PLATFORMS.filter(p => captions[p.id]).map(p => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800 }}>{p.icon} {p.label}</span>
                  <button onClick={() => copy(captions[p.id], p.id)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: copied === p.id ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    {copied === p.id ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
                  </button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px', color: '#e5e7eb', lineHeight: 1.6 }}>{captions[p.id]}</pre>
              </div>
            ))}
          </div>
        )}

        {/* คลังสินค้า */}
        {products.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>🗂️ คลังสินค้า ({products.length})</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{p.price ? ` · ฿${p.price}` : ''}</div>
                    {p.features && <div style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.features}</div>}
                  </div>
                  <button onClick={() => loadProduct(p)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.4)', background: 'transparent', color: '#a5b4fc', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>ใช้</button>
                  <button onClick={() => removeProduct(p.id)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#fca5a5', fontSize: '12px', cursor: 'pointer' }}>ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>
          ⚠️ ตรงไปตรงมา: เครื่องมือนี้ช่วย <strong style={{ color: '#cbd5e1' }}>เขียนแคปชั่น</strong> ให้คุณก๊อปไปโพสต์เอง — ไม่โพสต์อัตโนมัติแทน เพราะ TikTok/Meta/LINE ห้ามบอทโพสต์ (โพสต์อัตโนมัติ = เสี่ยงโดนแบนถาวร) ยอดขายจริงเกิดเมื่อคุณโพสต์สม่ำเสมอ + ตอบลูกค้าเอง
        </div>
      </div>
    </div>
  );
}
