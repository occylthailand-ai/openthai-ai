import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { strings } from './core';

// จับคนกำลังจะออก → เสนอส่วนลดจำกัดเวลา (1 ครั้ง/เซสชัน)
export default function ExitIntentModal() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const S = strings(lang).exit;
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(300); // 5:00
  const firedRef = useRef(false);

  // trigger: desktop mouse leave ทางบน + fallback 60 วิ (มือถือ)
  useEffect(() => {
    if (sessionStorage.getItem('otai_exit') === '1') return undefined;
    const fire = () => {
      if (firedRef.current || window.__otaiModalOpen) return;
      firedRef.current = true;
      sessionStorage.setItem('otai_exit', '1');
      setOpen(true);
    };
    const onLeave = (e) => { if (e.clientY <= 0) fire(); };
    document.addEventListener('mouseleave', onLeave);
    const fb = setTimeout(fire, 60000);
    return () => { document.removeEventListener('mouseleave', onLeave); clearTimeout(fb); };
  }, []);

  // countdown
  useEffect(() => {
    if (!open) return undefined;
    window.__otaiModalOpen = true;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => { clearInterval(t); window.__otaiModalOpen = false; };
  }, [open]);

  if (!open) return null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const close = () => setOpen(false);

  return (
    <div onClick={close} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <button onClick={close} aria-label="close" style={closeBtn}>×</button>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', letterSpacing: 1, textTransform: 'uppercase' }}>{S.tag}</div>
        <div style={{ fontSize: 30, fontWeight: 900, margin: '6px 0 4px' }}>{S.title}</div>
        <div style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(90deg,#fe2c55,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{S.headline}</div>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '12px 0 18px', lineHeight: 1.6 }}>{S.desc}</p>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{S.expires}</div>
          <div style={{ fontSize: 34, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: left < 60 ? '#ef4444' : '#f8fafc' }}>{mm}:{ss}</div>
        </div>
        <button onClick={() => { close(); navigate('/pricing'); }} style={cta}>{S.cta}</button>
        <button onClick={close} style={dismiss}>{S.dismiss}</button>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const modal = { position: 'relative', width: '100%', maxWidth: 380, background: 'linear-gradient(160deg,#13131f,#0c0c16)', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 20, padding: '28px 24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' };
const closeBtn = { position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 };
const cta = { width: '100%', padding: '14px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(254,44,85,0.35)' };
const dismiss = { width: '100%', padding: '10px', marginTop: 8, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' };
