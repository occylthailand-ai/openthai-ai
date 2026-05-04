import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = {
  stats: {
    users: 1247, users_today: 34,
    content: 28941, content_today: 412,
    affiliates: 87, affiliates_active: 63,
    revenue: 42850, revenue_month: 18200,
  },
  users: [
    { id: 'U001', name: 'คุณแพร', email: 'prae@example.com', plan: 'pro', joined: '2026-04-01', content: 142, status: 'active' },
    { id: 'U002', name: 'คุณมิน', email: 'min@example.com', plan: 'business', joined: '2026-04-05', content: 389, status: 'active' },
    { id: 'U003', name: 'คุณโจ', email: 'joe@example.com', plan: 'free', joined: '2026-05-01', content: 3, status: 'active' },
    { id: 'U004', name: 'คุณนก', email: 'nok@example.com', plan: 'pro', joined: '2026-03-15', content: 256, status: 'suspended' },
    { id: 'U005', name: 'คุณต้น', email: 'ton@example.com', plan: 'pro', joined: '2026-04-20', content: 78, status: 'active' },
  ],
  affiliates: [
    { id: 'A001', name: 'คุณแพร', ref: 'PRAEKH1', tier: 'pro', sales: 23, earned: 2070, status: 'active' },
    { id: 'A002', name: 'คุณมิน', ref: 'MINCH2', tier: 'elite', sales: 67, earned: 8040, status: 'active' },
    { id: 'A003', name: 'คุณโจ', ref: 'JOETH3', tier: 'starter', sales: 4, earned: 180, status: 'active' },
  ],
  content: [
    { id: 'C001', user: 'คุณแพร', product: 'ผ้าไหมอุบล', platform: 'TikTok', score: 9.2, time: '2 นาทีที่แล้ว' },
    { id: 'C002', user: 'คุณมิน', product: 'น้ำพริกป้าแดง', platform: 'Facebook', score: 8.7, time: '15 นาทีที่แล้ว' },
    { id: 'C003', user: 'คุณโจ', product: 'กาแฟดอยช้าง', platform: 'TikTok', score: 9.5, time: '1 ชม.ที่แล้ว' },
    { id: 'C004', user: 'คุณต้น', product: 'เซรั่มข้าวหอม', platform: 'Instagram', score: 8.1, time: '2 ชม.ที่แล้ว' },
  ],
};

const PLAN_COLOR = { free: '#64748b', pro: '#6366f1', business: '#f59e0b' };
const TIER_COLOR = { starter: '#10b981', pro: '#6366f1', elite: '#f59e0b' };
const STATUS_COLOR = { active: '#10b981', suspended: '#ef4444', inactive: '#64748b' };

// ── Admin password gate ───────────────────────────────────────────────────────
const ADMIN_KEY = 'openthai-admin-2026'; // เปลี่ยนใน production

export default function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_ok') === '1');
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [data] = useState(MOCK);

  useEffect(() => { document.title = 'Admin Panel — OpenThai AI'; }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_KEY) { sessionStorage.setItem('admin_ok', '1'); setAuthed(true); }
    else { setPwErr('รหัสผ่านไม่ถูกต้อง'); }
  };

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#080812', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ ...glass, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
        <h2 style={{ margin: '0 0 4px', fontWeight: 900 }}>Admin Panel</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>OpenThai AI — เฉพาะผู้ดูแลระบบ</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="password" placeholder="Admin Password" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ ...inputSt, textAlign: 'center', letterSpacing: 4 }} />
          {pwErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{pwErr}</div>}
          <button type="submit" style={primaryBtn}>เข้าสู่ระบบ Admin →</button>
        </form>
      </div>
    </div>
  );

  const filteredUsers = data.users.filter((u) =>
    !search || u.name.includes(search) || u.email.includes(search)
  );

  // ── Main Admin UI ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,8,18,0.9)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={navBtn}>← Site</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>🛠️ Admin Panel</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#64748b' }}>🟢 Live — {new Date().toLocaleDateString('th-TH')}</span>
        <button onClick={() => { sessionStorage.removeItem('admin_ok'); setAuthed(false); }} style={{ ...navBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Logout</button>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* OVERVIEW STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: '👥', label: 'ผู้ใช้ทั้งหมด', v: data.stats.users.toLocaleString(), sub: `+${data.stats.users_today} วันนี้`, c: '#6366f1' },
            { icon: '⚡', label: 'คอนเทนต์สร้างแล้ว', v: data.stats.content.toLocaleString(), sub: `+${data.stats.content_today} วันนี้`, c: '#10b981' },
            { icon: '🤝', label: 'Affiliates', v: data.stats.affiliates, sub: `${data.stats.affiliates_active} active`, c: '#f59e0b' },
            { icon: '💰', label: 'รายได้รวม (฿)', v: `฿${data.stats.revenue.toLocaleString()}`, sub: `฿${data.stats.revenue_month.toLocaleString()} เดือนนี้`, c: '#fe2c55' },
          ].map((s) => (
            <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[['overview','📊 ภาพรวม'],['users','👥 Users'],['affiliates','🤝 Affiliates'],['content','⚡ Content'],['settings','⚙️ Settings']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...tabBtn, background: tab === id ? 'rgba(99,102,241,0.2)' : 'transparent', border: `1px solid ${tab === id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, color: tab === id ? '#a5b4fc' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>⚡ คอนเทนต์ล่าสุด</div>
              {data.content.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.product}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.user} · {c.time}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', borderRadius: 6, padding: '2px 8px', color: '#a5b4fc' }}>{c.platform}</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{c.score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>💰 Top Affiliates</div>
              {data.affiliates.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>REF: {a.ref}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>฿{a.earned.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: TIER_COLOR[a.tier] }}>{a.tier}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: USERS */}
        {tab === 'users' && (
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>👥 Users ({data.users.length})</div>
              <input placeholder="🔍 ค้นหาชื่อ / อีเมล" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputSt, width: 220, textAlign: 'left', letterSpacing: 0, padding: '8px 14px', fontSize: 13 }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['ID','ชื่อ','อีเมล','แพ็กเกจ','คอนเทนต์','สมัคร','สถานะ','จัดการ'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11 }}>{u.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: `${PLAN_COLOR[u.plan]}22`, color: PLAN_COLOR[u.plan], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${PLAN_COLOR[u.plan]}44` }}>{u.plan}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{u.content}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{u.joined}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: STATUS_COLOR[u.status], fontSize: 11, fontWeight: 600 }}>● {u.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button style={{ ...smallBtn, fontSize: 11, padding: '4px 10px' }}>แก้ไข</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: AFFILIATES */}
        {tab === 'affiliates' && (
          <div style={glass}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>🤝 Affiliate Management</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['ชื่อ','Ref Code','Tier','ยอดขาย','รายได้รวม','สถานะ','จ่ายเงิน'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.affiliates.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a5b4fc', letterSpacing: 2 }}>{a.ref}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: TIER_COLOR[a.tier], fontWeight: 700, textTransform: 'capitalize' }}>{a.tier}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{a.sales}</td>
                      <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>฿{a.earned.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: STATUS_COLOR[a.status], fontSize: 11 }}>● {a.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button style={{ ...smallBtn, fontSize: 11, padding: '4px 10px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>💸 จ่าย</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: CONTENT */}
        {tab === 'content' && (
          <div style={glass}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>⚡ Content Log</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['ID','ผู้ใช้','สินค้า','Platform','AI Score','เวลา'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11 }}>{c.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.user}</td>
                      <td style={{ padding: '10px 12px' }}>{c.product}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: 'rgba(99,102,241,0.15)', borderRadius: 6, padding: '2px 8px', color: '#a5b4fc', fontSize: 11 }}>{c.platform}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: c.score >= 9 ? '#10b981' : c.score >= 8 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{c.score}/10</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{c.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { title: '🤖 AI Engine', items: [['Gemini API Key', 'ว่าง — ใช้ Mock mode', '#f59e0b'], ['Model', 'gemini-1.5-flash', '#10b981'], ['Mode', 'Mock Fallback', '#f59e0b']] },
              { title: '📧 Email (SMTP)', items: [['Host', 'smtp.gmail.com', '#10b981'], ['User', 'occylthailand@gmail.com', '#10b981'], ['Password', 'ยังไม่ได้ตั้ง', '#ef4444']] },
              { title: '🔐 Auth', items: [['JWT Secret', 'ตั้งแล้ว ✅', '#10b981'], ['Google OAuth', 'ยังไม่ได้ตั้ง', '#f59e0b']] },
            ].map((section) => (
              <div key={section.title} style={glass}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>{section.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {section.items.map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8' }}>{k}</span>
                      <span style={{ color: c, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ ...glass, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: '#fca5a5' }}>⚠️ ต้องดำเนินการ</div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#94a3b8', fontSize: 13, lineHeight: 2 }}>
                <li>เพิ่ม <code style={{ color: '#fca5a5' }}>GEMINI_API_KEY</code> ใน backend/.env → <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>aistudio.google.com</a></li>
                <li>เพิ่ม <code style={{ color: '#fca5a5' }}>SMTP_PASS</code> (Gmail App Password) → <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>myaccount.google.com/apppasswords</a></li>
                <li>Push code ขึ้น GitHub → รัน <code style={{ color: '#fca5a5' }}>gh auth login</code></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const glass = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' };
const smallBtn = { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const tabBtn = { borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const inputSt = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none' };
