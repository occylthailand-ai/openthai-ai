import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';

const SUBJECTS = [
  'สอบถามเกี่ยวกับบริการ',
  'ปัญหาการใช้งาน',
  'แผน Pro / Business',
  'Affiliate Program',
  'ข้อเสนอความร่วมมือ',
  'รายงาน Bug',
  'อื่นๆ',
];

export default function ContactPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { document.title = 'ติดต่อเรา — Openthai.ai'; }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast.success('✅ ส่งข้อความสำเร็จ! ทีมงานจะตอบกลับใน 1–2 วัน');
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      toast.error('ไม่สามารถเชื่อมต่อ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 14, outline: 'none',
    fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 5%', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>ติดต่อเรา</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Contact — Openthai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 5%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,38px)', fontWeight: 900, margin: '0 0 12px', background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ติดต่อทีมงาน Openthai.ai
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>ตอบกลับภายใน <strong style={{ color: '#10b981' }}>1–2 วันทำการ</strong> · เปิดให้บริการทุกวัน</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32 }}>

          {/* Contact Channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px', color: '#a5b4fc' }}>📡 ช่องทางการติดต่อ</h2>
            {[
              { icon: '📧', label: 'Email', value: 'support@OpenThaiAi.com', href: 'mailto:support@OpenThaiAi.com' },
              { icon: '💰', label: 'Affiliate', value: 'affiliate@OpenThaiAi.com', href: 'mailto:affiliate@OpenThaiAi.com' },
              { icon: '🔒', label: 'PDPA/Privacy', value: 'privacy@OpenThaiAi.com', href: 'mailto:privacy@OpenThaiAi.com' },
              { icon: '🌐', label: 'Website', value: 'www.OpenThaiAi.com', href: 'https://www.OpenThaiAi.com' },
            ].map((c) => (
              <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', transition: 'border-color 0.2s' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600 }}>{c.value}</div>
                </div>
              </a>
            ))}

            {/* Response time */}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 18px', marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: '#34d399', marginBottom: 8, fontSize: 13 }}>⏰ เวลาตอบกลับ</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                📧 Email: ภายใน 24 ชม.<br />
                💼 Business: ภายิน 4 ชม.<br />
                🆘 ปัญหาด่วน: ภายใน 1 ชม.
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: '#34d399', fontWeight: 800, marginBottom: 8 }}>ส่งข้อความสำเร็จ!</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>ทีมงานจะตอบกลับที่อีเมล <strong style={{ color: '#a5b4fc' }}>{form.email}</strong> ภายใน 1–2 วันทำการ</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }); }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '10px 20px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                    ส่งอีกครั้ง
                  </button>
                  <button onClick={() => navigate('/')}
                    style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    🏠 กลับหน้าหลัก
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>ชื่อ <span style={{ color: '#fe2c55' }}>*</span></label>
                    <input style={inputStyle} placeholder="คุณแพร" value={form.name} onChange={set('name')} required />
                  </div>
                  <div>
                    <label style={labelStyle}>อีเมล <span style={{ color: '#fe2c55' }}>*</span></label>
                    <input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>หัวข้อ</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.subject} onChange={set('subject')}>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>ข้อความ <span style={{ color: '#fe2c55' }}>*</span></label>
                  <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }}
                    placeholder="อธิบายปัญหาหรือข้อสอบถามของคุณ..."
                    value={form.message} onChange={set('message')} required />
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#475569', marginTop: 4 }}>
                    {form.message.length}/500
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {loading ? '⏳ กำลังส่ง...' : '📨 ส่งข้อความ'}
                </button>

                <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', margin: 0 }}>
                  โดยการส่งข้อความ คุณยอมรับ{' '}
                  <button type="button" onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                    นโยบายความเป็นส่วนตัว
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
