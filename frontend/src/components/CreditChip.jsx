import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../apiBase';
import { useToast } from './ToastContext';

// แสดงเครดิตโบนัส + streak + ปุ่มเช็คอินรายวัน (ปิด loop habit)
// รีเฟรชเมื่อมี event 'otai:credits-changed' (ยิงตอน generate ใช้เครดิต)
export default function CreditChip() {
  const toast = useToast();
  const [c, setC] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/credits');
      const d = await r.json();
      if (d.success) setC(d);
    } catch { /* offline — ซ่อน chip */ }
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('otai:credits-changed', h);
    return () => window.removeEventListener('otai:credits-changed', h);
  }, [load]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedIn = c?.streakDate === todayStr;

  const checkin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await apiFetch('/api/credits/checkin', { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        setC((x) => ({ ...(x || {}), balance: d.balance, streakDays: d.streakDays, streakDate: todayStr }));
        if (d.awarded > 0) toast.success(`🔥 เช็คอินสำเร็จ! +${d.awarded} เครดิต · streak ${d.streakDays} วัน`);
        else toast.info(`เช็คอินวันนี้แล้ว · streak ${d.streakDays} วัน`);
      }
    } catch {
      toast.error('เช็คอินไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  if (!c) return null;

  return (
    <div style={wrap}>
      <span style={pill} title="เครดิตโบนัสจากรางวัล/เช็คอิน ใช้สร้างเกินโควต้าฟรีได้">
        🎁 <strong style={{ color: '#f8fafc' }}>{c.balance}</strong> เครดิต
      </span>
      {c.streakDays > 0 && (
        <span style={{ ...pill, borderColor: 'rgba(245,158,11,0.4)' }} title="วันที่ใช้ติดต่อกัน">
          🔥 {c.streakDays} วัน
        </span>
      )}
      <button onClick={checkin} disabled={busy || checkedIn} style={{ ...btn, opacity: busy || checkedIn ? 0.55 : 1, cursor: busy || checkedIn ? 'default' : 'pointer' }}>
        {checkedIn ? '✅ เช็คอินแล้ว' : busy ? '...' : '＋ เช็คอินรับเครดิต'}
      </button>
    </div>
  );
}

const wrap = { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 };
const pill = { fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px' };
const btn = { fontSize: 12, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 20, padding: '4px 14px' };
