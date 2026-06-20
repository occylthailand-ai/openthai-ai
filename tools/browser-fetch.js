/**
 * browser-fetch.js — เปิด URL ด้วย Headless Browser อัตโนมัติ
 * ใช้ Puppeteer-core + Chrome/Chromium ที่ติดตั้งในเครื่อง
 *
 * วิธีใช้:
 *   node browser-fetch.js <URL> [--screenshot] [--wait=5000]
 *   node browser-fetch.js https://web.facebook.com/share/r/xxx/ --screenshot
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── หาตำแหน่ง Chrome/Chromium ─────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
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

  // ลองหาด้วย which/where
  try {
    const result = execSync('which chromium || which chromium-browser || which google-chrome 2>/dev/null', { encoding: 'utf8' }).trim().split('\n')[0];
    if (result && existsSync(result)) return result;
  } catch (_) {}

  return null;
}

// ── Parse arguments ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http')) || 'https://www.facebook.com';
const doScreenshot = args.includes('--screenshot');
const waitMs = parseInt(args.find(a => a.startsWith('--wait='))?.split('=')[1] || '3000');
const outputDir = join(__dirname, 'output');
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

async function run() {
  console.log('\n🌐 Browser Fetch — Openthai.ai Social Tools');
  console.log('='.repeat(50));
  console.log(`📌 URL: ${url}`);
  console.log(`⏳ Wait: ${waitMs}ms`);

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('\n❌ ไม่พบ Chrome/Chromium ในเครื่อง');
    console.log('\n💡 ติดตั้ง Chromium:');
    console.log('   Ubuntu/Debian: sudo apt-get install chromium-browser');
    console.log('   macOS:         brew install --cask google-chrome');
    console.log('   หรือตั้ง CHROME_PATH=/path/to/chrome ใน .env');
    console.log('\n🔄 ใช้โหมด HTTP fallback แทน...\n');
    return httpFallback(url);
  }

  console.log(`✅ Chrome: ${chromePath}`);

  let puppeteer;
  try {
    puppeteer = await import('puppeteer-core');
    puppeteer = puppeteer.default || puppeteer;
  } catch (_) {
    console.log('❌ puppeteer-core ไม่พร้อม — ใช้ HTTP fallback');
    return httpFallback(url);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
    ],
  });

  try {
    const page = await browser.newPage();

    // ตั้ง User Agent เป็น Chrome จริง เพื่อไม่โดน block
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    console.log('\n🔄 กำลังเปิดหน้า...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(waitMs);

    // ── ดึงข้อความจากหน้า ─────────────────────────────────────────────────────
    const content = await page.evaluate(() => {
      // ลบ scripts, styles, ads
      document.querySelectorAll('script, style, nav, header, footer, [role="banner"]').forEach(el => el.remove());

      const title = document.title;
      const bodyText = document.body?.innerText || '';

      // หา meta description
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      // หา links ทั้งหมด
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(l => l.text && l.href && !l.href.startsWith('javascript'))
        .slice(0, 20);

      return { title, desc, ogTitle, ogDesc, ogImage, bodyText: bodyText.slice(0, 5000), links };
    });

    console.log('\n📄 ผลลัพธ์:');
    console.log('─'.repeat(50));
    console.log(`📌 Title:    ${content.title}`);
    console.log(`📝 OG Title: ${content.ogTitle}`);
    console.log(`💬 OG Desc:  ${content.ogDesc}`);
    console.log(`🖼️  OG Image: ${content.ogImage}`);
    console.log(`\n📃 เนื้อหา (500 ตัวอักษรแรก):\n${content.bodyText.slice(0, 500)}`);

    // ── Screenshot ────────────────────────────────────────────────────────────
    if (doScreenshot) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const screenshotPath = join(outputDir, `screenshot-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\n📸 Screenshot บันทึกแล้ว: ${screenshotPath}`);
      content.screenshotPath = screenshotPath;
    }

    // ── บันทึกผลเป็น JSON ──────────────────────────────────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = join(outputDir, `fetch-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify({ url, fetchedAt: new Date().toISOString(), ...content }, null, 2));
    console.log(`\n💾 JSON บันทึกแล้ว: ${jsonPath}`);

    return content;
  } finally {
    await browser.close();
  }
}

// ── HTTP Fallback (ไม่ต้อง browser) ──────────────────────────────────────────
async function httpFallback(targetUrl) {
  const { default: fetch } = await import('node-fetch');
  const { load } = await import('cheerio');

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenthaiBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'th,en;q=0.9',
      },
      timeout: 10000,
      redirect: 'follow',
    });

    const html = await res.text();
    const $ = load(html);

    const result = {
      url: targetUrl,
      finalUrl: res.url,
      status: res.status,
      title: $('title').text().trim(),
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDesc: $('meta[property="og:description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      description: $('meta[name="description"]').attr('content') || '',
      bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000),
    };

    console.log('\n📡 HTTP Result (no browser):');
    console.log(`Status: ${result.status} | Title: ${result.title}`);
    console.log(`OG: ${result.ogTitle} — ${result.ogDesc.slice(0, 100)}`);
    if (result.ogImage) console.log(`Image: ${result.ogImage}`);

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = join(outputDir, `http-fetch-${ts}.json`);
    writeFileSync(jsonPath, JSON.stringify({ fetchedAt: new Date().toISOString(), ...result }, null, 2));
    console.log(`\n💾 บันทึก: ${jsonPath}`);

    return result;
  } catch (e) {
    console.error(`\n❌ HTTP Error: ${e.message}`);
    console.log('\n💡 Facebook ต้องการ Login — กรุณาใช้ social-pipeline.js');
    return null;
  }
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
