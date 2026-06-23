import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { useToast } from '../components/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNELS = ['Facebook', 'TikTok', 'LINE', 'X', 'Email', 'Press Release'];
const TONES    = ['สนุก/กระตุ้น', 'จริงจัง/มืออาชีพ', 'อบอุ่น/ใกล้ชิด', 'เร่งด่วน/Flash', 'แรงบันดาลใจ'];
const EVENT_TYPES = [
  { id: 'launch',     label: '🚀 Launch Day',     color: '#dc2626' },
  { id: 'promotion',  label: '🎁 Promotion',       color: '#f59e0b' },
  { id: 'countdown',  label: '⏰ Countdown',       color: '#6366f1' },
  { id: 'content',    label: '📝 Content Day',     color: '#10b981' },
  { id: 'holiday',    label: '🎉 Holiday/Event',   color: '#ec4899' },
  { id: 'pr',         label: '📰 Press Release',   color: '#06b6d4' },
];
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DAYS_TH   = ['อา','จ','อ','พ','พฤ','ศ','ส'];

// December 2026 preset topics
const DEC_PRESETS = {
  '2026-12-01': { topic: 'เริ่มต้น December Campaign — 20 วันสู่ Launch Day', event_type: 'countdown' },
  '2026-12-05': { topic: 'วันพ่อแห่งชาติ — Openthai.ai ขอบคุณทุกครอบครัว', event_type: 'holiday' },
  '2026-12-10': { topic: 'วันรัฐธรรมนูญ — AI เพื่อทุกคน', event_type: 'holiday' },
  '2026-12-15': { topic: 'Countdown 5 วัน สู่ Launch Day 20/12', event_type: 'countdown' },
  '2026-12-18': { topic: 'เปิดตัว Early Access — สมัครก่อนได้ก่อน', event_type: 'promotion' },
  '2026-12-19': { topic: 'ก่อน Launch 1 วัน — ความพร้อมของ Openthai.ai', event_type: 'countdown' },
  '2026-12-20': { topic: '🚀 LAUNCH DAY — Openthai.ai v10.0 · 18 Skills เปิดตัวอย่างเป็นทางการ', event_type: 'launch' },
  '2026-12-21': { topic: 'วันแรกหลัง Launch — สรุปผลและขอบคุณทุกท่าน', event_type: 'content' },
  '2026-12-24': { topic: 'Christmas Eve — สุขสันต์วันคริสต์มาส จาก Openthai.ai', event_type: 'holiday' },
  '2026-12-25': { topic: 'Merry Christmas — โปรพิเศษสุดท้ายปี', event_type: 'promotion' },
  '2026-12-31': { topic: 'ส่งท้ายปี 2026 — ขอบคุณที่ไว้วางใจ Openthai.ai', event_type: 'holiday' },
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  card: (extra = {}) => ({ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, ...extra }),
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 13px', color: '#1e293b', fontSize: 13, fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box', outline: 'none' },
  btn: (color = '#6366f1') => ({ background: `linear-gradient(135deg,${color},${color}cc)`, border: 'none', borderRadius: 10, padding: '11px 22px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }),
  tag: (color) => ({ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700, border: `1px solid ${color}30` }),
};

function CopyBtn({ text, small }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={copy} style={{ background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.08)', border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 7, padding: small ? '3px 8px' : '5px 12px', color: ok ? '#10b981' : '#6366f1', cursor: 'pointer', fontSize: small ? 11 : 12, fontWeight: 600 }}>
      {ok ? '✅' : '📋'}{!small && (ok ? ' คัดลอกแล้ว' : ' คัดลอก')}
    </button>
  );
}

function ChannelCard({ icon, name, color, children }) {
  return (
    <div style={s.card({ borderLeft: `4px solid ${color}`, marginBottom: 12 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 13, color }}>{name}</span>
      </div>
      {children}
    </div>
  );
}

function TextField({ value, label }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>{label}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{value}</div>
        <CopyBtn text={value} small />
      </div>
    </div>
  );
}

// ─── Tab 1: Daily Generator ───────────────────────────────────────────────────
function TabGenerate({ plan, onPlanSave }) {
  const { showToast } = useToast();
  const today = new Date();
  const [form, setForm] = useState({
    date: '2026-12-20',
    topic: '🚀 LAUNCH DAY — Openthai.ai v10.0 · 18 Skills เปิดตัวอย่างเป็นทางการ',
    product: 'Openthai.ai',
    event_type: 'launch',
    channels: ['Facebook', 'TikTok', 'LINE', 'X', 'Email'],
    tone: 'สนุก/กระตุ้น',
    audience: 'นักการตลาด, เจ้าของธุรกิจ SME, Creator ไทย',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleChannel = (ch) => setForm(f => ({
    ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
  }));

  const generate = async () => {
    if (!form.topic.trim()) { showToast('กรุณาใส่หัวข้อ/กิจกรรม', 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/pr/daily-content'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || 'เกิดข้อผิดพลาด', 'error'); return; }
      setResult(d);
      // auto-save to plan
      onPlanSave(form.date, { topic: form.topic, event_type: form.event_type, generated: true });
      showToast('✅ สร้าง PR Content ครบทุกช่องทางแล้ว', 'success');
    } catch { showToast('ไม่สามารถเชื่อมต่อได้', 'error'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Form */}
      <div style={s.card()}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>📋 รายละเอียดเนื้อหา PR</div>
        <div style={{ display: 'grid', gap: 13 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div>
              <label style={s.label}>วันที่ *</label>
              <input type="date" style={s.input} value={form.date} onChange={e => {
                const preset = DEC_PRESETS[e.target.value];
                setForm(f => ({ ...f, date: e.target.value, ...(preset || {}) }));
              }} />
            </div>
            <div>
              <label style={s.label}>ประเภทกิจกรรม</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {EVENT_TYPES.map(ev => (
                  <button key={ev.id} onClick={() => setForm(f => ({ ...f, event_type: ev.id }))}
                    style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600, border: `1px solid ${form.event_type === ev.id ? ev.color : 'rgba(0,0,0,0.1)'}`, background: form.event_type === ev.id ? `${ev.color}15` : 'transparent', color: form.event_type === ev.id ? ev.color : '#64748b' }}>
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={s.label}>หัวข้อ / กิจกรรม *</label>
            <input style={s.input} placeholder="เช่น Launch Day · โปรลดพิเศษ · วันพ่อแห่งชาติ" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
            <div>
              <label style={s.label}>สินค้า / แบรนด์</label>
              <input style={s.input} placeholder="Openthai.ai" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>กลุ่มเป้าหมาย</label>
              <input style={s.input} placeholder="SME ไทย, Creator, นักการตลาด" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} />
            </div>
          </div>

          <div>
            <label style={s.label}>โทนการสื่อสาร</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: form.tone === t ? 700 : 400, border: `1px solid ${form.tone === t ? '#6366f1' : 'rgba(0,0,0,0.1)'}`, background: form.tone === t ? 'rgba(99,102,241,0.1)' : 'transparent', color: form.tone === t ? '#6366f1' : '#64748b' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={s.label}>ช่องทางที่ต้องการ</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CHANNELS.map(ch => {
                const chColor = { Facebook: '#1877f2', TikTok: '#fe2c55', LINE: '#06c755', X: '#000', Email: '#6366f1', 'Press Release': '#06b6d4' }[ch] || '#64748b';
                const on = form.channels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: on ? 700 : 400, border: `1px solid ${on ? chColor : 'rgba(0,0,0,0.1)'}`, background: on ? `${chColor}18` : 'transparent', color: on ? chColor : '#64748b' }}>
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          <button style={{ ...s.btn('#dc2626'), width: '100%', padding: '13px 24px', fontSize: 15, opacity: loading ? 0.7 : 1 }} onClick={generate} disabled={loading}>
            {loading ? '⏳ กำลังสร้าง PR Content...' : '🚀 สร้างสื่อ PR ทุกช่องทาง'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: 'grid', gap: 0 }}>
          {/* Header summary */}
          <div style={s.card({ background: 'linear-gradient(135deg,rgba(220,38,38,0.06),rgba(99,102,241,0.06))', borderColor: 'rgba(220,38,38,0.2)', marginBottom: 12 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>{result.headline}</div>
                <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>"{result.key_message}"</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>⏰ {result.best_post_time}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                  ✅ {result.source?.toUpperCase()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {result.hashtags?.map((h, i) => <span key={i} style={s.tag('#6366f1')}>{h}</span>)}
              <CopyBtn text={result.hashtags?.join(' ') || ''} small />
            </div>
          </div>

          {/* Facebook */}
          {result.facebook && (
            <ChannelCard icon="👥" name="Facebook" color="#1877f2">
              <TextField value={result.facebook.post} />
              <TextField value={result.facebook.cta} label="CTA" />
            </ChannelCard>
          )}

          {/* TikTok */}
          {result.tiktok && (
            <ChannelCard icon="▶️" name="TikTok" color="#fe2c55">
              <TextField value={result.tiktok.hook} label="Hook 3 วินาที" />
              <TextField value={result.tiktok.script} label="Script" />
              <TextField value={result.tiktok.caption} label="Caption + Hashtags" />
            </ChannelCard>
          )}

          {/* LINE */}
          {result.line && (
            <ChannelCard icon="💚" name="LINE Broadcast" color="#06c755">
              <TextField value={result.line.broadcast} />
              <TextField value={result.line.rich_menu_cta} label="ปุ่ม CTA" />
            </ChannelCard>
          )}

          {/* X / Twitter */}
          {result.x?.thread && (
            <ChannelCard icon="𝕏" name="X (Twitter Thread)" color="#000">
              {result.x.thread.map((tw, i) => (
                <TextField key={i} value={tw} label={`Tweet ${i + 1}`} />
              ))}
            </ChannelCard>
          )}

          {/* Email */}
          {result.email && (
            <ChannelCard icon="📧" name="Email Newsletter" color="#6366f1">
              <TextField value={result.email.subject} label="Subject Line" />
              <TextField value={result.email.preheader} label="Preheader" />
              <TextField value={result.email.body_intro} label="ย่อหน้าเปิด" />
              <TextField value={result.email.body_main} label="เนื้อหาหลัก" />
              <TextField value={result.email.cta_button} label="ปุ่ม CTA" />
            </ChannelCard>
          )}

          {/* Press Release */}
          {result.press_release && (
            <ChannelCard icon="📰" name="Press Release" color="#06b6d4">
              <TextField value={result.press_release.headline} label="Headline" />
              <TextField value={result.press_release.lead} label="Lead Paragraph" />
              <TextField value={result.press_release.quote} label="Quote" />
            </ChannelCard>
          )}

          {/* Image concept */}
          {result.image_concept && (
            <div style={s.card({ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' })}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#f59e0b', marginBottom: 6 }}>🎨 Creative Direction สำหรับทีม Design</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{result.image_concept}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: PR Calendar ────────────────────────────────────────────────────────
function TabCalendar({ plan, onPlanSave }) {
  const { showToast } = useToast();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(11); // December = 11
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({ topic: '', event_type: 'content' });
  const [showEdit, setShowEdit] = useState(false);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const dateKey = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isPlanDay = (d) => !!plan[dateKey(d)];
  const isLaunchDay = (d) => dateKey(d) === '2026-12-20';
  const isHoliday = (d) => ['2026-12-05', '2026-12-10', '2026-12-25', '2026-12-31'].includes(dateKey(d));

  const openEdit = (d) => {
    const key = dateKey(d);
    const existing = plan[key] || DEC_PRESETS[key] || {};
    setSelected(key);
    setEditForm({ topic: existing.topic || '', event_type: existing.event_type || 'content' });
    setShowEdit(true);
  };

  const savePlan = () => {
    if (!editForm.topic.trim()) { showToast('กรุณาใส่หัวข้อ', 'error'); return; }
    onPlanSave(selected, editForm);
    showToast('📅 บันทึกแผน PR แล้ว', 'success');
    setShowEdit(false);
  };

  const removePlan = (d) => {
    onPlanSave(dateKey(d), null);
    showToast('🗑 ลบแผนแล้ว', 'warn');
  };

  const evColor = (et) => EVENT_TYPES.find(e => e.id === et)?.color || '#6366f1';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)}
          style={{ ...s.btn('#475569'), padding: '8px 16px' }}>◀</button>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#1e293b' }}>
          {MONTHS_TH[month]} {year + 543}
          {month === 11 && year === 2026 && (
            <span style={{ marginLeft: 10, fontSize: 12, background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: 20, padding: '2px 10px', border: '1px solid rgba(220,38,38,0.3)' }}>
              🚀 Launch Month
            </span>
          )}
        </div>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)}
          style={{ ...s.btn('#475569'), padding: '8px 16px' }}>▶</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
        <span style={{ ...s.tag('#dc2626') }}>🚀 Launch</span>
        <span style={{ ...s.tag('#ec4899') }}>🎉 Holiday</span>
        <span style={{ ...s.tag('#6366f1') }}>📅 มีแผน PR</span>
        <span style={{ color: '#94a3b8' }}>• วันทั่วไป</span>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f8fafc' }}>
          {DAYS_TH.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{d}</div>
          ))}
        </div>
        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {/* Empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} style={{ minHeight: 72, borderTop: '1px solid rgba(0,0,0,0.05)' }} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const key = dateKey(d);
            const dayPlan = plan[key] || DEC_PRESETS[key];
            const launch = isLaunchDay(d);
            const holiday = isHoliday(d);
            const hasPlan = !!plan[key];
            return (
              <div key={d} onClick={() => openEdit(d)}
                style={{
                  minHeight: 72, padding: '8px 6px', borderTop: '1px solid rgba(0,0,0,0.05)',
                  borderLeft: (firstDay + d - 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                  cursor: 'pointer', background: launch ? 'rgba(220,38,38,0.06)' : holiday ? 'rgba(236,72,153,0.04)' : hasPlan ? 'rgba(99,102,241,0.04)' : 'transparent',
                  transition: 'background .15s',
                  position: 'relative',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 14, fontWeight: launch ? 900 : 600,
                    color: launch ? '#dc2626' : holiday ? '#ec4899' : hasPlan ? '#6366f1' : '#1e293b',
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', background: launch ? 'rgba(220,38,38,0.15)' : 'transparent',
                  }}>{d}</span>
                  {(hasPlan || DEC_PRESETS[key]) && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: evColor(dayPlan?.event_type), flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
                {dayPlan?.topic && (
                  <div style={{ fontSize: 9, color: evColor(dayPlan.event_type), lineHeight: 1.3, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {dayPlan.topic}
                  </div>
                )}
                {hasPlan && (
                  <button onClick={e => { e.stopPropagation(); removePlan(d); }}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 10 }}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--cols-2)', gap: 12 }}>
        <div style={s.card({ textAlign: 'center' })}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1' }}>{Object.keys(plan).filter(k => k.startsWith('2026-12')).length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>วันที่มีแผน PR</div>
        </div>
        <div style={s.card({ textAlign: 'center' })}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>20</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Launch Day (20/12)</div>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ ...s.card({ maxWidth: 460, width: '100%' }) }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📅 แผน PR — {selected}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={s.label}>หัวข้อ/กิจกรรม *</label>
                <input style={s.input} placeholder="เช่น Launch Day, โปรลดราคา, วันหยุด" value={editForm.topic} onChange={e => setEditForm(f => ({ ...f, topic: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>ประเภท</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {EVENT_TYPES.map(ev => (
                    <button key={ev.id} onClick={() => setEditForm(f => ({ ...f, event_type: ev.id }))}
                      style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600, border: `1px solid ${editForm.event_type === ev.id ? ev.color : 'rgba(0,0,0,0.1)'}`, background: editForm.event_type === ev.id ? `${ev.color}15` : 'transparent', color: editForm.event_type === ev.id ? ev.color : '#64748b' }}>
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...s.btn('#6366f1'), flex: 1 }} onClick={savePlan}>💾 บันทึก</button>
                <button style={{ ...s.btn('#94a3b8'), padding: '11px 20px' }} onClick={() => setShowEdit(false)}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Bulk Month ────────────────────────────────────────────────────────
function TabBulk({ plan, onPlanSave }) {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, done: [] });
  const [results, setResults] = useState({});

  const presetDays = Object.entries(DEC_PRESETS);

  const generateAll = async () => {
    setGenerating(true);
    setProgress({ current: 0, total: presetDays.length, done: [] });
    const newResults = {};
    for (let i = 0; i < presetDays.length; i++) {
      const [date, preset] = presetDays[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      try {
        const res = await fetch(apiUrl('/api/pr/daily-content'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, ...preset, product: 'Openthai.ai', tone: 'สนุก/กระตุ้น', audience: 'นักการตลาด, SME ไทย' }),
        });
        const d = await res.json();
        newResults[date] = d;
        onPlanSave(date, { ...preset, generated: true });
        setProgress(p => ({ ...p, done: [...p.done, date] }));
      } catch {
        newResults[date] = { error: true };
      }
      // small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 600));
    }
    setResults(newResults);
    setGenerating(false);
    showToast(`✅ สร้าง PR Content ${presetDays.length} วันเสร็จแล้ว!`, 'success');
  };

  const exportAll = () => {
    const lines = Object.entries(results).map(([date, r]) => {
      if (r.error) return `### ${date}\n❌ Error\n`;
      return `### ${date} — ${r.topic || ''}\n\n**Headline:** ${r.headline || ''}\n\n**Facebook:**\n${r.facebook?.post || ''}\n\n**TikTok Hook:** ${r.tiktok?.hook || ''}\n\n**LINE:** ${r.line?.broadcast || ''}\n\n**Email Subject:** ${r.email?.subject || ''}\n\n---\n`;
    }).join('\n');
    const blob = new Blob([`# PR Content Plan — ธันวาคม 2026\n\n${lines}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'PR-Plan-December-2026.md'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={s.card({ background: 'linear-gradient(135deg,rgba(220,38,38,0.04),rgba(99,102,241,0.04))', borderColor: 'rgba(220,38,38,0.15)' })}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 8 }}>📦 สร้าง PR Content ทั้งเดือนธันวาคม</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          สร้าง PR ครบทุกช่องทางสำหรับ <strong>{presetDays.length} วันสำคัญ</strong> รวม 🚀 Launch Day 20/12 · วันพ่อ 5/12 · วันรัฐธรรมนูญ 10/12 · คริสต์มาส 25/12 · ส่งท้ายปี 31/12
        </div>

        {generating && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>⏳ กำลังสร้าง...</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8 }}>
              <div style={{ background: 'linear-gradient(90deg,#dc2626,#6366f1)', height: 8, borderRadius: 20, width: `${(progress.current / progress.total) * 100}%`, transition: 'width .5s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ ...s.btn('#dc2626'), flex: 1, padding: '13px 0', fontSize: 14, opacity: generating ? 0.7 : 1 }}
            onClick={generateAll} disabled={generating}>
            {generating ? `⏳ ${progress.current}/${progress.total}...` : '🚀 สร้าง PR ทั้งเดือน'}
          </button>
          {Object.keys(results).length > 0 && (
            <button style={{ ...s.btn('#10b981'), padding: '13px 20px' }} onClick={exportAll}>
              ⬇️ Export .md
            </button>
          )}
        </div>
      </div>

      {/* Preset list */}
      <div style={{ display: 'grid', gap: 10 }}>
        {presetDays.map(([date, preset]) => {
          const done = !!results[date];
          const evColor = EVENT_TYPES.find(e => e.id === preset.event_type)?.color || '#6366f1';
          return (
            <div key={date} style={s.card({ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14 })}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${evColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: evColor }}>{date.slice(8)}/12</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{preset.topic}</div>
                <span style={s.tag(evColor)}>{EVENT_TYPES.find(e => e.id === preset.event_type)?.label}</span>
              </div>
              {done && (
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✅ สร้างแล้ว</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Results accordion */}
      {Object.keys(results).length > 0 && (
        <div style={s.card()}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📋 สรุปผลลัพธ์ทั้งหมด</div>
          {Object.entries(results).map(([date, r]) => (
            <div key={date} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{date.slice(8)}/12</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{r.headline || r.topic}</span>
                </div>
                {!r.error && r.facebook?.post && <CopyBtn text={r.facebook.post} small />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'generate', icon: '🤖', label: 'สร้างรายวัน' },
  { id: 'calendar', icon: '📅', label: 'ปฏิทิน PR' },
  { id: 'bulk',     icon: '📦', label: 'สร้างทั้งเดือน' },
];

export default function DailyPRPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState('generate');
  const [plan, setPlan] = useState({});

  // Load plan from API
  useEffect(() => {
    document.title = 'Daily PR — Openthai.ai';
    fetch(apiUrl('/api/pr/daily-plan'))
      .then(r => r.json())
      .then(d => { if (d.plan) setPlan(d.plan); })
      .catch(() => {});
  }, []);

  const handlePlanSave = useCallback((date, data) => {
    setPlan(prev => {
      const next = { ...prev };
      if (data === null) { delete next[date]; } else { next[date] = { ...next[date], ...data }; }
      return next;
    });
    // sync to server (fire-and-forget)
    fetch(apiUrl('/api/pr/daily-plan'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, data }),
    }).catch(() => {});
  }, []);

  const daysPlanned = Object.keys(plan).filter(k => k.startsWith('2026-12')).length;
  const totalDays   = Object.keys(DEC_PRESETS).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b' }}>📣 Daily PR Creator</div>
            <span style={{ fontSize: 11, background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: 20, padding: '2px 10px', border: '1px solid rgba(220,38,38,0.3)', fontWeight: 700 }}>🚀 Launch 20/12</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>สร้างสื่อ PR ครบทุกช่องทาง · ปฏิทินธันวาคม · Bulk Generate</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#6366f1' }}>{daysPlanned}</span>/{totalDays} วันวางแผนแล้ว
          </div>
          <button onClick={() => navigate('/skills')} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>AI Skills</button>
        </div>
      </header>

      {/* Countdown to 20/12 */}
      {(() => {
        const launch = new Date('2026-12-20');
        const now = new Date();
        const diff = Math.ceil((launch - now) / (1000 * 60 * 60 * 24));
        if (diff <= 0 || diff > 90) return null;
        return (
          <div style={{ background: 'linear-gradient(135deg,#dc2626,#7f1d1d)', padding: '10px 5%', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>
              🚀 อีก <strong style={{ fontSize: 20 }}>{diff}</strong> วัน สู่ Launch Day 20/12
              <span style={{ marginLeft: 12, opacity: 0.8, fontSize: 11 }}>openthai-ai.com</span>
            </span>
          </div>
        );
      })()}

      {/* Tab Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 5%', display: 'flex', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '13px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#dc2626' : 'transparent'}`, color: tab === t.id ? '#dc2626' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all .2s', minHeight: 44 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 5% 0' }}>
        {tab === 'generate' && <TabGenerate plan={plan} onPlanSave={handlePlanSave} />}
        {tab === 'calendar' && <TabCalendar plan={plan} onPlanSave={handlePlanSave} />}
        {tab === 'bulk'     && <TabBulk plan={plan} onPlanSave={handlePlanSave} />}
      </div>
    </div>
  );
}
