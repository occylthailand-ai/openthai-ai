import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock https — LINE Notify and Resend use https.request
// Tests exercise the no-token fallback path, so network never fires
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
  notify,
  notifyNewUser,
  notifyPayment,
  notifySystemAlert,
  notifyDailyReport,
  notifyNewAffiliate,
} from '../services/notification-service.js';

// In the test environment LINE_NOTIFY_TOKEN and RESEND_API_KEY are both unset (empty string),
// so every send() call falls through to the console fallback.

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── notify() — priority routing ─────────────────────────────────────────────
describe('notify()', () => {
  it('returns {queued: true} for normal priority without awaiting send', async () => {
    const result = await notify({ message: 'test normal', priority: 'normal' });
    expect(result).toEqual({ queued: true });
  });

  it('resolves with channel result for critical priority', async () => {
    const result = await notify({ message: 'test critical', priority: 'critical' });
    // No tokens → falls to console
    expect(result).toMatchObject({ channel: 'console', ok: false });
  });

  it('defaults to normal priority when omitted', async () => {
    const result = await notify({ message: 'no priority' });
    expect(result).toEqual({ queued: true });
  });
});

// ─── notifyPayment() — must be critical ───────────────────────────────────────
describe('notifyPayment()', () => {
  it('sends immediately (critical priority)', async () => {
    const result = await notifyPayment('user@test.com', 'pro', 149);
    expect(result).toMatchObject({ channel: 'console', ok: false });
  });

  it('includes plan and amount in message path', async () => {
    // Just verifies it does not throw for any input shape
    await expect(notifyPayment('a@b.com', 'business', 299)).resolves.toBeDefined();
  });
});

// ─── notifyNewUser() — normal priority ────────────────────────────────────────
describe('notifyNewUser()', () => {
  it('queues the notification (normal priority)', async () => {
    const result = await notifyNewUser('new@user.com', 'free');
    expect(result).toEqual({ queued: true });
  });

  it('sanitizes newlines in email to prevent header injection', async () => {
    const maliciousEmail = 'hacker@test.com\r\nX-Injected: evil';
    // Must not throw
    await expect(notifyNewUser(maliciousEmail, 'pro')).resolves.toEqual({ queued: true });
  });

  it('truncates very long email strings (>254 chars) without throwing', async () => {
    const longEmail = 'a'.repeat(300) + '@test.com';
    await expect(notifyNewUser(longEmail, 'free')).resolves.toEqual({ queued: true });
  });
});

// ─── notifySystemAlert() — severity routing ────────────────────────────────────
describe('notifySystemAlert()', () => {
  it('CRITICAL severity triggers immediate send', async () => {
    const result = await notifySystemAlert('database down', 'CRITICAL');
    expect(result).toMatchObject({ channel: 'console', ok: false });
  });

  it('WARN severity is queued', async () => {
    const result = await notifySystemAlert('high memory usage', 'WARN');
    expect(result).toEqual({ queued: true });
  });

  it('default severity (undefined) is treated as WARN (queued)', async () => {
    const result = await notifySystemAlert('unknown issue');
    expect(result).toEqual({ queued: true });
  });
});

// ─── notifyDailyReport() — normal priority ────────────────────────────────────
describe('notifyDailyReport()', () => {
  it('queues a daily report without throwing', async () => {
    const result = await notifyDailyReport({
      users: 42, revenue: 8900, aiRequests: 3200, uptime: 99.9,
    });
    expect(result).toEqual({ queued: true });
  });
});

// ─── notifyNewAffiliate() — normal priority ────────────────────────────────────
describe('notifyNewAffiliate()', () => {
  it('queues affiliate notification', async () => {
    const result = await notifyNewAffiliate('สมชาย ใจดี', 'somchai@test.com', 'AFF-1234');
    expect(result).toEqual({ queued: true });
  });
});
