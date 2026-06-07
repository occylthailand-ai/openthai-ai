import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n';
import { strings, fill, pick } from './core';

// FOMO: ป๊อปอัปเล็กมุมล่างซ้าย หมุนแสดง "มีคนเพิ่งสร้างคอนเทนต์"
export default function LiveSocialProof() {
  const { lang } = useLang();
  const S = strings(lang).social;
  const [msg, setMsg] = useState(null);
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (closed) return undefined;
    let alive = true;
    const next = () => {
      if (!alive) return;
      const text = fill(S.template, { name: pick(S.names), city: pick(S.cities), product: pick(S.products) });
      const ago = fill(S.ago, { mins: 1 + Math.floor(Math.random() * 9) });
      setMsg({ text, ago });
      setShow(true);
      timers.current.push(setTimeout(() => setShow(false), 5500));       // โชว์ 5.5 วิ
      timers.current.push(setTimeout(next, 5500 + 4000 + Math.random() * 4000)); // เว้น 4-8 วิ
    };
    const start = setTimeout(next, 4000); // เริ่มหลังโหลด 4 วิ
    timers.current.push(start);
    return () => { alive = false; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [closed, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (closed || !msg) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, bottom: 16, zIndex: 9000, maxWidth: 320,
      background: 'rgba(15,15,28,0.96)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 14, padding: '12px 14px', backdropFilter: 'blur(12px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', gap: 10, alignItems: 'flex-start',
      transform: show ? 'translateY(0)' : 'translateY(140%)', opacity: show ? 1 : 0,
      transition: 'transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s',
    }}>
      <div style={{ fontSize: 22, flexShrink: 0 }}>⚡</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{msg.text}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{S.live}</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>· {msg.ago}</span>
        </div>
      </div>
      <button onClick={() => setClosed(true)} aria-label="close"
        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}
