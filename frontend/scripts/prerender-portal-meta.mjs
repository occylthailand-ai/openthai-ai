// Social crawlers (Facebook/LINE link previews, Twitter cards) don't run the app's JS — they
// read the raw HTML at the requested path. This is a client-side-routed SPA (BrowserRouter), so
// every route was served the exact same dist/index.html with the homepage's <title>/OG tags.
// Sharing a /portals/producer link on LINE (the dominant Thai sharing channel, and this app's
// main funnel channel) showed the homepage's TikTok caption pitch instead of anything about
// producers. Fixes run 18's document.title fix only helped Google (which does render JS) — it
// never touched what non-JS social crawlers see.
//
// This writes a static <route>/index.html per portal — a copy of the real built index.html with
// only the meta tags swapped — so Vercel's filesystem-first static resolution serves the correct
// preview tags directly, while the same bundled JS still boots and React Router renders the
// normal SPA page from window.location.pathname (no separate render path, no behavior change for
// real visitors — this file is only ever the *first* HTML byte, not a different app).
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const DOMAIN = 'https://www.openthai-ai.com';

// title/description text below is copied verbatim from each page's own `T`/`LANG` i18n object
// (same source run 18 used for document.title) — matching whichever language that page's
// useState() actually defaults to, so the preview matches what a visitor sees on first load.
const ROUTES = [
  { path: '/portals', title: 'ประตูสู่ OpenThai.ai', desc: 'เลือกประเภทของท่านเพื่อเข้าร่วมเป็นส่วนหนึ่งของระบบนิเวศ AI ไทย — ผู้ผลิต ผู้บริโภค คนกลาง ครีเอเตอร์ Affiliate หน่วยงานรัฐ องค์กรระหว่างประเทศ และมูลนิธิ' },
  { path: '/portals/producer', title: 'ทางเข้าผู้ผลิต', desc: 'เชื่อมต่อสินค้าของคุณกับตลาด AI ไทยและทั่วโลก — ขายผ่าน AI-powered store, เข้าถึงผู้ซื้อทั่วโลก, ระบบ inventory อัตโนมัติ' },
  { path: '/portals/affiliate', title: 'ทางเข้าผู้ขาย / Affiliate', desc: 'ขายสินค้าจาก OpenThai.ai และรับค่าคอมมิชชั่นสูงสุด 30% ต่อการขาย พร้อม Dashboard ติดตาม real-time' },
  { path: '/portals/creator', title: 'ทางเข้าผู้ร่วมสร้างคอนเทนต์', desc: 'ร่วมสร้างคอนเทนต์ AI จากทุกแพลตฟอร์ม TikTok / IG / YouTube ไม่จำกัดประเทศ' },
  { path: '/portals/consumer', title: 'ทางเข้าผู้บริโภค', desc: 'สมัครรับสิทธิพิเศษ ส่วนลด และสินค้าใหม่จากผู้ผลิตไทยก่อนใคร พร้อมคำแนะนำเฉพาะตัวจาก AI' },
  { path: '/portals/middleman', title: 'ทางเข้าคนกลาง / ตัวแทนจำหน่าย', desc: 'ตัวแทนจำหน่าย ผู้ค้าส่ง นายหน้า และคนกลางทุกประเภท เข้าร่วมเครือข่ายกระจายสินค้า OpenThaiAi' },
  { path: '/portals/gov-thai', title: 'ทางเข้าหน่วยงานรัฐไทย', desc: 'บูรณาการ AI เข้าสู่ระบบงานภาครัฐไทย เพื่อประชาชน — แชทบอท, วิเคราะห์ข้อมูล, Dashboard ราชการ' },
  { path: '/portals/gov-intl', title: 'Foreign Government Agency Portal', desc: 'AI collaboration for governments worldwide — no country restrictions. G2G programs, AI policy consultation, secure data exchange.' },
  { path: '/portals/intl-org', title: 'International Organization Portal', desc: 'Partnering with global institutions to advance AI for humanity — UN agencies, ASEAN bodies, development banks, SDG-aligned programs.' },
  { path: '/portals/foundation', title: 'ทางเข้ามูลนิธิเพื่อสังคม', desc: 'OpenThai.ai แบ่งปันกำไรให้มูลนิธิช่วยเหลือผู้ยากไร้เมื่อกำไรรวมเกิน 10 ล้านบาท — โปร่งใส ตรวจสอบได้' },
];

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const base = readFileSync(join(DIST, 'index.html'), 'utf8');

for (const { path, title, desc } of ROUTES) {
  const url = DOMAIN + path;
  const fullTitle = `${title} — Openthai.ai`;
  let html = base;
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeAttr(fullTitle)}</title>`);
  html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeAttr(desc)}" />`);
  html = html.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${escapeAttr(fullTitle)}" />`);
  html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
  html = html.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${escapeAttr(fullTitle)}" />`);
  html = html.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${escapeAttr(desc)}" />`);

  const outDir = join(DIST, path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`[prerender-portal-meta] wrote ${path}/index.html — "${fullTitle}"`);
}
