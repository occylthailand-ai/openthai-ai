import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['OTOP', 'อาหาร/เครื่องดื่ม', 'ความงาม/สกินแคร์', 'สุขภาพ/อาหารเสริม', 'เสื้อผ้า/แฟชั่น', 'อุปกรณ์อิเล็กทรอนิกส์', 'ของใช้ในบ้าน', 'สมุนไพร/ธรรมชาติ', 'ของที่ระลึก/หัตถกรรม', 'อื่นๆ'];
const PLATFORMS = ['TikTok', 'Facebook', 'Instagram', 'Shopee', 'Lazada', 'LINE OA', 'ทุกแพลตฟอร์ม'];
const TONES = ['สนุก/ขำ', 'ดราม่า/อารมณ์', 'มืออาชีพ/น่าเชื่อถือ', 'อบอุ่น/ครอบครัว', 'เร้าใจ/Hype', 'เรียบหรู/Premium'];
const TARGETS = ['วัยรุ่น 15-25 ปี', 'คนทำงาน 25-40 ปี', 'แม่บ้าน/แม่ลูกอ่อน', 'ผู้สูงอายุ 50+', 'นักธุรกิจ SME', 'คนรักสุขภาพ', 'คนรักความงาม', 'ทุกเพศทุกวัย'];

const SECTIONS = [
  { id: 'hooks',      icon: '⚡', label: 'Hook Arsenal',        color: '#f97316', desc: '3-5 วินาทีแรกที่ชนะ' },
  { id: 'psychology', icon: '🧠', label: 'Psychology Map',      color: '#a855f7', desc: 'จิตวิทยาผู้ซื้อเชิงลึก' },
  { id: 'platforms',  icon: '📱', label: 'Platform Packages',   color: '#06b6d4', desc: 'copy ต่อ platform' },
  { id: 'copy',       icon: '✍️', label: 'Copy Arsenal',        color: '#10b981', desc: 'คลังคำโปรยทุกรูปแบบ' },
  { id: 'video',      icon: '🎬', label: 'Video Blueprint',     color: '#ef4444', desc: 'Storyboard + Script' },
  { id: 'price',      icon: '💰', label: 'Price Psychology',    color: '#f59e0b', desc: 'จิตวิทยาราคา + Offer' },
  { id: 'objections', icon: '🛡️', label: 'Objection Killers',  color: '#8b5cf6', desc: 'จัดการข้อโต้แย้ง' },
  { id: 'funnel',     icon: '📊', label: 'Funnel Strategy',     color: '#ec4899', desc: 'กลยุทธ์ทั้ง funnel' },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────
const cs = (extra = {}) => ({
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14,
  padding: '18px 20px', ...extra,
});
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };
const inp = { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 13px', color: '#1e293b', fontSize: 13, fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box', outline: 'none' };
const tag = (color) => ({ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700, border: `1px solid ${color}40` });

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{ background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.06)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 7, padding: small ? '3px 9px' : '5px 12px', color: copied ? '#10b981' : '#6366f1', cursor: 'pointer', fontSize: small ? 11 : 12, fontWeight: 600, flexShrink: 0 }}>
      {copied ? '✅' : '📋'}
    </button>
  );
}

function SectionBadge({ label, color }) {
  return <span style={tag(color)}>{label}</span>;
}

function QuoteBlock({ text, color = '#6366f1' }) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, flex: 1 }}>{text}</span>
        <CopyBtn text={text} small />
      </div>
    </div>
  );
}

// ─── Section: Hook Arsenal ────────────────────────────────────────────────────
function SectionHooks({ data }) {
  const color = '#f97316';
  const hookTypes = [
    { key: 'shock',      label: '⚡ Shock', desc: 'ตกใจ-หยุดดู' },
    { key: 'curiosity',  label: '🔍 Curiosity', desc: 'อยากรู้ต่อ' },
    { key: 'pain_point', label: '😤 Pain Point', desc: 'โดนใจปัญหา' },
    { key: 'promise',    label: '🎯 Promise', desc: 'สัญญาผลลัพธ์' },
    { key: 'story',      label: '📖 Story', desc: 'เล่าเรื่องดึงดูด' },
  ];
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={cs()}>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, padding: '10px 14px', background: `${color}08`, borderRadius: 10, marginBottom: 4 }}>
          🎯 <strong>หลักการ:</strong> ใน 3-5 วินาทีแรก ผู้ดูตัดสินใจว่าจะดูต่อหรือเลื่อนผ่าน — hook ที่ดีต้องหยุดนิ้วได้ทันที ใช้ hooks เหล่านี้ทดสอบและวัด CTR
        </div>
      </div>
      {hookTypes.map(ht => {
        const hooks = data?.hooks?.[ht.key] || [];
        if (!hooks.length) return null;
        return (
          <div key={ht.key} style={cs()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color }}>{ht.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>— {ht.desc}</span>
            </div>
            {hooks.map((h, i) => <QuoteBlock key={i} text={h} color={color} />)}
          </div>
        );
      })}
      {data?.hooks?.power_opener && (
        <div style={{ ...cs(), background: `${color}06`, border: `2px solid ${color}30` }}>
          <div style={{ fontWeight: 800, fontSize: 13, color, marginBottom: 10 }}>🏆 Power Opener ที่แนะนำที่สุด</div>
          <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.8, fontWeight: 600 }}>{data.hooks.power_opener}</div>
          <div style={{ marginTop: 10 }}><CopyBtn text={data.hooks.power_opener} /></div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Psychology Map ──────────────────────────────────────────────────
function SectionPsychology({ data }) {
  const color = '#a855f7';
  const p = data?.psychology || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 14 }}>
        <div style={{ ...cs(), borderLeft: `3px solid #10b981` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>💚 CORE DESIRE</div>
          <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>{p.core_desire || '—'}</div>
        </div>
        <div style={{ ...cs(), borderLeft: `3px solid #ef4444` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>❤️ CORE FEAR</div>
          <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>{p.core_fear || '—'}</div>
        </div>
      </div>

      {p.buyer_persona && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 10 }}>👤 Buyer Persona</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{p.buyer_persona}</div>
        </div>
      )}

      {p.fomo_triggers?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 12 }}>🔥 FOMO Triggers — ความกลัวพลาดที่กระตุ้น</div>
          {p.fomo_triggers.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < p.fomo_triggers.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      {p.decision_blockers?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>🚧 Decision Blockers — สิ่งที่ขัดขวางการซื้อ</div>
          {p.decision_blockers.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.04)', borderRadius: 8, marginBottom: 6 }}>
              <span>⚠️</span>
              <span style={{ fontSize: 13, color: '#374151' }}>{b}</span>
            </div>
          ))}
        </div>
      )}

      {p.emotional_journey && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 10 }}>🎭 Emotional Journey ของผู้ซื้อ</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{p.emotional_journey}</div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Platform Packages ───────────────────────────────────────────────
function SectionPlatforms({ data }) {
  const [activePlat, setActivePlat] = useState('tiktok');
  const color = '#06b6d4';
  const platInfo = {
    tiktok:    { icon: '🎵', name: 'TikTok',    bg: '#010101' },
    facebook:  { icon: '👤', name: 'Facebook',  bg: '#1877f2' },
    instagram: { icon: '📸', name: 'Instagram', bg: '#e1306c' },
    shopee:    { icon: '🛍️', name: 'Shopee',    bg: '#ee4d2d' },
    lazada:    { icon: '📦', name: 'Lazada',    bg: '#0f146b' },
    line:      { icon: '💬', name: 'LINE OA',   bg: '#06c755' },
  };
  const pkg = data?.platform_packages || {};
  const platforms = Object.keys(platInfo).filter(k => pkg[k]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {platforms.map(p => (
          <button key={p} onClick={() => setActivePlat(p)}
            style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${activePlat === p ? platInfo[p].bg : 'rgba(0,0,0,0.1)'}`, background: activePlat === p ? platInfo[p].bg : '#f8fafc', color: activePlat === p ? '#fff' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all .15s' }}>
            {platInfo[p].icon} {platInfo[p].name}
          </button>
        ))}
      </div>

      {platforms.map(p => {
        if (activePlat !== p) return null;
        const d = pkg[p] || {};
        return (
          <div key={p} style={{ display: 'grid', gap: 12 }}>
            {/* TikTok specific */}
            {p === 'tiktok' && (
              <>
                {d.hook && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>🎯 TikTok Hook (3วิแรก)</div><QuoteBlock text={d.hook} color={platInfo[p].bg} /></div>}
                {d.script && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>📜 Full Script</div><div style={{ fontSize: 12, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>{d.script}</div><div style={{ marginTop: 8 }}><CopyBtn text={d.script} /></div></div>}
                {d.cta && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>📣 CTA</div><QuoteBlock text={d.cta} color={platInfo[p].bg} /></div>}
                {d.sound_tip && <div style={{ ...cs(), background: 'rgba(1,1,1,0.03)' }}><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>🎵 SOUND TIP</div><div style={{ fontSize: 12, color: '#374151' }}>{d.sound_tip}</div></div>}
              </>
            )}
            {/* Facebook */}
            {p === 'facebook' && (
              <>
                {d.headline && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>📰 Headline</div><QuoteBlock text={d.headline} color={platInfo[p].bg} /></div>}
                {d.body && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>📝 Body Copy</div><div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{d.body}</div><div style={{ marginTop: 8 }}><CopyBtn text={d.body} /></div></div>}
                {d.cta && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>📣 CTA</div><QuoteBlock text={d.cta} color={platInfo[p].bg} /></div>}
              </>
            )}
            {/* Instagram */}
            {p === 'instagram' && (
              <>
                {d.caption && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>📸 Caption</div><div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{d.caption}</div><div style={{ marginTop: 8 }}><CopyBtn text={d.caption} /></div></div>}
                {d.bio_link_text && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>🔗 Bio Link Text</div><QuoteBlock text={d.bio_link_text} color={platInfo[p].bg} /></div>}
                {d.story_idea && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>⭕ Story Idea</div><div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{d.story_idea}</div></div>}
              </>
            )}
            {/* Shopee */}
            {p === 'shopee' && (
              <>
                {d.title && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>🏷️ Product Title (SEO-optimized)</div><QuoteBlock text={d.title} color={platInfo[p].bg} /></div>}
                {d.description && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>📋 Description</div><div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{d.description}</div><div style={{ marginTop: 8 }}><CopyBtn text={d.description} /></div></div>}
                {d.keywords?.length > 0 && <div style={cs()}><div style={{ ...lbl, marginBottom: 10 }}>🔍 Search Keywords</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{d.keywords.map((k, i) => <span key={i} style={{ ...tag(platInfo[p].bg), fontSize: 12, padding: '4px 10px' }}>{k}</span>)}</div></div>}
              </>
            )}
            {/* Lazada */}
            {p === 'lazada' && (
              <>
                {d.title && <div style={cs()}><div style={{ ...lbl, marginBottom: 8 }}>🏷️ Product Title</div><QuoteBlock text={d.title} color={platInfo[p].bg} /></div>}
                {d.bullets?.length > 0 && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>✅ Key Features (Bullet Points)</div>{d.bullets.map((b, i) => <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < d.bullets.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}><span style={{ color: platInfo[p].bg, fontWeight: 700 }}>✓</span><span style={{ fontSize: 13, color: '#374151' }}>{b}</span></div>)}</div>}
                {d.tags?.length > 0 && <div style={cs()}><div style={{ ...lbl, marginBottom: 10 }}>🏷️ Product Tags</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{d.tags.map((t, i) => <span key={i} style={{ ...tag(platInfo[p].bg), fontSize: 12, padding: '4px 10px' }}>{t}</span>)}</div></div>}
              </>
            )}
            {/* LINE */}
            {p === 'line' && (
              <>
                {d.broadcast && <div style={cs()}><div style={{ fontWeight: 700, fontSize: 13, color: platInfo[p].bg, marginBottom: 10 }}>📢 Broadcast Message</div><div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>{d.broadcast}</div><div style={{ marginTop: 8 }}><CopyBtn text={d.broadcast} /></div></div>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section: Copy Arsenal ────────────────────────────────────────────────────
function SectionCopy({ data }) {
  const color = '#10b981';
  const c = data?.copy_arsenal || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {c.headlines?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 12 }}>💥 Power Headlines (เลือกใช้ตาม platform)</div>
          {c.headlines.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < c.headlines.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ fontWeight: 800, color, minWidth: 24, fontSize: 13 }}>H{i + 1}</span>
              <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, flex: 1, lineHeight: 1.5 }}>{h}</span>
              <CopyBtn text={h} small />
            </div>
          ))}
        </div>
      )}

      {c.short_captions?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 12 }}>💬 Short Captions (เหมาะ TikTok / IG Story)</div>
          {c.short_captions.map((cap, i) => <QuoteBlock key={i} text={cap} color={color} />)}
        </div>
      )}

      {c.pas_copy && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 8 }}>📖 PAS Copy (Problem → Agitate → Solution)</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>{c.pas_copy}</div>
          <div style={{ marginTop: 10 }}><CopyBtn text={c.pas_copy} /></div>
        </div>
      )}

      {c.long_form && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 8 }}>📜 Long-Form Ad Copy (Facebook / Google Ads)</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>{c.long_form}</div>
          <div style={{ marginTop: 10 }}><CopyBtn text={c.long_form} /></div>
        </div>
      )}

      {c.cta_variants?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 12 }}>📣 CTA Variants</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {c.cta_variants.map((cta, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, flex: 1 }}>{cta}</span>
                <CopyBtn text={cta} small />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Video Blueprint ─────────────────────────────────────────────────
function SectionVideo({ data }) {
  const color = '#ef4444';
  const v = data?.video_blueprint || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {v.total_duration && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...tag(color), fontSize: 12, padding: '6px 14px' }}>⏱ {v.total_duration}</span>
          {v.music_mood && <span style={{ ...tag('#8b5cf6'), fontSize: 12, padding: '6px 14px' }}>🎵 {v.music_mood}</span>}
          {v.format && <span style={{ ...tag('#06b6d4'), fontSize: 12, padding: '6px 14px' }}>📐 {v.format}</span>}
        </div>
      )}

      {v.scenes?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 14 }}>🎬 Storyboard Scene-by-Scene</div>
          {v.scenes.map((sc, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 0, marginBottom: 12, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', gap: 4 }}>
                <span style={{ fontSize: 20 }}>🎥</span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>S{i + 1}</span>
                {sc.second && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{sc.second}</span>}
              </div>
              <div style={{ padding: '12px 14px', display: 'grid', gap: 6 }}>
                {sc.emotion && <span style={{ fontSize: 10, fontWeight: 700, color }}>{sc.emotion}</span>}
                {sc.visual && <div style={{ fontSize: 12, color: '#64748b' }}><strong>Visual:</strong> {sc.visual}</div>}
                {sc.script && <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>{sc.script}</div>}
                {sc.direction && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>📷 {sc.direction}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {v.key_moments?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 10 }}>⭐ Key Moments ที่ต้องเน้น</div>
          {v.key_moments.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < v.key_moments.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ color, fontWeight: 700, flexShrink: 0 }}>★</span>
              <span style={{ fontSize: 13, color: '#374151' }}>{m}</span>
            </div>
          ))}
        </div>
      )}

      {v.broll_ideas?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#8b5cf6', marginBottom: 10 }}>🎞 B-Roll Ideas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
            {v.broll_ideas.map((b, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: '#475569' }}>📷 {b}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Price Psychology ────────────────────────────────────────────────
function SectionPrice({ data }) {
  const color = '#f59e0b';
  const p = data?.price_psychology || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {p.anchoring_script && (
        <div style={{ ...cs(), borderLeft: `3px solid ${color}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 8 }}>⚓ Price Anchoring Script</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{p.anchoring_script}</div>
          <div style={{ marginTop: 8 }}><CopyBtn text={p.anchoring_script} /></div>
        </div>
      )}

      {p.urgency_triggers?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>⏰ Urgency & Scarcity Triggers</div>
          {p.urgency_triggers.map((t, i) => <QuoteBlock key={i} text={t} color="#ef4444" />)}
        </div>
      )}

      {p.bundle_ideas?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 12 }}>🎁 Bundle & Offer Ideas</div>
          {p.bundle_ideas.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: `${color}08`, borderRadius: 9, marginBottom: 6 }}>
              <span style={{ color, fontWeight: 700 }}>💡</span>
              <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{b}</span>
              <CopyBtn text={b} small />
            </div>
          ))}
        </div>
      )}

      {p.guarantee_script && (
        <div style={{ ...cs(), background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981', marginBottom: 8 }}>🛡 Guarantee / Risk Reversal Script</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{p.guarantee_script}</div>
          <div style={{ marginTop: 8 }}><CopyBtn text={p.guarantee_script} /></div>
        </div>
      )}

      {p.bonus_ideas?.length > 0 && (
        <div style={cs()}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#a855f7', marginBottom: 12 }}>🎁 Bonus Offer Ideas</div>
          {p.bonus_ideas.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < p.bonus_ideas.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ color: '#a855f7', fontWeight: 700, flexShrink: 0 }}>+</span>
              <span style={{ fontSize: 13, color: '#374151' }}>{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Objection Killers ───────────────────────────────────────────────
function SectionObjections({ data }) {
  const color = '#8b5cf6';
  const objections = data?.objection_killers || [];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...cs(), background: `${color}06` }}>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          🛡️ <strong>Pre-emptive objection handling</strong> — ตอบข้อสงสัยก่อนที่ลูกค้าจะถาม ใส่ไว้ใน caption, script หรือ FAQ
        </div>
      </div>
      {objections.map((obj, i) => (
        <div key={i} style={{ ...cs(), borderLeft: `3px solid ${color}` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '3px 9px', borderRadius: 8 }}>❓ ข้อโต้แย้ง</span>
          </div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>{obj.objection}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>✅ KILLER RESPONSE</div>
          <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, background: `${color}06`, borderRadius: 9, padding: '10px 12px' }}>{obj.killer_response}</div>
          {obj.proof_type && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={tag(color)}>PROOF: {obj.proof_type}</span>
              <CopyBtn text={obj.killer_response} small />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section: Funnel Strategy ─────────────────────────────────────────────────
function SectionFunnel({ data }) {
  const color = '#ec4899';
  const f = data?.funnel_strategy || {};
  const stages = [
    { key: 'awareness',  icon: '👁', label: 'Awareness', color: '#f97316', desc: 'ดึงดูดความสนใจ' },
    { key: 'interest',   icon: '❤️', label: 'Interest',  color: '#ec4899', desc: 'กระตุ้นความสนใจ' },
    { key: 'decision',   icon: '🤔', label: 'Decision',  color: '#8b5cf6', desc: 'ช่วยตัดสินใจ' },
    { key: 'action',     icon: '💳', label: 'Action',    color: '#10b981', desc: 'ปิดการขาย' },
    { key: 'repurchase', icon: '🔄', label: 'Retention', color: '#06b6d4', desc: 'ซื้อซ้ำ/บอกต่อ' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {stages.map((stage, i) => {
        const d = f[stage.key] || {};
        if (!d.message && !d.content_type) return null;
        return (
          <div key={stage.key} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 0, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ background: stage.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 4 }}>
              <span style={{ fontSize: 22 }}>{stage.icon}</span>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>{stage.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>{stage.desc}</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gap: 8 }}>
              {d.content_type && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{d.content_type.split(',').map((ct, j) => <span key={j} style={tag(stage.color)}>{ct.trim()}</span>)}</div>}
              {d.message && <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7 }}>{d.message}</div>}
              {d.platform && <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 {d.platform}</div>}
              {d.kpi && <div style={{ fontSize: 11, color: stage.color, fontWeight: 700 }}>📊 KPI: {d.kpi}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PromoEnginePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    product: '', price: '', category: 'OTOP', target: 'คนทำงาน 25-40 ปี',
    usp: '', platform: 'ทุกแพลตฟอร์ม', tone: 'สนุก/ขำ', competitor: '',
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [activeSection, setActiveSection] = useState('hooks');

  const run = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return; }
    if (!form.usp.trim()) { setError('กรุณาระบุจุดเด่นสินค้า (USP)'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/skills/promo-engine'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'เกิดข้อผิดพลาด'); } else { setResult(d); setActiveSection('hooks'); }
    } catch { setError('ไม่สามารถเชื่อมต่อได้'); }
    setLoading(false);
  };

  const activeS = SECTIONS.find(s => s.id === activeSection);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>🚀 Sales Conversion Engine</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>S18 · Hook · Psychology · Platform · Copy · Video · Price · Objection · Funnel</div>
        </div>
        {result && (
          <button onClick={() => setResult(null)} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>🔄 สร้างใหม่</button>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 5% 0' }}>

        {/* Input Phase */}
        {!result && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Hero Banner */}
            <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: 18, padding: '28px 28px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 120, opacity: 0.06 }}>🚀</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>🚀 Sales Conversion Engine</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
                ระบบ AI สร้างโปรโมชั่นสินค้าแบบครบทุกมิติ — Hook ดึงดูดใน 3-5 วิ · จิตวิทยาผู้ซื้อ · Copy ทุก Platform · Storyboard วีดีโอ · กลยุทธ์ราคา · ปิดข้อโต้แย้ง · Funnel ทั้งกระบวน
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {['⚡ Hook', '🧠 Psychology', '📱 6 Platforms', '🎬 Storyboard', '💰 Price', '🛡 Objections', '📊 Funnel'].map(l => (
                  <span key={l} style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Form */}
            <div style={cs()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 20 }}>📋 ข้อมูลสินค้า</div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                  <div>
                    <label style={lbl}>ชื่อสินค้า *</label>
                    <input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="เช่น: ครีมบำรุงผิวจากสมุนไพร 10 ชนิด" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ราคา</label>
                    <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="เช่น: ฿299 / 2 กระปุก ฿499" style={inp} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>จุดเด่นหลัก / USP *</label>
                  <textarea value={form.usp} onChange={e => setForm(f => ({ ...f, usp: e.target.value }))} placeholder="บอกสิ่งที่ทำให้สินค้านี้พิเศษ เช่น: ส่วนผสม 100% ออร์แกนิค ทดสอบทางคลินิก เห็นผลใน 7 วัน" rows={3} style={{ ...inp, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
                  <div>
                    <label style={lbl}>หมวดสินค้า</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>แพลตฟอร์มหลัก</label>
                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={inp}>
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>กลุ่มเป้าหมาย</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TARGETS.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, target: t }))}
                        style={{ padding: '6px 13px', borderRadius: 20, border: `1px solid ${form.target === t ? '#6366f1' : 'rgba(0,0,0,0.1)'}`, background: form.target === t ? 'rgba(99,102,241,0.1)' : '#f8fafc', color: form.target === t ? '#6366f1' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.target === t ? 700 : 400 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>โทนการสื่อสาร</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TONES.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                        style={{ padding: '6px 13px', borderRadius: 20, border: `1px solid ${form.tone === t ? '#f97316' : 'rgba(0,0,0,0.1)'}`, background: form.tone === t ? 'rgba(249,115,22,0.1)' : '#f8fafc', color: form.tone === t ? '#f97316' : '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: form.tone === t ? 700 : 400 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>คู่แข่ง / สินค้าทดแทน (ไม่บังคับ)</label>
                  <input value={form.competitor} onChange={e => setForm(f => ({ ...f, competitor: e.target.value }))} placeholder="เช่น: ครีมยี่ห้อ X ราคา ฿150" style={inp} />
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 }}>{error}</div>}

                <button onClick={run} disabled={loading}
                  style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg,#1e293b,#334155)', border: 'none', borderRadius: 12, padding: '16px 24px', color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loading ? (
                    <>⏳ AI กำลังวิเคราะห์ทุกมิติ...</>
                  ) : (
                    <>🚀 สร้าง Sales Conversion Engine</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {result && (
          <div style={{ display: 'grid', gap: 0 }}>
            {/* Product Summary Bar */}
            <div style={{ ...cs(), marginBottom: 0, borderRadius: '14px 14px 0 0', background: 'linear-gradient(135deg,#1e293b,#334155)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>🛍 {form.product}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    {form.price && `${form.price} · `}{form.category} · {form.target} · โทน: {form.tone}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {result.source && <span style={{ ...tag('#94a3b8'), color: '#94a3b8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)' }}>{result.source?.toUpperCase()}</span>}
                </div>
              </div>
            </div>

            {/* Section Nav */}
            <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', overflowX: 'auto', display: 'flex', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  style={{ padding: '11px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${activeSection === s.id ? s.color : 'transparent'}`, color: activeSection === s.id ? s.color : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: activeSection === s.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all .15s', scrollSnapAlign: 'start', minHeight: 44 }}>
                  <span>{s.icon}</span> <span className="section-tab-label">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Section Desc */}
            <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.04)', padding: '10px 20px', borderRadius: '0 0 0 0' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: activeS?.color }}>{activeS?.icon} {activeS?.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>— {activeS?.desc}</span>
            </div>

            {/* Section Content */}
            <div style={{ background: '#f8fafc', padding: '20px 0', borderRadius: '0 0 14px 14px' }}>
              {activeSection === 'hooks'      && <SectionHooks data={result} />}
              {activeSection === 'psychology' && <SectionPsychology data={result} />}
              {activeSection === 'platforms'  && <SectionPlatforms data={result} />}
              {activeSection === 'copy'       && <SectionCopy data={result} />}
              {activeSection === 'video'      && <SectionVideo data={result} />}
              {activeSection === 'price'      && <SectionPrice data={result} />}
              {activeSection === 'objections' && <SectionObjections data={result} />}
              {activeSection === 'funnel'     && <SectionFunnel data={result} />}
            </div>

            {/* Bottom Nav */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
              <button onClick={() => { const i = SECTIONS.findIndex(s => s.id === activeSection); if (i > 0) setActiveSection(SECTIONS[i - 1].id); }}
                disabled={SECTIONS[0].id === activeSection}
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 9, padding: '9px 20px', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← ก่อนหน้า</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>{SECTIONS.findIndex(s => s.id === activeSection) + 1} / {SECTIONS.length}</span>
              <button onClick={() => { const i = SECTIONS.findIndex(s => s.id === activeSection); if (i < SECTIONS.length - 1) setActiveSection(SECTIONS[i + 1].id); }}
                disabled={SECTIONS[SECTIONS.length - 1].id === activeSection}
                style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', border: 'none', borderRadius: 9, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>ถัดไป →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
