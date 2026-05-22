import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const PLATFORMS = ['TikTok', 'YouTube Shorts', 'Instagram Reels', 'Facebook Reels', 'LINE'];
const STYLES    = [
  { value: 'sales',         label: '💰 ขายตรง' },
  { value: 'educational',   label: '📚 สอน/ให้ข้อมูล' },
  { value: 'entertainment', label: '😄 ความบันเทิง' },
  { value: 'review',        label: '⭐ รีวิวสินค้า' },
  { value: 'story',         label: '📖 เล่าเรื่อง' },
];
const DURATIONS = [15, 30, 60, 90];
const PROVIDERS = [
  { value: 'mock',   label: '🔧 Script Only (Free)',    desc: 'สร้าง Script + Storyboard ไม่ต้องมี API Key' },
  { value: 'runway', label: '✈️ RunwayML Gen-3',         desc: 'คุณภาพสูง, ต้องมี API Key' },
  { value: 'pika',   label: '🎬 Pika Labs 2.2',          desc: 'สร้างเร็ว, สไตล์ทันสมัย' },
  { value: 'kling',  label: '🎯 Kling AI 1.6',           desc: 'ดีสำหรับสินค้าไทย' },
  { value: 'luma',   label: '💡 Luma Dream Machine',     desc: 'Realistic, คุณภาพสูงสุด' },
];

const VideoGeneratorPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    product: '', description: '', platform: 'TikTok',
    style: 'sales', duration: 30, provider: 'mock', lang: 'ภาษาไทย',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.product.trim()) { setError('กรุณาใส่ชื่อสินค้าก่อน'); return; }
    setError(''); setLoading(true); setResult(null); setJobStatus(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(apiUrl('/api/video/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      setResult(data.script);
      setJobStatus(data.job);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = s => {
    const n = parseFloat(s);
    if (n >= 9) return '#10b981';
    if (n >= 7) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>← กลับ</button>
        <span style={{ fontSize: '24px' }}>🎬</span>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>AI Video Generator</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#a0a0b0' }}>สร้างวีดีโอขายสินค้าด้วย AI · RunwayML · Pika · Kling · Luma</p>
        </div>
        <span style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>NEW</span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>

        {/* Form Panel */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700 }}>⚙️ ตั้งค่าวีดีโอ</h2>

          {/* Product */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>ชื่อสินค้า *</label>
          <input value={form.product} onChange={e => set('product', e.target.value)}
            placeholder="เช่น น้ำพริกป้าแดง, ผ้าไหมอุบล, ครีมขมิ้น..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px' }} />

          {/* Description */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>รายละเอียดเพิ่มเติม</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="จุดเด่น, กลุ่มเป้าหมาย, โปรโมชั่น..."
            rows={3}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none', marginBottom: '16px' }} />

          {/* Platform */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '8px' }}>แพลตฟอร์ม</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => set('platform', p)}
                style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid', borderColor: form.platform === p ? '#6366f1' : 'rgba(255,255,255,0.15)', background: form.platform === p ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.platform === p ? '#a5b4fc' : '#d0d0e0', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                {p}
              </button>
            ))}
          </div>

          {/* Style */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '8px' }}>สไตล์คอนเทนต์</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {STYLES.map(s => (
              <button key={s.value} onClick={() => set('style', s.value)}
                style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid', borderColor: form.style === s.value ? '#10b981' : 'rgba(255,255,255,0.15)', background: form.style === s.value ? 'rgba(16,185,129,0.2)' : 'transparent', color: form.style === s.value ? '#6ee7b7' : '#d0d0e0', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Duration */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '8px' }}>ความยาว (วินาที)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {DURATIONS.map(d => (
              <button key={d} onClick={() => set('duration', d)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid', borderColor: form.duration === d ? '#f59e0b' : 'rgba(255,255,255,0.15)', background: form.duration === d ? 'rgba(245,158,11,0.2)' : 'transparent', color: form.duration === d ? '#fcd34d' : '#d0d0e0', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {d}s
              </button>
            ))}
          </div>

          {/* Provider */}
          <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '8px' }}>Video AI Provider</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            {PROVIDERS.map(p => (
              <button key={p.value} onClick={() => set('provider', p.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid', borderColor: form.provider === p.value ? '#6366f1' : 'rgba(255,255,255,0.1)', background: form.provider === p.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.label}</div>
                <div style={{ fontSize: '11px', color: '#a0a0b0', marginTop: '2px' }}>{p.desc}</div>
              </button>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '12px' }}>{error}</div>}

          <button onClick={handleGenerate} disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {loading ? '🎬 กำลังสร้าง Script...' : '🎬 สร้าง Video Script'}
          </button>
        </div>

        {/* Result Panel */}
        <div>
          {!result && !loading && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎬</div>
              <h3 style={{ color: '#a0a0b0', fontWeight: 400 }}>กรอกข้อมูลสินค้าและกด "สร้าง Video Script"</h3>
              <p style={{ color: '#606070', fontSize: '14px' }}>AI จะสร้าง Script, Storyboard, Scene-by-scene พร้อม Prompt สำหรับ Video AI</p>
            </div>
          )}

          {loading && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>🎬</div>
              <h3 style={{ color: '#a5b4fc' }}>AI กำลังสร้าง Video Script...</h3>
              <p style={{ color: '#7c7c9a', fontSize: '13px' }}>วิเคราะห์สินค้า · เขียน Script · สร้าง Storyboard · Generate Prompt</p>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header card */}
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '18px' }}>{result.title}</h2>
                    <p style={{ margin: 0, color: '#a0a0b0', fontSize: '13px' }}>🎯 {result.hook_text}</p>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '10px 16px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: scoreColor(result.criticScore) }}>{result.criticScore}</div>
                    <div style={{ fontSize: '10px', color: '#a0a0b0' }}>AI Score</div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {result.hashtags?.map(h => (
                    <span key={h} style={{ background: 'rgba(99,102,241,0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', color: '#a5b4fc' }}>{h}</span>
                  ))}
                </div>
              </div>

              {/* Scenes */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>🎥 Storyboard</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {result.scenes?.map(scene => (
                    <div key={scene.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '40px 1fr', gap: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ background: 'rgba(99,102,241,0.2)', borderRadius: '8px', padding: '4px', fontSize: '13px', fontWeight: 700, color: '#a5b4fc' }}>{scene.id}</div>
                        <div style={{ fontSize: '11px', color: '#606070', marginTop: '4px' }}>{scene.duration_sec}s</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>📹 {scene.camera}</div>
                        <div style={{ fontSize: '13px', color: '#d0d0e0', marginBottom: '6px' }}>{scene.voiceover}</div>
                        <div style={{ fontSize: '11px', color: '#606070', fontStyle: 'italic' }}>Visual: {scene.visual}</div>
                        {scene.on_screen_text && <div style={{ marginTop: '4px', background: 'rgba(245,158,11,0.15)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#fcd34d', display: 'inline-block' }}>{scene.on_screen_text}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Prompt + Caption */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>🤖 Video AI Prompt (EN)</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#d0d0e0', lineHeight: 1.6 }}>{result.video_prompt_en}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>📝 Caption</div>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#d0d0e0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{result.caption}</p>
                  <div style={{ fontSize: '12px', color: '#10b981' }}>🎯 CTA: {result.cta}</div>
                </div>
              </div>

              {/* Job Status */}
              {jobStatus && (
                <div style={{ background: jobStatus.provider === 'mock' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${jobStatus.provider === 'mock' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    {jobStatus.provider === 'mock' ? '🔧 Script Mode — ไม่มี API Key' : `✅ ส่งไป ${jobStatus.provider} แล้ว — Job ID: ${jobStatus.job_id}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0a0b0' }}>
                    {jobStatus.message || `สถานะ: ${jobStatus.status} · ETA: ~${jobStatus.eta_seconds}s`}
                  </div>
                  {jobStatus.preview_url && (
                    <a href={jobStatus.preview_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '8px', color: '#6ee7b7', fontSize: '13px' }}>
                      ▶ ดูวีดีโอ →
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setResult(null); setJobStatus(null); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>
                  🔄 สร้างใหม่
                </button>
                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  📋 Copy Script JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VideoGeneratorPage;
