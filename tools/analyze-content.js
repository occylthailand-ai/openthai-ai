/**
 * analyze-content.js — วิเคราะห์เนื้อหาโพสต์ Social Media ด้วย AI อัตโนมัติ
 *
 * วิธีใช้:
 *   node analyze-content.js "<ข้อความ>"
 *   node analyze-content.js --file output/fetch-xxx.json
 *   node analyze-content.js --url https://example.com
 *   echo "ข้อความ" | node analyze-content.js
 *
 * ต้องมี ANTHROPIC_API_KEY หรือ OPENAI_API_KEY หรือ GEMINI_API_KEY ใน .env
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── เรียก Anthropic Claude API ────────────────────────────────────────────────
async function callClaude(text) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: buildPrompt(text),
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ── เรียก OpenAI API ──────────────────────────────────────────────────────────
async function callOpenAI(text) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildPrompt(text) }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── เรียก Gemini API ──────────────────────────────────────────────────────────
async function callGemini(text) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text) }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Prompt สำหรับวิเคราะห์ ────────────────────────────────────────────────────
function buildPrompt(text) {
  return `คุณเป็น AI วิเคราะห์ Social Media ของไทย วิเคราะห์โพสต์ต่อไปนี้และตอบเป็น JSON เท่านั้น

โพสต์:
"""
${text.slice(0, 4000)}
"""

ตอบเป็น JSON ในรูปแบบนี้เท่านั้น (ไม่มีข้อความอื่น):
{
  "summary": "สรุปสั้นๆ ว่าโพสต์พูดถึงอะไร (1-2 ประโยค)",
  "topic": "หัวข้อหลัก",
  "sentiment": "positive | negative | neutral",
  "sentiment_score": 0.0,
  "emotion": "ความรู้สึกหลัก เช่น excited, angry, sad, informative, promotional",
  "language": "th | en | th-en",
  "content_type": "news | promotion | personal | entertainment | educational | opinion",
  "keywords": ["คำสำคัญ 1", "คำสำคัญ 2", "คำสำคัญ 3"],
  "hashtags_suggested": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "engagement_potential": "high | medium | low",
  "engagement_reason": "เหตุผลที่ Engagement จะสูง/ต่ำ",
  "credibility": "high | medium | low | unknown",
  "call_to_action": "มี CTA หรือไม่ และ CTA คืออะไร",
  "target_audience": "กลุ่มเป้าหมายที่น่าจะเห็นโพสต์นี้",
  "product_mentioned": "สินค้า/บริการที่พูดถึง (ถ้ามี)",
  "insights": "ข้อสังเกตพิเศษหรือสิ่งที่น่าสนใจเกี่ยวกับโพสต์นี้"
}`;
}

// ── เลือก AI ที่มี key ──────────────────────────────────────────────────────
async function analyzeWithAI(text) {
  if (config.ANTHROPIC_API_KEY) {
    console.log('🤖 ใช้ Claude (Anthropic)...');
    return callClaude(text);
  }
  if (config.OPENAI_API_KEY) {
    console.log('🤖 ใช้ GPT (OpenAI)...');
    return callOpenAI(text);
  }
  if (config.GEMINI_API_KEY) {
    console.log('🤖 ใช้ Gemini (Google)...');
    return callGemini(text);
  }
  throw new Error('ไม่มี AI API key — กรุณาเพิ่ม ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY ใน .env');
}

// ── Parse JSON จาก AI response ───────────────────────────────────────────────
function parseAIJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI ไม่ตอบเป็น JSON');
  return JSON.parse(match[0]);
}

// ── แสดงผลสวยงาม ──────────────────────────────────────────────────────────────
function printResult(result) {
  const sentimentEmoji = { positive: '😊', negative: '😟', neutral: '😐' }[result.sentiment] || '🤔';
  const engEmoji = { high: '🔥', medium: '📊', low: '💤' }[result.engagement_potential] || '📊';

  console.log('\n' + '═'.repeat(55));
  console.log('🧠 ผลการวิเคราะห์ AI');
  console.log('═'.repeat(55));
  console.log(`\n📌 สรุป: ${result.summary}`);
  console.log(`🏷️  หัวข้อ: ${result.topic}`);
  console.log(`📂 ประเภท: ${result.content_type}`);
  console.log(`${sentimentEmoji} Sentiment: ${result.sentiment} (${result.sentiment_score})`);
  console.log(`💭 อารมณ์: ${result.emotion}`);
  console.log(`🌐 ภาษา: ${result.language}`);
  console.log(`${engEmoji} Engagement: ${result.engagement_potential} — ${result.engagement_reason}`);
  console.log(`✅ Credibility: ${result.credibility}`);
  console.log(`👥 กลุ่มเป้าหมาย: ${result.target_audience}`);
  if (result.product_mentioned) console.log(`🛍️  สินค้า/บริการ: ${result.product_mentioned}`);
  if (result.call_to_action) console.log(`📢 CTA: ${result.call_to_action}`);
  console.log(`\n🔑 Keywords: ${result.keywords?.join(', ')}`);
  console.log(`#️⃣  Hashtags แนะนำ: ${result.hashtags_suggested?.join(' ')}`);
  console.log(`\n💡 Insights: ${result.insights}`);
  console.log('─'.repeat(55));
}

// ── ดึงข้อความจาก URL ────────────────────────────────────────────────────────
async function fetchTextFromUrl(targetUrl) {
  const { default: fetch } = await import('node-fetch');
  const { load } = await import('cheerio');
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OpenthaiBot/1.0)',
      'Accept-Language': 'th,en;q=0.9',
    },
    timeout: 10000,
  });
  const html = await res.text();
  const $ = load(html);
  const og = $('meta[property="og:description"]').attr('content') || '';
  const title = $('title').text();
  const body = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);
  return `${title}\n${og}\n${body}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 Content Analyzer — Openthai.ai');
  console.log('='.repeat(50));

  const args = process.argv.slice(2);
  let inputText = '';

  // --file <path>
  const fileArg = args.find(a => a === '--file');
  if (fileArg) {
    const filePath = args[args.indexOf('--file') + 1];
    if (!filePath || !existsSync(filePath)) {
      console.error(`❌ ไม่พบไฟล์: ${filePath}`); process.exit(1);
    }
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    inputText = [data.ogTitle, data.ogDesc, data.bodyText, data.title].filter(Boolean).join('\n');
    console.log(`📂 อ่านจาก: ${filePath}`);
  }
  // --url <url>
  else if (args.includes('--url')) {
    const urlArg = args[args.indexOf('--url') + 1];
    console.log(`🌐 ดึงข้อมูลจาก: ${urlArg}`);
    inputText = await fetchTextFromUrl(urlArg);
  }
  // argument ที่เป็น URL
  else if (args.find(a => a.startsWith('http'))) {
    const urlArg = args.find(a => a.startsWith('http'));
    console.log(`🌐 ดึงข้อมูลจาก: ${urlArg}`);
    inputText = await fetchTextFromUrl(urlArg);
  }
  // stdin (pipe)
  else if (!process.stdin.isTTY) {
    inputText = readFileSync('/dev/stdin', 'utf8');
    console.log('📥 รับข้อมูลจาก stdin');
  }
  // inline text
  else if (args.length > 0 && !args[0].startsWith('--')) {
    inputText = args.join(' ');
    console.log('📝 วิเคราะห์ข้อความที่ระบุ');
  }
  else {
    console.log('วิธีใช้:');
    console.log('  node analyze-content.js "ข้อความโพสต์"');
    console.log('  node analyze-content.js --url https://example.com');
    console.log('  node analyze-content.js --file output/fetch-xxx.json');
    console.log('  echo "ข้อความ" | node analyze-content.js');
    process.exit(0);
  }

  if (!inputText.trim()) {
    console.error('❌ ไม่มีข้อความให้วิเคราะห์'); process.exit(1);
  }

  console.log(`\n📊 ข้อความ (${inputText.length} ตัวอักษร):\n${inputText.slice(0, 200)}...`);

  const rawResponse = await analyzeWithAI(inputText);
  const result = parseAIJson(rawResponse);

  printResult(result);

  // บันทึก JSON
  if (!existsSync(config.OUTPUT_DIR)) mkdirSync(config.OUTPUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(config.OUTPUT_DIR, `analysis-${ts}.json`);
  writeFileSync(outPath, JSON.stringify({ analyzedAt: new Date().toISOString(), inputLength: inputText.length, ...result }, null, 2));
  console.log(`\n💾 บันทึกผล: ${outPath}`);

  return result;
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
