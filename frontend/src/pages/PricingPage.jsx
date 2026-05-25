import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PAYMENT_GROUPS } from '../data/paymentMethods';
import { apiUrl, fetchWithTimeout } from '../apiBase';

const PLANS = [
  {
    id: 'free', name: 'Free', thb: 0, usd: 0,
    color: '#10b981', unit: '/วัน', desc: 'ทดลองใช้ ไม่ต้องสมัคร',
    features: [
      { ok: true,  t: '5 ครั้งต่อวัน' },
      { ok: true,  t: 'TikTok + Facebook' },
      { ok: true,  t: 'AI Critic พื้นฐาน' },
      { ok: true,  t: 'แฮชแท็ก 5 อัน' },
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
  {
    id: 'agent', name: 'Agent-Ready', thb: 499, usd: 14,
    color: '#C9A84C', unit: '/เดือน', desc: 'B2B · AI Agent · White-label',
    features: [
      { ok: true, t: 'ทุกอย่างใน Business' },
      { ok: true, t: 'ทีมไม่จำกัด' },
      { ok: true, t: 'AI Agent 24/7' },
      { ok: true, t: 'Auto-post LINE/TikTok' },
      { ok: true, t: 'DITP/DEPA ready' },
      { ok: true, t: 'White-label + OEM' },
      { ok: true, t: 'บัญชี CLMV ขยายตลาด' },
    ],
    cta: 'ติดต่อ Agent-Ready →',
  },
];

const CREDIT_PACKS = [
  { id: 'starter', label: 'Starter', credits: 10,  thb: 49,  perCredit: '฿4.9', color: '#10b981', note: 'ลองก่อน' },
  { id: 'value',   label: 'Value',   credits: 25,  thb: 99,  perCredit: '฿4.0', color: '#6366f1', note: 'ประหยัด', hot: true },
  { id: 'pro',     label: 'Pro',     credits: 60,  thb: 199, perCredit: '฿3.3', color: '#f59e0b', note: 'คุ้มค่า' },
  { id: 'max',     label: 'Max',     credits: 150, thb: 399, perCredit: '฿2.7', color: '#C9A84C', note: 'สุดคุ้ม' },
];

const FAQ_ITEMS = [
  ['ทดลองฟรีได้กี่ครั้ง?', '3 ครั้งต่อวัน ไม่ต้องสมัคร ไม่ต้องใส่บัตรเครดิต'],
  ['ยกเลิกได้เมื่อไหร่?', 'ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ไม่มีสัญญาผูกมัด'],
  ['จ่ายด้วยอะไรได้บ้าง?', 'รองรับ 150+ ช่องทาง: PromptPay (ทุกธนาคารไทย), TrueMoney, LINE Pay, Alipay, WeChat Pay, PayPal, Visa/MC/JCB, SWIFT, Crypto (USDT/BTC) และอีกมาก'],
  ['Pro กับ Business ต่างกันอย่างไร?', 'Business เพิ่ม Team 5 คน, API Access, White-label และ Dedicated Manager'],
  ['มี Affiliate Program ไหม?', 'มี! แชร์ให้เพื่อนรับคอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ'],
];

// ── PromptPay QR section ──────────────────────────────────────────────────────
const PROMPTPAY_NUMBER = '0972560801';

export default function PricingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pro');
  const [showPay, setShowPay] = useState(false);
  useEffect(() => { document.title = 'แผนราคา — OpenThai AI'; }, []);
  const [payStep, setPayStep] = useState('select'); // select | method | qr | confirm
  const [payMethod, setPayMethod] = useState(null); // selected payment method
  const [openFaq, setOpenFaq] = useState(null);
  const [paySearch, setPaySearch] = useState('');
  const [payGroupFilter, setPayGroupFilter] = useState('thai');
  const [payChargeId, setPayChargeId] = useState(null);
  const [payQrUrl, setPayQrUrl] = useState(null);
  const [payLoadingQr, setPayLoadingQr] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [creditEmail, setCreditEmail] = useState('');
  const [creditOrder, setCreditOrder] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const pollRef = useRef(null);

  const plan = PLANS.find((p) => p.id === selected);

  const handleCreditPurchase = async () => {
    if (!selectedPack) return;
    setCreditLoading(true);
    try {
      const r = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: selectedPack.id, email: creditEmail }),
      });
      const data = await r.json();
      if (data.success) setCreditOrder(data);
    } catch (_) {}
    setCreditLoading(false);
  };

  // Call payment API when PromptPay QR step opens
  useEffect(() => {
    if (payStep !== 'qr' || !payMethod) return;
    const isPromptPayMethod = ['thai', 'ewallet'].includes(
      PAYMENT_GROUPS.find((g) => g.methods.some((m) => m.id === payMethod.id))?.id
    );
    if (!isPromptPayMethod) return;
    const token = localStorage.getItem('token');
    if (!token || plan.thb === 0) return;

    setPayLoadingQr(true);
    setPayQrUrl(null);
    setPayChargeId(null);

    fetchWithTimeout(apiUrl('/api/payment/initiate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: plan.id, amountTHB: plan.thb }),
    }, 12000)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setPayChargeId(data.chargeId);
          setPayQrUrl(data.qrImage || null);
        }
      })
      .catch(() => {})
      .finally(() => setPayLoadingQr(false));
  }, [payStep, payMethod?.id]);

  // Poll payment status every 5 seconds
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (payStep !== 'qr' || !payChargeId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    pollRef.current = setInterval(async () => {
      try {
        const r = await fetchWithTimeout(apiUrl(`/api/payment/status/${payChargeId}`), {
          headers: { Authorization: `Bearer ${token}` },
        }, 8000);
        const data = await r.json();
        if (data.paid || data.status === 'successful') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPayStep('confirm');
        }
      } catch {}
    }, 5000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [payStep, payChargeId]);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/affiliate')} style={navBtn}>💰 Affiliate</button>
        <button onClick={() => navigate('/payment-methods')} style={navBtn}>🏦 ช่องทางชำระเงิน</button>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '56px 5% 40px' }}>
        <div style={badge}>💳 ราคาและแพ็กเกจ</div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, margin: '12px 0 10px' }}>เลือกแพ็กเกจที่ใช่สำหรับคุณ</h1>
        <p style={{ color: '#64748b', fontSize: 15 }}>ทดลองฟรี ไม่ต้องผูกบัตร • ยกเลิกได้ทุกเมื่อ</p>
      </section>

      {/* PLANS */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
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

      {/* CREDIT PACKS */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={badge}>⚡ เครดิตสำเร็จรูป — ไม่ต้องสมัครสมาชิกรายเดือน</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '10px 0 8px' }}>ซื้อเครดิตใช้ได้เลย</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>1 เครดิต = 1 คอนเทนต์ · ไม่มีวันหมดอายุ · ใช้เมื่อไหรก็ได้</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {CREDIT_PACKS.map((pk) => (
            <div key={pk.id} style={{ ...card, border: `1.5px solid ${pk.hot ? pk.color + '66' : 'rgba(255,255,255,0.08)'}`, background: pk.hot ? pk.color + '0d' : 'rgba(255,255,255,0.02)', position: 'relative', textAlign: 'center' }}>
              {pk.hot && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${pk.color},#fe2c55)`, borderRadius: 20, padding: '3px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>🔥 ยอดนิยม</div>}
              <div style={{ fontWeight: 800, fontSize: 16, color: pk.color, marginBottom: 4 }}>{pk.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1 }}>{pk.credits}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>เครดิต</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: pk.color, marginBottom: 2 }}>฿{pk.thb}</div>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 14 }}>{pk.perCredit}/เครดิต · {pk.note}</div>
              <button
                onClick={() => { setSelectedPack(pk); setCreditOrder(null); setCreditEmail(''); setShowCredits(true); }}
                style={{ width: '100%', padding: '10px', borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none', background: `linear-gradient(135deg,${pk.color},#6366f1)`, color: '#fff' }}>
                ซื้อ {pk.credits} เครดิต
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 16 }}>
          เครดิตไม่มีวันหมดอายุ · สะสมได้ · สามารถอัปเกรดแพ็กเกจรายเดือนได้ตลอดเวลา
        </p>
      </section>

      {/* CREDIT PURCHASE MODAL */}
      {showCredits && selectedPack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 16 }}>
          <div style={{ ...card, maxWidth: 420, width: '100%', position: 'relative' }}>
            <button onClick={() => { setShowCredits(false); setCreditOrder(null); }} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
            {!creditOrder ? (
              <>
                <h3 style={{ margin: '0 0 6px', fontWeight: 800 }}>⚡ ซื้อ {selectedPack.credits} เครดิต</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 18 }}>ยอดชำระ: <strong style={{ color: '#f8fafc' }}>฿{selectedPack.thb}</strong> · {selectedPack.perCredit}/เครดิต</p>
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>โอน PromptPay</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C', letterSpacing: 2 }}>0972560801</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>ยอด ฿{selectedPack.thb} · แนบสลิปหลังกด "สร้าง Order"</div>
                </div>
                <input
                  value={creditEmail}
                  onChange={(e) => setCreditEmail(e.target.value)}
                  placeholder="อีเมลรับการยืนยัน (ไม่บังคับ)"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }}
                />
                <button onClick={handleCreditPurchase} disabled={creditLoading}
                  style={{ width: '100%', ...primaryBtn, opacity: creditLoading ? 0.7 : 1 }}>
                  {creditLoading ? '⏳ กำลังสร้าง Order...' : `🧾 สร้าง Order — ฿${selectedPack.thb}`}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
                <h3 style={{ fontWeight: 900, color: '#10b981', margin: '0 0 8px' }}>Order สร้างแล้ว!</h3>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, textAlign: 'left', lineHeight: 1.8 }}>
                  หมายเลข Order: <strong style={{ color: '#6ee7b7' }}>{creditOrder.orderId}</strong><br />
                  แพ็ก: {creditOrder.credits} เครดิต · ฿{creditOrder.thb}<br />
                  โอน PromptPay: <strong style={{ color: '#C9A84C' }}>{creditOrder.promptpay}</strong>
                </div>
                <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
                  📸 แคปสลิป → ส่งมาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong><br />
                  พร้อมระบุ Order ID ทีมจะเติมเครดิตภายใน 30 นาที
                </p>
                <button onClick={() => { setShowCredits(false); setCreditOrder(null); }} style={{ ...primaryBtn, width: '100%' }}>
                  ✅ รับทราบ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ ...card, maxWidth: payStep === 'method' ? 720 : 480, width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowPay(false); setPayStep('select'); setPayMethod(null); setPaySearch(''); }} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', zIndex: 1 }}>✕</button>

            {/* ── STEP 1: เลือกกลุ่มช่องทาง ───────────────────────────────── */}
            {payStep === 'select' && (
              <>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800, paddingRight: 32 }}>ชำระเงิน — {plan.name} ฿{plan.thb}/เดือน</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>เลือกกลุ่มช่องทางชำระเงิน</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PAYMENT_GROUPS.map((g) => (
                    <button key={g.id}
                      onClick={() => { setPayGroupFilter(g.id); setPayStep('method'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${g.color}33`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', color: '#f8fafc', textAlign: 'left' }}>
                      <span style={{ fontSize: 26 }}>{g.label.split(' ')[0]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: g.color }}>{g.label.replace(/^[^\s]+\s/, '')}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{g.methods.length} ช่องทาง</div>
                      </div>
                      <span style={{ color: '#64748b' }}>→</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <button onClick={() => navigate('/payment-methods')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    🏦 ดูช่องทางชำระเงินทั้งหมด {PAYMENT_GROUPS.reduce((s, g) => s + g.methods.length, 0)}+ ช่องทาง →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: เลือกช่องทางเฉพาะ ───────────────────────────────── */}
            {payStep === 'method' && (() => {
              const group = PAYMENT_GROUPS.find((g) => g.id === payGroupFilter);
              const q = paySearch.toLowerCase();
              const methods = q ? group.methods.filter((m) => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)) : group.methods;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 32 }}>
                    <button onClick={() => setPayStep('select')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>←</button>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{group?.label}</h3>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>แพ็กเกจ {plan.name} — ฿{plan.thb}/เดือน</p>
                    </div>
                  </div>
                  <input
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value)}
                    placeholder="🔍  ค้นหาธนาคาร..."
                    style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                    {methods.map((m) => (
                      <button key={m.id}
                        onClick={() => { setPayMethod(m); setPayStep('qr'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: '#f8fafc', textAlign: 'left' }}>
                        <span style={{ fontSize: 22 }}>{m.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {methods.length === 0 && <p style={{ color: '#475569', textAlign: 'center', fontSize: 13, padding: '20px 0' }}>ไม่พบช่องทางที่ตรงกัน</p>}
                </>
              );
            })()}

            {/* ── STEP 3: QR / วิธีชำระ ────────────────────────────────────── */}
            {payStep === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, justifyContent: 'center', paddingRight: 32 }}>
                  <button onClick={() => setPayStep('method')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>←</button>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{payMethod?.icon} {payMethod?.label}</h3>
                    <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{plan.name} — ฿{plan.thb}/เดือน</p>
                  </div>
                </div>

                {/* QR — real from Omise API or static fallback */}
                <div style={{ width: 200, height: 200, background: 'rgba(255,255,255,0.95)', margin: '0 auto 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  {payLoadingQr ? (
                    <div style={{ fontSize: 13, color: '#334155', textAlign: 'center' }}>⏳ กำลังสร้าง QR…</div>
                  ) : payQrUrl ? (
                    <img src={payQrUrl} alt="PromptPay QR" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 8 }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 48 }}>{payMethod?.icon || '📱'}</div>
                      <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{payMethod?.label}</div>
                      {(payMethod?.id === 'promptpay' || PAYMENT_GROUPS[0].methods.find((m) => m.id === payMethod?.id)) && (
                        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{PROMPTPAY_NUMBER}</div>
                      )}
                    </>
                  )}
                </div>
                {payChargeId && (
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                    🔄 ตรวจสอบสถานะอัตโนมัติ… <code style={{ color: '#6366f1' }}>{payChargeId.slice(0, 16)}</code>
                  </div>
                )}

                {/* คำแนะนำตามประเภท */}
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#94a3b8', lineHeight: 1.8, textAlign: 'left' }}>
                  {payMethod?.id === 'swift' || payMethod?.id === 'sepa' || payMethod?.id === 'ach' ? (
                    <>
                      1. ใช้รหัส SWIFT/BIC ของธนาคารปลายทาง<br />
                      2. ยอดโอน: <strong style={{ color: '#f8fafc' }}>฿{plan.thb}</strong> (หรือเทียบเท่า USD/EUR)<br />
                      3. ระบุข้อความ: <strong style={{ color: '#f8fafc' }}>OpenThaiAI {plan.name}</strong><br />
                      4. ส่ง Proof of Transfer มาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                    </>
                  ) : payMethod?.id === 'paypal' ? (
                    <>
                      1. เปิด PayPal → Send Money<br />
                      2. ยอด: <strong style={{ color: '#f8fafc' }}>${plan.usd} USD</strong><br />
                      3. อีเมล PayPal: <strong style={{ color: '#6366f1' }}>pay@openthai-ai.com</strong><br />
                      4. ส่งสลิปมาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                    </>
                  ) : payMethod?.id === 'usdt_trc20' || payMethod?.id?.startsWith('usdt') || payMethod?.id === 'usdc' ? (
                    <>
                      1. เปิด Crypto Wallet ของคุณ<br />
                      2. ยอด: <strong style={{ color: '#f8fafc' }}>${plan.usd} USDT/USDC</strong><br />
                      3. Network: <strong style={{ color: '#f8fafc' }}>{payMethod?.id?.includes('trc20') ? 'TRC20 (Tron)' : payMethod?.id?.includes('erc20') ? 'ERC20 (Ethereum)' : 'ตามที่เลือก'}</strong><br />
                      4. ส่ง Tx Hash มาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                    </>
                  ) : (
                    <>
                      1. เปิดแอป <strong style={{ color: '#f8fafc' }}>{payMethod?.label}</strong><br />
                      2. สแกน QR หรือโอนเบอร์ PromptPay: <strong style={{ color: '#f8fafc' }}>{PROMPTPAY_NUMBER}</strong><br />
                      3. ยอด: <strong style={{ color: '#f8fafc' }}>฿{plan.thb}</strong><br />
                      4. แคปสลิป → ส่งมาที่ LINE: <strong style={{ color: '#6366f1' }}>@openthaiai</strong>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPayStep('method')} style={{ flex: 1, ...outlineBtn }}>← ย้อนกลับ</button>
                  <button onClick={() => setPayStep('confirm')} style={{ flex: 2, ...primaryBtn }}>📸 ชำระแล้ว →</button>
                </div>
              </div>
            )}

            {/* ── STEP 4: ยืนยัน ───────────────────────────────────────────── */}
            {payStep === 'confirm' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: '#10b981' }}>ขอบคุณ!</h3>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                  ช่องทาง: <strong style={{ color: '#f8fafc' }}>{payMethod?.icon} {payMethod?.label}</strong><br />
                  แพ็กเกจ: <strong style={{ color: '#f8fafc' }}>{plan.name} ฿{plan.thb}/เดือน</strong>
                </p>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  ทีมงานจะตรวจสอบและเปิดใช้งาน<br />
                  <strong style={{ color: '#f8fafc' }}>ภายใน 30 นาที</strong> (9:00–21:00)
                </p>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
                  📧 ยืนยันส่งไปที่อีเมลของคุณ<br />
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

      {/* B2B / ENTERPRISE */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ ...card, background: 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(201,168,76,0.2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 700, marginBottom: 8 }}>🏢 B2B · Enterprise · DITP/DEPA</div>
            <h3 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 10px' }}>ขยายธุรกิจระดับองค์กร</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['🌏 White-label สำหรับ OTOP Hub / CLMV', '🤖 AI Agent สร้างคอนเทนต์อัตโนมัติ 24/7', '📊 Dashboard รวมทีมไม่จำกัดคน', '⚡ API Integration กับระบบเดิมของคุณ', '🏛 พร้อม DITP/DEPA/BOI โปรแกรม'].map((f) => (
                <li key={f} style={{ fontSize: 13, color: '#94a3b8' }}>{f}</li>
              ))}
            </ul>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A84C', marginBottom: 4 }}>฿499</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>/เดือน · Agent-Ready Plan</div>
            <button onClick={() => { setSelected('agent'); setShowPay(true); setPayStep('select'); }} style={{ ...primaryBtn, background: 'linear-gradient(135deg,#C9A84C,#6366f1)', width: '100%', marginBottom: 8 }}>
              🚀 เริ่มใช้ Agent-Ready →
            </button>
            <button onClick={() => navigate('/contact')} style={{ ...outlineBtn, width: '100%', fontSize: 13 }}>
              💬 ปรึกษาทีมงานก่อน
            </button>
          </div>
        </div>
      </section>

      {/* SUPPORT / DONATE */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 5% 60px', textAlign: 'center' }}>
        <div style={{ ...card, background: 'rgba(16,185,129,0.04)', border: '1.5px solid rgba(16,185,129,0.15)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>☕</div>
          <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>สนับสนุนการพัฒนา</h3>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
            OpenThai AI พัฒนาโดยทีมไทย เพื่อผู้ประกอบการไทย<br />
            ร่วมสนับสนุนได้ผ่าน PromptPay ทุกยอด
          </p>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '12px 24px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 4 }}>PromptPay</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', letterSpacing: 2 }}>097-256-0801</div>
          </div>
          <p style={{ color: '#475569', fontSize: 12 }}>โอนได้ทุกธนาคาร · ทุกยอดช่วยได้มาก 🙏</p>
        </div>
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
          © 2026 OpenThai AI — สงวนลิขสิทธิ์
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
const outlineBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '12px 20px', color: '#94a3b8', fontSize: 14, cursor: 'pointer' };
