import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PAYMENT_GROUPS, PAYMENT_STATS, GATEWAYS } from '../data/paymentMethods';

export default function PaymentMethodsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({ thai: true });

  useEffect(() => { document.title = 'ช่องทางชำระเงิน — OpenThai AI'; }, []);

  const toggleGroup = (id) => setExpandedGroups((p) => ({ ...p, [id]: !p[id] }));

  const q = search.toLowerCase().trim();
  const filtered = PAYMENT_GROUPS
    .filter((g) => activeGroup === 'all' || g.id === activeGroup)
    .map((g) => ({
      ...g,
      methods: q
        ? g.methods.filter((m) => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))
        : g.methods,
    }))
    .filter((g) => g.methods.length > 0);

  const totalShown = filtered.reduce((s, g) => s + g.methods.length, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* NAV */}
      <nav style={{ padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/')} style={navBtn}>← หน้าหลัก</button>
        <button onClick={() => navigate('/pricing')} style={navBtn}>💳 ราคา</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate('/pricing')} style={{ ...primaryBtn, padding: '8px 18px', fontSize: 13 }}>
          เริ่มใช้งาน →
        </button>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '56px 5% 40px' }}>
        <div style={badge}>🏦 ช่องทางชำระเงิน</div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,50px)', fontWeight: 900, margin: '12px 0 10px', lineHeight: 1.2 }}>
          ชำระเงินได้ทุกช่องทาง<br />
          <span style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ทั่วโลก {PAYMENT_STATS.countries}+ ประเทศ
          </span>
        </h1>
        <p style={{ color: '#64748b', fontSize: 15, maxWidth: 500, margin: '0 auto 32px' }}>
          รองรับ {PAYMENT_STATS.total}+ ช่องทาง จาก {PAYMENT_STATS.countries}+ ประเทศ ทั้งธนาคาร, E-Wallet, บัตรเครดิต และ Crypto
        </p>

        {/* STAT CHIPS */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          {[
            { v: PAYMENT_STATS.total + '+', l: 'ช่องทาง' },
            { v: PAYMENT_STATS.countries + '+', l: 'ประเทศ' },
            { v: PAYMENT_STATS.currencies + '+', l: 'สกุลเงิน' },
            { v: '5', l: 'Payment Gateways' },
          ].map((s) => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#6366f1' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FILTER BAR */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5% 24px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {/* search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  ค้นหาธนาคาร / ช่องทาง..."
            style={{ flex: '1 1 220px', minWidth: 200, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontSize: 14, outline: 'none' }}
          />
          {/* group tabs */}
          {[{ id: 'all', l: 'ทั้งหมด' }, ...PAYMENT_GROUPS.map((g) => ({ id: g.id, l: g.label.split(' ')[0] + ' ' + g.id.charAt(0).toUpperCase() + g.id.slice(1) }))].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveGroup(t.id)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                border: activeGroup === t.id ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                background: activeGroup === t.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeGroup === t.id ? '#a5b4fc' : '#94a3b8',
              }}
            >
              {t.id === 'all' ? 'ทั้งหมด' : PAYMENT_GROUPS.find((g) => g.id === t.id)?.label.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
        {q && <p style={{ color: '#64748b', fontSize: 13 }}>พบ {totalShown} ช่องทาง สำหรับ "{search}"</p>}
      </section>

      {/* PAYMENT GROUPS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5% 60px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p>ไม่พบช่องทางที่ตรงกับ "{search}"</p>
          </div>
        )}

        {filtered.map((group) => {
          const open = !!expandedGroups[group.id] || !!q;
          return (
            <div key={group.id} style={{ marginBottom: 24, border: `1px solid ${group.color}22`, borderRadius: 16, overflow: 'hidden' }}>
              {/* group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: `${group.color}0a`, border: 'none', cursor: 'pointer', color: '#f8fafc', textAlign: 'left' }}
              >
                <span style={{ fontSize: 18, fontWeight: 800, color: group.color }}>{group.label}</span>
                <span style={{ background: `${group.color}22`, color: group.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                  {group.methods.length} ช่องทาง
                </span>
                <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
              </button>

              {/* methods grid */}
              {open && (
                <div style={{ padding: '16px 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                  {group.methods.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', transition: 'border-color .15s' }}>
                      <span style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>{m.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{m.label}</span>
                          {m.tag && (
                            <span style={{ background: `${group.color}22`, color: group.color, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                              {m.tag}
                            </span>
                          )}
                          {m.country && (
                            <span style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>
                              {m.country}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* gateway badge */}
              {open && (
                <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>ประมวลผลโดย:</span>
                  {group.gateway && GATEWAYS[group.gateway] && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      🔒 {GATEWAYS[group.gateway].name} — {GATEWAYS[group.gateway].desc}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* GATEWAY INFO SECTION */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5% 60px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>🔒 Payment Gateway ที่เรารองรับ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {Object.entries(GATEWAYS).filter(([k]) => k !== 'MANUAL').map(([k, g]) => (
            <div key={k} style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {k === 'OMISE' ? '🟣' : k === 'TWOC2P' ? '🔵' : k === 'STRIPE' ? '🔷' : k === 'CRYPTO' ? '₿' : '📱'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY SECTION */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 5% 60px' }}>
        <div style={{ ...card, textAlign: 'center', background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(254,44,85,0.06))', border: '1.5px solid rgba(99,102,241,0.15)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>ความปลอดภัยระดับสูง</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {['PCI DSS Level 1', 'SSL Encryption', '3D Secure', 'PDPA Compliant', 'ISO 27001', 'Zero Data Stored'].map((s) => (
              <div key={s} style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '8px', fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>
                ✓ {s}
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/pricing')} style={{ ...primaryBtn }}>
            💳 เริ่มสมัครแพ็กเกจ →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '24px 5% 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#334155', fontSize: 12, margin: '0 0 8px' }}>© 2026 OpenThai AI — ช่องทางชำระเงินทั้งหมดปลอดภัยและเข้ารหัส</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>แผนราคา</button>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>นโยบายความเป็นส่วนตัว</button>
          <button onClick={() => navigate('/contact')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>ติดต่อเรา</button>
        </div>
      </footer>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 };
const badge = { display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 8 };
const navBtn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
