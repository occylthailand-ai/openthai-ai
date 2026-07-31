import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FAQ_ITEMS } from '../data/faqContent';
import { faqPageJsonLd, applyRouteMeta } from '../../scripts/route-meta.mjs';
import { DOMAIN, ROUTES } from '../../scripts/seo-routes.mjs';

// The /faq page's rich-result eligibility depends on the FAQPage structured data matching the
// visible Q&A. Two copies must agree or Google drops the rich result:
//   1. the visible accordion  → FaqPage.jsx (renders FAQ_ITEMS[lang])
//   2. the prerendered schema → scripts/route-meta.mjs faqPageJsonLd(FAQ_ITEMS.th), injected into
//      /faq/index.html by prerender-meta.mjs (the first HTML byte a non-JS crawler reads)
// Both now read the SAME FAQ_ITEMS (src/data/faqContent.js), so they can't drift. These asserts pin
// that structure — same single-source-of-truth discipline as portalCategories.test.js / seoInvariants.
const here = dirname(fileURLToPath(import.meta.url));
const baseHtml = readFileSync(join(here, '..', '..', 'index.html'), 'utf8');

describe('FAQ content is a single source shared by the page and the prerendered schema', () => {
  it('every language has the same non-empty set of [question, answer] pairs', () => {
    const langs = Object.keys(FAQ_ITEMS);
    expect(langs).toEqual(expect.arrayContaining(['th', 'en', 'zh']));
    const n = FAQ_ITEMS.th.length;
    expect(n).toBeGreaterThan(3);
    for (const l of langs) {
      expect(FAQ_ITEMS[l].length, `${l} has ${n} items`).toBe(n);
      for (const pair of FAQ_ITEMS[l]) {
        expect(Array.isArray(pair) && pair.length === 2).toBe(true);
        expect(pair[0].trim().length, `${l} question non-empty`).toBeGreaterThan(0);
        expect(pair[1].trim().length, `${l} answer non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('FaqPage.jsx renders the shared list instead of redeclaring its own Q&A', () => {
    const src = readFileSync(join(here, '..', 'pages', 'FaqPage.jsx'), 'utf8');
    // must import FAQ_ITEMS from the single source of truth …
    expect(/FAQ_ITEMS[\s\S]*from ['"][^'"]*data\/faqContent['"]/.test(src)).toBe(true);
    // … and must NOT hardcode a `faqs: [ [ '...' , ` array literal that could drift from it.
    expect(/faqs:\s*\[\s*\[\s*['"]/.test(src)).toBe(false);
  });

  it('faqPageJsonLd emits valid FAQPage schema whose questions match FAQ_ITEMS.th', () => {
    const ld = JSON.parse(faqPageJsonLd(FAQ_ITEMS.th));
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(FAQ_ITEMS.th.length);
    ld.mainEntity.forEach((q, i) => {
      expect(q['@type']).toBe('Question');
      expect(q.name).toBe(FAQ_ITEMS.th[i][0]);
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.acceptedAnswer.text).toBe(FAQ_ITEMS.th[i][1]);
    });
  });

  it('escapes "<" so the schema can never break out of its <script> tag', () => {
    const withAngle = faqPageJsonLd([['<script>x', 'a </script> b']]);
    expect(withAngle).not.toContain('<script>');
    expect(withAngle).not.toContain('</script>');
    expect(withAngle).toContain('\\u003c');
  });
});

describe('the prerendered /faq HTML carries the static FAQPage schema (no JS needed)', () => {
  const faqRoute = ROUTES.find((r) => r.path === '/faq');

  it('/faq route exists in the SEO route list', () => {
    expect(faqRoute).toBeTruthy();
  });

  it('applyRouteMeta injects a FAQPage script into /faq alongside its BreadcrumbList', () => {
    const html = applyRouteMeta(baseHtml, faqRoute, DOMAIN);
    expect((html.match(/"@type":"FAQPage"/g) || []).length).toBe(1);
    expect((html.match(/"@type":"BreadcrumbList"/g) || []).length).toBe(1);
    // the first visible question must appear verbatim in the served HTML
    expect(html).toContain(FAQ_ITEMS.th[0][0]);
  });

  it('does NOT inject a FAQPage schema onto a non-/faq route', () => {
    const other = ROUTES.find((r) => r.path === '/contact');
    const html = applyRouteMeta(baseHtml, other, DOMAIN);
    expect(html).not.toContain('"@type":"FAQPage"');
  });
});
