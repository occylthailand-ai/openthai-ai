import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const CATEGORIES = [
  { value: 'food',    label: '🍜 อาหาร' },
  { value: 'beauty',  label: '💄 ความงาม' },
  { value: 'health',  label: '💊 สุขภาพ' },
  { value: 'fashion', label: '👗 แฟชั่น' },
  { value: 'otop',    label: '🏺 OTOP' },
  { value: 'tech',    label: '📱 Tech' },
  { value: 'life',    label: '🏠 ไลฟ์สไตล์' },
  { value: 'pet',     label: '🐾 สัตว์เลี้ยง' },
];

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'LINE', 'YouTube'];

const TIER_COLORS = {
  mega:    '#ef4444',
  popular: '#f59e0b',
  mid:     '#10b981',
  niche:   '#6366f1',
};
const TIER_LABELS = { mega: 'Mega (1M+)', popular: 'Popular (100K+)', mid: 'Mid (10K+)', niche: 'Niche (<10K)' };

function HashtagChip({ tag, onCopy, onAdd, added }) {
  const c = TIER_COLORS[tag.tier] || '#6366f1';
  return (
    <div style={{ background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${c}60`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${c}30`}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{tag.tag}</div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
          {tag.volume} posts · {TIER_LABELS[tag.tier] || tag.tier}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={() => onCopy(tag.tag)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>📋</button>
        <button onClick={() => onAdd(tag.tag)} style={{ background: added ? 'rgba(16,185,129,0.2)' : `${c}20`, border: 'none', borderRadius: 6, padding: '4px 8px', color: added ? '#6ee7b7' : c, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
          {added ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}

export default function HashtagPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('food');
  const [platform, setPlatform] = useState('TikTok');
  const [tags, setTags] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [copied, setCopied] = useState('');

  async function research() {
    if (!keyword.trim()) { setError('ใส่ keyword ก่อน'); return; }
    setError(''); setLoading(true); setTags(null);

    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const prompt = `คุณเป็นผู้เชี่ยวชาญ Hashtag Research สำหรับตลาด Social Media ไทย

วิจัย Hashtag สำหรับ:
Keyword: ${keyword}
หมวด: ${category}
แพลตฟอร์ม: ${platform}

สร้าง Hashtag 30 อัน แบ่งเป็น 4 กลุ่ม:
- mega: hashtag ยักษ์ใหญ่ (>1M posts) — ใช้ได้ แต่แข่งสูง
- popular: hashtag ยอดนิยม (100K-1M) — สมดุลที่ดี
- mid: hashtag ขนาดกลาง (10K-100K) — โอกาสโดดเด่นสูง
- niche: hashtag เฉพาะกลุ่ม (<10K) — ถูก target มาก

ตอบกลับเป็น JSON:
{
  "hashtags": [
    { "tag": "#ชื่อhashtag", "tier": "mega|popular|mid|niche", "volume": "1.2M" },
    ...
  ],
  "recommended_combo": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5"],
  "tip": "<เทคนิค 1 ประโยค สำหรับ ${platform} ไทย>",
  "best_time": "<เวลาโพสต์ที่ดีที่สุดสำหรับ ${platform}>",
  "caution": "<hashtag ที่ควรหลีกเลี่ยง 1-2 อัน พร้อมเหตุผล>"
}`;

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ product: keyword, angle: 'howworks', prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');

      const raw = data.content || data.hook || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        setTags(JSON.parse(match[0]));
      } else {
        setTags(buildMock(keyword, category));
      }
    } catch (e) {
      setError(e.message);
      setTags(buildMock(keyword, category));
    } finally {
      setLoading(false);
    }
  }

  function buildMock(kw, cat) {
    const base = kw.replace(/\s+/g, '').toLowerCase();
    return {
      hashtags: [
        { tag: `#${base}`, tier: 'popular', volume: '450K' },
        { tag: `#${base}ไทย`, tier: 'mid', volume: '85K' },
        { tag: `#สินค้าไทย`, tier: 'mega', volume: '2.1M' },
        { tag: `#OTOP`, tier: 'mega', volume: '1.8M' },
        { tag: `#ของดีไทย`, tier: 'popular', volume: '320K' },
        { tag: `#${cat}ไทย`, tier: 'mid', volume: '62K' },
        { tag: `#รีวิว${base}`, tier: 'niche', volume: '8.2K' },
        { tag: `#${base}ดีจริง`, tier: 'niche', volume: '4.5K' },
        { tag: `#TikTokShop`, tier: 'mega', volume: '5M' },
        { tag: `#ของดีต้องบอกต่อ`, tier: 'popular', volume: '890K' },
        { tag: `#ลองแล้วปัง`, tier: 'popular', volume: '720K' },
        { tag: `#OpenThaiAi`, tier: 'niche', volume: '1.2K' },
        { tag: `#สินค้าOTOP`, tier: 'popular', volume: '180K' },
        { tag: `#${cat}คุณภาพ`, tier: 'niche', volume: '12K' },
        { tag: `#ProductReview`, tier: 'popular', volume: '240K' },
      ],
      recommended_combo: [`#${base}`, '#สินค้าไทย', '#ของดีต้องบอกต่อ', '#TikTokShop', `#${base}ดีจริง`],
      tip: `บน ${platform} ควรใช้ hashtag 3-7 อัน มากเกินไปทำให้ดูเป็น spam และลด reach`,
      best_time: 'TikTok ไทย: 19:00-22:00 น. วันจันทร์-พุธ มี engagement สูงสุด',
      caution: `#ขายดีสุด และ #ราคาถูก อาจโดน shadowban บน ${platform} เพราะมีโฆษณาเกินไป`,
    };
  }

  function copyTag(tag) {
    navigator.clipboard.writeText(tag);
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  }

  function toggleSelect(tag) {
    setSelected(s => s.includes(tag) ? s.filter(t => t !== tag) : [...s, tag]);
  }

  function copySelected() {
    navigator.clipboard.writeText(selected.join(' '));
    setCopied('all');
    setTimeout(() => setCopied(''), 1500);
  }

  function sendToAutoPost() {
    sessionStorage.setItem('autopost_hashtags', selected.join(' '));
    navigate('/autopost');
  }

  const grouped = tags?.hashtags ? {
    mega:    tags.hashtags.filter(t => t.tier === 'mega'),
    popular: tags.hashtags.filter(t => t.tier === 'popular'),
    mid:     tags.hashtags.filter(t => t.tier === 'mid'),
    niche:   tags.hashtags.filter(t => t.tier === 'niche'),
  } : {};

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}># Hashtag Research</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>วิจัย Hashtag ไทย · AI วิเคราะห์ · เลือกใช้ได้เลย</div>
        </div>
        {selected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#a5b4fc' }}>เลือก {selected.length} อัน</span>
            <button onClick={copySelected} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '5px 12px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>
              {copied === 'all' ? '✓ Copied!' : '📋 Copy ทั้งหมด'}
            </button>
            <button onClick={sendToAutoPost} style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ⚡ ใช้ใน AutoPost
            </button>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 5% 0' }}>

        {/* Search Panel */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Keyword / สินค้า *</label>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && research()}
                placeholder="เช่น น้ำพริก, ครีมขมิ้น, ผ้าไหม..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>หมวด</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 13 }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: '#1a1a2e' }}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', color: '#f1f5f9', fontSize: 13 }}>
                {PLATFORMS.map(p => <option key={p} value={p} style={{ background: '#1a1a2e' }}>{p}</option>)}
              </select>
            </div>
            <button onClick={research} disabled={loading}
              style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {loading ? '🔍 กำลังวิจัย...' : '🔍 วิจัย Hashtag'}
            </button>
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>⚠️ {error}</div>}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(99,102,241,0.05)', borderRadius: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12, animation: 'spin 1.5s linear infinite' }}>#</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc' }}>AI กำลังวิจัย Hashtag...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Results */}
        {!loading && tags && (
          <>
            {/* Tips banner */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '💡', title: 'เทคนิค', text: tags.tip },
                { icon: '⏰', title: 'เวลาที่ดีที่สุด', text: tags.best_time },
                { icon: '⚠️', title: 'ระวัง', text: tags.caution },
              ].map((t, i) => (
                <div key={i} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>{t.icon} {t.title}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{t.text}</div>
                </div>
              ))}
            </div>

            {/* Recommended combo */}
            {tags.recommended_combo?.length > 0 && (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6ee7b7', marginBottom: 8 }}>⭐ Combo ที่แนะนำ (คัดแล้ว)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {tags.recommended_combo.map((h, i) => (
                    <span key={i} style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{h}</span>
                  ))}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(tags.recommended_combo.join(' ')); setCopied('combo'); setTimeout(() => setCopied(''), 1500); }}
                  style={{ background: copied === 'combo' ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 7, padding: '5px 14px', color: '#6ee7b7', cursor: 'pointer', fontSize: 12 }}>
                  {copied === 'combo' ? '✓ Copied!' : '📋 Copy Combo'}
                </button>
              </div>
            )}

            {/* Hashtags by tier */}
            {Object.entries(grouped).map(([tier, items]) => items.length > 0 && (
              <div key={tier} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: TIER_COLORS[tier] }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: TIER_COLORS[tier] }}>{TIER_LABELS[tier]}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{items.length} hashtags</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {items.map((tag, i) => (
                    <HashtagChip key={i} tag={tag} onCopy={copyTag} onAdd={toggleSelect} added={selected.includes(tag.tag)} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {!loading && !tags && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>#</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Hashtag Research Tool</div>
            <div style={{ fontSize: 13, maxWidth: 360, margin: '0 auto', lineHeight: 1.8 }}>
              ใส่ keyword สินค้า เลือกแพลตฟอร์ม แล้วกด "วิจัย Hashtag" — AI จะแนะนำ 30+ hashtag แบ่งตาม Tier พร้อม Combo ที่ดีที่สุด
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {['น้ำพริก', 'ครีมขมิ้น', 'ผ้าไหม', 'กาแฟดอยช้าง'].map(s => (
                <button key={s} onClick={() => setKeyword(s)}
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '6px 14px', color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
