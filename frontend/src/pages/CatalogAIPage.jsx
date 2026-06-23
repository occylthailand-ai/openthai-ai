import React, { useState } from 'react';
import { apiUrl } from '../apiBase';

const CATEGORIES = ['สินค้าอาหาร','สินค้าเกษตร','ความงาม','สุขภาพ','แฟชัน/สิ่งทอ','หัตถกรรม','SME / ธุรกิจ','อื่นๆ'];
const CERTS = ['GMP','HACCP','ISO 9001','Halal','Organic','GAP','GI','FDA Thailand','FDA USA','CE','Kosher'];

function LangTab({ lang, active, onClick, flag }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
      border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, color: active ? '#6ee7b7' : '#64748b',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400, padding: '8px 18px',
    }}>{flag} {lang}</button>
  );
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      style={{ background: c ? '#10b981' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '3px 10px' }}>
      {c ? '✓' : '⧉'}
    </button>
  );
}

function CatalogView({ data, lang }) {
  if (!data) return null;
  const full = [
    data.product_name, data.tagline, '', data.description, '',
    '✅ Features:', ...(data.features || []),
    '', '📋 Specifications:',
    ...(data.specs_table || []).map(s => `${s.key}: ${s.value}`),
    '', '🏆 Certifications:', ...(data.certifications || []),
    '', data.cta,
  ].join('\n');

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{data.product_name}</div>
          <div style={{ fontSize: 14, color: '#10b981', fontWeight: 600, marginTop: 4 }}>{data.tagline}</div>
        </div>
        <CopyBtn text={full} />
      </div>

      <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 16px' }}>{data.description}</p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>✅ Features</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(data.features || []).map((f, i) => (
            <div key={i} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#6ee7b7' }}>{f}</div>
          ))}
        </div>
      </div>

      {data.specs_table?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>📋 Specifications</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.specs_table.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '7px 10px', fontSize: 13, color: '#64748b', width: '35%', fontWeight: 600 }}>{row.key}</td>
                  <td style={{ padding: '7px 10px', fontSize: 13, color: '#e2e8f0' }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.certifications?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>🏆 Certifications</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.certifications.map((c, i) => (
              <span key={i} style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, fontSize: 12, padding: '3px 10px', fontWeight: 700 }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(99,102,241,0.15))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#6ee7b7', textAlign: 'center' }}>
        {data.cta}
      </div>
    </div>
  );
}

export default function CatalogAIPage() {
  const [form, setForm] = useState({ product: '', category: 'สินค้าอาหาร', price: '', usp: '', specs: '', certifications: '', moq: '' });
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('thai');

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCert = (c) => {
    const next = selectedCerts.includes(c) ? selectedCerts.filter(x => x !== c) : [...selectedCerts, c];
    setSelectedCerts(next);
    setF('certifications', next.join(', '));
  };

  const generate = async () => {
    if (!form.product.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(apiUrl('/api/catalog-ai/generate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) setResult(d);
    } catch (_) {}
    setLoading(false);
  };

  const exportAll = () => {
    if (!result) return;
    const lines = [
      `# PRODUCT CATALOG — ${form.product}`,
      `Category: ${form.category} | Generated: ${new Date().toLocaleDateString('th-TH')}`,
      '', '---', '',
      '## 🇹🇭 ภาษาไทย', '',
      `**${result.thai?.product_name}**`, result.thai?.tagline || '', '',
      result.thai?.description || '', '',
      '### Features', ...(result.thai?.features || []),
      '', '---', '',
      '## 🇬🇧 English', '',
      `**${result.english?.product_name}**`, result.english?.tagline || '', '',
      result.english?.description || '', '',
      '### Features', ...(result.english?.features || []),
      '', '---', '',
      '## 🇨🇳 中文', '',
      `**${result.chinese?.product_name}**`, result.chinese?.tagline || '', '',
      result.chinese?.description || '', '',
      '### Features', ...(result.chinese?.features || []),
      '', '---', '',
      '## Export Info',
      `MOQ: ${result.export_info?.moq || '-'}`,
      `Lead Time: ${result.export_info?.lead_time || '-'}`,
      `HS Code: ${result.export_info?.hs_code_suggestion || '-'}`,
      `Incoterms: ${(result.export_info?.incoterms || []).join(' · ')}`,
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catalog-${form.product.replace(/\s/g,'-')}.md`;
    a.click();
  };

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
    lbl: { fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' },
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#10b981,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🏪 Product Catalog AI
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>สร้าง Catalog สินค้า 3 ภาษา พร้อม Export Info สำหรับตลาดส่งออก</p>
        </div>

        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.lbl}>ชื่อสินค้า *</label>
              <input value={form.product} onChange={e => setF('product', e.target.value)} placeholder="เช่น ข้าวหอมมะลิอินทรีย์..." style={s.inp} />
            </div>
            <div>
              <label style={s.lbl}>หมวดหมู่</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)} style={s.inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={s.lbl}>USP / จุดเด่นหลัก</label>
            <input value={form.usp} onChange={e => setF('usp', e.target.value)} placeholder="เช่น อินทรีย์ 100% · ปลอดสาร · ส่งตรงจากไร่..." style={s.inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.lbl}>ราคา (บาท)</label>
              <input value={form.price} onChange={e => setF('price', e.target.value)} placeholder="เช่น 150 บาท/กก." style={s.inp} />
            </div>
            <div>
              <label style={s.lbl}>MOQ</label>
              <input value={form.moq} onChange={e => setF('moq', e.target.value)} placeholder="เช่น 100 กก., 50 กล่อง" style={s.inp} />
            </div>
            <div>
              <label style={s.lbl}>Spec / รายละเอียด</label>
              <input value={form.specs} onChange={e => setF('specs', e.target.value)} placeholder="เช่น 500g, 12 เดือน shelf life" style={s.inp} />
            </div>
          </div>

          {/* Certifications */}
          <div style={{ marginBottom: 18 }}>
            <label style={s.lbl}>ใบรับรอง / Certifications</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CERTS.map(c => (
                <button key={c} onClick={() => toggleCert(c)} style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: selectedCerts.includes(c) ? 700 : 400,
                  background: selectedCerts.includes(c) ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  color: selectedCerts.includes(c) ? '#fbbf24' : '#64748b',
                  border: selectedCerts.includes(c) ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent',
                }}>{c}</button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading || !form.product.trim()} style={{
            background: 'linear-gradient(135deg,#10b981,#6366f1)', border: 'none', borderRadius: 12, color: '#fff',
            cursor: 'pointer', fontSize: 15, fontWeight: 800, padding: '13px 28px', width: '100%', opacity: !form.product.trim() ? 0.5 : 1,
          }}>
            {loading ? '⏳ กำลังสร้าง Catalog...' : '🏪 สร้าง Product Catalog 3 ภาษา'}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#10b981' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>กำลังสร้าง Catalog 3 ภาษา...</div>
          </div>
        )}

        {result && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <LangTab lang="ภาษาไทย" flag="🇹🇭" active={lang === 'thai'} onClick={() => setLang('thai')} />
                <LangTab lang="English" flag="🇬🇧" active={lang === 'english'} onClick={() => setLang('english')} />
                <LangTab lang="中文" flag="🇨🇳" active={lang === 'chinese'} onClick={() => setLang('chinese')} />
              </div>
              <button onClick={exportAll} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#6ee7b7', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '8px 16px' }}>
                ⬇️ Export .md
              </button>
            </div>

            <CatalogView data={result[lang]} lang={lang} />

            {result.export_info && (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '18px 20px', marginTop: 14 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>📦 Export Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  {[
                    ['HS Code (แนะนำ)', result.export_info.hs_code_suggestion],
                    ['Packaging', result.export_info.packaging],
                    ['Shelf Life', result.export_info.shelf_life],
                    ['MOQ', result.export_info.moq],
                    ['Lead Time', result.export_info.lead_time],
                    ['Incoterms', (result.export_info.incoterms || []).join(' · ')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0' }}>{v || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
