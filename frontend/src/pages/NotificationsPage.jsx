import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const TYPE_META = {
  post_success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  post_fail:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
  error:        { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
  warning:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  info:         { color: '#6366f1', bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.15)' },
};

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)  return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotifCard({ n }) {
  const m = TYPE_META[n.type] || TYPE_META.info;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: 12, marginBottom: 8 }}>
      <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{n.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4 }}>{n.title}</div>
          <div style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{timeAgo(n.ts)}</div>
        </div>
        {n.body && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>}
        {n.data && (
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            {n.data.success !== undefined && (
              <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderRadius: 6, padding: '2px 8px' }}>
                ✅ {n.data.success}/{n.data.total} platform
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    document.title = 'Notifications — Openthai.ai';
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    const token = localStorage.getItem('auth_token');
    const h = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const r = await fetch(apiUrl('/api/notifications?limit=50'), { headers: h });
      const d = await r.json();
      if (d.success) {
        setNotifications(d.notifications || []);
        setUnread(d.unread || 0);
      }
    } catch (_) {}
    setLoading(false);
  }

  const FILTERS = [
    { value: 'all',     label: 'ทั้งหมด' },
    { value: 'success', label: '✅ สำเร็จ' },
    { value: 'error',   label: '🔴 ข้อผิดพลาด' },
    { value: 'warning', label: '⚠️ คำเตือน' },
  ];

  const filtered = notifications.filter(n => {
    if (filter === 'all')     return true;
    if (filter === 'success') return n.type === 'post_success' || n.type === 'info';
    if (filter === 'error')   return n.type === 'error' || n.type === 'post_fail';
    if (filter === 'warning') return n.type === 'warning';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔔 Notifications
            {unread > 0 && (
              <span style={{ background: '#ef4444', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700, color: '#fff' }}>{unread}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Activity feed · อัปเดตทุก 30 วินาที</div>
        </div>
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
          🔄 รีเฟรช
        </button>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 5% 0' }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: filter === f.value ? '#6366f1' : 'rgba(255,255,255,0.1)', background: filter === f.value ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === f.value ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: filter === f.value ? 700 : 400 }}>
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569', alignSelf: 'center' }}>{filtered.length} รายการ</span>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 1s linear infinite' }}>🔔</div>
            กำลังโหลด...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length > 0 ? (
          <div>
            {/* Group by date */}
            {(() => {
              const groups = {};
              filtered.forEach(n => {
                const day = new Date(n.ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                if (!groups[day]) groups[day] = [];
                groups[day].push(n);
              });
              return Object.entries(groups).map(([day, items]) => (
                <div key={day}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', padding: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {day}
                  </div>
                  {items.map(n => <NotifCard key={n.id} n={n} />)}
                </div>
              ));
            })()}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>ไม่มี notification ในช่วงนี้</div>
            <div style={{ fontSize: 13 }}>เริ่มโพสต์คอนเทนต์เพื่อดู activity ที่นี่</div>
            <button onClick={() => navigate('/autopost')}
              style={{ marginTop: 20, background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              ⚡ โพสต์เลย
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
