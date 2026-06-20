import React, { useState, useEffect, useCallback } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';
import { useNavigate } from 'react-router-dom';

const TABS = ['Press Releases', 'Media Contacts', 'Campaigns', 'KOL', 'Crisis Plan', 'Newsletter', '🤖 Auto-PR'];

const statusColor = s => ({ published: '#10b981', draft: '#f59e0b', archived: '#6b7280', active: '#10b981', planning: '#6366f1', completed: '#8b5cf6' }[s] || '#6b7280');
const tierBadge   = t => ({ 1: '#ef4444', 2: '#f59e0b', 3: '#6b7280' }[t] || '#6b7280');

const PR_TYPES = [
  { value: 'platform_announcement', label: 'ประกาศแพลตฟอร์ม', emoji: '🚀', desc: 'ข่าวสาร อัปเดต และความก้าวหน้าของ OpenThaiAi' },
  { value: 'customer_success',      label: 'เรื่องราวลูกค้า',  emoji: '⭐', desc: 'ความสำเร็จของลูกค้าที่ใช้ OpenThaiAi' },
  { value: 'producer_spotlight',    label: 'ไฮไลต์ผู้ผลิต',   emoji: '🌟', desc: 'ผู้ผลิต OTOP/SME ที่โดดเด่นในเครือข่าย' },
  { value: 'campaign_launch',       label: 'เปิดตัวแคมเปญ',   emoji: '📣', desc: 'แคมเปญการตลาดและโปรโมชั่นใหม่' },
  { value: 'product_update',        label: 'อัปเดตฟีเจอร์',   emoji: '✨', desc: 'ฟีเจอร์ใหม่และการปรับปรุงแพลตฟอร์ม' },
  { value: 'press_release',         label: 'Press Release',    emoji: '📰', desc: 'ข่าวประชาสัมพันธ์อย่างเป็นทางการ' },
];

const LANGS = [
  { value: 'th', label: '🇹🇭 ไทย' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'zh', label: '🇨🇳 中文' },
];

const CHANNELS = [
  { value: 'line',     label: 'LINE', emoji: '💬', color: '#00b900' },
  { value: 'slack',    label: 'Slack',emoji: '🔔', color: '#6366f1' },
  { value: 'facebook', label: 'Facebook', emoji: '📘', color: '#1877f2' },
];

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60)   return 'เมื่อกี้';
  if (d < 3600) return `${Math.floor(d/60)} นาทีที่แล้ว`;
  if (d < 86400)return `${Math.floor(d/3600)} ชม.ที่แล้ว`;
  return `${Math.floor(d/86400)} วันที่แล้ว`;
}

const card = (style = {}) => ({
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', padding: '18px', ...style,
});

// ── Auto-PR Panel ─────────────────────────────────────────────────────────────
function AutoPRPanel() {
  const [prType, setPrType]         = useState('platform_announcement');
  const [topic, setTopic]           = useState('');
  const [lang, setLang]             = useState('th');
  const [channels, setChannels]     = useState(['slack']);
  const [generating, setGenerating] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [preview, setPreview]       = useState(null);
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [autoQueue, setAutoQueue]   = useState([]);
  const [schedType, setSchedType]   = useState('');
  const [schedTime, setSchedTime]   = useState('');
  const [toast, setToast]           = useState('');
  const navigate = useNavigate();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadLogs = useCallback(async () => {
    const h = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
    const [logR, queueR] = await Promise.allSettled([
      fetch(apiUrl('/api/corporate/pr/broadcast-log'), { headers: h }).then(r => r.json()),
      fetch(apiUrl('/api/corporate/pr/auto-queue'),    { headers: h }).then(r => r.json()),
    ]);
    if (logR.value?.success)   setBroadcastLog(logR.value.data || []);
    if (queueR.value?.success) setAutoQueue(queueR.value.data || []);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const toggleChannel = (ch) => setChannels(prev =>
    prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
  );

  const generate = async () => {
    setGenerating(true); setPreview(null);
    try {
      const res = await fetch(apiUrl('/api/corporate/pr/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ type: prType, topic, lang }),
      });
      const data = await res.json();
      if (data.success) setPreview(data.data);
      else showToast('❌ สร้างไม่สำเร็จ: ' + data.error);
    } catch (e) { showToast('❌ ' + e.message); }
    setGenerating(false);
  };

  const broadcast = async () => {
    if (!preview) return;
    if (channels.length === 0) { showToast('⚠️ เลือกช่องทางก่อน'); return; }
    setBroadcasting(true);
    try {
      const res = await fetch(apiUrl('/api/corporate/pr/broadcast'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ content: preview, channels }),
      });
      const data = await res.json();
      if (data.success) {
        const ok = data.results?.filter(r => r.ok).map(r => r.channel).join(', ');
        showToast(`✅ กระจายสำเร็จ: ${ok || 'ดำเนินการแล้ว'}`);
        loadLogs();
      } else {
        showToast('❌ ' + data.error);
      }
    } catch (e) { showToast('❌ ' + e.message); }
    setBroadcasting(false);
  };

  const sendToAutoPost = () => {
    if (!preview) return;
    sessionStorage.setItem('autopost_draft', JSON.stringify({ product: 'Openthai.ai PR', angle: 'story' }));
    sessionStorage.setItem('autopost_draft_content', JSON.stringify({
      hook: preview.headline,
      body: preview.body?.slice(0, 400) || preview.subheadline,
      hashtags: (preview.hashtags || []).join(' '),
      cta: preview.cta || '',
    }));
    navigate('/autopost');
  };

  const addSchedule = async () => {
    if (!schedType || !schedTime) { showToast('⚠️ กรอกประเภทและเวลาก่อน'); return; }
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
    await fetch(apiUrl('/api/corporate/pr/auto-queue'), {
      method: 'POST', headers: h,
      body: JSON.stringify({ type: schedType, scheduledAt: schedTime, lang, topic }),
    });
    showToast('✅ เพิ่มตารางสำเร็จ');
    setSchedTime(''); loadLogs();
  };

  const removeSchedule = async (id) => {
    const h = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
    await fetch(apiUrl(`/api/corporate/pr/auto-queue/${id}`), { method: 'DELETE', headers: h });
    loadLogs();
  };

  const selectedType = PR_TYPES.find(t => t.value === prType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#1e293b', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '10px', padding: '12px 20px', zIndex: 9999, color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '16px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>⚔️</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#a5b4fc' }}>ดาบอายาสิทธิ์ — AI PR Engine</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>สร้างและกระจาย PR อัตโนมัติสำหรับ OpenThaiAi · ลูกค้า · ผู้ผลิต</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
          {[
            { label: 'กระจายแล้ว', value: broadcastLog.length, emoji: '📡' },
            { label: 'ในคิว', value: autoQueue.filter(q => q.status === 'pending').length, emoji: '⏰' },
            { label: 'ช่องทาง', value: '3', emoji: '📣' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#a5b4fc' }}>{s.emoji} {s.value}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Left: Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={card()}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '12px' }}>1. เลือกประเภท PR</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PR_TYPES.map(t => (
                <button key={t.value} onClick={() => setPrType(t.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${prType === t.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, background: prType === t.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', marginBottom: '3px' }}>{t.emoji}</div>
                  <div style={{ fontSize: '12px', fontWeight: prType === t.value ? 700 : 400, color: prType === t.value ? '#a5b4fc' : '#9ca3af' }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={card()}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '12px' }}>2. หัวข้อ / บริบท</div>
            <textarea
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={`${selectedType?.emoji} ${selectedType?.desc || 'ใส่หัวข้อหรือบริบทเพิ่มเติม (ไม่บังคับ)'}`}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={card()}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '12px' }}>3. ภาษา</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {LANGS.map(l => (
                <button key={l.value} onClick={() => setLang(l.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${lang === l.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, background: lang === l.value ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: lang === l.value ? 700 : 400, color: lang === l.value ? '#a5b4fc' : '#9ca3af' }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={generating}
            style={{ padding: '14px', borderRadius: '12px', border: 'none', background: generating ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? '🤖 AI กำลังสร้าง PR...' : '⚔️ เสกสรรค์ PR ทันที'}
          </button>
        </div>

        {/* Right: Preview + Broadcast */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!preview ? (
            <div style={{ ...card({ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', minHeight: '300px' }), color: '#4b5563' }}>
              <span style={{ fontSize: '48px' }}>⚔️</span>
              <div style={{ fontSize: '14px' }}>กด "เสกสรรค์ PR ทันที"</div>
              <div style={{ fontSize: '12px' }}>AI จะสร้างเนื้อหา PR ครบทุกรูปแบบให้อัตโนมัติ</div>
            </div>
          ) : (
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '20px' }}>{PR_TYPES.find(t => t.value === preview.type)?.emoji}</span>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#e2e8f0', lineHeight: 1.3 }}>{preview.headline}</div>
                  <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '2px' }}>{preview.subheadline}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.7, marginBottom: '12px', maxHeight: '140px', overflow: 'auto' }}>
                {preview.body}
              </div>

              {preview.quote && (
                <div style={{ background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid rgba(99,102,241,0.4)', borderRadius: '0 8px 8px 0', padding: '10px 12px', fontSize: '12px', color: '#a5b4fc', fontStyle: 'italic', marginBottom: '12px' }}>
                  {preview.quote}
                </div>
              )}

              <div style={{ background: 'rgba(0,185,0,0.08)', border: '1px solid rgba(0,185,0,0.15)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#00b900', fontWeight: 700, marginBottom: '4px' }}>💬 LINE Message</div>
                <div style={{ fontSize: '12px', color: '#d1d5db', lineHeight: 1.6 }}>{preview.line_message}</div>
              </div>

              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#a5b4fc', fontWeight: 700, marginBottom: '4px' }}>📱 Social Post</div>
                <div style={{ fontSize: '12px', color: '#d1d5db', lineHeight: 1.6 }}>{preview.social_post}</div>
              </div>

              {(preview.key_messages || []).length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, marginBottom: '6px' }}>Key Messages</div>
                  {preview.key_messages.map((m, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '3px' }}>✅ {m}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {(preview.hashtags || []).map(h => (
                  <span key={h} style={{ fontSize: '10px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '10px' }}>{h}</span>
                ))}
              </div>

              {/* Channel selector */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px' }}>เลือกช่องทางกระจาย</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {CHANNELS.map(ch => (
                  <button key={ch.value} onClick={() => toggleChannel(ch.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${channels.includes(ch.value) ? ch.color : 'rgba(255,255,255,0.07)'}`, background: channels.includes(ch.value) ? `${ch.color}20` : 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: channels.includes(ch.value) ? 700 : 400, color: channels.includes(ch.value) ? ch.color : '#6b7280' }}>
                    {ch.emoji} {ch.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={broadcast} disabled={broadcasting}
                  style={{ padding: '11px', borderRadius: '10px', border: 'none', background: broadcasting ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.8)', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: broadcasting ? 'not-allowed' : 'pointer' }}>
                  {broadcasting ? '📡 กำลังส่ง...' : '📡 กระจายทันที'}
                </button>
                <button onClick={sendToAutoPost}
                  style={{ padding: '11px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ⚡ ส่ง AutoPost
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Auto-PR */}
      <div style={card()}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc', marginBottom: '14px' }}>⏰ ตั้งเวลา Auto-PR</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>ประเภท</div>
            <select value={schedType} onChange={e => setSchedType(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 10px', fontSize: '13px', outline: 'none' }}>
              <option value="">-- เลือกประเภท --</option>
              {PR_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>วันเวลา</div>
            <input type="datetime-local" value={schedTime} onChange={e => setSchedTime(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={addSchedule}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(99,102,241,0.6)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + เพิ่ม
          </button>
        </div>

        {autoQueue.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>คิวที่รอ ({autoQueue.length})</div>
            {autoQueue.map(q => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '16px' }}>{PR_TYPES.find(t => t.value === q.type)?.emoji || '📣'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#d1d5db' }}>{PR_TYPES.find(t => t.value === q.type)?.label || q.type}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{q.scheduledAt ? new Date(q.scheduledAt).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}</div>
                </div>
                <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{q.status}</span>
                <button onClick={() => removeSchedule(q.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Log */}
      {broadcastLog.length > 0 && (
        <div style={card()}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc', marginBottom: '14px' }}>📡 ประวัติการกระจาย</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflow: 'auto' }}>
            {broadcastLog.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px' }}>{PR_TYPES.find(t => t.value === log.type)?.emoji || '📣'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.headline}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {(log.channels || []).map(ch => CHANNELS.find(c => c.value === ch)?.emoji + ' ' + ch).join(' · ')} · {timeAgo(log.ts)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(log.results || []).map((r, i) => (
                    <span key={i} style={{ fontSize: '10px', background: r.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: r.ok ? '#6ee7b7' : '#f87171', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                      {r.ok ? '✅' : '❌'} {r.channel}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-schedule notice */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 700, marginBottom: '6px' }}>⚔️ ตารางเสกสรรค์อัตโนมัติ (Built-in)</div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { day: 'จันทร์', time: '09:00', type: '🚀 Platform Update' },
            { day: 'พุธ',   time: '10:00', type: '🌟 Producer Spotlight' },
            { day: 'ศุกร์', time: '15:00', type: '⭐ Customer Success' },
          ].map((s, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#6b7280' }}>
              <span style={{ color: '#9ca3af', fontWeight: 600 }}>{s.day} {s.time}</span> — {s.type}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '6px' }}>สร้างอัตโนมัติ → กระจาย Slack ทุกสัปดาห์</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const PRCommsPage = () => {
  const [tab, setTab]           = useState(0);
  const [releases, setReleases] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [kols, setKols]         = useState([]);
  const [crisis, setCrisis]     = useState(null);
  const [newsletters, setNewsletters] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/corporate/pr/releases')).then(r => r.json()).then(d => setReleases(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/contacts')).then(r => r.json()).then(d => setContacts(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/campaigns')).then(r => r.json()).then(d => setCampaigns(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/kols')).then(r => r.json()).then(d => setKols(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/crisis')).then(r => r.json()).then(d => setCrisis(d.data)).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/newsletters')).then(r => r.json()).then(d => setNewsletters(d.data)).catch(() => {});
  }, []);

  return (
    <CorporateLayout title="📣 PR & Global Communications" subtitle="Press Room · Media Center · KOL · Crisis · Newsletter · AI Auto-PR">

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Press Releases', value: releases.length, sub: `${releases.filter(r => r.status === 'published').length} Published`, color: '#6366f1' },
          { label: 'Media Outlets', value: contacts.length, sub: `${contacts.filter(c => c.tier === 1).length} Tier 1`, color: '#10b981' },
          { label: 'Campaigns', value: campaigns.length, sub: `${campaigns.filter(c => c.status === 'active').length} Active`, color: '#f59e0b' },
          { label: 'KOL Partners', value: kols.length, sub: `${kols.filter(k => k.status === 'active').length} Active`, color: '#fe2c55' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '30px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: i === 6 ? `1px solid rgba(99,102,241,${tab === 6 ? '0.5' : '0.2'})` : 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: tab === i ? 700 : 400, background: tab === i ? (i === 6 ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)') : (i === 6 ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.05)'), color: tab === i ? '#a5b4fc' : '#9ca3af' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Press Releases */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {releases.map(r => (
            <div key={r.id} style={card({ display: 'flex', gap: '16px', alignItems: 'flex-start' })}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>{r.title}</span>
                  <span style={{ fontSize: '10px', background: `${statusColor(r.status)}20`, color: statusColor(r.status), padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>{r.status}</span>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', padding: '2px 6px', borderRadius: '6px' }}>{r.category}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6366f1', marginBottom: '4px' }}>{r.titleEN}</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>{r.summary}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(r.languages || []).map(l => (
                    <span key={l} style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{l.toUpperCase()}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.date}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{r.views} views</div>
              </div>
            </div>
          ))}
          <button onClick={() => setTab(6)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px dashed rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
            ⚔️ สร้าง Press Release ด้วย AI Auto-PR
          </button>
        </div>
      )}

      {/* Tab: Media Contacts */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {contacts.map(c => (
              <div key={c.id} style={card({ display: 'flex', gap: '14px', alignItems: 'center' })}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${tierBadge(c.tier)}20`, border: `1px solid ${tierBadge(c.tier)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📰</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '2px' }}>{c.outlet}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{c.beat} · {c.country}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</div>
                </div>
                <span style={{ fontSize: '10px', background: `${tierBadge(c.tier)}20`, color: tierBadge(c.tier), padding: '3px 8px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>T{c.tier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Global Campaigns */}
      {tab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {campaigns.map(c => (
            <div key={c.id} style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{c.name}</span>
                  <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '10px' }}>{c.nameLocal}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', background: '#1e3a5f', color: '#60a5fa', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{c.region}</span>
                  <span style={{ fontSize: '11px', background: `${statusColor(c.status)}20`, color: statusColor(c.status), padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{c.status}</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px', fontStyle: 'italic' }}>"{c.message}"</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(c.channels || []).map(ch => (
                  <span key={ch} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', color: '#d1d5db', padding: '3px 8px', borderRadius: '8px' }}>{ch}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: 'Reach', value: (c.kpi?.reach || 0).toLocaleString(), target: (c.kpi?.target_reach || 0).toLocaleString() },
                  { label: 'Engagement', value: (c.kpi?.engagement || 0).toLocaleString(), target: '-' },
                  { label: 'Leads', value: (c.kpi?.leads || 0).toLocaleString(), target: '-' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#a5b4fc' }}>{k.value}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{k.label} / target: {k.target}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>{c.startDate} → {c.endDate}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: KOL Management */}
      {tab === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {kols.map(k => (
            <div key={k.id} style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{k.name}</div>
                <span style={{ fontSize: '10px', background: `${tierBadge(k.tier)}20`, color: tierBadge(k.tier), padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>T{k.tier}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '8px' }}>{k.platform}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#d1d5db', padding: '2px 8px', borderRadius: '8px' }}>{k.followers}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#d1d5db', padding: '2px 8px', borderRadius: '8px' }}>{k.niche}</span>
                <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '8px' }}>{k.region}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', background: `${statusColor(k.status)}20`, color: statusColor(k.status), padding: '2px 10px', borderRadius: '10px', fontWeight: 700 }}>{k.status}</span>
                <button style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>ติดต่อ</button>
              </div>
            </div>
          ))}
          <div style={{ ...card(), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)', color: '#4b5563', minHeight: '120px' }}>
            <span style={{ fontSize: '28px' }}>+</span>
            <span style={{ fontSize: '13px' }}>เพิ่ม KOL ใหม่</span>
          </div>
        </div>
      )}

      {/* Tab: Crisis Communication */}
      {tab === 4 && crisis && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {crisis.levels.map(l => (
              <div key={l.level} style={{ background: `${l.color}10`, border: `2px solid ${l.color}40`, borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: l.color }}>L{l.level}</span>
                  <span style={{ fontSize: '11px', background: `${l.color}20`, color: l.color, padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>{l.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{l.desc}</div>
                <div style={{ fontSize: '11px', color: l.color, fontWeight: 700 }}>⏱ {l.response_time}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{l.owner}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Holding Statements (3 ภาษา)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {[
              { lang: '🇹🇭 TH', text: crisis.holding_statements?.th, color: '#3b82f6' },
              { lang: '🇬🇧 EN', text: crisis.holding_statements?.en, color: '#10b981' },
              { lang: '🇨🇳 ZH', text: crisis.holding_statements?.zh, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={card({ borderLeft: `3px solid ${s.color}` })}>
                <div style={{ fontSize: '11px', color: s.color, fontWeight: 700, marginBottom: '6px' }}>{s.lang}</div>
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.6 }}>{s.text}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Emergency Contacts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {crisis.contacts.map((c, i) => (
              <div key={i} style={card()}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{c.role}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{c.phone}</div>
                <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>{c.email}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Newsletter */}
      {tab === 5 && newsletters && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'สมาชิก TH', value: newsletters.subscribers?.th || 0, color: '#3b82f6' },
              { label: 'สมาชิก EN', value: newsletters.subscribers?.en || 0, color: '#10b981' },
              { label: 'สมาชิก ZH', value: newsletters.subscribers?.zh || 0, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Newsletter Templates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(newsletters.templates || []).map(t => (
              <div key={t.id} style={card({ display: 'flex', alignItems: 'center', gap: '14px' })}>
                <div style={{ fontSize: '28px' }}>📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', padding: '2px 8px', borderRadius: '6px' }}>{t.freq}</span>
                    {(t.lang || []).map(l => <span key={l} style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px' }}>{l.toUpperCase()}</span>)}
                  </div>
                </div>
                <span style={{ fontSize: '11px', background: `${statusColor(t.status)}20`, color: statusColor(t.status), padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: AI Auto-PR */}
      {tab === 6 && <AutoPRPanel />}

    </CorporateLayout>
  );
};

export default PRCommsPage;
