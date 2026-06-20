import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const NICHES = [
  { value: 'food',      label: '🍜 อาหาร/เครื่องดื่ม' },
  { value: 'beauty',    label: '💄 ความงาม/สกินแคร์' },
  { value: 'health',    label: '💊 สุขภาพ/อาหารเสริม' },
  { value: 'fashion',   label: '👗 แฟชั่น/เสื้อผ้า' },
  { value: 'otop',      label: '🏺 OTOP/หัตถกรรม' },
  { value: 'tech',      label: '📱 Technology' },
  { value: 'pet',       label: '🐾 สัตว์เลี้ยง' },
  { value: 'home',      label: '🏠 ของใช้ในบ้าน' },
  { value: 'education', label: '📚 การศึกษา/คอร์ส' },
  { value: 'service',   label: '🛠️ บริการ/ร้านค้า' },
];

const ANGLES = [
  { value: 'roi',      label: '💰 ROI จริง',       desc: 'คุ้มค่า ราคาเหมาะ ประหยัด' },
  { value: 'howworks', label: '⚙️ วิธีทำงาน',      desc: 'เบื้องหลัง กระบวนการ สูตร' },
  { value: 'compare',  label: '⚖️ เปรียบเทียบ',    desc: 'vs คู่แข่ง vs ไม่ใช้' },
  { value: 'proof',    label: '📊 หลักฐานจริง',    desc: 'ตัวเลข รีวิว รางวัล' },
  { value: 'problem',  label: '🩹 แก้ปัญหา',        desc: 'เข้าถึงปัญหาลูกค้า' },
  { value: 'demo',     label: '🎬 Demo สด',          desc: 'แสดงให้เห็นจริงๆ' },
  { value: 'story',    label: '📖 เล่าเรื่อง',       desc: 'Journey ผู้ใช้จริง' },
  { value: 'trend',    label: '🔥 เกาะกระแส',        desc: 'เทรนด์ ไวรัล ฮิต' },
];

const PLATFORM_OPTIONS = [
  { value: 'tiktok',    label: '🎵 TikTok' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'facebook',  label: '📘 Facebook' },
  { value: 'line',      label: '💚 LINE OA' },
  { value: 'youtube',   label: '▶️ YouTube' },
];

const IDEA_TYPES = [
  { value: 'viral',    label: '🔥 Viral Hook', desc: 'เปิดด้วยประโยคเด็ดดึงความสนใจ' },
  { value: 'series',   label: '📺 Series Plan', desc: 'วางแผน Content Series 5 ตอน' },
  { value: 'seasonal', label: '🗓️ เทศกาล/ซีซั่น', desc: 'โพสต์ที่เหมาะกับช่วงเวลา' },
  { value: 'ugc',      label: '👥 UGC Template', desc: 'เนื้อหาให้ลูกค้าแชร์ต่อ' },
  { value: 'collab',   label: '🤝 Collab Idea', desc: 'ไอเดีย Collaboration กับแบรนด์อื่น' },
];

function IdeaCard({ idea, onSend }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function copy() {
    const text = `${idea.hook}\n\n${idea.body}\n\n${(idea.hashtags || []).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const angleColors = {
    roi: '#10b981', howworks: '#6366f1', compare: '#f59e0b', proof: '#8b5cf6',
    problem: '#ef4444', demo: '#fe2c55', story: '#06b6d4', trend: '#f97316',
  };
  const c = angleColors[idea.angle] || '#6366f1';

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c}22`, borderRadius: 14, padding: '18px', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${c}55`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${c}22`}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: c, flexShrink: 0 }}>
          {idea.angleLabel || idea.angle}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#64748b', flexShrink: 0 }}>
          {idea.platform || 'All'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={copy}
            style={{ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 7, padding: '5px 10px', color: copied ? '#6ee7b7' : '#94a3b8', cursor: 'pointer', fontSize: 11 }}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          {onSend && (
            <button onClick={() => onSend(idea)}
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '5px 10px', color: '#a5b4fc', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              ⚡ โพสต์
            </button>
          )}
        </div>
      </div>

      {/* Hook */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8, lineHeight: 1.5 }}>
        🪝 {idea.hook}
      </div>

      {/* Body (collapsible) */}
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        {expanded ? idea.body : `${idea.body?.slice(0, 120)}${idea.body?.length > 120 ? '…' : ''}`}
        {idea.body?.length > 120 && (
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', color: c, cursor: 'pointer', fontSize: 11, marginLeft: 4 }}>
            {expanded ? 'ย่อ' : 'อ่านต่อ'}
          </button>
        )}
      </div>

      {/* Hashtags */}
      {idea.hashtags?.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {idea.hashtags.slice(0, 6).map((h, i) => (
            <span key={i} style={{ background: `${c}15`, borderRadius: 20, padding: '2px 8px', fontSize: 10, color: c }}>{h}</span>
          ))}
        </div>
      )}

      {/* CTA tip */}
      {idea.cta && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11, color: '#64748b' }}>
          🎯 CTA: {idea.cta}
        </div>
      )}
    </div>
  );
}

export default function ContentIdeasPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ product: '', niche: 'food', angles: ['roi', 'proof'], platforms: ['tiktok', 'instagram'], count: 8, ideaType: 'viral' });
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentToPost, setSentToPost] = useState(null);
  const cancelRef = useRef(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (key, val) => setForm(f => {
    const arr = f[key];
    return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });

  async function generate() {
    if (!form.product.trim()) { setError('ใส่ชื่อสินค้าก่อน'); return; }
    if (form.angles.length === 0) { setError('เลือก Truth Angle อย่างน้อย 1 มุม'); return; }
    setError(''); setLoading(true); setIdeas([]); cancelRef.current = false;

    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const prompt = `คุณเป็น Content Strategist ผู้เชี่ยวชาญด้านการตลาดไทย

สร้างไอเดียคอนเทนต์ ${form.count} ไอเดียสำหรับ:
สินค้า: ${form.product}
หมวด: ${NICHES.find(n => n.value === form.niche)?.label || form.niche}
แพลตฟอร์ม: ${form.platforms.join(', ')}
ประเภท: ${IDEA_TYPES.find(t => t.value === form.ideaType)?.label || form.ideaType}
Truth Angles ที่ต้องใช้: ${form.angles.join(', ')}

แต่ละไอเดียตอบกลับเป็น JSON array:
[
  {
    "angle": "<roi|howworks|compare|proof|problem|demo|story|trend>",
    "angleLabel": "<ชื่อ angle ภาษาไทย>",
    "platform": "<platform ที่เหมาะสม>",
    "hook": "<ประโยค hook ดึงดูดใจ ภาษาไทย 1-2 ประโยค>",
    "body": "<เนื้อหาหลัก 2-3 ย่อหน้า ภาษาไทย>",
    "hashtags": ["#thai1", "#thai2", "#thai3", "#thai4", "#thai5"],
    "cta": "<call to action ภาษาไทย>",
    "best_time": "<เช้า|กลางวัน|เย็น|ดึก>",
    "why": "<เหตุผลที่ไอเดียนี้จะได้ผลในตลาดไทย 1 ประโยค>"
  }
]

ตอบเฉพาะ JSON array เท่านั้น ไม่ต้องมี code block`;

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ product: form.product, angle: form.angles[0], prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสร้างไอเดียได้');

      const raw = data.content || data.hook || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          setIdeas(Array.isArray(parsed) ? parsed : []);
        } catch (_) {
          // Fallback: build mock ideas from angles
          setIdeas(buildMockIdeas(form));
        }
      } else {
        setIdeas(buildMockIdeas(form));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildMockIdeas(f) {
    const ANGLE_LABELS = { roi: 'ROI จริง', howworks: 'วิธีทำงาน', compare: 'เปรียบเทียบ', proof: 'หลักฐานจริง', problem: 'แก้ปัญหา', demo: 'Demo สด', story: 'เล่าเรื่อง', trend: 'เกาะกระแส' };
    const HOOKS = {
      roi:      `ซื้อ${f.product}แค่ครั้งเดียว คุ้มกว่าที่คิด 300%!`,
      howworks: `เคยสงสัยไหมว่า${f.product}ทำงานยังไง? เฉลยให้ฟัง`,
      compare:  `${f.product} vs สินค้าทั่วไป — ผลต่างคือ...`,
      proof:    `ลูกค้า 5,000 คนยืนยัน ${f.product} ดีจริง ไม่ใช่แค่โฆษณา`,
      problem:  `ถ้าคุณมีปัญหานี้อยู่ ${f.product} แก้ได้ใน 7 วัน`,
      demo:     `ดูก่อนตัดสินใจ — ทดสอบ${f.product}สดๆ ต่อหน้า`,
      story:    `จากลูกค้าที่ไม่เชื่อ สู่แฟนพันธุ์แท้ของ${f.product}`,
      trend:    `ทุกคนพูดถึง${f.product} — ลองดูสิว่าทำไม`,
    };
    return f.angles.flatMap((angle, ai) =>
      f.platforms.slice(0, Math.ceil(f.count / f.angles.length)).map((platform, pi) => ({
        angle,
        angleLabel: ANGLE_LABELS[angle] || angle,
        platform,
        hook: HOOKS[angle]?.replace(/สินค้า/g, f.product) || `${f.product} — ${ANGLE_LABELS[angle]}`,
        body: `เนื้อหาสำหรับ ${f.product} ในมุม "${ANGLE_LABELS[angle]}" บน ${platform}\n\nสร้างเนื้อหาที่พูดถึงจุดแข็งของสินค้าจากมุมมองนี้ เน้นประโยชน์ที่ลูกค้าจะได้รับ และเชิญชวนให้ลองใช้`,
        hashtags: [`#${f.product.replace(/\s+/g,'')}`, `#${f.niche}`, '#สินค้าไทย', '#OTOP', '#Openthai'],
        cta: 'กดลิงก์ใน Bio เพื่อสั่งซื้อเลยครับ',
        best_time: ['เช้า', 'กลางวัน', 'เย็น', 'ดึก'][(ai + pi) % 4],
        why: `มุมมอง "${ANGLE_LABELS[angle]}" ทำงานดีกับกลุ่มลูกค้าไทยที่ตัดสินใจซื้อจากความเชื่อมั่น`,
      }))
    ).slice(0, f.count);
  }

  function sendToAutoPost(idea) {
    sessionStorage.setItem('autopost_draft', JSON.stringify({
      product: form.product,
      angle: idea.angle,
    }));
    sessionStorage.setItem('autopost_draft_content', JSON.stringify({
      hook: idea.hook,
      body: idea.body,
      hashtags: (idea.hashtags || []).join(' '),
      cta: idea.cta || '',
      angle: idea.angle,
    }));
    setSentToPost(idea.hook?.slice(0, 40));
    setTimeout(() => navigate('/autopost'), 800);
  }

  const isGenerating = loading;

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>💡 Content Ideas Hub</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>AI สร้างไอเดียคอนเทนต์ · Truth Angle · หลายแพลตฟอร์ม</div>
        </div>
        {ideas.length > 0 && (
          <div style={{ fontSize: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 12px', color: '#a5b4fc' }}>
            {ideas.length} ไอเดีย พร้อมใช้
          </div>
        )}
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 5% 0', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* ── Settings Panel ─────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' }}>

            {/* Product */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>สินค้า / แบรนด์ *</div>
              <input value={form.product} onChange={e => set('product', e.target.value)}
                placeholder="เช่น น้ำพริกป้าแดง, ครีมขมิ้น..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
            </div>

            {/* Niche */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>หมวดสินค้า</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {NICHES.map(n => (
                  <button key={n.value} onClick={() => set('niche', n.value)}
                    style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid', borderColor: form.niche === n.value ? '#6366f1' : 'rgba(255,255,255,0.08)', background: form.niche === n.value ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.niche === n.value ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: 10, textAlign: 'left' }}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Truth Angles */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>Truth Angles (เลือกได้หลาย)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {ANGLES.map(a => (
                  <button key={a.value} onClick={() => toggleArr('angles', a.value)}
                    style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid', borderColor: form.angles.includes(a.value) ? '#10b981' : 'rgba(255,255,255,0.08)', background: form.angles.includes(a.value) ? 'rgba(16,185,129,0.18)' : 'transparent', color: form.angles.includes(a.value) ? '#6ee7b7' : '#64748b', cursor: 'pointer', fontSize: 10 }}
                    title={a.desc}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>แพลตฟอร์ม</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {PLATFORM_OPTIONS.map(p => (
                  <button key={p.value} onClick={() => toggleArr('platforms', p.value)}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid', borderColor: form.platforms.includes(p.value) ? '#f59e0b' : 'rgba(255,255,255,0.08)', background: form.platforms.includes(p.value) ? 'rgba(245,158,11,0.15)' : 'transparent', color: form.platforms.includes(p.value) ? '#fcd34d' : '#64748b', cursor: 'pointer', fontSize: 11 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Idea type */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>ประเภทไอเดีย</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {IDEA_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('ideaType', t.value)}
                    style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid', borderColor: form.ideaType === t.value ? '#8b5cf6' : 'rgba(255,255,255,0.08)', background: form.ideaType === t.value ? 'rgba(139,92,246,0.18)' : 'transparent', color: form.ideaType === t.value ? '#c4b5fd' : '#64748b', cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
                    <span style={{ fontWeight: 700 }}>{t.label}</span>
                    <span style={{ opacity: 0.6, marginLeft: 6 }}>— {t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>จำนวนไอเดีย: {form.count}</div>
              <input type="range" min="4" max="20" step="2" value={form.count} onChange={e => set('count', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}><span>4</span><span>20</span></div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</div>
            )}

            <button onClick={generate} disabled={isGenerating}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: isGenerating ? '#374151' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
              {isGenerating ? '✨ กำลังสร้างไอเดีย...' : `💡 สร้าง ${form.count} ไอเดีย`}
            </button>
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────────────────────── */}
        <div>
          {sentToPost && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#6ee7b7' }}>
              ✅ ส่งไป AutoPost แล้ว — "{sentToPost}…" กำลังพาไปหน้าโพสต์
            </div>
          )}

          {isGenerating && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse 1.2s ease-in-out infinite' }}>✨</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>AI กำลังคิดไอเดีย...</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>วิเคราะห์สินค้า · เลือก Angle · เขียน Hook · สร้าง Hashtag</div>
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
            </div>
          )}

          {!isGenerating && ideas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>💡</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#e2e8f0' }}>พร้อมสร้างไอเดียคอนเทนต์</div>
              <div style={{ fontSize: 13, color: '#64748b', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
                ใส่ชื่อสินค้า เลือก Truth Angle ที่ต้องการ กด "สร้างไอเดีย" — AI จะสร้าง Hook, Body, Hashtag พร้อมโพสต์ได้เลย
              </div>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {['น้ำพริกป้าแดง', 'ครีมขมิ้น', 'ผ้าไหมอุบล', 'กาแฟดอยช้าง'].map(s => (
                  <button key={s} onClick={() => set('product', s)}
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '6px 14px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isGenerating && ideas.length > 0 && (
            <>
              {/* Summary bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>✨ {ideas.length} ไอเดียพร้อมใช้</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>สำหรับ "{form.product}"</span>
                <button onClick={generate}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                  🔄 สร้างใหม่
                </button>
                <button onClick={() => navigate('/autopost')}
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '4px 10px', color: '#a5b4fc', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  ⚡ ไป AutoPost
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {ideas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} onSend={sendToAutoPost} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
