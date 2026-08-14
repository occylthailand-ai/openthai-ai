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
// The per-route HTML transform (title/OG/canonical swap + BreadcrumbList) lives in
// its own side-effect-free module too, so a unit test (routeMeta.test.js) can prove
// it both rewrites correctly and THROWS when the base template's tag format drifts.
// The base index.html already carries the Organization + WebSite + SoftwareApplication
// @graph (copied onto every route); applyRouteMeta adds the per-page BreadcrumbList so
// Google can show a "หน้าแรก › พอร์ทัล › <page>" trail instead of a bare URL.
import { applyRouteMeta } from './route-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const base = readFileSync(join(DIST, 'index.html'), 'utf8');
const portalsTitle = ROUTES.find((r) => r.path === '/portals')?.title || 'Portals';

for (const route of ROUTES) {
  // Throws (failing the build) if any target meta tag is missing from `base` — a
  // silently-unmatched replace would re-serve the homepage's preview on this page.
  const html = applyRouteMeta(base, route, DOMAIN, { portalsTitle });
  const outDir = join(DIST, route.path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`[prerender-meta] wrote ${route.path}/index.html — "${route.title} — Openthai.ai"`);
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
