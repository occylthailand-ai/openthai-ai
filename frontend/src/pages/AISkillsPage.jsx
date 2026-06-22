import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useToast } from '../components/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS  = ['TikTok', 'Facebook', 'Instagram Reels', 'YouTube Shorts', 'LINE', 'Shopee', 'Lazada'];
const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'ทั่วไป'];
const DURATIONS  = [15, 30, 60, 90];
const LANGS      = ['ภาษาไทย', 'English', '中文', 'Bahasa Melayu', 'Bahasa Indonesia'];

const TABS = [
  { id: 'trend',       icon: '🔥', label: 'Trend Analyzer',    color: '#f97316', skill: 'S10' },
  { id: 'hashtag',     icon: '#️⃣', label: 'Hashtag Generator', color: '#ec4899', skill: 'S11' },
  { id: 'seo',         icon: '📈', label: 'SEO Thai',          color: '#84cc16', skill: 'S12' },
  { id: 'sentiment',   icon: '💭', label: 'Sentiment Scanner', color: '#a855f7', skill: 'S13' },
  { id: 'video',       icon: '🎬', label: 'Video Script',      color: '#ef4444', skill: 'S14' },
  { id: 'translate',   icon: '🌐', label: 'Multi-Language',    color: '#14b8a6', skill: 'S15' },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function card(extra = {}) {
  return { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, ...extra };
}
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputSt = { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 13px', color: '#1e293b', fontSize: 13, fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box', outline: 'none' };
const btnSt   = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, padding: '12px 24px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%' };

function SourceBadge({ source }) {
  const colors = { claude: '#a855f7', gemini: '#4285f4', mock: '#94a3b8' };
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: colors[source] || '#94a3b8', color: '#fff', fontWeight: 700 }}>{source?.toUpperCase()}</span>;
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{ background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.08)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.25)'}`, borderRadius: 8, padding: '5px 12px', color: copied ? '#10b981' : '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
    </button>
  );
}

// ─── Tab: Trend Analyzer ──────────────────────────────────────────────────────
function TabTrend() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', platform: 'TikTok' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/trend'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#f97316', marginBottom: 16 }}>🔥 วิเคราะห์เทรนด์ตามสินค้า</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่, น้ำพริกเผา" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#f97316,#fb923c)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์...' : '🔥 วิเคราะห์เทรนด์'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card({ borderLeft: '4px solid #f97316' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>📊 Trending Angles</div>
              <SourceBadge source={result.source} />
            </div>
            {result.trending_angles?.map((a, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{a.angle}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{a.desc}</div>
                </div>
                <span style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.momentum}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⏰ เวลาดีที่สุด</div>
              <div style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>{result.best_timing}</div>
            </div>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🎬 Format ที่นิยม</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{result.content_format}</div>
            </div>
          </div>

          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>🎣 Top Hooks ที่ตรงเทรนด์</div>
              <CopyBtn text={result.top_hooks?.join('\n') || ''} />
            </div>
            {result.top_hooks?.map((h, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: '#1e293b' }}>"{h}"</div>
            ))}
          </div>

          <div style={card({ background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.2)' })}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#f97316' }}>🔍 สรุปการวิเคราะห์</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.analysis}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Hashtag Generator ───────────────────────────────────────────────────
function TabHashtag() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', platform: 'TikTok', style: 'sales' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/hashtag'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const SetSection = ({ title, color, tags }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(tags || []).map((tag, i) => (
          <span key={i} style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigator.clipboard.writeText(tag).catch(() => {})}>{tag}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#ec4899', marginBottom: 16 }}>#️⃣ สร้าง Hashtag Set อัจฉริยะ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#ec4899,#db2777)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังสร้าง...' : '#️⃣ สร้าง Hashtag Set'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Hashtag Sets</div>
              <SourceBadge source={result.source} />
            </div>
            <SetSection title="🚀 Mega (1B+ views)" color="#ef4444" tags={result.sets?.mega} />
            <SetSection title="🔥 Trending (กำลังมา)" color="#f97316" tags={result.sets?.trending} />
            <SetSection title="🎯 Niche (relevance สูง)" color="#6366f1" tags={result.sets?.niche} />
            <SetSection title="🇹🇭 ภาษาไทย" color="#10b981" tags={result.sets?.thai} />
          </div>

          <div style={card({ borderLeft: '4px solid #ec4899' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>⭐ Hashtag Set แนะนำ</div>
              <CopyBtn text={result.recommended || ''} />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#1e293b', lineHeight: 1.8, wordBreak: 'break-word' }}>{result.recommended}</div>
          </div>

          <div style={card({ background: 'rgba(236,72,153,0.04)', borderColor: 'rgba(236,72,153,0.2)' })}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#ec4899' }}>💡 เคล็ดลับการใช้งาน</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: SEO Thai ────────────────────────────────────────────────────────────
function TabSEO() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', platform: 'TikTok' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/seo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#84cc16', marginBottom: 16 }}>📈 SEO Thai Keyword Optimizer</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น น้ำพริกเผาแม่อรุณ" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {['TikTok', 'Shopee', 'Lazada', 'Google', 'Facebook'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#84cc16,#65a30d)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์...' : '📈 วิเคราะห์ SEO'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#84cc16' }}>🔑 Primary Keywords</div>
              {result.primary_keywords?.map((k, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px', marginBottom: 5, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(k).catch(() => {})}>{k}</div>
              ))}
            </div>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#6366f1' }}>🎯 Long-Tail Keywords</div>
              {result.long_tail?.map((k, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px', marginBottom: 5, fontSize: 12, color: '#475569', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(k).catch(() => {})}>{k}</div>
              ))}
            </div>
          </div>

          <div style={card()}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📝 สูตรชื่อโพสต์ SEO-friendly</div>
            <div style={{ background: '#f0fdf4', border: '1px solid rgba(132,204,22,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e293b', fontFamily: 'monospace' }}>{result.title_formula}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#f59e0b' }}>🎯 Search Intent</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{result.search_intent}</div>
            </div>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#6366f1' }}>🕳 Competitor Gap</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{result.competitor_gap}</div>
            </div>
          </div>

          <div style={card({ background: 'rgba(132,204,22,0.04)', borderColor: 'rgba(132,204,22,0.2)' })}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#65a30d' }}>💡 เคล็ดลับการเขียน Description</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.description_tips}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Sentiment Scanner ───────────────────────────────────────────────────
function TabSentiment() {
  const [form, setForm] = useState({ text: '', product: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.text.trim()) { setError('กรุณาใส่ข้อความที่ต้องการวิเคราะห์'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/sentiment'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const sentimentColor = s => ({ positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' }[s] || '#64748b');
  const sentimentLabel = s => ({ positive: '😊 เชิงบวก', neutral: '😐 เป็นกลาง', negative: '😞 เชิงลบ' }[s] || s);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#a855f7', marginBottom: 16 }}>💭 วิเคราะห์ความรู้สึกจากคอมเมนต์/รีวิว</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div>
            <label style={labelSt}>ข้อความที่ต้องการวิเคราะห์ *</label>
            <textarea style={{ ...inputSt, height: 120, resize: 'vertical' }} placeholder="วางคอมเมนต์, รีวิว, หรือข้อความที่ต้องการวิเคราะห์ความรู้สึก..." value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#a855f7,#9333ea)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์...' : '💭 วิเคราะห์ Sentiment'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 48 }}>{result.overall === 'positive' ? '😊' : result.overall === 'negative' ? '😞' : '😐'}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: sentimentColor(result.overall) }}>{sentimentLabel(result.overall)}</div>
              <SourceBadge source={result.source} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {[['Positive', result.breakdown?.positive || 0, '#10b981'], ['Neutral', result.breakdown?.neutral || 0, '#f59e0b'], ['Negative', result.breakdown?.negative || 0, '#ef4444']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b', width: 60 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color, fontWeight: 700, width: 30 }}>{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {result.praise_points?.length > 0 && (
              <div style={card({ borderLeft: '4px solid #10b981' })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#10b981' }}>👍 สิ่งที่ชม</div>
                {result.praise_points.map((p, i) => <div key={i} style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>• {p}</div>)}
              </div>
            )}
            {result.pain_points?.length > 0 && (
              <div style={card({ borderLeft: '4px solid #ef4444' })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#ef4444' }}>⚠️ ปัญหาที่พบ</div>
                {result.pain_points.map((p, i) => <div key={i} style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>• {p}</div>)}
              </div>
            )}
          </div>

          <div style={card()}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#a855f7' }}>✅ สิ่งที่ควรทำ</div>
            {result.action_items?.map((a, i) => (
              <div key={i} style={{ background: '#faf5ff', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: '#1e293b' }}>
                {i + 1}. {a}
              </div>
            ))}
          </div>

          <div style={card({ background: 'rgba(168,85,247,0.04)', borderColor: 'rgba(168,85,247,0.2)' })}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#9333ea' }}>📋 สรุป</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Video Script ────────────────────────────────────────────────────────
function TabVideoScript() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', platform: 'TikTok', duration: 30, style: 'sales' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/video-script'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const fullScript = result ? result.scenes?.map(s => `[${s.time}] ${s.script}`).join('\n') + `\n\nCTA: ${result.cta}` : '';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginBottom: 16 }}>🎬 สร้าง Script + Storyboard วิดีโอ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ความยาว (วินาที)</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} วินาที</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelSt}>สไตล์</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['sales', '💰 ขาย'], ['educational', '🎓 สอน'], ['entertainment', '🎭 บันเทิง']].map(([id, label]) => (
                <button key={id} onClick={() => setForm(f => ({ ...f, style: id }))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${form.style === id ? '#ef4444' : 'rgba(0,0,0,0.1)'}`, background: form.style === id ? 'rgba(239,68,68,0.08)' : 'transparent', color: form.style === id ? '#ef4444' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#ef4444,#dc2626)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังสร้าง Script...' : '🎬 สร้าง Script + Storyboard'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card({ borderLeft: '4px solid #ef4444' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{result.title}</div>
                <SourceBadge source={result.source} />
              </div>
              <CopyBtn text={fullScript} />
            </div>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e293b', lineHeight: 1.6, marginBottom: 12 }}>
              🎣 Hook: "{result.hook}"
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>🎬 Storyboard</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {result.scenes?.map((s, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.time}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 5, fontSize: 12 }}>
                    <div><span style={{ color: '#64748b' }}>📢 Script: </span><span style={{ color: '#1e293b', fontWeight: 600 }}>{s.script}</span></div>
                    <div><span style={{ color: '#64748b' }}>🎥 Visual: </span><span style={{ color: '#475569' }}>{s.visual}</span></div>
                    <div><span style={{ color: '#64748b' }}>🎵 Sound: </span><span style={{ color: '#475569' }}>{s.sound}</span></div>
                    {s.action && <div><span style={{ color: '#64748b' }}>🎬 Action: </span><span style={{ color: '#475569' }}>{s.action}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#f97316' }}>📣 CTA ท้ายวิดีโอ</div>
              <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>{result.cta}</div>
            </div>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#8b5cf6' }}>🎵 Music Vibe</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{result.music_vibe}</div>
            </div>
          </div>

          <div style={card({ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' })}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#dc2626' }}>📷 เคล็ดลับถ่ายทำ</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.filming_tips}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Multi-Language Translate ────────────────────────────────────────────
function TabTranslate() {
  const [form, setForm] = useState({ text: '', from: 'ภาษาไทย', to: 'English', product: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.text.trim()) { setError('กรุณาใส่ข้อความที่ต้องการแปล'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/translate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#14b8a6', marginBottom: 16 }}>🌐 แปลภาษาสำหรับตลาด ASEAN</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า (บริบท — ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น ผ้าไหมไทย" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
            <div><label style={labelSt}>ภาษาต้นทาง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))}>
                {LANGS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={() => setForm(f => ({ ...f, from: f.to, to: f.from }))}
              style={{ background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 18 }}>⇄</button>
            <div><label style={labelSt}>ภาษาปลายทาง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
                {LANGS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelSt}>ข้อความที่ต้องการแปล *</label>
            <textarea style={{ ...inputSt, height: 120, resize: 'vertical' }} placeholder="วางข้อความ caption, hook, หรือ script ที่ต้องการแปล..." value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#14b8a6,#0d9488)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังแปล...' : '🌐 แปลภาษา'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card({ borderLeft: '4px solid #14b8a6' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>✅ ผลการแปล: {form.from} → {form.to}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SourceBadge source={result.source} />
                <CopyBtn text={result.translated || ''} />
              </div>
            </div>
            <div style={{ background: '#f0fdfa', border: '1px solid rgba(20,184,166,0.25)', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#1e293b', lineHeight: 1.7 }}>{result.translated}</div>
          </div>

          {result.alternatives?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔄 ทางเลือกอื่น</div>
              {result.alternatives.map((a, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{a.text}</div>
                  {a.note && <div style={{ fontSize: 11, color: '#94a3b8' }}>💡 {a.note}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#14b8a6' }}>🎭 Tone ที่ใช้</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{result.tone}</div>
            </div>
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#f97316' }}>📌 Localization Tips</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{result.localization_tips}</div>
            </div>
          </div>

          {result.cultural_notes && (
            <div style={card({ background: 'rgba(20,184,166,0.04)', borderColor: 'rgba(20,184,166,0.2)' })}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#0d9488' }}>🌍 Cultural Notes</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.cultural_notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AISkillsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('trend');
  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Sticky Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b' }}>🧠 AI Skills Hub</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>S10–S15 · Trend · Hashtag · SEO · Sentiment · Video Script · Translate</div>
        </div>
        <button onClick={() => navigate('/ai-generator')} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⚡ AI Generator</button>
      </header>

      {/* Tab Bar */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 5%', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? t.color : 'transparent'}`, color: tab === t.id ? t.color : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all .2s' }}>
            {t.icon} {t.label}
            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7, background: tab === t.id ? t.color : 'transparent', color: tab === t.id ? '#fff' : 'transparent', borderRadius: 6, padding: '1px 5px' }}>{t.skill}</span>
          </button>
        ))}
      </div>

      {/* Skill Description Banner */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.04)', padding: '10px 5%' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{activeTab?.icon}</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: activeTab?.color }}>{activeTab?.label}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{activeTab?.skill}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 5% 0' }}>
        {tab === 'trend'     && <TabTrend />}
        {tab === 'hashtag'   && <TabHashtag />}
        {tab === 'seo'       && <TabSEO />}
        {tab === 'sentiment' && <TabSentiment />}
        {tab === 'video'     && <TabVideoScript />}
        {tab === 'translate' && <TabTranslate />}
      </div>
    </div>
  );
}
