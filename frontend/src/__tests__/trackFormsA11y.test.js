import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// A11y guard for the two public transactional forms customers reach straight from a
// transactional email (order-tracking + dispute-tracking). Their <label>s were styled
// but not programmatically associated with their inputs (no htmlFor/id) — so tapping the
// label didn't focus the field and a screen reader didn't announce the label with it
// (WCAG 1.3.1 / 4.1.2). Structural check (same approach as seoInvariants/portalConsent, no
// render): every <label> in these files carries an htmlFor, and every htmlFor points at a
// real id in the same file. A new unassociated label fails here.
const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, '..', 'pages');
const files = ['TrackOrderPage.jsx', 'DisputeTrackPage.jsx'];

describe('public track forms — labels are associated with their inputs', () => {
  for (const file of files) {
    const src = readFileSync(join(pagesDir, file), 'utf8');
    describe(file, () => {
      it('every <label> has an htmlFor', () => {
        const labels = src.match(/<label\b[^>]*>/g) || [];
        expect(labels.length, 'has at least one <label>').toBeGreaterThan(0);
        const unassociated = labels.filter((l) => !/\bhtmlFor=/.test(l));
        expect(unassociated).toEqual([]);
      });
      it('every htmlFor points at an id that exists in the file', () => {
        const fors = [...src.matchAll(/htmlFor="([^"]+)"/g)].map((m) => m[1]);
        expect(fors.length).toBeGreaterThan(0);
        const missing = fors.filter((f) => !new RegExp(`\\bid="${f}"`).test(src));
        expect(missing).toEqual([]);
      });
    });
  }
});
