import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';
import { useToast } from '../components/ToastContext';
import { apiUrl, fetchWithTimeout } from '../apiBase';

// ── Constants ─────────────────────────────────────────────────────────────────
// n8n webhook: ใช้ได้เฉพาะ local dev (localhost) — production จะ fallback ไป BACKEND_API อัตโนมัติ
const N8N_WEBHOOK    = import.meta.env.DEV ? 'http://localhost:5678/webhook/openthai-generate' : '';
const BACKEND_API    = () => apiUrl('/api/generate');
const AB_API         = () => apiUrl('/api/generate-ab');
const ANALYZE_API    = () => apiUrl('/api/analyze-image');
const COMPETITOR_API = () => apiUrl('/api/competitor-analyze');
const NEWS_API       = () => apiUrl('/api/news-rag');
const TTS_API        = () => apiUrl('/api/tts');
const HISTORY_KEY    = 'openthai_history';
const BRAND_KEY      = 'openthai_brand';

const GEN_TABS = [
  { id: 'generate',   icon: '⚡', label: 'สร้างคอนเทนต์' },
  { id: 'competitor', icon: '🕵️', label: 'Competitor AI' },
  { id: 'news',       icon: '📰', label: 'News & Ideas' },
];

const CATEGORIES = ['OTOP','อาหาร','ความงาม','สิ่งทอ','เครื่องดื่ม','สมุนไพร','เครื่องประดับ','เฟอร์นิเจอร์','ทั่วไป'];
const STYLES     = [
  { id: 'educational',   label: '🎓 Educational', desc: 'สอน / บอกเล่าข้อมูล' },
  { id: 'entertainment', label: '🎭 Entertainment', desc: 'สนุก / ฮา / เทรนด์' },
  { id: 'sales',         label: '💰 Sales',        desc: 'ขายตรง / ปิดการขาย' },
];
// DIR-009: Hephaestus — เพิ่ม platform icons + char limits
const PLATFORMS = [
  { id: 'TikTok',          icon: '🎵', label: 'TikTok',       charLimit: 150  },
  { id: 'Facebook',        icon: '📘', label: 'Facebook',     charLimit: 500  },
  { id: 'Shopee',          icon: '🛒', label: 'Shopee',       charLimit: 120  },
  { id: 'Lazada',          icon: '🛍️', label: 'Lazada',       charLimit: 120  },
  { id: 'Instagram Reels', icon: '📸', label: 'Instagram',    charLimit: 150  },
  { id: 'LINE',            icon: '💬', label: 'LINE OA',      charLimit: 1000 },
];
const LANGS     = ['ภาษาไทย','English','ไทย + อังกฤษ'];

// ── API helpers ───────────────────────────────────────────────────────────────
async function generateContent(form) {
  // ลอง n8n webhook ก่อน (เฉพาะ local dev — ถ้า N8N_WEBHOOK ว่างข้ามไป BACKEND_API เลย)
  if (N8N_WEBHOOK) {
    try {
      const r = await fetch(N8N_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form), signal: AbortSignal.timeout(8000) });
      if (r.ok) { const d = await r.json(); if (d.hook) return d; }
    } catch (_) {}
  }
  const res = await fetchWithTimeout(BACKEND_API(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }, 30000);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function generateAB(form) {
  const res = await fetchWithTimeout(AB_API(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }, 30000);
  if (!res.ok) throw new Error(`AB API error ${res.status}`);
  return res.json();
}

// ── TTS helper — ElevenLabs → Browser fallback ───────────────────────────────
let ttsActive = false;
let ttsAudio  = null;

async function speak(text) {
  // หยุดถ้ากำลังเล่นอยู่
  if (ttsActive) {
    if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    ttsActive = false;
    return;
  }
  ttsActive = true;
  // 1️⃣ ลอง ElevenLabs API ก่อน
  try {
    const res = await fetchWithTimeout(TTS_API(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500) }),
    }, 8000);
    if (res.ok && res.headers.get('content-type')?.includes('audio')) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      ttsAudio   = new Audio(url);
      ttsAudio.onended = () => { ttsActive = false; URL.revokeObjectURL(url); };
      ttsAudio.play();
      return;
    }
  } catch (_) {}
  // 2️⃣ Fallback → Web Speech API (ไทย)
  if (!window.speechSynthesis) { ttsActive = false; return; }
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'th-TH';
  utt.rate  = 0.95;
  utt.onend = utt.onerror = () => { ttsActive = false; };
  window.speechSynthesis.speak(utt);
}

// ── History helpers ───────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))); }

// ── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const pct = (parseFloat(score) / 10) * 100;
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#fe2c55';
  return (
    <div className="gen-score-ring" style={{ '--score-color': color }}>
      <svg viewBox="0 0 36 36" width="80" height="80">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${pct} 100`} strokeLinecap="round" transform="rotate(-90 18 18)"
          style={{ transition: 'stroke-dasharray 1s ease' }}/>
      </svg>
      <div className="gen-score-text"><span style={{ color }}>{score}</span><small>/10</small></div>
    </div>
  );
};

// ── Result Panel ──────────────────────────────────────────────────────────────
// DIR-009: Hephaestus — เพิ่ม char count + platform limit indicator
const PLATFORM_LIMITS = { TikTok: 150, Facebook: 500, Shopee: 120, Lazada: 120, 'Instagram Reels': 150, LINE: 1000 };

function ResultPanel({ result, product, formMeta, onCopy, copied, label, platform }) {
  const charLimit = PLATFORM_LIMITS[platform] || 500;
  const captionLen = (result.caption || '').length;
  const captionOk  = captionLen <= charLimit;

  const CopyBtn = ({ text, id }) => (
    <button className={`gen-copy-btn ${copied === id ? 'copied' : ''}`} onClick={() => onCopy(text, id)}>
      {copied === id ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
    </button>
  );
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <div style={{ textAlign: 'center', marginBottom: 10, padding: '6px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#a5b4fc', display: 'inline-block' }}>{label}</div>}
      <div className="gen-results">
        <div className="gen-score-card glass-panel">
          <div>
            <div className="gen-result-product">{product}</div>
            <div className="gen-result-meta">{formMeta}</div>
            <div className="gen-critic-label">AI Critic Score</div>
          </div>
          <ScoreRing score={result.criticScore} />
        </div>
        <div className="gen-result-block glass-panel">
          <div className="gen-block-header">
            <span className="gen-block-icon">🎣</span>
            <span className="gen-block-title">Hook</span>
            <CopyBtn text={result.hook} id={`${label}hook`} />
            <button onClick={() => speak(result.hook)} title="ฟังเสียง" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 10px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>🔊 ฟัง</button>
          </div>
          <div className="gen-hook-text">"{result.hook}"</div>
        </div>
        <div className="gen-result-block glass-panel">
          <div className="gen-block-header">
            <span className="gen-block-icon">🎬</span>
            <span className="gen-block-title">Script</span>
            <CopyBtn text={result.script.join('\n')} id={`${label}script`} />
            <button onClick={() => speak(result.script.join(' '))} title="ฟังเสียง" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 10px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>🔊 ฟัง</button>
          </div>
          <ol className="gen-script-list">{result.script.map((line, i) => <li key={i}>{line}</li>)}</ol>
        </div>
        <div className="gen-result-block glass-panel">
          <div className="gen-block-header">
            <span className="gen-block-icon">📝</span>
            <span className="gen-block-title">Caption</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: captionOk ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.15)', color: captionOk ? '#6ee7b7' : '#f87171', border: `1px solid ${captionOk ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, fontWeight: 700 }}>
              {captionLen}/{charLimit} {captionOk ? '✓' : '⚠️'}
            </span>
            <CopyBtn text={result.caption} id={`${label}caption`} />
          </div>
          <pre className="gen-caption-text">{result.caption}</pre>
        </div>
        <div className="gen-result-block glass-panel">
          <div className="gen-block-header">
            <span className="gen-block-icon">#️⃣</span>
            <span className="gen-block-title">Hashtags</span>
            <CopyBtn text={result.hashtags.join(' ')} id={`${label}tags`} />
          </div>
          <div className="gen-hashtag-wrap">
            {result.hashtags.map((tag, i) => (
              <span key={i} className="gen-hashtag-chip" onClick={() => onCopy(tag, `tag${label}${i}`)}>{tag}</span>
            ))}
          </div>
        </div>
        <button className="gen-copy-all-btn" onClick={() => onCopy(`${result.hook}\n\n${result.script.join('\n')}\n\n${result.caption}\n\n${result.hashtags.join(' ')}`, `${label}all`)}>
          {copied === `${label}all` ? '✅ คัดลอกทั้งหมดแล้ว!' : '📋 คัดลอกทุกอย่างในครั้งเดียว'}
        </button>
      </div>
    </div>
  );
}

// ── Competitor Analysis Tab ───────────────────────────────────────────────────
const COMP_PLATFORMS = ['TikTok','Facebook','Instagram','YouTube','LINE'];
const DIFF_COLORS    = { 'ง่าย':'#10b981', 'กลาง':'#f59e0b', 'ยาก':'#ef4444' };

function CompetitorTab({ toast, onUseIdea }) {
  const [form, setForm]       = useState({ niche: '', competitor: '', platform: 'TikTok' });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputSt = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 13px', color:'#f8fafc', fontSize:13, boxSizing:'border-box', outline:'none', fontFamily:"inherit" };
  const labelSt = { display:'block', fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 };

  const analyze = async () => {
    if (!form.niche.trim()) { toast.error('กรุณาใส่ niche / หมวดสินค้า'); return; }
    setLoading(true); setResult(null);
    try {
      const d = await fetchWithTimeout(COMPETITOR_API(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }, 20000).then(r => r.json());
      if (d.error) throw new Error(d.error);
      setResult(d);
      toast.success('✅ วิเคราะห์คู่แข่งสำเร็จ!');
    } catch (e) { toast.error('วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่'); }
    setLoading(false);
  };

  const Card = ({ title, children }) => (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:16, marginBottom:12 }}>
      <div style={{ fontWeight:800, fontSize:13, marginBottom:10, color:'#e2e8f0' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="gen-layout">
      {/* Form */}
      <div className="gen-form-panel glass-panel">
        <div className="gen-form-title">🕵️ วิเคราะห์คู่แข่ง</div>
        <div className="gen-field">
          <label style={labelSt}>Niche / หมวดสินค้า *</label>
          <input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่, น้ำพริก, เซรั่มสมุนไพร" value={form.niche} onChange={s('niche')} onKeyDown={e => e.key==='Enter'&&analyze()} />
        </div>
        <div className="gen-field" style={{ marginTop:14 }}>
          <label style={labelSt}>คู่แข่ง (ไม่บังคับ)</label>
          <input style={inputSt} placeholder="เช่น ชื่อร้าน หรือ @username" value={form.competitor} onChange={s('competitor')} />
        </div>
        <div className="gen-field" style={{ marginTop:14 }}>
          <label style={labelSt}>แพลตฟอร์ม</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {COMP_PLATFORMS.map(p => (
              <button key={p} onClick={() => setForm(f=>({...f,platform:p}))}
                style={{ borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', border:`1.5px solid ${form.platform===p?'#6366f1':'rgba(255,255,255,0.1)'}`, background:form.platform===p?'rgba(99,102,241,0.2)':'transparent', color:form.platform===p?'#a5b4fc':'#64748b' }}>{p}</button>
            ))}
          </div>
        </div>
        <button className="gen-generate-btn" style={{ marginTop:20 }} onClick={analyze} disabled={loading||!form.niche.trim()}>
          {loading ? <><span className="gen-spinner">🕵️</span> กำลังวิเคราะห์...</> : '🕵️ วิเคราะห์คู่แข่ง AI'}
        </button>
        <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
          <strong style={{ color:'#a5b4fc' }}>ใช้ทำอะไร?</strong><br/>
          วิเคราะห์กลยุทธ์คอนเทนต์ของคู่แข่ง หา <em>content gap</em> ที่ยังไม่มีใครทำ และรับ Hook ที่ปังในนิชของคุณ
        </div>
      </div>

      {/* Results */}
      <div className="gen-result-panel">
        {!result && !loading && (
          <div className="gen-empty-state glass-panel">
            <div style={{ fontSize:52 }}>🕵️</div>
            <h3>Competitor Intelligence</h3>
            <p>AI วิเคราะห์คู่แข่งและหาช่องว่างที่คุณโดดเด่นได้</p>
            <div className="gen-feature-list">
              {['📊 ภาพรวมตลาด', '⚔️ กลยุทธ์คู่แข่ง', '🕳 Content Gap', '🎣 Winning Hooks', '🎯 มุมมองแนะนำ', '⏰ เวลาโพสต์ดีที่สุด'].map((f,i)=>(
                <div key={i} className="gen-feature-item">✅ {f}</div>
              ))}
            </div>
          </div>
        )}
        {loading && (
          <div className="gen-loading-state glass-panel">
            <div style={{ fontSize:48 }}>🕵️</div>
            <div className="gen-loading-text">AI กำลังวิเคราะห์คู่แข่งใน {form.platform}...</div>
            <div className="gen-loading-steps">
              {['สแกนตลาด','วิเคราะห์กลยุทธ์','หา Content Gap','สร้าง Hook','แนะนำมุมมอง'].map((s,i)=>(
                <div key={i} className="gen-loading-step"><div className="gen-loading-dot" style={{ animationDelay:`${i*0.25}s`}} />{s}</div>
              ))}
            </div>
          </div>
        )}
        {result && !loading && (
          <div style={{ display:'grid', gap:12 }}>
            <Card title="📊 ภาพรวมนิช">
              <p style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.7, margin:0 }}>{result.niche_overview}</p>
            </Card>
            {result.competitor_tactics?.length > 0 && (
              <Card title="⚔️ กลยุทธ์ที่คู่แข่งใช้">
                {result.competitor_tactics.map((t,i) => <div key={i} style={{ fontSize:13, color:'#e2e8f0', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>• {t}</div>)}
              </Card>
            )}
            {result.content_gaps?.length > 0 && (
              <Card title="🕳 Content Gap — ช่องว่างที่ยังไม่มีใครทำ">
                {result.content_gaps.map((g,i) => <div key={i} style={{ fontSize:13, color:'#6ee7b7', padding:'5px 0' }}>✅ {g}</div>)}
              </Card>
            )}
            {result.winning_hooks?.length > 0 && (
              <Card title="🎣 Winning Hooks สำหรับนิชนี้">
                {result.winning_hooks.map((h,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:'#a5b4fc', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <span>"{h}"</span>
                    <button onClick={() => onUseIdea(h)} style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:6, padding:'4px 10px', color:'#a5b4fc', cursor:'pointer', fontSize:11, flexShrink:0, marginLeft:8 }}>ใช้ Hook นี้</button>
                  </div>
                ))}
              </Card>
            )}
            {result.recommended_angles?.length > 0 && (
              <Card title="🎯 มุมมองแนะนำ">
                {result.recommended_angles.map((a,i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,0.02)', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{a.angle}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${DIFF_COLORS[a.difficulty]||'#64748b'}20`, color:DIFF_COLORS[a.difficulty]||'#64748b', border:`1px solid ${DIFF_COLORS[a.difficulty]||'#64748b'}40` }}>{a.difficulty}</span>
                    </div>
                    <div style={{ fontSize:12, color:'#64748b' }}>{a.reason}</div>
                  </div>
                ))}
              </Card>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {result.best_post_times && <Card title="⏰ เวลาโพสต์ดีที่สุด"><p style={{ fontSize:13, color:'#fcd34d', margin:0 }}>{result.best_post_times}</p></Card>}
              {result.differentiation && <Card title="⭐ วิธีโดดเด่นกว่าคู่แข่ง"><p style={{ fontSize:13, color:'#6ee7b7', margin:0 }}>{result.differentiation}</p></Card>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── News RAG Tab ──────────────────────────────────────────────────────────────
function NewsRagTab({ toast, onIdeaSelect }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showToast = false) => {
    if (showToast) setRefreshing(true); else setLoading(true);
    try {
      const d = await fetchWithTimeout(NEWS_API(), {}, 12000).then(r => r.json());
      setData(d);
      if (showToast) toast.success('✅ โหลดข่าวล่าสุดแล้ว!');
    } catch (_) { toast.error('โหลด News ไม่สำเร็จ'); }
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const IdeaCard = ({ idea }) => (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'#e2e8f0', marginBottom:4 }}>{idea.idea}</div>
          <div style={{ fontSize:11, padding:'2px 8px', display:'inline-block', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, color:'#a5b4fc' }}>{idea.category}</div>
        </div>
        <button onClick={() => onIdeaSelect(idea.idea, idea.category)}
          style={{ background:'linear-gradient(135deg,#fe2c55,#6366f1)', border:'none', borderRadius:8, padding:'7px 14px', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, whiteSpace:'nowrap' }}>
          ⚡ สร้างเลย
        </button>
      </div>
      <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>💡 {idea.angle}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800 }}>📰 News & Ideas</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>ข่าวและเทรนด์ไทยวันนี้ → Content Ideas พร้อมใช้</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {data && <div style={{ fontSize:11, color:'#475569' }}>Source: {data.source} · {data.ts ? new Date(data.ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}) : ''}</div>}
          <button onClick={() => load(true)} disabled={refreshing}
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 14px', color:'#94a3b8', cursor:'pointer', fontSize:12, opacity:refreshing?.6:1 }}>
            {refreshing ? '⏳' : '🔄 รีเฟรช'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>⏳ โหลดข่าวล่าสุด...</div>
      ) : !data ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#f87171' }}>โหลดไม่สำเร็จ</div>
      ) : (
        <div style={{ display:'grid', gap:20 }}>
          {/* Headlines */}
          {data.headlines?.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:12, color:'#e2e8f0' }}>📡 Headline ข่าวไทยวันนี้</div>
              <div style={{ display:'grid', gap:7 }}>
                {data.headlines.map((h,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#cbd5e1', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize:11, color:'#475569', flexShrink:0 }}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{ flex:1 }}>{h}</span>
                    <button onClick={() => onIdeaSelect(h, 'ทั่วไป')}
                      style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:6, padding:'3px 9px', color:'#a5b4fc', cursor:'pointer', fontSize:11, flexShrink:0 }}>
                      ⚡
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Ideas */}
          {data.content_ideas?.length > 0 && (
            <div>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:12, color:'#e2e8f0' }}>💡 Content Ideas พร้อมสร้างทันที</div>
              <div style={{ display:'grid', gap:10 }}>
                {data.content_ideas.map((idea, i) => <IdeaCard key={i} idea={idea} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const AIGeneratorPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);

  const [genTab, setGenTab]     = useState('generate'); // generate | competitor | news
  const [form, setForm] = useState({
    product: '', category: 'OTOP', style: 'sales',
    platform: 'TikTok', lang: 'ภาษาไทย', price: '', audience: 'ทั่วไป',
  });
  const [result, setResult]     = useState(null);
  const [abResult, setAbResult] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [abMode, setAbMode]     = useState(false);
  const [copied, setCopied]     = useState('');
  const [history, setHistory]   = useState(loadHistory);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [quota, setQuota] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // ใช้ idea จาก Competitor/News → กรอก form + สลับ tab
  const handleUseIdea = (productOrHook, category = 'ทั่วไป') => {
    setForm(f => ({ ...f, product: productOrHook, category }));
    setGenTab('generate');
    toast.info(`💡 โหลด "${productOrHook}" เข้า form แล้ว`);
  };

  useEffect(() => { document.title = 'AI Content Generator — OpenThai AI'; }, []);

  useEffect(() => {
    fetch('/api/usage/status').then(r => r.json()).then(setQuota).catch(() => {});
  }, []);

  // Auto-load brand memory
  useEffect(() => {
    try {
      const brand = JSON.parse(localStorage.getItem(BRAND_KEY) || 'null');
      if (brand && !brandLoaded) {
        setForm(f => ({
          ...f,
          category: brand.category || f.category,
          audience: brand.audience || f.audience,
          lang: brand.lang || f.lang,
        }));
        setBrandLoaded(true);
        if (brand.brandName) toast.info(`🧠 โหลด Brand Memory: ${brand.brandName} แล้ว`);
      }
    } catch (_) {}
  }, []);

  const handleGenerate = async () => {
    if (!form.product.trim()) return;
    setLoading(true); setResult(null); setAbResult(null);
    try {
      if (abMode) {
        const ab = await generateAB(form);
        setAbResult(ab);
        const scoreA = parseFloat(ab.a?.criticScore || 0);
        const scoreB = parseFloat(ab.b?.criticScore || 0);
        toast.success(`🆚 A/B สร้างสำเร็จ! แบบ A: ${ab.a?.criticScore} · แบบ B: ${ab.b?.criticScore}`);
        pushHistory(ab.a);
      } else {
        const data = await generateContent(form);
        setResult(data);
        const score = parseFloat(data.criticScore);
        toast.success(`✨ สร้างสำเร็จ! Score: ${data.criticScore}/10${score >= 9 ? ' 🔥' : score >= 7 ? ' 👍' : ''}`);
        pushHistory(data);
      }
    } catch (err) {
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setShowUpgrade(true);
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setLoading(false);
      fetch('/api/usage/status').then(r => r.json()).then(setQuota).catch(() => {});
    }
  };

  const pushHistory = (data) => {
    const entry = { id: Date.now(), product: form.product, platform: form.platform, category: form.category, style: form.style, score: data?.criticScore, hook: data?.hook, ts: new Date().toISOString() };
    setHistory(prev => { const updated = [entry, ...prev.slice(0, 19)]; saveHistory(updated); return updated; });
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => toast.success('📋 คัดลอกแล้ว!')).catch(() => toast.error('คัดลอกไม่สำเร็จ'));
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  // Image upload handler
  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกิน 4MB'); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setImgPreview(dataUrl);
      setImgLoading(true);
      try {
        const base64 = dataUrl.split(',')[1];
        const res = await fetchWithTimeout(ANALYZE_API(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType: file.type }),
        }, 20000);
        const data = await res.json();
        if (data.success) {
          setForm(f => ({
            ...f,
            product:  data.product || f.product,
            category: data.category || f.category,
            audience: data.audience || f.audience,
          }));
          toast.success(`📷 AI วิเคราะห์แล้ว: "${data.product}"`);
        } else {
          toast.warn('วิเคราะห์ภาพไม่สำเร็จ กรอกชื่อสินค้าเอง');
        }
      } catch (_) {
        toast.warn('ไม่สามารถวิเคราะห์ภาพได้ กรอกเองได้เลย');
      } finally {
        setImgLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadFromHistory = (h) => {
    setForm(f => ({ ...f, product: h.product, platform: h.platform, category: h.category, style: h.style }));
    setShowHistory(false);
    toast.info(`📂 โหลด "${h.product}" จากประวัติแล้ว`);
  };

  return (
    <div className="gen-app">
      {/* Header */}
      <header className="gen-header">
        <button className="gen-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="gen-header-center">
          <LogoEmblem size="sm" />
          <div>
            <div className="gen-title">AI Content Generator</div>
            <div className="gen-subtitle">สร้างคอนเทนต์ระดับมืออาชีพ · รองรับทุกแพลตฟอร์ม</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navigate('/brand')} title="Brand Memory" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 12px', color: '#c4b5fd', cursor: 'pointer', fontSize: 12 }}>🧠 Brand</button>
          <button onClick={() => navigate('/trending')} title="Trending" style={{ background: 'rgba(254,44,85,0.12)', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 8, padding: '6px 12px', color: '#fda4af', cursor: 'pointer', fontSize: 12 }}>🔥 Trend</button>
          <button onClick={() => navigate('/agent')} title="AI Agent" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 12px', color: '#6ee7b7', cursor: 'pointer', fontSize: 12 }}>🦾 Agent</button>
          <div className="gen-ai-indicator"><span className="gen-ai-dot" />Claude AI · Online</div>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <div style={{ background:'rgba(8,8,18,0.9)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:2, padding:'0 24px', overflowX:'auto' }}>
        {GEN_TABS.map(t => (
          <button key={t.id} onClick={() => setGenTab(t.id)}
            style={{ padding:'12px 18px', background:'none', border:'none', borderBottom:`2px solid ${genTab===t.id?'#6366f1':'transparent'}`, color:genTab===t.id?'#a5b4fc':'#475569', cursor:'pointer', fontSize:13, fontWeight:genTab===t.id?700:400, whiteSpace:'nowrap', transition:'all .2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {genTab === 'competitor' && (
        <div style={{ padding:'24px 0' }}>
          <CompetitorTab toast={toast} onUseIdea={handleUseIdea} />
        </div>
      )}
      {genTab === 'news' && (
        <div style={{ padding:'24px max(5%,16px)' }}>
          <NewsRagTab toast={toast} onIdeaSelect={handleUseIdea} />
        </div>
      )}

      {genTab === 'generate' && <div className="gen-layout">
        {/* ── LEFT: Form ── */}
        <div className="gen-form-panel glass-panel">
          <div className="gen-form-title">📝 ข้อมูลสินค้า</div>

          {/* Image Upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              📷 อัพโหลดรูปสินค้า (AI วิเคราะห์อัตโนมัติ)
            </div>
            <div onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: imgPreview ? 0 : '20px', textAlign: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'border-color .2s', background: 'rgba(255,255,255,0.02)' }}>
              {imgLoading ? (
                <div style={{ padding: 20, color: '#a5b4fc', fontSize: 13 }}>⏳ AI กำลังวิเคราะห์รูป...</div>
              ) : imgPreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={imgPreview} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />
                  <button onClick={e => { e.stopPropagation(); setImgPreview(null); }}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <div style={{ color: '#475569', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                  คลิกหรือลากรูปสินค้ามาวางที่นี่<br/>
                  <span style={{ fontSize: 11 }}>AI จะวิเคราะห์และกรอกชื่อให้อัตโนมัติ</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) handleImageFile(f); e.target.value = ''; }} />
          </div>

          <div className="gen-field">
            <label>ชื่อสินค้า <span className="gen-required">*</span></label>
            <input className="gen-input" placeholder="เช่น ผ้าไหมมัดหมี่อุบลราชธานี"
              value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>

          <div className="gen-field-row">
            <div className="gen-field">
              <label>หมวดหมู่</label>
              <select className="gen-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="gen-field">
              <label>ราคา (ไม่บังคับ)</label>
              <input className="gen-input" placeholder="฿590" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          </div>

          <div className="gen-field">
            <label>กลุ่มเป้าหมาย</label>
            <input className="gen-input" placeholder="เช่น แม่บ้าน, นักศึกษา, คนรักสุขภาพ"
              value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} />
          </div>

          <div className="gen-field">
            <label>แพลตฟอร์ม</label>
            <div className="gen-platform-btns">
              {PLATFORMS.map(p => (
                <button key={p.id} className={`gen-platform-btn ${form.platform === p.id ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, platform: p.id }))}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gen-field">
            <label>สไตล์คอนเทนต์</label>
            <div className="gen-style-cards">
              {STYLES.map(s => (
                <div key={s.id} className={`gen-style-card ${form.style === s.id ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, style: s.id }))}>
                  <div className="gen-style-label">{s.label}</div>
                  <div className="gen-style-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="gen-field">
            <label>ภาษาคอนเทนต์</label>
            <div className="gen-lang-btns">
              {LANGS.map(l => (
                <button key={l} className={`gen-lang-btn ${form.lang === l ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, lang: l }))}>{l}</button>
              ))}
            </div>
          </div>

          {/* A/B Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 14px', background: abMode ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${abMode ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, cursor: 'pointer' }}
            onClick={() => setAbMode(m => !m)}>
            <div style={{ width: 36, height: 20, background: abMode ? '#6366f1' : 'rgba(255,255,255,0.1)', borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: abMode ? 18 : 2, transition: 'left .2s' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: abMode ? '#a5b4fc' : '#94a3b8' }}>🆚 A/B Testing</div>
              <div style={{ fontSize: 11, color: '#475569' }}>สร้าง 2 แบบพร้อมกัน เปรียบเทียบผล</div>
            </div>
          </div>

          {/* Quota bar */}
          {quota && quota.plan === 'free' && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: quota.remaining === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.06)', border: `1px solid ${quota.remaining === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>วันนี้ใช้ไป {quota.dailyCount}/{quota.dailyLimit} ครั้ง</span>
                <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>อัปเกรด →</button>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                <div style={{ height: 4, borderRadius: 99, background: quota.remaining === 0 ? '#ef4444' : '#6366f1', width: `${Math.min(100, (quota.dailyCount / quota.dailyLimit) * 100)}%`, transition: 'width .4s' }} />
              </div>
              {quota.remaining === 0 && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>ครบโควต้าวันนี้ — ซื้อเครดิตหรืออัปเกรดเพื่อใช้ต่อ</div>
              )}
              {(quota.credits || 0) > 0 && (
                <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>⚡ เครดิตคงเหลือ: {quota.credits} ครั้ง</div>
              )}
            </div>
          )}

          <button className="gen-generate-btn" onClick={handleGenerate} disabled={loading || !form.product.trim()}>
            {loading ? <><span className="gen-spinner">⚡</span> AI กำลังสร้าง...</>
              : abMode ? '🆚 สร้าง A/B 2 แบบ' : '⚡ สร้างคอนเทนต์ AI'}
          </button>

          {/* History toggle */}
          {history.length > 0 && (
            <div className="gen-history">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="gen-history-title">🕐 ประวัติล่าสุด ({history.length})</div>
                <button onClick={() => setShowHistory(s => !s)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12 }}>
                  {showHistory ? 'ซ่อน' : 'ดูทั้งหมด'}
                </button>
              </div>
              {(showHistory ? history : history.slice(0, 5)).map((h, i) => (
                <div key={h.id || i} className="gen-history-item" onClick={() => loadFromHistory(h)} style={{ cursor: 'pointer' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{h.product}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{h.platform}</span>
                  <span className="gen-score-mini">{h.score}</span>
                </div>
              ))}
              <button onClick={() => { setHistory([]); saveHistory([]); toast.warn('ล้างประวัติแล้ว'); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, marginTop: 4 }}>
                🗑 ล้างประวัติ
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Result ── */}
        <div className="gen-result-panel">
          {!result && !abResult && !loading && (
            <div className="gen-empty-state glass-panel">
              <LogoEmblem size="lg" />
              <h3>พร้อมสร้างคอนเทนต์</h3>
              <p>กรอกชื่อสินค้าหรือ<strong>อัพโหลดรูปสินค้า</strong> แล้วกด ⚡ สร้าง</p>
              <div className="gen-feature-list">
                {['📷 วิเคราะห์รูปสินค้า AI', '🆚 A/B Testing 2 แบบ', '🔊 ฟังเสียง TTS ไทย', '🧠 จำข้อมูลแบรนด์', '🔥 Trending Hashtags', 'Hook + Script + Caption + Tags'].map((f, i) => (
                  <div key={i} className="gen-feature-item">✅ {f}</div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="gen-loading-state glass-panel">
              <div className="gen-loading-logo"><LogoEmblem size="md" /></div>
              <div className="gen-loading-text">{abMode ? 'AI กำลังสร้าง 2 แบบพร้อมกัน...' : 'AI กำลังวิเคราะห์สินค้า...'}</div>
              <div className="gen-loading-steps">
                {['วิเคราะห์หมวดหมู่', 'สร้าง Hook', 'เขียน Script', 'ปรับ Caption', 'ให้คะแนน AI Critic'].map((s, i) => (
                  <div key={i} className="gen-loading-step">
                    <div className="gen-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single result */}
          {result && !loading && (
            <>
              <ResultPanel result={result} product={form.product} formMeta={`${form.platform} · ${form.category} · ${form.style}`} onCopy={copy} copied={copied} label="" platform={form.platform} />
              <button className="gen-regen-btn" onClick={handleGenerate}>🔄 สร้างใหม่อีกครั้ง</button>
            </>
          )}

          {/* A/B result */}
          {abResult && !loading && (
            <>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <ResultPanel result={abResult.a} product={form.product} formMeta={`${form.platform} · สไตล์ A`} onCopy={copy} copied={copied} label="🅰️ แบบ A" platform={form.platform} />
                <ResultPanel result={abResult.b} product={form.product} formMeta={`${form.platform} · สไตล์ B`} onCopy={copy} copied={copied} label="🅱️ แบบ B" platform={form.platform} />
              </div>
              <button className="gen-regen-btn" style={{ marginTop: 16 }} onClick={handleGenerate}>🔄 สร้าง A/B ใหม่</button>
            </>
          )}
        </div>
      </div>
      }  {/* end genTab === 'generate' */}

      {/* Upgrade modal */}
      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#0f0f1a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⚡</div>
            <h3 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 8px', color: '#f8fafc' }}>ครบโควต้าวันนี้แล้ว</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Free tier ใช้ได้ 5 ครั้งต่อวัน<br />
              อัปเกรดหรือซื้อเครดิตเพิ่มเพื่อสร้างต่อ
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { navigate('/pricing'); setShowUpgrade(false); }}
                style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                🚀 อัปเกรด Pro ฿149/เดือน →
              </button>
              <button onClick={() => { navigate('/pricing#credits'); setShowUpgrade(false); }}
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ⚡ ซื้อเครดิต ฿49 ขึ้นไป
              </button>
              <button onClick={() => setShowUpgrade(false)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                ปิด — รอวันพรุ่งนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGeneratorPage;
