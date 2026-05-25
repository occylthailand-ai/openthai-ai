import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PROMPTPAY = '097-256-0801';
const PROMPTPAY_RAW = '0972560801';

const TIERS = [
  { thb: 49,  label: 'ขอบคุณ ☕',     desc: '1 กาแฟ = 1 วันพัฒนา' },
  { thb: 99,  label: 'สนับสนุน 🌟',   desc: 'ช่วยค่า Server 1 อาทิตย์' },
  { thb: 299, label: 'แฟนตัวจริง 💎', desc: 'ค่า API 1 เดือน' },
  { thb: 499, label: 'ผู้อุปถัมภ์ 👑', desc: 'ช่วยทีมพัฒนา 1 Feature ใหม่' },
];

export default function SupportPage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'สนับสนุนการพัฒนา — OpenThai AI'; }, []);

  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/pricing')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>💳 แผนราคา</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '56px 5% 40px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>☕</div>
        <h1 style={{ fontSize: 'clamp(24px,5vw,42px)', fontWeight: 900, margin: '0 0 10px' }}>สนับสนุนการพัฒนา OpenThai AI</h1>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          OpenThai AI พัฒนาโดยทีมไทย เพื่อช่วย OTOP และผู้ประกอบการไทย<br />
          ทุกบาทที่สนับสนุนช่วยให้เราพัฒนา Feature ใหม่ต่อได้
        </p>
      </section>

      <section style={{ maxWidth: 500, margin: '0 auto', padding: '0 5% 48px' }}>
        {/* PromptPay QR */}
        <div style={{ ...card, textAlign: 'center', marginBottom: 24, background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>PromptPay — โอนได้ทุกธนาคาร</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#1e293b', letterSpacing: 4, marginBottom: 4 }}>{PROMPTPAY}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>เปิดแอปธนาคาร → โอนเงิน → ใส่เบอร์ด้านบน</div>
        </div>

        {/* Suggested amounts */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>ยอดแนะนำ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TIERS.map((t) => (
              <div key={t.thb} style={{ ...card, cursor: 'pointer', textAlign: 'center' }}
                onClick={() => navigator.clipboard?.writeText(String(t.thb)).catch(() => {})}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#C9A84C', marginBottom: 2 }}>฿{t.thb}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{t.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 10 }}>คลิกที่ยอดเพื่อคัดลอก</p>
        </div>

        {/* Steps */}
        <div style={{ ...card, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', marginBottom: 12 }}>วิธีสนับสนุน</div>
          {[
            '1. เปิดแอปธนาคารใดก็ได้ (SCB, KBank, BBL, ฯลฯ)',
            `2. เลือก "โอนเงิน" → พิมพ์เบอร์ ${PROMPTPAY_RAW}`,
            '3. ใส่ยอดตามใจ → ยืนยันการโอน',
            '4. (ไม่บังคับ) แคปสลิปแจ้งทีมงาน LINE @openthaiai',
          ].map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', lineHeight: 1.6 }}>{s}</div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
            ทีมงานจะส่งขอบคุณพิเศษผ่าน LINE 🙏<br />
            <strong style={{ color: '#f8fafc' }}>ขอบคุณทุกการสนับสนุน</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/pricing')}
            style={{ flex: 1, background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            💳 สมัคร Pro ฿149/เดือน →
          </button>
          <button onClick={() => navigate('/affiliate')}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 50, padding: '13px', fontSize: 14, cursor: 'pointer' }}>
            💰 รับค่าคอม 20% →
          </button>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px 5% 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#334155', fontSize: 12 }}>© 2026 OpenThai AI — พัฒนาโดยคนไทย เพื่อคนไทย</p>
      </footer>
    </div>
  );
}
