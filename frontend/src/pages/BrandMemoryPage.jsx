import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const BRAND_KEY = 'openthai_brand';

const TONES = [
  { id: 'casual', label: '😊 เป็นกันเอง', desc: 'พูดคุยสบาย ๆ เหมือนเพื่อน' },
  { id: 'funny',  label: '😂 ตลก/ฮา',    desc: 'สนุกสนาน ดึงดูด' },
  { id: 'pro',    label: '💼 มืออาชีพ',   desc: 'น่าเชื่อถือ จริงจัง' },
  { id: 'cute',   label: '🌸 น่ารัก',     desc: 'อบอุ่น หวานซึ้ง' },
];

const inputSt = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14,
  fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box', outline: 'none',
};
const labelSt = { display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };

export default function BrandMemoryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [brand, setBrand] = useState({
    brandName: '', category: 'ทั่วไป', usp: '', audience: '',
    tone: 'casual', priceRange: '', lang: 'ภาษาไทย', note: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = 'Brand Memory — Openthai.ai';
    try {
      const stored = localStorage.getItem(BRAND_KEY);
      if (stored) setBrand(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const set = (k) => (e) => setBrand((b) => ({ ...b, [k]: e.target.value }));

  const handleSave = () => {
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
      setSaved(true);
      toast.success('🧠 จำข้อมูลแบรนด์แล้ว! AI จะใช้ข้อมูลนี้ทุกครั้ง');
      setTimeout(() => setSaved(false), 3000);
    } catch (_) {
      toast.error('บันทึกไม่สำเร็จ');
    }
  };

  const handleClear = () => {
    localStorage.removeItem(BRAND_KEY);
    setBrand({ brandName: '', category: 'ทั่วไป', usp: '', audience: '', tone: 'casual', priceRange: '', lang: 'ภาษาไทย', note: '' });
    toast.warn('🗑 ล้างข้อมูลแบรนด์แล้ว');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🧠 Brand Memory</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>AI จำข้อมูลแบรนด์ของคุณ — ไม่ต้องพิมพ์ซ้ำ</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={handleClear} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 14px', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
            🗑 ล้างข้อมูล
          </button>
          <button onClick={handleSave} style={{ background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#fe2c55,#6366f1)', border: 'none', borderRadius: 8, padding: '7px 18px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {saved ? '✅ บันทึกแล้ว!' : '💾 บันทึก'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 5% 0' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🧠</div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 10px' }}>
            Brand Memory
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, maxWidth: 480, margin: '0 auto' }}>
            กรอกข้อมูลแบรนด์ครั้งเดียว AI จะจำและใช้ข้อมูลนี้ทุกครั้งที่สร้างคอนเทนต์ ไม่ต้องพิมพ์ซ้ำ
          </p>
        </div>

        {/* Info box */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 32, fontSize: 13, color: '#a5b4fc' }}>
          🔒 ข้อมูลเก็บในเครื่องของคุณเท่านั้น (localStorage) ไม่ได้ส่งไปที่เซิร์ฟเวอร์
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {/* Row 1 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 18 }}>📋 ข้อมูลพื้นฐาน</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelSt}>ชื่อแบรนด์ / ร้านค้า</label>
                <input style={inputSt} placeholder="เช่น ร้านผ้าไหมนุ่น" value={brand.brandName} onChange={set('brandName')} />
              </div>
              <div>
                <label style={labelSt}>หมวดหมู่หลัก</label>
                <select style={{ ...inputSt, cursor: 'pointer' }} value={brand.category} onChange={set('category')}>
                  {['ทั่วไป','OTOP','อาหาร','ความงาม','สิ่งทอ','เครื่องดื่ม','สมุนไพร','เครื่องประดับ','เฟอร์นิเจอร์'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>ราคาสินค้า (โดยทั่วไป)</label>
                <input style={inputSt} placeholder="เช่น ฿200–฿800" value={brand.priceRange} onChange={set('priceRange')} />
              </div>
              <div>
                <label style={labelSt}>ภาษาที่ใช้</label>
                <select style={{ ...inputSt, cursor: 'pointer' }} value={brand.lang} onChange={set('lang')}>
                  {['ภาษาไทย','English','ไทย + อังกฤษ'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* USP + Audience */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 18 }}>🎯 จุดขายและลูกค้า</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelSt}>จุดขายพิเศษ (USP)</label>
                <textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="เช่น วัตถุดิบออร์แกนิก 100%, ทำมือทุกชิ้น, ส่งด่วน 1 วัน"
                  value={brand.usp} onChange={set('usp')} />
              </div>
              <div>
                <label style={labelSt}>กลุ่มลูกค้าหลัก</label>
                <input style={inputSt} placeholder="เช่น แม่บ้าน 30–45 ปี, นักศึกษา, คนรักสุขภาพ"
                  value={brand.audience} onChange={set('audience')} />
              </div>
            </div>
          </div>

          {/* Brand Tone */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 18 }}>🎭 โทนของแบรนด์</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
              {TONES.map(t => (
                <div key={t.id} onClick={() => setBrand(b => ({ ...b, tone: t.id }))}
                  style={{ background: brand.tone === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${brand.tone === t.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all .2s' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{t.label.split(' ')[0]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: brand.tone === t.id ? '#a5b4fc' : '#f8fafc' }}>{t.label.split(' ').slice(1).join(' ')}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra note */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 18 }}>📝 โน้ตเพิ่มเติม</div>
            <textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="ข้อมูลพิเศษที่อยากให้ AI รู้ เช่น สูตรลับ, รางวัลที่ได้รับ, จุดเด่นพิเศษ"
              value={brand.note} onChange={set('note')} />
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <button onClick={handleSave} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 36px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            {saved ? '✅ บันทึกแล้ว!' : '💾 บันทึก Brand Memory'}
          </button>
          <button onClick={() => navigate('/ai-generator')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '13px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
            ⚡ ไป AI Generator
          </button>
        </div>
      </div>
    </div>
  );
}
