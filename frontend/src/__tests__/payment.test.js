import { describe, it, expect } from 'vitest';
import { PAYMENT_GROUPS, PAYMENT_STATS, GATEWAYS } from '../data/paymentMethods';

describe('Payment Methods Data', () => {
  it('should have 5 payment groups', () => {
    expect(PAYMENT_GROUPS).toHaveLength(5);
  });

  it('all groups should have required fields', () => {
    PAYMENT_GROUPS.forEach((g) => {
      expect(g).toHaveProperty('id');
      expect(g).toHaveProperty('label');
      expect(g).toHaveProperty('color');
      expect(g).toHaveProperty('gateway');
      expect(g).toHaveProperty('methods');
      expect(Array.isArray(g.methods)).toBe(true);
      expect(g.methods.length).toBeGreaterThan(0);
    });
  });

  it('all payment methods should have required fields', () => {
    PAYMENT_GROUPS.forEach((g) => {
      g.methods.forEach((m) => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('icon');
        expect(m).toHaveProperty('label');
        expect(m).toHaveProperty('desc');
      });
    });
  });

  it('method IDs should be unique across all groups', () => {
    const allIds = PAYMENT_GROUPS.flatMap((g) => g.methods.map((m) => m.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('total stats should match actual count', () => {
    const actual = PAYMENT_GROUPS.reduce((s, g) => s + g.methods.length, 0);
    expect(PAYMENT_STATS.total).toBe(actual);
  });

  it('Thai group should contain PromptPay', () => {
    const thai = PAYMENT_GROUPS.find((g) => g.id === 'thai');
    const promptpay = thai?.methods.find((m) => m.id === 'promptpay');
    expect(promptpay).toBeDefined();
    expect(promptpay.tag).toBe('แนะนำ');
  });

  it('Crypto group should contain USDT TRC20', () => {
    const crypto = PAYMENT_GROUPS.find((g) => g.id === 'crypto');
    const usdt = crypto?.methods.find((m) => m.id === 'usdt_trc20');
    expect(usdt).toBeDefined();
  });

  it('International group should contain SWIFT', () => {
    const intl = PAYMENT_GROUPS.find((g) => g.id === 'international');
    const swift = intl?.methods.find((m) => m.id === 'swift');
    expect(swift).toBeDefined();
  });

  it('all gateways should have name and desc', () => {
    Object.values(GATEWAYS).forEach((g) => {
      expect(g).toHaveProperty('name');
      expect(g).toHaveProperty('desc');
    });
  });
});
