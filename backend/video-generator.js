// OpenThaiAi — Video Generator
// รองรับ: RunwayML Gen-3 · Pika Labs · Kling AI · Luma Dream Machine · Mock (script-only)
//
// Flow: สร้าง Script+Storyboard ด้วย AI → ส่งไปยัง Video API → คืน job_id + preview

const VIDEO_PROVIDERS = {
  runway:  { name: 'RunwayML Gen-3',        url: 'https://api.dev.runwayml.com/v1/image_to_video', authHeader: 'Authorization' },
  pika:    { name: 'Pika Labs 2.2',         url: 'https://api.pika.art/v1/generate',               authHeader: 'X-Pika-API-Key' },
  kling:   { name: 'Kling AI 1.6',          url: 'https://api.klingai.com/v1/videos/image2video',  authHeader: 'Authorization' },
  luma:    { name: 'Luma Dream Machine',    url: 'https://api.lumalabs.ai/dream-machine/v1/generations', authHeader: 'Authorization' },
  veo:     { name: 'Google Veo 2',          url: 'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:generateVideo', authHeader: 'X-Goog-Api-Key' },
};

// ── Build video script prompt ─────────────────────────────────────────────────
function buildVideoPrompt(form) {
  return `คุณเป็น Video Content Creator ผู้เชี่ยวชาญด้านคอนเทนต์ไทย

สร้าง Video Script + Storyboard สำหรับ:
สินค้า: ${form.product}
แพลตฟอร์ม: ${form.platform || 'TikTok'}
สไตล์: ${form.style || 'sales'}
ความยาว: ${form.duration || 30} วินาที
ภาษา: ${form.lang || 'ภาษาไทย'}
${form.description ? `รายละเอียด: ${form.description}` : ''}

ตอบกลับเป็น JSON เท่านั้น:
{
  "title": "<ชื่อวีดีโอ>",
  "hook_text": "<ข้อความ hook 1-2 ประโยค>",
  "scenes": [
    {
      "id": 1,
      "duration_sec": 5,
      "visual": "<คำอธิบายภาพที่ต้องการ เป็นภาษาอังกฤษ สำหรับ AI image generation>",
      "voiceover": "<เสียงพากย์ภาษาไทย>",
      "on_screen_text": "<ข้อความบนจอ>",
      "camera": "<close-up|wide|medium|panning>"
    }
  ],
  "background_music": "<upbeat|emotional|calm|energetic>",
  "video_prompt_en": "<prompt ภาษาอังกฤษ 1 ย่อหน้า สำหรับ Runway/Pika/Kling>",
  "caption": "<caption สำหรับ post>",
  "hashtags": ["<hashtag1>", "<hashtag2>"],
  "cta": "<call to action>",
  "estimated_views": "<ประมาณการ views>",
  "criticScore": <คะแนน 0-10>
}`;
}

// ── Generate script with AI ───────────────────────────────────────────────────
export async function generateVideoScript(form, { anthropic, gemini }) {
  const prompt = buildVideoPrompt(form);

  let text = '';
  let source = 'mock';

  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
      text = msg.content[0]?.text?.trim() || '';
      source = 'claude';
    } catch (e) {
      console.warn('[video] Claude error:', e.message);
    }
  }

  if (!text && gemini) {
    try {
      const r = await gemini.generateContent(prompt);
      text = r.response.text().trim();
      source = 'gemini';
    } catch (e) {
      console.warn('[video] Gemini error:', e.message);
    }
  }

  if (text) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const data = JSON.parse(m[0]);
        data.source = source;
        if (!data.hashtags?.includes('#OpenThaiAi')) data.hashtags = [...(data.hashtags || []), '#OpenThaiAi'];
        return data;
      } catch (_) {}
    }
  }

  // Mock fallback
  return mockVideoScript(form);
}

function mockVideoScript(form) {
  const p = form.product || 'สินค้าไทย';
  return {
    title: `${p} — คอนเทนต์ขายดี`,
    hook_text: `ทำไม ${p} ถึงเป็นที่ 1 ในไทย? ดูให้จบแล้วจะรู้!`,
    scenes: [
      { id: 1, duration_sec: 5,  visual: `Close-up product shot of ${p} on white background, professional lighting`, voiceover: `แนะนำ${p} สินค้าคุณภาพจากไทย`, on_screen_text: `✨ ${p}`, camera: 'close-up' },
      { id: 2, duration_sec: 8,  visual: `Person using ${p} in daily life, natural setting, Thailand background`, voiceover: 'คุณสมบัติพิเศษที่ทำให้ต่างจากที่อื่น', on_screen_text: '3 เหตุผลที่ต้องมี', camera: 'medium' },
      { id: 3, duration_sec: 7,  visual: `Happy Thai customers reviewing ${p}, smiling faces`, voiceover: 'ลูกค้ากว่า 5,000 คนเชื่อใจเราแล้ว', on_screen_text: '⭐⭐⭐⭐⭐', camera: 'wide' },
      { id: 4, duration_sec: 10, visual: `${p} packaging with Thai design elements, premium quality`, voiceover: 'สั่งวันนี้รับส่วนลดพิเศษ ส่งฟรีทั่วไทย', on_screen_text: '🛒 กดลิงก์ด้านล่าง', camera: 'panning' },
    ],
    background_music: 'upbeat',
    video_prompt_en: `Professional product video for ${p}, Thai style, vibrant colors, smooth transitions, 4K quality`,
    caption: `✨ ${p} — สินค้าไทยคุณภาพพรีเมียม\n💰 ราคาพิเศษ ส่งฟรีทั่วไทย\n🛒 กดลิงก์ใน Bio`,
    hashtags: ['#OTOP', '#สินค้าไทย', '#TikTokShop', `#${p.replace(/\s+/g,'')}`, '#OpenThaiAi'],
    cta: 'กดลิงก์ใน Bio สั่งซื้อได้เลยครับ',
    estimated_views: '10K-50K',
    criticScore: (7.5 + Math.random() * 2).toFixed(1),
    source: 'mock',
  };
}

// ── Submit to Video Generation API ────────────────────────────────────────────
export async function submitToVideoAPI(script, provider = 'runway', apiKey = '') {
  const p = VIDEO_PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  if (!apiKey) {
    return {
      job_id: `mock_${Date.now()}`,
      status: 'queued',
      provider: 'mock',
      eta_seconds: 60,
      message: `API key for ${p.name} not configured — script ready, submit manually`,
      preview_url: null,
    };
  }

  const payload = buildProviderPayload(provider, script);
  const headers = {
    'Content-Type': 'application/json',
    [p.authHeader]: provider === 'runway' || provider === 'luma'
      ? `Bearer ${apiKey}`
      : apiKey,
  };

  try {
    const res = await fetch(p.url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return normalizeJobResponse(provider, data);
  } catch (e) {
    throw new Error(`[${p.name}] ${e.message}`);
  }
}

function buildProviderPayload(provider, script) {
  const prompt = script.video_prompt_en || script.title;
  switch (provider) {
    case 'runway':
      return { promptText: prompt, ratio: '9:16', duration: 10, model: 'gen3a_turbo' };
    case 'pika':
      return { prompt, aspectRatio: '9:16', duration: 5, options: { frameRate: 24 } };
    case 'kling':
      return { prompt, aspect_ratio: '9:16', duration: 5, cfg_scale: 0.5 };
    case 'luma':
      return { prompt, aspect_ratio: '9:16', loop: false };
    case 'veo':
      return { model: 'veo-2.0-generate-001', instances: [{ prompt }], parameters: { aspectRatio: '9:16', durationSeconds: 8 } };
    default:
      return { prompt };
  }
}

function normalizeJobResponse(provider, data) {
  switch (provider) {
    case 'runway': return { job_id: data.id, status: data.status, provider: 'runway', preview_url: data.output?.[0] || null, eta_seconds: 120 };
    case 'pika':   return { job_id: data.id, status: 'queued',    provider: 'pika',   preview_url: data.resultUrl || null,   eta_seconds: 90  };
    case 'kling':  return { job_id: data.task_id, status: 'queued', provider: 'kling', preview_url: null, eta_seconds: 180 };
    case 'luma':   return { job_id: data.id, status: data.state,  provider: 'luma',   preview_url: data.assets?.video || null, eta_seconds: 120 };
    case 'veo':    return { job_id: data.name, status: 'queued',  provider: 'veo',    preview_url: null, eta_seconds: 300 };
    default:       return { job_id: data.id || `job_${Date.now()}`, status: 'queued', provider, preview_url: null, eta_seconds: 120 };
  }
}

// ── Poll job status ───────────────────────────────────────────────────────────
export async function pollVideoJob(jobId, provider, apiKey) {
  if (!apiKey || provider === 'mock') {
    return { job_id: jobId, status: 'pending', preview_url: null, message: 'Mock mode — no API key' };
  }

  const statusUrls = {
    runway: `https://api.dev.runwayml.com/v1/tasks/${jobId}`,
    pika:   `https://api.pika.art/v1/jobs/${jobId}`,
    kling:  `https://api.klingai.com/v1/videos/image2video/${jobId}`,
    luma:   `https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`,
  };

  const url = statusUrls[provider];
  if (!url) throw new Error(`Poll not supported for: ${provider}`);

  const p = VIDEO_PROVIDERS[provider];
  const headers = { [p.authHeader]: provider === 'runway' || provider === 'luma' ? `Bearer ${apiKey}` : apiKey };

  const res = await fetch(url, { headers });
  const data = await res.json();
  return normalizeJobResponse(provider, data);
}
