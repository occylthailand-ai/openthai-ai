/**
 * social-pipeline.js — ไปป์ไลน์รวมทุก Tool อัตโนมัติ
 *
 * เส้นทาง: URL → ดึงข้อมูล → Screenshot → สกัดข้อความ → AI วิเคราะห์ → รายงานครบ
 *
 * วิธีใช้:
 *   node social-pipeline.js <URL> [options]
 *   node social-pipeline.js https://example.com
 *   node social-pipeline.js https://www.facebook.com/xxx --no-screenshot
 *   node social-pipeline.js https://example.com --upload --wait=5000
 *
 * Options:
 *   --no-screenshot    ข้ามขั้นตอน screenshot
 *   --no-analyze       ข้ามขั้นตอน AI วิเคราะห์
 *   --upload           อัพโหลดรายงานไป chat/Slack/LINE
 *   --wait=N           รอ N ms ก่อน screenshot (default: 3000)
 *   --full             Screenshot แบบ full page
 *   --out=<dir>        กำหนด output directory
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── หา Chrome ─────────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    config.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const p of candidates) if (existsSync(p)) return p;
  try {
    const r = execSync('which chromium || which chromium-browser || which google-chrome 2>/dev/null', { encoding: 'utf8' }).trim().split('\n')[0];
    if (r && existsSync(r)) return r;
  } catch (_) {}
  return null;
}

// ── Step 1: ดึงข้อมูลจาก URL ─────────────────────────────────────────────────
async function stepFetch(url, waitMs, chromePath) {
  console.log('\n[1/4] 🌐 ดึงข้อมูลจาก URL...');

  if (chromePath) {
    let puppeteer;
    try { puppeteer = (await import('puppeteer-core')).default || (await import('puppeteer-core')); } catch (_) {}

    if (puppeteer) {
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1440,900'],
      });
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1440, height: 900 });

        if (existsSync(config.FB_COOKIES_PATH)) {
          try {
            const cookies = JSON.parse(readFileSync(config.FB_COOKIES_PATH, 'utf8'));
            await page.setCookie(...cookies);
            console.log(`   🍪 โหลด ${cookies.length} cookies`);
          } catch (_) {}
        }

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(waitMs);

        const content = await page.evaluate(() => {
          document.querySelectorAll('script, style').forEach(el => el.remove());
          return {
            title: document.title,
            ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
            ogDesc: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
            ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            bodyText: document.body?.innerText?.slice(0, 5000) || '',
            links: Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText?.trim(), href: a.href })).filter(l => l.text && l.href && !l.href.startsWith('javascript')).slice(0, 20),
          };
        });
        content._via = 'browser';
        console.log(`   ✅ สำเร็จ (browser) — Title: ${content.title}`);
        return { browser, page, content };
      } catch (e) {
        await browser.close();
        console.log(`   ⚠️  Browser fetch ล้มเหลว: ${e.message}`);
      }
    }
  }

  // HTTP Fallback
  console.log('   🔄 ใช้ HTTP fallback...');
  const { default: fetch } = await import('node-fetch');
  const { load } = await import('cheerio');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenthaiBot/1.0)', 'Accept-Language': 'th,en;q=0.9' },
    timeout: 10000,
  });
  const html = await res.text();
  const $ = load(html);
  const content = {
    title: $('title').text().trim(),
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDesc: $('meta[property="og:description"]').attr('content') || '',
    ogImage: $('meta[property="og:image"]').attr('content') || '',
    description: $('meta[name="description"]').attr('content') || '',
    bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000),
    _via: 'http',
  };
  console.log(`   ✅ สำเร็จ (HTTP) — Title: ${content.title}`);
  return { browser: null, page: null, content };
}

// ── Step 2: Screenshot ────────────────────────────────────────────────────────
async function stepScreenshot(page, browser, outputDir, doFull) {
  console.log('\n[2/4] 📸 ถ่ายภาพหน้าจอ...');
  if (!page || !browser) {
    console.log('   ⚠️  ไม่มี browser session — ข้าม');
    return null;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotPath = join(outputDir, `screenshot-${ts}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: doFull });
  await browser.close();
  console.log(`   ✅ บันทึก: ${screenshotPath}`);
  return screenshotPath;
}

// ── Step 3: สกัดข้อความ ──────────────────────────────────────────────────────
function stepExtract(content) {
  console.log('\n[3/4] 📝 สกัดข้อความ...');
  const parts = [
    content.ogTitle && `Title: ${content.ogTitle}`,
    content.ogDesc && `Description: ${content.ogDesc}`,
    content.title && content.title !== content.ogTitle && `Page Title: ${content.title}`,
    content.bodyText && `Content:\n${content.bodyText}`,
  ].filter(Boolean);
  const text = parts.join('\n\n');
  console.log(`   ✅ ${text.length} ตัวอักษร`);
  return text;
}

// ── Step 4: AI วิเคราะห์ ──────────────────────────────────────────────────────
async function stepAnalyze(text) {
  console.log('\n[4/4] 🧠 AI วิเคราะห์...');

  const hasKey = config.ANTHROPIC_API_KEY || config.OPENAI_API_KEY || config.GEMINI_API_KEY;
  if (!hasKey) {
    console.log('   ⚠️  ไม่มี AI API key — ข้าม (เพิ่มใน .env)');
    return null;
  }

  const { default: fetch } = await import('node-fetch');
  const prompt = `วิเคราะห์เนื้อหาโพสต์นี้แล้วตอบเป็น JSON:

"""
${text.slice(0, 3000)}
"""

{
  "summary": "สรุป 1-2 ประโยค",
  "topic": "หัวข้อหลัก",
  "sentiment": "positive|negative|neutral",
  "emotion": "ความรู้สึก",
  "content_type": "news|promotion|personal|entertainment|educational|opinion",
  "keywords": ["3-5 คำสำคัญ"],
  "hashtags_suggested": ["5 hashtags แนะนำ"],
  "engagement_potential": "high|medium|low",
  "insights": "สิ่งที่น่าสนใจ",
  "narration": "เล่าเนื้อหาเป็นภาษาพูดว่าโพสต์พูดถึงอะไร (2-3 ประโยค)"
}`;

  let raw = '';
  try {
    if (config.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': config.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      });
      const d = await res.json();
      raw = d.content?.[0]?.text || '';
    } else if (config.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
      });
      const d = await res.json();
      raw = d.choices?.[0]?.message?.content || '';
    } else if (config.GEMINI_API_KEY) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const d = await res.json();
      raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  } catch (e) {
    console.log(`   ⚠️  AI ล้มเหลว: ${e.message}`);
    return null;
  }

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      console.log('   ✅ วิเคราะห์สำเร็จ');
      return result;
    }
  } catch (_) {}
  console.log('   ⚠️  parse JSON ล้มเหลว');
  return { raw };
}

// ── Upload report ─────────────────────────────────────────────────────────────
async function uploadReport(reportPath, summary, screenshotPath) {
  const { default: fetch } = await import('node-fetch');
  const text = `📊 *Social Media Analysis*\n${summary}\n_รายงาน: ${reportPath}_`;

  const results = [];
  if (config.SLACK_WEBHOOK_URL) {
    try {
      const r = await fetch(config.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, username: 'Openthai Social Bot', icon_emoji: ':bar_chart:' }),
      });
      results.push(`Slack: ${r.ok ? '✅' : '❌'}`);
    } catch (e) { results.push(`Slack: ❌ (${e.message})`); }
  }

  if (config.LINE_NOTIFY_TOKEN) {
    try {
      const body = new URLSearchParams({ message: `\n${text.replace(/\*/g, '')}` });
      const r = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.LINE_NOTIFY_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      results.push(`LINE: ${r.ok ? '✅' : '❌'}`);
    } catch (e) { results.push(`LINE: ❌ (${e.message})`); }
  }

  if (results.length) console.log(`   ${results.join(' | ')}`);
  else console.log('   ⚠️  ไม่มี webhook — ข้าม (เพิ่ม SLACK_WEBHOOK_URL / LINE_NOTIFY_TOKEN ใน .env)');
}

// ── แสดงรายงานสุดท้าย ─────────────────────────────────────────────────────────
function printFinalReport(report) {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 รายงานสรุป Social Media Analysis');
  console.log('═'.repeat(60));
  console.log(`\n🌐 URL: ${report.url}`);
  console.log(`📅 เวลา: ${new Date(report.pipelineAt).toLocaleString('th-TH')}`);
  console.log(`⚙️  วิธีดึงข้อมูล: ${report.fetchedVia}`);

  if (report.fetch) {
    console.log(`\n📌 Title: ${report.fetch.title || report.fetch.ogTitle}`);
    if (report.fetch.ogDesc) console.log(`💬 Description: ${report.fetch.ogDesc.slice(0, 150)}`);
    if (report.fetch.ogImage) console.log(`🖼️  Image: ${report.fetch.ogImage}`);
  }

  if (report.screenshot) console.log(`\n📸 Screenshot: ${report.screenshot}`);

  if (report.analysis) {
    const a = report.analysis;
    console.log(`\n🧠 AI วิเคราะห์:`);
    if (a.narration) console.log(`\n   📢 "${a.narration}"`);
    if (a.summary) console.log(`\n   สรุป: ${a.summary}`);
    if (a.topic) console.log(`   หัวข้อ: ${a.topic}`);
    if (a.sentiment) console.log(`   Sentiment: ${a.sentiment} | ${a.emotion}`);
    if (a.engagement_potential) console.log(`   Engagement: ${a.engagement_potential}`);
    if (a.keywords?.length) console.log(`   Keywords: ${a.keywords.join(', ')}`);
    if (a.hashtags_suggested?.length) console.log(`   Hashtags: ${a.hashtags_suggested.join(' ')}`);
    if (a.insights) console.log(`\n   💡 ${a.insights}`);
  }

  console.log(`\n💾 รายงานเต็ม: ${report.reportPath}`);
  console.log('═'.repeat(60));
}

// ── Main Pipeline ──────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Social Media Pipeline — Openthai.ai');
  console.log('='.repeat(60));

  const args = process.argv.slice(2);
  const url = args.find(a => a.startsWith('http'));
  if (!url) {
    console.log('วิธีใช้: node social-pipeline.js <URL> [--no-screenshot] [--no-analyze] [--upload] [--wait=3000] [--full]');
    process.exit(0);
  }

  const doScreenshot = !args.includes('--no-screenshot');
  const doAnalyze = !args.includes('--no-analyze');
  const doUpload = args.includes('--upload');
  const doFull = args.includes('--full');
  const waitMs = parseInt(args.find(a => a.startsWith('--wait='))?.split('=')[1] || '3000');
  const outputDir = args.find(a => a.startsWith('--out='))?.split('=')[1] || config.OUTPUT_DIR;

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  console.log(`📌 URL: ${url}`);
  console.log(`📸 Screenshot: ${doScreenshot ? 'Yes' : 'No'}  |  🧠 AI: ${doAnalyze ? 'Yes' : 'No'}  |  📤 Upload: ${doUpload ? 'Yes' : 'No'}`);

  const chromePath = findChrome();
  if (chromePath) console.log(`✅ Chrome: ${chromePath}`);
  else console.log('⚠️  ไม่พบ Chrome — ใช้ HTTP fallback');

  const startTime = Date.now();
  const report = { url, pipelineAt: new Date().toISOString(), fetchedVia: null, fetch: null, screenshot: null, text: null, analysis: null };

  try {
    // Step 1: Fetch
    const { browser, page, content } = await stepFetch(url, waitMs, chromePath);
    report.fetch = content;
    report.fetchedVia = content._via;

    // Step 2: Screenshot
    if (doScreenshot) {
      report.screenshot = await stepScreenshot(page, browser, outputDir, doFull);
    } else if (browser) {
      await browser.close();
    }

    // Step 3: Extract text
    report.text = stepExtract(content);

    // Step 4: AI Analyze
    if (doAnalyze) {
      report.analysis = await stepAnalyze(report.text);
    }

    // Save report
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = join(outputDir, `pipeline-report-${ts}.json`);
    report.reportPath = reportPath;
    report.durationMs = Date.now() - startTime;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    printFinalReport(report);

    // Upload
    if (doUpload) {
      console.log('\n📤 อัพโหลด...');
      const summary = report.analysis?.narration || report.analysis?.summary || report.fetch?.ogDesc?.slice(0, 200) || url;
      await uploadReport(reportPath, summary, report.screenshot);
    }

    console.log(`\n⏱️  เสร็จสิ้นใน ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  } catch (e) {
    console.error(`\n❌ Pipeline Error: ${e.message}`);
    process.exit(1);
  }
}

main();
