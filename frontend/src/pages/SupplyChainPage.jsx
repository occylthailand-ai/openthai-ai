import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ─── Supply Chain Control Tower ───────────────────────────────────────────────
// ศูนย์บัญชาการห่วงโซ่อุปทาน — รวมสุขภาพสต๊อก · แจ้งเตือนสั่งซื้อซ้ำ · ผู้ผลิต/ซัพพลายเออร์
// ใช้ข้อมูลจริงจาก /api/inventory/admin/* + /api/producers/admin/summary (Admin Key)
const ADMIN_KEY_FALLBACK = import.meta.env.VITE_ADMIN_KEY || 'openthai-admin-2026';
const sky = '#0ea5e9';

const card = (extra = {}) => ({ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, ...extra });
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputSt = { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 13px', color: '#1e293b', fontSize: 13, boxSizing: 'border-box', outline: 'none' };

const baht = n => '฿' + (Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

function KpiTile({ icon, label, value, sub, color = sky }) {
  return (
    <div style={card({ display: 'flex', flexDirection: 'column', gap: 4 })}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

export default function SupplyChainPage() {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin_key') || '');
  const [summary, setSummary] = useState(null);
  const [salesRep, setSalesRep] = useState(null);
  const [producers, setProducers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const keyHeader = useCallback(() => ({ 'x-admin-key': adminKey || ADMIN_KEY_FALLBACK }), [adminKey]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, sr, p] = await Promise.all([
        fetch(apiUrl('/api/inventory/admin/summary'), { headers: keyHeader() }).then(r => r.json()),
        fetch(apiUrl('/api/inventory/admin/sales-report'), { headers: keyHeader() }).then(r => r.json()),
        fetch(apiUrl('/api/producers/admin/summary'), { headers: keyHeader() }).then(r => r.json()),
      ]);
      if (s.success === false) { setError(s.message || 'Admin Key ไม่ถูกต้อง'); }
      else { setSummary(s); setSalesRep(sr.success ? sr : null); setProducers(p.success ? p : null); }
    } catch { setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
    setLoading(false);
  }, [keyHeader]);

  useEffect(() => { if (adminKey) load(); /* eslint-disable-next-line */ }, []);

  const saveKeyAndLoad = () => { sessionStorage.setItem('admin_key', adminKey); load(); };

  // Derived metrics
  const lowStock = summary?.lowStock || [];
  const turnover = summary && summary.totalUnits > 0 ? (summary.unitsSold / summary.totalUnits) : null;
  const sellThrough = summary && (summary.unitsSold + summary.totalUnits) > 0
    ? Math.round((summary.unitsSold / (summary.unitsSold + summary.totalUnits)) * 100) : null;
  const rows = salesRep?.rows || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>🔗 Supply Chain Control Tower</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>ศูนย์บัญชาการห่วงโซ่อุปทาน · สต๊อก · สั่งซื้อซ้ำ · ผู้ผลิต</div>
        </div>
        <button onClick={() => navigate('/skills')} style={{ background: `linear-gradient(135deg,${sky},#0284c7)`, border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🤖 AI ที่ปรึกษา (S19)</button>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 5% 0', display: 'grid', gap: 20 }}>
        {/* Admin key bar */}
        <div style={card({ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' })}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={labelSt}>🔑 Admin Key</label>
            <input style={inputSt} type="password" placeholder="ใส่ Admin Key เพื่อดูข้อมูลจริง" value={adminKey}
              onChange={e => setAdminKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKeyAndLoad()} />
          </div>
          <button onClick={saveKeyAndLoad} disabled={loading}
            style={{ background: loading ? '#94a3b8' : `linear-gradient(135deg,${sky},#0284c7)`, border: 'none', borderRadius: 10, padding: '11px 22px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {loading ? '⏳ กำลังโหลด...' : '🔄 โหลดข้อมูล'}
          </button>
        </div>

        {error && <div style={card({ borderLeft: '4px solid #ef4444', color: '#ef4444', fontSize: 13 })}>⚠️ {error}</div>}

        {summary && (
          <>
            {/* KPI tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
              <KpiTile icon="📦" label="SKU ทั้งหมด" value={summary.products} sub={`${summary.active} active`} />
              <KpiTile icon="🔢" label="หน่วยในสต๊อก" value={(summary.totalUnits || 0).toLocaleString('th-TH')} sub={`ขายไปแล้ว ${(summary.unitsSold || 0).toLocaleString('th-TH')}`} />
              <KpiTile icon="⚠️" label="ต้องสั่งซื้อซ้ำ" value={lowStock.length} sub="ต่ำกว่าจุดเตือน" color={lowStock.length ? '#ef4444' : '#10b981'} />
              <KpiTile icon="💰" label="มูลค่าสต๊อก (ขาย)" value={baht(summary.valueRetail)} sub={`ทุน ${baht(summary.valueCost)}`} color="#10b981" />
              <KpiTile icon="🔄" label="Inventory Turnover" value={turnover != null ? turnover.toFixed(2) : '—'} sub="ยิ่งสูงยิ่งหมุนเร็ว" />
              <KpiTile icon="📈" label="Sell-through" value={sellThrough != null ? sellThrough + '%' : '—'} sub="สัดส่วนที่ขายออก" />
            </div>

            {/* Reorder alerts */}
            <div style={card({ borderLeft: `4px solid ${lowStock.length ? '#ef4444' : '#10b981'}` })}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: lowStock.length ? '#ef4444' : '#10b981' }}>
                {lowStock.length ? `🚨 แจ้งเตือนสั่งซื้อซ้ำ (${lowStock.length})` : '✅ สต๊อกอยู่ในระดับปลอดภัย'}
              </div>
              {lowStock.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {lowStock.map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.sku || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>เหลือ {p.stock}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>จุดเตือน {p.low_stock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b' }}>ไม่มีสินค้าที่ต่ำกว่าจุดสั่งซื้อซ้ำ — บริหารสต๊อกได้ดี 👍</div>
              )}
            </div>

            {/* Stock + sales table */}
            {rows.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: sky }}>📊 สต๊อก & ยอดขายรายสินค้า</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                        <th style={{ padding: '6px 8px' }}>สินค้า</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>คงเหลือ</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>ขายแล้ว</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id || i} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '8px' }}><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.sku || '—'}</div></td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.low ? '#ef4444' : '#1e293b' }}>{r.remaining}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>{r.sold}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: r.low ? '#ef4444' : '#10b981', borderRadius: 20, padding: '2px 10px' }}>{r.low ? 'สั่งซื้อ' : 'ปกติ'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suppliers / producers */}
            {producers && (
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: sky }}>🏭 ผู้ผลิต / ซัพพลายเออร์</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12, marginBottom: 12 }}>
                  <KpiTile icon="👥" label="รวมทั้งหมด" value={producers.total || 0} />
                  <KpiTile icon="✅" label="อนุมัติแล้ว" value={producers.byStatus?.approved || 0} color="#10b981" />
                  <KpiTile icon="⏳" label="รออนุมัติ" value={producers.byStatus?.pending || 0} color="#f59e0b" />
                </div>
                {producers.byCategory && Object.keys(producers.byCategory).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(producers.byCategory).map(([cat, n]) => (
                      <span key={cat} style={{ fontSize: 12, background: '#f0f9ff', border: '1px solid rgba(14,165,233,0.25)', color: '#0284c7', borderRadius: 20, padding: '3px 10px' }}>{cat}: {n}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI advisor CTA */}
            <div style={card({ background: 'linear-gradient(135deg,#f0f9ff,#f8fafc)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' })}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0284c7' }}>🤖 ต้องการกลยุทธ์เชิงลึก?</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ให้ AI (S19) วิเคราะห์พยากรณ์ดีมานด์ · จัดซื้อ · โลจิสติกส์ · ความเสี่ยง รายสินค้า</div>
              </div>
              <button onClick={() => navigate('/skills')} style={{ background: `linear-gradient(135deg,${sky},#0284c7)`, border: 'none', borderRadius: 10, padding: '11px 22px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>เปิด Supply Chain AI →</button>
            </div>
          </>
        )}

        {!summary && !error && !loading && (
          <div style={card({ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' })}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>ใส่ Admin Key แล้วกด "โหลดข้อมูล"</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>เพื่อดูสุขภาพห่วงโซ่อุปทานแบบเรียลไทม์จากคลังสินค้าจริง</div>
          </div>
        )}
      </div>
    </div>
  );
}
