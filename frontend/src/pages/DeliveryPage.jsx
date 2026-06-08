import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const baht = (n) => `฿${Number(n || 0).toLocaleString('th-TH')}`;
const ST = {
  requested: 'รับเรื่องแล้ว', quoted: 'ประเมินราคาแล้ว', assigned: 'จ่ายงานให้คนขับ', accepted: 'คนขับรับงาน',
  picked_up: 'รับพัสดุแล้ว', in_transit: 'กำลังจัดส่ง', delivered: 'จัดส่งสำเร็จ', failed: 'จัดส่งไม่สำเร็จ', cancelled: 'ยกเลิก',
};

export default function DeliveryPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ vehicles: [], zones: [] });
  const [form, setForm] = useState({
    shipper_name: '', shipper_contact: '', pickup_address: '', pickup_zone: '', dropoff_name: '', dropoff_contact: '',
    dropoff_address: '', dropoff_zone: '', vehicle: 'motorcycle', weight_kg: '', distance_km: '', parcel_desc: '', cod_amount: '', express: false,
  });
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = 'ส่งพัสดุ / จองรถขนส่ง — Openthai.ai';
    fetch(apiUrl('/api/logistics/meta')).then(r => r.json()).then(d => { if (d.success) { setMeta(d); setForm(f => ({ ...f, pickup_zone: d.zones[0], dropoff_zone: d.zones[0] })); } }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // ประเมินราคาแบบสด ทุกครั้งที่เปลี่ยน vehicle/distance/zone/express/weight
  const refreshQuote = useCallback(() => {
    const p = new URLSearchParams({ vehicle: form.vehicle, distance_km: form.distance_km || '0', pickup_zone: form.pickup_zone || '', dropoff_zone: form.dropoff_zone || '', express: form.express ? '1' : '0', weight_kg: form.weight_kg || '0' });
    fetch(apiUrl(`/api/logistics/quote?${p.toString()}`)).then(r => r.json()).then(d => { if (d.success) setQuote(d.quote); }).catch(() => {});
  }, [form.vehicle, form.distance_km, form.pickup_zone, form.dropoff_zone, form.express, form.weight_kg]);
  useEffect(() => { refreshQuote(); }, [refreshQuote]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!form.shipper_contact.trim() || !form.pickup_address.trim() || !form.dropoff_address.trim()) { setErr('กรอกที่อยู่รับ-ส่ง และช่องทางติดต่อให้ครบ'); return; }
    setBusy(true);
    try {
      const r = await fetch(apiUrl('/api/logistics/jobs'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).then(x => x.json());
      if (r.success) setRes(r); else setErr(r.error || 'จองงานไม่สำเร็จ');
    } catch { setErr('เชื่อมต่อไม่ได้'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/carriers')} style={navBtn}>🔎 หาผู้จัดส่ง</button>
        <button onClick={() => navigate('/carrier')} style={navBtn}>🚚 เป็นผู้จัดส่ง</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '44px 5% 20px' }}>
        <div style={badge}>📦 ส่งพัสดุทุกโซน ทุกยานพาหนะ</div>
        <h1 style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 900, margin: '12px 0 8px' }}>จองรถขนส่งตามที่อยู่</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>เลือกยานพาหนะ ระบุที่อยู่รับ-ส่ง รู้ค่าส่งทันที แล้วเราจ่ายงานให้ผู้จัดส่งที่ยืนยันตัวตนแล้ว</p>
      </section>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 5% 80px' }}>
        {res ? (
          <div style={{ ...card, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 46, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontWeight: 900, marginBottom: 6 }}>รับงานจัดส่งแล้ว</h2>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>ค่าส่งประเมิน <b style={{ color: '#10b981' }}>{baht(res.quote?.price)}</b> · เราจะจ่ายงานให้ผู้จัดส่งและแจ้งความคืบหน้า</p>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, margin: '14px 0', fontSize: 12 }}>
              <div style={{ color: '#64748b' }}>รหัสงานจัดส่ง</div>
              <div style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{res.id}</div>
            </div>
            <p style={{ color: '#64748b', fontSize: 12 }}>ติดตามสถานะด้านล่างด้วยรหัสงาน + ช่องทางติดต่อของคุณ</p>
            <button onClick={() => { setRes(null); }} style={{ ...primaryBtn, marginTop: 14 }}>+ จองงานใหม่</button>
            <Track presetId={res.id} />
          </div>
        ) : (
          <>
            <form onSubmit={submit} style={card}>
              <SectionTitle>📤 จุดรับพัสดุ</SectionTitle>
              <Row>
                <Field label="ชื่อผู้ส่ง"><input style={inp} value={form.shipper_name} onChange={set('shipper_name')} placeholder="ชื่อ / ร้าน" /></Field>
                <Field label="ติดต่อผู้ส่ง *"><input style={inp} value={form.shipper_contact} onChange={set('shipper_contact')} placeholder="เบอร์ / LINE" /></Field>
              </Row>
              <Field label="ที่อยู่รับพัสดุ *"><textarea style={{ ...inp, minHeight: 52, resize: 'vertical' }} value={form.pickup_address} onChange={set('pickup_address')} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด" /></Field>
              <Field label="โซนต้นทาง"><select style={inp} value={form.pickup_zone} onChange={set('pickup_zone')}>{meta.zones.map(z => <option key={z} value={z}>{z}</option>)}</select></Field>

              <SectionTitle>📥 จุดส่งปลายทาง</SectionTitle>
              <Row>
                <Field label="ชื่อผู้รับ"><input style={inp} value={form.dropoff_name} onChange={set('dropoff_name')} placeholder="ชื่อผู้รับ" /></Field>
                <Field label="ติดต่อผู้รับ"><input style={inp} value={form.dropoff_contact} onChange={set('dropoff_contact')} placeholder="เบอร์ผู้รับ" /></Field>
              </Row>
              <Field label="ที่อยู่ปลายทาง *"><textarea style={{ ...inp, minHeight: 52, resize: 'vertical' }} value={form.dropoff_address} onChange={set('dropoff_address')} placeholder="ที่อยู่ส่งปลายทาง" /></Field>
              <Field label="โซนปลายทาง"><select style={inp} value={form.dropoff_zone} onChange={set('dropoff_zone')}>{meta.zones.map(z => <option key={z} value={z}>{z}</option>)}</select></Field>

              <SectionTitle>🚗 รายละเอียดพัสดุ</SectionTitle>
              <Field label="ยานพาหนะ">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {meta.vehicles.map((v) => (
                    <button type="button" key={v.id} onClick={() => setForm(f => ({ ...f, vehicle: v.id }))}
                      style={{ ...chip, ...(form.vehicle === v.id ? chipOn : {}) }} title={`บรรทุก ~${v.cap_kg} กก.`}>{v.label}</button>
                  ))}
                </div>
              </Field>
              <Row>
                <Field label="น้ำหนัก (กก.)"><input style={inp} type="number" min="0" value={form.weight_kg} onChange={set('weight_kg')} placeholder="—" /></Field>
                <Field label="ระยะทางโดยประมาณ (กม.)"><input style={inp} type="number" min="0" value={form.distance_km} onChange={set('distance_km')} placeholder="เช่น 12" /></Field>
              </Row>
              <Row>
                <Field label="รายละเอียดพัสดุ"><input style={inp} value={form.parcel_desc} onChange={set('parcel_desc')} placeholder="เช่น กล่องเสื้อผ้า 2 กล่อง" /></Field>
                <Field label="เก็บเงินปลายทาง COD (฿)"><input style={inp} type="number" min="0" value={form.cod_amount} onChange={set('cod_amount')} placeholder="0 = ไม่เก็บ" /></Field>
              </Row>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer', margin: '4px 0 10px' }}>
                <input type="checkbox" checked={form.express} onChange={set('express')} style={{ width: 16, height: 16, accentColor: '#fe2c55' }} />⚡ ส่งด่วน (+30%)
              </label>

              {quote && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 16px', margin: '6px 0 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>ค่าส่งประเมิน{quote.cross_zone ? ' · ข้ามโซน' : ''}{quote.express ? ' · ด่วน' : ''}</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{baht(quote.price)}</span>
                  </div>
                </div>
              )}
              {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>⚠️ {err}</div>}
              <button type="submit" disabled={busy} style={{ ...primaryBtn, width: '100%', opacity: busy ? 0.7 : 1 }}>{busy ? 'กำลังจอง…' : '📦 จองงานจัดส่ง'}</button>
            </form>
            <Track />
          </>
        )}
      </section>
    </div>
  );
}

// ── ติดตามงานจัดส่ง ─────────────────────────────────────────────────────────────
function Track({ presetId = '' }) {
  const [id, setId] = useState(presetId);
  const [contact, setContact] = useState('');
  const [job, setJob] = useState(null);
  const [err, setErr] = useState('');
  const go = async (e) => {
    e?.preventDefault();
    setErr(''); setJob(null);
    if (!id.trim() || !contact.trim()) { setErr('ใส่รหัสงาน + ช่องทางติดต่อ'); return; }
    try {
      const r = await fetch(apiUrl(`/api/logistics/jobs/track?id=${encodeURIComponent(id)}&contact=${encodeURIComponent(contact)}`)).then(x => x.json());
      if (r.success) setJob(r.job); else setErr(r.error || 'ไม่พบงาน');
    } catch { setErr('เชื่อมต่อไม่ได้'); }
  };
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>🔍 ติดตามงานจัดส่ง</div>
      <form onSubmit={go} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input style={{ ...inp, flex: 2, minWidth: 160 }} value={id} onChange={(e) => setId(e.target.value)} placeholder="รหัสงาน (job_...)" />
        <input style={{ ...inp, flex: 1, minWidth: 120 }} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="เบอร์/LINE" />
        <button type="submit" style={{ ...primaryBtn, padding: '11px 20px' }}>ติดตาม</button>
      </form>
      {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 8 }}>⚠️ {err}</div>}
      {job && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, color: '#a5b4fc' }}>{ST[job.status] || job.status}</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{baht(job.quote_price)}</span>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{job.pickup_zone} → {job.dropoff_zone} · {job.vehicle}{job.tracking_no ? ` · 🔖 ${job.tracking_no}` : ''}</div>
          {job.carrier && <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>🚚 {job.carrier.name} {job.carrier.verified ? '✔' : ''} · ☎️ {job.carrier.phone} · ⭐ {job.carrier.rating_avg || 0}</div>}
          <div style={{ marginTop: 12, borderLeft: '2px solid rgba(99,102,241,0.4)', paddingLeft: 14 }}>
            {(job.history || []).map((h, i) => (
              <div key={i} style={{ marginBottom: 10, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -20, top: 3, width: 9, height: 9, borderRadius: '50%', background: i === job.history.length - 1 ? '#10b981' : '#6366f1' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ST[h.status] || h.status}</div>
                {h.note && <div style={{ fontSize: 12, color: '#94a3b8' }}>{h.note}</div>}
                <div style={{ fontSize: 11, color: '#475569' }}>{new Date(h.at).toLocaleString('th-TH')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SectionTitle = ({ children }) => <div style={{ fontSize: 13, fontWeight: 800, color: '#a5b4fc', margin: '6px 0 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>{children}</div>;
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);
const Row = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const chip = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '7px 13px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const chipOn = { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.6)', color: '#c7d2fe', fontWeight: 700 };
