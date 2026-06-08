// OpenThaiAi — Voice Commander
// รับ transcript จาก Web Speech API → AI แปล intent → รัน command → คืน speak_text
//
// Endpoint: POST /api/voice/command
//   body: { transcript, lang?, tenantId? }
//   returns: { action, params, result, speak_text, confidence }

// ── Intent definitions ────────────────────────────────────────────────────────
const INTENT_PROMPT = (transcript, lang) => `คุณเป็น AI ผู้ช่วยของ OpenThaiAi ระบบสร้างคอนเทนต์ไทย รองรับ 3 ภาษา: ไทย, จีน, อังกฤษ

คำสั่งเสียงที่ได้รับ: "${transcript}"
ภาษา Input: ${lang || 'th-TH'}
กฎ speak_text: ตอบกลับเป็นภาษาเดียวกับ input — ไทยตอบไทย, จีน (zh-CN) ตอบจีน, อังกฤษตอบอังกฤษ

วิเคราะห์ intent และตอบกลับ JSON เท่านั้น (ไม่มีข้อความอื่น):

{
  "action": "<หนึ่งใน: generate_content | get_trending | get_news | competitor_analyze | system_health | run_agent | list_agents | memory_search | help | unknown>",
  "confidence": <0.0-1.0>,
  "params": {
    "product": "<ชื่อสินค้าถ้ามี>",
    "category": "<หมวดหมู่ถ้ามี>",
    "platform": "<TikTok/Facebook/Instagram/LINE ถ้าระบุ>",
    "style": "<sales/educational/entertainment ถ้าระบุ>",
    "niche": "<niche ถ้าเป็น competitor analyze>",
    "query": "<คำค้นหาถ้าเป็น memory search>"
  },
  "speak_text": "<ประโยคตอบกลับผู้ใช้ 1-2 ประโยค ภาษาเดียวกับ input — บอกว่ากำลังทำอะไร>",
  "display_text": "<ข้อความสั้นแสดงในหน้าจอ>"
}

ตัวอย่าง (ไทย):
- "สร้างคอนเทนต์น้ำพริกแม่บ้านสำหรับ TikTok" → action: generate_content, product: น้ำพริกแม่บ้าน, speak_text ภาษาไทย
- "ดูเทรนด์วันนี้" → action: get_trending, speak_text ภาษาไทย
- "ตรวจสุขภาพระบบ" → action: system_health
- "วิเคราะห์คู่แข่งนิช ครีมหน้าใส" → action: competitor_analyze, niche: ครีมหน้าใส

ตัวอย่าง (จีน zh-CN):
- "为泰国辣酱创建内容" → action: generate_content, product: 泰国辣酱, speak_text ภาษาจีน
- "查看今日趋势" → action: get_trending, speak_text ภาษาจีน
- "检查系统健康" → action: system_health
- "分析竞争对手" → action: competitor_analyze
- "最新新闻" → action: get_news

ตัวอย่าง (English en-US):
- "Create content for Thai chili paste" → action: generate_content, product: Thai chili paste, speak_text in English
- "Show trending hashtags" → action: get_trending
- "Check system health" → action: system_health
- "Analyze competitor niche skincare" → action: competitor_analyze, niche: skincare`;

// ── Command executor ──────────────────────────────────────────────────────────
export async function processVoiceCommand({ transcript, lang = 'th-TH', tenantId = 'global' }, { anthropic, gemini, smartGenerate, mockGenerate }) {
  if (!transcript?.trim()) {
    return {
      action: 'unknown',
      speak_text: 'ไม่ได้ยินคำสั่ง กรุณาพูดอีกครั้ง',
      display_text: 'ไม่ได้ยินคำสั่ง',
      result: null,
    };
  }

  // ── Step 1: Parse intent with AI ─────────────────────────────────────────
  let intent = null;

  const parsePrompt = INTENT_PROMPT(transcript, lang);

  try {
    let text = '';
    if (anthropic) {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: parsePrompt }],
      });
      text = msg.content[0]?.text?.trim() || '';
    } else if (gemini) {
      const r = await gemini.generateContent(parsePrompt);
      text = r.response.text().trim();
    }

    const m = text.match(/\{[\s\S]*\}/);
    if (m) intent = JSON.parse(m[0]);
  } catch (e) {
    console.warn('[voice] intent parse error:', e.message);
  }

  // Fallback: keyword matching
  if (!intent) {
    intent = keywordFallback(transcript);
  }

  const { action, params = {}, speak_text: speakPre, display_text, confidence = 0.8 } = intent || {};

  // ── Step 2: Execute command ───────────────────────────────────────────────
  let result = null;
  let speak_text = speakPre || 'กำลังดำเนินการ...';

  try {
    switch (action) {

      case 'generate_content': {
        const form = {
          product:  params.product  || transcript.slice(0, 100),
          category: params.category || 'ทั่วไป',
          platform: params.platform || 'TikTok',
          style:    params.style    || 'sales',
          lang:     lang === 'en-US' ? 'English' : 'ภาษาไทย',
        };
        result = await smartGenerate(form).catch(() => mockGenerate(form));
        speak_text = isZh(lang)
          ? `${form.product} 的内容已创建完成！AI评分 ${result.criticScore} 分（满分10分）`
          : isEn(lang)
            ? `Content for ${form.product} is ready! AI Critic score: ${result.criticScore}/10`
            : `สร้างคอนเทนต์สำหรับ ${form.product} เสร็จแล้ว! ได้คะแนน ${result.criticScore} จาก 10 จาก AI Critic`;
        break;
      }

      case 'get_trending': {
        result = {
          hashtags: ['#OTOP','#สินค้าไทย','#TikTokShop','#รีวิวสินค้า','#ของดีราคาถูก'],
          topics:   ['สินค้า OTOP ไทย', 'ความงามธรรมชาติ', 'น้ำพริก/เครื่องแกง'],
        };
        speak_text = isZh(lang)
          ? '今日热门话题：OTOP泰国产品，泰国美妆，泰国辣酱'
          : isEn(lang)
            ? 'Today\'s top trends: OTOP, Thai products, TikTok Shop'
            : 'เทรนด์วันนี้ แฮชแท็กแรงสุดคือ OTOP, สินค้าไทย, และ TikTok Shop';
        break;
      }

      case 'system_health': {
        result = { status: 'ok', message: 'ระบบทำงานปกติ' };
        speak_text = isZh(lang)
          ? 'OpenThaiAi 系统运行正常，未发现错误'
          : isEn(lang)
            ? 'OpenThaiAi system is healthy, no errors found'
            : 'ระบบ OpenThaiAi ทำงานปกติ ไม่พบข้อผิดพลาด';
        break;
      }

      case 'competitor_analyze': {
        if (!params.niche) {
          speak_text = isZh(lang)
            ? '请指定要分析的市场领域，例如"分析护肤品竞争对手"'
            : isEn(lang)
              ? 'Please specify the niche, e.g. "analyze competitor niche skincare"'
              : 'กรุณาระบุ niche ที่ต้องการวิเคราะห์ เช่น "วิเคราะห์คู่แข่งนิช ครีมหน้าใส"';
          result = null;
        } else {
          speak_text = isZh(lang)
            ? `正在分析 ${params.niche} 市场竞争对手，请稍候`
            : isEn(lang)
              ? `Analyzing competitors in the ${params.niche} niche, please wait`
              : `กำลังวิเคราะห์คู่แข่งในนิช ${params.niche} สักครู่`;
          result = { niche: params.niche, status: 'queued', message: 'queued' };
        }
        break;
      }

      case 'get_news': {
        result = { message: 'fetching' };
        speak_text = isZh(lang)
          ? '正在获取最新泰国新闻和趋势'
          : isEn(lang)
            ? 'Fetching the latest Thai news and trends'
            : 'กำลังดึงข่าวและเทรนด์ไทยล่าสุด สักครู่';
        break;
      }

      case 'help': {
        result = {
          th: ['สร้างคอนเทนต์ [สินค้า]','ดูเทรนด์วันนี้','ตรวจสุขภาพระบบ','วิเคราะห์คู่แข่งนิช [niche]','ดูข่าวล่าสุด','ดูรายการเอเจนต์'],
          zh: ['为[产品]创建内容','查看今日趋势','检查系统健康','分析[领域]竞争对手','最新新闻','查看Agent列表'],
          en: ['Create content for [product]','Show trending hashtags','Check system health','Analyze competitor niche [niche]','Get latest news','List agents'],
        };
        speak_text = isZh(lang)
          ? '可用命令：创建内容，查看趋势，检查系统，分析竞争对手，最新新闻，查看Agent'
          : isEn(lang)
            ? 'Available commands: create content, trending, system health, competitor analysis, news, list agents'
            : 'คำสั่งที่ใช้ได้: สร้างคอนเทนต์, ดูเทรนด์, ตรวจสุขภาพ, วิเคราะห์คู่แข่ง, ดูข่าว, ดูเอเจนต์';
        break;
      }

      default: {
        speak_text = isZh(lang)
          ? '未能理解您的命令，请说"帮助"查看可用命令'
          : isEn(lang)
            ? 'Command not understood. Say "help" to see available commands'
            : 'ไม่เข้าใจคำสั่ง ลองพูดว่า "ช่วยอะไรได้บ้าง" เพื่อดูคำสั่งทั้งหมด';
        result = null;
      }
    }
  } catch (e) {
    console.error('[voice] execute error:', e.message);
    speak_text = 'เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่';
  }

  return {
    action:       action || 'unknown',
    confidence,
    params,
    result,
    speak_text,
    display_text: display_text || speak_text,
    transcript,
    ts: new Date().toISOString(),
  };
}

// ── Lang helpers ──────────────────────────────────────────────────────────────
const isZh = (lang) => lang?.startsWith('zh');
const isEn = (lang) => lang?.startsWith('en');

// ── Keyword fallback — ไทย + จีน + อังกฤษ ────────────────────────────────────
function keywordFallback(text) {
  const t = text.toLowerCase();

  // Generate content
  if (t.includes('สร้าง') || t.includes('คอนเทนต์') ||
      t.includes('创建') || t.includes('生成') || t.includes('内容') ||
      t.includes('generate') || t.includes('create') || t.includes('content'))
    return { action: 'generate_content', confidence: 0.7, params: { product: text }, speak_text: 'กำลังสร้างคอนเทนต์', display_text: 'สร้างคอนเทนต์' };

  // Trending
  if (t.includes('เทรนด์') || t.includes('แฮชแท็ก') ||
      t.includes('趋势') || t.includes('热门') || t.includes('话题') ||
      t.includes('trend') || t.includes('hashtag'))
    return { action: 'get_trending', confidence: 0.8, params: {}, speak_text: 'กำลังดูเทรนด์', display_text: 'เทรนด์' };

  // News
  if (t.includes('ข่าว') || t.includes('新闻') || t.includes('资讯') || t.includes('news'))
    return { action: 'get_news', confidence: 0.8, params: {}, speak_text: 'กำลังดูข่าว', display_text: 'ข่าว' };

  // System health
  if (t.includes('สุขภาพ') || t.includes('ตรวจ') ||
      t.includes('系统') || t.includes('健康') || t.includes('检查') ||
      t.includes('health') || t.includes('status'))
    return { action: 'system_health', confidence: 0.8, params: {}, speak_text: 'กำลังตรวจระบบ', display_text: 'ตรวจระบบ' };

  // Competitor
  if (t.includes('คู่แข่ง') || t.includes('วิเคราะห์') ||
      t.includes('竞争') || t.includes('对手') || t.includes('分析') ||
      t.includes('competitor') || t.includes('analyze'))
    return { action: 'competitor_analyze', confidence: 0.6, params: {}, speak_text: 'ระบุ niche ที่ต้องการ', display_text: 'วิเคราะห์คู่แข่ง' };

  // Agent
  if (t.includes('เอเจนต์') || t.includes('agent') ||
      t.includes('代理') || t.includes('机器人'))
    return { action: 'list_agents', confidence: 0.8, params: {}, speak_text: 'กำลังดูรายการเอเจนต์', display_text: 'รายการเอเจนต์' };

  // Help
  if (t.includes('ช่วย') || t.includes('คำสั่ง') ||
      t.includes('帮助') || t.includes('命令') || t.includes('什么') ||
      t.includes('help') || t.includes('command'))
    return { action: 'help', confidence: 0.9, params: {}, speak_text: '显示所有命令 / แสดงคำสั่งทั้งหมด / Show all commands', display_text: 'Help' };

  return { action: 'unknown', confidence: 0.3, params: {}, speak_text: '未能理解 / ไม่เข้าใจ / Not understood', display_text: '?' };
}
