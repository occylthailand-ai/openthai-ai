import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';
import { useToast } from '../components/ToastContext';

// ── Smart API router: n8n webhook → backend /api/generate → mock ─────────────
const N8N_WEBHOOK = 'http://localhost:5678/webhook/openthai-generate';
const BACKEND_API  = '/api/generate';

async function generateContent(form) {
  // 1️⃣ ลอง n8n webhook ก่อน (ถ้า Gemini API key ตั้งแล้ว)
  try {
    const r = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.hook) return data; // n8n ตอบกลับ valid
    }
  } catch (_) { /* n8n ไม่ได้รัน หรือ key ยังว่าง — fallback ต่อ */ }

  // 2️⃣ fallback → backend express /api/generate (Gemini หรือ mock)
  const res = await fetch(BACKEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'ทั่วไป'];
const STYLES = [
  { id: 'educational', label: '🎓 Educational', desc: 'สอน / บอกเล่าข้อมูล' },
  { id: 'entertainment', label: '🎭 Entertainment', desc: 'สนุก / ฮา / เทรนด์' },
  { id: 'sales', label: '💰 Sales', desc: 'ขายตรง / ปิดการขาย' },
];
const PLATFORMS = ['TikTok', 'Facebook', 'Instagram Reels', 'YouTube Shorts', 'LINE'];
const LANGS = ['ภาษาไทย', 'English', 'ไทย + อังกฤษ'];

const ScoreRing = ({ score }) => {
  const pct = (parseFloat(score) / 10) * 100;
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#fe2c55';
  return (
    <div className="gen-score-ring" style={{ '--score-color': color }}>
      <svg viewBox="0 0 36 36" width="80" height="80">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${pct} 100`} strokeLinecap="round"
          transform="rotate(-90 18 18)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
      </svg>
      <div className="gen-score-text">
        <span style={{ color }}>{score}</span>
        <small>/10</small>
      </div>
    </div>
  );
};

const AIGeneratorPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    product: '', category: 'OTOP', style: 'sales',
    platform: 'TikTok', lang: 'ภาษาไทย', price: '', audience: 'ทั่วไป',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { document.title = 'AI Content Generator — OpenThai AI'; }, []);

  const handleGenerate = async () => {
    if (!form.product.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await generateContent(form);
      setResult(data);
      setHistory(prev => [{ product: form.product, platform: form.platform, score: data.criticScore, ts: new Date() }, ...prev.slice(0, 4)]);
      const score = parseFloat(data.criticScore);
      toast.success(`✨ สร้างสำเร็จ! AI Critic Score: ${data.criticScore}/10${score >= 9 ? ' 🔥 ยอดเยี่ยม!' : score >= 7 ? ' 👍 ดีมาก!' : ''}`);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('📋 คัดลอกแล้ว!');
    }).catch(() => {
      toast.error('ไม่สามารถคัดลอกได้ กรุณาเลือกข้อความเอง');
    });
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyBtn = ({ text, label, id }) => (
    <button className={`gen-copy-btn ${copied === id ? 'copied' : ''}`} onClick={() => copy(text, id)}>
      {copied === id ? '✅ คัดลอกแล้ว' : `📋 ${label}`}
    </button>
  );

  return (
    <div className="gen-app">
      {/* Header */}
      <header className="gen-header">
        <button className="gen-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="gen-header-center">
          <LogoEmblem size="sm" />
          <div>
            <div className="gen-title">AI Content Generator</div>
            <div className="gen-subtitle">สร้างคอนเทนต์ระดับมืออาชีพด้วย AI · รองรับทุกแพลตฟอร์ม</div>
          </div>
        </div>
        <div className="gen-ai-indicator">
          <span className="gen-ai-dot" />
          Claude AI · Online
        </div>
      </header>

      <div className="gen-layout">
        {/* ── LEFT: Form ── */}
        <div className="gen-form-panel glass-panel">
          <div className="gen-form-title">📝 ข้อมูลสินค้า</div>

          <div className="gen-field">
            <label>ชื่อสินค้า <span className="gen-required">*</span></label>
            <input className="gen-input" placeholder="เช่น ผ้าไหมมัดหมี่อุบลราชธานี"
              value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>

          <div className="gen-field-row">
            <div className="gen-field">
              <label>หมวดหมู่</label>
              <select className="gen-select" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="gen-field">
              <label>ราคา (ไม่บังคับ)</label>
              <input className="gen-input" placeholder="฿590" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
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
                <button key={p} className={`gen-platform-btn ${form.platform === p ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, platform: p }))}>
                  {p}
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
                  onClick={() => setForm(f => ({ ...f, lang: l }))}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button className="gen-generate-btn" onClick={handleGenerate} disabled={loading || !form.product.trim()}>
            {loading
              ? <><span className="gen-spinner">⚡</span> AI กำลังสร้าง...</>
              : '⚡ สร้างคอนเทนต์ AI'}
          </button>

          {/* History */}
          {history.length > 0 && (
            <div className="gen-history">
              <div className="gen-history-title">🕐 สร้างล่าสุด</div>
              {history.map((h, i) => (
                <div key={i} className="gen-history-item">
                  <span>{h.product}</span>
                  <span style={{ color: '#94a3b8' }}>{h.platform}</span>
                  <span className="gen-score-mini">{h.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Result ── */}
        <div className="gen-result-panel">
          {!result && !loading && (
            <div className="gen-empty-state glass-panel">
              <LogoEmblem size="lg" />
              <h3>พร้อมสร้างคอนเทนต์</h3>
              <p>กรอกชื่อสินค้าและกด <strong>⚡ สร้างคอนเทนต์ AI</strong></p>
              <div className="gen-feature-list">
                {['Hook ดึงดูดใจ 5 แบบ', 'Script วิดีโอทีละขั้น', 'Caption พร้อมใช้', '10 Hashtag เทรนด์', 'AI Critic Score 0–10'].map((f, i) => (
                  <div key={i} className="gen-feature-item">✅ {f}</div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="gen-loading-state glass-panel">
              <div className="gen-loading-logo"><LogoEmblem size="md" /></div>
              <div className="gen-loading-text">AI กำลังวิเคราะห์สินค้า...</div>
              <div className="gen-loading-steps">
                {['วิเคราะห์หมวดหมู่', 'สร้าง Hook', 'เขียน Script', 'ปรับ Caption', 'ให้คะแนน AI Critic'].map((s, i) => (
                  <div key={i} className="gen-loading-step">
                    <div className="gen-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="gen-results">
              {/* Score */}
              <div className="gen-score-card glass-panel">
                <div>
                  <div className="gen-result-product">{form.product}</div>
                  <div className="gen-result-meta">{form.platform} · {form.category} · {form.style}</div>
                  <div className="gen-critic-label">AI Critic Score</div>
                </div>
                <ScoreRing score={result.criticScore} />
              </div>

              {/* Hook */}
              <div className="gen-result-block glass-panel">
                <div className="gen-block-header">
                  <span className="gen-block-icon">🎣</span>
                  <span className="gen-block-title">Hook — ประโยคเปิด</span>
                  <CopyBtn text={result.hook} label="คัดลอก" id="hook" />
                </div>
                <div className="gen-hook-text">"{result.hook}"</div>
              </div>

              {/* Script */}
              <div className="gen-result-block glass-panel">
                <div className="gen-block-header">
                  <span className="gen-block-icon">🎬</span>
                  <span className="gen-block-title">Script — บทวิดีโอ</span>
                  <CopyBtn text={result.script.join('\n')} label="คัดลอก" id="script" />
                </div>
                <ol className="gen-script-list">
                  {result.script.map((line, i) => <li key={i}>{line}</li>)}
                </ol>
              </div>

              {/* Caption */}
              <div className="gen-result-block glass-panel">
                <div className="gen-block-header">
                  <span className="gen-block-icon">📝</span>
                  <span className="gen-block-title">Caption — คำบรรยาย</span>
                  <CopyBtn text={result.caption} label="คัดลอก" id="caption" />
                </div>
                <pre className="gen-caption-text">{result.caption}</pre>
              </div>

              {/* Hashtags */}
              <div className="gen-result-block glass-panel">
                <div className="gen-block-header">
                  <span className="gen-block-icon">#️⃣</span>
                  <span className="gen-block-title">Hashtags</span>
                  <CopyBtn text={result.hashtags.join(' ')} label="คัดลอกทั้งหมด" id="tags" />
                </div>
                <div className="gen-hashtag-wrap">
                  {result.hashtags.map((tag, i) => (
                    <span key={i} className="gen-hashtag-chip" onClick={() => copy(tag, `tag${i}`)}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Copy All */}
              <button className="gen-copy-all-btn" onClick={() =>
                copy(`${result.hook}\n\n${result.script.join('\n')}\n\n${result.caption}\n\n${result.hashtags.join(' ')}`, 'all')}>
                {copied === 'all' ? '✅ คัดลอกทั้งหมดแล้ว!' : '📋 คัดลอกทุกอย่างในครั้งเดียว'}
              </button>

              {/* Regenerate */}
              <button className="gen-regen-btn" onClick={handleGenerate}>
                🔄 สร้างใหม่อีกครั้ง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorPage;
