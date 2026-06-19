import React, { useState, useEffect } from 'react';
import { apiUrl } from '../apiBase';

export default function GlobalConnectPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/global-connect/countries'))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setData)
      .catch(() => setError('โหลดข้อมูลไม่ได้ กรุณาลองใหม่'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <header style={{
        background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← กลับ</a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🌍 Global Safe Connect</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>เชื่อมผู้ค้าและลูกค้าทั่วโลกอย่างปลอดภัย</div>
        </div>
        {data && (
          <div style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>
            {data.active_count} ประเทศ Active
          </div>
        )}
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.12))',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: 16, padding: '24px',
          textAlign: 'center', marginBottom: 28,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌏</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#93c5fd', marginBottom: 8 }}>
            ขายของทั่วโลก เชื่อถือได้ ปลอดภัย
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
            OpenThai.ai เชื่อมผู้ผลิตไทยกับลูกค้าทั่วโลก ผ่าน KYC verification<br />
            รองรับ {data?.supported_currencies?.join(', ') || '...'} และภาษาท้องถิ่น
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'ประเทศที่เปิดใช้', val: data.active_count, color: '#22c55e' },
              { label: 'Coming Soon', val: data.coming_soon, color: '#f59e0b' },
              { label: 'สกุลเงิน', val: data.supported_currencies?.length, color: '#60a5fa' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                background: '#1e293b', borderRadius: 12, padding: '16px',
                border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Countries Grid */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '16px', color: '#fca5a5', fontSize: 13, textAlign: 'center',
          }}>⚠️ {error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
            <div>กำลังโหลดข้อมูลประเทศ...</div>
          </div>
        ) : data && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>
              🟢 ประเทศที่เปิดให้บริการแล้ว
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
              {data.supported_countries?.filter(c => c.status === 'active').map(country => (
                <div
                  key={country.code}
                  onClick={() => setSelected(selected?.code === country.code ? null : country)}
                  style={{
                    background: selected?.code === country.code ? 'rgba(34,197,94,0.15)' : '#1e293b',
                    border: `1px solid ${selected?.code === country.code ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: '14px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{country.flag}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{country.name}</div>
                  <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>{country.traders} คน</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>
              🔜 Coming Soon
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
              {data.supported_countries?.filter(c => c.status === 'coming').map(country => (
                <div key={country.code} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12, padding: '14px', textAlign: 'center', opacity: 0.6,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6, filter: 'grayscale(0.5)' }}>{country.flag}</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{country.name}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>เร็วๆ นี้</div>
                </div>
              ))}
            </div>

            {/* Safety Features */}
            <div style={{
              background: '#1e293b', borderRadius: 14, padding: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>
                🔒 ระบบความปลอดภัย
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  { icon: '✅', label: 'KYC Verification', desc: 'ยืนยันตัวตนผู้ค้าทุกราย' },
                  { icon: '🔐', label: 'End-to-End Encrypted', desc: 'เข้ารหัสการสื่อสารทั้งหมด' },
                  { icon: '💱', label: 'Multi-Currency', desc: 'รองรับ 6 สกุลเงินหลัก' },
                  { icon: '🌐', label: 'Multilingual AI', desc: 'รองรับ 12+ ภาษา' },
                  { icon: '📋', label: 'Compliance', desc: 'ปฏิบัติตามกฎหมายแต่ละประเทศ' },
                  { icon: '⚡', label: 'Instant Settlement', desc: 'รับเงินภายใน 24 ชั่วโมง' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18, marginTop: 1 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Global Connect v1.0 · เชื่อมโลกเข้าหากัน
        </div>
      </div>
    </div>
  );
}
