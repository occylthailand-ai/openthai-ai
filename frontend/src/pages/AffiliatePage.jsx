import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

// ── Tier config ─────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'starter',
    name: '🌱 Starter',
    commission: '20%',
    minSales: '0',
    maxSales: '9',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    perks: ['ลิงก์ Affiliate ส่วนตัว', 'Dashboard ติดตามยอด', 'คอมมิชชั่น 20%'],
  },
  {
    id: 'pro',
    name: '⚡ Pro',
    commission: '30%',
    minSales: '10',
    maxSales: '49',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.4)',
    perks: ['ทุกอย่างใน Starter', 'คอมมิชชั่น 30%', 'โบนัสพิเศษรายเดือน', 'Priority Support'],
    recommended: true,
  },
  {
    id: 'elite',
    name: '👑 Elite',
    commission: '40%',
    minSales: '50',
    maxSales: '∞',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.4)',
    perks: ['ทุกอย่างใน Pro', 'คอมมิชชั่น 40%', 'Revenue Share รายได้เพิ่ม', 'Co-marketing พิเศษ', 'Dedicated Manager'],
  },
];

const STEPS = [
  { icon: '📝', title: 'สมัครฟรี', desc: 'กรอกข้อมูลด้านล่าง ไม่มีค่าใช้จ่าย' },
  { icon: '🔗', title: 'รับลิงก์พิเศษ', desc: 'ได้รับลิงก์ Affiliate ส่วนตัวทันที' },
  { icon: '📢', title: 'แชร์ให้เพื่อน', desc: 'แชร์ผ่าน TikTok, IG, Facebook ได้เลย' },
  { icon: '💰', title: 'รับคอมมิชชั่น', desc: 'ทุกการสมัครผ่านลิงก์คุณ = เงินเข้ากระเป๋า' },
];

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Twitter/X', 'LINE', 'Discord', 'อื่น ๆ'];
const FOLLOWERS = ['น้อยกว่า 1,000', '1,000 – 10,000', '10,000 – 50,000', '50,000 – 100,000', 'มากกว่า 100,000'];

// ── Utils ─────────────────────────────────────────────────────────────────────
function genRefCode(name) {
  const clean = (name || 'affiliate').replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${clean}${rnd}`;
}

// ── Copy hook ─────────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AffiliatePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { copied, copy } = useCopy();

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    platform: 'TikTok', followers: '1,000 – 10,000',
    channel_url: '', note: '',
  });
  const [step, setStep] = useState('form'); // form | success
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [refLink, setRefLink] = useState('');
  const [error, setError] = useState('');
  const [activeTier, setActiveTier] = useState('pro');
  const [calc, setCalc] = useState({ sales: 10, price: 299 });

  const commission = calc.sales * calc.price * 0.3;
  const refUrl = `https://openthai-ai.vercel.app/?ref=${refCode}`;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError('กรุณากรอกชื่อและอีเมล');
      toast.error('กรุณากรอกชื่อและอีเมลก่อนสมัคร');
      return;
    }
    setLoading(true); setError('');
    try {
      const code = genRefCode(form.name);
      const link = `https://www.openthai-ai.com/?ref=${code}`;
      try {
        const res = await fetch('/api/affiliate/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, ref_code: code, ref_link: link }),
        });
        const data = await res.json();
        if (!res.ok && res.status === 409) {
          toast.warn('อีเมลนี้สมัครไว้แล้ว กรุณาเช็ค Dashboard');
        }
      } catch (_) { /* offline – still show success */ }
      setRefCode(code);
      setRefLink(link);
      setStep('success');
      toast.success(`🎉 สมัคร Affiliate สำเร็จ! Ref Code: ${code}`);
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a 0%,#1a0a2e 50%,#0a1a2e 100%)', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← กลับหน้าหลัก</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#94a3b8' }}>💰 Affiliate Hub</span>
      </nav>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <div style={badgeStyle}>🇹🇭 OpenThai AI Affiliate Program</div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,60px)', fontWeight: 900, margin: '16px 0 12px', lineHeight: 1.2 }}>
          แชร์ → ได้เงิน<br />
          <span style={{ background: 'linear-gradient(90deg,#fe2c55,#ff9800,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            คอมมิชชั่นสูงสุด 40%
          </span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 560, margin: '0 auto 32px' }}>
          แชร์ OpenThai AI ให้เพื่อน Creator ไทย — ทุกครั้งที่เขาสมัคร คุณได้เงิน ไม่ต้องลงทุนอะไรเลย
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['1,200+', 'Creator ใช้แล้ว'], ['3x', 'คอนเทนต์โตไว'], ['40%', 'คอมมิชชั่นสูงสุด'], ['24ชม.', 'จ่ายทุกสัปดาห์']].map(([v, l]) => (
            <div key={l} style={statCard}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fe2c55' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>วิธีเริ่มต้น 4 ขั้นตอน</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={glassCard}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIERS ── */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>ระดับ Affiliate & คอมมิชชั่น</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
          {TIERS.map((t) => (
            <div key={t.id} onClick={() => setActiveTier(t.id)}
              style={{ ...glassCard, border: `1.5px solid ${activeTier === t.id ? t.border : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', background: activeTier === t.id ? t.bg : 'rgba(255,255,255,0.04)' }}>
              {t.recommended && <div style={recommendedBadge}>แนะนำ ⭐</div>}
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: t.color }}>{t.name}</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: t.color, lineHeight: 1.1 }}>{t.commission}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>ยอดขาย {t.minSales}–{t.maxSales} ออเดอร์/เดือน</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {t.perks.map((p) => (
                  <li key={p} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 6 }}>
                    <span style={{ color: t.color }}>✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CALCULATOR ── */}
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>คำนวณรายได้ของคุณ 💸</SectionTitle>
        <div style={{ ...glassCard, background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <label style={labelStyle}>
              จำนวนยอดขาย/เดือน
              <input type="range" min={1} max={200} value={calc.sales}
                onChange={(e) => setCalc((c) => ({ ...c, sales: +e.target.value }))}
                style={{ width: '100%', marginTop: 8 }} />
              <span style={{ color: '#6366f1', fontWeight: 700 }}>{calc.sales} ออเดอร์</span>
            </label>
            <label style={labelStyle}>
              ราคาแพ็กเกจ (บาท)
              <input type="range" min={99} max={999} step={100} value={calc.price}
                onChange={(e) => setCalc((c) => ({ ...c, price: +e.target.value }))}
                style={{ width: '100%', marginTop: 8 }} />
              <span style={{ color: '#6366f1', fontWeight: 700 }}>฿{calc.price}</span>
            </label>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>รายได้โดยประมาณต่อเดือน (Pro 30%)</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#10b981' }}>
              ฿{commission.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {calc.sales} ออเดอร์ × ฿{calc.price} × 30% = ฿{commission.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKETING KIT ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>📦 Marketing Kit — ใช้ฟรีทันที</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {[
            { icon: '📱', title: 'สคริปต์ TikTok', desc: '10 สคริปต์พร้อมใช้', action: 'ดาวน์โหลด' },
            { icon: '🖼️', title: 'ภาพโปรโมต', desc: 'IG Post + Story + FB', action: 'ดาวน์โหลด' },
            { icon: '✉️', title: 'Email Template', desc: 'HTML Email สำเร็จรูป', action: 'คัดลอก' },
            { icon: '🎯', title: 'แคปชั่น + แฮชแท็ก', desc: 'พร้อมโพสต์ 30 วัน', action: 'ดาวน์โหลด' },
          ].map((kit) => (
            <div key={kit.title} style={glassCard}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{kit.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{kit.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{kit.desc}</div>
              <button style={smallBtn}>{kit.action} →</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── COPY TEMPLATES ── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>✏️ ข้อความพร้อมแชร์ (คัดลอกได้เลย)</SectionTitle>
        {[
          {
            key: 'tiktok',
            label: '📱 TikTok Caption',
            text: `สร้างคอนเทนต์ TikTok ปัง ๆ ด้วย AI ไทยแท้ ใน 10 วินาที! ⚡\nไม่ต้องคิดสคริปต์ ไม่ต้องเขียนแคปชั่น ไม่ต้องหาแฮชแท็กอีกต่อไป 🔥\nใช้ฟรี 3 ครั้งวันนี้ ไม่ต้องสมัคร!\n👉 openthai-ai.vercel.app\n#OpenThaiAI #AIไทย #TikTokContent #ContentCreator`,
          },
          {
            key: 'fb',
            label: '📘 Facebook Post',
            text: `🚀 AI ไทยแท้ ช่วยสร้างคอนเทนต์ให้ครบเซ็ตใน 10 วินาที!\n✅ สคริปต์ ✅ แคปชั่น ✅ แฮชแท็ก\nคนไทยกว่า 1,200 คนใช้แล้ว คอนเทนต์โตไวขึ้น 3 เท่า 📈\nทดลองใช้ฟรีที่ openthai-ai.vercel.app`,
          },
          {
            key: 'x',
            label: '🐦 Twitter/X',
            text: `AI ไทยแท้ สร้างคอนเทนต์ TikTok ใน 10 วินาที 🤯\nใช้ฟรี 3 ครั้ง ไม่ต้องสมัคร 👇\nopenthai-ai.vercel.app\n#AI #Thailand #ContentCreator`,
          },
        ].map((t) => (
          <div key={t.key} style={{ ...glassCard, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</span>
              <button onClick={() => copy(t.text, t.key)} style={smallBtn}>
                {copied === t.key ? '✅ คัดลอกแล้ว!' : '📋 คัดลอก'}
              </button>
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{t.text}</pre>
          </div>
        ))}
      </section>

      {/* ── FORM / SUCCESS ── */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 80px' }} id="apply">
        <SectionTitle>🚀 สมัคร Affiliate — ฟรี ไม่มีค่าใช้จ่าย</SectionTitle>

        {step === 'form' ? (
          <div style={{ ...glassCard, border: '1.5px solid rgba(99,102,241,0.4)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  ชื่อ-นามสกุล *
                  <input style={inputStyle} placeholder="สมชาย ใจดี" value={form.name} onChange={set('name')} required />
                </label>
                <label style={labelStyle}>
                  อีเมล *
                  <input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  เบอร์โทร
                  <input style={inputStyle} placeholder="0812345678" value={form.phone} onChange={set('phone')} />
                </label>
                <label style={labelStyle}>
                  Platform หลัก
                  <select style={inputStyle} value={form.platform} onChange={set('platform')}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <label style={labelStyle}>
                จำนวน Followers
                <select style={inputStyle} value={form.followers} onChange={set('followers')}>
                  {FOLLOWERS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                ลิงก์ช่องหรือโปรไฟล์ (ถ้ามี)
                <input style={inputStyle} placeholder="https://tiktok.com/@yourhandle" value={form.channel_url} onChange={set('channel_url')} />
              </label>
              <label style={labelStyle}>
                แนะนำตัวสั้น ๆ (ไม่บังคับ)
                <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} placeholder="ทำคอนเทนต์ OTOP มา 3 ปี ..." value={form.note} onChange={set('note')} />
              </label>
              {error && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
              <button type="submit" disabled={loading} style={submitBtn}>
                {loading ? '⏳ กำลังสมัคร...' : '💰 สมัคร Affiliate ฟรี — เริ่มได้ทันที!'}
              </button>
              <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>
                ✅ ฟรี 100% • ไม่มีค่าธรรมเนียม • ยกเลิกได้ทุกเมื่อ
              </p>
            </form>
          </div>
        ) : (
          // ── SUCCESS CARD ──
          <div style={{ ...glassCard, border: '1.5px solid rgba(16,185,129,0.5)', textAlign: 'center', background: 'rgba(16,185,129,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#10b981' }}>ยินดีด้วย! คุณเป็น Affiliate แล้ว</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>รหัสและลิงก์ Affiliate ส่วนตัวของคุณ:</p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>REF CODE</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, color: '#10b981' }}>{refCode}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>AFFILIATE LINK</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', wordBreak: 'break-all', marginBottom: 10 }}>{refLink}</div>
              <button onClick={() => copy(refLink, 'reflink')} style={submitBtn}>
                {copied === 'reflink' ? '✅ คัดลอกแล้ว!' : '📋 คัดลอกลิงก์'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: '🌱 Tier เริ่มต้น', val: 'Starter (20%)' },
                { label: '💸 จ่ายทุก', val: 'จันทร์' },
                { label: '📧 อีเมลยืนยัน', val: 'ส่งแล้ว' },
              ].map((x) => (
                <div key={x.label} style={{ ...glassCard, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{x.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{x.val}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#64748b' }}>📩 ทีมงานจะส่งรายละเอียดเพิ่มเติมไปที่ <strong style={{ color: '#94a3b8' }}>{form.email}</strong></p>
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 80px' }}>
        <SectionTitle>❓ คำถามที่พบบ่อย</SectionTitle>
        {[
          ['สมัครแล้วได้เงินเมื่อไหร่?', 'ยอดค้างชำระจะถูกโอนให้ทุกวันจันทร์ ผ่าน PromptPay หรือ Bank Transfer ขั้นต่ำ ฿100'],
          ['ต้องมีคนตามเท่าไหร่ถึงสมัครได้?', 'ไม่มีขั้นต่ำ! แม้จะเพิ่งเริ่มต้นก็สมัครได้ทันที'],
          ['ลิงก์มีอายุนานแค่ไหน?', 'ลิงก์ Affiliate ของคุณไม่มีวันหมดอายุ ใช้ได้ตลอดไป'],
          ['จ่ายคอมมิชชั่นแบบไหน?', 'จ่ายคอมมิชชั่นจากทุกแพ็กเกจที่ขายผ่านลิงก์ของคุณ รวมถึง Renewal ด้วย'],
          ['ติดตามยอดขายได้ที่ไหน?', 'หลังสมัครสำเร็จ คุณจะได้รับลิงก์ Dashboard ส่วนตัวทางอีเมล'],
        ].map(([q, a], i) => (
          <FAQItem key={i} q={q} a={a} />
        ))}
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{ textAlign: 'center', padding: '40px 24px 60px', background: 'linear-gradient(180deg,transparent,rgba(99,102,241,0.08))' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>พร้อมเริ่มสร้างรายได้แล้วใช่ไหม?</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>สมัครฟรีใน 30 วินาที เริ่มได้ทันที ไม่ต้องรอ</p>
        <a href="#apply" style={{ ...submitBtn, textDecoration: 'none', display: 'inline-block' }}>🚀 สมัคร Affiliate ฟรีตอนนี้เลย</a>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 24, marginTop: 0 }}>
      {children}
    </h2>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...glassCard, marginBottom: 10, cursor: 'pointer', padding: '14px 20px' }} onClick={() => setOpen((o) => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
        {q}
        <span style={{ color: '#6366f1', marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ marginTop: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{a}</div>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 24,
  backdropFilter: 'blur(12px)',
};

const statCard = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '16px 24px',
  textAlign: 'center',
  minWidth: 100,
};

const badgeStyle = {
  display: 'inline-block',
  background: 'linear-gradient(90deg,rgba(254,44,85,0.2),rgba(99,102,241,0.2))',
  border: '1px solid rgba(254,44,85,0.3)',
  borderRadius: 20,
  padding: '6px 18px',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

const recommendedBadge = {
  position: 'absolute',
  top: -12,
  right: 16,
  background: 'linear-gradient(90deg,#6366f1,#fe2c55)',
  borderRadius: 20,
  padding: '4px 14px',
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#94a3b8',
  fontWeight: 600,
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '12px 14px',
  color: '#f8fafc',
  fontSize: 14,
  outline: 'none',
  width: '100%',
};

const submitBtn = {
  background: 'linear-gradient(135deg,#fe2c55,#ff5722,#6366f1)',
  color: '#fff',
  border: 'none',
  borderRadius: 50,
  padding: '16px 28px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
  transition: 'opacity .2s',
  boxShadow: '0 8px 24px rgba(254,44,85,0.3)',
};

const smallBtn = {
  background: 'rgba(99,102,241,0.2)',
  border: '1px solid rgba(99,102,241,0.4)',
  borderRadius: 8,
  padding: '6px 14px',
  color: '#a5b4fc',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const navBtn = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 16px',
  color: '#94a3b8',
  fontSize: 13,
  cursor: 'pointer',
};
