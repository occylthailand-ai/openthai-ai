import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const PLATFORMS = [
  { id: 'tiktok',    icon: '▶️',  label: 'TikTok',    color: '#fe2c55' },
  { id: 'facebook',  icon: '👥',  label: 'Facebook',  color: '#1877f2' },
  { id: 'line',      icon: '💚',  label: 'LINE',      color: '#06c755' },
  { id: 'instagram', icon: '📸',  label: 'Instagram', color: '#e1306c' },
  { id: 'shopee',    icon: '🟠',  label: 'Shopee',    color: '#f97316' },
  { id: 'lazada',    icon: '🔵',  label: 'Lazada',    color: '#6366f1' },
  { id: 'x',         icon: '✖️',  label: 'X / Twitter', color: '#fff' },
  { id: 'linkedin',  icon: '💼',  label: 'LinkedIn',  color: '#0a66c2' },
];

const AUDIENCES = ['ผู้ผลิต','ผู้ขาย','ผู้บริโภค','ตัวแทนจำหน่าย','ตัวแทนข้ามชาติ','SME ไทย','เกษตรกรรม'];
const STATUS_COLOR = { pending: '#f59e0b', published: '#10b981', cancelled: '#ef4444' };
const STATUS_LABEL = { pending: '⏳ รอโพสต์', published: '✅ โพสต์แล้ว', cancelled: '❌ ยกเลิก' };

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      style={{ background: c ? '#10b981' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '3px 10px' }}>
      {c ? '✓' : '⧉'}
    </button>
  );
}

export default function SchedulerPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ platform: 'tiktok', audience: 'ผู้บริโภค', language: 'thai', content: '', scheduled_at: '' });
  const [tab, setTab] = useState('queue');

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadPosts = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/api/scheduler/list'));
      const d = await r.json();
      if (d.ok) setPosts(d.posts);
    } catch (_) {}
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const submit = async () => {
    if (!form.content.trim() || !form.scheduled_at) return;
    setLoading(true);
    try {
      const r = await fetch(apiUrl('/api/scheduler/create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) { setPosts(prev => [d.post, ...prev]); setForm(f => ({ ...f, content: '', scheduled_at: '' })); setTab('queue'); }
    } catch (_) {}
    setLoading(false);
  };

  const execute = async (id) => {
    setPosting(id);
    try {
      const r = await fetch(apiUrl(`/api/scheduler/execute/${id}`), { method: 'POST' });
      const d = await r.json();
      if (d.ok) setPosts(prev => prev.map(p => p.id === id ? d.post : p));
    } catch (_) {}
    setPosting(null);
  };

  const remove = async (id) => {
    try {
      await fetch(apiUrl(`/api/scheduler/${id}`), { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (_) {}
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);
  const pl = PLATFORMS.find(p => p.id === form.platform) || PLATFORMS[0];

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
    lbl: { fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' },
    btn: (c) => ({ background: c, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: '11px 22px' }),
    tab: (a) => ({ background: tab === a ? 'rgba(99,102,241,0.2)' : 'transparent', border: tab === a ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: tab === a ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 18px' }),
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📅 Auto-Post Scheduler
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>วางตารางโพสต์สื่อลง Platform อัตโนมัติ · {posts.length} โพสต์ในคิว</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['queue','📋 คิวโพสต์'],['create','✏️ สร้างโพสต์']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={s.tab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'create' && (
          <div style={s.card}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>✏️ สร้างโพสต์ใหม่</h3>

            {/* Platform */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.lbl}>Platform</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setF('platform', p.id)} style={{
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: form.platform === p.id ? 700 : 400,
                    background: form.platform === p.id ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                    color: form.platform === p.id ? '#fff' : '#64748b',
                    border: form.platform === p.id ? `1px solid ${p.color}60` : '1px solid transparent',
                  }}>{p.icon} {p.label}</button>
                ))}
              </div>
            </div>

            {/* Audience + Language */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={s.lbl}>กลุ่มเป้าหมาย</label>
                <select value={form.audience} onChange={e => setF('audience', e.target.value)} style={s.inp}>
                  {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={s.lbl}>ภาษา</label>
                <select value={form.language} onChange={e => setF('language', e.target.value)} style={s.inp}>
                  <option value="thai">🇹🇭 ภาษาไทย</option>
                  <option value="english">🇬🇧 English</option>
                  <option value="chinese">🇨🇳 中文</option>
                  <option value="trilingual">🌐 3 ภาษารวม</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.lbl}>เนื้อหาโพสต์</label>
              <textarea value={form.content} onChange={e => setF('content', e.target.value)}
                rows={6} placeholder={`วางเนื้อหาที่ต้องการโพสต์บน ${pl.label}...`}
                style={{ ...s.inp, resize: 'vertical', lineHeight: 1.6 }} />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', marginTop: 4 }}>{form.content.length} ตัวอักษร</div>
            </div>

            {/* Schedule Time */}
            <div style={{ marginBottom: 18 }}>
              <label style={s.lbl}>กำหนดเวลาโพสต์</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setF('scheduled_at', e.target.value)} style={s.inp} />
            </div>

            <button onClick={submit} disabled={loading || !form.content.trim() || !form.scheduled_at} style={{ ...s.btn('#6366f1'), opacity: (!form.content.trim() || !form.scheduled_at) ? 0.5 : 1 }}>
              {loading ? '⏳ กำลังบันทึก...' : `📅 เพิ่มในคิว ${pl.icon} ${pl.label}`}
            </button>
          </div>
        )}

        {tab === 'queue' && (
          <>
            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['all','ทั้งหมด'],['pending','รอโพสต์'],['published','โพสต์แล้ว']].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  ...s.tab(k === filter ? 'queue' : '_'),
                  background: filter === k ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: filter === k ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                  color: filter === k ? '#a5b4fc' : '#64748b',
                }}>{l} ({k === 'all' ? posts.length : posts.filter(p => p.status === k).length})</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: 40, color: '#475569' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div>ยังไม่มีโพสต์ในคิว — ไปสร้างโพสต์แรกได้เลย!</div>
                <button onClick={() => setTab('create')} style={{ ...s.btn('#6366f1'), marginTop: 16, fontSize: 13 }}>✏️ สร้างโพสต์</button>
              </div>
            ) : filtered.map(post => {
              const p = PLATFORMS.find(pl => pl.id === post.platform) || PLATFORMS[0];
              return (
                <div key={post.id} style={{ ...s.card, borderLeft: `3px solid ${STATUS_COLOR[post.status] || '#475569'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{post.audience} · {post.language}</div>
                      </div>
                      <span style={{ background: `${STATUS_COLOR[post.status]}20`, color: STATUS_COLOR[post.status], border: `1px solid ${STATUS_COLOR[post.status]}40`, borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                        {STATUS_LABEL[post.status] || post.status}
                      </span>
                    </div>
                    <CopyBtn text={post.content} />
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-line', maxHeight: 120, overflowY: 'auto' }}>
                    {post.content}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      📅 {new Date(post.scheduled_at).toLocaleString('th-TH')}
                      {post.reach_mock && <span style={{ marginLeft: 12, color: '#10b981' }}>👁 {post.reach_mock.toLocaleString()} reach</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {post.status === 'pending' && (
                        <button onClick={() => execute(post.id)} disabled={posting === post.id} style={{ ...s.btn('#10b981'), fontSize: 12, padding: '6px 14px' }}>
                          {posting === post.id ? '⏳' : '🚀 โพสต์ตอนนี้'}
                        </button>
                      )}
                      <button onClick={() => remove(post.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
