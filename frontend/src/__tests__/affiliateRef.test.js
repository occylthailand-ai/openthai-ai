import { describe, it, expect } from 'vitest';
import { captureAffiliateRef, resolveAffiliateRef, REF_STORAGE_KEY } from '../lib/affiliateRef';

// Guards the affiliate-attribution linchpin: main.jsx persists ?ref= into localStorage 'otai_ref' on
// every page load so a later purchase attributes the commission. If this breaks, EVERY affiliate
// silently loses attribution — so it must be tested. captureAffiliateRef is pure + injectable.

// minimal localStorage-like stub
function makeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    setItem: (k, v) => m.set(k, String(v)),
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    _dump: () => Object.fromEntries(m),
  };
}

describe('captureAffiliateRef()', () => {
  it('stores ?ref=CODE under otai_ref and returns it', () => {
    const s = makeStorage();
    expect(captureAffiliateRef('?ref=AFF123', s)).toBe('AFF123');
    expect(s.getItem(REF_STORAGE_KEY)).toBe('AFF123');
  });

  it('a ref-less page load does NOT wipe a previously-captured ref (last non-empty wins)', () => {
    const s = makeStorage({ [REF_STORAGE_KEY]: 'AFF123' });
    expect(captureAffiliateRef('?utm_source=line', s)).toBeNull();
    expect(s.getItem(REF_STORAGE_KEY)).toBe('AFF123'); // untouched
  });

  it('a new ref overwrites an old one (standard last-click attribution)', () => {
    const s = makeStorage({ [REF_STORAGE_KEY]: 'AFF111' });
    captureAffiliateRef('?ref=AFF222', s);
    expect(s.getItem(REF_STORAGE_KEY)).toBe('AFF222');
  });

  it('caps the stored ref at 20 characters', () => {
    const s = makeStorage();
    const long = 'A'.repeat(50);
    expect(captureAffiliateRef(`?ref=${long}`, s)).toBe('A'.repeat(20));
    expect(s.getItem(REF_STORAGE_KEY)).toHaveLength(20);
  });

  it('an empty ?ref= is treated as no ref (does not store, does not wipe)', () => {
    const s = makeStorage({ [REF_STORAGE_KEY]: 'AFF123' });
    expect(captureAffiliateRef('?ref=', s)).toBeNull();
    expect(s.getItem(REF_STORAGE_KEY)).toBe('AFF123');
  });

  it('handles missing/empty query strings without throwing', () => {
    const s = makeStorage();
    expect(captureAffiliateRef('', s)).toBeNull();
    expect(captureAffiliateRef(undefined, s)).toBeNull();
    expect(s.getItem(REF_STORAGE_KEY)).toBeNull();
  });

  it('never throws if storage misbehaves (returns null, swallows the error)', () => {
    const throwingStorage = { setItem: () => { throw new Error('quota'); } };
    expect(() => captureAffiliateRef('?ref=AFF123', throwingStorage)).not.toThrow();
    expect(captureAffiliateRef('?ref=AFF123', throwingStorage)).toBeNull();
  });
});

// resolveAffiliateRef is what a checkout page (e.g. QuickPay) uses to decide which affiliate to
// attribute a purchase to. QuickPay used to read ONLY its own URL's ?ref=, so a visitor who arrived
// via a share link (…/?ref=CODE → homepage, ref persisted) and then navigated (client-side, no ?ref
// on the new URL) to /quickpay attributed to NOBODY — the affiliate silently lost the commission.
// This resolves URL-first, then the persisted 'otai_ref'.
describe('resolveAffiliateRef()', () => {
  it('prefers an explicit ?ref= on the current page', () => {
    const s = makeStorage({ [REF_STORAGE_KEY]: 'STORED' });
    expect(resolveAffiliateRef('?ref=URLCODE', s)).toBe('URLCODE');
  });

  it('falls back to the persisted otai_ref when the page URL has no ?ref= (the QuickPay bug)', () => {
    const s = makeStorage({ [REF_STORAGE_KEY]: 'AFF777' });
    expect(resolveAffiliateRef('', s)).toBe('AFF777');
    expect(resolveAffiliateRef('?amount=1000&label=x', s)).toBe('AFF777');
  });

  it('returns empty string when neither URL nor storage has a ref (credits nobody)', () => {
    expect(resolveAffiliateRef('', makeStorage())).toBe('');
    expect(resolveAffiliateRef('?utm_source=fb', makeStorage())).toBe('');
  });

  it('caps to 20 chars (same as capture/storage) and never throws on bad storage', () => {
    const s = makeStorage();
    expect(resolveAffiliateRef(`?ref=${'A'.repeat(50)}`, s)).toBe('A'.repeat(20));
    const throwingStorage = { getItem: () => { throw new Error('boom'); } };
    expect(() => resolveAffiliateRef('', throwingStorage)).not.toThrow();
    expect(resolveAffiliateRef('', throwingStorage)).toBe('');
  });
});
