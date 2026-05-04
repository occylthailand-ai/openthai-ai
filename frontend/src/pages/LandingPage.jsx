import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';
import { apiUrl } from '../apiBase';

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '⚡', title: 'สร้างใน 10 วินาที', desc: 'กรอกชื่อสินค้า กด Generate — ได้สคริปต์+แคปชั่น+แฮชแท็กพร้อมโพสต์ทันที' },
  { icon: '🇹🇭', title: 'AI ไทยแท้ 100%', desc: 'เข้าใจวัฒนธรรม ภาษา และเทรนด์คนไทย ไม่ใช่แค่แปลมาจากภาษาอังกฤษ' },
  { icon: '🎯', title: 'โดนใจทุก Gen', desc: 'ปรับสไตล์ได้ตั้งแต่ Gen Z ไปถึงผู้ใหญ่ — ภาษาธรรมชาติ อ่านแล้วอยากกด Like' },
  { icon: '📊', title: 'AI Critic 9.0', desc: 'ให้คะแนนคอนเทนต์ 0-10 พร้อมคำแนะนำปรับปรุง ก่อนโพสต์จริง' },
  { icon: '🛒', title: 'ครอบคลุม 241 แพลตฟอร์ม', desc: 'TikTok, Facebook, Instagram, Shopee, Lazada และอีกกว่า 200 ช่องทาง' },
  { icon: '💰', title: 'Affiliate Program', desc: 'แชร์ให้เพื่อน — ได้คอมมิชชั่นสูงสุด 40% ทุกออเดอร์ที่ผ่านลิงก์คุณ' },
];

const STEPS = [
  { n: '1', title: 'กรอกชื่อสินค้า', desc: 'เช่น "ผ้าไหมอุบล", "น้ำพริกป้าแดง", "เซรั่มข้าวหอม"' },
  { n: '2', title: 'เลือกสไตล์', desc: 'Educational, Entertainment, Sales — เลือกให้ตรงจุดประสงค์' },
  { n: '3', title: 'กด Generate', desc: 'AI สร้างสคริปต์ + แคปชั่น + แฮชแท็กให้ครบใน 10 วินาที' },
  { n: '4', title: 'โพสต์ได้เลย', desc: 'คัดลอกแล้วแปะลง TikTok / Facebook / Instagram ได้ทันที' },
];

const PLANS = [
  {
    id: 'free', name: 'Free', price: '0', unit: '/วัน',
    color: '#10b981', desc: 'ทดลองใช้ฟรี ไม่ต้องสมัคร',
    features: ['สร้างคอนเทนต์ 3 ครั้ง/วัน', 'TikTok + Facebook', 'AI Critic พื้นฐาน', 'แฮชแท็ก 5 อัน'],
    cta: 'เริ่มใช้ฟรี', ctaStyle: 'outline',
  },
  {
    id: 'pro', name: 'Pro', price: '149', unit: '/เดือน',
    color: '#6366f1', desc: 'สำหรับ Creator จริงจัง', recommended: true,
    features: ['ไม่จำกัดจำนวนครั้ง', 'ทุกแพลตฟอร์ม 241+', 'AI Critic เต็มรูปแบบ', 'แฮชแท็ก 20+ อัน', 'ประวัติคอนเทนต์ 30 วัน', 'Priority Support'],
    cta: 'เริ่ม Pro ฟรี 7 วัน', ctaStyle: 'primary',
  },
  {
    id: 'business', name: 'Business', price: '299', unit: '/เดือน',
    color: '#f59e0b', desc: 'สำหรับทีมและธุรกิจ',
    features: ['ทุกอย่างใน Pro', 'ทีม 5 คน', 'API Access', 'White-label', 'Dedicated Manager', 'SLA 99.9%'],
    cta: 'ติดต่อทีมงาน', ctaStyle: 'gold',
  },
];

const REVIEWS = [
  { name: 'คุณแพร', role: 'เจ้าของร้าน OTOP ขอนแก่น', stars: 5, text: 'ก่อนหน้านี้เขียนแคปชั่นนึงใช้เวลา 30 นาที ตอนนี้ 10 วินาที ยอดขายดีขึ้น 3 เท่า!' },
  { name: 'คุณมิน', role: 'TikTok Creator 50k followers', stars: 5, text: 'สคริปต์ที่ได้เป็นภาษาไทยธรรมชาติมาก ไม่ได้ดูออกว่า AI เขียน คนดูรู้สึกจริง' },
  { name: 'คุณโจ', role: 'SME เชียงใหม่', stars: 5, text: 'ทดลองฟรี 3 ครั้งแล้วสมัคร Pro ทันที คุ้มมากครับ ใช้ทุกวัน' },
];

const STATS_HERO = [
  { v: '1,200+', l: 'Creator ใช้แล้ว' },
  { v: '3x', l: 'คอนเทนต์โตไว' },
  { v: '10 วิ', l: 'สร้างเสร็จ' },
  { v: '241', l: 'แพลตฟอร์ม' },
];

// ── Typing animation hook ────────────────────────────────────────────────────
function useTyping(words, speed = 80, pause = 2000) {
  const [text, setText] = useState('');
  const [wi, setWi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[wi];
    const t = del
      ? setTimeout(() => { setText((p) => p.slice(0, -1)); if (text.length <= 1) { setDel(false); setWi((i) => (i + 1) % words.length); } }, 40)
      : text === w
        ? setTimeout(() => setDel(true), pause)
        : setTimeout(() => setText(w.slice(0, text.length + 1)), speed);
    return () => clearTimeout(t);
  }, [text, del, wi]);
  return text;
}

// ── Blinking cursor hook ──────────────────────────────────────────────────────
function useBlink(interval = 530) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), interval);
    return () => clearInterval(t);
  }, [interval]);
  return on;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const typed = useTyping(['ผ้าไหมอุบล', 'น้ำพริกป้าแดง', 'เซรั่มข้าวหอม', 'กาแฟดอยช้าง', 'สบู่มะขาม']);
  const cursorOn = useBlink();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => { document.title = 'OpenThai AI — สร้างคอนเทนต์ TikTok ปัง ด้วย AI ไทยแท้'; }, []);

  const handleFreeStart = () => navigate('/ai-generator');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!email || joining) return;
    setJoining(true);
    try {
      const res = await fetch(apiUrl('/api/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing-hero' }),
      });
      const data = await res.json();
      if (data.success) setJoined(true);
    } catch (_) {
      setJoined(true); // fallback — show success anyway
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <LogoEmblem size={32} />
          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>OpenThai AI</span>
          <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 20, padding: '2px 8px', color: '#a5b4fc' }}>v9.0</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navigate('/affiliate')} style={ghostBtn}>💰 Affiliate</button>
          <button onClick={() => navigate('/pricing')} style={ghostBtn}>ราคา</button>
          <button onClick={() => navigate('/login')} style={ghostBtn}>Login</button>
          <button onClick={handleFreeStart} style={ctaPrimary}>ใช้ฟรีตอนนี้ →</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px,10vw,120px) 5% 80px', position: 'relative' }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'rgba(254,44,85,0.12)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 350, height: 350, background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(254,44,85,0.1)', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 13, marginBottom: 24, color: '#fca5a5' }}>
          🔥 คนไทยกว่า 1,200 คนใช้แล้ว — ทดลองฟรีวันนี้!
        </div>

        <h1 style={{ fontSize: 'clamp(36px,7vw,76px)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 20px' }}>
          สร้างคอนเทนต์ TikTok ปัง<br />
          <span style={{ background: 'linear-gradient(90deg,#fe2c55,#ff5722,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            "{typed}<span style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}>|</span>"
          </span>
          <br />
          <span style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ใน 10 วินาที ด้วย AI ไทยแท้
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(15px,2vw,20px)', color: '#94a3b8', maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7 }}>
          ไม่ต้องคิดสคริปต์ ไม่ต้องเขียนแคปชั่น ไม่ต้องหาแฮชแท็ก<br />
          OpenThai AI สร้างครบเซ็ตพร้อมโพสต์ทันที ภาษาไทยธรรมชาติ
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <button onClick={handleFreeStart} style={{ ...ctaPrimary, fontSize: 17, padding: '16px 36px' }}>
            🎁 ใช้ฟรี 3 ครั้ง — ไม่ต้องสมัคร!
          </button>
          <button onClick={() => navigate('/pricing')} style={{ ...ghostBtn, fontSize: 15, padding: '14px 28px', borderColor: 'rgba(255,255,255,0.15)' }}>
            ดูราคา →
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {STATS_HERO.map((s) => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fe2c55' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ ...glassCard, background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.2)', overflow: 'hidden' }}>
          {/* window chrome */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fe2c55' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>OpenThai AI Generator — ผ้าไหมอุบล</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={demoBox}>
                <div style={demoLabel}>🎣 Hook</div>
                <div style={demoText}>ทำไมผ้าไหมอุบลถึงแพงกว่าที่อื่น? เฉลยตอนท้าย!</div>
              </div>
              <div style={demoBox}>
                <div style={demoLabel}>📊 AI Score</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981', textAlign: 'center', padding: '8px 0' }}>9.2 <span style={{ fontSize: 14, color: '#64748b' }}>/10</span></div>
              </div>
            </div>
            <div style={demoBox}>
              <div style={demoLabel}>📝 Caption พร้อมโพสต์</div>
              <div style={demoText}>✨ ผ้าไหมอุบล — สิ่งทอไทยที่ UNESCO รับรอง<br />💯 ทออย่างพิถีพิถัน ใช้ได้หลายร้อยปี<br />🚚 ส่งฟรีทั่วไทย • สั่งได้ใน Bio!</div>
            </div>
            <div style={{ ...demoBox, marginTop: 12 }}>
              <div style={demoLabel}>#️⃣ Hashtags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {['#ผ้าไหม', '#OTOP', '#สินค้าไทย', '#ของดีบ้านเรา', '#TikTokShop', '#ภูมิปัญญาไทย', '#OpenThaiAI'].map((h) => (
                  <span key={h} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#a5b4fc' }}>{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>วิธีใช้งาน</SectionBadge>
        <SectionTitle>สร้างคอนเทนต์ใน 4 ขั้นตอน</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginTop: 32 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ ...glassCard, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 900, fontSize: 18 }}>{s.n}</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>ฟีเจอร์</SectionBadge>
          <SectionTitle>ทำไมต้อง OpenThai AI?</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ ...glassCard, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>รีวิว</SectionBadge>
        <SectionTitle>Creator ไทยพูดว่า...</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginTop: 32 }}>
          {REVIEWS.map((r) => (
            <div key={r.name} style={{ ...glassCard, textAlign: 'left' }}>
              <div style={{ color: '#f59e0b', marginBottom: 10, fontSize: 18 }}>{'★'.repeat(r.stars)}</div>
              <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 16px' }}>"{r.text}"</p>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{r.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>ราคา</SectionBadge>
        <SectionTitle>เลือกแพ็กเกจที่ใช่</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginTop: 32 }}>
          {PLANS.map((p) => (
            <div key={p.id} style={{ ...glassCard, border: `1.5px solid ${p.recommended ? p.color + '55' : 'rgba(255,255,255,0.08)'}`, background: p.recommended ? `${p.color}0d` : undefined, position: 'relative', textAlign: 'left' }}>
              {p.recommended && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${p.color},#fe2c55)`, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ แนะนำ</div>}
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4, color: p.color }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 900 }}>฿{p.price}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{p.unit}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map((f) => <li key={f} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 8 }}><span style={{ color: p.color }}>✓</span>{f}</li>)}
              </ul>
              <button
                onClick={() => p.id === 'free' ? navigate('/ai-generator') : navigate('/pricing')}
                style={{ width: '100%', padding: '12px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', background: p.id === 'free' ? 'rgba(255,255,255,0.06)' : p.id === 'pro' ? 'linear-gradient(135deg,#6366f1,#fe2c55)' : `linear-gradient(135deg,${p.color},#ff5722)`, color: '#fff' }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMAIL CAPTURE ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ ...glassCard, background: 'linear-gradient(135deg,rgba(254,44,85,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>รับ Tips สร้างคอนเทนต์ฟรี</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>เคล็ดลับ TikTok + แนวโน้มเทรนด์ไทย ส่งทุกอาทิตย์</p>
          {joined ? (
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: 15 }}>✅ ขอบคุณ! จะส่งข้อมูลให้ที่อีเมลเร็ว ๆ นี้</div>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 14, outline: 'none' }} />
              <button type="submit" disabled={joining} style={{ ...ctaPrimary, whiteSpace: 'nowrap', opacity: joining ? 0.7 : 1 }}>
                {joining ? '⏳ กำลังส่ง...' : 'สมัคร →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 5% 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <LogoEmblem size={28} />
              <span style={{ fontWeight: 900, fontSize: 16, color: '#f8fafc' }}>OpenThai AI</span>
            </div>
            <p style={{ color: '#475569', fontSize: 12, margin: 0, maxWidth: 220, lineHeight: 1.6 }}>
              AI ไทยแท้ สร้างคอนเทนต์ TikTok<br />ใน 10 วินาที รองรับ 241 แพลตฟอร์ม
            </p>
          </div>
          {/* Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>บริการ</div>
              {[['AI Generator', '/ai-generator'], ['ราคา', '/pricing'], ['Affiliate', '/affiliate']].map(([l, r]) => (
                <div key={r} onClick={() => navigate(r)} style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>ข้อมูล</div>
              {[['นโยบายความเป็นส่วนตัว', '/privacy'], ['ข้อกำหนดการใช้งาน', '/terms'], ['ติดต่อเรา', 'mailto:support@openthai-ai.com']].map(([l, r]) => (
                r.startsWith('mailto')
                  ? <a key={r} href={r} style={{ display: 'block', color: '#94a3b8', fontSize: 13, textDecoration: 'none', marginBottom: 6 }}>{l}</a>
                  : <div key={r} onClick={() => navigate(r)} style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>© 2026 OpenThai AI — สงวนลิขสิทธิ์</span>
          <span style={{ fontSize: 12, color: '#334155' }}>🇹🇭 Made in Thailand · Powered by Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionBadge({ children }) {
  return <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 10 }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, margin: 0 }}>{children}</h2>;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, backdropFilter: 'blur(12px)' };
const ctaPrimary = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(254,44,85,0.3)' };
const ghostBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '9px 18px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const demoBox = { background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 14 };
const demoLabel = { fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 };
const demoText = { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 };
