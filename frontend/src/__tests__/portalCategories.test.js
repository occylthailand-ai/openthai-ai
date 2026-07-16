import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PORTAL_CATEGORIES } from '../data/portalCategories';

// The consumer digest (backend/server.js sendConsumerDigest) recommends products
// by matching a consumer's chosen category against a producer's catalog category
// with a strict `p.category === category`. The category list therefore lives in
// THREE places that must agree or the match silently returns nothing:
//   1. frontend shared list  → src/data/portalCategories.js (PORTAL_CATEGORIES)
//   2. the two /portals/* pages that let a user pick a category
//   3. backend/producers.js  → CATEGORIES (the whitelist register() clamps to)
// If any drifts, a consumer is told "we'll email you matched products" and then
// counted as skipped_no_match forever. These asserts pin all three together so
// the drift fails CI instead of shipping. (Same structural-source approach as
// portalConsent.test.js / seoInvariants.test.js.)
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

function parseArrayLiteral(src, constName) {
  // Grab the first `const <name> = [ ... ];` array literal and JSON-ify it.
  const m = src.match(new RegExp(`const\\s+${constName}\\s*=\\s*(\\[[^\\]]*\\])`));
  if (!m) return null;
  return m[1]
    .replace(/'/g, '"')
    .replace(/,\s*\]/, ']')
    .match(/"[^"]*"/g)
    ?.map((s) => s.slice(1, -1));
}

describe('portal category list stays identical across frontend + backend', () => {
  it('backend producers.js CATEGORIES matches the shared PORTAL_CATEGORIES exactly', () => {
    const backendSrc = readFileSync(join(repoRoot, 'backend', 'producers.js'), 'utf8');
    const backendCats = parseArrayLiteral(backendSrc, 'CATEGORIES');
    expect(backendCats, 'found CATEGORIES in backend/producers.js').toBeTruthy();
    // Order matters for the <select> UI too, so assert strict deep equality.
    expect(backendCats).toEqual(PORTAL_CATEGORIES);
  });

  it("'อื่นๆ' (the register() fallback bucket) is present so unmatched producers have a home", () => {
    expect(PORTAL_CATEGORIES).toContain('อื่นๆ');
  });

  for (const page of ['ConsumerPortalPage.jsx', 'ProducerPortalPage.jsx']) {
    it(`${page} imports the shared list instead of redeclaring its own`, () => {
      const src = readFileSync(join(here, '..', 'pages', 'portals', page), 'utf8');
      // must import PORTAL_CATEGORIES from the single source of truth …
      expect(/PORTAL_CATEGORIES[\s\S]*from ['"][^'"]*data\/portalCategories['"]/.test(src)).toBe(true);
      // … and must NOT declare a local `const CATEGORIES = [ … ]` that could drift.
      expect(/const\s+CATEGORIES\s*=\s*\[/.test(src)).toBe(false);
      // renders a <select> bound to form.category built from the shared list.
      expect(/id=["']category["']/.test(src)).toBe(true);
      expect(/CATEGORIES\.map/.test(src)).toBe(true);
    });
  }
});
