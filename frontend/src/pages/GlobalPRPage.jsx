import React, { useState, useCallback } from 'react';
import { apiUrl } from '../apiBase';

// ── Constants ───────────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'thai',    flag: '🇹🇭', label: 'ภาษาไทย',  short: 'TH' },
  { id: 'english', flag: '🇬🇧', label: 'English',   short: 'EN' },
  { id: 'chinese', flag: '🇨🇳', label: '中文',       short: 'ZH' },
];

const AUDIENCES = [
  { id: 'producer',    icon: '🏭', label: 'ผู้ผลิต',       labelEn: 'Producer',      labelZh: '生产商' },
  { id: 'seller',      icon: '🏪', label: 'ผู้ขาย',         labelEn: 'Seller',        labelZh: '销售商' },
  { id: 'consumer',    icon: '👥', label: 'ผู้บริโภค',      labelEn: 'Consumer',      labelZh: '消费者' },
  { id: 'distributor', icon: '🤝', label: 'ตัวแทนจำหน่าย', labelEn: 'Distributor',   labelZh: '分销商' },
  { id: 'intl_agent',  icon: '🌍', label: 'ตัวแทนข้ามชาติ',labelEn: 'Intl. Agent',   labelZh: '跨国代理' },
  { id: 'sme',         icon: '💼', label: 'SME ไทย',        labelEn: 'Thai SME',      labelZh: '泰国中小企业' },
  { id: 'agri',        icon: '🌾', label: 'เกษตรกรรม',     labelEn: 'Agriculture',   labelZh: '农业产品' },
];

const CONTINENTS = [
  { id: 'asia',          icon: '🌏', name: 'เอเชีย',         nameEn: 'Asia' },
  { id: 'europe',        icon: '🌍', name: 'ยุโรป',          nameEn: 'Europe' },
  { id: 'north_america', icon: '🌎', name: 'อเมริกาเหนือ',   nameEn: 'North America' },
  { id: 'south_america', icon: '🌎', name: 'อเมริกาใต้',     nameEn: 'South America' },
  { id: 'africa',        icon: '🌍', name: 'แอฟริกา',        nameEn: 'Africa' },
  { id: 'oceania',       icon: '🌏', name: 'โอเชียเนีย',     nameEn: 'Oceania' },
  { id: 'antarctica',    icon: '❄️', name: 'แอนตาร์กติกา',  nameEn: 'Antarctica' },
];

const EVENT_TYPES = ['general','product-launch','sale-promotion','trade-show','holiday','partnership'];
const TONES = ['professional','friendly','urgent','premium','educational','inspiring'];
const CATEGORIES = ['สินค้าอาหาร','สินค้าเกษตร','ความงาม','สุขภาพ','แฟชัน/สิ่งทอ','หัตถกรรม','อิเล็กทรอนิกส์','ท่องเที่ยว','บริการ','อื่นๆ'];

const CONTINENT_COLORS = {
  asia: '#f97316', europe: '#6366f1', north_america: '#10b981',
  south_america: '#f59e0b', africa: '#ef4444', oceania: '#06b6d4', antarctica: '#8b5cf6',
};

// ── Helper Components ────────────────────────────────────────────────────────
function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} style={{
      background: copied ? '#10b981' : 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 6, color: '#fff', cursor: 'pointer',
      fontSize: small ? 11 : 12, padding: small ? '2px 8px' : '4px 12px',
      transition: 'all .2s',
    }}>
      {copied ? '✓' : '⧉'}
    </button>
  );
}

function ContentCard({ data, lang }) {
  if (!data) return null;
  const fullText = `${data.headline}\n\n${data.body}\n\n${data.cta}\n\n${(data.hashtags||[]).join(' ')}`;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Headline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.4, flex: 1 }}>
          {data.headline}
        </div>
        <CopyBtn text={fullText} />
      </div>
      {/* Key message badge */}
      {data.key_message && (
        <div style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: 13,
        }}>
          💡 {data.key_message}
        </div>
      )}
      {/* Body */}
      <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>{data.body}</div>
      {/* CTA */}
      <div style={{
        background: 'rgba(254,44,85,0.12)', border: '1px solid rgba(254,44,85,0.25)',
        borderRadius: 8, padding: '8px 14px', color: '#fb7185', fontWeight: 600, fontSize: 13,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>📢 {data.cta}</span>
        <CopyBtn text={data.cta} small />
      </div>
      {/* Hashtags */}
      {data.hashtags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {data.hashtags.map((h, i) => (
            <span key={i} style={{
              background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 20, padding: '2px 10px', color: '#67e8f9', fontSize: 12,
            }}>{h}</span>
          ))}
          <CopyBtn text={data.hashtags.join(' ')} small />
        </div>
      )}
    </div>
  );
}

function ContinentCard({ data, continent }) {
  if (!data) return null;
  const color = CONTINENT_COLORS[continent.id] || '#6366f1';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}40`,
      borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 22 }}>{continent.icon}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{continent.name}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{continent.nameEn}</div>
        </div>
      </div>
      <div style={{
        background: `${color}18`, borderRadius: 8, padding: '6px 10px',
        color: '#e2e8f0', fontSize: 13, lineHeight: 1.5,
      }}>
        {data.focus}
      </div>
      {data.key_markets?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {data.key_markets.slice(0, 5).map((m, i) => (
            <span key={i} style={{
              background: `${color}20`, border: `1px solid ${color}40`,
              borderRadius: 12, padding: '1px 8px', color: '#e2e8f0', fontSize: 11,
            }}>{m}</span>
          ))}
        </div>
      )}
      <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>{data.strategy}</div>
      {data.channels?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ color: '#64748b', fontSize: 11, marginRight: 2 }}>📡</span>
          {data.channels.map((c, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '1px 8px',
              color: '#94a3b8', fontSize: 11,
            }}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Export helper ────────────────────────────────────────────────────────────
function buildMarkdown(result, product) {
  const lines = [`# Global PR Package — ${product}`, `> Generated by OpenThai AI · ${new Date().toLocaleString('th-TH')}`, ''];
  LANGUAGES.forEach(lang => {
    lines.push(`## ${lang.flag} ${lang.label}`);
    AUDIENCES.forEach(aud => {
      const d = result[lang.id]?.[aud.id];
      if (!d) return;
      lines.push(`\n### ${aud.icon} ${aud.label} (${aud.labelEn})`);
      lines.push(`**${d.headline}**`, '', d.body, '', `> ${d.cta}`, '', (d.hashtags||[]).join(' '), '');
    });
  });
  lines.push('## 🌍 Continental Strategy', '');
  CONTINENTS.forEach(c => {
    const d = result.continental?.[c.id];
    if (!d) return;
    lines.push(`### ${c.icon} ${c.name} (${c.nameEn})`, `**Focus:** ${d.focus}`, `**Markets:** ${(d.key_markets||[]).join(', ')}`, `**Strategy:** ${d.strategy}`, `**Channels:** ${(d.channels||[]).join(', ')}`, '');
  });
  if (result.continental?.global_tip) lines.push(`## 💡 Global Tip`, result.continental.global_tip);
  return lines.join('\n');
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function GlobalPRPage() {
  const [form, setForm] = useState({
    product: '', usp: '', category: 'สินค้าอาหาร', event_type: 'general', tone: 'professional',
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeLang, setActiveLang] = useState('thai');
  const [activeAud, setActiveAud] = useState('producer');
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'continental'

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = useCallback(async () => {
    if (!form.product.trim()) { setError('กรุณาระบุชื่อสินค้า/บริการ'); return; }
    setError('');
    setLoading(true);
    setProgress(2);
    setResult(null);

    const timer = setInterval(() => setProgress(p => Math.min(p + 2, 88)), 400);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(apiUrl('/api/pr/global-content'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok && !data.thai) throw new Error(data.error || 'Server error');
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => { setResult(data); setLoading(false); setProgress(0); }, 400);
    } catch (e) {
      clearInterval(timer);
      setError(e.message);
      setLoading(false);
      setProgress(0);
    }
  }, [form]);

  const exportMd = () => {
    if (!result) return;
    const md = buildMarkdown(result, form.product);
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `global-pr-${form.product.slice(0, 20).replace(/\s/g, '-')}.md`;
    a.click();
  };

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(buildMarkdown(result, form.product));
  };

  // audience label by language
  const audLabel = (aud) => {
    if (activeLang === 'english') return aud.labelEn;
    if (activeLang === 'chinese') return aud.labelZh;
    return aud.label;
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080812', color: '#e2e8f0',
      fontFamily: "'Sarabun', sans-serif", padding: '24px 16px', paddingBottom: 60,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🌐</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
            Global PR Creator
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 15 }}>
            สร้างสื่อประชาสัมพันธ์ <strong style={{ color: '#f97316' }}>3 ภาษา</strong> ×{' '}
            <strong style={{ color: '#6366f1' }}>5 กลุ่มเป้าหมาย</strong> ×{' '}
            <strong style={{ color: '#10b981' }}>7 ทวีป</strong>
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {['🇹🇭 ไทย','🇬🇧 English','🇨🇳 中文'].map(l => (
              <span key={l} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 12px',
                fontSize: 12, color: '#cbd5e1',
              }}>{l}</span>
            ))}
            {['🏭 ผู้ผลิต','🏪 ผู้ขาย','👥 ผู้บริโภค','🤝 ตัวแทน','🌍 ข้ามชาติ'].map(a => (
              <span key={a} style={{
                background: 'rgba(99,102,241,0.12)', borderRadius: 20, padding: '3px 12px',
                fontSize: 12, color: '#a5b4fc',
              }}>{a}</span>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16, padding: '24px 22px', marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>สินค้า / บริการ *</label>
              <input
                placeholder="เช่น ผ้าไหมอุบล, น้ำพริกแม่อุสา, เซรั่มข้าวไทย..."
                value={form.product} onChange={e => setF('product', e.target.value)}
                style={inp}
              />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>จุดเด่น / USP</label>
              <input
                placeholder="เช่น ออร์แกนิค 100%, ลดน้ำหนักจริงใน 30 วัน, ใยธรรมชาติ GI ต่ำ..."
                value={form.usp} onChange={e => setF('usp', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>หมวดหมู่สินค้า</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>ประเภทโอกาส</label>
              <select value={form.event_type} onChange={e => setF('event_type', e.target.value)} style={inp}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>น้ำเสียง / Tone</label>
              <select value={form.tone} onChange={e => setF('tone', e.target.value)} style={inp}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={generate}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  background: loading ? '#334155' : 'linear-gradient(135deg,#6366f1,#f97316)',
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                {loading ? '⏳ กำลังสร้าง...' : '🌐 สร้างสื่อ PR ทั้งหมด'}
              </button>
            </div>
          </div>

          {/* Progress */}
          {loading && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${progress}%`,
                  background: 'linear-gradient(90deg,#6366f1,#f97316,#10b981)',
                  transition: 'width .3s ease',
                }} />
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                AI กำลังสร้างสื่อ 3 ภาษา × 5 กลุ่มเป้าหมาย × 7 ทวีป... ({progress}%)
              </div>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 12, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
              padding: '8px 14px', color: '#f87171', fontSize: 13,
            }}>⚠️ {error}</div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Export bar */}
            <div style={{
              display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>
                ✅ สร้างสำเร็จ — {result.source === 'mock' ? '🔵 Demo' : result.source === 'claude' ? '🟣 Claude AI' : '🟢 Gemini AI'}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={copyAll} style={actionBtn('#475569')}>⧉ Copy All</button>
              <button onClick={exportMd} style={actionBtn('#6366f1')}>⬇ Export .md</button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              {['content','continental'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? '#a5b4fc' : '#64748b',
                  fontWeight: activeTab === tab ? 700 : 400, fontSize: 14,
                }}>
                  {tab === 'content' ? '📝 สื่อ 3 ภาษา × 5 กลุ่ม' : '🌍 Continental Strategy'}
                </button>
              ))}
            </div>

            {/* ── CONTENT TAB ── */}
            {activeTab === 'content' && (
              <>
                {/* Language tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {LANGUAGES.map(lang => (
                    <button key={lang.id} onClick={() => setActiveLang(lang.id)} style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: activeLang === lang.id
                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                        : 'rgba(255,255,255,0.06)',
                      color: '#fff', fontWeight: activeLang === lang.id ? 700 : 400, fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ fontSize: 18 }}>{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>

                {/* Audience tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                  {AUDIENCES.map(aud => (
                    <button key={aud.id} onClick={() => setActiveAud(aud.id)} style={{
                      padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: activeAud === aud.id
                        ? 'rgba(249,115,22,0.22)'
                        : 'rgba(255,255,255,0.05)',
                      color: activeAud === aud.id ? '#fdba74' : '#64748b',
                      fontWeight: activeAud === aud.id ? 700 : 400, fontSize: 13,
                    }}>
                      {aud.icon} {audLabel(aud)}
                    </button>
                  ))}
                </div>

                {/* Content card */}
                <ContentCard
                  data={result[activeLang]?.[activeAud]}
                  lang={activeLang}
                />

                {/* All audiences quick-view */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
                    ← ดูทั้งหมด 5 กลุ่มใน {LANGUAGES.find(l=>l.id===activeLang)?.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {AUDIENCES.filter(a => a.id !== activeAud).map(aud => {
                      const d = result[activeLang]?.[aud.id];
                      if (!d) return null;
                      return (
                        <div key={aud.id} style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 10, padding: '12px 16px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                          cursor: 'pointer',
                        }} onClick={() => setActiveAud(aud.id)}>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>
                              {aud.icon} {audLabel(aud)}
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
                              {d.headline}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <CopyBtn text={`${d.headline}\n\n${d.body}\n\n${d.cta}\n\n${(d.hashtags||[]).join(' ')}`} small />
                            <span style={{ color: '#475569', fontSize: 12 }}>▶</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── CONTINENTAL TAB ── */}
            {activeTab === 'continental' && (
              <>
                {result.continental?.global_tip && (
                  <div style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 12, padding: '14px 18px', marginBottom: 20,
                    color: '#6ee7b7', fontSize: 14, lineHeight: 1.7,
                  }}>
                    💡 <strong>Global Strategy Tip</strong><br />
                    {result.continental.global_tip}
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 16,
                }}>
                  {CONTINENTS.map(c => (
                    <ContinentCard
                      key={c.id}
                      continent={c}
                      data={result.continental?.[c.id]}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌐</div>
            <div style={{ fontSize: 16, color: '#64748b' }}>
              กรอกชื่อสินค้าและกด <strong style={{ color: '#f97316' }}>สร้างสื่อ PR ทั้งหมด</strong>
            </div>
            <div style={{ fontSize: 13, marginTop: 8, color: '#475569' }}>
              AI จะสร้างสื่อ 15 ชิ้น (3 ภาษา × 5 กลุ่ม) + กลยุทธ์ 7 ทวีป
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────────
const lbl = { display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 };
const inp = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
};
const actionBtn = (bg) => ({
  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontSize: 13, fontWeight: 600,
});
