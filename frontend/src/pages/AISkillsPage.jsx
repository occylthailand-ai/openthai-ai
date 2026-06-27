import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useToast } from '../components/ToastContext';
import { getPref, syncSetPref } from '../cloudSync';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS  = ['TikTok', 'Facebook', 'Instagram Reels', 'YouTube Shorts', 'LINE', 'Shopee', 'Lazada'];
const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'ทั่วไป'];
const DURATIONS  = [15, 30, 60, 90];
const LANGS      = ['ภาษาไทย', 'English', '中文', 'Bahasa Melayu', 'Bahasa Indonesia'];

// Tabs ที่มี UI เฉพาะตัว (rich component) — จับคู่กับ registry ผ่าน `endpoint`
const TABS = [
  { id: 'learning',    icon: '🧬', label: 'Learning Layer',    color: '#06b6d4', skill: 'S9',  endpoint: '/api/skills/learning/patterns' },
  { id: 'trend',       icon: '🔥', label: 'Trend Analyzer',    color: '#f97316', skill: 'S10', endpoint: '/api/skills/trend' },
  { id: 'hashtag',     icon: '#️⃣', label: 'Hashtag Generator', color: '#ec4899', skill: 'S11', endpoint: '/api/skills/hashtag' },
  { id: 'seo',         icon: '📈', label: 'SEO Thai',          color: '#84cc16', skill: 'S12', endpoint: '/api/skills/seo' },
  { id: 'sentiment',   icon: '💭', label: 'Sentiment Scanner', color: '#a855f7', skill: 'S13', endpoint: '/api/skills/sentiment' },
  { id: 'video',       icon: '🎬', label: 'Video Script',      color: '#ef4444', skill: 'S14', endpoint: '/api/skills/video-script' },
  { id: 'translate',   icon: '🌐', label: 'Multi-Language',    color: '#14b8a6', skill: 'S15', endpoint: '/api/skills/translate' },
  { id: 'prompt',      icon: '⚡', label: 'Prompt Builder',    color: '#f59e0b', skill: 'S16', endpoint: '/api/skills/prompt-builder' },
  { id: 'wisdom',      icon: '☯️', label: 'Cultural Wisdom',   color: '#b45309', skill: 'S17', endpoint: '/api/skills/cultural-wisdom' },
  { id: 'supplychain', icon: '🔗', label: 'Supply Chain AI',   color: '#0ea5e9', skill: 'S19', endpoint: '/api/skills/supply-chain' },
  { id: 'pricing',     icon: '💰', label: 'Pricing Optimizer', color: '#6366f1', skill: 'S20', endpoint: '/api/skills/pricing' },
  { id: 'cs',          icon: '💬', label: 'Customer Service',   color: '#22c55e', skill: 'S21', endpoint: '/api/skills/customer-service' },
  { id: 'adbudget',    icon: '📣', label: 'Ad Budget Planner',  color: '#f43f5e', skill: 'S22', endpoint: '/api/skills/ad-budget' },
  { id: 'breakeven',   icon: '⚖️', label: 'Break-even Planner', color: '#0d9488', skill: 'S23', endpoint: '/api/skills/break-even' },
  { id: 'campaign',    icon: '📆', label: 'Campaign Calendar',  color: '#d946ef', skill: 'S24', endpoint: '/api/skills/campaign-calendar' },
  { id: 'live',        icon: '🔴', label: 'Live Selling Script', color: '#fb7185', skill: 'S25', endpoint: '/api/skills/live-script' },
  { id: 'omni',        icon: '🧩', label: 'Omni-Solver',         color: '#7c3aed', skill: 'S26', endpoint: '/api/skills/omni-solver' },
  { id: 'negotiation', icon: '🤝', label: 'Negotiation Coach',   color: '#0891b2', skill: 'S27', endpoint: '/api/skills/negotiation' },
  { id: 'mediation',   icon: '🕊️', label: 'Conflict Mediator',    color: '#0d9488', skill: 'S28', endpoint: '/api/skills/mediation' },
  { id: 'crisis',      icon: '🚨', label: 'Crisis Manager',       color: '#dc2626', skill: 'S29', endpoint: '/api/skills/crisis' },
  { id: 'persona',     icon: '🎭', label: 'Persona Builder',      color: '#8b5cf6', skill: 'S30', endpoint: '/api/skills/persona' },
  { id: 'listing',     icon: '🛒', label: 'Product Listing',      color: '#f97316', skill: 'S31', endpoint: '/api/skills/listing' },
  { id: 'review',      icon: '⭐', label: 'Review Responder',      color: '#14b8a6', skill: 'S32', endpoint: '/api/skills/review-reply' },
];

const WISDOM_TRADITIONS = [
  { id: 'all',      icon: '☯️', label: 'ทุกปรัชญา',   desc: '儒家 + พุทธ + ไทย' },
  { id: 'chinese',  icon: '🏮', label: 'ปรัชญาจีน',   desc: '八德 忠孝仁爱礼义廉耻' },
  { id: 'buddhist', icon: '🪷', label: 'พระพุทธศาสนา', desc: 'พระไตรปิฎก ไตรสิกขา' },
  { id: 'thai',     icon: '🇹🇭', label: 'ปรัชญาไทย',   desc: 'เศรษฐกิจพอเพียง' },
];

const WISDOM_PURPOSES = ['ทั่วไป', 'ธุรกิจ/การตลาด', 'ภาวะผู้นำ', 'การแก้ปัญหา', 'ความสัมพันธ์', 'การเงิน'];

const PROMPT_TECHNIQUES = [
  { id: 'zero-shot',   icon: '🎯', label: 'Zero-Shot',   desc: 'สั่งตรง ไม่มีตัวอย่าง — เร็ว เหมาะงานง่าย' },
  { id: 'few-shot',    icon: '📚', label: 'Few-Shot',    desc: 'ให้ตัวอย่าง 2-5 คู่ — AI เรียนรู้ pattern ของคุณ' },
  { id: 'chain',       icon: '⛓️', label: 'Chain-of-Thought', desc: 'คิดทีละขั้น — เหมาะงานซับซ้อน/คำนวณ' },
  { id: 'tree',        icon: '🌳', label: 'Tree-of-Thought', desc: 'สำรวจหลายแนว — แก้ปัญหายากที่ต้องวางแผน' },
  { id: 'role',        icon: '🎭', label: 'Role Prompting', desc: 'กำหนด persona — AI ตอบแบบผู้เชี่ยวชาญ' },
  { id: 'instruction', icon: '📋', label: 'Instruction',  desc: 'ออกคำสั่งชัดเจน + format — ควบคุม output ได้แม่นยำ' },
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

// ─── Tab: Learning Layer (S9) ────────────────────────────────────────────────
const CONTENT_TYPES = ['Hook', 'Caption', 'Script', 'Review', 'Email', 'Line Message', 'Ad Copy', 'Story'];
const RATE_TONES    = ['สนุก/ขำ', 'จริงจัง', 'อบอุ่น', 'กระตุ้น', 'สุภาพ', 'ตรงไปตรงมา'];

function TabLearningLayer() {
  const { showToast } = useToast();
  const [sub, setSub] = useState('patterns');
  const [rateForm, setRateForm] = useState({ content_type: 'Hook', platform: 'TikTok', tone: 'สนุก/ขำ', rating: 0, output_snippet: '' });
  const [enhForm, setEnhForm] = useState({ content: '', content_type: 'Hook', platform: 'TikTok' });
  const [patterns, setPatterns] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/skills/learning/patterns'));
      const d = await res.json();
      setPatterns(d);
    } catch { showToast('ไม่สามารถโหลด patterns ได้', 'error'); }
    setLoading(false);
  };

  const submitRating = async () => {
    if (!rateForm.rating) { showToast('กรุณาให้คะแนน 1-5 ดาว', 'error'); return; }
    setRateLoading(true);
    try {
      const res = await fetch(apiUrl('/api/skills/learning/rate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rateForm) });
      const d = await res.json();
      if (d.success) { showToast(`บันทึกแล้ว ✅ รวม ${d.total_ratings} ratings`, 'success'); setRateForm(f => ({ ...f, rating: 0, output_snippet: '' })); }
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    setRateLoading(false);
  };

  const runEnhance = async () => {
    if (!enhForm.content.trim()) { showToast('กรุณาใส่ content ที่ต้องการปรับปรุง', 'error'); return; }
    setLoading(true); setEnhanced(null);
    try {
      const res = await fetch(apiUrl('/api/skills/learning/enhance'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enhForm) });
      const d = await res.json();
      if (d.success) setEnhanced(d); else showToast(d.error || 'เกิดข้อผิดพลาด', 'error');
    } catch { showToast('ไม่สามารถเชื่อมต่อได้', 'error'); }
    setLoading(false);
  };

  React.useEffect(() => { if (sub === 'patterns') loadPatterns(); }, [sub]);

  const cyan = '#06b6d4';
  const subBtn = (id, label) => (
    <button key={id} onClick={() => setSub(id)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sub === id ? cyan : 'rgba(0,0,0,0.1)'}`, background: sub === id ? cyan : 'transparent', color: sub === id ? '#fff' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subBtn('patterns', '📊 Pattern Memory')}
        {subBtn('rate', '⭐ ให้คะแนน')}
        {subBtn('enhance', '✨ AI Enhance')}
      </div>

      {/* ── Patterns ── */}
      {sub === 'patterns' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card({ borderLeft: `4px solid ${cyan}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: cyan }}>🧬 Content Pattern Memory</div>
              <button onClick={loadPatterns} style={{ ...btnSt, width: 'auto', padding: '6px 14px', fontSize: 12, background: cyan }}>{loading ? '⏳' : '🔄 รีเฟรช'}</button>
            </div>
            {patterns && (
              <>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  รวม <strong>{patterns.total_ratings}</strong> feedback · <strong>{patterns.patterns?.length}</strong> patterns
                </div>
                {patterns.patterns?.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>ยังไม่มี patterns — ไปที่ "ให้คะแนน" เพื่อเริ่มสอน AI ของคุณ</div>
                )}
                {patterns.patterns?.map((p, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.content_type} · {p.platform}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Tone ที่ดีสุด: {p.top_tone} · {p.count} ratings</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: p.avg_rating >= 4 ? '#10b981' : p.avg_rating >= 3 ? '#f59e0b' : '#ef4444' }}>{p.avg_rating}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>avg/5</div>
                    </div>
                  </div>
                ))}
                {patterns.recent_feedback?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>FEEDBACK ล่าสุด</div>
                    {patterns.recent_feedback.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#475569', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <span>{'⭐'.repeat(r.rating)}</span>
                        <span style={{ flex: 1 }}>{r.content_type} · {r.platform}</span>
                        <span style={{ color: '#94a3b8' }}>{r.tone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Rate ── */}
      {sub === 'rate' && (
        <div style={card()}>
          <div style={{ fontWeight: 800, fontSize: 14, color: cyan, marginBottom: 16 }}>⭐ สอน AI ด้วยการให้คะแนน</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
              <div>
                <label style={labelSt}>ประเภท Content *</label>
                <select style={{ ...inputSt, cursor: 'pointer' }} value={rateForm.content_type} onChange={e => setRateForm(f => ({ ...f, content_type: e.target.value }))}>
                  {CONTENT_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>แพลตฟอร์ม</label>
                <select style={{ ...inputSt, cursor: 'pointer' }} value={rateForm.platform} onChange={e => setRateForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelSt}>Tone ที่ใช้</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RATE_TONES.map(t => (
                  <button key={t} onClick={() => setRateForm(f => ({ ...f, tone: t }))}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${rateForm.tone === t ? cyan : 'rgba(0,0,0,0.1)'}`, background: rateForm.tone === t ? `${cyan}18` : 'transparent', color: rateForm.tone === t ? cyan : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: rateForm.tone === t ? 700 : 400 }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelSt}>Content Snippet (ตัวอย่าง)</label>
              <textarea style={{ ...inputSt, minHeight: 70, resize: 'vertical' }} placeholder="วาง content ที่คุณสร้าง (ไม่บังคับ)" value={rateForm.output_snippet} onChange={e => setRateForm(f => ({ ...f, output_snippet: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>คะแนน *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRateForm(f => ({ ...f, rating: n }))}
                    style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', opacity: rateForm.rating >= n ? 1 : 0.3, transition: 'opacity .2s' }}>⭐</button>
                ))}
                {rateForm.rating > 0 && <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>{rateForm.rating}/5</span>}
              </div>
            </div>
            <button style={{ ...btnSt, background: rateLoading ? '#94a3b8' : `linear-gradient(135deg,${cyan},#0891b2)` }} onClick={submitRating} disabled={rateLoading}>
              {rateLoading ? '⏳ กำลังบันทึก...' : '✅ บันทึก Feedback'}
            </button>
          </div>
        </div>
      )}

      {/* ── Enhance ── */}
      {sub === 'enhance' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card()}>
            <div style={{ fontWeight: 800, fontSize: 14, color: cyan, marginBottom: 16 }}>✨ AI Enhance — ปรับปรุง Content ด้วย Pattern Memory</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelSt}>Content ที่ต้องการปรับปรุง *</label>
                <textarea style={{ ...inputSt, minHeight: 100, resize: 'vertical' }} placeholder="วาง content ที่ต้องการให้ AI ปรับปรุง..." value={enhForm.content} onChange={e => setEnhForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                <div>
                  <label style={labelSt}>ประเภท</label>
                  <select style={{ ...inputSt, cursor: 'pointer' }} value={enhForm.content_type} onChange={e => setEnhForm(f => ({ ...f, content_type: e.target.value }))}>
                    {CONTENT_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>แพลตฟอร์ม</label>
                  <select style={{ ...inputSt, cursor: 'pointer' }} value={enhForm.platform} onChange={e => setEnhForm(f => ({ ...f, platform: e.target.value }))}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${cyan},#0891b2)` }} onClick={runEnhance} disabled={loading}>
                {loading ? '⏳ กำลังปรับปรุง...' : '✨ ปรับปรุง Content'}
              </button>
            </div>
          </div>

          {enhanced && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={card({ borderLeft: `4px solid ${cyan}` })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: cyan }}>✨ Content ที่ปรับปรุงแล้ว</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>⭐ {enhanced.score_prediction}/5</span>
                    <CopyBtn text={enhanced.enhanced || ''} />
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{enhanced.enhanced}</div>
              </div>
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>การเปลี่ยนแปลง</div>
                {enhanced.changes?.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '3px 0' }}>✅ {c}</div>)}
                {enhanced.why && <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>💡 {enhanced.why}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
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

// ─── Tab: Prompt Builder (S16) ────────────────────────────────────────────────
function TabPromptBuilder() {
  const [form, setForm] = useState({ goal: '', technique: 'zero-shot', role: '', examples: '', context: '', output_format: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const run = async () => {
    if (!form.goal.trim()) { setError('กรุณาอธิบายสิ่งที่ต้องการให้ AI ทำ'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/prompt-builder'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const scoreColor = s => s >= 85 ? '#10b981' : s >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Technique Explainer */}
      <div style={card({ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' })}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', marginBottom: 12 }}>⚡ เลือกเทคนิค Prompt Engineering</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {PROMPT_TECHNIQUES.map(t => (
            <button key={t.id} onClick={() => setForm(f => ({ ...f, technique: t.id }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${form.technique === t.id ? '#f59e0b' : 'rgba(0,0,0,0.08)'}`, background: form.technique === t.id ? 'rgba(245,158,11,0.1)' : '#ffffff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: form.technique === t.id ? '#d97706' : '#1e293b', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Input */}
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginBottom: 16 }}>⚡ สร้าง Prompt อัจฉริยะ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={labelSt}>เป้าหมาย / สิ่งที่ต้องการให้ AI ทำ *</label>
            <textarea style={{ ...inputSt, height: 100, resize: 'vertical' }}
              placeholder="เช่น: เขียน caption ขายสินค้า OTOP บน TikTok ที่ดึงดูดและกระตุ้นการซื้อ หรือ วิเคราะห์จุดแข็ง-จุดอ่อนของธุรกิจ SME ไทย..."
              value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          </div>

          <button onClick={() => setShowAdvanced(v => !v)}
            style={{ background: 'none', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 8, padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
            {showAdvanced ? '▲ ซ่อนตัวเลือกเพิ่มเติม' : '▼ ตัวเลือกเพิ่มเติม (Role / ตัวอย่าง / Format)'}
          </button>

          {showAdvanced && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelSt}>Role / Persona ของ AI (ไม่บังคับ)</label>
                <input style={inputSt} placeholder="เช่น: นักการตลาดดิจิทัลระดับ Senior ที่เชี่ยวชาญตลาด ASEAN"
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
              {(form.technique === 'few-shot') && (
                <div>
                  <label style={labelSt}>ตัวอย่าง Input → Output (สำหรับ Few-Shot)</label>
                  <textarea style={{ ...inputSt, height: 90, resize: 'vertical' }}
                    placeholder="Input: ผ้าไหมไทย → Output: 🌟 ผ้าไหมไทยแท้ 100% งานครูช่าง..."
                    value={form.examples} onChange={e => setForm(f => ({ ...f, examples: e.target.value }))} />
                </div>
              )}
              <div>
                <label style={labelSt}>บริบทเพิ่มเติม</label>
                <input style={inputSt} placeholder="เช่น: สินค้าราคา 500 บาท กลุ่มเป้าหมายอายุ 25-40 ปี"
                  value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
              </div>
              <div>
                <label style={labelSt}>รูปแบบผลลัพธ์ที่ต้องการ</label>
                <input style={inputSt} placeholder="เช่น: bullet 5 ข้อ, JSON, ตาราง, เรียงความ 200 คำ"
                  value={form.output_format} onChange={e => setForm(f => ({ ...f, output_format: e.target.value }))} />
              </div>
            </div>
          )}

          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#f59e0b,#d97706)' }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังสร้าง Prompt...' : '⚡ สร้าง Prompt'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Main Prompt Output */}
          <div style={card({ borderLeft: '4px solid #f59e0b' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>⚡ Prompt ที่สร้างขึ้น</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <SourceBadge source={result.source} />
                  {result.quality_score && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${scoreColor(result.quality_score)}20`, color: scoreColor(result.quality_score), fontWeight: 700 }}>
                      Quality {result.quality_score}/100
                    </span>
                  )}
                </div>
              </div>
              <CopyBtn text={result.built_prompt || ''} />
            </div>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '16px', fontSize: 13, color: '#1e293b', lineHeight: 1.8, fontFamily: "'Courier New',monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result.built_prompt}
            </div>
          </div>

          {/* Why this technique */}
          {result.why_this_technique && (
            <div style={card({ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' })}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#d97706' }}>💡 เหตุผลที่เลือกเทคนิคนี้</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.why_this_technique}</div>
              {result.expected_output_quality && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>🎯 คาดหวัง: {result.expected_output_quality}</div>
              )}
            </div>
          )}

          {/* Prompt Breakdown */}
          {result.prompt_breakdown?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔬 วิเคราะห์โครงสร้าง Prompt</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.prompt_breakdown.map((p, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'start' }}>
                    <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.part}</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#1e293b', marginBottom: 2 }}>{p.content}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>→ {p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🚀 เคล็ดลับปรับปรุง Prompt</div>
              {result.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < result.tips.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Variations */}
          {result.variations?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔄 Prompt ทางเลือก</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.variations.map((v, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>🔹 {v.label}</span>
                      <CopyBtn text={v.prompt || ''} />
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', fontFamily: "'Courier New',monospace", lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{v.prompt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cultural Wisdom S17 ─────────────────────────────────────────────────
function TabCulturalWisdom() {
  const [form, setForm]     = useState({ situation: '', tradition: 'all', purpose: 'ทั่วไป' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const run = async () => {
    if (!form.situation.trim()) { setError('กรุณาอธิบายสถานการณ์หรือคำถาม'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/cultural-wisdom'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const goldColor = '#b45309';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Input Form */}
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: goldColor, marginBottom: 16 }}>☯️ ค้นหาปัญญาโบราณ</div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={labelSt}>สถานการณ์ / คำถาม</label>
            <textarea
              value={form.situation}
              onChange={e => setForm(f => ({ ...f, situation: e.target.value }))}
              placeholder="เช่น: ธุรกิจกำลังเผชิญการแข่งขันสูง ควรขยายหรือรักษาฐานเดิม? หรือ: จะรับมือกับความขัดแย้งในทีมอย่างไร?"
              rows={4}
              style={{ ...inputSt, resize: 'vertical' }}
            />
          </div>

          {/* Tradition Selector */}
          <div>
            <label style={labelSt}>ประเพณีปัญญา</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 8 }}>
              {WISDOM_TRADITIONS.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, tradition: t.id }))}
                  style={{ background: form.tradition === t.id ? `rgba(180,83,9,0.1)` : '#f8fafc', border: `2px solid ${form.tradition === t.id ? goldColor : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: form.tradition === t.id ? goldColor : '#374151' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label style={labelSt}>วัตถุประสงค์</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WISDOM_PURPOSES.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, purpose: p }))}
                  style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${form.purpose === p ? goldColor : 'rgba(0,0,0,0.1)'}`, background: form.purpose === p ? `rgba(180,83,9,0.1)` : '#f8fafc', color: form.purpose === p ? goldColor : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.purpose === p ? 700 : 400 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 }}>{error}</div>}

          <button onClick={run} disabled={loading}
            style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,#92400e,${goldColor})`, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ กำลังค้นหาปัญญา...' : '☯️ ค้นหาปัญญาโบราณ'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Main Quote */}
          <div style={{ ...card(), background: 'linear-gradient(135deg,#fef3c7,#fffbeb)', border: `1px solid rgba(180,83,9,0.2)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: goldColor }}>📜 คำสอนโบราณ</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SourceBadge source={result.source} />
                <CopyBtn text={result.wisdom_quote || ''} />
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#92400e', lineHeight: 1.6, marginBottom: 8, fontFamily: "'Georgia',serif" }}>
              "{result.wisdom_quote}"
            </div>
            {result.quote_source && (
              <div style={{ fontSize: 11, color: '#b45309', marginBottom: 10 }}>— {result.quote_source}</div>
            )}
            {result.thai_meaning && (
              <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7, background: 'rgba(180,83,9,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                {result.thai_meaning}
              </div>
            )}
          </div>

          {/* Virtue Alignment */}
          {result.virtue_alignment?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: goldColor, marginBottom: 12 }}>🏵️ คุณธรรมที่เกี่ยวข้อง</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.virtue_alignment.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: '#fafaf9', borderRadius: 10, borderLeft: `3px solid ${goldColor}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{v.virtue}</div>
                      <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>{v.tradition}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', flex: 2, lineHeight: 1.5 }}>{v.relevance}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep Insight */}
          {result.deep_insight && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: goldColor, marginBottom: 10 }}>🧘 วิเคราะห์เชิงลึก</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{result.deep_insight}</div>
            </div>
          )}

          {/* Practical Steps */}
          {result.practical_steps?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: goldColor, marginBottom: 12 }}>📋 ขั้นตอนปฏิบัติ</div>
              {result.practical_steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < result.practical_steps.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <span style={{ fontSize: 14, color: goldColor, fontWeight: 800, flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* Business Application */}
          {result.business_application && (
            <div style={{ ...card(), borderLeft: `3px solid #10b981` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 8 }}>💼 ประยุกต์ใช้ในธุรกิจ</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{result.business_application}</div>
            </div>
          )}

          {/* Additional Wisdom */}
          {result.additional_wisdom?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: goldColor, marginBottom: 12 }}>📚 ปัญญาเพิ่มเติม</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.additional_wisdom.map((w, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>{w.tradition}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, fontStyle: 'italic' }}>"{w.quote}"</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{w.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Question */}
          {result.reflection_question && (
            <div style={{ ...card(), background: 'linear-gradient(135deg,#f0fdf4,#f8fafc)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 8 }}>🪬 คำถามเพื่อขบคิด</div>
              <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7, fontStyle: 'italic' }}>{result.reflection_question}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Supply Chain AI (S19) ───────────────────────────────────────────────
const SC_SOURCING = ['ผลิตเอง', 'ในประเทศ', 'นำเข้า', 'ผสม'];
const SC_SEASONS  = ['ทั้งปี', 'ต้นปี (ม.ค.-มี.ค.)', 'สงกรานต์ (เม.ย.)', 'กลางปี (ก.ค.-ก.ย.)', 'ปลายปี (ต.ค.-ธ.ค.)', 'เทศกาล/ของฝาก'];

function TabSupplyChain() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', monthly_volume: '', unit_cost: '', sourcing: 'ผสม', lead_time: '', season: 'ทั้งปี', channels: 'ออนไลน์' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sky = '#0ea5e9';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/supply-chain'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const lvlColor = l => (/สูง/.test(l) ? '#10b981' : /ต่ำ/.test(l) ? '#ef4444' : '#f59e0b');
  const riskColor = l => (/สูง/.test(l) ? '#ef4444' : /ต่ำ/.test(l) ? '#10b981' : '#f59e0b');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: sky, marginBottom: 16 }}>🔗 วิเคราะห์ห่วงโซ่อุปทาน (Supply Chain)</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น น้ำพริกเผา, ผ้าไหมมัดหมี่, กาแฟดอยช้าง" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แหล่งจัดหา</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.sourcing} onChange={e => setForm(f => ({ ...f, sourcing: e.target.value }))}>
                {SC_SOURCING.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>ยอดขาย/เดือน (ชิ้น)</label><input style={inputSt} type="number" placeholder="เช่น 150" value={form.monthly_volume} onChange={e => setForm(f => ({ ...f, monthly_volume: e.target.value }))} /></div>
            <div><label style={labelSt}>ต้นทุน/หน่วย (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 45" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>Lead time จัดหา</label><input style={inputSt} placeholder="เช่น 14 วัน" value={form.lead_time} onChange={e => setForm(f => ({ ...f, lead_time: e.target.value }))} /></div>
            <div><label style={labelSt}>ฤดูกาลขายดี</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                {SC_SEASONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelSt}>ช่องทางจัดจำหน่าย</label><input style={inputSt} placeholder="เช่น ออนไลน์, Shopee/Lazada, หน้าร้าน, ส่งต่างจังหวัด" value={form.channels} onChange={e => setForm(f => ({ ...f, channels: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${sky},#0284c7)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์...' : '🔗 วิเคราะห์ Supply Chain'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Health score + summary */}
          <div style={{ ...card({ borderLeft: `4px solid ${sky}` }), display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {typeof result.health_score === 'number' && (
              <div style={{ textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 38, fontWeight: 900, color: result.health_score >= 75 ? '#10b981' : result.health_score >= 55 ? '#f59e0b' : '#ef4444' }}>{result.health_score}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>HEALTH /100</div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: sky }}>📋 สรุปภาพรวม</div>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          </div>

          {/* Demand forecast */}
          {result.demand_forecast && (
            <div style={card()}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: sky }}>📈 พยากรณ์ดีมานด์</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>แนวโน้ม</div><div style={{ fontSize: 13, color: '#1e293b' }}>{result.demand_forecast.trend}</div></div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>ฤดูกาล</div><div style={{ fontSize: 13, color: '#1e293b' }}>{result.demand_forecast.seasonality}</div></div>
              </div>
              {result.demand_forecast.monthly_outlook?.length > 0 && (
                <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                  {result.demand_forecast.monthly_outlook.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 110 }}>{m.period}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: lvlColor(m.demand_level), borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{m.demand_level}</span>
                      <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{m.note}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 10 }}>
                {result.demand_forecast.safety_stock_advice && <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700 }}>🛡️ Safety Stock</div><div style={{ fontSize: 12, color: '#475569' }}>{result.demand_forecast.safety_stock_advice}</div></div>}
                {result.demand_forecast.reorder_point && <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700 }}>🔄 Reorder Point</div><div style={{ fontSize: 12, color: '#475569' }}>{result.demand_forecast.reorder_point}</div></div>}
              </div>
            </div>
          )}

          {/* Inventory + Sourcing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.inventory_strategy && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>📦 กลยุทธ์สต๊อก</div>
                {Object.entries({ 'ABC': result.inventory_strategy.abc_focus, 'ระดับสต๊อก': result.inventory_strategy.stock_level, 'Turnover': result.inventory_strategy.turnover_tip, 'ของค้าง': result.inventory_strategy.deadstock_risk }).map(([k, v]) => v && (
                  <div key={k} style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{k}</div><div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{v}</div></div>
                ))}
              </div>
            )}
            {result.sourcing_strategy && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>🏭 กลยุทธ์จัดซื้อ/จัดหา</div>
                {result.sourcing_strategy.recommendation && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>{result.sourcing_strategy.recommendation}</div>}
                {result.sourcing_strategy.supplier_criteria?.length > 0 && (
                  <><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>เกณฑ์เลือกซัพพลายเออร์</div>
                  {result.sourcing_strategy.supplier_criteria.map((c, i) => <div key={i} style={{ fontSize: 12, color: '#475569' }}>✓ {c}</div>)}</>
                )}
                {result.sourcing_strategy.moq_strategy && <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}><strong>MOQ:</strong> {result.sourcing_strategy.moq_strategy}</div>}
                {result.sourcing_strategy.dual_sourcing && <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}><strong>สำรอง:</strong> {result.sourcing_strategy.dual_sourcing}</div>}
              </div>
            )}
          </div>

          {/* Logistics */}
          {result.logistics && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>🚚 โลจิสติกส์ & การจัดส่ง</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                {result.logistics.recommended_channels?.length > 0 && (
                  <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>ช่องทางขนส่งแนะนำ</div>{result.logistics.recommended_channels.map((c, i) => <div key={i} style={{ fontSize: 12, color: '#475569' }}>• {c}</div>)}</div>
                )}
                {result.logistics.cost_optimization?.length > 0 && (
                  <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>ลดต้นทุนขนส่ง</div>{result.logistics.cost_optimization.map((c, i) => <div key={i} style={{ fontSize: 12, color: '#475569' }}>• {c}</div>)}</div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 8, marginTop: 10 }}>
                {result.logistics.delivery_sla && <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>⏱️ SLA</div><div style={{ fontSize: 12, color: '#475569' }}>{result.logistics.delivery_sla}</div></div>}
                {result.logistics.packaging_tip && <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>📦 บรรจุภัณฑ์</div><div style={{ fontSize: 12, color: '#475569' }}>{result.logistics.packaging_tip}</div></div>}
                {result.logistics.fulfillment_model && <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>🏬 Fulfillment</div><div style={{ fontSize: 12, color: '#475569' }}>{result.logistics.fulfillment_model}</div></div>}
              </div>
            </div>
          )}

          {/* Cost structure */}
          {result.cost_structure && (
            <div style={card({ background: 'rgba(14,165,233,0.04)', borderColor: 'rgba(14,165,233,0.2)' })}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#0284c7' }}>💰 โครงสร้างต้นทุน & กำไร</div>
              {result.cost_structure.landed_cost_factors?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {result.cost_structure.landed_cost_factors.map((c, i) => <span key={i} style={{ fontSize: 12, background: '#fff', border: '1px solid rgba(14,165,233,0.25)', color: '#0284c7', borderRadius: 20, padding: '3px 10px' }}>{c}</span>)}
                </div>
              )}
              {result.cost_structure.margin_protection && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}><strong>ปกป้องกำไร:</strong> {result.cost_structure.margin_protection}</div>}
              {result.cost_structure.pricing_note && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginTop: 4 }}><strong>ตั้งราคา:</strong> {result.cost_structure.pricing_note}</div>}
            </div>
          )}

          {/* Risk management */}
          {result.risk_management?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>⚠️ การบริหารความเสี่ยง</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.risk_management.map((r, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${riskColor(r.likelihood)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{r.risk}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: riskColor(r.likelihood), borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>โอกาส {r.likelihood}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>📌 {r.impact}</div>
                    <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>🛡️ {r.mitigation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action plan + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.action_plan?.length > 0 && (
              <div style={card({ borderLeft: `4px solid ${sky}` })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>✅ แผนปฏิบัติการ</div>
                {result.action_plan.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#475569', padding: '4px 0' }}>
                    <span style={{ color: sky, fontWeight: 800 }}>{i + 1}.</span><span style={{ lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            )}
            {result.kpis?.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: sky }}>📊 KPIs ที่ควรวัด</div>
                {result.kpis.map((k, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{k.metric}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>{k.target}</span>
                    </div>
                    {k.why && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.why}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pricing Optimizer (S20) ─────────────────────────────────────────────
const PRICE_POSITIONING = ['คุ้มค่า', 'พรีเมียม', 'ราคาประหยัด', 'ระดับกลาง'];

function TabPricing() {
  const [form, setForm] = useState({ product: '', cost: '', competitor_price: '', category: 'OTOP', target_margin: '', positioning: 'คุ้มค่า' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const indigo = '#6366f1';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/pricing'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: indigo, marginBottom: 16 }}>💰 ตั้งราคาให้ได้กำไร + แข่งขันได้</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น น้ำพริกเผา, ครีมสมุนไพร" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>ต้นทุน/หน่วย (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 30" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
            <div><label style={labelSt}>ราคาคู่แข่ง (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 89" value={form.competitor_price} onChange={e => setForm(f => ({ ...f, competitor_price: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>การวางตำแหน่ง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.positioning} onChange={e => setForm(f => ({ ...f, positioning: e.target.value }))}>
                {PRICE_POSITIONING.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${indigo},#8b5cf6)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังคำนวณ...' : '💰 หาราคาที่ดีที่สุด'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card({ borderLeft: `4px solid ${indigo}` }), textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>💡 ราคาที่แนะนำ</span>
              <SourceBadge source={result.source} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: indigo, lineHeight: 1.4 }}>{result.recommended_price}</div>
            {result.psychological_price && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>🧠 {result.psychological_price}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            {result.price_range && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>ช่วงราคา</div><div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{result.price_range.min} – {result.price_range.max}</div></div>}
            {result.margin_analysis && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>กำไรขั้นต้น</div><div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{result.margin_analysis.gross_margin}</div></div>}
            {result.strategy && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>กลยุทธ์</div><div style={{ fontSize: 12, color: '#475569' }}>{result.strategy}</div></div>}
          </div>

          {result.margin_analysis?.note && <div style={card({ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' })}><div style={{ fontWeight: 700, fontSize: 12, color: indigo, marginBottom: 4 }}>📊 ข้อสังเกตกำไร</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.margin_analysis.note}</div></div>}
          {result.competitor_positioning && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: indigo, marginBottom: 6 }}>🥊 เทียบคู่แข่ง</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.competitor_positioning}</div></div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.bundle_options?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: indigo, marginBottom: 8 }}>📦 ไอเดียจัดเซ็ต</div>{result.bundle_options.map((b, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {b}</div>)}</div>}
            {result.upsell_ideas?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: indigo, marginBottom: 8 }}>⬆️ Upsell / Cross-sell</div>{result.upsell_ideas.map((b, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {b}</div>)}</div>}
          </div>

          {result.discount_strategy && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: indigo, marginBottom: 6 }}>🏷️ กลยุทธ์ส่วนลด</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.discount_strategy}</div></div>}
          {result.price_anchoring_tip && <div style={card({ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 6 }}>⚓ เคล็ดลับ Price Anchoring</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.price_anchoring_tip}</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Customer Service AI (S21) ───────────────────────────────────────────
const CS_CHANNELS = ['แชท', 'คอมเมนต์', 'LINE', 'Messenger', 'โทรศัพท์'];
const CS_TONES    = ['สุภาพ เป็นมิตร', 'อบอุ่น ดูแลใส่ใจ', 'มืออาชีพ กระชับ', 'สนุก เป็นกันเอง'];

function TabCustomerService() {
  const [form, setForm] = useState({ message: '', product: '', channel: 'แชท', tone: 'สุภาพ เป็นมิตร' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const green = '#22c55e';

  const run = async () => {
    if (!form.message.trim()) { setError('กรุณาใส่ข้อความจากลูกค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/customer-service'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const sentColor = s => ({ positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' }[s] || '#64748b');
  const urgColor = u => (/สูง/.test(u) ? '#ef4444' : /ต่ำ/.test(u) ? '#10b981' : '#f59e0b');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: green, marginBottom: 16 }}>💬 ช่วยตอบลูกค้าอย่างมืออาชีพ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={labelSt}>ข้อความจากลูกค้า *</label>
            <textarea style={{ ...inputSt, minHeight: 90, resize: 'vertical' }} placeholder="วางข้อความที่ลูกค้าส่งมา เช่น 'ของแพงจัง ลดได้ไหม' / 'ส่งช้ามากเลย'" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>สินค้า (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น ผ้าไหม" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
            <div><label style={labelSt}>ช่องทาง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                {CS_CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>โทน</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
                {CS_TONES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${green},#16a34a)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังร่างคำตอบ...' : '💬 ช่วยตอบลูกค้า'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card(), display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SourceBadge source={result.source} />
            {result.intent && <span style={{ fontSize: 12, fontWeight: 700, background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '3px 10px' }}>🎯 {result.intent}</span>}
            {result.sentiment && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: sentColor(result.sentiment), borderRadius: 20, padding: '3px 10px' }}>{result.sentiment}</span>}
            {result.urgency && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: urgColor(result.urgency), borderRadius: 20, padding: '3px 10px' }}>⏱️ {result.urgency}</span>}
            {result.escalate && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', borderRadius: 20, padding: '3px 10px' }}>🚨 ส่งต่อทีม</span>}
          </div>

          {result.recommended_reply && (
            <div style={card({ borderLeft: `4px solid ${green}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: green }}>⭐ คำตอบแนะนำ</div>
                <CopyBtn text={result.recommended_reply} />
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.recommended_reply}</div>
            </div>
          )}

          {result.suggested_replies?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: green }}>📝 ตัวเลือกคำตอบ</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.suggested_replies.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: green, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{r}</span>
                    <CopyBtn text={r} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.do_dont?.do?.length > 0 && <div style={card({ borderLeft: '4px solid #10b981' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#10b981', marginBottom: 8 }}>👍 ควรทำ</div>{result.do_dont.do.map((d, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {d}</div>)}</div>}
            {result.do_dont?.dont?.length > 0 && <div style={card({ borderLeft: '4px solid #ef4444' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 8 }}>🚫 ไม่ควรทำ</div>{result.do_dont.dont.map((d, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {d}</div>)}</div>}
          </div>

          {result.follow_up && <div style={card({ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#16a34a', marginBottom: 6 }}>🔄 ประโยคติดตามผล</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.follow_up}</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Ad Budget Planner (S22) ─────────────────────────────────────────────
const AD_GOALS = ['ยอดขาย', 'การรับรู้ (Awareness)', 'เก็บ Leads', 'ทราฟฟิกเข้าร้าน'];

function TabAdBudget() {
  const [form, setForm] = useState({ product: '', budget: '', goal: 'ยอดขาย', platforms: 'TikTok, Facebook', duration: '30 วัน', category: 'OTOP' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rose = '#f43f5e';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/ad-budget'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: rose, marginBottom: 16 }}>📣 จัดสรรงบโฆษณาข้ามแพลตฟอร์ม</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ครีมสมุนไพร, น้ำพริกเผา" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>งบประมาณ (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 10000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
            <div><label style={labelSt}>ระยะเวลา</label><input style={inputSt} placeholder="เช่น 30 วัน" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
          </div>
          <div><label style={labelSt}>เป้าหมาย</label>
            <select style={{ ...inputSt, cursor: 'pointer' }} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}>
              {AD_GOALS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div><label style={labelSt}>แพลตฟอร์ม (คั่นด้วยจุลภาค)</label><input style={inputSt} placeholder="เช่น TikTok, Facebook, Instagram" value={form.platforms} onChange={e => setForm(f => ({ ...f, platforms: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${rose},#e11d48)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวางแผนงบ...' : '📣 วางแผนงบโฆษณา'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.summary && (
            <div style={card({ borderLeft: `4px solid ${rose}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: rose }}>🎯 กลยุทธ์การใช้งบ</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          )}

          {result.allocation?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: rose }}>💸 การจัดสรรงบ</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.allocation.map((a, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{a.platform}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: rose }}>{a.amount}{typeof a.percent === 'number' ? ` · ${a.percent}%` : ''}</span>
                    </div>
                    {typeof a.percent === 'number' && (
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${a.percent}%`, background: rose, borderRadius: 99 }} />
                      </div>
                    )}
                    {a.format && <div style={{ fontSize: 12, color: '#64748b' }}>🎨 {a.format}</div>}
                    {a.rationale && <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.rationale}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.expected_results && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: rose }}>📊 คาดการณ์ผลลัพธ์</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 10 }}>
                {Object.entries(result.expected_results).map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.phasing?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: rose }}>📅 แบ่งเฟสการยิงแอด</div>
              {result.phasing.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < result.phasing.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: rose, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{p.budget}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.phase} <span style={{ fontWeight: 400, color: '#94a3b8' }}>· {p.days}</span></div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{p.focus}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.creative_tips?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: rose, marginBottom: 8 }}>🎨 เคล็ดลับครีเอทีฟ</div>{result.creative_tips.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            {result.scaling_rules?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: rose, marginBottom: 8 }}>⚖️ กฎการเพิ่มงบ</div>{result.scaling_rules.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
          </div>

          {result.bid_strategy && <div style={card({ background: 'rgba(244,63,94,0.04)', borderColor: 'rgba(244,63,94,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#e11d48', marginBottom: 6 }}>🎰 กลยุทธ์ Bid</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.bid_strategy}</div></div>}

          {result.watch_metrics?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: rose }}>👀 ตัวชี้วัดที่ต้องเฝ้า</div>
              {result.watch_metrics.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{w.metric}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{w.action}</div></div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#e11d48', whiteSpace: 'nowrap' }}>{w.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Break-even & Profit Planner (S23) ───────────────────────────────────
function TabBreakEven() {
  const [form, setForm] = useState({ product: '', price: '', unit_cost: '', fixed_costs: '', monthly_target: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const teal = '#0d9488';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/break-even'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const verdictColor = v => (/✅/.test(v) ? '#10b981' : /🔴/.test(v) ? '#ef4444' : '#f59e0b');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: teal, marginBottom: 16 }}>⚖️ วางแผนจุดคุ้มทุน + กำไร</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น สบู่สมุนไพร" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>ราคาขาย/หน่วย (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 120" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div><label style={labelSt}>ต้นทุนผันแปร/หน่วย (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 45" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>ต้นทุนคงที่/เดือน (บาท)</label><input style={inputSt} type="number" placeholder="เช่น 8000" value={form.fixed_costs} onChange={e => setForm(f => ({ ...f, fixed_costs: e.target.value }))} /></div>
            <div><label style={labelSt}>เป้ายอดขาย/เดือน (ชิ้น)</label><input style={inputSt} type="number" placeholder="เช่น 200 (ไม่บังคับ)" value={form.monthly_target} onChange={e => setForm(f => ({ ...f, monthly_target: e.target.value }))} /></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${teal},#0f766e)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังคำนวณ...' : '⚖️ คำนวณจุดคุ้มทุน'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.health_verdict && (
            <div style={{ ...card({ borderLeft: `4px solid ${verdictColor(result.health_verdict)}` }) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: verdictColor(result.health_verdict) }}>📋 ประเมินผล</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6, fontWeight: 600 }}>{result.health_verdict}</div>
              {result.summary && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>{result.summary}</div>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            {result.contribution_margin && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>กำไรส่วนเกิน/หน่วย</div><div style={{ fontSize: 18, fontWeight: 900, color: teal }}>{result.contribution_margin.per_unit}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{result.contribution_margin.percent}</div></div>}
            {result.break_even && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>จุดคุ้มทุน</div><div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>{result.break_even.units}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{result.break_even.daily_units}</div></div>}
            {result.break_even && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>ยอดขายคุ้มทุน</div><div style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>{result.break_even.revenue}</div></div>}
          </div>

          {result.scenarios?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: teal }}>🎲 สถานการณ์จำลอง</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 10 }}>
                {result.scenarios.map((s, i) => {
                  const neg = /-/.test(String(s.profit));
                  return (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0' }}>{s.units}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: neg ? '#ef4444' : '#10b981' }}>{s.profit}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.profit_projection?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: teal }}>📈 ประมาณการกำไร</div>
              {result.profit_projection.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < result.profit_projection.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{r.units}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.revenue}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: /-/.test(String(r.profit)) ? '#ef4444' : '#10b981' }}>{r.profit}</span>
                </div>
              ))}
            </div>
          )}

          {result.pricing_sensitivity && <div style={card({ background: 'rgba(13,148,136,0.04)', borderColor: 'rgba(13,148,136,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 6 }}>🎚️ ผลของการปรับราคา</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.pricing_sensitivity}</div></div>}
          {result.cash_flow_tips?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 8 }}>💧 เคล็ดลับสภาพคล่อง</div>{result.cash_flow_tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Campaign Calendar Planner (S24) ─────────────────────────────────────
const CC_PERIODS = ['ทั้งปี', 'ไตรมาส 1 (ม.ค.-มี.ค.)', 'ไตรมาส 2 (เม.ย.-มิ.ย.)', 'ไตรมาส 3 (ก.ค.-ก.ย.)', 'ไตรมาส 4 (ต.ค.-ธ.ค.)', 'ครึ่งปีหลัง'];

function TabCampaignCalendar() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', period: 'ทั้งปี', platform: 'TikTok, Shopee' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fuchsia = '#d946ef';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/campaign-calendar'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: fuchsia, marginBottom: 16 }}>📆 ปฏิทินแคมเปญตามเทศกาลไทย</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ของฝากOTOP, ชาสมุนไพร" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ช่วงที่วางแผน</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                {CC_PERIODS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelSt}>ช่องทาง</label><input style={inputSt} placeholder="เช่น TikTok, Shopee, Facebook" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${fuchsia},#c026d3)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวางปฏิทิน...' : '📆 สร้างปฏิทินแคมเปญ'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.summary && (
            <div style={card({ borderLeft: `4px solid ${fuchsia}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: fuchsia }}>🗺️ กลยุทธ์ปฏิทิน</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          )}

          {result.events?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: fuchsia }}>🎉 ไทม์ไลน์แคมเปญ</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, borderLeft: `3px solid ${fuchsia}`, paddingLeft: 12 }}>
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{ev.period}</div>
                      {ev.prep_lead && <div style={{ fontSize: 10, color: '#94a3b8' }}>⏳ เตรียม {ev.prep_lead}</div>}
                    </div>
                    <div style={{ flex: 1, background: '#fdf4ff', borderRadius: 10, padding: '8px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#a21caf' }}>{ev.occasion}</div>
                      {ev.promo_angle && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>🎯 {ev.promo_angle}</div>}
                      {ev.content_idea && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>🎬 {ev.content_idea}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.key_dates?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: fuchsia, marginBottom: 8 }}>📌 วันห้ามพลาด</div>{result.key_dates.map((d, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {d}</div>)}</div>}
            {result.always_on_ideas?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: fuchsia, marginBottom: 8 }}>♾️ คอนเทนต์ทำได้ตลอด</div>{result.always_on_ideas.map((d, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {d}</div>)}</div>}
          </div>

          {result.budget_focus && <div style={card({ background: 'rgba(217,70,239,0.04)', borderColor: 'rgba(217,70,239,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#c026d3', marginBottom: 6 }}>💸 ช่วงทุ่มงบ</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.budget_focus}</div></div>}
          {result.tips?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: fuchsia, marginBottom: 8 }}>💡 เคล็ดลับ</div>{result.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Live Selling Script (S25) ───────────────────────────────────────────
const LIVE_PLATFORMS = ['TikTok Live', 'Facebook Live', 'Shopee Live', 'Lazada Live'];
const LIVE_DURATIONS = ['30 นาที', '60 นาที', '90 นาที', '120 นาที'];

function TabLiveScript() {
  const [form, setForm] = useState({ product: '', platform: 'TikTok Live', duration: '60 นาที', goal: 'ปิดการขาย', special_offer: '', category: 'OTOP' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pink = '#fb7185';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/live-script'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: pink, marginBottom: 16 }}>🔴 สคริปต์ไลฟ์ขายของ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ครีมบำรุงผิว, น้ำพริกเผา" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {LIVE_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ความยาว</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                {LIVE_DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelSt}>โปรพิเศษในไลฟ์ (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น ลด 50% เฉพาะไลฟ์, ซื้อ 1 แถม 1" value={form.special_offer} onChange={e => setForm(f => ({ ...f, special_offer: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${pink},#f43f5e)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังเขียนสคริปต์...' : '🔴 สร้างสคริปต์ไลฟ์'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.opening_hook && (
            <div style={card({ borderLeft: `4px solid ${pink}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: pink }}>🎬 เปิดไลฟ์ (30 วิแรก)</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><SourceBadge source={result.source} /><CopyBtn text={result.opening_hook} /></div>
              </div>
              <div style={{ background: '#fff1f2', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#9f1239', lineHeight: 1.6 }}>{result.opening_hook}</div>
              {result.summary && <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{result.summary}</div>}
            </div>
          )}

          {result.rundown?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: pink }}>⏱️ ไทม์ไลน์ไลฟ์</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.rundown.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: pink, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', height: 'fit-content' }}>{r.time}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{r.segment}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{r.talking_points}</div>
                      {r.goal && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>🎯 {r.goal}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.engagement_tactics?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: pink, marginBottom: 8 }}>🎮 ดึง Engagement</div>{result.engagement_tactics.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            {result.urgency_scripts?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: pink, marginBottom: 8 }}>⚡ เร่งความเร่งด่วน</div>{result.urgency_scripts.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>{t}</div>)}</div>}
          </div>

          {result.objection_handling?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: pink }}>🛡️ รับมือข้อโต้แย้ง</div>
              {result.objection_handling.map((o, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>❓ {o.objection}</div>
                  <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>💬 {o.response}</div>
                </div>
              ))}
            </div>
          )}

          {result.closing_scripts?.length > 0 && (
            <div style={card({ borderLeft: `4px solid #10b981` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>🎯 ปิดการขาย</div>
                <CopyBtn text={result.closing_scripts.join('\n')} />
              </div>
              {result.closing_scripts.map((s, i) => <div key={i} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: '#166534' }}>{s}</div>)}
              {result.cta_cadence && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>📢 {result.cta_cadence}</div>}
            </div>
          )}

          {result.tips?.length > 0 && <div style={card({ background: 'rgba(251,113,133,0.05)', borderColor: 'rgba(251,113,133,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#e11d48', marginBottom: 8 }}>💡 เคล็ดลับไลฟ์ปัง</div>{result.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Omni-Solver (S26) — เครื่องแก้ปัญหารอบด้าน 4 ศาสตร์ ──────────────────
const LENS_META = {
  psychology: { icon: '🧠', label: 'จิตวิทยา', color: '#a855f7' },
  geometry: { icon: '📐', label: 'เรขาคณิตวิเคราะห์', color: '#0ea5e9' },
  ecology: { icon: '🌳', label: 'นิเวศการอยู่รอด', color: '#10b981' },
  competition: { icon: '♟️', label: 'การแข่งขันการค้า', color: '#f59e0b' },
};

function TabOmniSolver() {
  const [form, setForm] = useState({ problem: '', context: '', goal: 'ปิดการขายที่เป็นธรรม (win-win ทุกฝ่าย)', stakeholders: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const violet = '#7c3aed';

  const run = async () => {
    if (!form.problem.trim()) { setError('กรุณาใส่ปัญหา/สถานการณ์'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/omni-solver'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card({ borderTop: `3px solid ${violet}` })}>
        <div style={{ fontSize: 15, fontWeight: 800, color: violet, marginBottom: 4 }}>🧩 Omni-Solver — แก้ปัญหารอบด้าน</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>วิเคราะห์ 4 ศาสตร์: 🧠 จิตวิทยา · 📐 เรขาคณิตวิเคราะห์ · 🌳 นิเวศการอยู่รอด · ♟️ การแข่งขันการค้า → ปิดการขายที่เป็นธรรม</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ปัญหา/สถานการณ์ *</label><textarea style={{ ...inputSt, minHeight: 90, resize: 'vertical' }} placeholder="อธิบายปัญหาที่ต้องการแก้ เช่น 'ลูกค้าสนใจแต่ไม่ปิดการขายสักที' / 'คู่แข่งตัดราคา' / 'ทีมขัดแย้งกัน'" value={form.problem} onChange={e => setForm(f => ({ ...f, problem: e.target.value }))} /></div>
          <div><label style={labelSt}>บริบทเพิ่มเติม (ไม่บังคับ)</label><input style={inputSt} placeholder="ข้อมูลแวดล้อม เช่น งบ ระยะเวลา ข้อจำกัด" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>เป้าหมาย</label><input style={inputSt} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} /></div>
            <div><label style={labelSt}>ผู้เกี่ยวข้องทุกฝ่าย (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น ลูกค้า, ทีม, คู่ค้า" value={form.stakeholders} onChange={e => setForm(f => ({ ...f, stakeholders: e.target.value }))} /></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${violet},#6366f1)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์รอบด้าน...' : '🧩 แก้ปัญหารอบด้าน'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Reframe + summary */}
          <div style={card({ borderLeft: `4px solid ${violet}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: violet }}>🎯 นิยามปัญหาใหม่</span>
              <SourceBadge source={result.source} />
            </div>
            {result.problem_reframed && <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, lineHeight: 1.6 }}>{result.problem_reframed}</div>}
            {result.summary && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>{result.summary}</div>}
            {result.root_causes?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>รากของปัญหา</div>
                {result.root_causes.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#475569' }}>• {r}</div>)}
              </div>
            )}
          </div>

          {/* 4 Lenses */}
          {result.lenses && (
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
              {Object.entries(LENS_META).map(([key, m]) => {
                const l = result.lenses[key];
                if (!l) return null;
                return (
                  <div key={key} style={card({ borderTop: `3px solid ${m.color}` })}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: m.color, marginBottom: 6 }}>{m.icon} {m.label}</div>
                    {l.insight && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 6 }}>{l.insight}</div>}
                    {(l.levers || l.leverage_points || l.adaptation || l.moves)?.map((x, i) => <div key={i} style={{ fontSize: 12, color: '#1e293b', padding: '1px 0' }}>→ {x}</div>)}
                    {(l.structure || l.positioning) && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{l.structure || l.positioning}</div>}
                    {l.resources?.map((x, i) => <div key={i} style={{ fontSize: 11, color: '#94a3b8' }}>🔗 {x}</div>)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Perspectives — ทุกมุมมอง/จุดยืน */}
          {result.perspectives?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: violet }}>👁️ ทุกมุมมอง/จุดยืน</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.perspectives.map((p, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.stakeholder}</div>
                    {p.view && <div style={{ fontSize: 12, color: '#64748b' }}>มอง: {p.view}</div>}
                    {p.need && <div style={{ fontSize: 12, color: '#7c3aed' }}>ต้องการ: {p.need}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          {result.options?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: violet }}>⚖️ ทางเลือก + ความเป็นธรรม</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.options.map((o, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{o.option}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 8 }}>
                      {o.pros?.length > 0 && <div style={{ fontSize: 11, color: '#10b981' }}>👍 {o.pros.join(' · ')}</div>}
                      {o.cons?.length > 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>👎 {o.cons.join(' · ')}</div>}
                    </div>
                    {o.fairness && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>⚖️ {o.fairness}</div>}
                  </div>
                ))}
              </div>
              {result.recommended_path && <div style={{ marginTop: 10, background: '#faf5ff', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6b21a8', lineHeight: 1.6 }}><strong>✅ แนะนำ:</strong> {result.recommended_path}</div>}
            </div>
          )}

          {/* Fair close — flagship */}
          {result.fair_close && (
            <div style={card({ background: 'linear-gradient(135deg,#faf5ff,#f0fdf4)', border: '1px solid rgba(124,58,237,0.2)' })}>
              <div style={{ fontWeight: 800, fontSize: 14, color: violet, marginBottom: 8 }}>🤝 ปิดการขายที่เป็นธรรม (Win-Win)</div>
              {result.fair_close.win_win && <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, marginBottom: 8 }}>{result.fair_close.win_win}</div>}
              {result.fair_close.script && (
                <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>สคริปต์ปิดดีล</span>
                    <CopyBtn text={result.fair_close.script} />
                  </div>
                  <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>{result.fair_close.script}</div>
                </div>
              )}
              {result.fair_close.guardrails?.length > 0 && result.fair_close.guardrails.map((g, i) => <div key={i} style={{ fontSize: 12, color: '#b45309' }}>🛡️ {g}</div>)}
            </div>
          )}

          {/* Action plan + monitoring */}
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.action_plan?.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: violet }}>📋 แผนปฏิบัติการ</div>
                {result.action_plan.map((a, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < result.action_plan.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div style={{ fontSize: 13, color: '#1e293b' }}><span style={{ color: violet, fontWeight: 800 }}>{i + 1}.</span> {a.step}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.owner} · {a.when}</div>
                  </div>
                ))}
              </div>
            )}
            {result.monitoring && (
              <div style={card({ borderLeft: '4px solid #10b981' })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#059669' }}>📡 ติดตามต่อเนื่อง 24/7</div>
                {result.monitoring.signals?.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {s}</div>)}
                {result.monitoring.review_cadence && <div style={{ fontSize: 12, color: '#059669', marginTop: 6 }}>🔄 {result.monitoring.review_cadence}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Negotiation Coach (S27) ─────────────────────────────────────────────
function TabNegotiation() {
  const [form, setForm] = useState({ situation: '', my_goal: '', their_position: '', constraints: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cyan = '#0891b2';

  const run = async () => {
    if (!form.situation.trim()) { setError('กรุณาใส่สถานการณ์เจรจา'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/negotiation'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: cyan, marginBottom: 16 }}>🤝 โค้ชเจรจาต่อรอง (ดีลที่เป็นธรรม)</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>สถานการณ์เจรจา *</label><textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical' }} placeholder="เช่น 'ต่อรองราคากับซัพพลายเออร์' / 'ลูกค้าขอลดราคา 30%' / 'เจรจาสัญญากับคู่ค้า'" value={form.situation} onChange={e => setForm(f => ({ ...f, situation: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>เป้าหมายของเรา</label><input style={inputSt} placeholder="เช่น ได้ราคาทุนต่ำลง 15%" value={form.my_goal} onChange={e => setForm(f => ({ ...f, my_goal: e.target.value }))} /></div>
            <div><label style={labelSt}>จุดยืนอีกฝ่าย</label><input style={inputSt} placeholder="เช่น ไม่อยากลดราคา" value={form.their_position} onChange={e => setForm(f => ({ ...f, their_position: e.target.value }))} /></div>
          </div>
          <div><label style={labelSt}>ข้อจำกัด (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น งบ เวลา ปริมาณขั้นต่ำ" value={form.constraints} onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${cyan},#0e7490)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวางกลยุทธ์...' : '🤝 วางกลยุทธ์เจรจา'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.summary && (
            <div style={card({ borderLeft: `4px solid ${cyan}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: cyan }}>🎯 กลยุทธ์</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.batna && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>🛡️ BATNA ของเรา</div><div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{result.batna}</div></div>}
            {result.their_likely_batna && <div style={card()}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>🧭 BATNA อีกฝ่าย</div><div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{result.their_likely_batna}</div></div>}
          </div>
          {result.zopa && <div style={card({ background: 'rgba(8,145,178,0.04)', borderColor: 'rgba(8,145,178,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: cyan, marginBottom: 4 }}>📊 ZOPA (ช่วงที่ตกลงได้)</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.zopa}</div></div>}
          {result.anchor && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: cyan, marginBottom: 4 }}>⚓ Anchor (ข้อเสนอเปิด)</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.anchor}</div></div>}

          {result.concession_plan?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: cyan }}>🔄 แผนการยอม-แลก</div>
              {result.concession_plan.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#ef4444' }}>ยอม: {c.give}</span>
                  <span style={{ color: '#94a3b8' }}>↔</span>
                  <span style={{ fontSize: 12, color: '#10b981' }}>แลก: {c.get}</span>
                  {c.when && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>⏱️ {c.when}</span>}
                </div>
              ))}
            </div>
          )}

          {result.scripts && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: cyan }}>💬 สคริปต์เจรจา</div>
              {[['opening', '🚀 เปิดเจรจา'], ['handling_pushback', '🛡️ รับมือต่อรอง'], ['closing', '✅ ปิดดีล']].map(([k, lbl]) => result.scripts[k] && (
                <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cyan }}>{lbl}</span>
                    <CopyBtn text={result.scripts[k]} />
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{result.scripts[k]}</div>
                </div>
              ))}
            </div>
          )}

          {result.fair_framing && <div style={card({ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 4 }}>⚖️ กรอบดีลที่เป็นธรรม</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.fair_framing}</div></div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.tactics?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: cyan, marginBottom: 8 }}>🎯 เทคนิค</div>{result.tactics.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            {result.red_flags?.length > 0 && <div style={card({ borderLeft: '4px solid #ef4444' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 8 }}>🚩 สัญญาณควรถอย</div>{result.red_flags.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
          </div>
          {result.tips?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: cyan, marginBottom: 8 }}>💡 เคล็ดลับ</div>{result.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Conflict Mediator (S28) ─────────────────────────────────────────────
function TabMediation() {
  const [form, setForm] = useState({ conflict: '', parties: '', desired_outcome: 'ทางออกที่เป็นธรรมและรักษาความสัมพันธ์' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const teal = '#0d9488';

  const run = async () => {
    if (!form.conflict.trim()) { setError('กรุณาใส่สถานการณ์ความขัดแย้ง'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/mediation'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: teal, marginBottom: 16 }}>🕊️ ไกล่เกลี่ยความขัดแย้ง (เป็นธรรมทุกฝ่าย)</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>สถานการณ์ความขัดแย้ง *</label><textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical' }} placeholder="เช่น 'หุ้นส่วนเห็นไม่ตรงกันเรื่องแบ่งกำไร' / 'ทีมงานขัดแย้งเรื่องหน้าที่' / 'ลูกค้ากับร้านพิพาทเรื่องคืนสินค้า'" value={form.conflict} onChange={e => setForm(f => ({ ...f, conflict: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={labelSt}>ฝ่ายที่เกี่ยวข้อง</label><input style={inputSt} placeholder="เช่น หุ้นส่วน A, หุ้นส่วน B" value={form.parties} onChange={e => setForm(f => ({ ...f, parties: e.target.value }))} /></div>
            <div><label style={labelSt}>ผลลัพธ์ที่ต้องการ</label><input style={inputSt} value={form.desired_outcome} onChange={e => setForm(f => ({ ...f, desired_outcome: e.target.value }))} /></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${teal},#0f766e)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวิเคราะห์...' : '🕊️ หาทางออกที่เป็นธรรม'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.reframe && (
            <div style={card({ borderLeft: `4px solid ${teal}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: teal }}>🔄 มองความขัดแย้งใหม่</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, lineHeight: 1.6 }}>{result.reframe}</div>
              {result.root_tension && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>🎯 ต้นตอ: {result.root_tension}</div>}
              {result.summary && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>{result.summary}</div>}
            </div>
          )}

          {result.parties_analysis?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: teal }}>👥 วิเคราะห์แต่ละฝ่าย</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 10 }}>
                {result.parties_analysis.map((p, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{p.party} {p.emotion && <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>· {p.emotion}</span>}</div>
                    {p.position && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>จุดยืน: {p.position}</div>}
                    {p.interest && <div style={{ fontSize: 12, color: teal, marginTop: 2 }}>ต้องการจริง: {p.interest}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.common_ground?.length > 0 && (
            <div style={card({ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' })}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 8 }}>🤝 จุดร่วม</div>
              {result.common_ground.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>✓ {c}</div>)}
            </div>
          )}

          {result.resolution_options?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: teal }}>⚖️ ทางออก + ความเป็นธรรม</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.resolution_options.map((o, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{o.option}</div>
                    {o.fairness && <div style={{ fontSize: 12, color: '#059669' }}>⚖️ {o.fairness}</div>}
                    {o.tradeoffs && <div style={{ fontSize: 12, color: '#94a3b8' }}>↔ {o.tradeoffs}</div>}
                  </div>
                ))}
              </div>
              {result.recommended_resolution && <div style={{ marginTop: 10, background: '#f0fdfa', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#115e59', lineHeight: 1.6 }}><strong>✅ แนะนำ:</strong> {result.recommended_resolution}</div>}
            </div>
          )}

          {result.mediation_script && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: teal }}>💬 สคริปต์ไกล่เกลี่ย</div>
              {[['opening', '🚀 เปิดวง'], ['reframing', '🔄 ช่วยเข้าใจกัน'], ['closing', '✅ ปิดสู่ข้อตกลง']].map(([k, lbl]) => result.mediation_script[k] && (
                <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: teal }}>{lbl}</span>
                    <CopyBtn text={result.mediation_script[k]} />
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{result.mediation_script[k]}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.ground_rules?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 8 }}>📋 กติกาการคุย</div>{result.ground_rules.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            {result.follow_up && <div style={card({ borderLeft: '4px solid #10b981' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 6 }}>📡 ติดตามผล</div><div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{result.follow_up}</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Crisis Manager (S29) ────────────────────────────────────────────────
const CRISIS_CHANNELS = ['โซเชียล', 'Facebook', 'TikTok', 'Twitter/X', 'รีวิว/Pantip', 'สื่อ/ข่าว'];
const CRISIS_SEVERITY = ['ต่ำ', 'กลาง', 'สูง'];

function TabCrisis() {
  const [form, setForm] = useState({ situation: '', channel: 'โซเชียล', severity: 'กลาง', brand: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const red = '#dc2626';

  const run = async () => {
    if (!form.situation.trim()) { setError('กรุณาใส่สถานการณ์วิกฤต'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/crisis'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card({ borderTop: `3px solid ${red}` })}>
        <div style={{ fontSize: 15, fontWeight: 800, color: red, marginBottom: 4 }}>🚨 จัดการวิกฤต / ดราม่า อย่างมีสติ</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>ประเมิน · holding statement · do/don't · สคริปต์ตอบ · แผนฟื้นฟู — โปร่งใส เป็นธรรม ไม่กลบเกลื่อน</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>สถานการณ์วิกฤต *</label><textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical' }} placeholder="เช่น 'ลูกค้าโพสต์ว่าเจอสิ่งแปลกปลอมในสินค้า กำลังไวรัล' / 'พนักงานตอบลูกค้าไม่ดีจนเป็นดราม่า'" value={form.situation} onChange={e => setForm(f => ({ ...f, situation: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>ช่องทาง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                {CRISIS_CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ความรุนแรง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {CRISIS_SEVERITY.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แบรนด์ (ไม่บังคับ)</label><input style={inputSt} placeholder="ชื่อร้าน/แบรนด์" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${red},#b91c1c)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังวางแผนรับมือ...' : '🚨 วางแผนรับมือวิกฤต'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card({ borderLeft: `4px solid ${red}` }), display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <SourceBadge source={result.source} />
            {result.severity_assessment && <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.severity_assessment}</div>}
            {result.first_response_window && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: red, borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap' }}>⏱️ {result.first_response_window}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.do_now?.length > 0 && <div style={card({ borderLeft: '4px solid #10b981' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 8 }}>✅ ทำทันที</div>{result.do_now.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            {result.dont?.length > 0 && <div style={card({ borderLeft: '4px solid #ef4444' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 8 }}>🚫 ห้ามทำ</div>{result.dont.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
          </div>

          {result.holding_statement && (
            <div style={card({ background: '#fef2f2', borderColor: 'rgba(220,38,38,0.2)' })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: red }}>⚡ แถลงเบื้องต้น (โพสต์ได้เลย)</div>
                <CopyBtn text={result.holding_statement} />
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7 }}>{result.holding_statement}</div>
            </div>
          )}

          {result.full_statement && (
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: red }}>📄 แถลงการณ์เต็ม</div>
                <CopyBtn text={result.full_statement} />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.full_statement}</div>
            </div>
          )}

          {result.reply_templates?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: red }}>💬 สคริปต์ตอบตามสถานการณ์</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.reply_templates.map((r, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{r.scenario}</span>
                      <CopyBtn text={r.reply} />
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{r.reply}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.recovery_plan?.length > 0 && <div style={card({ borderLeft: '4px solid #10b981' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#059669', marginBottom: 8 }}>🌱 แผนฟื้นฟูความเชื่อมั่น</div>{result.recovery_plan.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              {result.stakeholders?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: red, marginBottom: 8 }}>👥 ต้องสื่อสารกับ</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{result.stakeholders.map((s, i) => <span key={i} style={{ fontSize: 12, background: '#fef2f2', color: red, borderRadius: 20, padding: '3px 10px' }}>{s}</span>)}</div></div>}
              {result.prevention?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: red, marginBottom: 8 }}>🛡️ ป้องกันซ้ำ</div>{result.prevention.map((t, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Customer Persona Builder (S30) ──────────────────────────────────────
function TabPersona() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', market: 'ไทย', price: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const violet = '#8b5cf6';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/persona'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const chips = (arr, color) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {(arr || []).map((x, i) => <span key={i} style={{ fontSize: 12, background: `${color}12`, color, border: `1px solid ${color}33`, borderRadius: 16, padding: '3px 9px' }}>{x}</span>)}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: violet, marginBottom: 16 }}>🎭 สร้างตัวตนลูกค้า (Buyer Persona)</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น ครีมสมุนไพร, กาแฟดอย, ผ้าไหม" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ตลาด</label><input style={inputSt} placeholder="ไทย / ASEAN" value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} /></div>
            <div><label style={labelSt}>ราคา (ไม่บังคับ)</label><input style={inputSt} placeholder="฿290" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${violet},#7c3aed)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังสร้าง persona...' : '🎭 สร้าง Buyer Persona'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.summary && (
            <div style={card({ borderLeft: `4px solid ${violet}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: violet }}>📋 ภาพรวม</span>
                <SourceBadge source={result.source} />
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>
            </div>
          )}

          {result.personas?.map((p, i) => (
            <div key={i} style={card({ borderTop: `3px solid ${violet}` })}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>🎭 {p.name}</span>
                {p.tagline && <span style={{ fontSize: 12, color: violet, fontStyle: 'italic' }}>{p.tagline}</span>}
              </div>
              {p.demographics && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{p.demographics}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                {p.pains?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>😣 ความเจ็บปวด</div>{chips(p.pains, '#ef4444')}</div>}
                {p.desires?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>✨ ความต้องการ</div>{chips(p.desires, '#10b981')}</div>}
                {p.buying_triggers?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⚡ กระตุ้นซื้อ</div>{chips(p.buying_triggers, '#f59e0b')}</div>}
                {p.objections?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>🛑 ข้อกังวล</div>{chips(p.objections, '#64748b')}</div>}
                {p.where_to_find?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', marginBottom: 4 }}>📍 เจอได้ที่</div>{chips(p.where_to_find, '#0ea5e9')}</div>}
                {p.messaging_hooks?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: violet, marginBottom: 4 }}>💬 มุมสื่อสาร</div>{chips(p.messaging_hooks, violet)}</div>}
              </div>
              {p.content_ideas?.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', marginBottom: 4 }}>🎬 ไอเดียคอนเทนต์</div>{chips(p.content_ideas, '#ec4899')}</div>}
            </div>
          ))}

          {(result.primary_persona || result.positioning) && (
            <div style={card({ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.2)' })}>
              {result.primary_persona && <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 6 }}><strong style={{ color: violet }}>🎯 โฟกัสหลัก:</strong> {result.primary_persona}</div>}
              {result.positioning && <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}><strong style={{ color: violet }}>📐 Positioning:</strong> {result.positioning}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Product Listing Writer (S31) ────────────────────────────────────────
const LISTING_PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Facebook'];

function TabListing() {
  const [form, setForm] = useState({ product: '', category: 'OTOP', price: '', key_features: '', platform: 'Shopee' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const orange = '#f97316';

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/listing'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: orange, marginBottom: 16 }}>🛒 เขียนหน้าสินค้า Marketplace</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>ชื่อสินค้า *</label><input style={inputSt} placeholder="เช่น น้ำพริกเผาแม่อรุณ, ครีมกันแดด" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>หมวดหมู่</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>แพลตฟอร์ม</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {LISTING_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>ราคา (ไม่บังคับ)</label><input style={inputSt} placeholder="฿120" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          </div>
          <div><label style={labelSt}>จุดเด่น (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น สูตรดั้งเดิม ไม่ใส่ผงชูรส" value={form.key_features} onChange={e => setForm(f => ({ ...f, key_features: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${orange},#ea580c)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังเขียน...' : '🛒 เขียนหน้าสินค้า'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {result.titles?.length > 0 && (
            <div style={card({ borderTop: `3px solid ${orange}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: orange }}>📝 ชื่อสินค้า (SEO) — เลือกที่ชอบ</span>
                <SourceBadge source={result.source} />
              </div>
              {result.titles.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', background: '#fff7ed', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>{t}</span>
                  <CopyBtn text={t} />
                </div>
              ))}
            </div>
          )}

          {result.bullets?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: orange, marginBottom: 8 }}>✨ จุดเด่น (Bullet Points)</div>
              {result.bullets.map((b, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>{b}</div>)}
            </div>
          )}

          {result.description && (
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: orange }}>📄 คำอธิบายสินค้า</div>
                <CopyBtn text={result.description} />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.description}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.specs?.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, color: orange, marginBottom: 8 }}>📋 สเปก</div>
                {result.specs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i < result.specs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <span style={{ color: '#94a3b8' }}>{s.label}</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
            {result.keywords?.length > 0 && (
              <div style={card()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: orange }}>🔑 คีย์เวิร์ด</span>
                  <CopyBtn text={result.keywords.join(', ')} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywords.map((k, i) => <span key={i} style={{ fontSize: 12, background: `${orange}12`, color: '#ea580c', border: `1px solid ${orange}33`, borderRadius: 16, padding: '3px 9px' }}>{k}</span>)}
                </div>
              </div>
            )}
          </div>

          {result.shipping_note && <div style={card({ background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#ea580c', marginBottom: 4 }}>🚚 ข้อความจัดส่ง</div><div style={{ fontSize: 13, color: '#475569' }}>{result.shipping_note}</div></div>}
          {result.promo_idea && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: orange, marginBottom: 4 }}>🎁 ไอเดียโปรโมชั่น</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.promo_idea}</div></div>}
          {result.tips?.length > 0 && <div style={card()}><div style={{ fontWeight: 700, fontSize: 13, color: orange, marginBottom: 8 }}>💡 เคล็ดลับเพิ่มยอด</div>{result.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}</div>}
        </div>
      )}
    </div>
  );
}

// ─── S32 · Review Responder — ตอบรีวิวลูกค้าอย่างมืออาชีพ ────────────────────────
const REVIEW_CHANNELS = ['Shopee', 'Lazada', 'TikTok Shop', 'Facebook', 'Google'];
function TabReviewReply() {
  const [form, setForm] = useState({ review: '', product: '', rating: '5', channel: 'Shopee', brand: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const teal = '#14b8a6';
  const sentColor = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' };
  const sentLabel = { positive: '😊 เชิงบวก', neutral: '😐 กลางๆ', negative: '😞 เชิงลบ' };

  const run = async () => {
    if (!form.review.trim()) { setError('กรุณาวางข้อความรีวิวของลูกค้า'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/review-reply'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, brand: form.brand || 'ร้านเรา' }) });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'เกิดข้อผิดพลาด'); else setResult(d);
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: teal, marginBottom: 16 }}>⭐ ตอบรีวิวลูกค้าอย่างมืออาชีพ</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelSt}>รีวิวลูกค้า *</label><textarea style={{ ...inputSt, minHeight: 90, resize: 'vertical' }} placeholder="วางข้อความรีวิวของลูกค้าที่นี่..." value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 12 }}>
            <div><label style={labelSt}>ช่องทาง</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                {REVIEW_CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelSt}>คะแนน</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
                {['5', '4', '3', '2', '1'].map(r => <option key={r} value={r}>{r} ดาว</option>)}
              </select>
            </div>
            <div><label style={labelSt}>สินค้า (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น น้ำพริกเผา" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
          </div>
          <div><label style={labelSt}>ชื่อร้าน/แบรนด์ (ไม่บังคับ)</label><input style={inputSt} placeholder="เช่น แม่อรุณ" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${teal},#0d9488)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังร่างคำตอบ...' : '⭐ ร่างคำตอบรีวิว'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card({ borderTop: `3px solid ${sentColor[result.sentiment] || teal}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: sentColor[result.sentiment] || teal }}>{sentLabel[result.sentiment] || result.sentiment}</span>
              <SourceBadge source={result.source} />
            </div>
            {result.summary && <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.summary}</div>}
            {result.issues?.length > 0 && <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{result.issues.map((s, i) => <span key={i} style={{ fontSize: 12, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 16, padding: '3px 9px' }}>⚠️ {s}</span>)}</div>}
          </div>

          {result.reply && (
            <div style={card({ borderTop: `3px solid ${teal}` })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: teal }}>💬 คำตอบพร้อมโพสต์</span>
                <CopyBtn text={result.reply} />
              </div>
              <div style={{ background: '#f0fdfa', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.reply}</div>
            </div>
          )}

          {result.reply_variants?.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 8 }}>🔁 คำตอบทางเลือก</div>
              {result.reply_variants.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{t}</span>
                  <CopyBtn text={t} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            {result.action_items?.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 8 }}>✅ สิ่งที่ร้านควรทำต่อ</div>
                {result.action_items.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}
              </div>
            )}
            {result.tips?.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 13, color: teal, marginBottom: 8 }}>💡 เคล็ดลับ</div>
                {result.tips.map((t, i) => <div key={i} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>• {t}</div>)}
              </div>
            )}
          </div>

          {result.upsell && <div style={card({ background: 'rgba(20,184,166,0.04)', borderColor: 'rgba(20,184,166,0.2)' })}><div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488', marginBottom: 4 }}>🛍️ ชวนซื้อซ้ำ</div><div style={{ fontSize: 13, color: '#475569' }}>{result.upsell}</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Generic JSON renderer — แสดงผลลัพธ์ JSON ของทักษะใดก็ได้ให้อ่านง่าย ──────────
function JsonView({ data, depth = 0 }) {
  if (data == null) return null;
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>{String(data)}</span>;
  }
  if (Array.isArray(data)) {
    return (
      <div style={{ display: 'grid', gap: 6 }}>
        {data.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>•</span>
            <div style={{ flex: 1 }}><JsonView data={v} depth={depth + 1} /></div>
          </div>
        ))}
      </div>
    );
  }
  // object
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={depth === 0 ? card({ padding: 14 }) : {}}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', marginBottom: 4, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
          <JsonView data={v} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

// ─── Generic Skill Runner — สร้างฟอร์มจาก registry.inputs แล้วยิงเข้า endpoint อัตโนมัติ ──
// ทักษะใหม่ที่เพิ่มใน backend registry จะใช้งานได้ทันทีโดยไม่ต้องเขียน UI เฉพาะ
function GenericSkillRunner({ skill }) {
  const { showToast } = useToast();
  const inputs = skill.inputs?.length ? skill.inputs : ['product'];
  const [form, setForm] = useState(() => Object.fromEntries(inputs.map(k => [k, ''])));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const color = '#6366f1';

  const run = async () => {
    const required = inputs[0];
    if (!String(form[required] || '').trim()) { showToast(`กรุณากรอก ${required}`, 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch(apiUrl(skill.endpoint), { method: skill.method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) showToast(d.error || 'เกิดข้อผิดพลาด', 'error'); else setResult(d);
    } catch { showToast('ไม่สามารถเชื่อมต่อได้', 'error'); }
    setLoading(false);
  };

  const { success, source, ...rest } = result || {};
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card()}>
        <div style={{ fontSize: 15, fontWeight: 800, color, marginBottom: 4 }}>✨ {skill.name}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{skill.method} {skill.endpoint} · ฟอร์มสร้างอัตโนมัติจาก Skills Registry</div>
        <div style={{ display: 'grid', gap: 12 }}>
          {inputs.map((field, i) => (
            <div key={field}>
              <label style={labelSt}>{field.replace(/_/g, ' ')}{i === 0 ? ' *' : ''}</label>
              <input style={inputSt} placeholder={`ใส่ ${field}`} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <button style={{ ...btnSt, background: loading ? '#94a3b8' : `linear-gradient(135deg,${color},#8b5cf6)` }} onClick={run} disabled={loading}>
            {loading ? '⏳ กำลังประมวลผล...' : `✨ รัน ${skill.name}`}
          </button>
        </div>
      </div>
      {result && (
        <div style={{ display: 'grid', gap: 12 }}>
          {source && <div><SourceBadge source={source} /></div>}
          <JsonView data={rest} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TAB_COMPONENTS = {
  learning: TabLearningLayer, trend: TabTrend, hashtag: TabHashtag, seo: TabSEO,
  sentiment: TabSentiment, video: TabVideoScript, translate: TabTranslate,
  prompt: TabPromptBuilder, wisdom: TabCulturalWisdom, supplychain: TabSupplyChain,
  pricing: TabPricing, cs: TabCustomerService, adbudget: TabAdBudget, breakeven: TabBreakEven, campaign: TabCampaignCalendar, live: TabLiveScript, omni: TabOmniSolver, negotiation: TabNegotiation, mediation: TabMediation, crisis: TabCrisis, persona: TabPersona, listing: TabListing, review: TabReviewReply,
};
// ทักษะที่มีหน้าเฉพาะของตัวเอง — ไม่ต้องสร้าง tab อัตโนมัติในนี้
const HUB_EXCLUDE = new Set(['/api/skills/promo-engine']);
const GENERIC_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export default function AISkillsPage() {
  const navigate = useNavigate();
  const [registry, setRegistry] = useState(null);
  // deep-link: /skills?skill=S20 หรือ /skills?tab=pricing → เปิดแท็บนั้นเลย
  const [tab, setTab] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const bySkill = TABS.find(t => t.skill === (q.get('skill') || '').toUpperCase());
    return q.get('tab') || bySkill?.id || 'trend';
  });

  // ดึง Skills Registry — เพิ่มทักษะใหม่ใน backend แล้ว tab โผล่เองโดยไม่ต้องแก้ frontend
  useEffect(() => {
    fetch(apiUrl('/api/skills')).then(r => r.json()).then(d => { if (d.success) setRegistry(d); }).catch(() => {});
  }, []);

  // รวม curated tabs (UI เฉพาะ) + auto tabs จาก registry ที่ยังไม่มี UI
  const statusByEndpoint = React.useMemo(() => Object.fromEntries((registry?.skills || []).map(s => [s.endpoint, s])), [registry]);
  const tabs = React.useMemo(() => {
    const curated = TABS.map(t => ({ ...t, reg: statusByEndpoint[t.endpoint] }));
    const coveredEndpoints = new Set(TABS.map(t => t.endpoint));
    const autoTabs = (registry?.skills || [])
      .filter(s => s.endpoint.startsWith('/api/skills/') && s.method === 'POST' && s.inputs?.length && !coveredEndpoints.has(s.endpoint) && !HUB_EXCLUDE.has(s.endpoint))
      .map((s, i) => ({ id: `gen:${s.id}`, icon: '✨', label: s.name, color: GENERIC_COLORS[i % GENERIC_COLORS.length], skill: s.id, endpoint: s.endpoint, reg: s, generic: s }));
    return [...curated, ...autoTabs];
  }, [registry, statusByEndpoint]);

  // ⭐ โปรด + 🕐 ใช้ล่าสุด — ซิงค์ข้ามอุปกรณ์ผ่าน Cloud Sync
  const [favs, setFavs] = useState(() => getPref('fav_skills', []));
  const [recent, setRecent] = useState(() => getPref('recent_skills', []));
  const [q, setQ] = useState(''); // ค้นหาแท็บ (30+ ทักษะ)
  const activeRef = React.useRef(null);
  // รับการอัปเดตจากอุปกรณ์อื่น
  useEffect(() => {
    const onSync = () => { setFavs(getPref('fav_skills', [])); setRecent(getPref('recent_skills', [])); };
    window.addEventListener('otai:sync', onSync);
    return () => window.removeEventListener('otai:sync', onSync);
  }, []);

  const selectTab = (id) => {
    setTab(id);
    const t = tabs.find(x => x.id === id);
    if (t?.skill) {
      const next = [t.skill, ...recent.filter(s => s !== t.skill)].slice(0, 6);
      setRecent(next); syncSetPref('recent_skills', next);
    }
  };
  const toggleFav = (skillId) => {
    if (!skillId) return;
    const next = favs.includes(skillId) ? favs.filter(s => s !== skillId) : [skillId, ...favs].slice(0, 12);
    setFavs(next); syncSetPref('fav_skills', next);
  };
  const tabBySkill = (sid) => tabs.find(t => t.skill === sid);

  const activeTab = tabs.find(t => t.id === tab) || tabs[0];
  const Custom = activeTab && TAB_COMPONENTS[activeTab.id];
  const needsKey = activeTab?.reg?.status === 'needs_key';
  const isFav = favs.includes(activeTab?.skill);
  const shownTabs = q.trim() ? tabs.filter(t => (t.label + ' ' + (t.skill || '')).toLowerCase().includes(q.toLowerCase())) : tabs;
  // เลื่อนแท็บที่เลือกเข้าจออัตโนมัติ (optimize นำทางใน 30+ แท็บ)
  useEffect(() => { activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }, [tab]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Sticky Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b' }}>🧠 AI Skills Hub</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>S9–S29 · Content · Trend · SEO · Supply Chain · Pricing · Ad Budget · Omni-Solver · Negotiation · Crisis · ฯลฯ</div>
        </div>
        <button onClick={() => navigate('/skills-catalog')} style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 8, padding: '7px 14px', color: '#0ea5e9', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📚 Catalog</button>
        <button onClick={() => navigate('/ai-generator')} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⚡ AI Generator</button>
      </header>

      {/* Quick access — ⭐ โปรด + 🕐 ใช้ล่าสุด (ซิงค์ข้ามอุปกรณ์) */}
      {(favs.length > 0 || recent.length > 0) && (
        <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.04)', padding: '8px 5%', display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center', WebkitOverflowScrolling: 'touch' }}>
          {favs.filter(tabBySkill).length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>⭐</span>}
          {favs.map(sid => { const t = tabBySkill(sid); return t ? (
            <button key={'f' + sid} onClick={() => selectTab(t.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: `1px solid ${t.color}55`, background: `${t.color}12`, color: t.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.icon} {t.label}</button>
          ) : null; })}
          {recent.filter(s => !favs.includes(s) && tabBySkill(s)).length > 0 && <span style={{ fontSize: 12, color: '#cbd5e1', flexShrink: 0, marginLeft: favs.length ? 6 : 0 }}>🕐</span>}
          {recent.filter(s => !favs.includes(s)).map(sid => { const t = tabBySkill(sid); return t ? (
            <button key={'r' + sid} onClick={() => selectTab(t.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', background: '#f8fafc', color: '#64748b', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.icon} {t.label}</button>
          ) : null; })}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 2%', display: 'flex', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
        {shownTabs.map(t => (
          <button key={t.id} ref={tab === t.id ? activeRef : null} onClick={() => selectTab(t.id)}
            style={{ padding: '12px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? t.color : 'transparent'}`, color: tab === t.id ? t.color : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all .2s', scrollSnapAlign: 'start', minHeight: 44 }}>
            {t.icon} <span className="section-tab-label">{t.label}</span>
            {t.reg?.status === 'needs_key' && <span title="ต้องตั้งค่า API key" style={{ marginLeft: 3 }}>⚠️</span>}
            <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7, background: tab === t.id ? t.color : 'transparent', color: tab === t.id ? '#fff' : 'transparent', borderRadius: 6, padding: '1px 4px' }}>{t.skill}</span>
          </button>
        ))}
        {shownTabs.length === 0 && <span style={{ padding: '12px', fontSize: 12, color: '#94a3b8' }}>ไม่พบทักษะที่ตรงกับ "{q}"</span>}
      </div>

      {/* Skill Description Banner */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.04)', padding: '10px 5%' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{activeTab?.icon}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: activeTab?.color }}>{activeTab?.label}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{activeTab?.skill}</span>
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 ค้นหาทักษะ..."
            style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#1e293b', outline: 'none', width: 130 }} />
          {activeTab?.skill && (
            <button onClick={() => toggleFav(activeTab.skill)} title={isFav ? 'เอาออกจากโปรด' : 'เพิ่มเป็นโปรด (ซิงค์ทุกอุปกรณ์)'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, opacity: isFav ? 1 : 0.35 }}>{isFav ? '⭐' : '☆'}</button>
          )}
          {registry && <span style={{ fontSize: 10, color: '#cbd5e1' }}>{registry.active}/{registry.total} skills · {registry.ai_engine}</span>}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 5% 0' }}>
        {needsKey && (
          <div style={{ ...card({ borderLeft: '4px solid #f59e0b' }), marginBottom: 16, fontSize: 13, color: '#92400e', background: 'rgba(245,158,11,0.06)' }}>
            ⚠️ ทักษะนี้ต้องตั้งค่า <strong>{activeTab.reg.requires}</strong> ก่อนจึงจะใช้งานได้เต็มรูปแบบ
          </div>
        )}
        {Custom ? <Custom /> : activeTab?.generic ? <GenericSkillRunner skill={activeTab.generic} /> : null}
      </div>
    </div>
  );
}
