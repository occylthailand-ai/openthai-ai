import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Section = ({ num, title, children }) => (
  <section style={{ marginBottom: 36 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{num}.</span>
      {title}
    </h2>
    <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.85 }}>{children}</div>
  </section>
);

export default function TermsPage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'ข้อกำหนดการใช้งาน — Openthai.ai'; }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", padding: '0 0 80px' }}>
      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 5%', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← กลับ
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>ข้อกำหนดการใช้งาน</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Terms of Service — Openthai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 5% 0' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 12px' }}>
            ข้อกำหนดการใช้งาน
          </h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            มีผลบังคับใช้ตั้งแต่ <strong style={{ color: '#94a3b8' }}>1 มกราคม 2568</strong> · ปรับปรุงล่าสุด <strong style={{ color: '#94a3b8' }}>3 พฤษภาคม 2569</strong>
          </p>
        </div>

        {/* Warning box */}
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 40, fontSize: 13, color: '#fcd34d', lineHeight: 1.7 }}>
          ⚠️ กรุณาอ่านข้อกำหนดนี้อย่างละเอียดก่อนใช้งาน Openthai.ai การใช้บริการถือว่าคุณยอมรับข้อกำหนดทั้งหมด
        </div>

        <Section num="1" title="การยอมรับข้อกำหนด">
          <p>การเข้าถึงหรือใช้งาน <strong style={{ color: '#f8fafc' }}>Openthai.ai</strong> ("<strong>บริการ</strong>") ถือว่าคุณยอมรับข้อกำหนดการใช้งานฉบับนี้ หากไม่ยอมรับ กรุณาหยุดใช้งานทันที</p>
        </Section>

        <Section num="2" title="คำอธิบายบริการ">
          <p>Openthai.ai เป็นแพลตฟอร์ม AI สร้างคอนเทนต์สำหรับ Social Media โดยเฉพาะ TikTok ประกอบด้วย:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginBottom: 6 }}>AI Content Generator — สร้างสคริปต์ แคปชั่น แฮชแท็ก</li>
            <li style={{ marginBottom: 6 }}>Affiliate Program — โปรแกรมพันธมิตรกับค่าคอมมิชชัน</li>
            <li>แพ็กเกจสมาชิก Free / Pro / Business</li>
          </ul>
        </Section>

        <Section num="3" title="บัญชีผู้ใช้และความรับผิดชอบ">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>คุณรับผิดชอบต่อความปลอดภัยของรหัสผ่านและบัญชีของคุณทั้งหมด</li>
            <li style={{ marginBottom: 8 }}>ห้ามแบ่งปันบัญชีให้ผู้อื่น</li>
            <li style={{ marginBottom: 8 }}>ต้องระบุข้อมูลที่ถูกต้องและเป็นปัจจุบันเสมอ</li>
            <li>ต้องอายุ 18 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครอง</li>
          </ul>
        </Section>

        <Section num="4" title="สิทธิ์การใช้งานที่ได้รับอนุญาต">
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
            <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 8 }}>✅ อนุญาต</div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>ใช้เนื้อหาที่สร้างจาก AI สำหรับการตลาดส่วนตัวหรือธุรกิจ</li>
              <li>แชร์คอนเทนต์ที่สร้างขึ้นบน Social Media</li>
              <li>ปรับแต่งเนื้อหา AI ให้เหมาะกับแบรนด์ของคุณ</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 8 }}>🚫 ไม่อนุญาต</div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>Resell หรือให้บริการต่อในนามของ Openthai.ai</li>
              <li>ใช้ API หรือระบบโดยไม่ได้รับอนุญาต</li>
              <li>สร้างคอนเทนต์ที่ผิดกฎหมาย หลอกลวง หรือเป็นอันตราย</li>
              <li>Scrape, reverse engineer หรือ clone บริการ</li>
            </ul>
          </div>
        </Section>

        <Section num="5" title="แผนสมาชิกและการชำระเงิน">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>Free:</strong> ใช้ฟรี 3 ครั้ง/วัน ไม่มีวันหมดอายุ</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>Pro (149 บาท/เดือน):</strong> ไม่จำกัดการสร้าง + คุณสมบัติเพิ่มเติม</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#f8fafc' }}>Business (299 บาท/เดือน):</strong> Pro + API access + Priority support</li>
            <li style={{ marginBottom: 8 }}>ชำระผ่าน PromptPay — ไม่มีการคืนเงินหลังจากใช้งานแล้ว</li>
            <li>ราคาอาจเปลี่ยนแปลงได้โดยแจ้งล่วงหน้า 30 วัน</li>
          </ul>
        </Section>

        <Section num="6" title="โปรแกรม Affiliate">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>Commission คำนวณจากยอดขายสุทธิหลังหักภาษีและค่าธรรมเนียม</li>
            <li style={{ marginBottom: 8 }}>จ่าย commission ทุกวันจันทร์ผ่าน PromptPay หรือโอนธนาคาร</li>
            <li style={{ marginBottom: 8 }}>ขั้นต่ำในการถอน: 100 บาท</li>
            <li style={{ marginBottom: 8 }}>ห้ามใช้ Spam, โฆษณาเท็จ หรือวิธีการที่ผิดจรรยาบรรณ</li>
            <li>เราสงวนสิทธิ์ระงับบัญชี Affiliate ที่ผิดเงื่อนไข</li>
          </ul>
        </Section>

        <Section num="7" title="การยกเว้นความรับผิด">
          <p>Openthai.ai ให้บริการ "as is" โดยไม่รับประกัน:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginBottom: 6 }}>ความถูกต้องของเนื้อหาที่ AI สร้างขึ้น</li>
            <li style={{ marginBottom: 6 }}>ผลลัพธ์ทางธุรกิจจากการใช้คอนเทนต์</li>
            <li>ความพร้อมใช้งานตลอด 24 ชั่วโมง (อาจมี downtime เพื่อบำรุงรักษา)</li>
          </ul>
        </Section>

        <Section num="8" title="กฎหมายที่ใช้บังคับ">
          <p>ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดๆ อยู่ในเขตอำนาจศาลไทย</p>
        </Section>

        <Section num="9" title="ติดต่อเรา">
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              📧 Email: <a href="mailto:support@openthai.ai" style={{ color: '#6366f1' }}>support@openthai.ai</a><br />
              🌐 Website: <a href="https://www.openthai-ai.com" style={{ color: '#6366f1' }}>www.openthai-ai.com</a>
            </div>
          </div>
        </Section>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🏠 กลับหน้าหลัก
          </button>
          <button onClick={() => navigate('/privacy')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '12px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
            🔒 นโยบายความเป็นส่วนตัว
          </button>
        </div>
      </div>
    </div>
  );
}
