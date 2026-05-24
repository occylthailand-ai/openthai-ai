import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// Mock https so omiseRequest never dials out during tests
vi.mock('https', () => ({
  default: {
    request: vi.fn((_opts, _cb) => ({
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

import {
  PLAN_PRICES,
  getPlanPrice,
  parseWebhookEvent,
  createPromptPaySource,
} from '../services/omise-service.js';

// ─── PLAN_PRICES ──────────────────────────────────────────────────────────────
describe('PLAN_PRICES', () => {
  it('free plan is 0', () => expect(PLAN_PRICES.free).toBe(0));
  it('pro plan is 149', () => expect(PLAN_PRICES.pro).toBe(149));
  it('business plan is 299', () => expect(PLAN_PRICES.business).toBe(299));
});

// ─── getPlanPrice ─────────────────────────────────────────────────────────────
describe('getPlanPrice()', () => {
  it('returns 0 for free', () => expect(getPlanPrice('free')).toBe(0));
  it('returns 149 for pro', () => expect(getPlanPrice('pro')).toBe(149));
  it('returns 299 for business', () => expect(getPlanPrice('business')).toBe(299));
  it('returns 0 for unknown plan', () => expect(getPlanPrice('enterprise')).toBe(0));
  it('returns 0 for undefined', () => expect(getPlanPrice(undefined)).toBe(0));
});

// ─── parseWebhookEvent — HMAC verification ────────────────────────────────────
describe('parseWebhookEvent()', () => {
  const secret  = 'whs_test_secret_key_123';
  const payload = JSON.stringify({ object: 'event', key: 'charge.complete', data: { id: 'chrg_test_abc' } });
  const rawBody = Buffer.from(payload);

  it('returns parsed JSON when no webhookSecret (signature skipped)', () => {
    const result = parseWebhookEvent(rawBody, '', '');
    expect(result.key).toBe('charge.complete');
    expect(result.data.id).toBe('chrg_test_abc');
  });

  it('returns parsed JSON when webhookSecret is falsy null', () => {
    const result = parseWebhookEvent(rawBody, 'any', null);
    expect(result.object).toBe('event');
  });

  it('accepts a valid HMAC-SHA256 hex signature', () => {
    const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const result = parseWebhookEvent(rawBody, sig, secret);
    expect(result.key).toBe('charge.complete');
  });

  it('throws on wrong signature', () => {
    expect(() => parseWebhookEvent(rawBody, 'deadbeef', secret))
      .toThrow('Invalid webhook signature');
  });

  it('throws on tampered body with original signature', () => {
    const sig      = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const tampered = Buffer.from(payload + ' tampered');
    expect(() => parseWebhookEvent(tampered, sig, secret))
      .toThrow('Invalid webhook signature');
  });

  it('throws on empty signature string when secret is provided', () => {
    expect(() => parseWebhookEvent(rawBody, '', secret))
      .toThrow('Invalid webhook signature');
  });
});

// ─── validateAmountTHB (tested via createPromptPaySource) ─────────────────────
// Validation throws synchronously before any network call — https mock not reached
describe('validateAmountTHB (via createPromptPaySource)', () => {
  it('throws on string input', async () => {
    await expect(createPromptPaySource('150')).rejects.toThrow('amountTHB must be a valid number');
  });

  it('throws on NaN', async () => {
    await expect(createPromptPaySource(NaN)).rejects.toThrow('amountTHB must be a valid number');
  });

  it('throws on zero', async () => {
    await expect(createPromptPaySource(0)).rejects.toThrow('amountTHB must be a positive number');
  });

  it('throws on negative number', async () => {
    await expect(createPromptPaySource(-10)).rejects.toThrow('amountTHB must be a positive number');
  });

  it('throws when amount exceeds 999999', async () => {
    await expect(createPromptPaySource(1_000_000)).rejects.toThrow('exceeds maximum allowed amount');
  });

  it('accepts boundary value 999999', async () => {
    // Should not throw the validation error (will hang on mocked https — that is expected)
    // We check that it does NOT throw a validation error
    let threw = false;
    try { await Promise.race([createPromptPaySource(999_999), Promise.resolve('ok')]); }
    catch (e) { if (e.message.includes('exceeds') || e.message.includes('positive') || e.message.includes('valid number')) threw = true; }
    expect(threw).toBe(false);
  });
});
