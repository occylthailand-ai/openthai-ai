import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    color: '#6b7280',
    features: ['สร้างคอนเทนต์ 10 ชิ้น/วัน', 'AI Generator พื้นฐาน', 'Trending Hashtags', 'ไม่มีโฆษณา'],
    limits: '10 content/day',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 299,
    color: '#10b981',
    popular: false,
    features: ['สร้างคอนเทนต์ 100 ชิ้น/วัน', 'AI Generator ทุกฟีเจอร์', 'Video Script AI', 'Brand Memory 500 slots', 'Webhook 3 endpoints', 'รองรับ 3 แพลตฟอร์ม'],
    limits: '100 content/day',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 799,
    color: '#6366f1',
    popular: true,
    features: ['สร้างคอนเทนต์ไม่จำกัด', 'AI Video Generator (RunwayML/Pika)', 'Voice Commander ทุกภาษา', 'Brand Memory ไม่จำกัด', 'Webhook ไม่จำกัด', 'API Access + SDK', 'AI Agent 24/7', 'Priority Support'],
    limits: 'Unlimited',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 2499,
    color: '#f59e0b',
    features: ['ทุกอย่างใน Pro', 'Custom AI Model', 'Dedicated Infrastructure', 'White-label Solution', 'SLA 99.9%', 'Custom Integration', 'Team Management', 'Onboarding Support'],
    limits: 'Custom',
  },
];

// ช่องทางการชำระเงิน → ป้ายภาษาไทย
const METHOD_LABELS = {
  promptpay:    'พร้อมเพย์ (PromptPay QR)',
  card:         'บัตรเครดิต/เดบิต',
  subscription: 'ตัดบัตรอัตโนมัติรายเดือน',
};

// แปลงเวลาเป็นรูปแบบไทย เช่น "1 มิถุนายน 2569 12:37"
function formatThaiDateTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d).replace(' เวลา ', ' ');
  } catch (_) {
    return d.toLocaleString('th-TH');
  }
}

// รวบรวมข้อมูลใบเสร็จจาก response ของ backend (status / create)
function buildReceipt(data = {}) {
  return {
    chargeId:  data.charge_id || null,
    amount:    typeof data.amount_thb === 'number' ? data.amount_thb : null,
    paidAt:    data.paid_at || data.created_at || null,
    method:    data.method || 'promptpay',
    plan:      data.plan || null,
    reference: data.reference || data.promptpay_ref || null,
  };
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [step, setStep] = useState('select'); // select | pay | success
  const [payMethod, setPayMethod] = useState('promptpay');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [chargeId, setChargeId] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [email, setEmail] = useState(() => localStorage.getItem('user_email') || '');
  const [card, setCard] = useState({ name: '', number: '', exp: '', cvc: '' });
  const [omiseReady, setOmiseReady] = useState(false);
  const [pubKey, setPubKey] = useState(null);

  const plan = PLANS.find(p => p.key === selectedPlan);

  // โหลด config (Omise public key) + สคริปต์ Omise.js สำหรับ tokenize บัตร
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/payment/config'))
      .then(r => r.json())
      .then(cfg => { if (!cancelled) setPubKey(cfg.public_key || null); })
      .catch(() => {});
    if (!window.Omise && !document.getElementById('omise-js')) {
      const s = document.createElement('script');
      s.id = 'omise-js';
      s.src = 'https://cdn.omise.co/omise.js';
      s.async = true;
      s.onload = () => !cancelled && setOmiseReady(true);
      document.body.appendChild(s);
    } else if (window.Omise) {
      setOmiseReady(true);
    }
    return () => { cancelled = true; };
  }, []);

  // กลับมาจาก 3-D Secure → ตรวจสถานะ charge ที่ค้างไว้
  useEffect(() => {
    const pending = localStorage.getItem('pending_charge');
    if (pending) {
      setChargeId(pending);
      setPayMethod('card');
      setStep('pay');
    }
  }, []);

  // Poll สถานะการชำระเงิน (ทั้ง PromptPay และบัตรที่รอ 3-D Secure)
  useEffect(() => {
    if (step !== 'pay' || !chargeId) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(apiUrl(`/api/payment/status/${chargeId}`));
        const data = await res.json();
        if (data.status === 'successful') {
          clearInterval(timer); localStorage.removeItem('pending_charge');
          setReceipt(buildReceipt(data)); setStep('success');
        }
        if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(timer); localStorage.removeItem('pending_charge');
          setError('การชำระเงินล้มเหลว กรุณาลองใหม่'); setStep('select');
        }
        setPollCount(c => c + 1);
      } catch (_) {}
    }, 5000);
    return () => clearInterval(timer);
  }, [step, chargeId]);

  // Tokenize บัตรด้วย Omise.js (เลขบัตรไม่ผ่าน server ของเรา — PCI compliant)
  const tokenizeCard = () => new Promise((resolve, reject) => {
    if (!window.Omise) return reject(new Error('ระบบบัตรเครดิตยังโหลดไม่เสร็จ กรุณารอสักครู่'));
    if (!pubKey) return reject(new Error('ยังไม่ได้ตั้งค่า Omise public key'));
    const [expMonth, expYear] = (card.exp || '').split('/').map(s => s.trim());
    window.Omise.setPublicKey(pubKey);
    window.Omise.createToken('card', {
      name: card.name,
      number: (card.number || '').replace(/\s+/g, ''),
      expiration_month: expMonth,
      expiration_year: expYear?.length === 2 ? `20${expYear}` : expYear,
      security_code: card.cvc,
    }, (statusCode, response) => {
      if (statusCode === 200) resolve(response.id);
      else reject(new Error(response.message || 'ข้อมูลบัตรไม่ถูกต้อง'));
    });
  });

  const handleProceedToPayment = async () => {
    if (plan.price === 0) { navigate('/dashboard'); return; }
    setError('');

    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง (สำหรับส่งใบเสร็จ)'); return;
    }
    setLoading(true);

    try {
      localStorage.setItem('user_email', email);
      const authToken = localStorage.getItem('auth_token');
      const body = { plan: selectedPlan, method: payMethod, email };

      // บัตรเครดิต → tokenize ก่อนส่ง + ตั้ง return_uri สำหรับ 3-D Secure
      if (payMethod === 'card') {
        body.token = await tokenizeCard();
        body.return_uri = `${window.location.origin}/payment`;
      }

      const res = await fetch(apiUrl('/api/payment/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสร้าง payment ได้');

      if (payMethod === 'promptpay') {
        setQrData(data);
        setChargeId(data.charge_id);
        setStep('pay');
      } else if (payMethod === 'card') {
        // ต้องทำ 3-D Secure → จำ charge ไว้แล้ว redirect ไปหน้า authorize
        if (data.authorize_uri) {
          localStorage.setItem('pending_charge', data.charge_id);
          window.location.href = data.authorize_uri;
          return;
        }
        // ชำระสำเร็จทันที
        setChargeId(data.charge_id || null);
        setReceipt(buildReceipt({ ...data, paid_at: data.paid_at || new Date().toISOString() }));
        setStep('success');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '15px', outline: 'none' };
  const labelStyle = { fontSize: '12px', color: '#a0a0b0', display: 'block', marginBottom: '6px' };
  const cardBlocked = payMethod === 'card' && !omiseReady;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← กลับ</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>💳 เลือกแผนการใช้งาน</h1>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Step: Select Plan */}
        {step === 'select' && (
          <>
            <p style={{ textAlign: 'center', color: '#a0a0b0', marginBottom: '32px' }}>เลือกแผนที่เหมาะกับธุรกิจของคุณ — ยกเลิกได้ทุกเมื่อ</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {PLANS.map(p => (
                <div key={p.key} onClick={() => setSelectedPlan(p.key)}
                  style={{ background: selectedPlan === p.key ? `${p.color}15` : 'rgba(255,255,255,0.04)', border: `2px solid ${selectedPlan === p.key ? p.color : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                  {p.popular && <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: p.color, padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ POPULAR</span>}
                  <div style={{ fontWeight: 900, fontSize: '18px', color: p.color, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
                    {p.price === 0 ? 'ฟรี' : <><span style={{ fontSize: '14px', fontWeight: 400 }}>฿</span>{p.price.toLocaleString()}<span style={{ fontSize: '12px', fontWeight: 400, color: '#a0a0b0' }}>/เดือน</span></>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>{p.limits}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#d0d0e0', display: 'flex', gap: '6px' }}>
                        <span style={{ color: p.color }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment method */}
            {plan.price > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#a0a0b0' }}>วิธีชำระเงิน</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'promptpay', label: '📱 PromptPay QR', desc: 'สแกนจ่าย ยืนยันทันที' },
                    { value: 'card',      label: '💳 บัตรเครดิต/เดบิต', desc: 'Visa, Mastercard, JCB' },
                  ].map(m => (
                    <button key={m.value} onClick={() => setPayMethod(m.value)}
                      style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `1px solid ${payMethod === m.value ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: payMethod === m.value ? 'rgba(99,102,241,0.15)' : 'transparent', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.label}</div>
                      <div style={{ fontSize: '12px', color: '#a0a0b0', marginTop: '2px' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>

                {/* อีเมลสำหรับใบเสร็จ */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>อีเมล (สำหรับส่งใบเสร็จ)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                    style={inputStyle} />
                </div>

                {/* ฟอร์มบัตรเครดิต */}
                {payMethod === 'card' && (
                  <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>ชื่อบนบัตร</label>
                      <input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} placeholder="SOMCHAI JAIDEE" autoComplete="cc-name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>หมายเลขบัตร</label>
                      <input value={card.number} inputMode="numeric" autoComplete="cc-number"
                        onChange={e => setCard({ ...card, number: e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19) })}
                        placeholder="4242 4242 4242 4242" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>วันหมดอายุ (MM/YY)</label>
                        <input value={card.exp} inputMode="numeric" autoComplete="cc-exp"
                          onChange={e => { let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4); if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`; setCard({ ...card, exp: v }); }}
                          placeholder="12/28" style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>CVC</label>
                        <input value={card.cvc} inputMode="numeric" autoComplete="cc-csc"
                          onChange={e => setCard({ ...card, cvc: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                          placeholder="123" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🔒 ข้อมูลบัตรเข้ารหัสและส่งตรงถึง Omise — ไม่ผ่านเซิร์ฟเวอร์ของเรา
                      {!omiseReady && <span style={{ color: '#fbbf24' }}>· กำลังโหลดระบบบัตร…</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', color: '#fca5a5', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

            <button onClick={handleProceedToPayment} disabled={loading || cardBlocked}
              style={{ width: '100%', maxWidth: '400px', display: 'block', margin: '0 auto', padding: '16px', borderRadius: '12px', border: 'none', background: (loading || cardBlocked) ? '#374151' : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, color: '#fff', fontSize: '16px', fontWeight: 700, cursor: (loading || cardBlocked) ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ กำลังดำเนินการ...' : plan.price === 0 ? '✅ เริ่มใช้งานฟรี' : payMethod === 'card' ? `ชำระด้วยบัตร ฿${plan.price.toLocaleString()} →` : `ชำระ ฿${plan.price.toLocaleString()}/เดือน →`}
            </button>
          </>
        )}

        {/* Step: Pay — Card verifying (กลับมาจาก 3-D Secure) */}
        {step === 'pay' && payMethod === 'card' && !qrData && (
          <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px 32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
              <h2 style={{ marginBottom: '8px' }}>กำลังยืนยันการชำระเงิน</h2>
              <p style={{ color: '#a0a0b0', fontSize: '14px' }}>กรุณารอสักครู่ — กำลังตรวจสอบผลการชำระเงินกับธนาคาร{pollCount > 0 ? ` (${pollCount})` : ''}</p>
            </div>
          </div>
        )}

        {/* Step: Pay — PromptPay QR */}
        {step === 'pay' && payMethod === 'promptpay' && qrData && (
          <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px' }}>
              <h2 style={{ marginBottom: '8px' }}>📱 สแกน PromptPay</h2>
              <p style={{ color: '#a0a0b0', marginBottom: '24px', fontSize: '14px' }}>แผน {plan.name} · ฿{plan.price.toLocaleString()}/เดือน</p>

              {qrData.qr_image_url ? (
                <img src={qrData.qr_image_url} alt="PromptPay QR" style={{ width: '220px', height: '220px', borderRadius: '12px', background: '#fff', padding: '8px', marginBottom: '16px' }} />
              ) : (
                <div style={{ width: '220px', height: '220px', margin: '0 auto 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                  📱
                </div>
              )}

              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ color: '#6ee7b7', marginBottom: '4px' }}>⏱ หมดอายุใน 15 นาที</div>
                <div style={{ color: '#a0a0b0' }}>กำลังรอการยืนยัน ({pollCount > 0 ? `ตรวจสอบแล้ว ${pollCount} ครั้ง` : 'ตรวจสอบทุก 5 วินาที'})</div>
              </div>

              {qrData.promptpay_ref && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                  Reference: {qrData.promptpay_ref}
                </div>
              )}

              <button onClick={() => { setStep('select'); setQrData(null); setChargeId(null); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a0b0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Step: Success — ใบเสร็จยืนยันการชำระเงิน */}
        {step === 'success' && (() => {
          const r = receipt || {};
          const amount = (r.amount != null ? r.amount : plan.price);
          const fmtBaht = (n) => `${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
          const rows = [
            { icon: '🧾', label: 'สรุปการชำระเงิน', value: 'สำเร็จ', valueColor: '#6ee7b7',
              sub: `แผน ${plan.name} (รายเดือน) · ${fmtBaht(amount)}` },
            { icon: '📅', label: 'วันที่ชำระเงินสำเร็จ', value: formatThaiDateTime(r.paidAt) },
            { icon: '฿',  label: 'ยอดที่ชำระทั้งหมด', value: fmtBaht(amount) },
            { icon: '💳', label: 'ช่องทางการชำระเงิน', value: METHOD_LABELS[r.method] || 'พร้อมเพย์ (PromptPay QR)' },
            { icon: '🔖', label: 'เลขที่รายการ', value: r.chargeId || r.reference || '-', mono: true },
          ];
          return (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', padding: '36px 32px 24px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '56px', marginBottom: '8px' }}>✅</div>
                <h2 style={{ color: '#6ee7b7', margin: '0 0 4px', fontSize: '24px' }}>ขอบคุณ</h2>
                <p style={{ color: '#a0a0b0', margin: 0, fontSize: '14px' }}>ชำระเงินสำเร็จ — บัญชีของคุณถูกอัพเกรดเป็นแผน <strong style={{ color: '#fff' }}>{plan.name}</strong> แล้ว</p>
              </div>

              {/* Receipt rows */}
              <div style={{ padding: '8px 24px 24px' }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', padding: '16px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{row.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '3px' }}>{row.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: row.valueColor || '#fff', wordBreak: 'break-all', fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value}</div>
                      {row.sub && <div style={{ fontSize: '12px', color: '#8a8a9a', marginTop: '3px' }}>{row.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div style={{ padding: '0 24px 28px' }}>
                <button onClick={() => navigate('/dashboard')}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                  ไปที่ Dashboard →
                </button>
                <button onClick={() => navigate('/')}
                  style={{ width: '100%', marginTop: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a0b0', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}>
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', marginTop: '16px' }}>
              ใบเสร็จถูกส่งไปยังอีเมลของคุณแล้ว · เก็บเลขที่รายการไว้สำหรับอ้างอิง
            </p>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PaymentPage;
