import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceCommander from '../components/VoiceCommander';

const COMMANDS = [
  { emoji: '✍️', cmd: '"สร้างโพสต์เกี่ยวกับ [สินค้า]"', desc: 'AI สร้าง hook + body + hashtag ทันที', color: '#6366f1' },
  { emoji: '🔥', cmd: '"เทรนด์วันนี้"',                  desc: 'ดู hashtag และ topic ยอดนิยม',       color: '#fe2c55' },
  { emoji: '📰', cmd: '"ข่าวล่าสุด"',                    desc: 'ข่าวที่เกี่ยวกับสินค้า OTOP/ไทย',    color: '#f59e0b' },
  { emoji: '💚', cmd: '"สุขภาพระบบ"',                    desc: 'ตรวจสอบ API และ AI engine',           color: '#10b981' },
  { emoji: '🔍', cmd: '"วิเคราะห์คู่แข่ง [ชื่อ]"',      desc: 'วิเคราะห์กลยุทธ์ content ของคู่แข่ง',color: '#8b5cf6' },
  { emoji: '🤖', cmd: '"รายการ agents"',                  desc: 'ดู AI agents ที่กำลังทำงาน',          color: '#06b6d4' },
  { emoji: '🧠', cmd: '"จำเรื่อง [ข้อมูล]"',            desc: 'บันทึกข้อมูลแบรนด์ลง Brand Memory',  color: '#8b5cf6' },
  { emoji: '💡', cmd: '"ช่วย" หรือ "คำสั่งทั้งหมด"',    desc: 'แสดงคำสั่งทั้งหมดที่รองรับ',          color: '#94a3b8' },
];

const QUICK_ACTIONS = [
  { icon: '⚡', label: 'Auto-Post',    route: '/autopost',    color: '#6366f1' },
  { icon: '📊', label: 'Analytics',   route: '/analytics',   color: '#10b981' },
  { icon: '📦', label: 'Bulk Content',route: '/bulk-post',   color: '#fe2c55' },
  { icon: '📅', label: 'Calendar',    route: '/calendar',    color: '#f59e0b' },
  { icon: '🔗', label: 'Link Tracker',route: '/link-tracker',color: '#06b6d4' },
  { icon: '🤖', label: 'AI Agent',    route: '/agent',       color: '#8b5cf6' },
];

export default function VoiceCommandPage() {
  const navigate = useNavigate();
  const [recentCmds, setRecentCmds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('voice_history') || '[]'); } catch { return []; }
  });
  const [tips] = useState([
    'พูดชัดๆ ช้าๆ AI จะเข้าใจดีขึ้น',
    'ใช้ภาษาไทยธรรมชาติ ไม่ต้องพูดสูตรตาย',
    'สั่ง "ช่วย" เพื่อดูคำสั่งทั้งหมด',
    'ผลลัพธ์สามารถคัดลอกไปใช้งานได้ทันที',
  ]);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    document.title = 'Voice Commander — Openthai.ai';
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🎙️ Voice Commander</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>สั่งงาน AI ด้วยเสียง · ภาษาไทย 100%</div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 12px', maxWidth: 200, textAlign: 'center' }}>
          💡 {tips[tipIdx]}
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 5% 0' }}>

        {/* ── Main Voice Interface ───────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px', marginBottom: 24 }}>
          <VoiceCommander mode="page" onCommand={cmd => {
            if (!cmd) return;
            const hist = [{ text: cmd, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }, ...recentCmds].slice(0, 10);
            setRecentCmds(hist);
            try { localStorage.setItem('voice_history', JSON.stringify(hist)); } catch (_) {}
          }} />
        </div>

        {/* ── Quick Navigation ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#a5b4fc' }}>⚡ ไปหน้าต่างๆ ด่วน</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => navigate(a.route)}
                style={{ background: `${a.color}12`, border: `1px solid ${a.color}30`, borderRadius: 12, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = `${a.color}25`}
                onMouseLeave={e => e.currentTarget.style.background = `${a.color}12`}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Two column layout ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Command Cheatsheet */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>🎤 คำสั่งที่รองรับ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {COMMANDS.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: 'center' }}>{c.emoji}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 2 }}>{c.cmd}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Commands */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>🕐 คำสั่งล่าสุด</div>
              {recentCmds.length > 0 && (
                <button onClick={() => { setRecentCmds([]); localStorage.removeItem('voice_history'); }}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11 }}>ล้าง</button>
              )}
            </div>
            {recentCmds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentCmds.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 14, flexShrink: 0 }}>🎙️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#f1f5f9' }}>{r.text}</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{r.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>
                ยังไม่มีประวัติคำสั่ง<br />
                <span style={{ fontSize: 11 }}>กดไมค์และพูดเลย</span>
              </div>
            )}

            {/* How it works */}
            <div style={{ marginTop: 20, padding: '14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>🤖 วิธีทำงาน</div>
              {['กดปุ่มไมค์', 'พูดคำสั่งภาษาไทย', 'AI วิเคราะห์และตอบทันที', 'ผลลัพธ์คัดลอกได้เลย'].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
