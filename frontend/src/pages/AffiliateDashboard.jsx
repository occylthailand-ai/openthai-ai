import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';

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
  const [pp, setPp] = useState('');           // พร้อมเพย์สำหรับถอน
  const [wd, setWd] = useState(null);         // { withdrawals, pending_balance, ... }
  const [wdBusy, setWdBusy] = useState(false);

  // ถ้ามี ref ใน URL โหลดอัตโนมัติ
  useEffect(() => {
    if (refFromUrl) loadDashboard(refFromUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWithdrawals = (code) => {
    fetch(apiUrl(`/api/affiliate/withdrawals?ref_code=${encodeURIComponent(code)}`))
      .then(r => r.json()).then(d => { if (d.success) setWd(d); }).catch(() => {});
  };
  const requestWithdraw = async () => {
    if (!data) return;
    setWdBusy(true);
    try {
      const res = await fetch(apiUrl('/api/affiliate/withdraw'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: data.ref_code, promptpay: pp }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || 'ขอถอนไม่สำเร็จ');
      toast.success('ส่งคำขอถอนแล้ว รออนุมัติ');
      loadWithdrawals(data.ref_code);
    } catch (e) { toast.error(e.message); } finally { setWdBusy(false); }
  };

  const loadDashboard = async (code) => {
    if (!code.trim()) { setError('กรุณากรอก Ref Code'); toast.warn('กรุณากรอก Ref Code'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(apiUrl(`/api/affiliate/stats/${code.trim().toUpperCase()}`));
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        loadWithdrawals(json.data.ref_code);
      } else {
        setError(json.message || 'ไม่พบ Ref Code นี้ในระบบ');
      }
    } catch {
      setError('เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const refLink = `https://www.openthai-ai.com/?ref=${data?.ref_code || ''}`;
  // ลิงก์ปิดการขายตรง — จ่ายผ่านลิงก์นี้ = ได้ค่าคอมทันที (QuickPay ฿1,000)
  const payLink = `https://www.openthai-ai.com/pay?ref=${data?.ref_code || ''}&amount=1000&label=${encodeURIComponent('แพ็กเกจคอนเทนต์ AI 30 ชิ้น')}`;
  const tiktokDemo = 'https://vt.tiktok.com/ZSCB66nhQ/';
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

        {/* QUICKPAY MONEY LINK — จ่ายผ่านลิงก์นี้ = ได้ค่าคอมทันที */}
        <div style={{ ...glass, border: '1.5px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#6ee7b7', marginBottom: 2, fontWeight: 700 }}>ลิงก์ปิดการขาย ฿1,000 — จ่ายผ่านลิงก์นี้คุณได้ค่าคอม {Math.round((data?.commission_rate || 0.2) * 100)}% (฿{Math.round(1000 * (data?.commission_rate || 0.2))}/ดีล)</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payLink}</div>
            </div>
            <button onClick={() => copy(payLink, 'paylink')} style={{ ...smallBtn, background: copied === 'paylink' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              {copied === 'paylink' ? '✅ คัดลอกแล้ว' : '📋 คัดลอกลิงก์เงิน'}
            </button>
            <a href={tiktokDemo} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: 'none', background: 'rgba(254,44,85,0.15)', border: '1px solid rgba(254,44,85,0.35)', color: '#fda4af' }}>
              🎬 คลิปขาย TikTok ↗
            </a>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}>
            วิธีทำเงิน 24/7: แชร์ <strong style={{ color: '#fda4af' }}>คลิป TikTok</strong> + วาง <strong style={{ color: '#6ee7b7' }}>ลิงก์เงิน</strong> นี้ใน bio/คอมเมนต์ → ลูกค้าสแกนจ่ายพร้อมเพย์ → ระบบเครดิตค่าคอมเข้าบัญชีคุณอัตโนมัติ
          </div>

          {/* ลิงก์ติดตามต่อแพลตฟอร์ม (UTM) — รู้ว่าเงินมาจากช่องไหน */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>🔗 ลิงก์ติดตามต่อแพลตฟอร์ม (รู้ว่าเงินมาจากช่องไหน) — กดเพื่อคัดลอก:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['tiktok', '🎵 TikTok'], ['facebook', '📘 Facebook'], ['instagram', '📸 Instagram'], ['line', '💚 LINE']].map(([src, label]) => {
                const tracked = `${payLink}&utm_source=${src}&source=${src}`;
                return (
                  <button key={src} onClick={() => copy(tracked, `utm_${src}`)} style={{ ...smallBtn, fontSize: 12, background: copied === `utm_${src}` ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: copied === `utm_${src}` ? '#6ee7b7' : '#cbd5e1' }}>
                    {copied === `utm_${src}` ? '✅ คัดลอก' : label}
                  </button>
                );
              })}
            </div>
          </div>
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
              {data.monthly?.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                  {data.monthly.map((m) => (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>฿{m.earned}</div>
                      <div style={{ width: '100%', background: 'linear-gradient(180deg,#6366f1,#fe2c55)', borderRadius: '4px 4px 0 0', height: `${(m.earned / maxBar) * 100}px`, minHeight: 4, transition: 'height .4s' }} />
                      <div style={{ fontSize: 11, color: '#64748b' }}>{m.month}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>
                  ยังไม่มีข้อมูลรายได้รายเดือน
                </div>
              )}
            </div>

            {/* Clicks by Source — รู้ว่าคลิกมาจากช่องไหน */}
            <div style={glass}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>🔗 คลิกตามช่องทาง</div>
              {(() => {
                const SRC = { tiktok: ['🎵 TikTok', '#fe2c55'], facebook: ['📘 Facebook', '#1877f2'], instagram: ['📸 Instagram', '#e1306c'], line: ['💚 LINE', '#06c755'], youtube: ['▶️ YouTube', '#ff0000'], shopee: ['🛍️ Shopee', '#ee4d2d'], lazada: ['🛒 Lazada', '#0f146d'], x: ['✖️ X', '#94a3b8'], direct: ['🔗 ตรง', '#6366f1'], other: ['🌐 อื่นๆ', '#64748b'] };
                const entries = Object.entries(data.clicks_by_source || {}).sort((a, b) => b[1] - a[1]);
                const max = Math.max(1, ...entries.map(([, v]) => v));
                if (entries.length === 0) return <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14, textAlign: 'center' }}>ยังไม่มีข้อมูลคลิก — แชร์ลิงก์ติดตามต่อแพลตฟอร์มเพื่อดูว่าช่องไหนเวิร์ค</div>;
                return (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {entries.map(([src, n]) => {
                      const meta = SRC[src] || [src, '#64748b'];
                      return (
                        <div key={src}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                            <span>{meta[0]}</span><span style={{ color: meta[1], fontWeight: 700 }}>{n} คลิก</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(n / max) * 100}%`, background: meta[1], borderRadius: 4, transition: 'width .4s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Tier Progress */}
            <div style={glass}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>🏆 ระดับ & เป้าหมาย</div>
                <div style={{ fontSize: 12, color: tierColor, fontWeight: 700 }}>ค่าคอมปัจจุบัน {Math.round((data.commission_rate || 0.2) * 100)}%</div>
              </div>
              {data.next_tier && (
                <div style={{ fontSize: 12, color: '#6ee7b7', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                  🚀 อีก <strong>{data.next_tier.sales_to_go}</strong> ดีล เลื่อนเป็น <strong style={{ textTransform: 'capitalize' }}>{data.next_tier.tier}</strong> รับค่าคอม <strong>{Math.round(data.next_tier.rate * 100)}%</strong> อัตโนมัติ
                </div>
              )}
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
            {data.recent_sales?.length > 0 ? (
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
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 14 }}>ยังไม่มีการขายผ่านลิงก์ของคุณ</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>เริ่มแชร์ลิงก์เพื่อรับคอมมิชชั่น</div>
              </div>
            )}
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
              {/* ฟอร์มขอถอน */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10, fontWeight: 700 }}>📤 ขอถอนเข้าพร้อมเพย์ (ขั้นต่ำ ฿{100})</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input value={pp} onChange={e => setPp(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} inputMode="numeric"
                    placeholder="เบอร์พร้อมเพย์ 10 หลัก หรือเลขบัตร 13 หลัก"
                    style={{ flex: 1, minWidth: 220, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none' }} />
                  <button onClick={requestWithdraw} disabled={wdBusy || (wd?.pending_balance ?? data.pending_payout) < 100}
                    style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: (wdBusy || (wd?.pending_balance ?? data.pending_payout) < 100) ? '#374151' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    {wdBusy ? '⏳' : `ถอน ฿${(wd?.pending_balance ?? data.pending_payout).toLocaleString()}`}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>ถอนได้: <strong style={{ color: '#6ee7b7' }}>฿{(wd?.pending_balance ?? data.pending_payout).toLocaleString()}</strong> · จ่ายแล้วสะสม ฿{(wd?.paid_out ?? 0).toLocaleString()}</div>
              </div>

              {/* ประวัติคำขอถอน */}
              {wd?.withdrawals?.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>ประวัติการถอน</div>
                  {wd.withdrawals.map(w => {
                    const st = { pending: ['⏳ รออนุมัติ', '#f59e0b'], approved: ['✅ อนุมัติแล้ว', '#6366f1'], paid: ['💸 จ่ายแล้ว', '#10b981'], rejected: ['❌ ปฏิเสธ', '#ef4444'] }[w.status] || [w.status, '#94a3b8'];
                    return (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                        <span>฿{w.amount.toLocaleString()} → {w.promptpay}</span>
                        <span style={{ color: st[1], fontWeight: 700 }}>{st[0]}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, marginTop: 14 }}>
                💳 ขั้นต่ำ ฿100 · ⏱ ยอดขาย confirm ภายใน 3 วัน · แอดมินอนุมัติแล้วโอนเข้าพร้อมเพย์
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
