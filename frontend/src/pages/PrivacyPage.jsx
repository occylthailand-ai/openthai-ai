import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 36 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {title}
    </h2>
    <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.85 }}>{children}</div>
  </section>
);

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { document.title = 'นโยบายความเป็นส่วนตัว — Openthai.ai'; }, []);

  // ใช้สิทธิ PDPA แบบ self-service — endpoint จริง (/api/privacy/access, /api/privacy/erasure) มีอยู่แล้ว
  // แต่หน้านี้เดิมมีแค่ข้อความให้อีเมลไปหา DPO ผู้ใช้จึงกดใช้สิทธิเองไม่ได้เลย ทั้งสอง endpoint จะส่ง
  // ลิงก์ยืนยันไปที่อีเมลก่อนเสมอ (กันคนอื่นด/ลบข้อมูลของเรา) — ตรง res.ok จริงก่อนแสดงผลสำเร็จ (บทเรียน run 52)
  const submitRight = async (endpoint) => {
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setMsg({ ok: false, text: 'กรุณากรอกอีเมลให้ถูกต้อง' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(apiUrl(endpoint), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setMsg({ ok: false, text: (data && (data.message || data.error)) || `เกิดข้อผิดพลาด (HTTP ${res.status})` }); return; }
      setMsg({ ok: true, text: (data && data.message) || 'ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ' });
    } catch { setMsg({ ok: false, text: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", padding: '0 0 80px' }}>
      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 5%', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← กลับ
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>นโยบายความเป็นส่วนตัว</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Privacy Policy — Openthai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 5% 0' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, background: 'linear-gradient(90deg,#6366f1,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 12px' }}>
            นโยบายความเป็นส่วนตัว
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            มีผลบังคับใช้ตั้งแต่ <strong style={{ color: '#94a3b8' }}>1 มกราคม 2568</strong> · ปรับปรุงล่าสุด <strong style={{ color: '#94a3b8' }}>3 พฤษภาคม 2569</strong>
          </p>
        </div>

        {/* Notice box */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 40, fontSize: 13, color: '#a5b4fc', lineHeight: 1.7 }}>
          🛡️ <strong>Openthai.ai</strong> เคารพความเป็นส่วนตัวของคุณและปฏิบัติตาม <strong>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong> อย่างเคร่งครัด นโยบายนี้อธิบายว่าเราเก็บ ใช้ และปกป้องข้อมูลของคุณอย่างไร
        </div>

        <Section title="1. ข้อมูลที่เราเก็บรวบรวม">
          <p><strong style={{ color: '#f8fafc' }}>ข้อมูลที่คุณให้โดยตรง:</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
            <li>ชื่อ อีเมล เบอร์โทรศัพท์ (เมื่อสมัคร Affiliate หรือชำระเงิน)</li>
            <li>ข้อมูลสินค้าและคอนเทนต์ที่คุณป้อนในระบบ AI Generator</li>
            <li>ข้อมูลการชำระเงิน (ประมวลผลผ่านผู้ให้บริการที่เชื่อถือได้ — เราไม่จัดเก็บข้อมูลบัตรเครดิต)</li>
          </ul>
          <p><strong style={{ color: '#f8fafc' }}>ข้อมูลที่เก็บโดยอัตโนมัติ (เมื่อได้รับความยินยอม):</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li>IP Address, ประเภทเบราว์เซอร์, ระบบปฏิบัติการ</li>
            <li>หน้าที่เยี่ยมชม, เวลาที่ใช้งาน, การคลิก (ผ่าน Google Analytics 4)</li>
            <li>คุกกี้ที่จำเป็น (session, authentication token)</li>
          </ul>
        </Section>

        <Section title="2. วัตถุประสงค์ในการใช้ข้อมูล">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>🤖 ให้บริการ AI Content Generator และ Affiliate Dashboard</li>
            <li style={{ marginBottom: 8 }}>📧 ส่งอีเมลต้อนรับ อัปเดตระบบ และข้อมูลการชำระเงิน</li>
            <li style={{ marginBottom: 8 }}>📊 วิเคราะห์การใช้งานเพื่อปรับปรุงบริการ (เมื่อได้รับความยินยอม)</li>
            <li style={{ marginBottom: 8 }}>🔒 ตรวจสอบและป้องกันการฉ้อโกง</li>
            <li>⚖️ ปฏิบัติตามกฎหมายและข้อบังคับที่เกี่ยวข้อง</li>
          </ul>
        </Section>

        <Section title="3. ฐานทางกฎหมายในการประมวลผล (PDPA)">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>ความยินยอม (Consent)</strong> — สำหรับคุกกี้ Analytics และ Marketing</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>การปฏิบัติตามสัญญา (Contract)</strong> — เพื่อให้บริการ Affiliate และชำระเงิน</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>ประโยชน์โดยชอบด้วยกฎหมาย (Legitimate Interest)</strong> — ป้องกันการฉ้อโกง</li>
            <li><strong style={{ color: '#f8fafc' }}>ข้อบังคับทางกฎหมาย (Legal Obligation)</strong> — เมื่อกฎหมายกำหนด</li>
          </ul>
        </Section>

        <Section title="4. การแบ่งปันข้อมูล">
          <p>เราไม่ขายข้อมูลส่วนตัวของคุณ เราอาจแบ่งปันข้อมูลกับ:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#f8fafc' }}>Google Analytics</strong> — สถิติการใช้งาน (เมื่อได้รับความยินยอม)</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#f8fafc' }}>Vercel</strong> — Hosting และ CDN</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#f8fafc' }}>Google Gemini AI</strong> — ประมวลผลคำสั่ง AI (ข้อมูลสินค้าที่คุณป้อน)</li>
            <li><strong style={{ color: '#f8fafc' }}>หน่วยงานรัฐ</strong> — เมื่อมีคำสั่งทางกฎหมาย</li>
          </ul>
        </Section>

        <Section title="5. การเก็บรักษาและลบข้อมูล">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 6 }}>ข้อมูลบัญชีและ Affiliate: ตลอดอายุบัญชี + 1 ปีหลังยกเลิก</li>
            <li style={{ marginBottom: 6 }}>Log การใช้งาน: 90 วัน</li>
            <li style={{ marginBottom: 6 }}>ข้อมูลการชำระเงิน: ตามที่กฎหมายบัญชีกำหนด (7 ปี)</li>
            <li>คุกกี้ Analytics: ตามการตั้งค่า Consent Mode (ถอนความยินยอมได้ทุกเมื่อ)</li>
          </ul>
        </Section>

        <Section title="6. สิทธิของเจ้าของข้อมูล (PDPA)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, margin: '8px 0 0' }}>
            {[
              { icon: '👁', right: 'สิทธิรับทราบ', desc: 'รู้ว่าเก็บข้อมูลอะไร' },
              { icon: '📋', right: 'สิทธิเข้าถึง', desc: 'ขอดูข้อมูลของตัวเอง' },
              { icon: '✏️', right: 'สิทธิแก้ไข', desc: 'ขอแก้ไขข้อมูลที่ผิด' },
              { icon: '🗑', right: 'สิทธิลบ', desc: 'ขอให้ลบข้อมูล' },
              { icon: '🚫', right: 'สิทธิคัดค้าน', desc: 'คัดค้านการประมวลผล' },
              { icon: '📦', right: 'สิทธิพกพา', desc: 'ขอส่งออกข้อมูล' },
            ].map(r => (
              <div key={r.right} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#f8fafc', marginBottom: 2 }}>{r.right}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 13 }}>
            ติดต่อขอใช้สิทธิได้ที่ <a href="mailto:privacy@openthai.ai" style={{ color: '#6366f1' }}>privacy@openthai.ai</a> — เราจะตอบกลับภายใน 30 วัน
          </p>
        </Section>

        <Section title="7. ใช้สิทธิของคุณด้วยตนเอง">
          <p style={{ marginBottom: 14 }}>
            กรอกอีเมลที่คุณใช้สมัคร แล้วเลือกสิ่งที่ต้องการ เพื่อความปลอดภัย เราจะส่ง<strong style={{ color: '#f8fafc' }}>ลิงก์ยืนยันไปที่อีเมลนั้นก่อนเสมอ</strong> (กันไม่ให้ผู้อื่นดูหรือลบข้อมูลของคุณ)
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button disabled={busy} onClick={() => submitRight('/api/privacy/access')}
              style={{ flex: '1 1 200px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              📋 ขอดูข้อมูลของฉัน
            </button>
            <button disabled={busy} onClick={() => submitRight('/api/privacy/erasure')}
              style={{ flex: '1 1 200px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              🗑 ขอลบข้อมูลของฉัน
            </button>
          </div>
          {msg && (
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.ok ? '#6ee7b7' : '#fca5a5' }}>
              {msg.ok ? '✅ ' : '⚠️ '}{msg.text}
            </div>
          )}
        </Section>

        <Section title="8. ความปลอดภัยของข้อมูล">
          <p>เราใช้มาตรการรักษาความปลอดภัยดังนี้:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginBottom: 6 }}>🔐 HTTPS ทุก request — TLS 1.3</li>
            <li style={{ marginBottom: 6 }}>🔑 JWT Authentication + bcrypt password hashing</li>
            <li style={{ marginBottom: 6 }}>🛡️ Rate Limiting ป้องกัน brute force</li>
            <li>🏗️ Infrastructure บน Vercel (SOC 2 Type II certified)</li>
          </ul>
        </Section>

        <Section title="9. ติดต่อ DPO (Data Protection Officer)">
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>Openthai.ai — ฝ่ายคุ้มครองข้อมูล</div>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              📧 Email: <a href="mailto:privacy@openthai.ai" style={{ color: '#6366f1' }}>privacy@openthai.ai</a><br />
              🌐 Website: <a href="https://www.openthai-ai.com" style={{ color: '#6366f1' }}>www.openthai-ai.com</a><br />
              🕐 เวลาทำการ: จันทร์–ศุกร์ 9:00–18:00 น.
            </div>
          </div>
        </Section>

        {/* Back button */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🏠 กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
