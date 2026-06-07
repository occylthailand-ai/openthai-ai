import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

export default function CatalogPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);
  const [order, setOrder] = useState(null);     // สินค้าที่กำลังสั่ง (เปิด modal)

  useEffect(() => {
    document.title = 'ตลาดสินค้าไทย — Openthai.ai';
    fetch(apiUrl('/api/catalog')).then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => setProducts([]));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/join')} style={navBtn}>🏭 ขายกับเรา</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '48px 5% 24px' }}>
        <div style={badge}>🛒 ตลาดสินค้าไทย</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 900, margin: '12px 0 8px' }}>สินค้าไทยจากผู้ผลิตโดยตรง</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>เลือกสินค้า → สั่งซื้อ → ผู้ผลิตติดต่อกลับเพื่อยืนยันและจัดส่ง</p>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        {products === null && <div style={{ ...card, color: '#64748b', textAlign: 'center' }}>กำลังโหลดสินค้า…</div>}
        {products && products.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🏭</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>ยังไม่มีสินค้าในตลาด</div>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>เป็นผู้ผลิตรายแรกที่เอาสินค้ามาขายกับครีเอเตอร์ทั่วไทย</p>
            <button onClick={() => navigate('/join')} style={primaryBtn}>🏭 สมัครเป็นผู้ผลิต →</button>
          </div>
        )}
        {products && products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
            {products.map((p, i) => (
              <div key={p.email + i} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>{p.category || 'สินค้าไทย'}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.product_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>โดย {p.producer}</div>
                {p.description && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{p.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{p.price ? `฿${Number(p.price).toLocaleString('th-TH')}` : 'สอบถาม'}</span>
                  <button onClick={() => setOrder(p)} style={{ ...primaryBtn, padding: '9px 18px', fontSize: 13 }}>สั่งซื้อ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {order && <OrderModal product={order} onClose={() => setOrder(null)} />}
    </div>
  );
}

function OrderModal({ product, onClose }) {
  const [form, setForm] = useState({ customer_name: '', contact: '', qty: 1, note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const total = product.price ? Number(product.price) * (parseInt(form.qty, 10) || 1) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.customer_name.trim() || !form.contact.trim()) { setErr('กรอกชื่อและช่องทางติดต่อ'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producer_email: product.email, product_name: product.product_name, price: product.price, ...form }),
      });
      const d = await res.json();
      if (d.success) setDone(true); else setErr(d.error || 'สั่งซื้อไม่สำเร็จ');
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
            <h3 style={{ fontWeight: 900, marginBottom: 6 }}>สั่งซื้อสำเร็จ!</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>ผู้ผลิต ({product.producer}) จะติดต่อกลับเพื่อยืนยันและจัดส่ง</p>
            <button onClick={onClose} style={{ ...primaryBtn, marginTop: 18 }}>ปิด</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>สั่งซื้อ: {product.product_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>โดย {product.producer}{product.price ? ` · ฿${Number(product.price).toLocaleString('th-TH')}/ชิ้น` : ''}</div>
            <label style={lab}>ชื่อผู้สั่ง *</label>
            <input style={inp} value={form.customer_name} onChange={set('customer_name')} placeholder="ชื่อ-นามสกุล" />
            <label style={lab}>ช่องทางติดต่อ * (โทร/LINE/อีเมล)</label>
            <input style={inp} value={form.contact} onChange={set('contact')} placeholder="08x... หรือ @line" />
            <label style={lab}>จำนวน</label>
            <input style={inp} type="number" min="1" value={form.qty} onChange={set('qty')} />
            <label style={lab}>หมายเหตุ</label>
            <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={form.note} onChange={set('note')} placeholder="ที่อยู่จัดส่ง / รายละเอียดเพิ่มเติม" />
            {total != null && <div style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', margin: '4px 0 12px' }}>รวม ฿{total.toLocaleString('th-TH')}</div>}
            {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', opacity: busy ? 0.7 : 1 }}>{busy ? 'กำลังส่ง...' : '🛒 ยืนยันสั่งซื้อ'}</button>
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
