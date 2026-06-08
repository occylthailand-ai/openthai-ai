import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const CAL_KEY = 'openthai_calendar';
const PLATFORM_COLOR = { TikTok: '#fe2c55', Facebook: '#1877f2', Instagram: '#e1306c', YouTube: '#ff0000', LINE: '#06c755' };
const PLATFORMS = ['TikTok', 'Facebook', 'Instagram', 'YouTube', 'LINE'];
const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function getPosts() {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); } catch { return []; }
}
function savePosts(posts) {
  localStorage.setItem(CAL_KEY, JSON.stringify(posts));
}

export default function ContentCalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState(getPosts);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product: '', platform: 'TikTok', note: '', done: false });

  useEffect(() => { document.title = 'Content Calendar — OpenThaiAi'; }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const postsOnDate = (d) => posts.filter(p => p.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  const openAdd = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setForm({ product: '', platform: 'TikTok', note: '', done: false });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.product.trim()) { toast.error('กรุณาใส่ชื่อสินค้า/คอนเทนต์'); return; }
    const newPost = { id: Date.now(), date: selectedDate, ...form };
    const updated = [...posts, newPost];
    setPosts(updated); savePosts(updated);
    setShowModal(false);
    toast.success(`📅 เพิ่มแผน ${form.platform} สำหรับ "${form.product}" แล้ว`);
  };

  const toggleDone = (id) => {
    const updated = posts.map(p => p.id === id ? { ...p, done: !p.done } : p);
    setPosts(updated); savePosts(updated);
  };

  const deletePost = (id) => {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated); savePosts(updated);
    toast.warn('🗑 ลบแผนโพสต์แล้ว');
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const totalPosts = posts.filter(p => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
  const donePosts = posts.filter(p => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && p.done).length;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>📅 Content Calendar</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>วางแผนโพสต์ · {totalPosts} แผน · {donePosts} เสร็จแล้ว</div>
        </div>
        <button onClick={() => navigate('/ai-generator')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          + สร้างคอนเทนต์
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 5% 0' }}>
        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{MONTHS_TH[month]}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{year + 543}</div>
          </div>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>›</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
          {PLATFORMS.map(p => {
            const cnt = posts.filter(x => x.platform === p && x.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
            if (!cnt) return null;
            return (
              <div key={p} style={{ background: `${PLATFORM_COLOR[p]}15`, border: `1px solid ${PLATFORM_COLOR[p]}44`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: PLATFORM_COLOR[p] }}>{cnt}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{p}</div>
              </div>
            );
          }).filter(Boolean)}
        </div>

        {/* Calendar Grid */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {DAYS_TH.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, color: d === 'อา' || d === 'ส' ? '#fe2c55' : '#64748b' }}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {Array(firstDay).fill(null).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 80, borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
            {Array(daysInMonth).fill(null).map((_, idx) => {
              const d = idx + 1;
              const dayPosts = postsOnDate(d);
              const isToday = now.getDate() === d && now.getMonth() === month && now.getFullYear() === year;
              const col = (firstDay + idx) % 7;
              return (
                <div key={d} onClick={() => openAdd(d)}
                  style={{ minHeight: 80, borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: 6, cursor: 'pointer', transition: 'background .15s', background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.08)' : 'transparent'}>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 900 : 500, color: isToday ? '#a5b4fc' : col === 0 || col === 6 ? '#fe2c55' : '#94a3b8', marginBottom: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#6366f1' : 'transparent', borderRadius: '50%' }}>{d}</div>
                  {dayPosts.slice(0, 3).map(p => (
                    <div key={p.id} onClick={e => { e.stopPropagation(); toggleDone(p.id); }}
                      style={{ background: `${PLATFORM_COLOR[p.platform]}22`, borderLeft: `3px solid ${PLATFORM_COLOR[p.platform]}`, borderRadius: '0 4px 4px 0', padding: '2px 5px', marginBottom: 2, fontSize: 10, color: p.done ? '#475569' : '#f8fafc', textDecoration: p.done ? 'line-through' : 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      {p.done ? '✅' : '📌'} {p.product}
                    </div>
                  ))}
                  {dayPosts.length > 3 && <div style={{ fontSize: 9, color: '#64748b' }}>+{dayPosts.length - 3} อื่นๆ</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        {posts.filter(p => !p.done && p.date >= `${year}-${String(month + 1).padStart(2, '0')}-01`).length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 12 }}>📋 แผนที่รอดำเนินการ</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {posts.filter(p => !p.done && p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLOR[p.platform], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.product}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{p.platform} · {p.date} {p.note && `· ${p.note}`}</div>
                  </div>
                  <button onClick={() => toggleDone(p.id)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '4px 10px', color: '#34d399', fontSize: 12, cursor: 'pointer' }}>✅ เสร็จ</button>
                  <button onClick={() => deletePost(p.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 10px', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Post Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '28px', maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📌 เพิ่มแผนโพสต์ — {selectedDate}</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>สินค้า / หัวข้อ *</label>
                <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="เช่น ผ้าไหมอุบล" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>แพลตฟอร์ม</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                      style={{ borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.platform === p ? PLATFORM_COLOR[p] : 'rgba(255,255,255,0.1)'}`, background: form.platform === p ? `${PLATFORM_COLOR[p]}22` : 'transparent', color: form.platform === p ? '#f8fafc' : '#64748b' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>โน้ต (ไม่บังคับ)</label>
                <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="เช่น โพสต์ตอน 19:00น." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={handleSave} style={{ flex: 1, background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                📌 เพิ่มแผน
              </button>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 20px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
