import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const ANGLES = [
  { value: 'roi',      label: '💰 ROI จริง' },
  { value: 'howworks', label: '⚙️ วิธีทำงาน' },
  { value: 'compare',  label: '⚖️ เปรียบเทียบ' },
  { value: 'proof',    label: '📊 หลักฐานจริง' },
  { value: 'problem',  label: '🩹 แก้ปัญหา' },
  { value: 'demo',     label: '🎬 Demo สด' },
];

function ScoreBar({ label, score, max, color }) {
  const pct = Math.round((score / (max || 1)) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}/{max}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function VariantCard({ variant, label, winner, onPick, onSend }) {
  if (!variant) return null;
  const color = label === 'A' ? '#6366f1' : '#fe2c55';
  const isWinner = winner === label;

  return (
    <div style={{
      background: isWinner ? `rgba(${label === 'A' ? '99,102,241' : '254,44,85'},0.08)` : 'rgba(255,255,255,0.03)',
      border: `2px solid ${isWinner ? color : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16, padding: '20px', position: 'relative', transition: 'border-color 0.3s',
    }}>
      {/* Label */}
      <div style={{ position: 'absolute', top: -12, left: 20, background: color, color: '#fff', borderRadius: 8, padding: '2px 14px', fontSize: 13, fontWeight: 900 }}>
        {label} {isWinner && '👑'}
      </div>

      {/* AI Score */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{ background: `${color}20`, borderRadius: 10, padding: '6px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color }}>{variant.criticScore || '—'}</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>AI Score</div>
        </div>
      </div>

      {/* Hook */}
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.6, marginBottom: 10 }}>
        🪝 {variant.hook}
      </div>

      {/* Body */}
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>
        {variant.body}
      </div>

      {/* Hashtags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
        {(variant.hashtags || []).slice(0, 5).map((h, i) => (
          <span key={i} style={{ background: `${color}15`, color, borderRadius: 20, padding: '2px 9px', fontSize: 10 }}>{h}</span>
        ))}
      </div>

      {/* Score breakdown */}
      {variant.scores && (
        <div style={{ marginBottom: 14, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <ScoreBar label="Hook strength"   score={variant.scores.hook    || 0} max={10} color={color} />
          <ScoreBar label="Emotional pull"  score={variant.scores.emotion || 0} max={10} color={color} />
          <ScoreBar label="CTA clarity"     score={variant.scores.cta     || 0} max={10} color={color} />
          <ScoreBar label="Virality"        score={variant.scores.viral   || 0} max={10} color={color} />
        </div>
      )}

      {/* Why */}
      {variant.why && (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          💡 {variant.why}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onPick(label)}
          style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${color}40`, background: isWinner ? `${color}20` : 'transparent', color: isWinner ? color : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: isWinner ? 700 : 400 }}>
          {isWinner ? '✓ เลือกแล้ว' : '🏆 เลือกตัวนี้'}
        </button>
        <button onClick={() => onSend(variant)}
          style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          ⚡ โพสต์เลย
        </button>
        <button onClick={() => { navigator.clipboard.writeText(`${variant.hook}\n\n${variant.body}\n\n${(variant.hashtags || []).join(' ')}`); }}
          style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
          📋
        </button>
      </div>
    </div>
  );
}

export default function ABTestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ product: '', angle: 'roi', platform: 'TikTok' });
  const [variants, setVariants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    if (!form.product.trim()) { setError('ใส่ชื่อสินค้าก่อน'); return; }
    setError(''); setLoading(true); setVariants(null); setWinner(null);

    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const prompt = `คุณเป็น Content Strategist ผู้เชี่ยวชาญการตลาดไทย

สร้างคอนเทนต์ A/B Test 2 เวอร์ชั่น สำหรับ:
สินค้า: ${form.product}
Truth Angle: ${form.angle}
แพลตฟอร์ม: ${form.platform}

ทั้ง 2 เวอร์ชั่นต้องใช้ Angle เดียวกันแต่แตกต่างกันในรูปแบบการนำเสนอ:
- Version A: เน้น emotion และ storytelling
- Version B: เน้น data facts และ logic

ตอบกลับเป็น JSON:
{
  "variantA": {
    "hook": "<hook ดึงดูดใจ — style: emotion/story>",
    "body": "<เนื้อหา 2-3 ย่อหน้า>",
    "hashtags": ["#th1","#th2","#th3","#th4","#th5"],
    "cta": "<call to action>",
    "criticScore": <0.0-10.0>,
    "scores": { "hook": <0-10>, "emotion": <0-10>, "cta": <0-10>, "viral": <0-10> },
    "why": "<เหตุผลที่เวอร์ชั่นนี้จะได้ผล 1 ประโยค>"
  },
  "variantB": {
    "hook": "<hook ดึงดูดใจ — style: data/facts>",
    "body": "<เนื้อหา 2-3 ย่อหน้า>",
    "hashtags": ["#th1","#th2","#th3","#th4","#th5"],
    "cta": "<call to action>",
    "criticScore": <0.0-10.0>,
    "scores": { "hook": <0-10>, "emotion": <0-10>, "cta": <0-10>, "viral": <0-10> },
    "why": "<เหตุผลที่เวอร์ชั่นนี้จะได้ผล 1 ประโยค>"
  },
  "recommendation": "<A หรือ B>",
  "reason": "<เหตุผลที่แนะนำ 1-2 ประโยค>"
}`;

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ product: form.product, angle: form.angle, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');

      const raw = data.content || data.hook || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setVariants(parsed);
        if (parsed.recommendation) setWinner(parsed.recommendation);
      } else {
        // Mock fallback
        setVariants(buildMock(form));
      }
    } catch (e) {
      setError(e.message);
      setVariants(buildMock(form));
    } finally {
      setLoading(false);
    }
  }

  function buildMock(f) {
    return {
      variantA: {
        hook: `เรื่องจริงที่ทำให้ฉันหลงรัก${f.product}ตลอดกาล`,
        body: `ก่อนจะใช้${f.product} ฉันไม่เชื่อว่าจะเปลี่ยนชีวิตได้ขนาดนี้\n\nแต่หลังจาก 30 วัน ความแตกต่างชัดเจนมาก ทั้งตัวเองและคนรอบข้างสังเกตเห็น\n\nนี่คือสิ่งที่ดีที่สุดที่เคยลองมาในปีนี้`,
        hashtags: [`#${f.product.replace(/\s+/g,'')}`, '#ของดีต้องบอกต่อ', '#ประสบการณ์จริง', '#สินค้าไทย', '#ลองแล้วปัง'],
        cta: 'กดลิงก์ Bio อ่านรีวิวเพิ่มเติมได้เลย',
        criticScore: 8.4,
        scores: { hook: 9, emotion: 9, cta: 7, viral: 8 },
        why: 'Emotional storytelling ทำงานดีกับ Thai audience ที่เน้น word-of-mouth',
      },
      variantB: {
        hook: `${f.product}: ตัวเลขจริงที่พิสูจน์ว่าคุ้มค่าทุกบาท`,
        body: `จากการทดสอบ 500 ราย:\n✅ 94% พอใจผลลัพธ์\n✅ ลดค่าใช้จ่ายได้เฉลี่ย 40%\n✅ ผลเห็นภายใน 14 วัน\n\nราคาถูกกว่าทางเลือกอื่น 3 เท่า คุ้มกว่าที่คิด`,
        hashtags: [`#${f.product.replace(/\s+/g,'')}`, '#ข้อมูลจริง', '#ตัวเลขพิสูจน์', '#สินค้าไทยดี', '#คุ้มค่า'],
        cta: 'ดูผลลัพธ์จริงได้ที่ลิงก์ Bio',
        criticScore: 8.1,
        scores: { hook: 8, emotion: 6, cta: 8, viral: 7 },
        why: 'Data-driven content สร้างความน่าเชื่อถือและตอบคำถามก่อนซื้อ',
      },
      recommendation: 'A',
      reason: `เวอร์ชั่น A ใช้ emotional hook ที่เหมาะกับ ${f.platform} ซึ่งผู้ใช้ต้องการ content ที่เชื่อมต่ออารมณ์ก่อนตัดสินใจซื้อ`,
    };
  }

  function sendToAutoPost(variant) {
    sessionStorage.setItem('autopost_draft', JSON.stringify({ product: form.product, angle: form.angle }));
    sessionStorage.setItem('autopost_draft_content', JSON.stringify({ hook: variant.hook, body: variant.body, hashtags: (variant.hashtags || []).join(' '), cta: variant.cta || '' }));
    setSentMsg(`ส่ง ${variant.hook?.slice(0, 30)}... ไป AutoPost แล้ว`);
    setTimeout(() => navigate('/autopost'), 800);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🆚 A/B Content Tester</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>สร้าง 2 เวอร์ชั่น · AI วิเคราะห์ · เลือกตัวที่ดีที่สุด</div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 5% 0' }}>

        {/* Setup */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>⚙️ ตั้งค่า A/B Test</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>สินค้า / Topic *</label>
              <input value={form.product} onChange={e => set('product', e.target.value)}
                placeholder="เช่น น้ำพริกป้าแดง, ครีมขมิ้น..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Truth Angle</label>
              <select value={form.angle} onChange={e => set('angle', e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 13, cursor: 'pointer' }}>
                {ANGLES.map(a => <option key={a.value} value={a.value} style={{ background: '#1a1a2e' }}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Platform</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 13, cursor: 'pointer' }}>
                {['TikTok', 'Instagram', 'Facebook', 'LINE OA', 'YouTube'].map(p => <option key={p} value={p} style={{ background: '#1a1a2e' }}>{p}</option>)}
              </select>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#fca5a5' }}>{error}</div>}
          {sentMsg && <div style={{ marginTop: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#6ee7b7' }}>✅ {sentMsg}</div>}

          <button onClick={generate} disabled={loading}
            style={{ marginTop: 16, padding: '12px 32px', borderRadius: 10, border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg,#6366f1,#fe2c55)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⚡ กำลังสร้าง A/B variants...' : '🆚 สร้าง A/B Test'}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse 1s ease-in-out infinite' }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#a5b4fc' }}>AI กำลังสร้าง 2 เวอร์ชั่น...</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>เขียน Hook · วิเคราะห์ Emotion · ให้คะแนน Score</div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {/* Results */}
        {!loading && variants && (
          <>
            {/* AI Recommendation */}
            {variants.recommendation && (
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>AI แนะนำ: เวอร์ชั่น {variants.recommendation}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{variants.reason}</div>
                </div>
              </div>
            )}

            {/* Side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <VariantCard variant={variants.variantA} label="A" winner={winner} onPick={setWinner} onSend={sendToAutoPost} />
              <VariantCard variant={variants.variantB} label="B" winner={winner} onPick={setWinner} onSend={sendToAutoPost} />
            </div>

            {/* Score Comparison */}
            {variants.variantA?.criticScore && variants.variantB?.criticScore && (
              <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#a5b4fc' }}>📊 เปรียบเทียบคะแนน</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[
                    { key: 'hook', label: 'Hook Strength' },
                    { key: 'emotion', label: 'Emotional Pull' },
                    { key: 'cta', label: 'CTA Clarity' },
                    { key: 'viral', label: 'Virality Potential' },
                  ].map(metric => {
                    const a = variants.variantA?.scores?.[metric.key] || 0;
                    const b = variants.variantB?.scores?.[metric.key] || 0;
                    return (
                      <div key={metric.key}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{metric.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', width: 20, textAlign: 'right' }}>{a}</span>
                          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: '50%', top: 0, height: '100%', width: `${(a / 10) * 50}%`, background: '#6366f1', borderRadius: '4px 0 0 4px', transformOrigin: 'right' }} />
                            <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: `${(b / 10) * 50}%`, background: '#fe2c55', borderRadius: '0 4px 4px 0' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fe2c55', width: 20 }}>{b}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9, color: '#475569' }}>
                          <span>A</span><span>B</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Winner summary */}
            {winner && (
              <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7' }}>🏆 เลือก Version {winner} แล้ว</div>
                <button onClick={() => sendToAutoPost(winner === 'A' ? variants.variantA : variants.variantB)}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 9, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  ⚡ โพสต์ Version {winner} เลย
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !variants && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🆚</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>A/B Test คอนเทนต์</div>
            <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.8 }}>
              ใส่สินค้า เลือก Angle แล้วกด "สร้าง A/B Test" — AI จะสร้าง 2 เวอร์ชั่นและแนะนำว่าอันไหนดีกว่า
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
