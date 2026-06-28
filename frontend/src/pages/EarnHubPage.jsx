import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── ศูนย์สร้างรายได้ (Affiliate Earning Hub) ───────────────────────────────────
// หน้าเดียวจบ: คลิป TikTok → offer ฿1,000 → ปิดการขาย/สมัครพันธมิตร → เงินเข้าพร้อมเพย์
// รองรับ ?ref=CODE — ส่งต่อไปยังลิงก์จ่าย + นับคลิกให้พันธมิตร
// แชร์ลิงก์นี้ได้เลย: /earn?ref=CODE

const TIKTOK_URL = 'https://vt.tiktok.com/ZSCB66nhQ/';
const DAILY_GOAL = 1000;     // เป้า ฿1,000/วัน
const PACKAGE_PRICE = 1000;  // แพ็กเกจ ฿1,000 = 1 ดีลถึงเป้า

export default function EarnHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = (searchParams.get('ref') || '').replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const [copied, setCopied] = useState('');
  const [shopProducts, setShopProducts] = useState([]);   // สินค้าจริงจากคลัง

  // นับคลิกลิงก์ ref (ครั้งเดียวต่อการเข้าหน้า)
  useEffect(() => {
    if (!ref) return;
    fetch(apiUrl('/api/affiliate/click'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    }).catch(() => {});
  }, [ref]);

  // โหลดสินค้าจริงจากคลัง (เพิ่มที่ /admin) มาให้ลูกค้าเห็น+กดซื้อ
  useEffect(() => {
    fetch(apiUrl('/api/shop/products'))
      .then(r => r.json())
      .then(d => { if (d.success) setShopProducts((d.products || []).filter(p => p.in_stock).slice(0, 12)); })
      .catch(() => {});
  }, []);

  const refQS = ref ? `&ref=${encodeURIComponent(ref)}` : '';
  const payLink = `/pay?amount=${PACKAGE_PRICE}&label=${encodeURIComponent('แพ็กเกจคอนเทนต์ AI 30 ชิ้น')}${refQS}`;
  const shareLink = `https://www.openthai-ai.com/earn${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '24px' };
  const btnPrimary = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', textDecoration: 'none' };
  const btnGhost = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e5e7eb', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← หน้าหลัก</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>💸 ศูนย์สร้างรายได้</h1>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* HERO — เป้า ฿1,000/วัน */}
        <div style={{ ...card, textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
          <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700, letterSpacing: '1px' }}>OPENTHAI.AI · AFFILIATE</div>
          <div style={{ fontSize: '34px', fontWeight: 900, margin: '8px 0 4px' }}>เป้า ฿{DAILY_GOAL.toLocaleString()}/วัน</div>
          <div style={{ fontSize: '15px', color: '#d0d0e0' }}>ปิดได้แค่ <strong style={{ color: '#6ee7b7' }}>1 ดีล/วัน</strong> ก็ถึงเป้า — ขายแพ็กเกจคอนเทนต์ AI ฿1,000</div>
          {ref && <div style={{ marginTop: '12px', fontSize: '12px', color: '#6ee7b7', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '6px 14px', display: 'inline-block' }}>🤝 ลิงก์พันธมิตร: {ref} (ค่าคอมเข้าคุณอัตโนมัติ)</div>}
        </div>

        {/* TikTok video card */}
        <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" style={{ ...card, display: 'block', textDecoration: 'none', color: '#fff', border: '1px solid rgba(254,44,85,0.35)', background: 'linear-gradient(135deg, rgba(254,44,85,0.12), rgba(99,102,241,0.1))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '14px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>▶️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>🎬 ดูคลิปขายบน TikTok</div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>แตะเพื่อดูตัวอย่าง — แชร์คลิปนี้เพื่อดึงลูกค้า</div>
            </div>
            <div style={{ fontSize: '20px', color: '#fda4af' }}>↗</div>
          </div>
        </a>

        {/* OFFER + CTA */}
        <div style={card}>
          <div style={{ fontSize: '13px', color: '#a0a0b0' }}>แพ็กเกจที่ขาย</div>
          <div style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 2px' }}>คอนเทนต์ AI 30 ชิ้น</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#6ee7b7', marginBottom: '14px' }}><span style={{ fontSize: '16px', fontWeight: 400 }}>฿</span>{PACKAGE_PRICE.toLocaleString()}</div>
          <a href={payLink} onClick={(e) => { e.preventDefault(); navigate(payLink); }} style={btnPrimary}>📱 สั่งซื้อ — จ่ายพร้อมเพย์ ฿{PACKAGE_PRICE.toLocaleString()}</a>
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '10px' }}>สแกนจ่าย → เงินเข้าพร้อมเพย์ → ยืนยันอัตโนมัติ</div>
        </div>

        {/* REAL PRODUCTS — สินค้าจริงจากคลัง */}
        {shopProducts.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>🛍️ สินค้าพร้อมส่ง</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>กดสั่งซื้อ → จ่ายพร้อมเพย์ → ยืนยันอัตโนมัติ</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {shopProducts.map(p => {
                const buy = `/pay?amount=${encodeURIComponent(p.price || 0)}&label=${encodeURIComponent(p.name || '')}${refQS}`;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>📦</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#6ee7b7' }}>฿{Number(p.price || 0).toLocaleString()}</div>
                    </div>
                    <button onClick={() => navigate(buy)} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>ซื้อ</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BECOME AFFILIATE */}
        <div style={card}>
          <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>🤝 อยากให้คนอื่นช่วยขาย?</div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '14px', lineHeight: 1.6 }}>สมัครเป็นพันธมิตร รับค่าคอม <strong style={{ color: '#6ee7b7' }}>20–40%</strong> ต่อดีล · ได้ลิงก์เงิน + คลิป TikTok ไปแชร์ · ระบบเครดิตค่าคอมอัตโนมัติ</div>
          <button onClick={() => navigate('/affiliate')} style={btnGhost}>สมัครพันธมิตร / เปิด Dashboard →</button>
          <button onClick={() => navigate(`/affiliate-programs${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`)} style={{ ...btnGhost, marginTop: '10px' }}>🔗 ดูโปรแกรม Affiliate ทั้งหมด (50+) →</button>
          <button onClick={() => navigate('/content-studio')} style={{ ...btnGhost, marginTop: '10px' }}>✍️ Content Studio — สร้างแคปชั่นขาย →</button>
          <button onClick={() => navigate('/leaderboard')} style={{ ...btnGhost, marginTop: '10px' }}>🏆 อันดับพันธมิตร (Leaderboard) →</button>
        </div>

        {/* SHARE THIS ENVIRONMENT */}
        <div style={card}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔗 แชร์ศูนย์สร้างรายได้นี้</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ flex: 1, minWidth: '200px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareLink}</code>
            <button onClick={() => copy(shareLink, 'share')} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: copied === 'share' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontWeight: 700, cursor: 'pointer' }}>
              {copied === 'share' ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
            </button>
          </div>
        </div>

        {/* 24/7 FLOW */}
        <div style={{ ...card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>⚙️ ระบบทำงานเอง 24/7 (หลังตั้ง Omise)</div>
          {[
            ['1', 'แชร์คลิป TikTok + ลิงก์นี้', 'ลง bio / คอมเมนต์ / กลุ่ม'],
            ['2', 'ลูกค้าสแกนจ่ายพร้อมเพย์', 'Omise ยืนยันการจ่าย'],
            ['3', 'เงินเข้าพร้อมเพย์ของร้านเต็ม', 'ค่าคอมเข้าพันธมิตรอัตโนมัติ'],
          ].map(([n, t, s]) => (
            <div key={n} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
              <div style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{n}</div>
              <div><div style={{ fontSize: '14px', fontWeight: 700 }}>{t}</div><div style={{ fontSize: '12px', color: '#94a3b8' }}>{s}</div></div>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            ⚠️ ตรงไปตรงมา: การจ่าย/เครดิตค่าคอมทำงานเองบน cloud ตลอด 24/7 — แต่ยอดขายจริงต้องมี <strong style={{ color: '#e5e7eb' }}>คนเห็นโพสต์แล้วกดจ่าย</strong> ระบบการันตี ฿1,000/วันให้ไม่ได้ ยิ่งแชร์เยอะยิ่งมีโอกาสถึงเป้า
          </div>
        </div>

      </div>
    </div>
  );
}
