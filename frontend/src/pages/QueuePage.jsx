import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const STATUS_META = {
  queued:     { label: 'รอส่ง',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  processing: { label: 'กำลังส่ง', color: '#6366f1', bg: 'rgba(99,102,241,0.15)'   },
  sent:       { label: 'ส่งแล้ว',   color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  failed:     { label: 'ล้มเหลว',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'     },
  cancelled:  { label: 'ยกเลิก',    color: '#475569', bg: 'rgba(71,85,105,0.15)'    },
};

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeUntil(dt) {
  if (!dt) return '';
  const diff = new Date(dt).getTime() - Date.now();
  if (diff < 0) return 'ถึงเวลาแล้ว';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function QueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('queue');
  const [reschedule, setReschedule] = useState(null);  // { id, value }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    document.title = 'Post Queue — Openthai.ai';
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, []);

  async function loadAll() {
    const [qR, lR] = await Promise.allSettled([
      fetch(apiUrl('/api/autopost/queue'), { headers }).then(r => r.json()),
      fetch(apiUrl('/api/autopost/log?limit=50'), { headers }).then(r => r.json()),
    ]);
    if (qR.status === 'fulfilled' && qR.value.success) setQueue(qR.value.data || []);
    if (lR.status === 'fulfilled' && lR.value.success) setHistory(lR.value.data || []);
    setLoading(false);
  }

  async function deleteItem(id) {
    await fetch(apiUrl(`/api/autopost/queue/${id}`), { method: 'DELETE', headers });
    setDeleteConfirm(null);
    loadAll();
  }

  async function rescheduleItem(id, newTime) {
    await fetch(apiUrl(`/api/autopost/queue/${id}`), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ schedule_at: new Date(newTime).toISOString() }),
    });
    setReschedule(null);
    loadAll();
  }

  async function cancelItem(id) {
    await fetch(apiUrl(`/api/autopost/queue/${id}`), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'cancelled' }),
    });
    loadAll();
  }

  const pending = queue.filter(i => i.status === 'queued' || i.status === 'processing');
  const done    = queue.filter(i => ['sent', 'failed', 'cancelled'].includes(i.status));

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📋 Post Queue Manager</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>จัดการ Schedule · แก้ไข · ยกเลิก · ดูประวัติ</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pending.length > 0 && (
            <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#fcd34d', fontWeight: 700 }}>
              ⏳ {pending.length} รอส่ง
            </span>
          )}
          <button onClick={() => navigate('/autopost')} style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            + เพิ่มโพสต์
          </button>
        </div>
      </header>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: '28px', maxWidth: 360, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🗑️ ลบโพสต์นี้?</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>การลบไม่สามารถย้อนกลับได้</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => deleteItem(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 16, padding: '28px', maxWidth: 380, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📅 ตั้งเวลาใหม่</div>
            <input type="datetime-local" value={reschedule.value}
              onChange={e => setReschedule(r => ({ ...r, value: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setReschedule(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => rescheduleItem(reschedule.id, reschedule.value)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 5% 0' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {[
            { id: 'queue',   label: `📋 Queue (${pending.length})` },
            { id: 'done',    label: `✅ ส่งแล้ว (${done.length})` },
            { id: 'history', label: `🕐 ประวัติ (${history.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`, color: tab === t.id ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
          <button onClick={loadAll} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: '#475569', cursor: 'pointer', fontSize: 11 }}>🔄</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>กำลังโหลด...</div>
        ) : (
          <>
            {/* Pending Queue */}
            {tab === 'queue' && (
              pending.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map(item => {
                    const sm = STATUS_META[item.status] || STATUS_META.queued;
                    return (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ background: sm.bg, color: sm.color, borderRadius: 6, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{sm.label}</span>
                              {item.platforms?.map(p => (
                                <span key={p} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#64748b' }}>{p}</span>
                              ))}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.content?.hook || item.product || 'โพสต์'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                              <span>📅 {formatDateTime(item.schedule_at)}</span>
                              {item.status === 'queued' && <span style={{ color: '#f59e0b' }}>⏳ {timeUntil(item.schedule_at)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                            <button onClick={() => setReschedule({ id: item.id, value: item.schedule_at?.slice(0, 16) || '' })}
                              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 10px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>
                              📅 เลื่อน
                            </button>
                            <button onClick={() => cancelItem(item.id)}
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '6px 10px', color: '#fcd34d', cursor: 'pointer', fontSize: 12 }}>
                              ⏸ หยุด
                            </button>
                            <button onClick={() => setDeleteConfirm(item.id)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 10px', color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div style={{ marginBottom: 16 }}>ไม่มีโพสต์ใน Queue</div>
                  <button onClick={() => navigate('/autopost')} style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    + สร้างโพสต์แรก
                  </button>
                </div>
              )
            )}

            {/* Done items */}
            {tab === 'done' && (
              done.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {done.map(item => {
                    const sm = STATUS_META[item.status] || STATUS_META.sent;
                    const success = (item.results || []).filter(r => r.status === 'success').length;
                    const total = (item.results || []).length;
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.content?.hook || item.product || 'โพสต์'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {formatDateTime(item.schedule_at)} · {item.platforms?.join(', ')}
                          </div>
                        </div>
                        {total > 0 && <span style={{ fontSize: 12, color: sm.color, fontWeight: 700 }}>{success}/{total}</span>}
                        <span style={{ fontSize: 11, background: sm.bg, color: sm.color, borderRadius: 6, padding: '2px 8px' }}>{sm.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>ยังไม่มีโพสต์ที่ส่งแล้ว</div>
              )
            )}

            {/* Full History */}
            {tab === 'history' && (
              history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((b, i) => {
                    const results = b.results || b.platforms || [];
                    const success = results.filter(r => r.status === 'success').length;
                    const total = results.length;
                    const pct = total > 0 ? Math.round((success / total) * 100) : 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: pct === 100 ? 'rgba(16,185,129,0.15)' : pct > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {pct === 100 ? '✅' : pct > 0 ? '⚡' : '❌'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.content?.hook || b.product || 'โพสต์'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {b.dispatched_at ? new Date(b.dispatched_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} · {success}/{total} platform
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444' }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>ยังไม่มีประวัติการส่ง</div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
