import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// แพ็กเกจบริการจับคู่ธุรกิจแบบ "ทีมงานทำให้ + แพลตฟอร์มช่วย" — ไม่ใช่การขายตัวระบบ
// ราคา/เนื้อหาต้องตรงกับสิ่งที่ส่งมอบได้จริงเท่านั้น: การจับคู่คัดด้วยคน จากเครือข่าย
// ที่สมัครเข้ามาเองผ่าน /portals/* + เครื่องมือ AI ที่มีอยู่จริงในระบบ (S18 Promo Engine,
// S25 Live Selling Script, copywriting templates) — ห้ามเพิ่ม feature ที่ยังไม่มีจริงลงหน้านี้
const PACKAGES = [
  {
    id: 'starter', name: 'Starter', price: 15000, color: '#0ea5e9',
    desc: 'เริ่มต้นหาคู่ค้า/ช่องทางขายใหม่',
    items: [
      'วิเคราะห์สินค้าและวางแผนช่องทางขาย (คุยตรงกับทีมงาน 1 ครั้ง)',
      'จับคู่กับผู้ผลิต/ตัวแทนจำหน่ายในเครือข่ายที่คัดโดยทีมงาน',
      'ชุดคอนเทนต์การตลาดจาก AI (โพสต์ขาย + แคปชั่น ตามหมวดสินค้า)',
      'ลงทะเบียนโปรไฟล์ธุรกิจบนแพลตฟอร์ม OpenThaiAi',
    ],
  },
  {
    id: 'business', name: 'Business', price: 20000, color: '#6366f1', hot: true,
    desc: 'จับคู่ + ติดตามผลจนเห็นความคืบหน้า',
    items: [
      'ทุกอย่างในแพ็กเกจ Starter',
      'สคริปต์ขายไลฟ์ (Live Selling Script) เฉพาะสินค้าของคุณ',
      'ติดตามผลการจับคู่และประสานงานให้ 30 วัน',
      'รายงานสรุปสิ่งที่ทำและผลที่เกิดขึ้นจริงเมื่อจบงาน',
    ],
  },
  {
    id: 'premium', name: 'Premium', price: 25000, color: '#f59e0b',
    desc: 'ดูแลใกล้ชิดสำหรับองค์กร/กลุ่มผู้ผลิต',
    items: [
      'ทุกอย่างในแพ็กเกจ Business',
      'สอนทีมของคุณใช้เครื่องมือ AI บนแพลตฟอร์มจนใช้เองเป็น',
      'ที่ปรึกษาต่อเนื่อง 60 วัน (ช่องทางติดต่อตรง)',
      'เหมาะกับหน่วยงาน วิสาหกิจชุมชน หรือกลุ่มผู้ผลิตหลายราย',
    ],
  },
];

export default function ServicePackagesPage() {
  const navigate = useNavigate();
  const [pkg, setPkg] = useState('business');
  const [form, setForm] = useState({ name: '', org: '', phone: '', email: '', detail: '' });
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { document.title = 'OpenThaiAi — แพ็กเกจบริการจับคู่ธุรกิจ'; }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch(apiUrl('/api/leads/submit'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, package: pkg, type: 'service-package', lang: 'th' }),
      });
      const d = await res.json().catch(() => null);
      if (d?.success) setSent(true);
      else setErr(d?.error || 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } catch {
      setErr('เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter','Sarabun',system-ui,sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>← หน้าแรก</button>
        <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>แพ็กเกจรายเดือน (฿20-30)</button>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#6366f1', margin: '0 0 12px' }}>บริการจับคู่ธุรกิจ OTOP / SME</h1>
          <p style={{ color: '#aaa', fontSize: 18, maxWidth: 640, margin: '0 auto' }}>
            ทีมงานคัดและจับคู่ผู้ผลิตกับผู้ซื้อ/ตัวแทนจำหน่ายให้คุณโดยตรง
            โดยใช้เครือข่ายและเครื่องมือ AI บนแพลตฟอร์ม OpenThaiAi เป็นตัวช่วย
          </p>
        </div>

        {/* กรอบความจริง — จุดขายของเราคือความตรงไปตรงมา ห้ามลบส่วนนี้เพื่อให้หน้าดูขายเก่งขึ้น */}
        <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '18px 24px', maxWidth: 720, margin: '0 auto 40px', fontSize: 14, color: '#9ca3af', lineHeight: 1.7 }}>
          <b style={{ color: '#e5e7eb' }}>เราสัญญาเฉพาะสิ่งที่ทำได้จริง:</b> การจับคู่ทำโดยทีมงาน (ไม่ใช่ระบบอัตโนมัติ)
          จากเครือข่ายผู้สมัครจริงบนแพลตฟอร์ม จำนวนคู่ค้าที่เหมาะสมขึ้นกับหมวดสินค้าของคุณ
          เรา<b style={{ color: '#e5e7eb' }}>ไม่การันตียอดขาย</b>และไม่ใช้สถิติที่ตรวจสอบไม่ได้ —
          คุยรายละเอียดกับทีมงานก่อน ชำระเงินเมื่อตกลงขอบเขตงานกันแล้วเท่านั้น
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 48 }}>
          {PACKAGES.map((p) => (
            <div key={p.id} onClick={() => setPkg(p.id)}
              style={{ background: pkg === p.id ? p.color + '14' : '#111', border: `1.5px solid ${pkg === p.id ? p.color : '#222'}`, borderRadius: 16, padding: 28, cursor: 'pointer', position: 'relative', transition: 'all .2s' }}>
              {p.hot && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: p.color, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>แนะนำ</div>}
              <div style={{ fontWeight: 900, fontSize: 20, color: p.color, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>{p.desc}</div>
              <div style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 38, fontWeight: 900 }}>฿{p.price.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: '#888', marginLeft: 6 }}>/ องค์กร (ครั้งเดียว)</span>
              </div>
              {p.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
                  <span style={{ color: p.color }}>✓</span><span>{it}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ background: '#111', borderRadius: 16, padding: 28, border: '1px solid #6366f133', maxWidth: 560, margin: '0 auto' }}>
          <h3 style={{ color: '#6366f1', margin: '0 0 6px' }}>นัดคุยกับทีมงาน (ฟรี ไม่มีข้อผูกมัด)</h3>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>
            เลือกแพ็กเกจที่สนใจด้านบน แล้วกรอกข้อมูล — ทีมงานติดต่อกลับเพื่อคุยขอบเขตงานก่อน
            ยังไม่ต้องชำระเงินในขั้นตอนนี้
          </p>
          {sent ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <p style={{ color: '#10b981', marginTop: 16 }}>ได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด ขอบคุณครับ</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {[['name', 'ชื่อผู้ติดต่อ'], ['org', 'ชื่อธุรกิจ/หน่วยงาน'], ['phone', 'เบอร์โทร / LINE ID'], ['email', 'อีเมล']].map(([k, label]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>{label}</label>
                  <input required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>สินค้า/สิ่งที่อยากได้จากการจับคู่ (เล่าสั้นๆ)</label>
                <textarea required rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 14, fontSize: 13, color: '#888' }}>
                แพ็กเกจที่เลือก: <b style={{ color: PACKAGES.find((p) => p.id === pkg)?.color }}>{PACKAGES.find((p) => p.id === pkg)?.name} — ฿{PACKAGES.find((p) => p.id === pkg)?.price.toLocaleString()}</b>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, fontSize: 12, color: '#aaa', lineHeight: 1.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
                <span>ยินยอมให้เก็บและใช้ข้อมูลตาม<a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc' }}>นโยบายความเป็นส่วนตัว (PDPA)</a></span>
              </label>
              {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <button type="submit" disabled={!consent}
                style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: consent ? 'pointer' : 'not-allowed', opacity: consent ? 1 : 0.5, marginTop: 8 }}>
                ส่งข้อมูล นัดคุยกับทีมงาน
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
