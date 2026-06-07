import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n';
import { apiFetch } from '../apiBase';
import { strings, fill, loadGrowth, saveGrowth, todayStr } from './core';

// Habit loop: นับวันที่กลับมาใช้ติดต่อกัน + ให้เครดิตโบนัส
function computeStreak() {
  const g = loadGrowth();
  const today = todayStr();
  if (g.streakDate === today) {
    return { days: g.streakDays || 1, credits: g.streakCredits || 1, fresh: false };
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const days = g.streakDate === yesterday ? (g.streakDays || 1) + 1 : 1;
  const credits = Math.min(days, 5); // โบนัสเพิ่มตามวัน สูงสุด 5
  saveGrowth({ streakDate: today, streakDays: days, streakCredits: credits });
  return { days, credits, fresh: true };
}

export default function StreakToast() {
  const { lang } = useLang();
  const S = strings(lang).streak;
  const [state, setState] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    const timers = [];
    (async () => {
      let s;
      try {
        // server-authoritative streak (ข้ามอุปกรณ์ถ้า login); fallback เป็น local
        const res = await apiFetch('/api/credits/checkin', { method: 'POST' });
        const d = await res.json();
        s = { days: d.streakDays || 1, credits: d.awarded || d.streakDays || 1 };
      } catch {
        s = computeStreak();
      }
      if (!alive) return;
      setState(s);
      timers.push(setTimeout(() => setShow(true), 1200));
      timers.push(setTimeout(() => setShow(false), 8000));
    })();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  if (!state) return null;
  const isDay1 = state.days <= 1;

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', zIndex: 9100,
      transform: `translateX(-50%) translateY(${show ? '0' : '-160%'})`,
      transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
      background: 'linear-gradient(135deg,rgba(254,44,85,0.95),rgba(245,158,11,0.95))',
      borderRadius: 14, padding: '12px 18px', boxShadow: '0 12px 34px rgba(254,44,85,0.35)',
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: '92vw',
    }}>
      <div style={{ fontSize: 26 }}>🔥</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
          {isDay1 ? S.day1 : fill(S.title, { days: state.days })}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
          {isDay1 ? S.keepgoing : fill(S.reward, { credits: state.credits })}
        </div>
      </div>
    </div>
  );
}
