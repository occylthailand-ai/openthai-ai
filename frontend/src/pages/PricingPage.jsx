import React, { useState } from 'react';
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
    id: 'pro', name: 'Pro', thb: 149, usd: 4,
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
    cta: 'เริ่ม Pro ฟรี 7 วัน',
  },
  {
    id: 'business', name: 'Business', thb: 299, usd: 8,
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
    cta: 'ติดต่อทีมงาน',
  },
];

const FAQ_ITEMS = [
  ['ทดลองฟรีได้กี่ครั้ง?', '3 ครั้งต่อวัน ไม่ต้องสมัคร ไม่ต้องใส่บัตรเครดิต'],
  ['ยกเลิกได้เมื่อไหร่?', 'ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ไม่มีสัญญาผูกมัด'],
  ['จ่ายด้วยอะไรได้บ้าง?', 'PromptPay, QR Code, บัตรเครดิต/เดบิต, LINE Pay, TrueMoney'],
  ['Pro กับ Business ต่างกันอย่างไร?', 'Business เพิ่ม Team 5 คน, API Access, White-label และ Dedicated Manager'],
  ['มี Affiliate Program ไหม?', 'มี! แชร์ให้เพื่อนรับคอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ'],
];

// ── PromptPay QR section ──────────────────────────────────────────────────────
const PROMPTPAY_NUMBER = '0812345678'; // placeholder — เปลี่ยนเป็นเลขจริง

export default function PricingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pro');
  const [showPay, setShowPay] = useState(false);
  const [payStep, setPayStep] = useState('select'); // select | qr | confirm
  const [openFaq, setOpenFaq] = useState(null);

  const plan = PLANS.find((p) => p.id === selected);

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
                onClick={(e) => { e.stopPropagation(); if (p.id === 'free') { navigate('/ai-generator'); } else { setSelected(p.id); setShowPay(true); setPayStep('select'); } }}
                style={{ width: '100%', padding: '13px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', background: p.id === 'free' ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg,${p.color},#fe2c55)`, color: '#fff' }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* PAYMENT MODAL */}
      {showPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ ...card, maxWidth: 460, width: '100%', position: 'relative' }}>
            <button onClick={() => setShowPay(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>

            {payStep === 'select' && (
              <>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800 }}>ชำระเงิน — {plan.name} ฿{plan.thb}/เดือน</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>เลือกช่องทางชำระเงิน</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { id: 'promptpay', icon: '📱', label: 'PromptPay / QR Code', desc: 'สแกน QR ได้เลยทันที', color: '#10b981' },
                    { id: 'card', icon: '💳', label: 'บัตรเครดิต / เดบิต', desc: 'Visa, Mastercard, JCB', color: '#6366f1' },
                    { id: 'truemoney', icon: '🟠', label: 'TrueMoney Wallet', desc: 'โอนผ่าน TrueMoney', color: '#f59e0b' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setPayStep('qr')}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', color: '#f8fafc', textAlign: 'left', transition: 'border-color .2s' }}>
                      <span style={{ fontSize: 28 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{m.desc}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: '#64748b' }}>→</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {payStep === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800 }}>สแกน QR PromptPay</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>แพ็กเกจ {plan.name} — ฿{plan.thb}/เดือน</p>
                {/* QR placeholder — replace with real PromptPay QR image */}
                <div style={{ width: 200, height: 200, background: 'rgba(255,255,255,0.95)', margin: '0 auto 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 48 }}>📱</div>
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>PromptPay QR</div>
                  <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{PROMPTPAY_NUMBER}</div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                  1. เปิดแอปธนาคาร → สแกน QR<br />
                  2. ยอด: <strong style={{ color: '#f8fafc' }}>฿{plan.thb}</strong><br />
                  3. กดยืนยัน → แคปหน้าจอสลิป<br />
                  4. ส่งสลิปมาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPayStep('select')} style={{ flex: 1, ...outlineBtn }}>← ย้อนกลับ</button>
                  <button onClick={() => setPayStep('confirm')} style={{ flex: 2, ...primaryBtn }}>📸 ส่งสลิปแล้ว →</button>
                </div>
              </div>
            )}

            {payStep === 'confirm' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: '#10b981' }}>ขอบคุณ!</h3>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  ทีมงานจะตรวจสอบสลิปและเปิดใช้งาน<br />
                  <strong style={{ color: '#f8fafc' }}>ภายใน 30 นาที</strong> ในเวลาทำการ (9:00–21:00)
                </p>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
                  📧 ยืนยันจะส่งไปที่อีเมลของคุณ<br />
                  💬 LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                </p>
                <button onClick={() => { setShowPay(false); navigate('/ai-generator'); }} style={{ ...primaryBtn, width: '100%' }}>
                  🚀 เริ่มใช้งานได้เลย →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 8 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const outlineBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '12px 20px', color: '#94a3b8', fontSize: 14, cursor: 'pointer' };
