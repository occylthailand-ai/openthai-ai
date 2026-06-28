import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES, PROGRAMS } from '../data/affiliatePrograms';

// ── ศูนย์รวมโปรแกรม Affiliate ──────────────────────────────────────────────────
// directory โปรแกรมพันธมิตรทั้งหมด — ค้นหา/กรองหมวด → สมัครได้ทันที
// ปักหมุดลิงก์ /pay ของเรา (เข้าพร้อมเพย์ตรง) ไว้บนสุด

const TIKTOK_URL = 'https://vt.tiktok.com/ZSCB66nhQ/';

export default function AffiliateProgramsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = (searchParams.get('ref') || '').replace(/[^A-Z0-9a-z_-]/g, '').slice(0, 40);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return PROGRAMS.filter(p =>
      (cat === 'all' || p.cat === cat) &&
      (!kw || p.name.toLowerCase().includes(kw) || p.note.toLowerCase().includes(kw))
    );
  }, [q, cat]);

  const payLink = `/pay?amount=1000&label=${encodeURIComponent('แพ็กเกจคอนเทนต์ AI 30 ชิ้น')}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const chip = (active) => ({ padding: '8px 14px', borderRadius: '20px', border: `1px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.15)'}`, background: active ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' });

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/earn')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← ศูนย์รายได้</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🔗 ศูนย์รวมโปรแกรม Affiliate</h1>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

        {/* PINNED — ลิงก์พร้อมเพย์ของเรา */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.5px' }}>⭐ จ่ายเข้าพร้อมเพย์ตรง (ของเรา)</div>
          <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 4px' }}>แพ็กเกจคอนเทนต์ AI ฿1,000 — คอม 20%</div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>โปรแกรมเดียวในนี้ที่จ่ายเข้าพร้อมเพย์ทันทีอัตโนมัติ · ที่เหลือเป็นโปรแกรมต่างชาติ (จ่ายผ่านธนาคาร/PayPal)</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(payLink)} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>📱 ขาย/สั่งซื้อ ฿1,000</button>
            <button onClick={() => navigate('/affiliate')} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>สมัครพันธมิตรเรา</button>
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(254,44,85,0.35)', background: 'rgba(254,44,85,0.12)', color: '#fda4af', fontWeight: 700, textDecoration: 'none' }}>🎬 คลิป TikTok</a>
          </div>
        </div>

        {/* Search + filter */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 ค้นหาโปรแกรม เช่น Amazon, email, hosting…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '15px', outline: 'none', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '20px' }}>
          <button onClick={() => setCat('all')} style={chip(cat === 'all')}>ทั้งหมด ({PROGRAMS.length})</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={chip(cat === c.id)}>{c.label}</button>
          ))}
        </div>

        {cat !== 'all' && (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>{CATEGORIES.find(c => c.id === cat)?.note}</div>
        )}

        {/* Programs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {filtered.map((p) => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: '#fff', background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.hot ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>{p.name}</span>
                {p.hot && <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '10px' }}>HOT</span>}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 12px' }}>{p.note}</div>
              <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700 }}>สมัคร →</div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>ไม่พบโปรแกรมที่ค้นหา</div>}

        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '24px', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          ⚠️ ตรงไปตรงมา: นี่คือ <strong style={{ color: '#cbd5e1' }}>directory ให้สมัครง่าย</strong> — รายได้จริงเกิดเมื่อคุณสมัครแล้วเอาลิงก์ไปแชร์ให้คนซื้อ ระบบนี้ไม่ได้การันตี ฿1,000/วัน และโปรแกรมต่างชาติจ่ายผ่านธนาคาร/PayPal (เฉพาะลิงก์ /pay ของเราที่เข้าพร้อมเพย์)
        </div>
      </div>
    </div>
  );
}
