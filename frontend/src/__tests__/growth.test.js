import { describe, it, expect } from 'vitest';
import { GROWTH, fill, pick, strings } from '../growth/core';

describe('growth/core', () => {
  it('fill() replaces {placeholders}', () => {
    expect(fill('{a} from {b}', { a: 'X', b: 'Y' })).toBe('X from Y');
    expect(fill('no {missing}', {})).toBe('no ');
  });

  it('pick() returns an element from the array', () => {
    const arr = [1, 2, 3];
    expect(arr).toContain(pick(arr));
  });

  it('strings() falls back to Thai for unknown lang', () => {
    expect(strings('xx')).toBe(GROWTH.th);
  });

  it('all 3 languages exist with matching prize counts', () => {
    const langs = ['th', 'en', 'zh'];
    langs.forEach((l) => expect(GROWTH[l]).toBeTruthy());
    const n = GROWTH.th.spin.prizes.length;
    langs.forEach((l) => expect(GROWTH[l].spin.prizes).toHaveLength(n));
  });

  it('social proof pools are non-empty in every language', () => {
    ['th', 'en', 'zh'].forEach((l) => {
      const s = GROWTH[l].social;
      expect(s.names.length).toBeGreaterThan(0);
      expect(s.cities.length).toBeGreaterThan(0);
      expect(s.products.length).toBeGreaterThan(0);
      expect(s.template).toContain('{name}');
    });
  });
});
