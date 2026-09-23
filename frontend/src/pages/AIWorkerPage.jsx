import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../apiBase';
import { useToast } from '../components/ToastContext';
import CreditChip from '../components/CreditChip';

// ── AI Worker — ตั้งงาน AI ให้ทำงานอัตโนมัติต่อเนื่อง แล้วมาอ่านผลลัพธ์ทีหลัง ──────
// ตัวอย่างงาน: "คิดไอเดียคอนเทนต์ TikTok 3 อัน", "สรุปเทรนด์ขายของออนไลน์วันนี้",
//              "ร่างข้อความติดตามลูกค้าที่ยังไม่ตัดสินใจซื้อ"
// หมายเหตุ: งานเหล่านี้ "สร้างข้อความ" ให้เอาไปใช้เอง ไม่ใช่บอทโพสต์แทนไปแพลตฟอร์มอื่น

const INTERVAL_OPTIONS = [
  { minutes: 15,   label: 'ทุก 15 นาที' },
  { minutes: 60,   label: 'ทุกชั่วโมง' },
  { minutes: 360,  label: 'ทุก 6 ชั่วโมง' },
  { minutes: 1440, label: 'ทุกวัน' },
];

const bg = { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", padding: '24px 16px 64px' };
const wrap = { maxWidth: 780, margin: '0 auto' };
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 20, marginBottom: 16 };
const label = { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 600 };
const input = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.25)', color: '#f8fafc', fontSize: 14, marginBottom: 12 };
const btnPrimary = { padding: '12px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const btnGhost = { padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 };
const btnDanger = { ...btnGhost, borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' };

function StatusPill({ status }) {
  const map = {
    ok: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', text: '✅ สำเร็จ' },
    error: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', text: '⚠️ ผิดพลาด' },
    paused_no_credit: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', text: '⏸ เครดิตหมด' },
  };
  const s = map[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', text: 'ยังไม่เคยรัน' };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{s.text}</span>;
}

function JobCard({ job, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(null);
  const [showRuns, setShowRuns] = useState(false);

  const toggleActive = async () => {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/ai-worker/jobs/${job.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !job.active }),
      });
      const d = await r.json();
      if (d.success) { onChanged(); toast.info(d.job.active ? 'เปิดใช้งานแล้ว' : 'หยุดชั่วคราวแล้ว'); }
      else toast.error(d.error || 'ทำรายการไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/ai-worker/jobs/${job.id}/run-now`, { method: 'POST' });
      const d = await r.json();
      if (d.success) { toast.success('รันสำเร็จ — ดูผลลัพธ์ด้านล่าง'); window.dispatchEvent(new Event('otai:credits-changed')); onChanged(); setShowRuns(true); loadRuns(); }
      else toast.error(d.error || d.run?.error || 'รันไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`ลบงาน "${job.title}" ?`)) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/api/ai-worker/jobs/${job.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { toast.info('ลบงานแล้ว'); onChanged(); }
    } finally { setBusy(false); }
  };

  const loadRuns = useCallback(async () => {
    const r = await apiFetch(`/api/ai-worker/jobs/${job.id}/runs`);
    const d = await r.json();
    if (d.success) setRuns(d.runs);
  }, [job.id]);

  const toggleRuns = () => {
    setShowRuns((v) => !v);
    if (!runs) loadRuns();
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{job.title}</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{job.prompt}</div>
        </div>
        <StatusPill status={job.lastStatus} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
        <span>⏱ {INTERVAL_OPTIONS.find((o) => o.minutes === job.intervalMinutes)?.label || `ทุก ${job.intervalMinutes} นาที`}</span>
        <span>· รันไปแล้ว {job.runCount || 0} ครั้ง</span>
        {job.lastRunAt && <span>· ล่าสุด {new Date(job.lastRunAt).toLocaleString('th-TH')}</span>}
        <span>· {job.active ? '🟢 เปิดใช้งาน' : '⏸ หยุดไว้'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button style={btnPrimary} disabled={busy} onClick={runNow}>▶ รันตอนนี้</button>
        <button style={btnGhost} disabled={busy} onClick={toggleActive}>{job.active ? 'หยุดชั่วคราว' : 'เปิดใช้งาน'}</button>
        <button style={btnGhost} disabled={busy} onClick={toggleRuns}>{showRuns ? 'ซ่อนผลลัพธ์' : 'ดูผลลัพธ์'}</button>
        <button style={btnDanger} disabled={busy} onClick={remove}>ลบ</button>
      </div>
      {showRuns && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          {runs === null && <div style={{ color: '#94a3b8', fontSize: 13 }}>กำลังโหลด…</div>}
          {Array.isArray(runs) && runs.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>ยังไม่มีผลลัพธ์ — กด "รันตอนนี้" เพื่อทดสอบ</div>}
          {Array.isArray(runs) && runs.slice(0, 10).map((r) => (
            <div key={r.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                {new Date(r.startedAt || r.started_at).toLocaleString('th-TH')} · {r.provider || (r.status === 'error' ? 'ล้มเหลวทุกช่องทาง' : '—')}
              </div>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{r.outputPreview || r.output_preview || r.error}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIWorkerPage() {
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', prompt: '', intervalMinutes: 1440 });

  const load = useCallback(async () => {
    const [pr, jr] = await Promise.all([apiFetch('/api/ai-worker/plan'), apiFetch('/api/ai-worker/jobs')]);
    const pd = await pr.json();
    const jd = await jr.json();
    if (pd.success) setPlan(pd);
    if (jd.success) setJobs(jd.jobs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) return toast.error('กรอกชื่องานและคำสั่งงานก่อน');
    setCreating(true);
    try {
      const r = await apiFetch('/api/ai-worker/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { toast.success('ตั้งงานอัตโนมัติแล้ว 🎉'); setForm({ title: '', prompt: '', intervalMinutes: 1440 }); load(); }
      else toast.error(d.error || 'ตั้งงานไม่สำเร็จ');
    } finally { setCreating(false); }
  };

  const atLimit = plan && jobs && jobs.length >= plan.limits.maxJobs;

  return (
    <div style={bg}>
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>🤖 AI Worker</h1>
            <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: 14 }}>ตั้งงาน AI ครั้งเดียว ให้ทำงานอัตโนมัติต่อเนื่องตามรอบเวลา — สลับผู้ให้บริการ AI อัตโนมัติถ้าตัวหลักมีปัญหา</p>
          </div>
          <CreditChip />
        </div>

        {plan && (
          <div style={{ ...card, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div style={{ fontSize: 14 }}>
              แผนปัจจุบัน: <strong style={{ textTransform: 'capitalize' }}>{plan.plan}</strong>
              {' · '}ตั้งงานได้สูงสุด <strong>{plan.limits.maxJobs}</strong> งาน
              {' · '}รันถี่สุด <strong>{INTERVAL_OPTIONS.find((o) => o.minutes === plan.limits.minIntervalMinutes)?.label || `ทุก ${plan.limits.minIntervalMinutes} นาที`}</strong>
              {' · '}เครดิตคงเหลือ <strong>{plan.balance}</strong> (หัก 1 เครดิตทุกครั้งที่รันสำเร็จ)
            </div>
            {plan.plan === 'free' && (
              <a href="/pricing" style={{ color: '#a5b4fc', fontSize: 13, display: 'inline-block', marginTop: 8 }}>อัปเกรดแผนเพื่อตั้งงานได้มากขึ้น/ถี่ขึ้น →</a>
            )}
          </div>
        )}

        <form onSubmit={submit} style={card}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>+ ตั้งงานใหม่</h2>
          <label style={label}>ชื่องาน</label>
          <input style={input} value={form.title} maxLength={80} placeholder="เช่น คิดไอเดียคอนเทนต์ TikTok รายวัน" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label style={label}>คำสั่งงาน (prompt) — เขียนสิ่งที่อยากให้ AI ทำทุกครั้งที่รัน</label>
          <textarea style={{ ...input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} maxLength={4000}
            value={form.prompt} placeholder="เช่น คิดไอเดียคอนเทนต์ TikTok ขายผลไม้อบแห้ง 3 อัน พร้อม hook เปิดคลิป"
            onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
          <label style={label}>ความถี่</label>
          <select style={input} value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}>
            {INTERVAL_OPTIONS.filter((o) => !plan || o.minutes >= plan.limits.minIntervalMinutes).map((o) => (
              <option key={o.minutes} value={o.minutes}>{o.label}</option>
            ))}
          </select>
          <button type="submit" style={{ ...btnPrimary, opacity: creating || atLimit ? 0.6 : 1, width: '100%' }} disabled={creating || atLimit}>
            {atLimit ? `ครบโควตางาน (${plan?.limits.maxJobs}) แล้ว — อัปเกรดแผนที่ /pricing` : creating ? 'กำลังตั้งงาน…' : 'ตั้งงานอัตโนมัติ'}
          </button>
        </form>

        <h2 style={{ fontSize: 16 }}>งานของฉัน {jobs ? `(${jobs.length})` : ''}</h2>
        {jobs === null && <div style={{ color: '#94a3b8' }}>กำลังโหลด…</div>}
        {Array.isArray(jobs) && jobs.length === 0 && <div style={{ ...card, color: '#94a3b8' }}>ยังไม่มีงาน — ตั้งงานแรกด้านบนได้เลย</div>}
        {Array.isArray(jobs) && jobs.map((j) => <JobCard key={j.id} job={j} onChanged={load} />)}
      </div>
    </div>
  );
}
