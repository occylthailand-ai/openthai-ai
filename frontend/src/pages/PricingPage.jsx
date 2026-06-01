import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'free', name: 'Free', thb: 0, usd: 0,
    color: '#10b981', unit: '/วัน', desc: 'ทดลองใช้ ไม่ต้องสมัคร',
    features: [
      { ok: true, t: '3 คอนเทนต์ต่อวัน' },
      { ok: true, t: 'TikTok + Facebook' },
      { ok: true, t: 'AI Critic พื้นฐาน' },
      { ok: true, t: 'แฮชแท็ก 5 อัน' },
      { ok: false, t: 'ไม่จำกัดจำนวน' },
      { ok: false, t: 'ทุกแพลตฟอร์ม 241+' },
      { ok: false, t: 'ประวัติคอนเทนต์' },
    ],
    cta: 'ใช้ฟรีเลย',
  },
  {
    id: 'pro', name: 'Pro', thb: 20, usd: 1,
    color: '#6366f1', unit: '/เดือน', desc: 'สำหรับ Creator จริงจัง', hot: true,
    features: [
      { ok: true, t: 'ไม่จำกัดจำนวน' },
      { ok: true, t: 'ทุกแพลตฟอร์ม 241+' },
      { ok: true, t: 'AI Critic เต็มรูปแบบ' },
      { ok: true, t: 'แฮชแท็ก 20+ อัน' },
      { ok: true, t: 'ประวัติ 30 วัน' },
      { ok: true, t: 'Priority Support' },
      { ok: false, t: 'API Access' },
    ],
    cta: 'เริ่ม Pro ฿20/เดือน',
  },
  {
    id: 'premier', name: 'Premier', thb: 30, usd: 1,
    color: '#f59e0b', unit: '/เดือน', desc: 'สำหรับทีมและธุรกิจ',
    features: [
      { ok: true, t: 'ทุกอย่างใน Pro' },
      { ok: true, t: 'ทีม 5 คน' },
      { ok: true, t: 'API Access' },
      { ok: true, t: 'White-label' },
      { ok: true, t: 'Dedicated Manager' },
      { ok: true, t: 'SLA 99.9%' },
      { ok: true, t: 'Custom integration' },
    ],
    cta: 'เริ่ม Premier ฿30/เดือน',
  },
];

const FAQ_ITEMS = [
  ['ทดลองฟรีได้กี่ครั้ง?', '3 ครั้งต่อวัน ไม่ต้องสมัคร ไม่ต้องใส่บัตรเครดิต'],
  ['ยกเลิกได้เมื่อไหร่?', 'ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ไม่มีสัญญาผูกมัด'],
  ['จ่ายด้วยอะไรได้บ้าง?', 'PromptPay QR และบัตรเครดิต/เดบิต (Visa, Mastercard, JCB) ชำระอัตโนมัติผ่านระบบ Omise'],
  ['Pro กับ Premier ต่างกันอย่างไร?', 'Premier เพิ่ม Team 5 คน, API Access, White-label และ Dedicated Manager'],
  ['มี Affiliate Program ไหม?', 'มี! แชร์ให้เพื่อนรับคอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ'],
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pro');
  useEffect(() => { document.title = 'แผนราคา — Openthai.ai'; }, []);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/affiliate')} style={navBtn}>💰 Affiliate</button>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '56px 5% 40px' }}>
        <div style={badge}>💳 ราคาและแพ็กเกจ</div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, margin: '12px 0 10px' }}>เลือกแพ็กเกจที่ใช่สำหรับคุณ</h1>
        <p style={{ color: '#64748b', fontSize: 15 }}>ทดลองฟรี ไม่ต้องผูกบัตร • ยกเลิกได้ทุกเมื่อ</p>
      </section>

      {/* PLANS */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
          {PLANS.map((p) => (
            <div key={p.id}
              onClick={() => setSelected(p.id)}
              style={{ ...card, cursor: 'pointer', border: `1.5px solid ${selected === p.id ? p.color + '66' : 'rgba(255,255,255,0.08)'}`, background: selected === p.id ? p.color + '0e' : 'rgba(255,255,255,0.03)', transition: 'all .2s', position: 'relative' }}>
              {p.hot && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${p.color},#fe2c55)`, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ แนะนำ</div>}
              <div style={{ fontWeight: 900, fontSize: 20, color: p.color, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: selected === p.id ? p.color : '#f8fafc' }}>฿{p.thb}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{p.unit}</span>
                {p.usd > 0 && <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>≈ ${p.usd} USD</span>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.features.map((f) => (
                  <li key={f.t} style={{ fontSize: 13, color: f.ok ? '#cbd5e1' : '#334155', display: 'flex', gap: 8 }}>
                    <span style={{ color: f.ok ? p.color : '#334155' }}>{f.ok ? '✓' : '✗'}</span>{f.t}
                  </li>
                ))}
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); if (p.id === 'free') { navigate('/ai-generator'); } else { navigate(`/payment?plan=${p.id}`); } }}
                style={{ width: '100%', padding: '13px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', background: p.id === 'free' ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg,${p.color},#fe2c55)`, color: '#fff' }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 5% 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, marginBottom: 24 }}>❓ คำถามที่พบบ่อย</h2>
        {FAQ_ITEMS.map(([q, a], i) => (
          <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ ...card, marginBottom: 10, cursor: 'pointer', padding: '14px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
              {q} <span style={{ color: '#6366f1' }}>{openFaq === i ? '▲' : '▼'}</span>
            </div>
            {openFaq === i && <div style={{ marginTop: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{a}</div>}
          </div>
        ))}
      </section>

      {/* AFFILIATE BANNER */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ ...card, background: 'linear-gradient(135deg,rgba(254,44,85,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>แชร์ → รับคอมมิชชั่นสูงสุด 40%</h3>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>สมัคร Affiliate ฟรี รับลิงก์ส่วนตัว แชร์ได้เลยทันที</p>
          <button onClick={() => navigate('/affiliate')} style={{ ...primaryBtn }}>🤝 สมัคร Affiliate ฟรี →</button>
        </div>
      </section>

      {/* FOOTER LEGAL */}
      <footer style={{ textAlign: 'center', padding: '0 5% 40px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
        <p style={{ color: '#334155', fontSize: 12, margin: '0 0 8px' }}>
          © 2026 Openthai.ai — สงวนลิขสิทธิ์
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>นโยบายความเป็นส่วนตัว</button>
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>ข้อกำหนดการใช้งาน</button>
          <button onClick={() => navigate('/affiliate')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Affiliate Program</button>
        </div>
      </footer>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 8 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
