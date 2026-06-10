import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';

const PRESS_RELEASES = [
  {
    date: '10 มิ.ย. 2569',
    category: 'ผลิตภัณฑ์',
    title: 'Openthai.ai เปิดตัว AI Generator v9.0 รองรับ 241 แพลตฟอร์มทั่วโลก',
    excerpt: 'อัปเดตครั้งใหญ่ที่สุดในประวัติศาสตร์ของแพลตฟอร์ม เพิ่มระบบ AI Critic รุ่นใหม่ ระบบตลาดสินค้า OTOP และ API สำหรับนักพัฒนา',
    badge: 'NEW',
    badgeColor: '#10b981',
  },
  {
    date: '15 ม.ค. 2569',
    category: 'ธุรกิจ',
    title: 'Openthai.ai ผ่านเครื่องหมาย 1,200 Creator ที่ใช้งานรายเดือน',
    excerpt: 'ตัวเลขผู้ใช้งานสะท้อนถึงความต้องการเครื่องมือ AI ที่เข้าใจวัฒนธรรมไทยในตลาด Creator Economy ที่กำลังเติบโต',
    badge: 'MILESTONE',
    badgeColor: '#6366f1',
  },
  {
    date: '5 ก.ย. 2568',
    category: 'ความร่วมมือ',
    title: 'Openthai.ai จับมือกับผู้ผลิต OTOP กว่า 300 รายทั่วประเทศ',
    excerpt: 'สร้างระบบนิเวศที่เชื่อม Creator ไทยกับผู้ผลิตสินค้าท้องถิ่น เปิดโอกาสทางการตลาดดิจิทัลให้ SME และ OTOP ไทย',
    badge: 'PARTNERSHIP',
    badgeColor: '#f59e0b',
  },
];

const MEDIA_ASSETS = [
  { name: 'โลโก้สี (PNG)', desc: 'สำหรับพื้นหลังมืด — 1408×768px', icon: '🖤', size: '2.1 MB' },
  { name: 'โลโก้สีขาว (PNG)', desc: 'สำหรับพื้นหลังสี — 1408×768px', icon: '⬜', size: '1.8 MB' },
  { name: 'โลโก้ Square (PNG)', desc: 'ไอคอน / Profile Picture — 512×512px', icon: '🟪', size: '0.5 MB' },
  { name: 'Brand Guidelines (PDF)', desc: 'สีแบรนด์ ฟอนต์ และการใช้งานโลโก้', icon: '📘', size: '4.2 MB' },
  { name: 'Press Kit ครบชุด (ZIP)', desc: 'โลโก้ + ภาพหน้าจอ + Fact Sheet', icon: '📦', size: '18 MB' },
];

const BRAND_COLORS = [
  { name: 'TikTok Red', hex: '#FE2C55', usage: 'Primary CTA, Accent' },
  { name: 'Indigo', hex: '#6366F1', usage: 'Brand, Links, Badges' },
  { name: 'Deep Navy', hex: '#080812', usage: 'Background' },
  { name: 'Slate', hex: '#94A3B8', usage: 'Body text' },
  { name: 'Emerald', hex: '#10B981', usage: 'Success, Free tier' },
  { name: 'Amber', hex: '#F59E0B', usage: 'Premier tier, Stars' },
];

const COVERAGE = [
  { name: 'Positioning Mag', icon: '📰' },
  { name: 'Techsauce', icon: '💻' },
  { name: 'The Standard', icon: '📋' },
  { name: 'Brand Inside', icon: '🎯' },
  { name: 'Digital Next', icon: '🌐' },
  { name: 'Blognone', icon: '🔵' },
];

const MEDIA_CONTACTS = [
  { role: 'ประชาสัมพันธ์ทั่วไป', email: 'press@openthai.ai', responseTime: 'ภายใน 24 ชม.' },
  { role: 'สัมภาษณ์ผู้บริหาร', email: 'media@openthai.ai', responseTime: 'ภายใน 4 ชม.' },
  { role: 'ขอ Press Kit / Asset', email: 'assets@openthai.ai', responseTime: 'ภายใน 1 ชม.' },
];

export default function PressPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState('');
  useEffect(() => { document.title = 'Press & Media — Openthai.ai'; }, []);

  const copyColor = (hex) => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(hex);
    setTimeout(() => setCopied(''), 2000);
  };

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
          <button onClick={() => navigate('/about')} style={ghostBtn}>เกี่ยวกับเรา</button>
          <button onClick={() => navigate('/contact')} style={ghostBtn}>ติดต่อ</button>
          <button onClick={() => window.location.href = 'mailto:press@openthai.ai'} style={ctaBtn}>✉️ ติดต่อ PR</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px,8vw,100px) 5% 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 450, height: 450, background: 'rgba(254,44,85,0.08)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '5%', right: '10%', width: 400, height: 400, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-block', background: 'rgba(254,44,85,0.1)', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#fca5a5', fontWeight: 600, marginBottom: 20 }}>
          📰 สำหรับสื่อมวลชนและนักข่าว
        </div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,60px)', fontWeight: 900, lineHeight: 1.2, margin: '0 0 20px' }}>
          Press & <span style={{ background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Media Center</span>
        </h1>
        <p style={{ fontSize: 'clamp(14px,2vw,18px)', color: '#94a3b8', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.8 }}>
          ข่าวประชาสัมพันธ์ สื่อทางการ และข้อมูลสำหรับนักข่าวและนักวิเคราะห์<br />
          พร้อมติดต่อทีม PR ตลอด 24 ชม.
        </p>

        {/* Quick fact strip */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          {[
            { label: 'ก่อตั้ง', value: '2023' },
            { label: 'ผู้ใช้งาน', value: '1,200+' },
            { label: 'แพลตฟอร์ม', value: '241' },
            { label: 'ประเทศ', value: 'ไทย' },
          ].map((f) => (
            <div key={f.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc' }}>{f.value}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MEDIA COVERAGE ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 5% 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>
          ปรากฏใน
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {COVERAGE.map((m) => (
            <div key={m.name} style={{ ...glassCard, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{m.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRESS RELEASES ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <SectionBadge>ข่าวประชาสัมพันธ์</SectionBadge>
          <SectionTitle>Press Releases</SectionTitle>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRESS_RELEASES.map((pr, i) => (
            <div key={i} style={{ ...glassCard, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, minWidth: 100 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{pr.date}</div>
                <div style={{ display: 'inline-block', background: `${pr.badgeColor}22`, border: `1px solid ${pr.badgeColor}44`, borderRadius: 8, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: pr.badgeColor, letterSpacing: 1 }}>{pr.badge}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>{pr.category}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, lineHeight: 1.4 }}>{pr.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{pr.excerpt}</div>
              </div>
              <button onClick={() => window.location.href = 'mailto:press@openthai.ai'} style={{ flexShrink: 0, ...ghostBtn, fontSize: 12, padding: '8px 14px' }}>
                ขอฉบับเต็ม →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── MEDIA ASSETS ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <SectionBadge>สื่อทางการ</SectionBadge>
          <SectionTitle>Media Assets & Press Kit</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {MEDIA_ASSETS.map((a) => (
            <div key={a.name} style={{ ...glassCard, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{a.desc}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{a.size}</div>
              </div>
              <button
                onClick={() => window.location.href = 'mailto:assets@openthai.ai?subject=ขอ ' + encodeURIComponent(a.name)}
                style={{ flexShrink: 0, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '7px 12px', color: '#a5b4fc', fontSize: 12, cursor: 'pointer' }}>
                ⬇ ขอรับ
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 16 }}>
          * Asset ทั้งหมดสำหรับใช้ในสื่อมวลชนเท่านั้น กรุณาติดต่อ assets@openthai.ai เพื่อขอรับไฟล์
        </p>
      </section>

      {/* ── BRAND COLORS ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <SectionBadge>Brand Identity</SectionBadge>
          <SectionTitle>สีและ Identity ของแบรนด์</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
          {BRAND_COLORS.map((c) => (
            <div key={c.hex} onClick={() => copyColor(c.hex)} style={{ ...glassCard, cursor: 'pointer', padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.2s', borderColor: copied === c.hex ? 'rgba(16,185,129,0.5)' : undefined }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.hex, flexShrink: 0, boxShadow: `0 4px 12px ${c.hex}44` }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                  {copied === c.hex ? '✅ คัดลอกแล้ว!' : c.hex}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 12 }}>คลิกที่สีเพื่อคัดลอก HEX code</p>
      </section>

      {/* ── COMPANY FACTS ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <SectionBadge>ข้อมูลบริษัท</SectionBadge>
          <SectionTitle>Fact Sheet</SectionTitle>
        </div>
        <div style={{ ...glassCard }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {[
              ['ชื่อบริษัท', 'Openthai.ai (Occyl Thailand Co., Ltd.)'],
              ['ก่อตั้ง', 'ปี 2023'],
              ['ที่ตั้ง', 'กรุงเทพมหานคร, ประเทศไทย'],
              ['ประเภทธุรกิจ', 'AI SaaS / Content Technology'],
              ['ผลิตภัณฑ์หลัก', 'AI Content Generator สำหรับ TikTok & Social Media'],
              ['เทคโนโลยี', 'Claude AI, Google Gemini, React, Node.js'],
              ['แพลตฟอร์ม', 'Web App (openthai.ai), API'],
              ['ราคา', 'Free / Pro ฿20/เดือน / Premier ฿30/เดือน'],
              ['ผู้ใช้งาน', '1,200+ Creator (มิ.ย. 2569)'],
              ['การรองรับ', '241 แพลตฟอร์มทั่วโลก'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, minWidth: 120, paddingTop: 2 }}>{k}</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', flex: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEDIA CONTACT ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ marginBottom: 36 }}>
          <SectionBadge>ติดต่อทีม PR</SectionBadge>
          <SectionTitle>พร้อมให้ข้อมูลตลอด 24 ชม.</SectionTitle>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 10 }}>สำหรับการสัมภาษณ์ ขอข้อมูลเพิ่มเติม หรือขอ Asset กรุณาติดต่อตามช่องทางด้านล่าง</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MEDIA_CONTACTS.map((c) => (
            <div key={c.email} style={{ ...glassCard, display: 'flex', gap: 16, alignItems: 'center', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.role}</div>
                <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>{c.email}</a>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap' }}>⏰ {c.responseTime}</div>
            </div>
          ))}
        </div>

        <div style={{ ...glassCard, marginTop: 24, background: 'linear-gradient(135deg,rgba(254,44,85,0.06),rgba(99,102,241,0.06))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ต้องการข้อมูลเพิ่มเติม?</div>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>ส่งคำถาม ขอสัมภาษณ์ผู้บริหาร หรือขอ Press Kit ผ่านอีเมลได้เลย ทีมงานพร้อมตอบรับ</p>
          <button
            onClick={() => window.location.href = 'mailto:press@openthai.ai?subject=สอบถามข้อมูล Openthai.ai'}
            style={{ ...ctaBtn, fontSize: 15, padding: '13px 28px' }}>
            📨 ส่งอีเมลทีม PR
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <LogoEmblem size={22} />
          <span style={{ fontWeight: 900, fontSize: 14, color: '#f8fafc' }}>Openthai.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[['หน้าหลัก', '/'], ['เกี่ยวกับเรา', '/about'], ['ราคา', '/pricing'], ['ติดต่อ', '/contact'], ['นโยบายความเป็นส่วนตัว', '/privacy']].map(([l, r]) => (
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
