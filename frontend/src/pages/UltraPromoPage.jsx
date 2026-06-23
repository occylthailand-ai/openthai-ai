import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useToast } from '../components/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['OTOP', 'อาหาร/เครื่องดื่ม', 'ความงาม/สกินแคร์', 'สุขภาพ/อาหารเสริม', 'เสื้อผ้า/แฟชั่น', 'อิเล็กทรอนิกส์', 'ของใช้ในบ้าน', 'สมุนไพร/ธรรมชาติ', 'หัตถกรรม', 'บริการ', 'อื่นๆ'];
const PLATFORMS  = ['TikTok', 'Facebook', 'Instagram', 'Shopee', 'Lazada', 'LINE OA', 'YouTube', 'ทุกแพลตฟอร์ม'];
const TONES      = ['สนุก/กระตุ้น', 'ดราม่า/อารมณ์', 'มืออาชีพ', 'อบอุ่น/ครอบครัว', 'เร้าใจ/Hype', 'เรียบหรู/Premium'];
const TARGETS    = ['วัยรุ่น 15-25', 'คนทำงาน 25-40', 'แม่บ้าน/แม่ลูกอ่อน', 'ผู้สูงอายุ 50+', 'นักธุรกิจ SME', 'คนรักสุขภาพ', 'คนรักความงาม', 'ทุกเพศทุกวัย'];

const MODULES = [
  { id: 'hook_matrix',           icon: '⚡', label: 'Hook Matrix',          color: '#ef4444', desc: '5-5 วินาทีแรก · Pattern Interrupt' },
  { id: 'buyer_psychology',      icon: '🧠', label: 'Buyer Psychology',      color: '#a855f7', desc: 'Pain · Desire · Bias · Journey' },
  { id: 'platform_packages',     icon: '📱', label: 'Platform Packages',     color: '#06b6d4', desc: 'TikTok · FB · Shopee · LINE · IG' },
  { id: 'copy_arsenal',          icon: '✍️', label: 'Copy Arsenal',          color: '#10b981', desc: 'AIDA · PAS · BAB · FOMO · Power Words' },
  { id: 'video_blueprint',       icon: '🎬', label: 'Video Blueprint',       color: '#f97316', desc: '15s · 30s · 60s · Live Script' },
  { id: 'price_psychology',      icon: '💰', label: 'Price Psychology',      color: '#f59e0b', desc: 'Anchor · Bundle · Urgency · Guarantee' },
  { id: 'objection_killers',     icon: '🛡️', label: 'Objection Killers',    color: '#8b5cf6', desc: '7 ข้อโต้แย้ง + Killer Response + Reframe' },
  { id: 'funnel_strategy',       icon: '📊', label: 'Full Funnel',           color: '#ec4899', desc: 'TOFU·MOFU·BOFU · Retarget · Email 5-step' },
  { id: 'competitive_positioning', icon: '🏆', label: 'Competitive Edge',   color: '#14b8a6', desc: 'USP · Differentiation · Blue Ocean' },
  { id: 'kol_brief',             icon: '👥', label: 'KOL Brief',             color: '#6366f1', desc: 'Brief · Script · Do/Don\'t · KPI' },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const st = {
  card: (e = {}) => ({ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '18px 20px', ...e }),
  lbl: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  inp: { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 13px', color: '#1e293b', fontSize: 13, fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box', outline: 'none' },
  btn: (c = '#6366f1') => ({ background: `linear-gradient(135deg,${c},${c}bb)`, border: 'none', borderRadius: 10, padding: '11px 20px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }),
  tag: (c) => ({ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${c}18`, color: c, fontWeight: 700, border: `1px solid ${c}30` }),
  quote: (c = '#6366f1') => ({ background: `${c}07`, border: `1px solid ${c}20`, borderLeft: `3px solid ${c}`, borderRadius: '0 10px 10px 0', padding: '9px 12px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }),
};

function CopyBtn({ text, small }) {
  const [ok, setOk] = useState(false);
  const go = () => { navigator.clipboard.writeText(text || '').catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={go} style={{ background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.07)', border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 7, padding: small ? '3px 8px' : '5px 12px', color: ok ? '#10b981' : '#6366f1', cursor: 'pointer', fontSize: small ? 11 : 12, fontWeight: 600, flexShrink: 0 }}>
      {ok ? '✅' : '📋'}
    </button>
  );
}
function Q({ text, color }) {
  return (
    <div style={st.quote(color)}>
      <span style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, flex: 1 }}>{text}</span>
      <CopyBtn text={text} small />
    </div>
  );
}
function SLabel({ label, color }) {
  return <div style={{ fontWeight: 800, fontSize: 13, color, marginBottom: 10 }}>{label}</div>;
}
function Chip({ v, color }) {
  return <span style={{ ...st.tag(color || '#6366f1'), marginRight: 5, marginBottom: 4, display: 'inline-block' }}>{v}</span>;
}
function SubCard({ title, children, color = '#64748b' }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>}
      {children}
    </div>
  );
}

// ─── Module renderers ──────────────────────────────────────────────────────────
function ModHookMatrix({ d, mod }) {
  if (!d) return null;
  const types = [
    { key: 'shock',    label: '💥 Shock / Pattern Interrupt' },
    { key: 'question', label: '❓ คำถามที่ให้คนอยากตอบ' },
    { key: 'curiosity',label: '🔮 Curiosity / ทิ้งปริศนา' },
    { key: 'story',    label: '📖 Story Opener' },
    { key: 'contrast', label: '⚖️ Contrast / ขัดความคาดหวัง' },
  ];
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
        <SLabel label="🎯 Hook Types — 15 hooks พร้อมใช้" color={mod.color} />
        {types.map(t => (
          <div key={t.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5 }}>{t.label}</div>
            {(d[t.key] || []).map((h, i) => <Q key={i} text={h} color={mod.color} />)}
          </div>
        ))}
      </div>
      <div style={st.card()}>
        <SLabel label="📱 Platform Openers — เปิดเฉพาะแพลตฟอร์ม" color={mod.color} />
        {Object.entries(d.platform_openers || {}).map(([p, txt]) => (
          <SubCard key={p} title={p.toUpperCase()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{txt}</span>
              <CopyBtn text={txt} small />
            </div>
          </SubCard>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="💬 First Words — คำขึ้นต้นทรงพลัง" color={mod.color} />
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {(d.first_words || []).map((w, i) => <Chip key={i} v={w} color={mod.color} />)}
          </div>
        </div>
        <div style={st.card()}>
          <SLabel label="🎨 Visual Hook Concepts" color={mod.color} />
          {(d.visual_hooks || []).map((v, i) => (
            <div key={i} style={{ fontSize: 12, color: '#475569', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{v}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModBuyerPsychology({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
        <SLabel label="😣 Pain Matrix — ปวดราก ปวดใจ ปวดลึก" color={mod.color} />
        <div style={{ display: 'grid', gap: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px 8px 0 0' }}>
            <span>เหตุผล (Rational)</span><span>อารมณ์ (Emotional)</span><span>ความกลัวลึกๆ</span>
          </div>
          {(d.pain_matrix || []).map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 12, color: '#475569', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: i % 2 ? '#fafafa' : '#fff' }}>
              <span>{p.rational}</span><span>{p.emotional}</span><span style={{ color: '#ef4444' }}>{p.deep_fear}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={st.card()}>
        <SLabel label="🌟 Desire Map — ผิวเผิน → แท้จริง → ตัวตน" color={mod.color} />
        {(d.desire_map || []).map((dm, i) => (
          <SubCard key={i}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>พูดออกมา</div><div style={{ color: '#475569' }}>{dm.surface}</div></div>
              <div><div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>ต้องการจริงๆ</div><div style={{ color: '#a855f7', fontWeight: 600 }}>{dm.core}</div></div>
              <div><div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>ตัวตนที่อยากเป็น</div><div style={{ color: '#ef4444', fontWeight: 600 }}>{dm.identity}</div></div>
            </div>
          </SubCard>
        ))}
      </div>

      <div style={st.card()}>
        <SLabel label="🎭 Cognitive Biases — 6 ไบแอสที่ต้องใช้" color={mod.color} />
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 10 }}>
          {(d.cognitive_biases || []).map((b, i) => (
            <SubCard key={i} title={b.bias} color={mod.color}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 5 }}>{b.application}</div>
              <Q text={b.copy_example} color={mod.color} />
            </SubCard>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="💔 Emotional Triggers" color={mod.color} />
          {(d.emotional_triggers || []).map((t, i) => (
            <div key={i} style={{ fontSize: 12, color: '#475569', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{t}</div>
          ))}
        </div>
        <div style={st.card()}>
          <SLabel label="🗺️ Buyer Journey Hooks" color={mod.color} />
          {(d.buyer_journey_hooks || []).map((s, i) => (
            <SubCard key={i} title={s.stage} color={mod.color}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>{s.emotion}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{s.message}</div>
            </SubCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModPlatforms({ d, mod }) {
  if (!d) return null;
  const platforms = [
    { key: 'tiktok', icon: '▶️', name: 'TikTok', color: '#fe2c55' },
    { key: 'facebook', icon: '👥', name: 'Facebook', color: '#1877f2' },
    { key: 'shopee', icon: '🟠', name: 'Shopee', color: '#f97316' },
    { key: 'line', icon: '💚', name: 'LINE', color: '#06c755' },
    { key: 'instagram', icon: '📸', name: 'Instagram', color: '#e1306c' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {platforms.map(p => {
        const pd = d[p.key];
        if (!pd) return null;
        return (
          <div key={p.key} style={st.card({ borderLeft: `4px solid ${p.color}` })}>
            <div style={{ fontWeight: 800, fontSize: 14, color: p.color, marginBottom: 12 }}>{p.icon} {p.name}</div>
            {Object.entries(pd).map(([k, v]) => {
              if (Array.isArray(v)) return (
                <SubCard key={k} title={k.replace(/_/g, ' ').toUpperCase()} color={p.color}>
                  {v.map((item, i) => <div key={i} style={{ fontSize: 12, color: '#475569', padding: '3px 0' }}>• {item}</div>)}
                </SubCard>
              );
              return (
                <SubCard key={k} title={k.replace(/_/g, ' ').toUpperCase()} color={p.color}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, flex: 1, whiteSpace: 'pre-wrap' }}>{v}</span>
                    <CopyBtn text={v} small />
                  </div>
                </SubCard>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ModCopyArsenal({ d, mod }) {
  if (!d) return null;
  const formulas = [
    { key: 'aida', label: 'AIDA — Attention · Interest · Desire · Action', color: '#ef4444' },
    { key: 'pas',  label: 'PAS — Problem · Agitate · Solution', color: '#f97316' },
    { key: 'bab',  label: 'BAB — Before · After · Bridge', color: '#10b981' },
    { key: 'fomo', label: 'FOMO — Urgency · Scarcity · Social Proof', color: '#a855f7' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {formulas.map(f => {
        const fd = d[f.key];
        if (!fd) return null;
        return (
          <div key={f.key} style={st.card({ borderLeft: `4px solid ${f.color}` })}>
            <SLabel label={f.label} color={f.color} />
            {Object.entries(fd).map(([k, v]) => {
              if (k === 'full_copy') return (
                <SubCard key={k} title="Full Copy" color={f.color}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <pre style={{ fontSize: 12, color: '#1e293b', flex: 1, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{v}</pre>
                    <CopyBtn text={v} small />
                  </div>
                </SubCard>
              );
              return <SubCard key={k} title={k.replace(/_/g, ' ').toUpperCase()} color={f.color}><Q text={v} color={f.color} /></SubCard>;
            })}
          </div>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="⚡ Power Words ภาษาไทย" color={mod.color} />
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {(d.power_words || []).map((w, i) => <Chip key={i} v={w} color={mod.color} />)}
          </div>
        </div>
        <div style={st.card()}>
          <SLabel label="📧 Email Subject Lines" color={mod.color} />
          {(d.email_subject_lines || []).map((s, i) => <Q key={i} text={s} color={mod.color} />)}
        </div>
      </div>
      <div style={st.card()}>
        <SLabel label="⭐ Testimonial Templates — รู้สึกจริง ไม่ใช่โฆษณา" color={mod.color} />
        {(d.testimonial_templates || []).map((t, i) => <Q key={i} text={t} color={mod.color} />)}
      </div>
    </div>
  );
}

function SceneTable({ scenes }) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '70px 90px 1fr 1fr 100px', gap: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '7px 10px' }}>
        <span>เวลา</span><span>Type</span><span>Visual</span><span>Script</span><span>Emotion</span>
      </div>
      {(scenes || []).map((sc, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 90px 1fr 1fr 100px', gap: 0, fontSize: 11, color: '#475569', padding: '8px 10px', background: i % 2 ? '#fafafa' : '#fff', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>{sc.sec}s</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>{sc.type}</span>
          <span>{sc.visual}</span>
          <span style={{ fontWeight: 600 }}>{sc.script}</span>
          <span style={{ color: '#f97316' }}>{sc.emotion}</span>
        </div>
      ))}
    </div>
  );
}

function ModVideoBlueprint({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {[{ key: 'v15', label: '⚡ 15 วินาที — TikTok/Reels' }, { key: 'v30', label: '🎬 30 วินาที — TikTok/Facebook' }, { key: 'v60', label: '📺 60 วินาที — YouTube/Facebook' }].map(v => {
        const vd = d[v.key];
        if (!vd) return null;
        return (
          <div key={v.key} style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <SLabel label={v.label} color={mod.color} />
              <span style={st.tag(mod.color)}>{vd.platform}</span>
            </div>
            <SceneTable scenes={vd.scenes} />
          </div>
        );
      })}
      {d.live_script && (
        <div style={st.card()}>
          <SLabel label="📡 Live Script — เปิด · Demo · ปิด · Flash Sale" color={mod.color} />
          {Object.entries(d.live_script).map(([k, v]) => (
            <SubCard key={k} title={k.replace(/_/g, ' ').toUpperCase()} color={mod.color}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#1e293b', flex: 1, lineHeight: 1.6 }}>{v}</span>
                <CopyBtn text={v} small />
              </div>
            </SubCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ModPrice({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
        <SLabel label="⚓ Anchor Pricing Strategy" color={mod.color} />
        <SubCard><div style={{ fontSize: 13, color: '#475569' }}>{d.anchor_strategy}</div></SubCard>
        {d.anchor_copy && <Q text={d.anchor_copy} color={mod.color} />}
      </div>
      <div style={st.card()}>
        <SLabel label="🎁 Bundle Ideas" color={mod.color} />
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-3)', gap: 10 }}>
          {(d.bundles || []).map((b, i) => (
            <div key={i} style={{ background: i === 1 ? `${mod.color}10` : '#f8fafc', border: `1px solid ${i === 1 ? mod.color : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              {i === 1 && <div style={{ fontSize: 9, fontWeight: 700, color: mod.color, marginBottom: 4 }}>⭐ ยอดนิยม</div>}
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{b.items}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>฿{b.original_price}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: mod.color }}>฿{b.bundle_price}</div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>ประหยัด ฿{b.saving}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{b.headline}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="⏰ Urgency & Scarcity Tactics" color={mod.color} />
          {(d.urgency_tactics || []).map((t, i) => <Q key={i} text={t} color={mod.color} />)}
        </div>
        <div style={st.card()}>
          <SLabel label="🎯 Value Framing — ทำให้ราคาดูน้อย" color={mod.color} />
          {(d.value_framing || []).map((f, i) => <Q key={i} text={f} color={mod.color} />)}
        </div>
      </div>
      {d.guarantee && (
        <div style={st.card({ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' })}>
          <SLabel label={`🛡️ Guarantee — ${d.guarantee.type}`} color="#10b981" />
          <Q text={d.guarantee.copy} color="#10b981" />
        </div>
      )}
    </div>
  );
}

function ModObjections({ d, mod }) {
  if (!d || !Array.isArray(d)) return null;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {d.map((o, i) => (
        <div key={i} style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: mod.color, minWidth: 28 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 3 }}>"{o.objection}"</div>
              <span style={st.tag(mod.color)}>{o.proof_type}</span>
            </div>
          </div>
          <SubCard title="Killer Response" color={mod.color}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#1e293b', flex: 1, lineHeight: 1.6 }}>{o.killer}</span>
              <CopyBtn text={o.killer} small />
            </div>
          </SubCard>
          <SubCard title="Reframe" color="#10b981">
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, fontStyle: 'italic' }}>{o.reframe}</span>
          </SubCard>
        </div>
      ))}
    </div>
  );
}

function ModFunnel({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {[{ key: 'tofu', label: '🎯 TOFU — Top of Funnel (Awareness)', color: '#06b6d4' }, { key: 'mofu', label: '🤔 MOFU — Middle of Funnel (Consideration)', color: '#f59e0b' }, { key: 'bofu', label: '🎰 BOFU — Bottom of Funnel (Conversion)', color: '#10b981' }].map(f => (
        <div key={f.key} style={st.card({ borderLeft: `4px solid ${f.color}` })}>
          <SLabel label={f.label} color={f.color} />
          {(d[f.key] || []).map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 1fr', gap: 8, fontSize: 12, color: '#475569', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontWeight: 600 }}>{item.content_type}</span>
              <span>{item.message}</span>
              <span style={{ color: f.color, fontWeight: 700 }}>{item.platform}</span>
              <span style={{ color: '#94a3b8' }}>{item.kpi}</span>
            </div>
          ))}
        </div>
      ))}
      {d.retargeting_sequence && (
        <div style={st.card()}>
          <SLabel label="🎯 Retargeting Sequence — ตามจนซื้อ" color={mod.color} />
          {d.retargeting_sequence.map((r, i) => (
            <SubCard key={i} title={r.day} color={mod.color}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{r.message}</span>
                <span style={st.tag('#64748b')}>{r.format}</span>
                <CopyBtn text={r.message} small />
              </div>
            </SubCard>
          ))}
        </div>
      )}
      {d.email_sequence && (
        <div style={st.card()}>
          <SLabel label="📧 Email Nurture — 5-Email Sequence" color={mod.color} />
          {d.email_sequence.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: mod.color, minWidth: 55 }}>{e.email}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 60 }}>{e.timing}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{e.subject}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{e.body_outline}</div>
              </div>
              <CopyBtn text={e.subject} small />
            </div>
          ))}
        </div>
      )}
      {d.upsell_opportunities && (
        <div style={st.card()}>
          <SLabel label="💎 Upsell & Cross-sell Opportunities" color={mod.color} />
          {d.upsell_opportunities.map((u, i) => <Q key={i} text={u} color={mod.color} />)}
        </div>
      )}
    </div>
  );
}

function ModCompetitive({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={st.card({ background: `${mod.color}07`, borderColor: `${mod.color}20` })}>
        <SLabel label="🏆 USP Statement — ชัด · สั้น · ทรงพลัง" color={mod.color} />
        <Q text={d.usp_statement} color={mod.color} />
      </div>
      <div style={st.card()}>
        <SLabel label="⚔️ Differentiation Matrix — เราดีกว่าอย่างไร" color={mod.color} />
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '7px 10px' }}>
            <span>มิติเปรียบเทียบ</span><span style={{ color: mod.color }}>✅ เรา</span><span style={{ color: '#ef4444' }}>❌ คู่แข่ง</span>
          </div>
          {(d.differentiation_matrix || []).map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 12, padding: '8px 10px', background: i % 2 ? '#fafafa' : '#fff', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontWeight: 600 }}>{row.dimension}</span>
              <span style={{ color: '#10b981' }}>{row.us}</span>
              <span style={{ color: '#94a3b8' }}>{row.them}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={st.card({ background: 'rgba(20,184,166,0.04)', borderColor: 'rgba(20,184,166,0.2)' })}>
        <SLabel label="🌊 Blue Ocean — Category Creation" color="#14b8a6" />
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{d.category_creation}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="✅ Why Us — 5 เหตุผล" color={mod.color} />
          {(d.why_us_bullets || []).map((b, i) => <div key={i} style={{ fontSize: 13, color: '#1e293b', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{b}</div>)}
        </div>
        <div style={st.card()}>
          <SLabel label="🎯 Positioning Statement" color={mod.color} />
          <Q text={d.positioning_statement} color={mod.color} />
        </div>
      </div>
    </div>
  );
}

function ModKOL({ d, mod }) {
  if (!d) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={st.card({ borderLeft: `4px solid ${mod.color}` })}>
        <SLabel label="📋 Product Brief — ส่งให้ KOL ได้เลย" color={mod.color} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>{d.product_brief}</div>
          <CopyBtn text={d.product_brief} small />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="💬 Key Messages ที่ต้องพูด" color={mod.color} />
          {(d.key_messages || []).map((m, i) => <Q key={i} text={m} color={mod.color} />)}
        </div>
        <div style={st.card()}>
          <SLabel label="🎬 Script Direction" color={mod.color} />
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{d.script_direction}</div>
          <SubCard title="Content Format" color={mod.color}><span style={{ fontSize: 12, color: '#475569' }}>{d.content_format}</span></SubCard>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card({ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' })}>
          <SLabel label="✅ Do's" color="#10b981" />
          {(d.dos || []).map((t, i) => <div key={i} style={{ fontSize: 13, color: '#1e293b', padding: '4px 0' }}>✅ {t}</div>)}
        </div>
        <div style={st.card({ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' })}>
          <SLabel label="❌ Don'ts" color="#ef4444" />
          {(d.donts || []).map((t, i) => <div key={i} style={{ fontSize: 13, color: '#1e293b', padding: '4px 0' }}>❌ {t}</div>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={st.card()}>
          <SLabel label="#️⃣ Mandatory Hashtags" color={mod.color} />
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {(d.hashtag_mandatory || []).map((h, i) => <Chip key={i} v={h} color={mod.color} />)}
          </div>
        </div>
        <div style={st.card()}>
          <SLabel label="📊 KPI Expectations" color={mod.color} />
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{d.kpi_expectations}</div>
        </div>
      </div>
    </div>
  );
}

const MODULE_RENDERERS = {
  hook_matrix:            ModHookMatrix,
  buyer_psychology:       ModBuyerPsychology,
  platform_packages:      ModPlatforms,
  copy_arsenal:           ModCopyArsenal,
  video_blueprint:        ModVideoBlueprint,
  price_psychology:       ModPrice,
  objection_killers:      ModObjections,
  funnel_strategy:        ModFunnel,
  competitive_positioning: ModCompetitive,
  kol_brief:              ModKOL,
};

// ─── Input Form ───────────────────────────────────────────────────────────────
function InputForm({ onResult }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ product: '', price: '', category: 'OTOP', usp: '', pain: '', desire: '', target: 'ทุกเพศทุกวัย', competitor: '', platform: 'ทุกแพลตฟอร์ม', tone: 'สนุก/กระตุ้น', brand_voice: 'ทันสมัย, น่าเชื่อถือ, ใกล้ชิด' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.product.trim()) { showToast('กรุณาใส่ชื่อสินค้า', 'error'); return; }
    if (!form.usp.trim())     { showToast('กรุณาใส่จุดเด่นสำคัญ (USP)', 'error'); return; }
    setLoading(true); setProgress(0);
    const timer = setInterval(() => setProgress(p => Math.min(p + 2, 90)), 300);
    try {
      const res = await fetch(apiUrl('/api/ultra-promo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      clearInterval(timer); setProgress(100);
      if (!res.ok) { showToast(d.error || 'เกิดข้อผิดพลาด', 'error'); setLoading(false); return; }
      setTimeout(() => { onResult(d); setLoading(false); }, 400);
    } catch { clearInterval(timer); showToast('ไม่สามารถเชื่อมต่อได้', 'error'); setLoading(false); }
  };

  const togBtn = (val, current, onChange) => (
    <button onClick={() => onChange(val)}
      style={{ padding: '5px 13px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: current === val ? 700 : 400, border: `1px solid ${current === val ? '#6366f1' : 'rgba(0,0,0,0.1)'}`, background: current === val ? 'rgba(99,102,241,0.12)' : 'transparent', color: current === val ? '#6366f1' : '#64748b' }}>
      {val}
    </button>
  );

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Basic info */}
      <div style={st.card()}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>🛍️ ข้อมูลสินค้า</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={st.lbl}>ชื่อสินค้า *</label><input style={st.inp} placeholder="เช่น ครีมกันแดด SPF50, น้ำพริกเผาคุณยาย, ผ้าไหมมัดหมี่" value={form.product} onChange={e => set('product', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={st.lbl}>ราคา</label><input style={st.inp} placeholder="฿490, ฿1,290" value={form.price} onChange={e => set('price', e.target.value)} /></div>
            <div>
              <label style={st.lbl}>หมวดหมู่</label>
              <select style={{ ...st.inp, cursor: 'pointer' }} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={st.lbl}>จุดเด่นหลัก (USP) — สิ่งที่ทำให้แตกต่าง *</label><input style={st.inp} placeholder="เช่น สูตรไทยแท้ไม่มีสารอันตราย · ผลลัพธ์ภายใน 7 วัน · ส่งตรงจากเกษตรกร" value={form.usp} onChange={e => set('usp', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div><label style={st.lbl}>ปัญหาของลูกค้า (Pain)</label><textarea style={{ ...st.inp, minHeight: 60, resize: 'vertical' }} placeholder="ปัญหาที่ลูกค้าเผชิญก่อนมาหาสินค้านี้" value={form.pain} onChange={e => set('pain', e.target.value)} /></div>
            <div><label style={st.lbl}>ความต้องการ (Desire)</label><textarea style={{ ...st.inp, minHeight: 60, resize: 'vertical' }} placeholder="สิ่งที่ลูกค้าอยากได้/อยากเป็น" value={form.desire} onChange={e => set('desire', e.target.value)} /></div>
          </div>
          <div><label style={st.lbl}>คู่แข่งหลัก</label><input style={st.inp} placeholder="ยี่ห้อ หรือประเภทสินค้าที่ลูกค้ามักเปรียบเทียบด้วย (ไม่จำเป็น)" value={form.competitor} onChange={e => set('competitor', e.target.value)} /></div>
        </div>
      </div>

      {/* Target & Platform */}
      <div style={st.card()}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>🎯 กลุ่มเป้าหมาย & ช่องทาง</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={st.lbl}>กลุ่มเป้าหมาย</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{TARGETS.map(t => togBtn(t, form.target, v => set('target', v)))}</div>
          </div>
          <div>
            <label style={st.lbl}>แพลตฟอร์มหลัก</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{PLATFORMS.map(p => togBtn(p, form.platform, v => set('platform', v)))}</div>
          </div>
          <div>
            <label style={st.lbl}>โทนการสื่อสาร</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{TONES.map(t => togBtn(t, form.tone, v => set('tone', v)))}</div>
          </div>
          <div><label style={st.lbl}>เสียงแบรนด์ (Brand Voice)</label><input style={st.inp} placeholder="เช่น ทันสมัย จริงใจ ใกล้ชิด · เรียบหรู มีคลาส · สนุก กวนๆ" value={form.brand_voice} onChange={e => set('brand_voice', e.target.value)} /></div>
        </div>
      </div>

      {/* Generate button */}
      {loading ? (
        <div style={st.card({ textAlign: 'center', padding: 30 })}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>⏳ AI กำลังวิเคราะห์ครบ 10 โมดูล...</div>
          <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8, margin: '0 auto', maxWidth: 300 }}>
            <div style={{ background: 'linear-gradient(90deg,#ef4444,#6366f1)', height: 8, borderRadius: 20, width: `${progress}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{progress}%</div>
        </div>
      ) : (
        <button style={{ ...st.btn('#ef4444'), width: '100%', padding: '15px 0', fontSize: 16, fontWeight: 900 }} onClick={generate}>
          ⚡ สร้างระบบโปรโมตครบ 10 โมดูล
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UltraPromoPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [activeModule, setActiveModule] = useState('hook_matrix');

  const mod = MODULES.find(m => m.id === activeModule);
  const Renderer = MODULE_RENDERERS[activeModule];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#1e293b' }}>⚡ Ultra Promo Engine</span>
            <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 20, padding: '2px 10px', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700 }}>10 Modules</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Hook Matrix · Psychology · Platform · Copy · Video · Price · Objection · Funnel · Competitive · KOL</div>
        </div>
        {result && (
          <button onClick={() => setResult(null)} style={{ ...st.btn('#64748b'), padding: '8px 16px' }}>← ใส่ข้อมูลใหม่</button>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 5% 0' }}>
        {!result ? (
          <InputForm onResult={setResult} />
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {/* Product summary bar */}
            <div style={st.card({ background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(99,102,241,0.06))', borderColor: 'rgba(239,68,68,0.15)', marginBottom: 16 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 900, fontSize: 16, color: '#1e293b' }}>{result.product}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>"{result.usp}"</span>
                </div>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 700 }}>✅ {result.source?.toUpperCase()} · 10 โมดูล</span>
              </div>
            </div>

            {/* Module nav */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '4px 0', marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', gap: 0, minWidth: 'max-content', padding: '4px 8px' }}>
                {MODULES.map(m => (
                  <button key={m.id} onClick={() => setActiveModule(m.id)}
                    style={{ padding: '8px 14px', background: activeModule === m.id ? `${m.color}12` : 'none', border: activeModule === m.id ? `1px solid ${m.color}30` : '1px solid transparent', borderRadius: 10, color: activeModule === m.id ? m.color : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: activeModule === m.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all .2s', minHeight: 40 }}>
                    {m.icon} <span className="section-tab-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Module description */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>{mod?.icon}</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: mod?.color }}>{mod?.label}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{mod?.desc}</span>
              </div>
            </div>

            {/* Module content */}
            {Renderer && <Renderer d={result[activeModule]} mod={mod} />}

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {MODULES.findIndex(m => m.id === activeModule) > 0 && (
                <button style={{ ...st.btn('#64748b'), flex: 1 }} onClick={() => setActiveModule(MODULES[MODULES.findIndex(m => m.id === activeModule) - 1].id)}>← โมดูลก่อน</button>
              )}
              {MODULES.findIndex(m => m.id === activeModule) < MODULES.length - 1 && (
                <button style={{ ...st.btn('#6366f1'), flex: 1 }} onClick={() => setActiveModule(MODULES[MODULES.findIndex(m => m.id === activeModule) + 1].id)}>โมดูลต่อไป →</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
