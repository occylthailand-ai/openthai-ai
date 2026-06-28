import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ADM } from '../i18n/admin';


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
  const [overview, setOverview] = useState(null);  // stats จริงจาก /api/admin/stats
  const [overviewErr, setOverviewErr] = useState('');
  const [sales, setSales] = useState(null);         // ยอดขายจริงจาก backend
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

  useEffect(() => { document.title = 'Admin Panel — Openthai.ai'; }, []);

  const adminKey = () => sessionStorage.getItem('admin_key') || ADMIN_KEY;
  const [affList, setAffList] = useState([]);   // รายชื่อ affiliate จริง
  const [wdList, setWdList] = useState([]);     // คำขอถอนเงิน
  const [schPosts, setSchPosts] = useState([]); // คิว Scheduler
  const [schDue, setSchDue] = useState(0);
  const apiErr = (label) => (e) => console.error(`[admin] ${label}:`, e?.message || e);
  const loadWithdrawals = () => fetch(apiUrl('/api/affiliate/withdrawals/admin'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setWdList(d.withdrawals); }).catch(apiErr('withdrawals'));
  const wdAction = async (id, action) => {
    await fetch(apiUrl(`/api/affiliate/withdrawals/admin/${id}`), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ action }) }).catch(() => {});
    loadWithdrawals(); loadAffiliates();
  };
  const loadScheduler = () => {
    fetch(apiUrl('/api/scheduler/list')).then(r => r.json()).then(d => { if (d.ok) setSchPosts(d.posts); }).catch(apiErr('scheduler'));
    fetch(apiUrl('/api/scheduler/due')).then(r => r.json()).then(d => { if (d.ok) setSchDue(d.count); }).catch(() => {});
  };
  const schDelete = async (id) => { await fetch(apiUrl(`/api/scheduler/${id}`), { method: 'DELETE' }).catch(() => {}); loadScheduler(); };
  const schProcess = async () => { await fetch(apiUrl('/api/scheduler/process'), { method: 'POST' }).catch(() => {}); loadScheduler(); };
  const loadProducers = () => fetch(apiUrl('/api/producers/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setProds(d.producers); else console.warn('[admin] producers:', d.message); }).catch(apiErr('producers'));
  const loadOrders = () => fetch(apiUrl('/api/orders/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setOrds(d.orders); else console.warn('[admin] orders:', d.message); }).catch(apiErr('orders'));
  const loadLeads = () => fetch(apiUrl('/api/leads/admin/search'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setLeads(d); else console.warn('[admin] leads:', d.message); }).catch(apiErr('leads'));
  const loadAffiliates = () => fetch(apiUrl('/api/affiliate/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setAffList(d.data); else console.warn('[admin] affiliates:', d.message); }).catch(apiErr('affiliates'));
  const loadInventory = () => {
    fetch(apiUrl('/api/inventory/admin/list'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setInv(d.products); else console.warn('[admin] inv:', d.message); }).catch(apiErr('inventory'));
    fetch(apiUrl('/api/inventory/admin/summary'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setInvSum(d); }).catch(apiErr('inv-summary'));
    fetch(apiUrl('/api/inventory/admin/sales-report'), { headers: { 'x-admin-key': adminKey() } }).then(r => r.json()).then(d => { if (d.success) setSalesRep(d); }).catch(apiErr('inv-sales'));
  };
  useEffect(() => { if (authed) { loadProducers(); loadOrders(); loadLeads(); loadAffiliates(); loadWithdrawals(); loadScheduler(); loadInventory(); } }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ดึง overview stats จริง + ยอดขายจริง
  useEffect(() => {
    if (!authed) return;
    const key = sessionStorage.getItem('admin_key') || ADMIN_KEY;
    fetch(apiUrl('/api/admin/stats'), { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => { if (d.success) setOverview(d); else setOverviewErr(d.message || 'โหลด stats ไม่สำเร็จ'); })
      .catch(() => setOverviewErr('เชื่อมต่อ backend ไม่ได้'));
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

  const filteredAff = affList.filter((a) =>
    !search || a.name?.includes(search) || a.email?.includes(search) || a.ref_code?.includes(search)
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
        {(overviewErr || salesErr) && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#fca5a5' }}>
            ❌ {overviewErr || salesErr}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: '🤝', label: T.stat.aff, v: overview ? overview.affiliates.toLocaleString() : '—', sub: overview ? `${overview.affiliates_active} active` : '...', c: '#f59e0b' },
            { icon: '📦', label: T.stat.orders || 'ออเดอร์ทั้งหมด', v: overview ? overview.orders_total.toLocaleString() : '—', sub: overview ? `${overview.orders_paid} ชำระแล้ว` : '...', c: '#6366f1' },
            { icon: '💰', label: T.stat.revenue, v: sales ? baht(sales.stats.revenue_total) : (overview ? baht(overview.revenue_total) : '—'), sub: sales ? `${baht(sales.stats.revenue_month)} ${T.stat.month}` : '...', c: '#fe2c55' },
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
              <div style={{ fontWeight: 700, marginBottom: 14 }}>📦 ออเดอร์ล่าสุด</div>
              {ords && ords.length > 0 ? ords.slice(0, 5).map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{o.product_name || o.id}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{o.buyer_name || o.email} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString('th-TH') : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>฿{Number(o.amount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: STATUS_COLOR[o.status] || '#64748b' }}>● {o.status}</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                  {ords === null ? '⏳ กำลังโหลด...' : 'ยังไม่มีออเดอร์'}
                </div>
              )}
            </div>
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>{T.ov.topaff}</div>
              {affList.length > 0 ? affList.slice(0, 5).map((a) => (
                <div key={a.ref_code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>REF: {a.ref_code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>฿{Number(a.total_earned || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: TIER_COLOR[a.tier] || '#64748b' }}>{a.tier}</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                  {affList.length === 0 ? 'ยังไม่มี Affiliate' : '⏳ กำลังโหลด...'}
                </div>
              )}
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

        {/* TAB: USERS — ระบบนี้ใช้ Leads แทน User Registry */}
        {tab === 'users' && (
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>👥 Leads & ผู้สมัคร ({leads ? (leads.counts?.total || 0) : '...'})</div>
              <input placeholder="🔍 ค้นหาชื่อ / อีเมล" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputSt, width: 220, textAlign: 'left', letterSpacing: 0, padding: '8px 14px', fontSize: 13 }} />
            </div>
            {leads?.leads?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['ชื่อ','อีเมล','ประเภท','วันที่','สถานะ'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.leads.filter(l => !search || l.name?.includes(search) || l.email?.includes(search)).map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{l.email}</td>
                        <td style={{ padding: '10px 12px', color: '#a5b4fc', fontSize: 11 }}>{l.type}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{l.createdAt ? new Date(l.createdAt).toLocaleDateString('th-TH') : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: STATUS_COLOR[l.status] || '#64748b', fontSize: 11 }}>● {l.status || 'active'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
                {leads === null ? '⏳ กำลังโหลด...' : 'ยังไม่มีข้อมูล Leads'}
              </div>
            )}
          </div>
        )}

        {/* TAB: AFFILIATES */}
        {tab === 'affiliates' && (
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>🤝 Affiliate Management ({affList.length})</div>
              <input placeholder="🔍 ค้นหาชื่อ / อีเมล / Ref" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputSt, width: 220, textAlign: 'left', letterSpacing: 0, padding: '8px 14px', fontSize: 13 }} />
            </div>
            {filteredAff.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['ชื่อ','Ref Code','Platform','Tier','ยอดขาย','รายได้รวม','สถานะ'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAff.map((a) => (
                      <tr key={a.ref_code} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a5b4fc', letterSpacing: 2 }}>{a.ref_code}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{a.platform}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: TIER_COLOR[a.tier] || '#64748b', fontWeight: 700, textTransform: 'capitalize' }}>{a.tier}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{a.total_sales || 0}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>฿{Number(a.total_earned || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: STATUS_COLOR[a.status] || '#64748b', fontSize: 11 }}>● {a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
                {affList.length === 0 ? 'ยังไม่มี Affiliate สมัคร' : 'ไม่พบผลลัพธ์'}
              </div>
            )}

            {/* คำขอถอนเงิน */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>💸 คำขอถอนเงิน ({wdList.filter(w => w.status === 'pending').length} รออนุมัติ / {wdList.length} ทั้งหมด)</div>
                <button onClick={loadWithdrawals} style={{ ...tabBtn, padding: '6px 14px', fontSize: 12 }}>🔄 รีเฟรช</button>
              </div>
              {wdList.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Ref','ชื่อ','ยอด','พร้อมเพย์','สถานะ','จัดการ'].map((h) => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {wdList.map((w) => {
                        const stColor = { pending: '#f59e0b', approved: '#6366f1', paid: '#10b981', rejected: '#ef4444' }[w.status] || '#64748b';
                        return (
                          <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a5b4fc' }}>{w.ref_code}</td>
                            <td style={{ padding: '10px 12px' }}>{w.name}</td>
                            <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>฿{Number(w.amount).toLocaleString()}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>{w.promptpay}</td>
                            <td style={{ padding: '10px 12px' }}><span style={{ color: stColor, fontSize: 11 }}>● {w.status}</span></td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {w.status === 'pending' && <>
                                  <button onClick={() => wdAction(w.id, 'approve')} style={miniBtn('#6366f1')}>อนุมัติ</button>
                                  <button onClick={() => wdAction(w.id, 'reject')} style={miniBtn('#ef4444')}>ปฏิเสธ</button>
                                </>}
                                {w.status === 'approved' && <button onClick={() => wdAction(w.id, 'paid')} style={miniBtn('#10b981')}>✓ จ่ายแล้ว</button>}
                                {(w.status === 'paid' || w.status === 'rejected') && <span style={{ fontSize: 11, color: '#475569' }}>—</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>ยังไม่มีคำขอถอนเงิน</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CONTENT — จัดการคิว Scheduler */}
        {tab === 'content' && (
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>📅 คิวโพสต์ Scheduler ({schPosts.length}) {schDue > 0 && <span style={{ color: '#f59e0b', fontSize: 12 }}>· 🔔 {schDue} ถึงเวลา</span>}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadScheduler} style={{ ...tabBtn, padding: '6px 14px', fontSize: 12 }}>🔄 รีเฟรช</button>
                <button onClick={schProcess} disabled={schDue === 0} style={{ ...miniBtn(schDue > 0 ? '#f59e0b' : '#374151'), opacity: schDue > 0 ? 1 : 0.5 }}>⚡ ประมวลผลที่ถึงเวลา</button>
              </div>
            </div>
            {schPosts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Platform', 'เนื้อหา', 'เวลาตั้ง', 'สถานะ', ''].map((h) => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {schPosts.map((p) => {
                      const stColor = { pending: '#f59e0b', ready: '#06b6d4', published: '#10b981', failed: '#ef4444' }[p.status] || '#64748b';
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 12px', textTransform: 'capitalize', color: '#a5b4fc' }}>{p.platform}</td>
                          <td style={{ padding: '10px 12px', color: '#cbd5e1', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{new Date(p.scheduled_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '10px 12px' }}><span style={{ color: stColor, fontSize: 11 }}>● {p.status}</span></td>
                          <td style={{ padding: '10px 12px' }}><button onClick={() => schDelete(p.id)} style={miniBtn('#ef4444')}>ลบ</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569', fontSize: 14 }}>
                ยังไม่มีโพสต์ในคิว — สร้างได้ที่ <a href="/content-studio" style={{ color: '#6366f1' }}>Content Studio</a> หรือ <a href="/scheduler" style={{ color: '#6366f1' }}>Scheduler</a>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 14, lineHeight: 1.6 }}>
              💚 LINE OA (ช่องที่คุณเป็นเจ้าของ) → broadcast อัตโนมัติเมื่อถึงเวลา · 📲 ช่องอื่น → สถานะ "ready" รอกดโพสต์เอง · cron รันทุก 15 นาที
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
