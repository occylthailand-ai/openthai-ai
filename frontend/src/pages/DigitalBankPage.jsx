/**
 * DigitalBankPage.jsx — OpenThaiAi ธนาคารดิจิทัลไทย
 * OTOP / SME / สินค้าอื่นๆ  |  ไทย–ASEAN–สากล
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiBase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0f1e',
  surface:  '#111827',
  card:     '#1a2235',
  border:   '#1e3a5f',
  gold:     '#f59e0b',
  cyan:     '#06b6d4',
  green:    '#10b981',
  red:      '#ef4444',
  blue:     '#3b82f6',
  purple:   '#8b5cf6',
  text:     '#f1f5f9',
  muted:    '#64748b',
  thai:     '#dc143c',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    fontFamily: "'Inter', 'Sarabun', sans-serif",
    padding: '0 0 80px',
  },
  hero: {
    background: `linear-gradient(135deg, #0a1628 0%, #0d2040 50%, #0a1628 100%)`,
    borderBottom: `1px solid ${C.border}`,
    padding: '48px 24px 40px',
    textAlign: 'center',
  },
  heroFlag: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    fontSize: 28, fontWeight: 800, color: C.text,
    margin: '0 0 8px', letterSpacing: -0.5,
  },
  heroSub: { fontSize: 14, color: C.muted, margin: '0 0 20px' },
  heroBadges: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  badge: {
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    border: `1px solid ${C.border}`,
  },
  tabs: {
    display: 'flex', overflowX: 'auto', gap: 0,
    borderBottom: `1px solid ${C.border}`,
    background: C.surface, padding: '0 16px',
  },
  tab: (active) => ({
    padding: '14px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: 'none', whiteSpace: 'nowrap',
    borderBottom: active ? `2px solid ${C.cyan}` : '2px solid transparent',
    color: active ? C.cyan : C.muted,
  }),
  container: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  card: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: 20,
  },
  cardTitle: { fontSize: 13, color: C.muted, marginBottom: 6 },
  cardValue: { fontSize: 24, fontWeight: 700, color: C.text },
  cardSub: { fontSize: 11, color: C.muted, marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: C.text,
    margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8,
  },
  btn: (variant = 'primary') => ({
    padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13,
    cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? C.cyan : variant === 'danger' ? C.red : C.surface,
    color: variant === 'ghost' ? C.muted : '#0a0f1e',
  }),
  input: {
    width: '100%', boxSizing: 'border-box',
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 14px', color: C.text,
    fontSize: 13, outline: 'none',
  },
  label: { display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 },
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  statusDot: (status) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: status === 'active' || status === 'approved' || status === 'completed' ? C.green
      : status === 'pending' || status === 'under_review' ? C.gold : C.red,
    display: 'inline-block', marginRight: 6,
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: `1px solid ${C.border}`, color: C.muted },
  td: { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, color: C.text },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Alert({ msg, type = 'info' }) {
  if (!msg) return null;
  const bg = type === 'error' ? '#7f1d1d' : type === 'success' ? '#064e3b' : '#1e3a5f';
  return (
    <div style={{ background: bg, border: `1px solid ${type === 'error' ? C.red : type === 'success' ? C.green : C.border}`,
      borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>
      {msg}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',   label: '📊 Dashboard' },
  { id: 'accounts',    label: '🏦 บัญชี' },
  { id: 'transfer',    label: '💸 โอนเงิน' },
  { id: 'products',    label: '🧩 ผลิตภัณฑ์' },
  { id: 'loans',       label: '🏛️ สินเชื่อ' },
  { id: 'insurance',   label: '🛡️ ประกัน' },
  { id: 'invest',      label: '📈 การลงทุน' },
  { id: 'bills',       label: '📄 ชำระบิล' },
  { id: 'trade',       label: '🚢 Trade Finance' },
  { id: 'payroll',     label: '👥 เงินเดือน' },
  { id: 'staking',     label: '🔒 Staking' },
  { id: 'cards',       label: '💳 บัตร' },
  { id: 'fx',          label: '🌐 FX' },
  { id: 'mbridge',     label: '🌏 mBridge' },
  { id: 'advisor',     label: '🤖 AI Advisor' },
  { id: 'kyc',         label: '🪪 KYC' },
];

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bank/dashboard')
      .then(r => r.json()).then(r => { if (r.success) setData(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: C.muted, padding: 24 }}>กำลังโหลด…</div>;
  if (!data)   return <div style={{ color: C.muted, padding: 24 }}>ไม่สามารถโหลดข้อมูลได้</div>;

  return (
    <div>
      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>ยอดรวมทุกบัญชี</div>
          <div style={{ ...styles.cardValue, color: C.cyan }}>฿{fmt(data.total_balance)}</div>
          <div style={styles.cardSub}>{data.accounts.length} บัญชี · {data.active_cards} บัตร active</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>OTAI Staking</div>
          <div style={{ ...styles.cardValue, color: C.gold }}>{fmt(data.total_staked)} OTAI</div>
          <div style={styles.cardSub}>{data.staking.length} รายการ active</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>สถานะ KYC</div>
          <div style={styles.row}>
            <span style={styles.statusDot(data.kyc_status)} />
            <span style={{ ...styles.cardValue, fontSize: 18 }}>
              {data.kyc_status === 'approved' ? 'ผ่านการตรวจสอบ' :
               data.kyc_status === 'pending'  ? 'รอตรวจสอบ' :
               data.kyc_status === 'none'     ? 'ยังไม่ยื่น' : data.kyc_status}
            </span>
          </div>
          <div style={styles.cardSub}>Level: {data.kyc_level || '—'}</div>
        </div>
      </div>

      {data.accounts.length > 0 && (
        <>
          <div style={styles.sectionTitle}>🏦 บัญชีของฉัน</div>
          {data.accounts.map(acc => (
            <div key={acc.id} style={{ ...styles.card, marginBottom: 10 }}>
              <div style={styles.row}>
                <span style={styles.statusDot(acc.status)} />
                <span style={{ fontWeight: 700 }}>{acc.account_number}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>· {acc.account_type}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: C.cyan }}>
                  ฿{fmt(acc.balance)}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_type: 'savings', currency: 'THB' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/accounts').then(r => r.json())
      .then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const openAccount = async () => {
    setError(null); setMsg(null);
    const r = await apiFetch('/api/bank/accounts/open', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) { setMsg(`บัญชีเลขที่ ${data.account.account_number} เปิดสำเร็จ`); load(); }
    else setError(data.error?.message || 'เปิดบัญชีไม่สำเร็จ');
  };

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />

      <div style={styles.sectionTitle}>➕ เปิดบัญชีใหม่</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>ประเภทบัญชี</label>
            <select style={styles.input}
              value={form.account_type}
              onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
              <option value="savings">ออมทรัพย์ (Savings)</option>
              <option value="current">กระแสรายวัน (Current)</option>
              <option value="business">ธุรกิจ (Business)</option>
              <option value="otai_staking">OTAI Staking</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>สกุลเงิน</label>
            <select style={styles.input}
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="THB">THB — บาทไทย</option>
              <option value="USD">USD — ดอลลาร์</option>
              <option value="CNY">CNY — หยวนดิจิทัล</option>
              <option value="SGD">SGD — ดอลลาร์สิงคโปร์</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={styles.label}>PromptPay ID (ไม่บังคับ)</label>
          <input style={styles.input} placeholder="เบอร์มือถือหรือเลขบัตร"
            onChange={e => setForm(f => ({ ...f, promptpay_id: e.target.value }))} />
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 16 }} onClick={openAccount}>
          เปิดบัญชี
        </button>
      </div>

      <div style={styles.sectionTitle}>🏦 บัญชีทั้งหมด ({accounts.length})</div>
      {accounts.length === 0
        ? <div style={{ color: C.muted, fontSize: 13 }}>ยังไม่มีบัญชี — เปิดบัญชีด้านบน</div>
        : accounts.map(acc => (
          <div key={acc.id} style={{ ...styles.card, marginBottom: 10 }}>
            <div style={styles.row}>
              <span style={styles.statusDot(acc.status)} />
              <div>
                <div style={{ fontWeight: 700 }}>{acc.account_number}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{acc.account_type} · {acc.currency}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: C.cyan, fontSize: 18 }}>฿{fmt(acc.balance)}</div>
                {acc.interest_rate > 0 &&
                  <div style={{ fontSize: 11, color: C.green }}>ดอกเบี้ย {acc.interest_rate}% ต่อปี</div>}
              </div>
            </div>
            {acc.is_primary && <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>⭐ บัญชีหลัก</div>}
          </div>
        ))}
    </div>
  );
}

// ─── Transfer Tab ─────────────────────────────────────────────────────────────

function TransferTab() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ amount: '', description: 'โอนเงิน' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/bank/accounts').then(r => r.json())
      .then(r => { if (r.success) setAccounts(r.accounts); });
  }, []);

  const doTransfer = async () => {
    setError(null); setMsg(null);
    if (!form.from_account_id || !form.to_account_id || !form.amount)
      return setError('กรุณากรอกข้อมูลให้ครบ');
    const r = await apiFetch('/api/bank/transfer', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) setMsg(`โอน ฿${fmt(form.amount)} สำเร็จ`);
    else setError(data.error?.message || 'โอนเงินไม่สำเร็จ');
  };

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>💸 โอนเงิน</div>
      <div style={styles.card}>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>บัญชีต้นทาง</label>
          <select style={styles.input}
            onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value }))}>
            <option value="">เลือกบัญชี</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.account_number} — ฿{fmt(a.balance)}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>รหัสบัญชีปลายทาง (Account ID)</label>
          <input style={styles.input} placeholder="UUID ของบัญชีปลายทาง"
            onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>จำนวนเงิน (THB)</label>
          <input style={styles.input} type="number" min="1" placeholder="0.00"
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>หมายเหตุ</label>
          <input style={styles.input} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <button style={styles.btn('primary')} onClick={doTransfer}>ยืนยันการโอน</button>
      </div>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState('');
  const categories = [
    { v: '', l: 'ทั้งหมด' }, { v: 'savings', l: 'ออมทรัพย์' },
    { v: 'fixed_deposit', l: 'ฝากประจำ' }, { v: 'loan_sme', l: 'สินเชื่อ SME' },
    { v: 'loan_otop', l: 'สินเชื่อ OTOP' }, { v: 'otai_staking', l: 'OTAI Staking' },
  ];

  useEffect(() => {
    const q = cat ? `?category=${cat}` : '';
    apiFetch(`/api/bank/products${q}`).then(r => r.json())
      .then(r => { if (r.success) setProducts(r.products); });
  }, [cat]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c.v} style={{
            ...styles.btn(cat === c.v ? 'primary' : 'ghost'),
            padding: '6px 14px', fontSize: 12,
          }} onClick={() => setCat(c.v)}>{c.l}</button>
        ))}
      </div>

      <div style={styles.grid2}>
        {products.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.name_th}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{p.name_en}</div>
            {p.interest_rate > 0 && (
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green, marginBottom: 6 }}>
                {p.interest_rate}% ต่อปี
              </div>
            )}
            {p.min_amount && (
              <div style={{ fontSize: 12, color: C.muted }}>
                วงเงิน ฿{fmt(p.min_amount)}{p.max_amount ? ` – ฿${fmt(p.max_amount)}` : '+'}
              </div>
            )}
            {p.features && (
              <ul style={{ margin: '10px 0 0', padding: '0 0 0 16px', fontSize: 12, color: C.muted }}>
                {(typeof p.features === 'string' ? JSON.parse(p.features) : p.features)
                  .slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FX Tab ───────────────────────────────────────────────────────────────────

function FXTab() {
  const [rates, setRates] = useState([]);
  useEffect(() => {
    apiFetch('/api/bank/fx/rates').then(r => r.json())
      .then(r => { if (r.success) setRates(r.rates); });
  }, []);

  const flags = { USD: '🇺🇸', EUR: '🇪🇺', CNY: '🇨🇳', JPY: '🇯🇵',
    SGD: '🇸🇬', MYR: '🇲🇾', HKD: '🇭🇰', GBP: '🇬🇧' };

  return (
    <div>
      <div style={styles.sectionTitle}>🌐 อัตราแลกเปลี่ยน (ข้อมูลจาก ธปท.)</div>
      {rates.length === 0
        ? <div style={{ color: C.muted, fontSize: 13 }}>ยังไม่มีข้อมูลอัตราแลกเปลี่ยน</div>
        : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>สกุลเงิน</th>
                  <th style={styles.th}>รับซื้อ (Buy)</th>
                  <th style={styles.th}>ขาย (Sell)</th>
                  <th style={styles.th}>กลาง (Mid)</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id}>
                    <td style={styles.td}>{flags[r.base_currency] || '🏳️'} {r.base_currency}/THB</td>
                    <td style={{ ...styles.td, color: C.green }}>{Number(r.buy_rate).toFixed(4)}</td>
                    <td style={{ ...styles.td, color: C.red }}>{Number(r.sell_rate).toFixed(4)}</td>
                    <td style={{ ...styles.td, color: C.cyan }}>{Number(r.mid_rate).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <div style={{ ...styles.card, marginTop: 16, borderColor: C.purple }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 8 }}>
          🌏 mBridge — หยวนดิจิทัล (e-CNY) สู่บาทไทย
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          ธนาคารแห่งประเทศไทยเป็นสมาชิกผู้ก่อตั้ง mBridge CBDC Platform ร่วมกับจีน ฮ่องกง UAE และ Saudi Arabia
          การโอนเงินข้ามพรมแดน CNY↔THB ผ่าน mBridge ไม่ต้องผ่านธนาคารตัวกลาง — ลดต้นทุน ลดเวลา
          OpenThaiAi รองรับ OTOP/SME ส่งออกไทย–จีน–ASEAN ผ่านช่องทางนี้
        </div>
      </div>
    </div>
  );
}

// ─── mBridge Tab ─────────────────────────────────────────────────────────────

function MBridgeTab() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ send_currency: 'THB', receive_currency: 'CNY', corridor: 'TH_CN' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/bank/accounts').then(r => r.json())
      .then(r => { if (r.success) setAccounts(r.accounts); });
  }, []);

  const corridors = [
    { v: 'TH_CN', l: '🇹🇭→🇨🇳 ไทย-จีน (mBridge)' },
    { v: 'TH_HK', l: '🇹🇭→🇭🇰 ไทย-ฮ่องกง' },
    { v: 'TH_AE', l: '🇹🇭→🇦🇪 ไทย-UAE' },
    { v: 'TH_SG', l: '🇹🇭→🇸🇬 ไทย-สิงคโปร์' },
    { v: 'TH_MY', l: '🇹🇭→🇲🇾 ไทย-มาเลเซีย' },
    { v: 'TH_VN', l: '🇹🇭→🇻🇳 ไทย-เวียดนาม' },
    { v: 'TH_ID', l: '🇹🇭→🇮🇩 ไทย-อินโดนีเซีย' },
  ];

  const doTransfer = async () => {
    setError(null); setMsg(null);
    if (!form.from_account_id || !form.send_amount || !form.recipient_name)
      return setError('กรุณากรอกข้อมูลให้ครบ');
    const r = await apiFetch('/api/bank/mbridge/transfer', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) setMsg(`ส่งคำขอ mBridge สำเร็จ — Ref: ${data.transfer.id.slice(0,8)}… (Sandbox Mode)`);
    else setError(data.error?.message || 'ไม่สำเร็จ');
  };

  return (
    <div>
      <div style={{ ...styles.card, borderColor: C.purple, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>
          🌏 mBridge Cross-Border CBDC Transfer
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
          แพลตฟอร์ม CBDC ข้ามพรมแดนที่ธนาคารแห่งประเทศไทยเป็นสมาชิก ·
          ปัจจุบัน Sandbox Mode เท่านั้น — ต้องรอการอนุมัติ BOT สำหรับ Production
        </div>
      </div>

      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />

      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>บัญชีต้นทาง</label>
            <select style={styles.input}
              onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>เส้นทางการโอน</label>
            <select style={styles.input}
              value={form.corridor}
              onChange={e => setForm(f => ({ ...f, corridor: e.target.value }))}>
              {corridors.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>จำนวนที่ส่ง</label>
            <input style={styles.input} type="number" placeholder="0.00"
              onChange={e => setForm(f => ({ ...f, send_amount: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>สกุลเงินที่รับ</label>
            <select style={styles.input}
              value={form.receive_currency}
              onChange={e => setForm(f => ({ ...f, receive_currency: e.target.value }))}>
              <option value="CNY">CNY — หยวนดิจิทัล</option>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
              <option value="AED">AED</option>
              <option value="MYR">MYR</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>ชื่อผู้รับ</label>
          <input style={styles.input} placeholder="ชื่อ-นามสกุล / ชื่อบริษัท"
            onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>ธนาคารผู้รับ</label>
          <input style={styles.input} placeholder="เช่น Industrial and Commercial Bank of China"
            onChange={e => setForm(f => ({ ...f, recipient_bank: e.target.value }))} />
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 16 }} onClick={doTransfer}>
          ส่งคำขอ mBridge
        </button>
      </div>
    </div>
  );
}

// ─── Staking Tab ─────────────────────────────────────────────────────────────

function StakingTab() {
  const [accounts, setAccounts] = useState([]);
  const [staking, setStaking] = useState([]);
  const [form, setForm] = useState({ product_code: 'OTAI_STAKE', term_days: 30 });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/staking').then(r => r.json()).then(r => { if (r.success) setStaking(r.staking); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const doStake = async () => {
    setError(null); setMsg(null);
    if (!form.account_id || !form.amount) return setError('กรุณากรอกข้อมูล');
    const r = await apiFetch('/api/bank/staking/stake', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) { setMsg('Staking สำเร็จ'); load(); }
    else setError(data.error?.message || 'ไม่สำเร็จ');
  };

  return (
    <div>
      <div style={{ ...styles.card, borderColor: C.gold, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>🔒 OTAI Token Staking</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Stake OTAI รับ APY 12% ต่อปี · ได้รับสิทธิ์ Premium · ถอนก่อนกำหนดได้
        </div>
      </div>

      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />

      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>บัญชี OTAI</label>
            <select style={styles.input}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>จำนวน OTAI</label>
            <input style={styles.input} type="number" min="100"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>ระยะเวลา (วัน)</label>
            <select style={styles.input} value={form.term_days}
              onChange={e => setForm(f => ({ ...f, term_days: parseInt(e.target.value) }))}>
              <option value={30}>30 วัน</option>
              <option value={90}>90 วัน</option>
              <option value={180}>180 วัน</option>
              <option value={365}>365 วัน</option>
            </select>
          </div>
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 16 }} onClick={doStake}>
          Stake OTAI
        </button>
      </div>

      <div style={styles.sectionTitle}>🔒 Staking ของฉัน ({staking.length})</div>
      {staking.map(s => (
        <div key={s.id} style={{ ...styles.card, marginBottom: 10 }}>
          <div style={styles.row}>
            <span style={styles.statusDot(s.status)} />
            <span style={{ fontWeight: 700 }}>{fmt(s.staked_amount)} {s.currency}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>· {s.apy}% APY · {s.term_days} วัน</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>
              ครบ: {new Date(s.matures_at).toLocaleDateString('th-TH')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cards Tab ────────────────────────────────────────────────────────────────

function CardsTab() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ card_type: 'virtual', network: 'visa' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/cards').then(r => r.json()).then(r => { if (r.success) setCards(r.cards); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const requestCard = async () => {
    setError(null); setMsg(null);
    if (!form.account_id || !form.name_on_card) return setError('กรุณากรอกข้อมูล');
    const r = await apiFetch('/api/bank/cards/request', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) { setMsg('ส่งคำขอบัตรสำเร็จ'); load(); }
    else setError(data.error?.message || 'ไม่สำเร็จ');
  };

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />

      <div style={styles.sectionTitle}>➕ ขอบัตรใหม่</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>บัญชีที่ผูก</label>
            <select style={styles.input}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>ประเภทบัตร</label>
            <select style={styles.input} value={form.card_type}
              onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}>
              <option value="virtual">Virtual Card</option>
              <option value="debit">Debit Card</option>
              <option value="prepaid">Prepaid Card</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>เครือข่าย</label>
            <select style={styles.input} value={form.network}
              onChange={e => setForm(f => ({ ...f, network: e.target.value }))}>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="unionpay">UnionPay</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>ชื่อบนบัตร</label>
            <input style={styles.input} placeholder="NAME SURNAME"
              onChange={e => setForm(f => ({ ...f, name_on_card: e.target.value }))} />
          </div>
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 16 }} onClick={requestCard}>
          ขอบัตร
        </button>
      </div>

      <div style={styles.sectionTitle}>💳 บัตรของฉัน ({cards.length})</div>
      <div style={styles.grid2}>
        {cards.map(card => (
          <div key={card.id} style={{
            ...styles.card,
            background: `linear-gradient(135deg, #1e3a5f 0%, #0a1628 100%)`,
            borderColor: card.network === 'unionpay' ? C.red : C.blue,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.muted }}>{card.card_type.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{card.network?.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 16, letterSpacing: 4, color: C.text, marginBottom: 12 }}>
              {card.masked_number || '•••• •••• •••• ••••'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12 }}>{card.name_on_card}</span>
              <span style={styles.statusDot(card.status)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Advisor Tab ───────────────────────────────────────────────────────────

function AdvisorTab() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true); setAnswer('');
    const r = await apiFetch('/api/bank/advisor/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
    const data = await r.json();
    setAnswer(data.success ? data.answer : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    setLoading(false);
  };

  const suggestions = [
    'ฉันควรเปิดบัญชีประเภทไหนสำหรับธุรกิจ OTOP?',
    'อัตราดอกเบี้ยเงินฝากประจำ 12 เดือนเป็นเท่าไหร่?',
    'OTAI Staking แตกต่างจากเงินฝากประจำอย่างไร?',
    'ฉันจะส่งออกสินค้าไปจีนผ่าน mBridge ได้อย่างไร?',
    'เงื่อนไขสินเชื่อ SME สำหรับ OTOP ส่งออกคืออะไร?',
  ];

  return (
    <div>
      <div style={{ ...styles.card, borderColor: C.purple, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>🤖 AI Financial Advisor</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          ที่ปรึกษาการเงินดิจิทัล powered by Claude · OTOP/SME/สินค้าอื่นๆ · ไทย–ASEAN–สากล
        </div>
      </div>

      <div style={styles.sectionTitle}>💡 คำถามที่พบบ่อย</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {suggestions.map((s, i) => (
          <button key={i} style={{ ...styles.btn('ghost'), fontSize: 11, padding: '6px 12px' }}
            onClick={() => setQ(s)}>{s}</button>
        ))}
      </div>

      <div style={styles.card}>
        <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }}
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="ถามเกี่ยวกับการเงิน บัญชี สินเชื่อ การส่งออก หรือ OTAI…" />
        <button style={{ ...styles.btn('primary'), marginTop: 12 }}
          onClick={ask} disabled={loading}>
          {loading ? 'กำลังคิด…' : 'ถาม AI Advisor'}
        </button>
      </div>

      {answer && (
        <div style={{ ...styles.card, marginTop: 16, borderColor: C.purple, lineHeight: 1.7 }}>
          <div style={{ fontSize: 12, color: C.purple, marginBottom: 8 }}>💬 คำตอบจาก AI Advisor</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{answer}</div>
        </div>
      )}
    </div>
  );
}

// ─── KYC Tab ─────────────────────────────────────────────────────────────────

function KYCTab() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    id_type: 'thai_id', kyc_level: 'basic', pdpa_consent: true,
  });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/bank/kyc/status').then(r => r.json())
      .then(r => { if (r.success) setStatus(r.kyc); });
  }, []);

  const submit = async () => {
    setError(null); setMsg(null);
    const r = await apiFetch('/api/bank/kyc/apply', { method: 'POST', body: JSON.stringify(form) });
    const data = await r.json();
    if (data.success) { setMsg('ยื่น KYC สำเร็จ — รอการตรวจสอบ 1-2 วันทำการ'); setStatus(data.kyc); }
    else setError(data.error?.message || 'ไม่สำเร็จ');
  };

  return (
    <div>
      {status && (
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <div style={styles.row}>
            <span style={styles.statusDot(status.status)} />
            <span style={{ fontWeight: 700 }}>
              {status.status === 'approved' ? 'KYC ผ่านแล้ว ✅' :
               status.status === 'pending'  ? 'รอตรวจสอบ ⏳' :
               status.status === 'rejected' ? 'ไม่ผ่าน ❌' : status.status}
            </span>
            <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>Level: {status.kyc_level}</span>
          </div>
          {status.reviewer_notes && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{status.reviewer_notes}</div>
          )}
        </div>
      )}

      {(!status || status?.status === 'rejected') && (
        <>
          <Alert msg={msg} type="success" />
          <Alert msg={error} type="error" />
          <div style={styles.sectionTitle}>🪪 ยื่นคำขอ KYC</div>
          <div style={styles.card}>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>ชื่อ-นามสกุล (ภาษาไทย)</label>
                <input style={styles.input}
                  onChange={e => setForm(f => ({ ...f, full_name_th: e.target.value }))} />
              </div>
              <div>
                <label style={styles.label}>ชื่อ-นามสกุล (ภาษาอังกฤษ)</label>
                <input style={styles.input}
                  onChange={e => setForm(f => ({ ...f, full_name_en: e.target.value }))} />
              </div>
              <div>
                <label style={styles.label}>ประเภทเอกสาร</label>
                <select style={styles.input} value={form.id_type}
                  onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}>
                  <option value="thai_id">บัตรประชาชน</option>
                  <option value="passport">หนังสือเดินทาง</option>
                  <option value="foreigner_id">บัตรประจำตัวต่างด้าว</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>เลขที่เอกสาร</label>
                <input style={styles.input}
                  onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
              </div>
              <div>
                <label style={styles.label}>วันเกิด</label>
                <input style={styles.input} type="date"
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <label style={styles.label}>ระดับ KYC</label>
                <select style={styles.input} value={form.kyc_level}
                  onChange={e => setForm(f => ({ ...f, kyc_level: e.target.value }))}>
                  <option value="basic">Basic (บุคคลธรรมดา)</option>
                  <option value="enhanced">Enhanced (รายได้สูง)</option>
                  <option value="business">Business (นิติบุคคล)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <input type="checkbox" defaultChecked
                onChange={e => setForm(f => ({ ...f, pdpa_consent: e.target.checked }))} />
              <label style={{ fontSize: 12, color: C.muted }}>
                ฉันยินยอมให้ OpenThaiAi เก็บรวบรวมและใช้ข้อมูลส่วนบุคคลตามนโยบาย PDPA
                เพื่อวัตถุประสงค์ในการเปิดบัญชีและการให้บริการธนาคารดิจิทัล
              </label>
            </div>
            <button style={{ ...styles.btn('primary'), marginTop: 16 }} onClick={submit}>
              ยื่นคำขอ KYC
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Loans Tab ────────────────────────────────────────────────────────────────

function LoansTab() {
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ loan_type: 'sme', amount: '', term_months: '36', purpose: '' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const RATES = { personal: 15.99, sme: 6.99, otop: 4.50, housing: 3.75, vehicle: 5.99, education: 3.00 };

  const load = () => {
    apiFetch('/api/bank/loans').then(r => r.json()).then(r => { if (r.success) setLoans(r.loans); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const apply = async () => {
    setError(null); setMsg(null); setLoading(true);
    const r = await apiFetch('/api/bank/loans/apply', { method: 'POST', body: JSON.stringify(form) });
    const d = await r.json();
    setLoading(false);
    if (d.success) { setMsg(`ยื่นขอสินเชื่อสำเร็จ — ผ่อน ฿${fmt(d.monthly_payment)}/เดือน`); load(); }
    else setError(d.error?.message || 'ยื่นขอสินเชื่อไม่สำเร็จ');
  };

  const rate = RATES[form.loan_type] || 6.99;
  const monthly = form.amount && form.term_months
    ? (() => { const r = rate / 100 / 12; const n = parseInt(form.term_months);
        const p = parseFloat(form.amount);
        return r === 0 ? p / n : p * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1); })()
    : 0;

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>🏛️ ยื่นขอสินเชื่อ</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>ประเภทสินเชื่อ</label>
            <select style={styles.input} value={form.loan_type}
              onChange={e => setForm(f => ({ ...f, loan_type: e.target.value }))}>
              <option value="personal">สินเชื่อส่วนบุคคล (15.99%)</option>
              <option value="sme">สินเชื่อ SME (6.99%)</option>
              <option value="otop">สินเชื่อ OTOP (4.50%)</option>
              <option value="housing">สินเชื่อบ้าน (3.75%)</option>
              <option value="vehicle">สินเชื่อรถยนต์ (5.99%)</option>
              <option value="education">สินเชื่อการศึกษา (3.00%)</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>วงเงิน (บาท)</label>
            <input style={styles.input} type="number" placeholder="500000"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>ระยะเวลา (เดือน)</label>
            <select style={styles.input} value={form.term_months}
              onChange={e => setForm(f => ({ ...f, term_months: e.target.value }))}>
              <option value="12">12 เดือน</option>
              <option value="24">24 เดือน</option>
              <option value="36">36 เดือน</option>
              <option value="60">60 เดือน</option>
              <option value="120">120 เดือน</option>
              <option value="240">240 เดือน</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>บัญชีรับเงิน</label>
            <select style={styles.input} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>วัตถุประสงค์การกู้</label>
          <input style={styles.input} placeholder="เช่น ขยายกิจการ OTOP, ซื้อเครื่องจักร"
            onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
        </div>
        {monthly > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.surface,
            borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted, fontSize: 12 }}>ผ่อนชำระประมาณ: </span>
            <span style={{ color: C.cyan, fontWeight: 700 }}>฿{fmt(monthly)} / เดือน</span>
            <span style={{ color: C.muted, fontSize: 12 }}> · ดอกเบี้ย {rate}% ต่อปี</span>
          </div>
        )}
        <button style={{ ...styles.btn('primary'), marginTop: 14 }} onClick={apply} disabled={loading}>
          {loading ? 'กำลังส่ง…' : 'ยื่นคำขอสินเชื่อ'}
        </button>
      </div>
      <div style={styles.sectionTitle}>📋 สินเชื่อของฉัน ({loans.length})</div>
      {loans.length === 0
        ? <div style={{ color: C.muted, fontSize: 13 }}>ไม่มีสินเชื่อ</div>
        : loans.map(l => (
          <div key={l.id} style={{ ...styles.card, marginBottom: 10 }}>
            <div style={styles.row}>
              <span style={styles.statusDot(l.status)} />
              <div>
                <div style={{ fontWeight: 700 }}>{l.loan_type.toUpperCase()} · ฿{fmt(l.amount)}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  คงค้าง ฿{fmt(l.balance_owing)} · {l.interest_rate}% · {l.term_months} เดือน
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: l.status === 'active' ? C.green : C.gold }}>
                {l.status}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── Insurance Tab ────────────────────────────────────────────────────────────

function InsuranceTab() {
  const [policies, setPolicies] = useState([]);
  const [plans, setPlans] = useState({});
  const [form, setForm] = useState({ plan_code: 'HEALTH_OTOP' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/insurance').then(r => r.json()).then(r => {
      if (r.success) { setPolicies(r.policies); setPlans(r.plans || {}); }
    });
  };
  useEffect(load, []);

  const apply = async () => {
    setError(null); setMsg(null);
    const r = await apiFetch('/api/bank/insurance/apply', { method: 'POST', body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) { setMsg(`กรมธรรม์ ${d.insurance.policy_number} เปิดใช้งานแล้ว`); load(); }
    else setError(d.error?.message || 'สมัครประกันไม่สำเร็จ');
  };

  const PLAN_CODES = Object.keys(plans);
  const selectedPlan = plans[form.plan_code];

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>🛡️ เลือกแผนประกัน</div>
      <div style={styles.card}>
        <label style={styles.label}>แผนประกัน</label>
        <select style={styles.input} value={form.plan_code}
          onChange={e => setForm(f => ({ ...f, plan_code: e.target.value }))}>
          {PLAN_CODES.map(code => (
            <option key={code} value={code}>{plans[code]?.name_th} — ฿{fmt(plans[code]?.premium)}/เดือน</option>
          ))}
        </select>
        {selectedPlan && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.surface,
            borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.muted }}>วงเงินคุ้มครอง</div>
            <div style={{ fontWeight: 700, color: C.green, fontSize: 18 }}>฿{fmt(selectedPlan.coverage)}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              เบี้ย ฿{fmt(selectedPlan.premium)}/เดือน · ประเภท: {selectedPlan.type}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>ผู้รับประโยชน์ (ถ้ามี)</label>
          <input style={styles.input} placeholder="ชื่อผู้รับประโยชน์"
            onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} />
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 14 }} onClick={apply}>สมัครประกัน</button>
      </div>
      <div style={styles.sectionTitle}>📜 กรมธรรม์ของฉัน ({policies.length})</div>
      {policies.length === 0
        ? <div style={{ color: C.muted, fontSize: 13 }}>ยังไม่มีกรมธรรม์</div>
        : policies.map(p => (
          <div key={p.id} style={{ ...styles.card, marginBottom: 10 }}>
            <div style={styles.row}>
              <span style={styles.statusDot(p.status)} />
              <div>
                <div style={{ fontWeight: 700 }}>{p.plan_name_th}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {p.policy_number} · คุ้มครอง ฿{fmt(p.coverage_amount)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: C.gold, fontWeight: 700 }}>฿{fmt(p.premium_monthly)}/เดือน</div>
                <div style={{ fontSize: 11, color: p.status === 'active' ? C.green : C.red }}>{p.status}</div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── Investment Tab ───────────────────────────────────────────────────────────

function InvestTab() {
  const [products, setProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ direction: 'buy', amount: '', nav_price: '10' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [cat, setCat] = useState('');

  const load = () => {
    const url = cat ? `/api/bank/investments/products?category=${cat}` : '/api/bank/investments/products';
    apiFetch(url).then(r => r.json()).then(r => { if (r.success) setProducts(r.products); });
    apiFetch('/api/bank/investments').then(r => r.json()).then(r => { if (r.success) setPortfolio(r.portfolio); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, [cat]);

  const order = async () => {
    setError(null); setMsg(null);
    if (!form.product_code || !form.account_id || !form.amount) return setError('กรุณากรอกข้อมูลให้ครบ');
    const r = await apiFetch('/api/bank/investments/order', { method: 'POST', body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) { setMsg(`${form.direction === 'buy' ? 'ซื้อ' : 'ขาย'} ${d.units} units สำเร็จ`); load(); }
    else setError(d.error?.message || 'คำสั่งซื้อขายไม่สำเร็จ');
  };

  const CATS = [
    { v: '', l: 'ทั้งหมด' }, { v: 'government_bond', l: 'พันธบัตรรัฐ' },
    { v: 'mutual_fund', l: 'กองทุนรวม' }, { v: 'corporate_bond', l: 'หุ้นกู้' },
    { v: 'gold', l: 'ทอง' }, { v: 'otai_token', l: 'OTAI' },
  ];

  const RISK_COLOR = { low: C.green, medium: C.gold, high: C.red, very_high: '#c026d3' };

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>📈 ผลิตภัณฑ์การลงทุน</div>
      <div style={{ ...styles.row, marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        {CATS.map(c => (
          <button key={c.v} style={{ ...styles.btn(cat === c.v ? 'primary' : 'ghost'), padding: '6px 12px', fontSize: 12 }}
            onClick={() => setCat(c.v)}>{c.l}</button>
        ))}
      </div>
      <div style={styles.grid2}>
        {products.map(p => (
          <div key={p.code} style={{ ...styles.card, cursor: 'pointer',
            border: form.product_code === p.code ? `2px solid ${C.cyan}` : `1px solid ${C.border}` }}
            onClick={() => setForm(f => ({ ...f, product_code: p.code }))}>
            <div style={{ fontWeight: 700 }}>{p.name_th}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.name_en}</div>
            <div style={{ ...styles.row, marginTop: 8 }}>
              <span style={{ color: C.green, fontWeight: 700 }}>{p.expected_return}% ต่อปี</span>
              <span style={{ fontSize: 11, color: RISK_COLOR[p.risk_level] || C.muted, marginLeft: 'auto' }}>
                {p.risk_level}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              ขั้นต่ำ ฿{fmt(p.min_investment)}
            </div>
          </div>
        ))}
      </div>
      {form.product_code && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={styles.sectionTitle}>📋 คำสั่งซื้อขาย — {form.product_code}</div>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>บัญชี</label>
              <select style={styles.input} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">เลือกบัญชี</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} — ฿{fmt(a.balance)}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>คำสั่ง</label>
              <select style={styles.input} value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                <option value="buy">ซื้อ (Buy)</option>
                <option value="sell">ขาย (Sell)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>จำนวนเงิน (บาท)</label>
              <input style={styles.input} type="number" placeholder="10000"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>ราคา NAV</label>
              <input style={styles.input} type="number" value={form.nav_price}
                onChange={e => setForm(f => ({ ...f, nav_price: e.target.value }))} />
            </div>
          </div>
          <button style={{ ...styles.btn(form.direction === 'buy' ? 'primary' : 'danger'), marginTop: 12 }}
            onClick={order}>{form.direction === 'buy' ? 'ซื้อกองทุน' : 'ขายกองทุน'}</button>
        </div>
      )}
      {portfolio.length > 0 && (
        <>
          <div style={styles.sectionTitle}>💼 พอร์ตของฉัน</div>
          {portfolio.map(p => (
            <div key={p.code} style={{ ...styles.card, marginBottom: 10 }}>
              <div style={styles.row}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name_th || p.code}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{p.units.toFixed(4)} units · {p.orders} คำสั่ง</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: p.invested >= 0 ? C.green : C.red }}>
                    ฿{fmt(Math.abs(p.invested))}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.category}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Bills Tab ────────────────────────────────────────────────────────────────

function BillsTab() {
  const [billers, setBillers] = useState([]);
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ ref1: '', amount: '' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [cat, setCat] = useState('');

  const load = () => {
    const url = cat ? `/api/bank/bills/billers?category=${cat}` : '/api/bank/bills/billers';
    apiFetch(url).then(r => r.json()).then(r => { if (r.success) setBillers(r.billers); });
    apiFetch('/api/bank/bills/history').then(r => r.json()).then(r => { if (r.success) setHistory(r.payments); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, [cat]);

  const pay = async () => {
    setError(null); setMsg(null);
    if (!form.biller_code || !form.account_id || !form.amount || !form.ref1)
      return setError('กรุณากรอกข้อมูลให้ครบ');
    const r = await apiFetch('/api/bank/bills/pay', { method: 'POST', body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) { setMsg(`ชำระบิล ${d.biller.name_th} ฿${fmt(d.total)} สำเร็จ`); load(); }
    else setError(d.error?.message || 'ชำระบิลไม่สำเร็จ');
  };

  const BILL_CATS = [
    { v: '', l: 'ทั้งหมด' }, { v: 'utility', l: 'ค่าสาธารณูปโภค' },
    { v: 'telecom', l: 'โทรศัพท์/Internet' }, { v: 'tax', l: 'ภาษี' },
    { v: 'government', l: 'ราชการ' }, { v: 'loan', l: 'สินเชื่อ' },
    { v: 'education', l: 'การศึกษา' }, { v: 'hospital', l: 'โรงพยาบาล' },
  ];

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>📄 ชำระบิล</div>
      <div style={{ ...styles.row, marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        {BILL_CATS.map(c => (
          <button key={c.v} style={{ ...styles.btn(cat === c.v ? 'primary' : 'ghost'), padding: '6px 12px', fontSize: 12 }}
            onClick={() => { setCat(c.v); setForm(f => ({ ...f, biller_code: '' })); }}>{c.l}</button>
        ))}
      </div>
      <div style={{ ...styles.grid2, marginBottom: 16 }}>
        {billers.map(b => (
          <div key={b.code} style={{ ...styles.card, cursor: 'pointer', padding: '12px 16px',
            border: form.biller_code === b.code ? `2px solid ${C.cyan}` : `1px solid ${C.border}` }}
            onClick={() => setForm(f => ({ ...f, biller_code: b.code }))}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name_th}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{b.category}</div>
          </div>
        ))}
      </div>
      {form.biller_code && (
        <div style={styles.card}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: C.cyan }}>
            ชำระ: {billers.find(b => b.code === form.biller_code)?.name_th}
          </div>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>บัญชีตัดเงิน</label>
              <select style={styles.input} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">เลือกบัญชี</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} — ฿{fmt(a.balance)}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>จำนวนเงิน (บาท)</label>
              <input style={styles.input} type="number" placeholder="500"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>เลขอ้างอิง 1</label>
              <input style={styles.input} placeholder="เลขผู้ใช้ / เลขบัญชี"
                onChange={e => setForm(f => ({ ...f, ref1: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>เลขอ้างอิง 2 (ถ้ามี)</label>
              <input style={styles.input} placeholder="รหัสพื้นที่ / เพิ่มเติม"
                onChange={e => setForm(f => ({ ...f, ref2: e.target.value }))} />
            </div>
          </div>
          <button style={{ ...styles.btn('primary'), marginTop: 12 }} onClick={pay}>ยืนยันการชำระ</button>
        </div>
      )}
      {history.length > 0 && (
        <>
          <div style={styles.sectionTitle}>📋 ประวัติการชำระ</div>
          <table style={styles.table}>
            <thead><tr>
              <th style={styles.th}>ผู้รับ</th><th style={styles.th}>จำนวน</th>
              <th style={styles.th}>อ้างอิง</th><th style={styles.th}>วันที่</th>
            </tr></thead>
            <tbody>
              {history.map(p => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.bank_bill_billers?.name_th || p.biller_code}</td>
                  <td style={styles.td}>฿{fmt(p.amount)}</td>
                  <td style={styles.td}>{p.ref1}</td>
                  <td style={styles.td}>{new Date(p.created_at).toLocaleDateString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ─── Trade Finance Tab ────────────────────────────────────────────────────────

function TradeTab() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ instrument: 'tt', currency: 'USD', amount: '', counterparty: '', purpose: '' });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/trade').then(r => r.json()).then(r => { if (r.success) setTrades(r.trade_finance); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const apply = async () => {
    setError(null); setMsg(null);
    const r = await apiFetch('/api/bank/trade/apply', { method: 'POST', body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) { setMsg(`ยื่นขอ ${form.instrument.toUpperCase()} สำเร็จ`); load(); }
    else setError(d.error?.message || 'ไม่สำเร็จ');
  };

  const INSTRUMENTS = [
    { v: 'tt',              l: 'Telegraphic Transfer (TT)' },
    { v: 'lc_import',      l: 'Letter of Credit — นำเข้า (LC Import)' },
    { v: 'lc_export',      l: 'Letter of Credit — ส่งออก (LC Export)' },
    { v: 'invoice_finance', l: 'Invoice Finance' },
    { v: 'trust_receipt',  l: 'Trust Receipt (TR)' },
    { v: 'bank_guarantee', l: 'Bank Guarantee' },
  ];

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>🚢 Trade Finance ไทย–ASEAN–สากล</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>เครื่องมือทางการค้า</label>
            <select style={styles.input} value={form.instrument}
              onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}>
              {INSTRUMENTS.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>บัญชีที่ใช้</label>
            <select style={styles.input} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>คู่ค้า (Counterparty)</label>
            <input style={styles.input} placeholder="ชื่อบริษัทหรือธนาคารคู่ค้า"
              onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>ประเทศคู่ค้า</label>
            <input style={styles.input} placeholder="CN / SG / JP / US…"
              onChange={e => setForm(f => ({ ...f, counterparty_country: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>มูลค่า</label>
            <input style={styles.input} type="number" placeholder="100000"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>สกุลเงิน</label>
            <select style={styles.input} value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="USD">USD</option><option value="EUR">EUR</option>
              <option value="CNY">CNY</option><option value="SGD">SGD</option>
              <option value="JPY">JPY</option><option value="GBP">GBP</option>
              <option value="THB">THB</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>วัตถุประสงค์</label>
          <input style={styles.input} placeholder="เช่น นำเข้าวัตถุดิบ, ส่งออกสินค้า OTOP"
            onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={styles.label}>SWIFT Reference (ถ้ามี)</label>
          <input style={styles.input} placeholder="SWIFT BIC / Reference"
            onChange={e => setForm(f => ({ ...f, swift_ref: e.target.value }))} />
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 14 }} onClick={apply}>ยื่นขอ Trade Finance</button>
      </div>
      {trades.length > 0 && (
        <>
          <div style={styles.sectionTitle}>📋 รายการ Trade Finance</div>
          {trades.map(t => (
            <div key={t.id} style={{ ...styles.card, marginBottom: 10 }}>
              <div style={styles.row}>
                <span style={styles.statusDot(t.status)} />
                <div>
                  <div style={{ fontWeight: 700 }}>{t.instrument.toUpperCase()} — {t.counterparty}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {t.currency} {fmt(t.amount)} · {t.counterparty_country || '—'}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: C.gold }}>{t.status}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────

function PayrollTab() {
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [empForm, setEmpForm] = useState({ full_name: '', base_salary: '', position: '', department: '' });
  const [runForm, setRunForm] = useState({ period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() });
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiFetch('/api/bank/payroll/employees').then(r => r.json()).then(r => { if (r.success) setEmployees(r.employees); });
    apiFetch('/api/bank/payroll/history').then(r => r.json()).then(r => { if (r.success) setRuns(r.runs); });
    apiFetch('/api/bank/accounts').then(r => r.json()).then(r => { if (r.success) setAccounts(r.accounts); });
  };
  useEffect(load, []);

  const addEmployee = async () => {
    setError(null); setMsg(null);
    const r = await apiFetch('/api/bank/payroll/employees', { method: 'POST', body: JSON.stringify(empForm) });
    const d = await r.json();
    if (d.success) { setMsg(`เพิ่มพนักงาน ${d.employee.full_name} สำเร็จ`); load(); }
    else setError(d.error?.message || 'ไม่สำเร็จ');
  };

  const runPayroll = async () => {
    setError(null); setMsg(null);
    if (!runForm.account_id) return setError('กรุณาเลือกบัญชี');
    const r = await apiFetch('/api/bank/payroll/run', { method: 'POST', body: JSON.stringify(runForm) });
    const d = await r.json();
    if (d.success) {
      setMsg(`จ่ายเงินเดือน ${d.summary.employees} คน รวม ฿${fmt(d.summary.total_net)} สำเร็จ`);
      load();
    } else setError(d.error?.message || 'จ่ายเงินเดือนไม่สำเร็จ');
  };

  const totalSalary = employees.reduce((s, e) => s + parseFloat(e.base_salary ?? 0), 0);

  return (
    <div>
      <Alert msg={msg} type="success" />
      <Alert msg={error} type="error" />
      <div style={styles.sectionTitle}>👥 พนักงาน ({employees.length} คน · เงินเดือนรวม ฿{fmt(totalSalary)})</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>ชื่อพนักงาน</label>
            <input style={styles.input} placeholder="ชื่อ-นามสกุล"
              onChange={e => setEmpForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>เงินเดือนพื้นฐาน (บาท)</label>
            <input style={styles.input} type="number" placeholder="25000"
              onChange={e => setEmpForm(f => ({ ...f, base_salary: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>ตำแหน่ง</label>
            <input style={styles.input} placeholder="Sales Manager"
              onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>แผนก</label>
            <input style={styles.input} placeholder="Operations"
              onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))} />
          </div>
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 12 }} onClick={addEmployee}>เพิ่มพนักงาน</button>
      </div>
      {employees.length > 0 && (
        <table style={{ ...styles.table, marginTop: 12 }}>
          <thead><tr>
            <th style={styles.th}>ชื่อ</th><th style={styles.th}>ตำแหน่ง</th>
            <th style={styles.th}>แผนก</th><th style={styles.th}>เงินเดือน</th>
          </tr></thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id}>
                <td style={styles.td}>{e.full_name}</td>
                <td style={styles.td}>{e.position || '—'}</td>
                <td style={styles.td}>{e.department || '—'}</td>
                <td style={styles.td}>฿{fmt(e.base_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ ...styles.sectionTitle, marginTop: 24 }}>🏧 จ่ายเงินเดือน</div>
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>บัญชีตัดเงิน</label>
            <select style={styles.input} onChange={e => setRunForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">เลือกบัญชี</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} — ฿{fmt(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>งวดเดือน</label>
            <select style={styles.input} value={runForm.period_month}
              onChange={e => setRunForm(f => ({ ...f, period_month: e.target.value }))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
            </select>
          </div>
        </div>
        <button style={{ ...styles.btn('primary'), marginTop: 12 }} onClick={runPayroll}>
          จ่ายเงินเดือน — ฿{fmt(totalSalary)} (ก่อนหัก)
        </button>
      </div>
      {runs.length > 0 && (
        <>
          <div style={styles.sectionTitle}>📋 ประวัติการจ่ายเงินเดือน</div>
          {runs.map(r => (
            <div key={r.id} style={{ ...styles.card, marginBottom: 8 }}>
              <div style={styles.row}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.period_year}-{String(r.period_month).padStart(2,'0')}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{r.employee_count} คน</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: C.cyan }}>฿{fmt(r.total_net)}</div>
                  <div style={{ fontSize: 11, color: r.status === 'completed' ? C.green : C.gold }}>{r.status}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DigitalBankPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabContent = {
    dashboard: <DashboardTab />,
    accounts:  <AccountsTab />,
    transfer:  <TransferTab />,
    products:  <ProductsTab />,
    loans:     <LoansTab />,
    insurance: <InsuranceTab />,
    invest:    <InvestTab />,
    bills:     <BillsTab />,
    trade:     <TradeTab />,
    payroll:   <PayrollTab />,
    staking:   <StakingTab />,
    cards:     <CardsTab />,
    fx:        <FXTab />,
    mbridge:   <MBridgeTab />,
    advisor:   <AdvisorTab />,
    kyc:       <KYCTab />,
  };

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroFlag}>🇹🇭🏦</div>
        <h1 style={styles.heroTitle}>ธนาคารดิจิทัลไทย</h1>
        <p style={styles.heroSub}>
          OpenThaiAi Digital Bank of Thailand · OTOP / SME / สินค้าอื่นๆ · ไทย–ASEAN–สากล
        </p>
        <div style={styles.heroBadges}>
          <span style={{ ...styles.badge, color: C.cyan, borderColor: C.cyan }}>🤖 AI-Powered</span>
          <span style={{ ...styles.badge, color: C.green, borderColor: C.green }}>🌏 mBridge</span>
          <span style={{ ...styles.badge, color: C.gold, borderColor: C.gold }}>🔒 OTAI Staking</span>
          <span style={{ ...styles.badge, color: C.thai, borderColor: C.thai }}>PromptPay ✅</span>
          <span style={{ ...styles.badge, color: C.purple, borderColor: C.purple }}>e-CNY</span>
          <span style={{ ...styles.badge, color: C.blue, borderColor: C.blue }}>🏛️ สินเชื่อ</span>
          <span style={{ ...styles.badge, color: '#ec4899', borderColor: '#ec4899' }}>🛡️ ประกัน</span>
          <span style={{ ...styles.badge, color: C.green, borderColor: C.green }}>📈 ลงทุน</span>
          <span style={{ ...styles.badge, color: C.muted, borderColor: C.muted }}>🚢 Trade</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={styles.tab(activeTab === t.id)}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.container}>
        {tabContent[activeTab]}
      </div>

      {/* Disclaimer */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`,
          paddingTop: 16, lineHeight: 1.6 }}>
          ⚠️ <strong>หมายเหตุ:</strong> ธนาคารดิจิทัลไทยนี้อยู่ในระหว่างการพัฒนา (Development Mode)
          ต้องผ่านการอนุมัติจาก PDPA Gate G1 และได้รับใบอนุญาตจากธนาคารแห่งประเทศไทยก่อนเปิดให้บริการจริง
          OTAI Token เป็น Private Utility Token ภายใต้ OpenThaiAi ไม่ใช่ CBDC
          · mBridge อยู่ใน Sandbox Mode เท่านั้น
        </div>
      </div>
    </div>
  );
}
