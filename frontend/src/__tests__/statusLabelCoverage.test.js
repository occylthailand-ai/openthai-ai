import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { LANGS } from '../i18n';

// Drift guard: the customer-facing order-tracking (/track) and dispute-tracking (/dispute) pages render
// a status/decision via t('mk.track.st.'+status) / t('mk.dispute.st.'+status) / t('mk.dispute.dec.'+decision)
// / t('mk.dispute.openedby.'+role). i18n's read() returns the RAW KEY when a translation is missing (see
// src/i18n/index.jsx: `return key in translations.th ? … : key`), so a backend status with no i18n label
// would show a customer a literal "mk.track.st.<status>" on a money-sensitive page. The status lists live
// in the BACKEND (orders.js ORDER_STATUS, disputes.js DISPUTE_STATUS/DECISIONS), the labels in the
// FRONTEND i18n — different files, easy to drift. This reads both from source and fails CI if any backend
// status/decision lacks a label in EVERY language (same single-source discipline as faqContent /
// portalCategories tests). No imports of the heavy modules — pure source parsing.

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const read = (p) => readFileSync(join(repo, p), 'utf8');
const i18nSrc = read('frontend/src/i18n/index.jsx');
const N = LANGS.length; // one label per key per language

// Pull the string items out of a `const NAME = ['a', 'b', …];` array literal in a source file.
function arrayLiteral(src, name) {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  expect(m, `could not find "const ${name} = [ … ]"`).toBeTruthy();
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}
// How many times a full i18n key string appears (= once per language block when fully covered).
const keyCount = (key) => (i18nSrc.match(new RegExp(`'${key.replace(/\./g, '\\.')}'\\s*:`, 'g')) || []).length;

const ordersSrc = read('backend/orders.js');
const disputesSrc = read('backend/disputes.js');

const ORDER_STATUS = arrayLiteral(ordersSrc, 'ORDER_STATUS');
const DISPUTE_STATUS = arrayLiteral(disputesSrc, 'DISPUTE_STATUS');
const DECISIONS = arrayLiteral(disputesSrc, 'DECISIONS');
// opened_by is a fixed binary in disputes.js open(): ['buyer', 'producer'].includes(input.opened_by)
const OPENED_BY = ['buyer', 'producer'];

describe('every backend order/dispute status has a frontend i18n label in all languages', () => {
  it('sanity: the backend lists were parsed', () => {
    expect(ORDER_STATUS).toContain('cancelled');
    expect(DISPUTE_STATUS).toContain('refunded');
    expect(DECISIONS).toContain('refund');
    expect(N).toBeGreaterThanOrEqual(3);
  });

  for (const s of ORDER_STATUS) {
    it(`order status "${s}" has mk.track.st.${s} in all ${N} languages`, () => {
      expect(keyCount(`mk.track.st.${s}`), `mk.track.st.${s} appears in ${keyCount(`mk.track.st.${s}`)}/${N} language blocks`).toBe(N);
    });
  }
  for (const s of DISPUTE_STATUS) {
    it(`dispute status "${s}" has mk.dispute.st.${s} in all ${N} languages`, () => {
      expect(keyCount(`mk.dispute.st.${s}`)).toBe(N);
    });
  }
  for (const d of DECISIONS) {
    it(`dispute decision "${d}" has mk.dispute.dec.${d} in all ${N} languages`, () => {
      expect(keyCount(`mk.dispute.dec.${d}`)).toBe(N);
    });
  }
  for (const r of OPENED_BY) {
    it(`dispute opener "${r}" has mk.dispute.openedby.${r} in all ${N} languages`, () => {
      expect(keyCount(`mk.dispute.openedby.${r}`)).toBe(N);
    });
  }
});
