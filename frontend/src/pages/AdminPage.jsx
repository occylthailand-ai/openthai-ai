import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ADM } from '../i18n/admin';

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

const PLAN_COLOR = { free: '#64748b', pro: '#6366f1', premier: '#f59e0b', business: '#f59e0b' };
const TIER_COLOR = { starter: '#10b981', pro: '#6366f1', elite: '#f59e0b' };
const STATUS_COLOR = { active: '#10b981', suspended: '#ef4444', inactive: '#64748b', approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' };

// ── Admin password gate ───────────────────────────────────────────────────────
// ตั้ง VITE_ADMIN_KEY ตอน build สำหรับ production (การป้องกันจริงอยู่ที่ backend ADMIN_KEY)
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'openthai-admin-2026';

export default function AdminPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = ADM[lang] || ADM.th;
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_ok') === '1');
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [data] = useState(MOCK);
  const [sales, setSales] = useState(null);     // ยอดขายจริงจาก backend
  const [salesErr, setSalesErr] = useState('');
  const [creds, setCreds] = useState(null);     // สรุปเครดิต/รางวัลจาก backend
  const [credsErr, setCredsErr] = useState('');
  const [prods, setProds] = useState(null);     // ผู้ผลิตที่สมัคร
  const [prodQ, setProdQ] = useState('');       // ค้นหาผู้ผลิต (รวม pending)
  const [ords, setOrds] = useState(null);       // คำสั่งซื้อ
  const [leads, setLeads] = useState(null);     // ลูกค้า/ลีดรวมทุกแหล่ง
  const [leadQ, setLeadQ] = useState('');
  const [leadType, setLeadType] = useState('all');
  const [bcOpen, setBcOpen] = useState(false);  // broadcast email modal
  const [inv, setInv] = useState(null);         // คลังสินค้า (products)
  const [invSum, setInvSum] = useState(null);   // สรุปคลัง
  const [salesRep, setSalesRep] = useState(null); // ยอดขาย (ขายแล้ว/เหลือ/แพลตฟอร์ม)
  const [prodEdit, setProdEdit] = useState(null); // สินค้าที่กำลังแก้ (object) / null
  const [cars, setCars] = useState(null);         // ผู้จัดส่ง (carriers)
  const [jobs, setJobs] = useState(null);         // งานจัดส่ง (delivery jobs)
  const [logiSum, setLogiSum] = useState(null);   // สรุปขนส่ง

  useEffect(() => { document.title = 'Admin Panel — Openthai.ai'; }, []);

  const adminKey = () => sessionStorage.getItem('admin_key') || ADMIN_KEY;
  const loadProducers = () => fetch(apiUrl('/api/producers/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setProds(d.producers); }).catch(() => {});
  const loadOrders = () => fetch(apiUrl('/api/orders/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setOrds(d.orders); }).catch(() => {});
  const loadLeads = () => fetch(apiUrl('/api/leads/admin/search'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setLeads(d); }).catch(() => {});
  const loadInventory = () => {
    fetch(apiUrl('/api/inventory/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setInv(d.products); }).catch(() => {});
    fetch(apiUrl('/api/inventory/admin/summary'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setInvSum(d); }).catch(() => {});
    fetch(apiUrl('/api/inventory/admin/sales-report'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setSalesRep(d); }).catch(() => {});
  };
  const loadLogistics = () => {
    fetch(apiUrl('/api/logistics/admin/carriers'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setCars(d.carriers); }).catch(() => {});
    fetch(apiUrl('/api/logistics/admin/jobs'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setJobs(d.jobs); }).catch(() => {});
    fetch(apiUrl('/api/logistics/admin/summary'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setLogiSum(d); }).catch(() => {});
  };
  useEffect(() => { if (authed) { loadProducers(); loadOrders(); loadLeads(); loadInventory(); loadLogistics(); } }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProduct = async (data) => {
    const r = await fetch(apiUrl('/api/inventory/admin/upsert'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify(data) }).then(x => x.json());
    if (r.success) { setProdEdit(null); loadInventory(); } else alert(r.error || 'บันทึกไม่สำเร็จ');
  };
  const adjustStock = async (id) => {
    const v = window.prompt('ปรับสต๊อก: ใส่ +จำนวน (เติม) หรือ -จำนวน (ตัด)'); if (!v) return;
    const delta = parseInt(v, 10); if (!delta) return;
    const reason = window.prompt('เหตุผล (เช่น เติมของ, ของเสีย):') || '';
    await fetch(apiUrl('/api/inventory/admin/adjust'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, delta, type: delta > 0 ? 'restock' : 'adjust', reason }) });
    loadInventory();
  };
  const removeProduct = async (id) => {
    if (!window.confirm('ลบสินค้านี้?')) return;
    await fetch(apiUrl('/api/inventory/admin/remove'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id }) });
    loadInventory();
  };

  const approveProducer = async (email, status) => {
    await fetch(apiUrl('/api/producers/admin/status'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ email, status }) });
    loadProducers();
  };
  const setOrderStatus = async (id, status) => {
    await fetch(apiUrl('/api/orders/admin/status'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, status }) });
    loadOrders();
  };
  const shipOrder = async (id) => {
    const carrier = window.prompt('ขนส่ง (เช่น Kerry, Flash, ไปรษณีย์ไทย):'); if (carrier === null) return;
    const tracking_no = window.prompt('เลขพัสดุ (tracking number):'); if (tracking_no === null) return;
    await fetch(apiUrl('/api/orders/admin/ship'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, carrier, tracking_no }) });
    loadOrders();
  };
  const deliverOrder = async (id) => {
    const received_by = window.prompt('เซ็นรับโดย (ชื่อผู้รับ) — เว้นว่างถ้าฝากพัสดุ:'); if (received_by === null) return;
    const drop_off = received_by ? '' : (window.prompt('จุดฝากพัสดุ (เช่น ตู้ล็อกเกอร์, รปภ.):') || '');
    await fetch(apiUrl('/api/orders/admin/deliver'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, received_by, drop_off }) });
    loadOrders();
  };

  // ── Logistics handlers ──────────────────────────────────────────────────────
  const carrierStatus = async (id, status) => {
    await fetch(apiUrl('/api/logistics/admin/carrier-status'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, status }) });
    loadLogistics();
  };
  const carrierAvail = async (id, available) => {
    await fetch(apiUrl('/api/logistics/admin/carrier-availability'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, available }) });
    loadLogistics();
  };
  const assignJob = async (id) => {
    const ready = (cars || []).filter((c) => ['approved', 'verified'].includes(c.status));
    if (!ready.length) { alert('ยังไม่มีผู้จัดส่งที่อนุมัติแล้ว — อนุมัติผู้จัดส่งก่อน'); return; }
    const list = ready.map((c, i) => `${i + 1}. ${c.business_name || c.contact_name} (${(c.vehicles || []).join(',')})`).join('\n');
    const pick = window.prompt(`จ่ายงานให้ผู้จัดส่ง — พิมพ์หมายเลข:\n${list}`); if (!pick) return;
    const c = ready[parseInt(pick, 10) - 1]; if (!c) return;
    await fetch(apiUrl('/api/logistics/admin/job-assign'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, carrier_id: c.id }) });
    loadLogistics();
  };
  const jobStatus = async (id, status) => {
    await fetch(apiUrl('/api/logistics/admin/job-status'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, status }) });
    loadLogistics();
  };
  const jobDeliver = async (id) => {
    const received_by = window.prompt('เซ็นรับโดย (ชื่อผู้รับ) — เว้นว่างถ้าฝากพัสดุ:'); if (received_by === null) return;
    const drop_off = received_by ? '' : (window.prompt('จุดฝากพัสดุ (เช่น ตู้ล็อกเกอร์, รปภ.):') || '');
    await fetch(apiUrl('/api/logistics/admin/job-deliver'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id, received_by, drop_off }) });
    loadLogistics();
  };

  // ดึงสรุปยอดขายจริงเมื่อล็อกอินแล้ว (ใช้ admin key เป็น x-admin-key header)
  useEffect(() => {
    if (!authed) return;
    const key = sessionStorage.getItem('admin_key') || ADMIN_KEY;
    fetch(apiUrl('/api/payment/admin/summary'), { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => { if (d.success) setSales(d); else setSalesErr(d.message || 'โหลดยอดขายไม่สำเร็จ'); })
      .catch(() => setSalesErr('เชื่อมต่อ backend ไม่ได้'));
  }, [authed]);

  // ดึงสรุปเครดิต/รางวัลจริงเมื่อล็อกอินแล้ว
  useEffect(() => {
    if (!authed) return;
    const key = sessionStorage.getItem('admin_key') || ADMIN_KEY;
    fetch(apiUrl('/api/credits/admin/summary'), { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => { if (d.success) setCreds(d); else setCredsErr(d.message || 'โหลดเครดิตไม่สำเร็จ'); })
      .catch(() => setCredsErr('เชื่อมต่อ backend ไม่ได้'));
  }, [authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_KEY) { sessionStorage.setItem('admin_ok', '1'); sessionStorage.setItem('admin_key', pw); setAuthed(true); }
    else { setPwErr(T.gate.err); }
  };

  const baht = (n) => `฿${Number(n || 0).toLocaleString('th-TH')}`;
  const soldMap = {}; (salesRep?.rows || []).forEach((r) => { soldMap[r.id] = r; });

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#080812', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ ...glass, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
        <h2 style={{ margin: '0 0 4px', fontWeight: 900 }}>Admin Panel</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{T.gate.sub}</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="password" placeholder="Admin Password" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ ...inputSt, textAlign: 'center', letterSpacing: 4 }} />
          {pwErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{pwErr}</div>}
          <button type="submit" style={primaryBtn}>{T.gate.btn}</button>
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
        <LanguageSwitcher />
        <span style={{ fontSize: 12, color: '#64748b' }}>🟢 {T.live} — {new Date().toLocaleDateString()}</span>
        <button onClick={() => { sessionStorage.removeItem('admin_ok'); setAuthed(false); }} style={{ ...navBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Logout</button>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* OVERVIEW STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: '👥', label: T.stat.users, v: data.stats.users.toLocaleString(), sub: `+${data.stats.users_today} ${T.stat.today}`, c: '#6366f1' },
            { icon: '⚡', label: T.stat.content, v: data.stats.content.toLocaleString(), sub: `+${data.stats.content_today} ${T.stat.today}`, c: '#10b981' },
            { icon: '🤝', label: T.stat.aff, v: data.stats.affiliates, sub: `${data.stats.affiliates_active} active`, c: '#f59e0b' },
            { icon: '💰', label: T.stat.revenue, v: baht(sales ? sales.stats.revenue_total : data.stats.revenue), sub: `${baht(sales ? sales.stats.revenue_month : data.stats.revenue_month)} ${T.stat.month}`, c: '#fe2c55' },
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
          {Object.keys(T.tabs).map((id) => [id, T.tabs[id]]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...tabBtn, background: tab === id ? 'rgba(99,102,241,0.2)' : 'transparent', border: `1px solid ${tab === id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, color: tab === id ? '#a5b4fc' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>{T.ov.recent}</div>
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
              <div style={{ fontWeight: 700, marginBottom: 14 }}>{T.ov.topaff}</div>
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

        {/* TAB: ANALYTICS — funnel รวมจากข้อมูลจริง */}
        {tab === 'analytics' && (() => {
          const orderCount = ords ? ords.length : (leads?.counts.order ?? 0);
          const revenue = ords ? ords.filter(o => o.status !== 'cancelled').reduce((t, o) => t + (Number(o.amount) || 0), 0) : (sales?.stats.revenue_total ?? 0);
          const prodTotal = prods ? prods.length : 0;
          const prodApproved = prods ? prods.filter(p => p.status === 'approved').length : 0;
          // funnel: ความสนใจ → มีส่วนร่วม → ซื้อ
          const funnel = [
            { label: '📧 Waitlist (สนใจ)', v: leads?.counts.waitlist ?? 0, c: '#06b6d4' },
            { label: '🎁 บัญชีเครดิต (ใช้งาน)', v: creds?.accounts ?? 0, c: '#6366f1' },
            { label: '🎡 หมุนวงล้อ (มีส่วนร่วม)', v: creds?.spun ?? 0, c: '#fe2c55' },
            { label: '📦 ลูกค้าสั่งซื้อ (ซื้อ)', v: orderCount, c: '#10b981' },
          ];
          const max = Math.max(1, ...funnel.map(f => f.v));
          const conv = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');
          const cards = [
            { label: 'รายได้รวม', v: baht(revenue), c: '#10b981' },
            { label: 'ออเดอร์ทั้งหมด', v: orderCount, c: '#34d399' },
            { label: 'ผู้ผลิต (อนุมัติ/สมัคร)', v: `${prodApproved}/${prodTotal}`, c: '#f59e0b' },
            { label: 'Affiliate', v: leads?.counts.affiliate ?? 0, c: '#a5b4fc' },
            { label: 'เครดิตแจกไปแล้ว', v: creds ? creds.totalBalance : 0, c: '#06b6d4' },
            { label: 'ส่วนลดรอใช้', v: creds?.pendingDiscounts ?? 0, c: '#fe2c55' },
          ];
          return (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>📈 Funnel — เส้นทางลูกค้า</div>
              {funnel.map((f, i) => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#cbd5e1' }}>{f.label}</span>
                    <span style={{ fontWeight: 700 }}>{f.v.toLocaleString()}{i > 0 && <span style={{ color: '#64748b', fontWeight: 400, fontSize: 11 }}> · แปลงจากบนสุด {conv(f.v, funnel[0].v)}</span>}</span>
                  </div>
                  <div style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(3, (f.v / max) * 100)}%`, height: '100%', background: f.c, borderRadius: 7, transition: 'width .5s' }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>* รวมจากข้อมูลจริง — ยิ่งทำการตลาดดึงคนเข้ามามาก funnel ยิ่งกว้าง</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
              {cards.map((s) => (
                <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {sales && Object.keys(sales.by_plan || {}).length > 0 && (
              <div style={glass}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>💳 รายได้ตามแพ็กเกจ</div>
                {Object.entries(sales.by_plan).map(([plan, v]) => (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: PLAN_COLOR[plan] || '#94a3b8', fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                    <span style={{ color: '#64748b' }}>{v.count} ออเดอร์</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{baht(v.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* TAB: SALES — ยอดขายจริงจาก Omise */}
        {tab === 'sales' && (
          <div>
            {salesErr && <div style={{ ...glass, color: '#fca5a5', marginBottom: 16 }}>⚠️ {salesErr}</div>}
            {!sales && !salesErr && <div style={{ ...glass, color: '#64748b' }}>{T.loading}</div>}
            {sales && (
              <>
                {/* สรุปยอด */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'รายได้รวม', v: baht(sales.stats.revenue_total), c: '#10b981' },
                    { label: 'เดือนนี้', v: baht(sales.stats.revenue_month), c: '#6366f1' },
                    { label: 'ชำระสำเร็จ', v: sales.stats.paid_count, c: '#f59e0b' },
                    { label: 'รอชำระ', v: sales.stats.pending_count, c: '#64748b' },
                  ].map((s) => (
                    <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* แยกตามแผน */}
                {Object.keys(sales.by_plan || {}).length > 0 && (
                  <div style={{ ...glass, marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>📦 รายได้ตามแพ็กเกจ</div>
                    {Object.entries(sales.by_plan).map(([plan, v]) => (
                      <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                        <span style={{ color: PLAN_COLOR[plan] || '#94a3b8', fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                        <span style={{ color: '#64748b' }}>{v.count} ออเดอร์</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{baht(v.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* รายการล่าสุด */}
                <div style={glass}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🧾 รายการล่าสุด</div>
                  {sales.recent.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, padding: '12px 0' }}>ยังไม่มีรายการชำระเงิน</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>{['วันที่','แพ็กเกจ','ช่องทาง','อีเมล','ยอด','สถานะ'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {sales.recent.map((r, i) => (
                            <tr key={r.charge_id || i}>
                              <td style={{ padding: '8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.paid_at || r.created_at ? new Date(r.paid_at || r.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                              <td style={{ padding: '8px', color: PLAN_COLOR[r.plan] || '#94a3b8', textTransform: 'capitalize' }}>{r.plan || '-'}</td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>{r.method === 'card' ? '💳 บัตร' : r.method === 'subscription' ? '🔁 Subscription' : '📱 PromptPay'}</td>
                              <td style={{ padding: '8px', color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '-'}</td>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{baht(r.amount_thb)}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: r.status === 'successful' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: r.status === 'successful' ? '#10b981' : '#94a3b8' }}>
                                  {r.status === 'successful' ? 'สำเร็จ' : r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: CREDITS */}
        {tab === 'credits' && (
          <div>
            {credsErr && <div style={{ ...glass, color: '#fca5a5', marginBottom: 16 }}>⚠️ {credsErr}</div>}
            {!creds && !credsErr && <div style={{ ...glass, color: '#64748b' }}>{T.loading}</div>}
            {creds && (
              <>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  โหมดเก็บข้อมูล: <strong style={{ color: creds.mode === 'supabase' ? '#10b981' : '#f59e0b' }}>{creds.mode === 'supabase' ? '🗄️ Supabase (ถาวร)' : '📄 File (ชั่วคราว)'}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'บัญชีทั้งหมด', v: creds.accounts, c: '#6366f1' },
                    { label: 'เครดิตคงเหลือรวม', v: creds.totalBalance, c: '#10b981' },
                    { label: 'หมุนวงล้อแล้ว', v: creds.spun, c: '#fe2c55' },
                    { label: 'streak ต่อเนื่อง', v: creds.activeStreaks, c: '#f59e0b' },
                    { label: 'streak สูงสุด (วัน)', v: creds.maxStreak, c: '#a5b4fc' },
                    { label: 'ส่วนลดรอใช้', v: creds.pendingDiscounts, c: '#06b6d4' },
                  ].map((s) => (
                    <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(creds.prizes || {}).length > 0 && (
                  <div style={glass}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>🎡 รางวัลที่แจกไปแล้ว</div>
                    {Object.entries(creds.prizes).sort((a, b) => b[1] - a[1]).map(([prize, count]) => (
                      <div key={prize} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                        <span style={{ color: '#cbd5e1' }}>{prize}</span>
                        <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{count} ครั้ง</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: PRODUCERS */}
        {tab === 'producers' && (() => {
          const q = prodQ.trim().toLowerCase();
          const list = (prods || []).filter((p) => !q || [p.company, p.email, p.contact_name, p.product_name, p.category, p.status].some((f) => (f || '').toString().toLowerCase().includes(q)));
          return (
          <div style={glass}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>🏭 ผู้ผลิต {prods ? `(${list.length}/${prods.length})` : ''}</div>
              <span style={{ flex: 1 }} />
              <input value={prodQ} onChange={(e) => setProdQ(e.target.value)} placeholder="🔍 ค้นหา (ชื่อ/อีเมล/สินค้า/สถานะ — รวม pending)"
                style={{ ...inputSt, padding: '8px 12px', fontSize: 13, minWidth: 240, flex: 1, maxWidth: 360 }} />
            </div>
            {!prods && <div style={{ color: '#64748b', fontSize: 13 }}>กำลังโหลด…</div>}
            {prods && prods.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีผู้สมัคร</div>}
            {prods && prods.length > 0 && list.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ไม่พบผู้ผลิตที่ตรงกับ "{prodQ}"</div>}
            {list.map((p) => (
              <div key={p.email} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{p.company} <span style={{ color: '#64748b', fontWeight: 400 }}>· {p.category}</span></div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{p.contact_name} · {p.email} · {p.phone || '-'}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.product_name}{p.price ? ` · ฿${Number(p.price).toLocaleString('th-TH')}` : ''}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: STATUS_COLOR[p.status] || '#94a3b8' }}>{p.status}</span>
                {p.status !== 'approved' && <button onClick={() => approveProducer(p.email, 'approved')} style={miniBtn('#10b981')}>อนุมัติ</button>}
                {p.status !== 'rejected' && <button onClick={() => approveProducer(p.email, 'rejected')} style={miniBtn('#ef4444')}>ปฏิเสธ</button>}
              </div>
            ))}
          </div>
          );
        })()}

        {/* TAB: INVITE PRODUCERS */}
        {tab === 'invite' && <InvitePanel />}

        {/* TAB: ORDERS */}
        {tab === 'orders' && (
          <div style={glass}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>📦 คำสั่งซื้อ {ords ? `(${ords.length})` : ''}</div>
            {!ords && <div style={{ color: '#64748b', fontSize: 13 }}>กำลังโหลด…</div>}
            {ords && ords.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีคำสั่งซื้อ</div>}
            {ords && ords.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{o.product_name} <span style={{ color: '#10b981' }}>×{o.qty}</span> {o.amount ? `· ฿${Number(o.amount).toLocaleString('th-TH')}` : ''}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{o.customer_name} · {o.contact} · ผู้ผลิต {o.producer_email}</div>
                  {o.address && <div style={{ color: '#94a3b8', fontSize: 12 }}>📍 {o.address}</div>}
                  {(o.carrier || o.tracking_no) && <div style={{ color: '#a5b4fc', fontSize: 12 }}>🚚 {o.carrier} {o.tracking_no}</div>}
                  {o.received_by && <div style={{ color: '#6ee7b7', fontSize: 12 }}>✍️ เซ็นรับ: {o.received_by}</div>}
                  {o.drop_off && <div style={{ color: '#6ee7b7', fontSize: 12 }}>📦 ฝากที่: {o.drop_off}</div>}
                  {o.note && <div style={{ color: '#94a3b8', fontSize: 12 }}>📝 {o.note}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)} style={{ ...inputSt, width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                    {['new', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => shipOrder(o.id)} style={miniBtn('#6366f1')}>🚚 ส่ง</button>
                    {o.status !== 'delivered' && <button onClick={() => deliverOrder(o.id)} style={miniBtn('#10b981')}>✅ ถึงแล้ว</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: INVENTORY / คลังสินค้า */}
        {tab === 'inventory' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {invSum && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
                {[
                  { label: 'สินค้า (active)', v: `${invSum.active}/${invSum.products}`, c: '#6366f1' },
                  { label: 'สต๊อกรวม (ชิ้น)', v: invSum.totalUnits, c: '#10b981' },
                  { label: 'มูลค่าขาย', v: baht(invSum.valueRetail), c: '#34d399' },
                  { label: 'มูลค่าต้นทุน', v: baht(invSum.valueCost), c: '#f59e0b' },
                  { label: 'ขายไปแล้ว', v: invSum.unitsSold, c: '#a5b4fc' },
                  { label: 'สต๊อกต่ำ', v: invSum.lowStock.length, c: invSum.lowStock.length ? '#ef4444' : '#64748b' },
                ].map((s) => (
                  <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={glass}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>📦 สินค้าในคลัง {inv ? `(${inv.length})` : ''}</div>
                <span style={{ flex: 1 }} />
                <button onClick={() => setProdEdit({})} style={miniBtn('#10b981')}>＋ เพิ่มสินค้า</button>
              </div>
              {!inv && <div style={{ color: '#64748b', fontSize: 13 }}>{T.loading}</div>}
              {inv && inv.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีสินค้า — กด "เพิ่มสินค้า"</div>}
              {inv && inv.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ color: '#475569' }}>{['SKU', 'ชื่อ', 'ราคา', 'ขายแล้ว', 'คงเหลือ', 'สถานะ', ''].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {inv.map((p) => {
                        const low = (p.stock || 0) <= (p.low_stock ?? 0);
                        const sold = soldMap[p.id]?.sold ?? 0;
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{p.sku}</td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{p.name}<div style={{ fontSize: 11, color: '#475569' }}>{p.category} · ต้นทุน {baht(p.cost)}</div></td>
                            <td style={{ padding: '8px' }}>{baht(p.price)}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#a5b4fc' }}>{sold}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: low ? '#ef4444' : '#10b981' }}>{p.stock}{low && ' ⚠️'}</td>
                            <td style={{ padding: '8px' }}><span style={{ fontSize: 11, color: p.status === 'active' ? '#10b981' : '#64748b' }}>● {p.status}</span></td>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                              <button onClick={() => adjustStock(p.id)} style={{ ...miniBtn('#06b6d4'), marginRight: 4 }}>±สต๊อก</button>
                              <button onClick={() => setProdEdit(p)} style={{ ...miniBtn('#6366f1'), marginRight: 4 }}>แก้ไข</button>
                              <button onClick={() => removeProduct(p.id)} style={miniBtn('#ef4444')}>ลบ</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {invSum && invSum.lowStock.length > 0 && (
              <div style={{ ...glass, border: '1px solid rgba(239,68,68,0.25)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#fca5a5' }}>⚠️ สต๊อกใกล้หมด — ควรเติม</div>
                {invSum.lowStock.map((l) => <div key={l.id} style={{ fontSize: 13, color: '#94a3b8', padding: '3px 0' }}>{l.name} ({l.sku}) — เหลือ <strong style={{ color: '#ef4444' }}>{l.stock}</strong> (เตือนที่ {l.low_stock})</div>)}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>📨 ระบบส่งแจ้งเตือนทางอีเมล + LINE อัตโนมัติแล้วตอนสต๊อกแตะจุดเตือน</div>
              </div>
            )}
            {salesRep && Object.keys(salesRep.byPlatform || {}).length > 0 && (
              <div style={glass}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>🌐 ยอดขายตามแพลตฟอร์ม / Affiliate (รวม {salesRep.totalSold} ชิ้น)</div>
                {Object.entries(salesRep.byPlatform).sort((a, b) => b[1] - a[1]).map(([plat, n]) => {
                  const pct = salesRep.totalSold ? Math.round((n / salesRep.totalSold) * 100) : 0;
                  const label = plat.startsWith('ref:') ? `🤝 Affiliate ${plat.slice(4)}` : plat === 'store' ? '🛍️ หน้าร้าน' : `📣 ${plat}`;
                  return (
                    <div key={plat} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}><span style={{ color: '#cbd5e1' }}>{label}</span><span style={{ fontWeight: 700 }}>{n} ({pct}%)</span></div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}><div style={{ width: `${Math.max(3, pct)}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {prodEdit !== null && <ProductFormModal product={prodEdit} onSave={saveProduct} onClose={() => setProdEdit(null)} />}

        {/* TAB: LOGISTICS / ขนส่ง */}
        {tab === 'logistics' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {logiSum && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
                {[
                  { label: 'ผู้จัดส่ง', v: logiSum.carriers, c: '#6366f1' },
                  { label: 'ยืนยันตัวตนแล้ว', v: logiSum.verified, c: '#10b981' },
                  { label: 'พร้อมรับงาน', v: logiSum.available, c: '#34d399' },
                  { label: 'งานจัดส่ง', v: logiSum.jobs, c: '#a5b4fc' },
                  { label: 'ส่งสำเร็จ', v: logiSum.delivered, c: '#10b981' },
                  { label: 'มูลค่าค่าส่ง (GMV)', v: baht(logiSum.gmv), c: '#f59e0b' },
                ].map((s) => (
                  <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Carriers */}
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>🚚 ผู้จัดส่ง / กิจการขนส่ง {cars ? `(${cars.length})` : ''}</div>
              {!cars && <div style={{ color: '#64748b', fontSize: 13 }}>{T.loading}</div>}
              {cars && cars.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีผู้สมัคร — แชร์ลิงก์ /carrier เพื่อรับสมัคร</div>}
              {cars && cars.map((c) => {
                const sc = { pending: '#f59e0b', verified: '#06b6d4', approved: '#10b981', rejected: '#ef4444', suspended: '#94a3b8' }[c.status] || '#64748b';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 700 }}>{c.business_name || c.contact_name} <span style={{ fontSize: 11, color: '#475569' }}>· {c.type}</span> {c.verified && <span style={{ color: '#06b6d4' }}>✔ ยืนยันแล้ว</span>}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>☎️ {c.phone}{c.email ? ` · ✉️ ${c.email}` : ''}{c.line_id ? ` · LINE ${c.line_id}` : ''}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>🚗 {(c.vehicles || []).join(', ')} · 📍 {(c.zones || []).join(', ')}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{c.cod_supported ? '💵 COD ' : ''}{c.express_supported ? '⚡ ด่วน ' : ''}{c.refrigerated ? '❄️ ห้องเย็น ' : ''}{c.license_plate ? `· ทะเบียน ${c.license_plate}` : ''} · ⭐ {c.rating_avg || 0} ({c.rating_count || 0}) · งานสำเร็จ {c.jobs_done || 0}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <select value={c.status} onChange={(e) => carrierStatus(c.id, e.target.value)} style={{ ...inputSt, width: 'auto', padding: '5px 10px', fontSize: 12, color: sc }}>
                        {['pending', 'verified', 'approved', 'rejected', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => carrierAvail(c.id, !c.available)} style={miniBtn(c.available ? '#10b981' : '#64748b')}>{c.available ? '🟢 พร้อมรับงาน' : '⚪ พักรับงาน'}</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Jobs */}
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>📦 งานจัดส่ง {jobs ? `(${jobs.length})` : ''}</div>
              {!jobs && <div style={{ color: '#64748b', fontSize: 13 }}>{T.loading}</div>}
              {jobs && jobs.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีงานจัดส่ง</div>}
              {jobs && jobs.map((j) => {
                const car = (cars || []).find((c) => c.id === j.carrier_id);
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 700 }}>{j.pickup_zone || '-'} → {j.dropoff_zone || '-'} <span style={{ color: '#10b981' }}>฿{Number(j.quote_price).toLocaleString('th-TH')}</span> <span style={{ fontSize: 11, color: '#475569' }}>· {j.vehicle}{j.express ? ' ⚡' : ''}</span></div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>📤 {j.pickup_address}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>📥 {j.dropoff_address} · {j.dropoff_contact}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{j.parcel_desc ? `📦 ${j.parcel_desc} · ` : ''}{j.weight_kg ? `${j.weight_kg} กก. · ` : ''}{j.distance_km ? `${j.distance_km} กม. · ` : ''}{j.cod_amount ? `COD ฿${j.cod_amount} · ` : ''}{j.tracking_no ? `🔖 ${j.tracking_no}` : ''}</div>
                      <div style={{ color: car ? '#a5b4fc' : '#f59e0b', fontSize: 12 }}>{car ? `🚚 ${car.business_name || car.contact_name}` : '⏳ ยังไม่จ่ายงาน'}{j.received_by ? ` · ✍️ ${j.received_by}` : ''}{j.drop_off ? ` · 📦 ${j.drop_off}` : ''}{j.rating ? ` · ⭐ ${j.rating}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <select value={j.status} onChange={(e) => jobStatus(j.id, e.target.value)} style={{ ...inputSt, width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                        {['requested', 'quoted', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => assignJob(j.id)} style={miniBtn('#6366f1')}>🚚 จ่ายงาน</button>
                        {j.status !== 'delivered' && <button onClick={() => jobDeliver(j.id)} style={miniBtn('#10b981')}>✅ ส่งถึง</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {logiSum && Object.keys(logiSum.byZone || {}).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                <div style={glass}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>📍 ผู้จัดส่งตามโซน</div>
                  {Object.entries(logiSum.byZone).sort((a, b) => b[1] - a[1]).map(([z, n]) => (
                    <div key={z} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#cbd5e1' }}><span>{z}</span><span style={{ fontWeight: 700 }}>{n}</span></div>
                  ))}
                </div>
                <div style={glass}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>🚗 ตามยานพาหนะ</div>
                  {Object.entries(logiSum.byVehicle).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
                    <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#cbd5e1' }}><span>{v}</span><span style={{ fontWeight: 700 }}>{n}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: LEADS / CUSTOMERS */}
        {tab === 'leads' && (() => {
          const q = leadQ.trim().toLowerCase();
          const all = leads?.leads || [];
          const list = all.filter((l) => (leadType === 'all' || l.type === leadType) && (!q || [l.name, l.contact, l.detail].some((f) => (f || '').toLowerCase().includes(q))));
          const TYPE_C = { waitlist: '#06b6d4', affiliate: '#f59e0b', order: '#10b981' };
          const exportCsv = () => {
            const rows = [['type', 'name', 'contact', 'detail', 'date'], ...list.map((l) => [l.type, l.name, l.contact, l.detail, l.date])];
            const csv = rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = `openthai-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
          };
          return (
          <div style={glass}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>🎯 ลูกค้า/ลีด {leads ? `(${list.length}/${leads.counts.all})` : ''}</div>
              <span style={{ flex: 1 }} />
              <input value={leadQ} onChange={(e) => setLeadQ(e.target.value)} placeholder="🔍 ค้นหาชื่อ/อีเมล/เบอร์/รายละเอียด" style={{ ...inputSt, padding: '8px 12px', fontSize: 13, minWidth: 200, flex: 1, maxWidth: 300 }} />
              <select value={leadType} onChange={(e) => setLeadType(e.target.value)} style={{ ...inputSt, padding: '8px 12px', fontSize: 13, width: 'auto' }}>
                <option value="all">ทั้งหมด</option><option value="waitlist">Waitlist</option><option value="affiliate">Affiliate</option><option value="order">ลูกค้าสั่งซื้อ</option>
              </select>
              <button onClick={exportCsv} disabled={!list.length} style={miniBtn('#10b981')}>⬇️ CSV</button>
              <button onClick={() => setBcOpen(true)} style={miniBtn('#6366f1')}>📨 ส่งอีเมล</button>
            </div>
            {bcOpen && <BroadcastModal adminKey={adminKey} counts={leads?.counts} onClose={() => setBcOpen(false)} />}
            {leads && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
                {[['waitlist', leads.counts.waitlist], ['affiliate', leads.counts.affiliate], ['order', leads.counts.order]].map(([t, n]) => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 10px', color: TYPE_C[t] }}>{t}: <strong>{n}</strong></span>
                ))}
              </div>
            )}
            {!leads && <div style={{ color: '#64748b', fontSize: 13 }}>{T.loading}</div>}
            {leads && list.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ไม่พบลูกค้า/ลีดที่ตรงกับการค้นหา</div>}
            {list.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ color: '#475569' }}>{['ประเภท', 'ชื่อ', 'ติดต่อ', 'รายละเอียด', 'วันที่'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {list.slice(0, 500).map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px' }}><span style={{ fontSize: 11, color: TYPE_C[l.type] || '#94a3b8', fontWeight: 700 }}>{l.type}</span></td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{l.name || '-'}</td>
                        <td style={{ padding: '8px', color: '#a5b4fc' }}>{l.contact}</td>
                        <td style={{ padding: '8px', color: '#94a3b8' }}>{l.detail}</td>
                        <td style={{ padding: '8px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{l.date ? new Date(l.date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          );
        })()}

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

// ── Invite Panel — ชุดเชิญผู้ผลิต (ลิงก์ + QR + ข้อความสำเร็จรูป) ────────────────
function InvitePanel() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.openthai-ai.com';
  const link = `${origin}/join`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(link)}`;
  const [copied, setCopied] = useState('');
  const copy = (text, id) => { navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 1500); }); };

  const templates = [
    { id: 'tiktok', label: '🎵 TikTok / Reels caption', text:
`📣 ร้านไหน OTOP/แบรนด์ไทยอยากขายดีขึ้น?\nเอาสินค้ามาลงฟรีกับ Openthai.ai — ครีเอเตอร์ 1,200+ คนช่วยทำคอนเทนต์ + ดันยอดขาย\nจ่ายค่าคอมเฉพาะตอนขายได้ 💸\nสมัครฟรี 👉 ${link}\n#OTOP #สินค้าไทย #ขายของออนไลน์` },
    { id: 'fb', label: '📘 Facebook post', text:
`เปิดรับผู้ผลิต/แบรนด์ไทย เข้าร่วม Openthai.ai ฟรี! 🇹🇭\n✅ ครีเอเตอร์ช่วยโปรโมตสินค้าคุณ\n✅ จ่ายค่าคอมเฉพาะเมื่อขายได้\n✅ ไม่มีค่าแรกเข้า\nสมัครเลย: ${link}` },
    { id: 'line', label: '💬 LINE / ข้อความตรง', text:
`สวัสดีค่ะ 🙏 ทาง Openthai.ai เปิดให้ผู้ผลิต/ร้านค้าเอาสินค้ามาขายกับครีเอเตอร์ทั่วไทย ฟรีไม่มีค่าแรกเข้า จ่ายค่าคอมเฉพาะตอนขายได้ สนใจสมัครที่ลิงก์นี้เลยค่ะ: ${link}` },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' }}>
      <div style={glass}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>🔗 ลิงก์เชิญผู้ผลิต</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input readOnly value={link} style={{ ...inputSt, flex: 1, fontSize: 13 }} onFocus={(e) => e.target.select()} />
          <button onClick={() => copy(link, 'link')} style={miniBtn('#6366f1')}>{copied === 'link' ? '✅' : 'คัดลอก'}</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src={qr} alt="QR เชิญผู้ผลิต" width={180} height={180} style={{ borderRadius: 12, background: '#fff', padding: 6 }} />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>ให้ผู้ผลิตสแกน QR เพื่อสมัคร</div>
          <a href={qr} download="openthai-invite-qr.png" style={{ ...miniBtn('#10b981'), display: 'inline-block', marginTop: 8, textDecoration: 'none' }}>⬇️ ดาวน์โหลด QR</a>
        </div>
      </div>
      <div style={glass}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>📨 ข้อความเชิญสำเร็จรูป</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>คัดลอกไปโพสต์/ส่งหาผู้ผลิตได้เลย</div>
        {templates.map((tp) => (
          <div key={tp.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', flex: 1 }}>{tp.label}</span>
              <button onClick={() => copy(tp.text, tp.id)} style={miniBtn('#6366f1')}>{copied === tp.id ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}</button>
            </div>
            <pre style={{ ...inputSt, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: '#94a3b8', margin: 0, fontFamily: 'inherit' }}>{tp.text}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Broadcast Email Modal — ส่ง newsletter หาลีด ──────────────────────────────
function BroadcastModal({ adminKey, counts, onClose }) {
  const [form, setForm] = useState({ subject: '', message: '', audience: 'all' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const aud = [['all', `ทั้งหมด (${counts?.all ?? '—'})`], ['waitlist', `Waitlist (${counts?.waitlist ?? '—'})`], ['affiliate', `Affiliate (${counts?.affiliate ?? '—'})`], ['order', `ลูกค้าสั่งซื้อ (${counts?.order ?? '—'})`]];
  const send = async () => {
    if (busy || !form.subject.trim() || !form.message.trim()) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/leads/admin/broadcast'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify(form) });
      setResult(await r.json());
    } catch { setResult({ success: false, error: 'เชื่อมต่อไม่ได้' }); }
    finally { setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glass, width: '100%', maxWidth: 480, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer' }}>×</button>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>📨 ส่งอีเมล Broadcast</div>
        {result ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{result.sent > 0 ? '✅' : '⚠️'}</div>
            {result.sent > 0
              ? <div style={{ fontWeight: 700 }}>ส่งสำเร็จ {result.sent}/{result.recipients} คน</div>
              : <div style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.6 }}>{result.error || result.message || 'ส่งไม่สำเร็จ'}</div>}
            <button onClick={onClose} style={{ ...primaryBtn, width: 'auto', padding: '10px 24px', marginTop: 16 }}>ปิด</button>
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>กลุ่มผู้รับ</label>
            <select value={form.audience} onChange={(e) => setForm(f => ({ ...f, audience: e.target.value }))} style={{ ...inputSt, marginTop: 4, marginBottom: 12 }}>
              {aud.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>หัวข้ออีเมล</label>
            <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="เช่น ฟีเจอร์ใหม่มาแล้ว! 🎉" style={{ ...inputSt, marginTop: 4, marginBottom: 12 }} />
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>ข้อความ</label>
            <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="พิมพ์ข้อความ… (ขึ้นบรรทัดใหม่ได้)" style={{ ...inputSt, marginTop: 4, minHeight: 120, resize: 'vertical' }} />
            <div style={{ fontSize: 11, color: '#64748b', margin: '8px 0 14px' }}>ส่งแบบ BCC (ผู้รับไม่เห็นกันและกัน) · ต้องตั้ง SMTP ใน env</div>
            <button onClick={send} disabled={busy || !form.subject.trim() || !form.message.trim()} style={{ ...primaryBtn, opacity: busy || !form.subject.trim() || !form.message.trim() ? 0.6 : 1 }}>
              {busy ? 'กำลังส่ง...' : '📨 ส่งเลย'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Product Form Modal — เพิ่ม/แก้ไขสินค้าในคลัง ──────────────────────────────
function ProductFormModal({ product, onSave, onClose }) {
  const [f, setF] = useState({ id: product.id, sku: product.sku || '', name: product.name || '', category: product.category || '', price: product.price ?? '', cost: product.cost ?? '', stock: product.stock ?? '', low_stock: product.low_stock ?? 5, status: product.status || 'active', image_url: product.image_url || '', description: product.description || '' });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const num = (k, ph) => <input type="number" value={f[k]} onChange={set(k)} placeholder={ph} style={inputSt} />;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glass, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer' }}>×</button>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{product.id ? '✏️ แก้ไขสินค้า' : '＋ เพิ่มสินค้า'}</div>
        <L t="ชื่อสินค้า *"><input value={f.name} onChange={set('name')} placeholder="เช่น เสื้อยืด Openthai" style={inputSt} /></L>
        <Two><L t="SKU"><input value={f.sku} onChange={set('sku')} placeholder="auto" style={inputSt} /></L><L t="หมวด"><input value={f.category} onChange={set('category')} placeholder="ทั่วไป" style={inputSt} /></L></Two>
        <Two><L t="ราคาขาย (฿)">{num('price', '0')}</L><L t="ต้นทุน (฿)">{num('cost', '0')}</L></Two>
        <Two><L t="สต๊อก">{num('stock', '0')}</L><L t="เตือนเมื่อต่ำกว่า">{num('low_stock', '5')}</L></Two>
        <L t="สถานะ"><select value={f.status} onChange={set('status')} style={inputSt}><option value="active">active (ขายได้)</option><option value="inactive">inactive (ซ่อน)</option></select></L>
        <L t="ลิงก์รูป (ถ้ามี)"><input value={f.image_url} onChange={set('image_url')} placeholder="https://..." style={inputSt} /></L>
        <L t="รายละเอียด"><textarea value={f.description} onChange={set('description')} style={{ ...inputSt, minHeight: 60, resize: 'vertical' }} /></L>
        <button onClick={() => f.name.trim() && onSave(f)} disabled={!f.name.trim()} style={{ ...primaryBtn, marginTop: 12, opacity: f.name.trim() ? 1 : 0.6 }}>💾 บันทึก</button>
      </div>
    </div>
  );
}
const L = ({ t, children }) => <div style={{ marginBottom: 10 }}><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>{t}</label>{children}</div>;
const Two = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>;

// ── Styles ─────────────────────────────────────────────────────────────────────
const glass = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' };
const smallBtn = { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const tabBtn = { borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const miniBtn = (c) => ({ background: `${c}22`, border: `1px solid ${c}66`, color: c, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' });
const inputSt = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#f8fafc', fontSize: 14, outline: 'none' };
