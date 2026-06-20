/**
 * screenshot.js — จับภาพหน้าจอ URL แล้วอัพโหลดไป Chat อัตโนมัติ
 *
 * วิธีใช้:
 *   node screenshot.js <URL> [--full] [--upload] [--wait=3000]
 *   node screenshot.js https://example.com --full --upload
 *
 * ผลลัพธ์: บันทึก PNG ใน output/ และ (ถ้า --upload) ส่งไป Slack/LINE/Discord
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── หา Chrome ─────────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    config.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    const r = execSync('which chromium || which chromium-browser || which google-chrome 2>/dev/null', { encoding: 'utf8' }).trim().split('\n')[0];
    if (r && existsSync(r)) return r;
  } catch (_) {}
  return null;
}

// ── อัพโหลดไป Slack ───────────────────────────────────────────────────────────
async function uploadToSlack(imagePath, caption) {
  if (!config.SLACK_WEBHOOK_URL) return false;
  const { default: fetch } = await import('node-fetch');
  const { default: FormData } = await import('form-data').catch(() => ({ default: null }));

  // Slack Incoming Webhook รองรับแค่ JSON payload (ไม่รองรับ file upload โดยตรง)
  // ส่งเป็น text พร้อม path แทน
  const payload = {
    text: `📸 *Screenshot*\n${caption}\n_บันทึกที่: ${imagePath}_`,
    username: 'Openthai Social Bot',
    icon_emoji: ':camera:',
  };
  const res = await fetch(config.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

// ── อัพโหลดไป LINE Notify ─────────────────────────────────────────────────────
async function uploadToLine(imagePath, caption) {
  if (!config.LINE_NOTIFY_TOKEN) return false;
  const { default: fetch } = await import('node-fetch');
  const { createReadStream } = await import('fs');

  // LINE Notify รองรับ multipart/form-data กับ imageFile
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const imageBuffer = readFileSync(imagePath);

  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${caption}`,
    `--${boundary}\r\nContent-Disposition: form-data; name="imageFile"; filename="screenshot.png"\r\nContent-Type: image/png\r\n\r\n`,
  ];

  const body = Buffer.concat([
    Buffer.from(parts[0] + '\r\n'),
    Buffer.from(parts[1]),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.LINE_NOTIFY_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });
  return res.ok;
}

// ── อัพโหลดไป Discord/Generic Webhook ────────────────────────────────────────
async function uploadToWebhook(imagePath, caption, url) {
  if (!url) return false;
  const { default: fetch } = await import('node-fetch');
  const imageBuffer = readFileSync(imagePath);
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

  const jsonPart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify({ content: `📸 ${caption}` }) + '\r\n'
  );
  const filePart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="screenshot.png"\r\nContent-Type: image/png\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([jsonPart, filePart, imageBuffer, tail]);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });
  return res.ok;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http')) || null;
const doFull = args.includes('--full');
const doUpload = args.includes('--upload');
const waitMs = parseInt(args.find(a => a.startsWith('--wait='))?.split('=')[1] || '3000');

if (!url) {
  console.error('❌ กรุณาระบุ URL\nวิธีใช้: node screenshot.js <URL> [--full] [--upload] [--wait=3000]');
  process.exit(1);
}

if (!existsSync(config.OUTPUT_DIR)) mkdirSync(config.OUTPUT_DIR, { recursive: true });

async function run() {
  console.log('\n📸 Screenshot Tool — Openthai.ai');
  console.log('='.repeat(50));
  console.log(`📌 URL:      ${url}`);
  console.log(`📐 Mode:     ${doFull ? 'Full Page' : 'Viewport'}`);
  console.log(`📤 Upload:   ${doUpload ? 'Yes' : 'No'}`);
  console.log(`⏳ Wait:     ${waitMs}ms`);

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('\n❌ ไม่พบ Chrome/Chromium');
    console.log('💡 ติดตั้ง: sudo apt-get install chromium-browser');
    console.log('   หรือตั้ง CHROME_PATH ใน .env');
    process.exit(1);
  }
  console.log(`✅ Chrome: ${chromePath}`);

  let puppeteer;
  try {
    puppeteer = await import('puppeteer-core');
    puppeteer = puppeteer.default || puppeteer;
  } catch (_) {
    console.error('❌ puppeteer-core ไม่พร้อม: npm install puppeteer-core');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1440,900'],
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotPath = join(config.OUTPUT_DIR, `screenshot-${timestamp}.png`);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1440, height: 900 });

    // โหลด cookies ถ้ามี (จาก fb-login.js)
    if (existsSync(config.FB_COOKIES_PATH)) {
      try {
        const cookies = JSON.parse(readFileSync(config.FB_COOKIES_PATH, 'utf8'));
        await page.setCookie(...cookies);
        console.log(`🍪 โหลด cookies สำเร็จ (${cookies.length} cookies)`);
      } catch (_) {}
    }

    console.log('\n🔄 กำลังโหลดหน้า...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`⏳ รอ ${waitMs}ms...`);
    await page.waitForTimeout(waitMs);

    // ดึง title เพื่อใช้เป็น caption
    const pageTitle = await page.title();
    const caption = `${pageTitle}\n${url}`;

    console.log('\n📸 กำลังถ่ายภาพ...');
    await page.screenshot({ path: screenshotPath, fullPage: doFull });
    console.log(`✅ บันทึกแล้ว: ${screenshotPath}`);

    // บันทึก metadata JSON
    const metaPath = screenshotPath.replace('.png', '-meta.json');
    writeFileSync(metaPath, JSON.stringify({
      url,
      title: pageTitle,
      capturedAt: new Date().toISOString(),
      screenshotPath,
      fullPage: doFull,
      waitMs,
    }, null, 2));

    if (doUpload) {
      console.log('\n📤 กำลังอัพโหลด...');
      const results = await Promise.allSettled([
        uploadToSlack(screenshotPath, caption),
        uploadToLine(screenshotPath, caption),
        uploadToWebhook(screenshotPath, caption, config.CHAT_WEBHOOK_URL),
      ]);

      const [slack, line, webhook] = results;
      if (slack.value) console.log('  ✅ Slack: สำเร็จ');
      else if (config.SLACK_WEBHOOK_URL) console.log('  ❌ Slack: ล้มเหลว');

      if (line.value) console.log('  ✅ LINE Notify: สำเร็จ');
      else if (config.LINE_NOTIFY_TOKEN) console.log('  ❌ LINE Notify: ล้มเหลว');

      if (webhook.value) console.log('  ✅ Webhook: สำเร็จ');
      else if (config.CHAT_WEBHOOK_URL) console.log('  ❌ Webhook: ล้มเหลว');

      if (!config.SLACK_WEBHOOK_URL && !config.LINE_NOTIFY_TOKEN && !config.CHAT_WEBHOOK_URL) {
        console.log('  ⚠️  ไม่มี webhook ที่กำหนดใน .env');
        console.log('  💡 เพิ่ม SLACK_WEBHOOK_URL / LINE_NOTIFY_TOKEN / CHAT_WEBHOOK_URL');
      }
    }

    console.log('\n✅ เสร็จสิ้น!');
    return { screenshotPath, metaPath, url, title: pageTitle };
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
