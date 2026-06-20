import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const TRUTH_ANGLES = [
  { id: 'roi',        label: '💰 ROI จริง', desc: 'แสดงตัวเลขที่ผู้ใช้ได้จริง เช่น ประหยัดเวลา X ชม./วัน ทำรายได้เพิ่ม Y บาท/เดือน' },
  { id: 'howworks',   label: '⚙️ อธิบายวิธีทำงาน', desc: 'อธิบาย AI ทำอะไรให้ชัดเจน ไม่มีศัพท์เทคนิค เข้าใจใน 30 วินาที' },
  { id: 'compare',    label: '⚖️ เทียบกับทางเลือก', desc: 'เปรียบเทียบ vs จ้างคนเขียน vs เครื่องมืออื่น — ราคาและคุณภาพ' },
  { id: 'proof',      label: '📊 หลักฐานจริง', desc: 'ยกตัวอย่างลูกค้าจริง ผลลัพธ์ที่วัดได้ รีวิว คะแนน' },
  { id: 'problem',    label: '🩹 แก้ปัญหา', desc: 'เริ่มจากปัญหา (เขียนไม่เป็น/ช้า/แพง) → OpenThaiAi แก้ยังไง' },
  { id: 'demo',       label: '🎬 Demo สด', desc: 'บอก input → output ตัวอย่างจริงที่ได้จากแพลตฟอร์ม ในโพสต์เดียว' },
];

const PLATFORM_META = {
  facebook:  { icon: '📘', color: '#1877F2', name: 'Facebook' },
  instagram: { icon: '📸', color: '#E1306C', name: 'Instagram' },
  tiktok:    { icon: '🎵', color: '#010101', name: 'TikTok' },
  twitter:   { icon: '🐦', color: '#1DA1F2', name: 'Twitter/X' },
  line:      { icon: '💚', color: '#00B900', name: 'LINE OA' },
  telegram:  { icon: '✈️', color: '#229ED9', name: 'Telegram' },
  youtube:   { icon: '▶️', color: '#FF0000', name: 'YouTube' },
};

export default function AutoPostPage() {
  const [searchParams] = useSearchParams();
  const [platforms, setPlatforms]           = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [history, setHistory]               = useState([]);
  const [affiliates, setAffiliates]         = useState([]);
  const [products, setProducts]             = useState([]);

  const [form, setForm] = useState({
    topic: '',
    angle: 'roi',
    affiliateRef: '',
    productId: '',
    imageUrl: '',
  });

  const [generated, setGenerated] = useState(null);
  const [generatingStep, setGeneratingStep] = useState('');
  const [generatingPct, setGeneratingPct]   = useState(0);
  const [posting, setPosting]       = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [activeTab, setActiveTab]   = useState('compose');

  useEffect(() => {
    if (searchParams?.get('date')) setScheduleEnabled(true);
  }, []);
  const [platformStatus, setPlatformStatus] = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(() => {
    const d = searchParams?.get('date');
    return d ? `${d}T09:00` : '';
  });
  const [queueItems, setQueueItems] = useState([]);
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-admin-key': localStorage.getItem('admin_key') || '' };

  useEffect(() => {
    fetch(apiUrl('/api/autopost/platforms'), { headers }).then(r => r.json()).then(d => {
      if (d.platforms) { setPlatforms(d.platforms); setSelectedPlatforms(d.platforms.filter(p => p.enabled).map(p => p.id)); }
    }).catch(() => {});
    fetch(apiUrl('/api/autopost/history'), { headers }).then(r => r.json()).then(d => { if (d.posts) setHistory(d.posts); }).catch(() => {});
    fetch(apiUrl('/api/autopost/queue'), { headers }).then(r => r.json()).then(d => { if (d.data) setQueueItems(d.data); }).catch(() => {});
    fetch(apiUrl('/api/affiliate/list'), { headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' } }).then(r => r.json()).then(d => { if (d.affiliates) setAffiliates(d.affiliates.slice(0, 20)); }).catch(() => {});
    fetch(apiUrl('/api/inventory/list')).then(r => r.json()).then(d => { if (d.products) setProducts(d.products.slice(0, 20)); }).catch(() => {});
  }, []);

  async function generateContent() {
    if (!form.topic) return;
    setPostResult(null);
    setGenerated(null);

    const angleData = TRUTH_ANGLES.find(a => a.id === form.angle);
    const product = products.find(p => p.id === form.productId);

    const steps = [
      { label: 'วิเคราะห์หัวข้อด้วย AI...', pct: 20 },
      { label: `สร้างเนื้อหา (${angleData?.label})...`, pct: 55 },
      { label: 'ตรวจสอบคุณภาพและความถูกต้อง...', pct: 85 },
    ];
    let stepTimer;
    let stepIdx = 0;
    setGeneratingStep(steps[0].label);
    setGeneratingPct(steps[0].pct);
    stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setGeneratingStep(steps[stepIdx].label);
      setGeneratingPct(steps[stepIdx].pct);
    }, 1200);

    try {
      const r = await fetch(apiUrl('/api/generate'), {
        method: 'POST', headers,
        body: JSON.stringify({
          platform: 'facebook', category: 'marketing',
          topic: form.topic, angle: form.angle,
          product: product?.name || form.topic,
          price: product?.price || '',
          style: 'sales',
        }),
      });
      clearInterval(stepTimer);
      const d = await r.json();
      setGeneratingStep('');
      setGeneratingPct(0);

      setGenerated({
        hook: d.hook || '',
        body: d.body || (d.caption || (d.script || []).join('\n')),
        cta: d.cta || '',
        hashtags: d.hashtags || [],
        criticScore: d.criticScore || null,
        source: d.source || 'ai',
      });
    } catch (e) {
      clearInterval(stepTimer);
      setGeneratingStep('');
      setGeneratingPct(0);
      setGenerated({ hook: `❌ ${e.message}`, body: '', cta: '', hashtags: [] });
    }
  }

  async function generateAndPost() {
    if (!form.topic || !selectedPlatforms.length) return;
    setPostResult(null);
    setGenerated(null);

    const angleData = TRUTH_ANGLES.find(a => a.id === form.angle);
    const product = products.find(p => p.id === form.productId);

    const steps = [
      { label: 'วิเคราะห์หัวข้อ...', pct: 15 },
      { label: `สร้างเนื้อหา (${angleData?.label})...`, pct: 40 },
      { label: 'ตรวจสอบคุณภาพ...', pct: 65 },
      { label: `โพสต์ไปยัง ${selectedPlatforms.length} แพลตฟอร์มพร้อมกัน...`, pct: 85 },
    ];
    let stepIdx = 0;
    setGeneratingStep(steps[0].label);
    setGeneratingPct(steps[0].pct);
    const stepTimer = setInterval(() => {
      if (stepIdx < 2) { stepIdx++; setGeneratingStep(steps[stepIdx].label); setGeneratingPct(steps[stepIdx].pct); }
    }, 1200);

    let content;
    try {
      const r = await fetch(apiUrl('/api/generate'), {
        method: 'POST', headers,
        body: JSON.stringify({
          platform: 'facebook', category: 'marketing',
          topic: form.topic, angle: form.angle,
          product: product?.name || form.topic,
          price: product?.price || '',
          style: 'sales',
        }),
      });
      const d = await r.json();
      content = {
        hook: d.hook || '',
        body: d.body || (d.caption || (d.script || []).join('\n')),
        cta: d.cta || '',
        hashtags: d.hashtags || [],
        criticScore: d.criticScore || null,
        source: d.source || 'ai',
      };
      setGenerated(content);
    } catch (e) {
      clearInterval(stepTimer);
      setGeneratingStep('');
      setGeneratingPct(0);
      setGenerated({ hook: `❌ ${e.message}`, body: '', cta: '', hashtags: [] });
      return;
    }

    clearInterval(stepTimer);
    setGeneratingStep(steps[3].label);
    setGeneratingPct(steps[3].pct);
    setPosting(true);
    try {
      const r = await fetch(apiUrl('/api/autopost/broadcast'), {
        method: 'POST', headers,
        body: JSON.stringify({
          content,
          hashtags: content.hashtags,
          affiliateRef: form.affiliateRef,
          productId: form.productId,
          imageUrl: form.imageUrl || null,
          targetPlatforms: selectedPlatforms,
        }),
      });
      const d = await r.json();
      setPostResult(d);
      if (d.id) setHistory(prev => [d, ...prev.slice(0, 49)]);
    } catch (e) {
      setPostResult({ error: e.message });
    }
    setPosting(false);
    setGeneratingStep('');
    setGeneratingPct(0);
  }

  async function checkPlatformStatus() {
    try {
      const r = await fetch(apiUrl('/api/autopost/status'), { headers });
      const d = await r.json();
      setPlatformStatus(d);
      setShowStatus(true);
    } catch (e) {
      setPlatformStatus({ error: e.message });
      setShowStatus(true);
    }
  }

  async function postNow() {
    if (!generated) return;
    setPosting(true); setPostResult(null);

    try {
      if (scheduleEnabled && scheduleTime) {
        // Schedule for later
        const r = await fetch(apiUrl('/api/autopost/queue'), {
          method: 'POST', headers,
          body: JSON.stringify({
            product: form.topic,
            content: generated,
            platforms: selectedPlatforms,
            schedule_at: scheduleTime,
            affiliate_ref: form.affiliateRef,
          }),
        });
        const d = await r.json();
        setPostResult({ scheduled: true, schedule_at: scheduleTime, ...d });
        if (d.id || d.success) {
          fetch(apiUrl('/api/autopost/queue'), { headers }).then(r => r.json()).then(d => { if (d.data) setQueueItems(d.data); }).catch(() => {});
        }
      } else {
        const r = await fetch(apiUrl('/api/autopost/broadcast'), {
          method: 'POST', headers,
          body: JSON.stringify({
            content: generated,
            hashtags: generated.hashtags,
            affiliateRef: form.affiliateRef,
            productId: form.productId,
            imageUrl: form.imageUrl || null,
            targetPlatforms: selectedPlatforms,
          }),
        });
        const d = await r.json();
        setPostResult(d);
        if (d.id) {
          setHistory(prev => [d, ...prev.slice(0, 49)]);
        }
      }
    } catch (e) {
      setPostResult({ error: e.message });
    }
    setPosting(false);
  }

  const togglePlatform = (id) => setSelectedPlatforms(prev =>
    prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            🚀 Auto-Post Engine
          </h1>
          <p className="text-gray-400 mt-1">สร้างเนื้อหาด้วย AI ตามหลักความจริง → โพสต์ทุกแพลตฟอร์มพร้อมกัน + Affiliate Link อัตโนมัติ</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 w-fit">
          {[['compose', '✍️ สร้างโพสต์'], ['history', '📋 ประวัติ'], ['queue', '⏰ คิวงาน']].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-5">
              {/* Topic */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <label className="block text-sm font-semibold text-gray-300 mb-3">📝 หัวข้อ/สินค้าที่ต้องการโปรโมต</label>
                <textarea
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="เช่น: OpenThaiAi ช่วยร้านค้าออนไลน์สร้างโพสต์ขายของใน 30 วินาที ประหยัดค่าจ้างคนเขียน 5,000 บาท/เดือน"
                  className="w-full bg-gray-800 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-100 placeholder-gray-600"
                />
              </div>

              {/* Truth Angle */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <label className="block text-sm font-semibold text-gray-300 mb-3">🎯 มุมมองความจริงที่ต้องการนำเสนอ</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRUTH_ANGLES.map(a => (
                    <button key={a.id} onClick={() => setForm(f => ({ ...f, angle: a.id }))}
                      title={a.desc}
                      className={`p-2.5 rounded-xl text-xs text-left border transition-all ${form.angle === a.id ? 'border-indigo-500 bg-indigo-950 text-indigo-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Affiliate + Product */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-3">
                <label className="block text-sm font-semibold text-gray-300">🔗 Affiliate & สินค้า</label>
                <select value={form.affiliateRef} onChange={e => setForm(f => ({ ...f, affiliateRef: e.target.value }))}
                  className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- เลือก Affiliate (ถ้ามี) --</option>
                  {affiliates.map(a => <option key={a.ref_code} value={a.ref_code}>{a.name} ({a.ref_code})</option>)}
                </select>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- เลือกสินค้า (ถ้ามี) --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ฿{p.price}</option>)}
                </select>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="URL รูปภาพ (สำหรับ Facebook/Instagram)"
                  className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Platforms */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-300">📡 แพลตฟอร์มที่จะโพสต์</label>
                  <button onClick={checkPlatformStatus}
                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white border border-gray-700 transition-all">
                    🔍 ตรวจสอบสถานะ
                  </button>
                </div>
                {showStatus && platformStatus && (
                  <div className="mb-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-400">สถานะ credentials</span>
                      <button onClick={() => setShowStatus(false)} className="text-gray-600 hover:text-gray-400 text-xs">ปิด</button>
                    </div>
                    {platformStatus.error ? (
                      <p className="text-xs text-red-400">{platformStatus.error}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(platformStatus.platforms || platformStatus || {}).filter(([k]) => PLATFORM_META[k]).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v?.ready || v === true ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className="text-gray-300">{PLATFORM_META[k]?.name || k}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map(p => {
                    const meta = PLATFORM_META[p.id] || {};
                    const sel = selectedPlatforms.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-sm border transition-all ${!p.enabled ? 'opacity-40 cursor-not-allowed' : sel ? 'border-green-500 bg-green-950 text-green-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}
                        disabled={!p.enabled} title={!p.enabled ? 'ยังไม่ตั้งค่า credentials' : ''}>
                        <span>{meta.icon || '📤'}</span>
                        <span className="font-medium">{p.name}</span>
                        {!p.enabled && <span className="ml-auto text-xs text-gray-600">ไม่พร้อม</span>}
                        {p.enabled && sel && <span className="ml-auto text-xs text-green-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Buttons */}
              {generatingStep && (
                <div className="bg-gray-900 rounded-2xl p-4 border border-indigo-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-indigo-300 font-medium">{generatingStep}</span>
                    <span className="text-xs text-gray-500">{generatingPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${generatingPct}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={generateContent} disabled={!form.topic || !!generatingStep || posting}
                  className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
                  ✨ สร้างเนื้อหา
                </button>
                <button onClick={generateAndPost} disabled={!form.topic || !selectedPlatforms.length || !!generatingStep || posting}
                  className="py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
                  ⚡ สร้าง+โพสต์
                </button>
              </div>
            </div>

            {/* Right: Preview & Post */}
            <div className="space-y-5">
              {generated ? (
                <>
                  {/* Content Preview */}
                  <div className="bg-gray-900 rounded-2xl p-5 border border-indigo-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-indigo-300">📄 เนื้อหาที่สร้าง</h3>
                      <button onClick={() => setGenerated(null)} className="text-gray-500 hover:text-gray-300 text-sm">ล้าง</button>
                    </div>
                    <div className="space-y-3">
                      {generated.criticScore && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">คะแนนคุณภาพ</span>
                          <span className={`text-sm font-bold ${parseFloat(generated.criticScore) >= 8 ? 'text-emerald-400' : parseFloat(generated.criticScore) >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                            {generated.criticScore}/10
                          </span>
                          <span className="text-xs text-gray-600">· {generated.source}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Hook (ดึงดูดใน 3 วินาที)</span>
                        <textarea value={generated.hook} onChange={e => setGenerated(g => ({ ...g, hook: e.target.value }))}
                          className="mt-1 w-full bg-gray-800 rounded-lg p-2 text-white font-semibold text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500" rows={2} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Body (ความจริง)</span>
                        <textarea value={generated.body} onChange={e => setGenerated(g => ({ ...g, body: e.target.value }))}
                          className="mt-1 w-full bg-gray-800 rounded-lg p-2 text-gray-300 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500" rows={4} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">CTA (กระตุ้นคลิก)</span>
                        <textarea value={generated.cta} onChange={e => setGenerated(g => ({ ...g, cta: e.target.value }))}
                          className="mt-1 w-full bg-gray-800 rounded-lg p-2 text-emerald-400 font-medium text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500" rows={2} />
                      </div>
                      {generated.hashtags?.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Hashtags</span>
                          <textarea value={generated.hashtags.join(' ')} onChange={e => setGenerated(g => ({ ...g, hashtags: e.target.value.split(/\s+/).filter(Boolean) }))}
                            className="mt-1 w-full bg-gray-800 rounded-lg p-2 text-blue-400 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" rows={2} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Platform Previews */}
                  <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                    <h3 className="font-semibold text-gray-300 mb-3">👁️ ตัวอย่างรูปแบบต่อแพลตฟอร์ม</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedPlatforms.map(pid => {
                        const meta = PLATFORM_META[pid] || {};
                        return (
                          <div key={pid} className="bg-gray-800 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{meta.icon}</span>
                              <span className="text-xs font-semibold text-gray-300">{meta.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {pid === 'twitter' ? `${generated.hook} [link] ${generated.hashtags?.slice(0, 2).join(' ')}`.slice(0, 280) : `${generated.hook}\n${generated.cta}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule Option */}
                  <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-500" />
                      <span className="text-sm text-gray-300">⏰ ตั้งเวลาโพสต์ในภายหลัง</span>
                    </label>
                    {scheduleEnabled && (
                      <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                        className="mt-3 w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                  </div>

                  {/* Post Button */}
                  <button onClick={postNow} disabled={posting || !selectedPlatforms.length || (scheduleEnabled && !scheduleTime)}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all text-lg">
                    {posting
                      ? '⏳ กำลังดำเนินการ...'
                      : scheduleEnabled
                        ? `⏰ ตั้งเวลาโพสต์ไปยัง ${selectedPlatforms.length} แพลตฟอร์ม`
                        : `🚀 โพสต์ไปยัง ${selectedPlatforms.length} แพลตฟอร์มพร้อมกัน`}
                  </button>

                  {/* Post Results */}
                  {postResult && (
                    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                      {postResult.error ? (
                        <p className="text-red-400">❌ {postResult.error}</p>
                      ) : postResult.scheduled ? (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⏰</span>
                          <div>
                            <p className="font-bold text-amber-400">ตั้งเวลาสำเร็จ!</p>
                            <p className="text-xs text-gray-400">โพสต์จะถูกส่งในวันที่ {new Date(postResult.schedule_at).toLocaleString('th-TH')}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🎉</span>
                            <div>
                              <p className="font-bold text-emerald-400">โพสต์สำเร็จ {postResult.success_count}/{postResult.total_count} แพลตฟอร์ม</p>
                              <p className="text-xs text-gray-500">Batch ID: {postResult.id}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(postResult.platforms || []).map(p => (
                              <div key={p.platform} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${p.status === 'success' ? 'bg-green-950 text-green-300' : p.status === 'skipped' ? 'bg-gray-800 text-gray-500' : 'bg-red-950 text-red-300'}`}>
                                <span>{PLATFORM_META[p.platform]?.icon || '📤'}</span>
                                <span className="font-medium">{PLATFORM_META[p.platform]?.name || p.platform}</span>
                                <span className="ml-auto text-xs">{p.status === 'success' ? '✅' : p.status === 'skipped' ? '⏭️' : `❌ ${p.error}`}</span>
                                {p.tracking_link && <a href={p.tracking_link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline ml-1">🔗</a>}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800 flex flex-col items-center justify-center text-center min-h-80">
                  <div className="text-5xl mb-4">🤖</div>
                  <p className="text-gray-400 text-lg font-medium">AI พร้อมสร้างเนื้อหาให้คุณ</p>
                  <p className="text-gray-600 text-sm mt-2">กรอกหัวข้อ → เลือกมุมมองความจริง → กด "สร้างเนื้อหา"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 && <p className="text-gray-500 text-center py-16">ยังไม่มีประวัติการโพสต์</p>}
            {history.map(batch => (
              <div key={batch.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{batch.content?.hook?.slice(0, 80) || 'โพสต์'}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(batch.created_at).toLocaleString('th-TH')} · {batch.affiliate_ref || 'ไม่มี affiliate'}</p>
                  </div>
                  <span className={`text-sm font-bold ${batch.success_count > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {batch.success_count}/{batch.total_count}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(batch.platforms || []).map(p => (
                    <span key={p.platform} className={`text-xs px-2 py-1 rounded-full ${p.status === 'success' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                      {PLATFORM_META[p.platform]?.icon} {PLATFORM_META[p.platform]?.name || p.platform}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">⏰ คิวงานที่ตั้งเวลาไว้</h2>
              <button onClick={() => fetch(apiUrl('/api/autopost/queue'), { headers }).then(r => r.json()).then(d => { if (d.data) setQueueItems(d.data); }).catch(() => {})}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white border border-gray-700 transition-all">
                รีเฟรช
              </button>
            </div>
            {queueItems.length === 0 && <p className="text-gray-500 text-center py-16">ยังไม่มีงานในคิว — ใช้ "ตั้งเวลาโพสต์" ในแท็บสร้างโพสต์</p>}
            {queueItems.map((item, i) => {
              const statusStyle = item.status === 'queued'
                ? 'bg-amber-900 text-amber-300'
                : item.status === 'sent'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300';
              const statusLabel = item.status === 'queued' ? '⏳ รอส่ง' : item.status === 'sent' ? '✅ ส่งแล้ว' : '❌ ผิดพลาด';
              return (
                <div key={item.id || i} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{item.product || item.topic || 'งานที่ตั้งเวลา'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.schedule_at ? `⏰ ${new Date(item.schedule_at).toLocaleString('th-TH')}` : 'ไม่มีเวลา'}
                        {item.affiliate_ref ? ` · ${item.affiliate_ref}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-3 flex-shrink-0 ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(item.platforms || []).map(pid => (
                      <span key={pid} className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                        {PLATFORM_META[pid]?.icon} {PLATFORM_META[pid]?.name || pid}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
