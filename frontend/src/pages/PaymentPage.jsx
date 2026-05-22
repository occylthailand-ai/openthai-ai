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

  const plan = PLANS.find(p => p.key === selectedPlan);

  // Poll PromptPay status
  useEffect(() => {
    if (step !== 'pay' || !chargeId || payMethod !== 'promptpay') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(apiUrl(`/api/payment/status/${chargeId}`));
        const data = await res.json();
        if (data.status === 'successful') { clearInterval(timer); setStep('success'); }
        if (data.status === 'failed' || data.status === 'expired') { clearInterval(timer); setError('การชำระเงินล้มเหลว กรุณาลองใหม่'); setStep('select'); }
        setPollCount(c => c + 1);
      } catch (_) {}
    }, 5000);
    return () => clearInterval(timer);
  }, [step, chargeId, payMethod]);

  const handleProceedToPayment = async () => {
    if (plan.price === 0) { navigate('/dashboard'); return; }
    setError(''); setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(apiUrl('/api/payment/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ plan: selectedPlan, method: payMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสร้าง payment ได้');

      if (payMethod === 'promptpay') {
        setQrData(data);
        setChargeId(data.charge_id);
        setStep('pay');
      } else {
        setStep('success');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';

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
              </div>
            )}

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', color: '#fca5a5', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

            <button onClick={handleProceedToPayment} disabled={loading}
              style={{ width: '100%', maxWidth: '400px', display: 'block', margin: '0 auto', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? '#374151' : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ กำลังดำเนินการ...' : plan.price === 0 ? '✅ เริ่มใช้งานฟรี' : `ชำระ ฿${plan.price.toLocaleString()}/เดือน →`}
            </button>
          </>
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

        {/* Step: Success */}
        {step === 'success' && (
          <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '48px 32px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ color: '#6ee7b7', marginBottom: '8px' }}>ชำระเงินสำเร็จ!</h2>
              <p style={{ color: '#a0a0b0', marginBottom: '24px' }}>
                คุณได้อัพเกรดเป็นแผน <strong style={{ color: '#fff' }}>{plan.name}</strong> เรียบร้อยแล้ว
              </p>
              <button onClick={() => navigate('/dashboard')}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '14px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                ไปที่ Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
