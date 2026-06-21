import React, { useState } from 'react';
import { apiUrl } from '../apiBase';

const PROGRAMS = [
  { icon: '📈', name: 'Trend Product Hunter', desc: 'AI บอกว่าตอนนี้ควรขายอะไร', status: 'live' },
  { icon: '🎯', name: 'Customer Finder', desc: 'AI หากลุ่มลูกค้าที่ใช่ให้ทันที', status: 'live' },
  { icon: '🌍', name: 'Global Safe Connect', desc: 'เชื่อมตลาดต่างประเทศอย่างปลอดภัย', status: 'live' },
  { icon: '💡', name: 'Hope — เส้นทางรายได้', desc: 'AI แนะนำเส้นทางทำมาหากินที่เหมาะกับคุณ', status: 'live' },
  { icon: '🧾', name: 'Tax Calculator', desc: 'คำนวณภาษีส่งออกข้ามประเทศ 12 ประเทศ', status: 'live' },
  { icon: '🎬', name: 'Video Generator', desc: 'สร้าง Script + Storyboard วิดีโอสินค้าอัตโนมัติ', status: 'live' },
  { icon: '⚡', name: 'AI Content Generator', desc: 'Hook · Script · Caption · Hashtag ใน 10 วินาที', status: 'live' },
  { icon: '🔍', name: 'AI Critic', desc: 'วิเคราะห์คอนเทนต์ให้คะแนน 0–10 พร้อมคำแนะนำ', status: 'live' },
  { icon: '🎙️', name: 'Voice Command', desc: 'สั่งงาน AI ด้วยเสียง ไม่ต้องพิมพ์', status: 'live' },
];

const COMPARE = [
  {
    them: 'TikTok Shop / Shopee',
    us: 'OpenThai.ai',
    rows: [
      { label: 'บทบาท', them: 'ตลาด — คุณอยู่ในพื้นที่ของเขา', us: 'ทีมงานของคุณ — ช่วยคุณขายทุกแพลตฟอร์ม' },
      { label: 'ข้อมูลลูกค้า', them: 'เป็นของแพลตฟอร์ม', us: 'เป็นของคุณ 100%' },
      { label: 'กฎระเบียบ', them: 'ต้องทำตามกฎของเขา', us: 'คุณกำหนดเอง' },
      { label: 'AI Tools', them: 'มีบ้าง แต่จำกัด', us: '9 โปรแกรม AI พร้อมใช้' },
      { label: 'ภาษา', them: 'ไทย/อังกฤษ', us: 'ไทย · จีน · อังกฤษ' },
    ],
  },
];

const ROLES = [
  'พ่อค้าแม่ค้าออนไลน์',
  'เจ้าของสินค้า OTOP',
  'Content Creator / Influencer',
  'เจ้าของธุรกิจ SME',
  'นักการตลาด / Affiliate',
  'ผู้สนใจทั่วไป',
];

const PLANS = [
  {
    name: 'Early Bird',
    price: 'ฟรี',
    sub: 'ตลอดช่วง Early Access',
    color: '#10b981',
    features: [
      'เข้าถึงทุกโปรแกรม 9 ตัว',
      'ทดลองใช้ไม่จำกัดครั้ง',
      'ไม่ต้องใส่บัตรเครดิต',
      'รับสิทธิ์ราคาพิเศษก่อนใคร',
      'ร่วมกำหนดทิศทาง platform',
    ],
    cta: 'ลงทะเบียนตอนนี้',
    highlight: true,
  },
  {
    name: 'Pro (เร็ว ๆ นี้)',
    price: '฿149',
    sub: '/เดือน',
    color: '#6366f1',
    features: [
      'ทุกอย่างใน Early Bird',
      'ไม่จำกัดปริมาณการใช้งาน',
      'ทุกแพลตฟอร์ม 241+',
      'ประวัติ 30 วัน',
      'Priority Support',
    ],
    cta: 'Early Bird ได้ก่อน',
    highlight: false,
  },
  {
    name: 'Business (เร็ว ๆ นี้)',
    price: '฿299',
    sub: '/เดือน',
    color: '#f59e0b',
    features: [
      'ทุกอย่างใน Pro',
      'ทีม 5 คน',
      'API Access',
      'White-label',
      'Dedicated Manager',
    ],
    cta: 'Early Bird ได้ก่อน',
    highlight: false,
  },
];

export default function EarlyAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', line_id: '' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) return;
    setStatus('loading');
    try {
      const r = await fetch(apiUrl('/api/early-access/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาด');
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const S = {
    page: { minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" },
    nav: { background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
    badge: { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600 },
    section: { padding: '70px 5%', maxWidth: 960, margin: '0 auto' },
    h2: { fontSize: 28, fontWeight: 800, marginBottom: 8 },
    sub: { fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40 },
    card: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 },
    label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 },
    input: { width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none', marginTop: 8 },
  };

  return (
    <div style={S.page}>

      {/* Nav */}
      <nav style={S.nav}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#6366f1,#10b981)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>O</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>OpenThai.ai</span>
        </a>
        <span style={S.badge}>🎯 Early Access</span>
      </nav>

      {/* Hero */}
      <div style={{ padding: '80px 5% 50px', maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#6ee7b7', fontWeight: 600, marginBottom: 24 }}>
          ✅ ระบบใช้งานได้จริง — ไม่ใช่ Demo
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20 }}>
          AI ที่ช่วยให้คนไทย<br />
          <span style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ขายสินค้าได้ทั่วโลก</span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 36px' }}>
          ไม่ว่าคุณจะขายของบน TikTok, Shopee, หรือตลาดต่างประเทศ — OpenThai.ai คือทีมงาน AI ของคุณ ที่ช่วยตั้งแต่ "ไม่รู้จะขายอะไร" ไปจนถึง "ขายได้ทั่วโลก"
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="#register" style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            ลงทะเบียนใช้ฟรีเลย →
          </a>
          <a href="#programs" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#f1f5f9', padding: '14px 28px', borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            ดู 9 โปรแกรม
          </a>
        </div>
        <p style={{ fontSize: 13, color: '#475569' }}>ใช้ฟรีตลอดช่วง Early Access · ไม่ต้องใส่บัตรเครดิต</p>
      </div>

      {/* Proof strip */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 5%' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
          {[['9', 'AI Programs พร้อมใช้'], ['3', 'ภาษา TH·ZH·EN'], ['12', 'ประเทศในระบบ Tax'], ['24/7', 'ระบบทำงาน']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#a5b4fc' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programs */}
      <div id="programs" style={S.section}>
        <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#6ee7b7', fontWeight: 600, marginBottom: 16 }}>
          ใช้งานได้จริงทั้งหมด
        </div>
        <h2 style={S.h2}>9 โปรแกรม AI ที่สร้างมาเพื่อคุณ</h2>
        <p style={S.sub}>แต่ละโปรแกรมตอบปัญหาจริงที่พ่อค้าแม่ค้าไทยเจออยู่ทุกวัน</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {PROGRAMS.map(p => (
            <div key={p.name} style={{ ...S.card, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{p.icon}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{p.name}</span>
                  <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>LIVE</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* vs Shopee/TikTok */}
      <div style={{ background: '#0f172a', padding: '70px 5%' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ ...S.h2, textAlign: 'center' }}>ต่างจาก TikTok Shop และ Shopee อย่างไร?</h2>
          <p style={{ ...S.sub, textAlign: 'center' }}>พวกเขาคือบ้านเช่า เราคือทีมงานส่วนตัวของคุณ</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>เรื่อง</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>TikTok Shop / Shopee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#a5b4fc', fontWeight: 700, borderBottom: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.05)' }}>OpenThai.ai</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE[0].rows.map(r => (
                  <tr key={r.label}>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.label}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.them}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#a5b4fc', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(99,102,241,0.04)' }}>{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={S.section}>
        <h2 style={{ ...S.h2, textAlign: 'center' }}>ราคาและแผนการใช้งาน</h2>
        <p style={{ ...S.sub, textAlign: 'center' }}>ตอนนี้ใช้ฟรี — ลงทะเบียน Early Access เพื่อรักษาสิทธิ์ราคาพิเศษก่อนใคร</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              ...S.card,
              padding: '24px',
              border: plan.highlight ? `2px solid ${plan.color}` : '1px solid rgba(255,255,255,0.08)',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', borderRadius: 12, padding: '3px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  เปิดให้ใช้ตอนนี้
                </div>
              )}
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: plan.color }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{plan.sub}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={plan.highlight ? '#register' : '#register'} style={{
                display: 'block', textAlign: 'center', padding: '11px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                background: plan.highlight ? plan.color : 'transparent',
                border: plan.highlight ? 'none' : `1px solid ${plan.color}`,
                color: plan.highlight ? '#fff' : plan.color,
                textDecoration: 'none',
              }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Register Form */}
      <div id="register" style={{ background: '#0f172a', padding: '70px 5%' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ ...S.h2, textAlign: 'center' }}>ลงทะเบียน Early Access</h2>
          <p style={{ ...S.sub, textAlign: 'center' }}>ใช้ฟรีทันที · รับสิทธิ์ราคาพิเศษก่อนใคร · ร่วมกำหนดทิศทาง platform</p>

          {status === 'success' ? (
            <div style={{ ...S.card, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>ลงทะเบียนสำเร็จ!</div>
              <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>
                ยินดีต้อนรับสู่ OpenThai.ai<br />
                ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง
              </p>
              <a href="/ai-tools" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                เริ่มใช้งาน 9 โปรแกรม →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ ...S.card, padding: '32px' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={S.label}>ชื่อ-นามสกุล *</label>
                  <input style={S.input} placeholder="เช่น สมชาย ใจดี" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={S.label}>อีเมล *</label>
                  <input style={S.input} type="email" placeholder="example@gmail.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label style={S.label}>เบอร์โทรศัพท์ (ไม่บังคับ)</label>
                  <input style={S.input} type="tel" placeholder="08x-xxx-xxxx" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>LINE ID (ไม่บังคับ)</label>
                  <input style={S.input} placeholder="@yourlineid" value={form.line_id}
                    onChange={e => setForm(f => ({ ...f, line_id: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>คุณเป็น... *</label>
                  <select style={{ ...S.input, cursor: 'pointer' }} value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
                    <option value="">เลือกบทบาทของคุณ</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {status === 'error' && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginTop: 16 }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={status === 'loading'} style={{
                ...S.btn,
                background: status === 'loading' ? '#334155' : 'linear-gradient(90deg,#6366f1,#10b981)',
                color: '#fff',
                opacity: status === 'loading' ? 0.7 : 1,
              }}>
                {status === 'loading' ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนฟรี — เริ่มใช้งานได้เลย'}
              </button>
              <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 12 }}>
                ไม่มีค่าใช้จ่าย · ไม่ต้องใส่บัตรเครดิต · ยกเลิกได้ทุกเมื่อ
              </p>
            </form>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div style={S.section}>
        <h2 style={{ ...S.h2, textAlign: 'center' }}>คำถามที่พบบ่อย</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, margin: '32px auto 0' }}>
          {[
            ['ระบบใช้งานได้จริงไหม?', 'ใช้ได้จริงทั้ง 9 โปรแกรม ผ่าน Claude AI ของ Anthropic — ไม่ใช่ mock หรือ demo ระบบ Payment รองรับ PromptPay และบัตรเครดิต'],
            ['Early Access ใช้ฟรีได้นานแค่ไหน?', 'ตลอดช่วง Early Access — ประมาณ Q3-Q4 2026 ผู้ที่ลงทะเบียนในช่วงนี้ได้รับสิทธิ์ราคาพิเศษตลอดอายุบัญชี'],
            ['ต่างจาก TikTok Shop ยังไง?', 'TikTok Shop คือตลาด — คุณขายในพื้นที่ของเขา เราคือทีมงาน AI ของคุณ ที่ช่วยคุณขายได้ดีขึ้นในทุกแพลตฟอร์ม ข้อมูลลูกค้าเป็นของคุณ'],
            ['รองรับภาษาอะไรบ้าง?', 'ไทย · จีน (Simplified + Traditional) · อังกฤษ — ทุกโปรแกรมรองรับ 3 ภาษา'],
            ['มี Affiliate Program ไหม?', 'มี — ลงทะเบียน Early Access แล้วรับ link พิเศษ แชร์ให้เพื่อนได้คอมมิชชั่น ค่าตอบแทนโปร่งใส ชัดเจน ไม่มีเงื่อนไขซับซ้อน'],
          ].map(([q, a]) => (
            <div key={q} style={{ ...S.card, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>Q: {q}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>A: {a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ textAlign: 'center', padding: '60px 5%', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>พร้อมเริ่มต้นแล้วใช่ไหม?</h2>
        <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 28 }}>ลงทะเบียนฟรี เริ่มใช้ 9 โปรแกรม AI ได้เลยทันที</p>
        <a href="#register" style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)', color: '#fff', padding: '14px 36px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
          ลงทะเบียน Early Access →
        </a>
        <p style={{ fontSize: 12, color: '#334155', marginTop: 16 }}>© 2026 OpenThai.ai · ไม่มีค่าใช้จ่ายซ่อนเร้น · ค่าตอบแทนโปร่งใส</p>
      </div>

    </div>
  );
}
