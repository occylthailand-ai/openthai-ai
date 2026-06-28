import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ── QuickPay — หน้าขายแพ็กเกจ/สินค้าชิ้นเดียว ปิดการขายไว ๆ ด้วย PromptPay QR ──────
// ค่าเริ่มต้น: แพ็กเกจ ฿1,000. ปรับยอด/ชื่อแพ็กเกจได้ผ่าน query: /pay?amount=1000&label=...
// ลูกค้าสแกนจ่าย → เงินเข้า Omise/พร้อมเพย์ของร้าน → หน้านี้ยืนยันอัตโนมัติ

function formatThaiDateTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d);
  } catch (_) { return d.toLocaleString('th-TH'); }
}

const PRESET_AMOUNTS = [199, 499, 1000, 1990];

const QuickPayPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qpAmount = parseInt(searchParams.get('amount'), 10);
  const [amount, setAmount] = useState(Number.isFinite(qpAmount) && qpAmount > 0 ? qpAmount : 1000);
  const [label, setLabel] = useState(searchParams.get('label') || 'แพ็กเกจ Openthai.ai — เริ่มต้นทำการตลาดด้วย AI');
  const [buyer, setBuyer] = useState('');

  const [step, setStep] = useState('offer');   // offer | qr | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [receipt, setReceipt] = useState(null);
  const timerRef = useRef(null);

  // Poll สถานะการชำระเงิน (ใช้ endpoint เดียวกับ flow plan)
  useEffect(() => {
    if (step !== 'qr' || !qr?.charge_id) return;
    timerRef.current = setInterval(async () => {
      try {
        const res = await fetch(apiUrl(`/api/payment/status/${qr.charge_id}`));
        const data = await res.json();
        if (data.status === 'successful' || data.paid) {
          clearInterval(timerRef.current);
          setReceipt({ ...data, amount_thb: data.amount_thb ?? amount, label });
          setStep('success');
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(timerRef.current);
          setError('การชำระเงินหมดอายุหรือล้มเหลว — กรุณาสร้าง QR ใหม่');
          setStep('offer');
        }
        setPollCount(c => c + 1);
      } catch (_) {}
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [step, qr, amount, label]);

  const createQR = async () => {
    setError('');
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt < 1) { setError('กรุณากรอกยอดเงินให้ถูกต้อง'); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/quickpay/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_thb: amt, label, buyer }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'สร้าง QR ไม่สำเร็จ');
      setQr(data);
      setPollCount(0);
      setStep('qr');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '15px', outline: 'none' };
  const labelStyle = { fontSize: '12px', color: '#a0a0b0', display: 'block', marginBottom: '6px' };
  const fmtBaht = (n) => `${Number(n).toLocaleString('th-TH')} บาท`;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← กลับ</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>⚡ QuickPay — รับเงินด่วนด้วยพร้อมเพย์</h1>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Step: Offer */}
        {step === 'offer' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>OPENTHAI.AI</div>
              <div style={{ fontSize: '40px', fontWeight: 900, marginBottom: '4px' }}>
                <span style={{ fontSize: '20px', fontWeight: 400 }}>฿</span>{Number(amount).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: '#d0d0e0' }}>{label}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>ยอดเงิน (บาท)</label>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {PRESET_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(a)}
                    style={{ flex: 1, minWidth: '70px', padding: '8px', borderRadius: '8px', border: `1px solid ${Number(amount) === a ? '#6366f1' : 'rgba(255,255,255,0.12)'}`, background: Number(amount) === a ? 'rgba(99,102,241,0.18)' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                    ฿{a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>ชื่อแพ็กเกจ / รายละเอียดที่ลูกค้าเห็น</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="เช่น แพ็กเกจคอนเทนต์ 30 ชิ้น" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>ชื่อผู้ซื้อ (ไม่บังคับ — ไว้อ้างอิงออเดอร์)</label>
              <input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="ชื่อลูกค้า" style={inputStyle} />
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', color: '#fca5a5', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

            <button onClick={createQR} disabled={loading}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ กำลังสร้าง QR…' : `📱 สร้าง QR รับเงิน ฿${Number(amount).toLocaleString()}`}
            </button>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', marginTop: '14px' }}>
              ลูกค้าสแกนจ่าย → เงินเข้าพร้อมเพย์/บัญชี Omise ของร้านโดยตรง · ยืนยันอัตโนมัติ
            </p>
          </div>
        )}

        {/* Step: QR */}
        {step === 'qr' && qr && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '6px' }}>📱 สแกนเพื่อจ่าย</h2>
            <p style={{ color: '#a0a0b0', marginBottom: '20px', fontSize: '14px' }}>{label} · ฿{Number(qr.amount_thb || amount).toLocaleString()}</p>

            {qr.qr_image_url ? (
              <img src={qr.qr_image_url} alt="PromptPay QR" style={{ width: '230px', height: '230px', borderRadius: '12px', background: '#fff', padding: '8px', marginBottom: '16px' }} />
            ) : (
              <div style={{ width: '230px', height: '230px', margin: '0 auto 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '40px' }}>
                📱
                {qr.mock && <span style={{ fontSize: '12px', color: '#fbbf24', padding: '0 16px' }}>โหมดทดสอบ — ยังไม่ได้ตั้ง Omise<br/>(ตั้ง OMISE_SECRET_KEY เพื่อสร้าง QR จริง)</span>}
              </div>
            )}

            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ color: '#6ee7b7', marginBottom: '4px' }}>⏱ QR หมดอายุใน 15 นาที</div>
              <div style={{ color: '#a0a0b0' }}>{pollCount > 0 ? `กำลังรอยืนยัน… (ตรวจแล้ว ${pollCount} ครั้ง)` : 'ตรวจสอบทุก 4 วินาที'}</div>
            </div>

            {qr.promptpay_ref && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Reference: {qr.promptpay_ref}</div>}

            <button onClick={() => { clearInterval(timerRef.current); setStep('offer'); setQr(null); }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a0b0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              ยกเลิก / สร้างใหม่
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', padding: '36px 32px 24px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '56px', marginBottom: '8px' }}>✅</div>
              <h2 style={{ color: '#6ee7b7', margin: '0 0 4px', fontSize: '24px' }}>รับเงินสำเร็จ</h2>
              <p style={{ color: '#a0a0b0', margin: 0, fontSize: '14px' }}>เงินเข้าพร้อมเพย์/บัญชี Omise ของร้านเรียบร้อย</p>
            </div>
            <div style={{ padding: '8px 24px 8px' }}>
              {[
                { icon: '💰', label: 'ยอดที่รับ', value: fmtBaht(receipt?.amount_thb ?? amount), valueColor: '#6ee7b7' },
                { icon: '🏷️', label: 'แพ็กเกจ', value: receipt?.label || label },
                { icon: '📅', label: 'เวลาที่ชำระสำเร็จ', value: formatThaiDateTime(receipt?.paid_at) },
                { icon: '🔖', label: 'เลขที่รายการ', value: receipt?.charge_id || '-', mono: true },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{row.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '3px' }}>{row.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: row.valueColor || '#fff', wordBreak: 'break-all', fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 24px 28px' }}>
              <button onClick={() => { setStep('offer'); setQr(null); setReceipt(null); }}
                style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                + รับเงินรายการใหม่
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ width: '100%', marginTop: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a0b0', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}>
                ไปที่ Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickPayPage;
