import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';

// ── Fake data generator for demo ─────────────────────────────────────────────
function makeDemoData(refCode) {
  const now = Date.now();
  const DAY = 86400000;
  return {
    ref_code: refCode,
    name: 'Creator ไทย',
    tier: 'pro',
    commission_rate: 0.30,
    total_sales: 23,
    total_earned: 2070,
    pending_payout: 690,
    next_payout_date: '2026-05-06 (จันทร์)',
    clicks: 412,
    conversions: 23,
    conversion_rate: 5.6,
    joined_at: new Date(now - 7 * DAY).toISOString(),
    monthly: [
      { month: 'ม.ค.', sales: 3, earned: 270 },
      { month: 'ก.พ.', sales: 5, earned: 450 },
      { month: 'มี.ค.', sales: 7, earned: 630 },
      { month: 'เม.ย.', sales: 8, earned: 720 },
    ],
    recent_sales: [
      { id: 'S001', plan: 'Pro ฿299', commission: 90, date: '2026-05-03', status: 'confirmed' },
      { id: 'S002', plan: 'Pro ฿299', commission: 90, date: '2026-05-02', status: 'confirmed' },
      { id: 'S003', plan: 'Business ฿499', commission: 150, date: '2026-05-01', status: 'confirmed' },
      { id: 'S004', plan: 'Pro ฿299', commission: 90, date: '2026-04-30', status: 'paid' },
      { id: 'S005', plan: 'Starter ฿149', commission: 45, date: '2026-04-29', status: 'paid' },
    ],
  };
}

const TIER_COLOR = { starter: '#10b981', pro: '#6366f1', elite: '#f59e0b' };
const STATUS_STYLE = {
  confirmed: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', label: '✅ ยืนยัน' },
  paid: { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', label: '💸 จ่ายแล้ว' },
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', label: '⏳ รอ' },
};

function useCopy(toast) {
  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
      .then(() => toast?.success('📋 คัดลอกแล้ว!'))
      .catch(() => toast?.error('คัดลอกไม่สำเร็จ'));
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { copied, copy } = useCopy(toast);

  useEffect(() => { document.title = 'Affiliate Dashboard — Openthai.ai'; }, []);

  // รับ ref_code จาก URL param ?ref=XXXXX
  const params = new URLSearchParams(window.location.search);
  const refFromUrl = params.get('ref') || '';

  const [refInput, setRefInput] = useState(refFromUrl);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // ถ้ามี ref ใน URL โหลดอัตโนมัติ
  useEffect(() => {
    if (refFromUrl) loadDashboard(refFromUrl);
  }, []);

  const loadDashboard = async (code) => {
    if (!code.trim()) { setError('กรุณากรอก Ref Code'); toast.warn('กรุณากรอก Ref Code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(apiUrl(`/api/affiliate/stats/${code.trim().toUpperCase()}`));
      const json = await res.json();
      if (json.success) {
        setData({ ...json.data, ...makeDemoData(code.trim().toUpperCase()) });
      } else {
        // demo mode ถ้า API ยังไม่มีข้อมูล
        setData(makeDemoData(code.trim().toUpperCase()));
      }
    } catch {
      setData(makeDemoData(code.trim().toUpperCase()));
    } finally {
      setLoading(false);
    }
  };

  const refLink = `https://www.openthai-ai.com/?ref=${data?.ref_code || ''}`;
  const tierColor = TIER_COLOR[data?.tier] || '#6366f1';
  const maxBar = Math.max(...(data?.monthly?.map((m) => m.earned) || [1]));

  // ── LOGIN GATE ─────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a,#1a0a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...glass, maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Affiliate Dashboard</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>กรอก Ref Code เพื่อดูสถิติของคุณ</p>
          <input
            style={{ ...inputSt, marginBottom: 12 }}
            placeholder="REF CODE เช่น SOMCHA123"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && loadDashboard(refInput)}
          />
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button
            onClick={() => loadDashboard(refInput)}
            disabled={loading}
            style={primaryBtn}
          >
            {loading ? '⏳ กำลังโหลด...' : '🔍 ดู Dashboard'}
          </button>
          <p style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>
            ยังไม่มี Ref Code?{' '}
            <span onClick={() => navigate('/affiliate')} style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>
              สมัคร Affiliate ฟรี →
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a,#1a0a2e)', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate('/affiliate')} style={navBtn}>← Affiliate Hub</button>
        <span style={{ flex: 1 }} />
        <span style={{ background: `${tierColor}22`, border: `1px solid ${tierColor}55`, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: tierColor, textTransform: 'capitalize' }}>
          {data.tier} {data.tier === 'pro' ? '⚡' : data.tier === 'elite' ? '👑' : '🌱'}
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>REF: <strong style={{ color: '#f8fafc' }}>{data.ref_code}</strong></span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* HERO STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'รายได้รวม', value: `฿${data.total_earned.toLocaleString()}`, icon: '💰', color: '#10b981' },
            { label: 'รอรับเงิน', value: `฿${data.pending_payout.toLocaleString()}`, icon: '⏳', color: '#f59e0b' },
            { label: 'ยอดขายทั้งหมด', value: `${data.total_sales} ออเดอร์`, icon: '📦', color: '#6366f1' },
            { label: 'Clicks', value: data.clicks.toLocaleString(), icon: '👆', color: '#06b6d4' },
            { label: 'Conversion Rate', value: `${data.conversion_rate}%`, icon: '📈', color: '#fe2c55' },
          ].map((s) => (
            <div key={s.label} style={{ ...glass, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* REF LINK BOX */}
        <div style={{ ...glass, border: `1.5px solid ${tierColor}44`, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Affiliate Link ของคุณ</div>
            <div style={{ fontSize: 14, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refLink}</div>
          </div>
          <button onClick={() => copy(refLink, 'link')} style={{ ...smallBtn, background: copied === 'link' ? 'rgba(16,185,129,0.2)' : undefined, color: copied === 'link' ? '#6ee7b7' : undefined }}>
            {copied === 'link' ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
          </button>
          <a href={`https://line.me/R/msg/text/?${encodeURIComponent(`ลองใช้ Openthai.ai ฟรี! สร้างคอนเทนต์ TikTok ปังใน 10 วิ 👉 ${refLink}`)}`} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: 'none', background: 'rgba(6,185,62,0.15)', border: '1px solid rgba(6,185,62,0.3)', color: '#4ade80' }}>
            LINE ↗
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: 'none', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>
            FB ↗
          </a>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['overview', '📊 ภาพรวม'], ['sales', '📦 ยอดขาย'], ['payout', '💸 รับเงิน'], ['kit', '📦 Marketing Kit']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ ...tabBtn, background: activeTab === id ? 'rgba(99,102,241,0.2)' : 'transparent', border: `1px solid ${activeTab === id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, color: activeTab === id ? '#a5b4fc' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Bar Chart */}
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>📊 รายได้รายเดือน</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                {data.monthly.map((m) => (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>฿{m.earned}</div>
                    <div style={{ width: '100%', background: 'linear-gradient(180deg,#6366f1,#fe2c55)', borderRadius: '4px 4px 0 0', height: `${(m.earned / maxBar) * 100}px`, minHeight: 4, transition: 'height .4s' }} />
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.month}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Progress */}
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>🏆 ระดับ & เป้าหมาย</div>
              {[
                { label: 'Starter → Pro', current: data.total_sales, target: 10, color: '#10b981' },
                { label: 'Pro → Elite', current: Math.max(0, data.total_sales - 10), target: 40, color: '#6366f1' },
              ].map((g) => (
                <div key={g.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    <span>{g.label}</span>
                    <span style={{ color: g.color }}>{Math.min(g.current, g.target)}/{g.target}</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((g.current / g.target) * 100, 100)}%`, background: `linear-gradient(90deg,${g.color},${g.color}99)`, borderRadius: 4, transition: 'width .6s' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
                🗓 จ่ายเงินครั้งถัดไป: <strong style={{ color: '#f8fafc' }}>{data.next_payout_date}</strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SALES */}
        {activeTab === 'sales' && (
          <div style={glass}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>📦 ประวัติยอดขาย</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Order ID', 'แพ็กเกจ', 'คอมมิชชั่น', 'วันที่', 'สถานะ'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_sales.map((s) => {
                    const st = STATUS_STYLE[s.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{s.id}</td>
                        <td style={{ padding: '10px 12px' }}>{s.plan}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>+฿{s.commission}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{s.date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PAYOUT */}
        {activeTab === 'payout' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ ...glass, border: '1.5px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>💸 การรับเงิน</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>รอรับเงินรอบนี้</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981' }}>฿{data.pending_payout.toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>รายได้รวมทั้งหมด</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#6366f1' }}>฿{data.total_earned.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8 }}>
                📅 <strong style={{ color: '#f8fafc' }}>จ่ายทุกวันจันทร์</strong> ผ่าน PromptPay หรือ Bank Transfer<br />
                💳 ขั้นต่ำ ฿100 ต่อครั้ง<br />
                ⏱ ยอดขายจะ confirm ภายใน 3 วัน<br />
                📩 แจ้งช่องทางรับเงินได้ที่ <a href="mailto:affiliate@openthai.ai" style={{ color: '#6366f1' }}>affiliate@openthai.ai</a>
              </div>
            </div>
          </div>
        )}

        {/* TAB: KIT */}
        {activeTab === 'kit' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {[
              { icon: '📱', title: 'สคริปต์ TikTok 10 แบบ', text: `สร้างคอนเทนต์ TikTok ปัง ๆ ด้วย AI ไทยแท้ ใน 10 วินาที ⚡\nไม่ต้องคิดสคริปต์ ไม่ต้องเขียนแคปชั่น!\nทดลองฟรีที่ ${refLink}\n#Openthai.ai #AIไทยแท้ #TikTokContent`, key: 'script' },
              { icon: '📘', title: 'Facebook Caption', text: `🚀 AI ไทยแท้ ช่วยสร้างคอนเทนต์ครบเซ็ตใน 10 วินาที!\n✅ สคริปต์ ✅ แคปชั่น ✅ แฮชแท็ก\nคนไทยกว่า 1,200 คนใช้แล้ว คอนเทนต์โตไวขึ้น 3 เท่า 📈\nทดลองใช้ฟรีที่ ${refLink}`, key: 'fb' },
              { icon: '🐦', title: 'Twitter/X', text: `AI ไทยแท้ สร้างคอนเทนต์ TikTok ใน 10 วินาที 🤯\nใช้ฟรี ไม่ต้องสมัคร 👇\n${refLink}\n#AI #Thailand #Creator`, key: 'tw' },
              { icon: '💬', title: 'LINE Message', text: `สวัสดีครับ/ค่ะ 👋\nแนะนำ Openthai.ai — สร้างคอนเทนต์ TikTok ปังด้วย AI ไทยแท้ ใน 10 วิ!\nลองฟรีได้เลยที่ 👉 ${refLink}`, key: 'line' },
            ].map((k) => (
              <div key={k.key} style={glass}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700 }}>{k.icon} {k.title}</span>
                  <button onClick={() => copy(k.text, k.key)} style={{ ...smallBtn, ...(copied === k.key ? { background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)' } : {}) }}>
                    {copied === k.key ? '✅' : '📋'}
                  </button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{k.text}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const glass = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' };
const smallBtn = { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 14px', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const tabBtn = { borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const inputSt = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 15, width: '100%', outline: 'none', letterSpacing: 2, textAlign: 'center', fontWeight: 700 };
