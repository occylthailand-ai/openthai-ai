// Social crawlers (Facebook/LINE link previews, Twitter cards) don't run the app's JS — they
// read the raw HTML at the requested path. This is a client-side-routed SPA (BrowserRouter), so
// every route was served the exact same dist/index.html with the homepage's <title>/OG tags.
// Sharing a /portals/producer link on LINE (the dominant Thai sharing channel, and this app's
// main funnel channel) showed the homepage's TikTok caption pitch instead of anything about
// producers. Fixes run 18's document.title fix only helped Google (which does render JS) — it
// never touched what non-JS social crawlers see.
//
// Started (run 21) covering just the 10 /portals/* routes; run 26 extended it to the other real,
// public, evergreen pages that had the exact same defect (/catalog, /join, /find-producers,
// /privacy, /terms, /contact) — hence the file's name no longer says "portal".
//
// This writes a static <route>/index.html per page — a copy of the real built index.html with
// only the meta tags swapped — so Vercel's filesystem-first static resolution serves the correct
// preview tags directly, while the same bundled JS still boots and React Router renders the
// normal SPA page from window.location.pathname (no separate render path, no behavior change for
// real visitors — this file is only ever the *first* HTML byte, not a different app).
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// ROUTES + DOMAIN live in their own side-effect-free module so the SEO-invariant
// test (src/__tests__/seoInvariants.test.js) can import the exact same list this
// build script uses, without triggering the dist/index.html read below.
import { DOMAIN, ROUTES } from './seo-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Per-route BreadcrumbList JSON-LD. The base index.html already carries the
// Organization + WebSite + SoftwareApplication @graph (copied onto every route),
// but breadcrumbs are the one structured-data piece that must differ per page —
// they make Google show a "หน้าแรก › พอร์ทัล › <page>" trail in the SERP instead
// of a bare URL. Hierarchy is derived from the real path: child portals
// (/portals/producer …) sit under /portals; everything else is one level below
// home. Names come from the same ROUTES titles used for <title>/OG, so the crumb
// matches the page. JSON.stringify handles value escaping; we additionally escape
// "<" so the serialized JSON can never break out of the <script> element.
const byPath = Object.fromEntries(ROUTES.map((r) => [r.path, r.title]));
function breadcrumbJsonLd(path, title) {
  const crumbs = [{ name: 'หน้าแรก', url: DOMAIN + '/' }];
  if (path.startsWith('/portals/')) {
    crumbs.push({ name: byPath['/portals'] || 'Portals', url: DOMAIN + '/portals' });
  }
  crumbs.push({ name: title, url: DOMAIN + path });
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
    })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
  // Add the page-specific BreadcrumbList alongside the inherited @graph block.
  html = html.replace('</head>', `  <script type="application/ld+json">${breadcrumbJsonLd(path, title)}</script>\n  </head>`);

  const outDir = join(DIST, path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`[prerender-meta] wrote ${path}/index.html — "${fullTitle}"`);
}

// ── sitemap.xml (generated from the same ROUTES list) ────────────────────────
// เดิม sitemap.xml เป็นไฟล์ static ใน public/ ที่ต้องแก้มือ — lastmod ค้างอยู่ที่
// 2026-05-03 ทั้งไฟล์ทั้งที่โค้ดถูกอัปเดตต่อเนื่อง (search engine ใช้ lastmod จัดลำดับ
// การ recrawl หน้าจึงถูกดีเลย์) และเป็นสำเนา route list ชุดที่ 3 (คู่กับ ROUTES ที่นี่
// และ robots.txt) ที่พร้อมจะ drift สร้างจาก ROUTES ตรงนี้แทน — lastmod = วันที่ build
// เสมอ และชุด URL sync กับ prerender เองอัตโนมัติ
const today = new Date().toISOString().slice(0, 10);
const LEGAL = new Set(['/privacy', '/terms', '/about', '/contact']);
const hints = (p) =>
  p === '/' ? { priority: '1.0', changefreq: 'weekly' }
  : LEGAL.has(p) ? { priority: '0.5', changefreq: 'monthly' }
  : { priority: '0.8', changefreq: 'weekly' };
const sitemapPaths = ['/', ...ROUTES.map((r) => r.path)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((p) => {
  const { priority, changefreq } = hints(p);
  return `  <url>
    <loc>${DOMAIN}${p}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${today}</lastmod>
  </url>`;
}).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');
console.log(`[prerender-meta] wrote sitemap.xml — ${sitemapPaths.length} urls, lastmod ${today}`);
