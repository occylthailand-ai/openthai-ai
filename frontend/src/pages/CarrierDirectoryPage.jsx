import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

export default function CarrierDirectoryPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ vehicles: [], zones: [] });
  const [zone, setZone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [cod, setCod] = useState(false);
  const [refrigerated, setRefrigerated] = useState(false);
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);

  useEffect(() => {
    document.title = 'หาผู้จัดส่ง — Openthai.ai';
    fetch(apiUrl('/api/logistics/meta')).then(r => r.json()).then(d => { if (d.success) setMeta(d); }).catch(() => {});
  }, []);

  const search = useCallback(() => {
    const p = new URLSearchParams();
    if (zone) p.set('zone', zone);
    if (vehicle) p.set('vehicle', vehicle);
    if (cod) p.set('cod', '1');
    if (refrigerated) p.set('refrigerated', '1');
    if (q.trim()) p.set('q', q.trim());
    fetch(apiUrl(`/api/logistics/carriers?${p.toString()}`)).then(r => r.json()).then(d => { if (d.success) setList(d.carriers); }).catch(() => setList([]));
  }, [zone, vehicle, cod, refrigerated, q]);
  useEffect(() => { search(); }, [search]);

  const vLabel = (id) => meta.vehicles.find(v => v.id === id)?.label || id;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/delivery')} style={navBtn}>📦 ส่งพัสดุ</button>
        <button onClick={() => navigate('/carrier')} style={navBtn}>🚚 เป็นผู้จัดส่ง</button>
      </nav>

      <section style={{ textAlign: 'center', padding: '44px 5% 16px' }}>
        <div style={badge}>🔎 ไดเรกทอรีผู้จัดส่ง</div>
        <h1 style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 900, margin: '12px 0 8px' }}>หาผู้จัดส่งตามโซน + ยานพาหนะ</h1>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>ผู้จัดส่งที่ยืนยันตัวตนแล้ว พร้อมรับงานในพื้นที่ของคุณ</p>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ ...card, marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
            <select style={inp} value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">📍 ทุกโซน</option>
              {meta.zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select style={inp} value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
              <option value="">🚗 ทุกยานพาหนะ</option>
              {meta.vehicles.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <input style={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ/จังหวัด" />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={chk}><input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} style={cb} />💵 รับ COD</label>
            <label style={chk}><input type="checkbox" checked={refrigerated} onChange={(e) => setRefrigerated(e.target.checked)} style={cb} />❄️ ห้องเย็น</label>
          </div>
        </div>

        {list === null && <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>กำลังโหลด…</div>}
        {list && list.length === 0 && <div style={{ ...card, textAlign: 'center', padding: 40, color: '#64748b' }}>🔎 ยังไม่มีผู้จัดส่งตรงเงื่อนไข — ลองปรับตัวกรอง หรือ <span onClick={() => navigate('/delivery')} style={{ color: '#a5b4fc', cursor: 'pointer' }}>จองงานจัดส่งเลย</span></div>}
        {list && list.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>พบ {list.length} ผู้จัดส่ง</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {list.map((c) => (
                <div key={c.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{c.business_name || c.contact_name}</div>
                    {c.verified && <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700 }}>✔ ยืนยันแล้ว</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#fbbf24' }}>⭐ {c.rating_avg || 0} ({c.rating_count || 0}) · งานสำเร็จ {c.jobs_done || 0}</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>🚗 {(c.vehicles || []).map(vLabel).join(', ')}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>📍 {(c.zones || []).join(', ')}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{c.cod_supported ? '💵 COD · ' : ''}{c.express_supported ? '⚡ ด่วน · ' : ''}{c.refrigerated ? '❄️ ห้องเย็น · ' : ''}{c.base_province ? `ฐาน ${c.base_province}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.available ? '#10b981' : '#64748b' }}>{c.available ? '🟢 พร้อมรับงาน' : '⚪ พักรับงาน'}</span>
                    <span style={{ flex: 1 }} />
                    <a href={`tel:${c.phone}`} style={{ ...primaryBtn, padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>☎️ {c.phone}</a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px', color: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const chk = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' };
const cb = { width: 16, height: 16, accentColor: '#6366f1' };
