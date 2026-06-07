import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { strings, loadGrowth, saveGrowth } from './core';

const SEG_COLORS = ['#fe2c55', '#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#a855f7'];

// Gamified onboarding: ผู้ใช้ใหม่หมุน 1 ครั้ง รับรางวัล (1 ครั้ง/เครื่อง)
export default function WelcomeSpinWheel() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const S = strings(lang).spin;
  const [open, setOpen] = useState(false);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState(null);

  useEffect(() => {
    if (loadGrowth().spun) return undefined;
    const t = setTimeout(() => { setOpen(true); window.__otaiModalOpen = true; }, 1500);
    return () => clearTimeout(t);
  }, []);

  const close = () => { setOpen(false); window.__otaiModalOpen = false; };

  const doSpin = () => {
    if (spinning || prize !== null) return;
    const n = S.prizes.length;
    const i = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const target = 6 * 360 + (360 - (i * seg + seg / 2)); // ให้ช่อง i หยุดตรงตัวชี้ (ด้านบน)
    setSpinning(true);
    setRot(target);
    setTimeout(() => {
      setSpinning(false);
      setPrize(S.prizes[i]);
      saveGrowth({ spun: true, prize: S.prizes[i] });
    }, 4200);
  };

  if (!open) return null;
  const n = S.prizes.length;
  const seg = 360 / n;
  const gradient = `conic-gradient(${SEG_COLORS.map((c, idx) => `${c} ${idx * seg}deg ${(idx + 1) * seg}deg`).join(',')})`;

  return (
    <div style={overlay}>
      <div style={modal}>
        {prize === null && <button onClick={close} aria-label="close" style={closeBtn}>×</button>}
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{S.title}</div>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 18px' }}>{S.desc}</p>

        {/* Wheel */}
        <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 18px' }}>
          <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 26, zIndex: 2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }}>🔻</div>
          <div style={{
            width: 220, height: 220, borderRadius: '50%', background: gradient,
            border: '6px solid rgba(255,255,255,0.12)', boxShadow: '0 0 0 4px rgba(99,102,241,0.25), inset 0 0 40px rgba(0,0,0,0.4)',
            transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 4s cubic-bezier(.15,.9,.25,1)' : 'none',
          }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 54, height: 54, borderRadius: '50%', background: '#0c0c16', border: '3px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎁</div>
        </div>

        {prize === null ? (
          <button onClick={doSpin} disabled={spinning} style={{ ...cta, opacity: spinning ? 0.7 : 1 }}>
            {spinning ? S.spinning : S.button}
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>{S.won}</div>
            <div style={{ fontSize: 24, fontWeight: 900, margin: '4px 0 16px', background: 'linear-gradient(90deg,#fe2c55,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{prize}</div>
            <button onClick={() => { close(); navigate('/ai-generator'); }} style={cta}>{S.claim}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const modal = { position: 'relative', width: '100%', maxWidth: 340, background: 'linear-gradient(160deg,#13131f,#0c0c16)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '26px 22px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' };
const closeBtn = { position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 };
const cta = { width: '100%', padding: '14px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(254,44,85,0.35)' };
