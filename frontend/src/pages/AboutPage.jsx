import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';

// ── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, duration = 1600) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 60;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return count;
}

const TIMELINE = [
  { year: '2023', title: 'เริ่มต้น', desc: 'ทีมผู้ก่อตั้งเล็งเห็นว่า Creator ไทยขาดเครื่องมือ AI ที่เข้าใจวัฒนธรรมและภาษาไทยอย่างแท้จริง' },
  { year: '2024 Q1', title: 'เปิดตัว Beta', desc: 'เปิดทดสอบกับ Creator 50 คน ผลตอบรับดีเยี่ยม ยอดขายสินค้าเพิ่มขึ้นเฉลี่ย 3 เท่า' },
  { year: '2024 Q3', title: 'ขยายฐานผู้ใช้', desc: 'ผ่านเครื่องหมาย 1,000 Creator บนแพลตฟอร์ม เพิ่มระบบ Affiliate และตลาดสินค้า OTOP' },
  { year: '2025', title: 'รองรับ 241 แพลตฟอร์ม', desc: 'ขยายจาก TikTok ไปถึง 241 แพลตฟอร์มทั่วโลก พร้อมระบบองค์กรและ API สำหรับธุรกิจ' },
  { year: '2026+', title: 'ก้าวต่อไป', desc: 'ขยายสู่ตลาด ASEAN — นำสินค้าไทยสู่ครีเอเตอร์ในอินโดนีเซีย, เวียดนาม, และมาเลเซีย' },
];

const VALUES = [
  { icon: '🇹🇭', title: 'ไทยแท้ 100%', desc: 'ออกแบบมาเพื่อคนไทยโดยเฉพาะ เข้าใจวัฒนธรรม ภาษา และเทรนด์ที่คนไทยสนใจ ไม่ใช่แค่แปลจากต่างประเทศ' },
  { icon: '⚡', title: 'ความเร็วคือกุญแจ', desc: 'คอนเทนต์ที่ดีต้องสร้างได้เร็ว เราเชื่อว่า 10 วินาทีคือมาตรฐานใหม่ของการสร้าง Content AI' },
  { icon: '🤝', title: 'Creator First', desc: 'ทุกฟีเจอร์ถูกออกแบบโดยฟัง Creator จริงๆ ก่อนสร้าง เพราะเราเชื่อว่า Creator คือหัวใจของ Openthai.ai' },
  { icon: '🌱', title: 'สนับสนุนสินค้าไทย', desc: 'เราไม่ได้แค่สร้างคอนเทนต์ แต่ช่วยผลักดันสินค้าและผู้ประกอบการไทยให้เข้าถึงผู้บริโภคยุคใหม่' },
];

const TEAM = [
  { name: 'คุณวีรยา สุขใจ', role: 'CEO & Co-founder', avatar: '👩‍💼', desc: 'อดีต Product Lead ที่ Startup FinTech ชั้นนำ ผู้เชี่ยวชาญด้าน AI และ Digital Marketing' },
  { name: 'คุณธนกร มิตรดี', role: 'CTO & Co-founder', avatar: '👨‍💻', desc: 'วิศวกรซอฟต์แวร์ 10+ ปี เชี่ยวชาญ NLP และ Generative AI สร้างระบบรองรับล้านผู้ใช้' },
  { name: 'คุณปิยนุช ทองสุข', role: 'Head of Content', avatar: '👩‍🎨', desc: 'อดีต TikTok Creator 500k followers เข้าใจ Algorithm และเทรนด์ Social Media ลึกสุด' },
  { name: 'คุณสิรวิชญ์ รักไทย', role: 'Head of Partnerships', avatar: '🤝', desc: 'ผู้เชี่ยวชาญด้านการพัฒนาธุรกิจ สร้างเครือข่ายผู้ผลิต OTOP และแบรนด์ไทยกว่า 300 ราย' },
];

const STATS_DATA = [
  { value: 1200, suffix: '+', label: 'Creator ที่ไว้ใจเรา' },
  { value: 241, suffix: '', label: 'แพลตฟอร์มที่รองรับ' },
  { value: 300, suffix: '+', label: 'สินค้าไทยในระบบ' },
  { value: 3, suffix: 'x', label: 'ยอดขายเพิ่มเฉลี่ย' },
];

function StatCard({ value, suffix, label }) {
  const count = useCounter(value);
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'เกี่ยวกับเรา — Openthai.ai'; }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,18,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <LogoEmblem size={28} />
          <span style={{ fontWeight: 900, fontSize: 16, background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Openthai.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={ghostBtn}>← หน้าหลัก</button>
          <button onClick={() => navigate('/press')} style={ghostBtn}>สื่อมวลชน</button>
          <button onClick={() => navigate('/contact')} style={ghostBtn}>ติดต่อ</button>
          <button onClick={() => navigate('/ai-generator')} style={ctaBtn}>ใช้ฟรีตอนนี้ →</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px,8vw,100px) 5% 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '0%', left: '20%', width: 500, height: 500, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '10%', right: '15%', width: 400, height: 400, background: 'rgba(254,44,85,0.08)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 20 }}>
          🏢 เกี่ยวกับเรา
        </div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,64px)', fontWeight: 900, lineHeight: 1.2, margin: '0 0 20px' }}>
          AI ที่สร้างขึ้นเพื่อ<br />
          <span style={{ background: 'linear-gradient(90deg,#fe2c55,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Creator ไทย</span>
          <br />โดยเฉพาะ
        </h1>
        <p style={{ fontSize: 'clamp(15px,2vw,19px)', color: '#94a3b8', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.8 }}>
          Openthai.ai เกิดจากความเชื่อว่า Creator ไทยสมควรได้ใช้ AI ที่เข้าใจวัฒนธรรม ภาษา<br />
          และเทรนด์ของคนไทยอย่างแท้จริง — ไม่ใช่แค่แปลมาจากภาษาต่างประเทศ
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/ai-generator')} style={{ ...ctaBtn, fontSize: 16, padding: '14px 32px' }}>
            ทดลองใช้ฟรี →
          </button>
          <button onClick={() => navigate('/press')} style={{ ...ghostBtn, fontSize: 14, padding: '12px 24px', borderColor: 'rgba(255,255,255,0.15)' }}>
            สื่อมวลชน / Press Kit
          </button>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ ...glassCard, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, divider: 'solid' }}>
            {STATS_DATA.map((s, i) => (
              <div key={s.label} style={{ borderRight: i < STATS_DATA.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <StatCard {...s} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION & VISION ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>พันธกิจและวิสัยทัศน์</SectionBadge>
          <SectionTitle>เราอยู่ที่นี่เพื่ออะไร?</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          <div style={{ ...glassCard, background: 'rgba(254,44,85,0.05)', border: '1.5px solid rgba(254,44,85,0.2)', textAlign: 'left' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>MISSION</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.4 }}>
              ให้ Creator ไทยทุกคน<br />สร้างคอนเทนต์ระดับมืออาชีพได้
            </h3>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>
              ไม่ว่าคุณจะเป็นเจ้าของร้านค้า OTOP ในต่างจังหวัด หรือครีเอเตอร์หน้าใหม่ในเมืองใหญ่ เราเชื่อว่าทุกคนสมควรเข้าถึงเครื่องมือ AI ชั้นเยี่ยมที่ราคาเอื้อมถึง
            </p>
          </div>
          <div style={{ ...glassCard, background: 'rgba(99,102,241,0.05)', border: '1.5px solid rgba(99,102,241,0.2)', textAlign: 'left' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>VISION</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.4 }}>
              แพลตฟอร์ม AI สำหรับ<br />Creator ไทยที่ใหญ่ที่สุด
            </h3>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>
              ภายในปี 2027 เราตั้งเป้าเป็น AI Content Platform อันดับ 1 ในภูมิภาค SEA สำหรับสินค้าท้องถิ่นและ Creator ที่ต้องการเชื่อมโลกออนไลน์กับผู้บริโภคท้องถิ่น
            </p>
          </div>
        </div>
      </section>

      {/* ── STORY / TIMELINE ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 780, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>เส้นทางของเรา</SectionBadge>
          <SectionTitle>จากไอเดีย สู่แพลตฟอร์ม</SectionTitle>
        </div>
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          {/* vertical line */}
          <div style={{ position: 'absolute', left: 14, top: 8, bottom: 8, width: 2, background: 'linear-gradient(180deg,#fe2c55,#6366f1,#10b981)', borderRadius: 4 }} />
          {TIMELINE.map((item, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 32, paddingLeft: 16 }}>
              {/* dot */}
              <div style={{ position: 'absolute', left: -32, top: 4, width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', border: '2px solid #080812', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }} />
              <div style={{ ...glassCard, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{item.year}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUES ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>ค่านิยมองค์กร</SectionBadge>
          <SectionTitle>สิ่งที่เราเชื่อและยึดถือ</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
          {VALUES.map((v) => (
            <div key={v.title} style={{ ...glassCard, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>{v.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>ทีมงาน</SectionBadge>
          <SectionTitle>คนที่สร้าง Openthai.ai</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
          {TEAM.map((m) => (
            <div key={m.name} style={{ ...glassCard, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(254,44,85,0.2),rgba(99,102,241,0.2))', border: '2px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                {m.avatar}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 10 }}>{m.role}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ ...glassCard, background: 'linear-gradient(135deg,rgba(254,44,85,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>พร้อมสร้างคอนเทนต์ปัง?</h2>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            ทดลองใช้ฟรี 3 ครั้ง ไม่ต้องสมัคร ไม่ต้องผูกบัตร<br />
            สร้างคอนเทนต์ที่ใช่ใน 10 วินาที
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/ai-generator')} style={{ ...ctaBtn, fontSize: 16, padding: '14px 32px' }}>
              🎁 ใช้ฟรีเลย — ไม่ต้องสมัคร
            </button>
            <button onClick={() => navigate('/pricing')} style={{ ...ghostBtn, fontSize: 14, padding: '12px 24px', borderColor: 'rgba(255,255,255,0.2)' }}>
              ดูราคา →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <LogoEmblem size={22} />
          <span style={{ fontWeight: 900, fontSize: 14, color: '#f8fafc' }}>Openthai.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[['หน้าหลัก', '/'], ['ราคา', '/pricing'], ['เกี่ยวกับเรา', '/about'], ['สื่อมวลชน', '/press'], ['ติดต่อ', '/contact'], ['Affiliate', '/affiliate']].map(([l, r]) => (
            <button key={r} onClick={() => navigate(r)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>© 2026 Openthai.ai — สงวนลิขสิทธิ์ · 🇹🇭 Made in Thailand</p>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionBadge({ children }) {
  return <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 10 }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, margin: '0 0 4px' }}>{children}</h2>;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, backdropFilter: 'blur(12px)' };
const ctaBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(254,44,85,0.3)' };
const ghostBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '9px 18px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
