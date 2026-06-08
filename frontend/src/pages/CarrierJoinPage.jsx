import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const CARRIER_TYPES = [
  { id: 'individual', label: '🧍 คนขับอิสระ' },
  { id: 'fleet', label: '🚚 เจ้าของรถหลายคัน' },
  { id: 'company', label: '🏢 บริษัทขนส่ง' },
];

export default function CarrierJoinPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ vehicles: [], zones: [] });
  const [form, setForm] = useState({
    type: 'individual', business_name: '', contact_name: '', phone: '', email: '', line_id: '',
    base_province: '', capacity_kg: '', license_plate: '', driver_license: '', vehicle_reg: '', company_reg: '',
    cod_supported: false, express_supported: false, refrigerated: false, note: '',
  });
  const [vehicles, setVehicles] = useState([]);
  const [zones, setZones] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = 'สมัครเป็นผู้จัดส่ง — Openthai.ai';
    fetch(apiUrl('/api/logistics/meta')).then(r => r.json()).then(d => { if (d.success) setMeta(d); }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!form.contact_name.trim() || !form.phone.trim()) { setErr('กรอกชื่อผู้ติดต่อและเบอร์โทร'); return; }
    if (form.type !== 'individual' && !form.business_name.trim()) { setErr('กรอกชื่อกิจการ/บริษัท'); return; }
    if (!vehicles.length) { setErr('เลือกยานพาหนะอย่างน้อย 1 ประเภท'); return; }
    if (!zones.length) { setErr('เลือกโซนบริการอย่างน้อย 1 โซน'); return; }
    setBusy(true);
    try {
      const res = await fetch(apiUrl('/api/logistics/carriers/apply'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, vehicles, zones }),
      });
      const d = await res.json();
      if (d.success) setDone(true); else setErr(d.error || 'สมัครไม่สำเร็จ');
    } catch { setErr('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/delivery')} style={navBtn}>📦 ส่งพัสดุ</button>
        <button onClick={() => navigate('/carriers')} style={navBtn}>🔎 หาผู้จัดส่ง</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '52px 5% 24px' }}>
        <div style={badge}>🚚 สำหรับผู้จัดส่ง / กิจการขนส่งรับจ้าง</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,46px)', fontWeight: 900, margin: '12px 0 10px' }}>มาเป็นผู้จัดส่งกับ Openthai.ai</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
          รับงานจัดส่งตามที่อยู่ทุกโซนทั่วไทย ด้วยยานพาหนะทุกประเภท — มอเตอร์ไซค์ รถกระบะ รถตู้ รถบรรทุก ไปจนถึงรถพ่วงและรถห้องเย็น
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
          {['📍 เลือกโซนที่สะดวก', '💰 ค่าส่งคิดอัตโนมัติ', '⭐ สะสมคะแนน-รับงานต่อเนื่อง'].map((v) => (
            <div key={v} style={{ ...card, padding: '12px 18px', fontSize: 13, color: '#cbd5e1' }}>{v}</div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 660, margin: '0 auto', padding: '0 5% 80px' }}>
        {done ? (
          <div style={{ ...card, textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontWeight: 900, marginBottom: 8 }}>รับใบสมัครแล้ว!</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>ทีมงานจะตรวจสอบเอกสารและยืนยันตัวตน ก่อนเปิดให้คุณรับงานจัดส่ง — เราจะติดต่อกลับทางเบอร์/อีเมลที่ให้ไว้</p>
            <button onClick={() => navigate('/')} style={{ ...primaryBtn, marginTop: 20 }}>กลับหน้าหลัก</button>
          </div>
        ) : (
          <form onSubmit={submit} style={card}>
            <Field label="ประเภทผู้สมัคร">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CARRIER_TYPES.map((ct) => (
                  <button type="button" key={ct.id} onClick={() => setForm(f => ({ ...f, type: ct.id }))}
                    style={{ ...chip, ...(form.type === ct.id ? chipOn : {}) }}>{ct.label}</button>
                ))}
              </div>
            </Field>
            {form.type !== 'individual' && (
              <Field label="ชื่อกิจการ / บริษัท *"><input style={inp} value={form.business_name} onChange={set('business_name')} placeholder="เช่น ส่งไววิ่งไว ขนส่ง" /></Field>
            )}
            <Row>
              <Field label="ชื่อผู้ติดต่อ *"><input style={inp} value={form.contact_name} onChange={set('contact_name')} placeholder="ชื่อ-นามสกุล" /></Field>
              <Field label="เบอร์โทร *"><input style={inp} value={form.phone} onChange={set('phone')} placeholder="08x-xxx-xxxx" /></Field>
            </Row>
            <Row>
              <Field label="อีเมล"><input style={inp} type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></Field>
              <Field label="LINE ID"><input style={inp} value={form.line_id} onChange={set('line_id')} placeholder="@yourline" /></Field>
            </Row>

            <Field label="ยานพาหนะที่ให้บริการ * (เลือกได้หลายอย่าง)">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {meta.vehicles.map((v) => (
                  <button type="button" key={v.id} onClick={() => toggle(vehicles, setVehicles, v.id)}
                    style={{ ...chip, ...(vehicles.includes(v.id) ? chipOn : {}) }} title={`บรรทุกได้ ~${v.cap_kg} กก.`}>{v.label}</button>
                ))}
              </div>
            </Field>

            <Field label="โซนบริการ * (จัดส่งตามที่อยู่โซนไหนได้บ้าง)">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {meta.zones.map((z) => (
                  <button type="button" key={z} onClick={() => toggle(zones, setZones, z)}
                    style={{ ...chip, ...(zones.includes(z) ? chipOn : {}) }}>{z}</button>
                ))}
              </div>
            </Field>

            <Row>
              <Field label="จังหวัดที่ตั้งฐาน"><input style={inp} value={form.base_province} onChange={set('base_province')} placeholder="เช่น กรุงเทพฯ" /></Field>
              <Field label="น้ำหนักบรรทุกสูงสุด (กก.)"><input style={inp} type="number" min="0" value={form.capacity_kg} onChange={set('capacity_kg')} placeholder="—" /></Field>
            </Row>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '6px 0 14px' }}>
              <Check label="💵 รับเก็บเงินปลายทาง (COD)" checked={form.cod_supported} onChange={set('cod_supported')} />
              <Check label="⚡ รับส่งด่วน" checked={form.express_supported} onChange={set('express_supported')} />
              <Check label="❄️ รถควบคุมอุณหภูมิ" checked={form.refrigerated} onChange={set('refrigerated')} />
            </div>

            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, margin: '4px 0 8px' }}>📄 เอกสารยืนยันตัวตน (ทำให้บัญชีน่าเชื่อถือ — กรอกเท่าที่มี)</div>
            <Row>
              <Field label="ทะเบียนรถ"><input style={inp} value={form.license_plate} onChange={set('license_plate')} placeholder="เช่น 1กข 1234" /></Field>
              <Field label="เลขใบขับขี่"><input style={inp} value={form.driver_license} onChange={set('driver_license')} placeholder="—" /></Field>
            </Row>
            <Row>
              <Field label="เลขทะเบียนรถ (เล่ม)"><input style={inp} value={form.vehicle_reg} onChange={set('vehicle_reg')} placeholder="—" /></Field>
              <Field label="เลขทะเบียนนิติบุคคล"><input style={inp} value={form.company_reg} onChange={set('company_reg')} placeholder="สำหรับบริษัท" /></Field>
            </Row>
            <Field label="หมายเหตุเพิ่มเติม"><textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={form.note} onChange={set('note')} placeholder="เช่น ช่วงเวลาที่สะดวกรับงาน, พื้นที่เชี่ยวชาญ" /></Field>

            {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 4 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', marginTop: 14, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'กำลังส่ง…' : '🚚 สมัครเป็นผู้จัดส่ง'}
            </button>
            <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 12 }}>การสมัครฟรี · ทีมงานตรวจสอบก่อนเปิดรับงาน เพื่อความปลอดภัยของลูกค้า</p>
          </form>
        )}
      </section>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);
const Row = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
const Check = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />{label}
  </label>
);

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const chip = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '7px 13px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const chipOn = { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.6)', color: '#c7d2fe', fontWeight: 700 };
