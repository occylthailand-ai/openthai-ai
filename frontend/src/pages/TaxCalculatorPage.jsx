import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const COUNTRIES = [
  { code: 'TH', name: 'ไทย', flag: '🇹🇭' }, { code: 'CN', name: 'จีน', flag: '🇨🇳' },
  { code: 'JP', name: 'ญี่ปุ่น', flag: '🇯🇵' }, { code: 'US', name: 'สหรัฐฯ', flag: '🇺🇸' },
  { code: 'SG', name: 'สิงคโปร์', flag: '🇸🇬' }, { code: 'MY', name: 'มาเลเซีย', flag: '🇲🇾' },
  { code: 'GB', name: 'อังกฤษ', flag: '🇬🇧' }, { code: 'DE', name: 'เยอรมนี', flag: '🇩🇪' },
  { code: 'AU', name: 'ออสเตรเลีย', flag: '🇦🇺' }, { code: 'IN', name: 'อินเดีย', flag: '🇮🇳' },
  { code: 'KR', name: 'เกาหลีใต้', flag: '🇰🇷' }, { code: 'VN', name: 'เวียดนาม', flag: '🇻🇳' },
];

const PRODUCT_EXAMPLES = ['เสื้อผ้าไทย', 'อาหารแปรรูป', 'สมุนไพรไทย', 'เครื่องสำอาง', 'อิเล็กทรอนิกส์', 'เครื่องประดับ'];

export default function TaxCalculatorPage() {
  const [product, setProduct] = useState('');
  const [fromCountry, setFromCountry] = useState('TH');
  const [toCountry, setToCountry] = useState('JP');
  const [value, setValue] = useState(5000);
  const [qty, setQty] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    if (!product.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/tax-calculator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          from_country: COUNTRIES.find(c => c.code === fromCountry)?.name || fromCountry,
          to_country: COUNTRIES.find(c => c.code === toCountry)?.name || toCountry,
          value_thb: value,
          quantity: qty,
        }),
      });
      setResult(await r.json());
    } catch { } finally { setLoading(false); }
  }, [product, fromCountry, toCountry, value, qty]);

  const CountrySelect = ({ val, onChange, label }) => (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      <select value={val} onChange={e => onChange(e.target.value)} style={{
        width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none',
      }}>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
        ))}
      </select>
    </div>
  );

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
          <div style={{ fontSize: 15, fontWeight: 800 }}>🧮 Global Tax & Customs AI</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>คำนวณภาษีศุลกากรอัตโนมัติ 180+ ประเทศ</div>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{
          background: '#1e293b', borderRadius: 14, padding: 24,
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 18 }}>
            กรอกข้อมูลสินค้าเพื่อคำนวณภาษี
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>ชื่อสินค้า / ประเภท</div>
            <input
              value={product}
              onChange={e => setProduct(e.target.value)}
              placeholder="เช่น เสื้อผ้าฝ้าย, กาแฟสด, ครีมทาผิว..."
              style={{
                width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {PRODUCT_EXAMPLES.map(p => (
                <button key={p} onClick={() => setProduct(p)} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '3px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 11,
                }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <CountrySelect val={fromCountry} onChange={setFromCountry} label="ส่งจาก (Origin)" />
            <CountrySelect val={toCountry} onChange={setToCountry} label="ปลายทาง (Destination)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>มูลค่าสินค้า (บาท)</div>
              <input
                type="number"
                value={value}
                onChange={e => setValue(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>จำนวน (ชิ้น)</div>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(parseInt(e.target.value) || 1)}
                min={1}
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button onClick={calculate} disabled={loading || !product.trim()} style={{
            width: '100%', background: loading ? '#374151' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            {loading ? '🧮 AI กำลังคำนวณ...' : '🧮 คำนวณภาษีศุลกากร'}
          </button>
        </div>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.12))',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 8 }}>{result.summary}</div>
              {result.hs_code && (
                <div style={{ fontSize: 12, color: '#64748b' }}>HS Code โดยประมาณ: <span style={{ color: '#f1f5f9' }}>{result.hs_code}</span></div>
              )}
            </div>

            {result.taxes && result.taxes.length > 0 && (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>รายละเอียดภาษี</div>
                {result.taxes.map((tax, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: i < result.taxes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#f1f5f9' }}>{tax.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{tax.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#fcd34d' }}>{tax.rate}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
                        {tax.amount_thb ? `฿${Number(tax.amount_thb).toLocaleString()}` : '—'}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: 12,
                  padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>รวมภาษีทั้งหมด</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                    ฿{Number(result.total_tax_thb || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>ต้นทุนรวมทั้งหมด</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#22c55e' }}>
                    ฿{Number(result.total_cost_thb || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {result.documents_required && (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>📋 เอกสารที่ต้องใช้</div>
                {result.documents_required.map((doc, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span>•</span><span>{doc}</span>
                  </div>
                ))}
              </div>
            )}

            {result.tips && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: '#6ee7b7' }}>💡 {result.tips}</div>
              </div>
            )}

            {result.disclaimer && (
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>⚠️ {result.disclaimer}</div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, color: '#334155', fontSize: 12 }}>
          OpenThai.ai Tax & Customs AI v1.0 · ประมาณการเบื้องต้น — ควรตรวจสอบกับผู้เชี่ยวชาญก่อนส่งออก
        </div>
      </div>
    </div>
  );
}
