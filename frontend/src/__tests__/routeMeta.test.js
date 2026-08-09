import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { applyRouteMeta, breadcrumbJsonLd, escapeAttr } from '../../scripts/route-meta.mjs';
import { DOMAIN, ROUTES } from '../../scripts/seo-routes.mjs';

// Guards the per-route prerender transform that gives every /portals/* + funnel page
// its own LINE/Facebook link-preview (title/description/canonical/OG/Twitter). The
// transform is a set of String.replace() calls against the base index.html — and
// String.replace silently no-ops when the pattern misses, which would re-serve the
// HOMEPAGE's preview on every funnel page (the exact regression this prerender exists
// to prevent). applyRouteMeta now throws on a miss; this test proves both the happy
// path and that fail-loud behaviour, using the REAL frontend/index.html as the base so
// a template edit that breaks a pattern fails here instead of shipping green.
const here = dirname(fileURLToPath(import.meta.url));
const baseHtml = readFileSync(join(here, '..', '..', 'index.html'), 'utf8');

const producer = { path: '/portals/producer', title: 'ทางเข้าผู้ผลิต', desc: 'เชื่อมต่อสินค้าของคุณกับตลาด' };
const contact = { path: '/contact', title: 'ติดต่อทีมงาน Openthai.ai', desc: 'ตอบกลับภายใน 1–2 วันทำการ' };

describe('applyRouteMeta — rewrites the base template into per-route preview meta', () => {
  it('swaps title / canonical / og:url / description to the route’s own values', () => {
    const html = applyRouteMeta(baseHtml, producer, DOMAIN, { portalsTitle: 'ประตูสู่ OpenThai.ai' });
    expect(html).toContain('<title>ทางเข้าผู้ผลิต — Openthai.ai</title>');
    expect(html).toContain(`<link rel="canonical" href="${DOMAIN}/portals/producer" />`);
    expect(html).toContain(`<meta property="og:url" content="${DOMAIN}/portals/producer" />`);
    expect(html).toContain('<meta property="og:title" content="ทางเข้าผู้ผลิต — Openthai.ai" />');
    expect(html).toContain('<meta name="twitter:title" content="ทางเข้าผู้ผลิต — Openthai.ai" />');
    expect(html).toContain('content="เชื่อมต่อสินค้าของคุณกับตลาด"');
  });

  it('leaves NONE of the homepage’s own title/canonical behind', () => {
    const html = applyRouteMeta(baseHtml, producer, DOMAIN);
    // the homepage canonical is the bare domain root; a funnel page must not keep it
    expect(html).not.toContain(`<link rel="canonical" href="${DOMAIN}/" />`);
    expect(html).not.toMatch(/<title>Openthai\.ai — สร้างคอนเทนต์ TikTok/);
  });

  it('does not cross-contaminate between two routes', () => {
    const a = applyRouteMeta(baseHtml, producer, DOMAIN);
    const b = applyRouteMeta(baseHtml, contact, DOMAIN);
    expect(a).toContain(`${DOMAIN}/portals/producer`);
    expect(a).not.toContain(`${DOMAIN}/contact`);
    expect(b).toContain(`${DOMAIN}/contact`);
    expect(b).not.toContain(`${DOMAIN}/portals/producer`);
  });

  it('sets <html lang> to the route’s language (th default; en for the international portals)', () => {
    // a Thai-default route keeps lang="th"
    const th = applyRouteMeta(baseHtml, contact, DOMAIN);
    expect(th).toContain('<html lang="th">');
    // an English-default route (carries lang:'en') is served lang="en", not the base template's th
    const en = applyRouteMeta(baseHtml, { path: '/portals/intl-org', lang: 'en', title: 'International Organization Portal', desc: 'x' }, DOMAIN);
    expect(en).toContain('<html lang="en">');
    expect(en).not.toContain('<html lang="th">');
  });

  it('sets og:locale to match the page language (th_TH default; en_US for the international portals)', () => {
    // a Thai-default route keeps th_TH
    const th = applyRouteMeta(baseHtml, contact, DOMAIN);
    expect(th).toContain('<meta property="og:locale" content="th_TH" />');
    // an English-default route advertises en_US to Facebook/LINE, not the base template's th_TH
    const en = applyRouteMeta(baseHtml, { path: '/portals/intl-org', lang: 'en', title: 'International Organization Portal', desc: 'x' }, DOMAIN);
    expect(en).toContain('<meta property="og:locale" content="en_US" />');
    expect(en).not.toContain('<meta property="og:locale" content="th_TH" />');
  });

  it('throws when the base is missing the og:locale meta (format drift must fail the build)', () => {
    const broken = baseHtml.split('\n').filter((l) => !l.includes('og:locale')).join('\n');
    expect(() => applyRouteMeta(broken, producer, DOMAIN)).toThrow(/route-meta.*og:locale.*not found/s);
  });

  it('the international portals declare lang:"en" in the SEO route list', () => {
    for (const p of ['/portals/gov-intl', '/portals/intl-org']) {
      const r = ROUTES.find((x) => x.path === p);
      expect(r && r.lang, `${p} has lang:"en"`).toBe('en');
    }
    // a Thai page must NOT carry an en override (would mislabel Thai content)
    expect(ROUTES.find((x) => x.path === '/contact')?.lang).not.toBe('en');
  });

  it('appends exactly one BreadcrumbList before </head>', () => {
    const html = applyRouteMeta(baseHtml, producer, DOMAIN, { portalsTitle: 'ประตูสู่ OpenThai.ai' });
    // exactly one *emitted* BreadcrumbList (the base has the word once more, in a comment)
    expect((html.match(/"@type":"BreadcrumbList"/g) || []).length).toBe(1);
    expect(html).toMatch(/<script type="application\/ld\+json">\{"@context".*BreadcrumbList.*<\/script>\s*<\/head>/s);
  });

  // The whole point: a base whose tag format drifted must fail the build, not silently
  // serve the homepage's preview. Each removed tag should throw, naming the tag.
  it.each([
    ['<link rel="canonical" href="https://www.openthai-ai.com/" />', 'canonical'],
    ['<meta property="og:url" content="https://www.openthai-ai.com/" />', 'og:url'],
    ['<meta name="description" content=', 'description'],
  ])('throws when the base is missing %s', (needle) => {
    // remove the first line containing the needle to simulate a format drift
    const broken = baseHtml
      .split('\n')
      .filter((line) => !line.includes(needle))
      .join('\n');
    expect(() => applyRouteMeta(broken, producer, DOMAIN)).toThrow(/route-meta.*not found/s);
  });
});

describe('breadcrumbJsonLd', () => {
  it('child portal pages get a 3-level trail through /portals', () => {
    const json = JSON.parse(breadcrumbJsonLd('/portals/producer', 'ทางเข้าผู้ผลิต', DOMAIN, 'ประตูสู่ OpenThai.ai').replace(/\\u003c/g, '<'));
    expect(json.itemListElement).toHaveLength(3);
    expect(json.itemListElement[1].item).toBe(`${DOMAIN}/portals`);
    expect(json.itemListElement[2].item).toBe(`${DOMAIN}/portals/producer`);
  });

  it('non-portal pages get a 2-level trail (home › page)', () => {
    const json = JSON.parse(breadcrumbJsonLd('/contact', 'ติดต่อทีมงาน Openthai.ai', DOMAIN).replace(/\\u003c/g, '<'));
    expect(json.itemListElement).toHaveLength(2);
    expect(json.itemListElement[1].item).toBe(`${DOMAIN}/contact`);
  });

  it('escapes "<" so the JSON-LD can’t break out of its <script> tag', () => {
    const raw = breadcrumbJsonLd('/x', '<script>evil', DOMAIN);
    expect(raw).not.toContain('<script>evil');
    expect(raw).toContain('\\u003cscript>evil');
  });
});

describe('escapeAttr', () => {
  it('escapes & and " for safe attribute interpolation', () => {
    expect(escapeAttr('AT&T "quoted"')).toBe('AT&amp;T &quot;quoted&quot;');
  });
});
