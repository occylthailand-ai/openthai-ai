/**
 * OpenThai AI — Unit Tests
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Utility helpers extracted from components ──────────────────────────────────

/** Truncate text to maxLen chars */
function truncate(text, maxLen = 100) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/** Build affiliate ref link */
function buildRefLink(refCode, base = 'https://www.openthai-ai.com') {
  if (!refCode) return base;
  return `${base}/?ref=${refCode.toUpperCase()}`;
}

/** Score colour (mirrors AIGeneratorPage logic) */
function scoreColor(score) {
  if (score >= 9) return '#10b981';
  if (score >= 7) return '#f59e0b';
  return '#ef4444';
}

/** Validate affiliate form (mirrors AffiliatePage validation) */
function validateAffiliateForm({ name, phone, email, line }) {
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('name');
  if (!phone || !/^0[6-9]\d{8}$/.test(phone.trim())) errors.push('phone');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('email');
  if (!line || line.trim().length < 3) errors.push('line');
  return errors;
}

/** Format Thai Baht */
function formatTHB(amount) {
  return `฿${Number(amount).toLocaleString('th-TH')}`;
}

/** Mask email for PII protection (mirrors /api/affiliate/list backend) */
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local.slice(0, 2) + '***@' + domain;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('truncate()', () => {
  it('returns empty string for falsy input', () => {
    expect(truncate('')).toBe('');
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
  });

  it('returns text unchanged when under maxLen', () => {
    expect(truncate('สวัสดี', 10)).toBe('สวัสดี');
  });

  it('truncates and appends ellipsis when over maxLen', () => {
    const long = 'A'.repeat(120);
    const result = truncate(long, 100);
    expect(result.length).toBe(101); // 100 chars + '…'
    expect(result.endsWith('…')).toBe(true);
  });

  it('uses default maxLen of 100', () => {
    const exact100 = 'B'.repeat(100);
    expect(truncate(exact100)).toBe(exact100);
    const over = 'B'.repeat(101);
    expect(truncate(over).endsWith('…')).toBe(true);
  });
});

describe('buildRefLink()', () => {
  it('returns base URL when refCode is empty', () => {
    expect(buildRefLink('')).toBe('https://www.openthai-ai.com');
    expect(buildRefLink(null)).toBe('https://www.openthai-ai.com');
  });

  it('uppercases the refCode', () => {
    expect(buildRefLink('praekh1')).toBe('https://www.openthai-ai.com/?ref=PRAEKH1');
  });

  it('uses custom base URL', () => {
    expect(buildRefLink('TEST', 'https://custom.site')).toBe('https://custom.site/?ref=TEST');
  });
});

describe('scoreColor()', () => {
  it('returns green for score >= 9', () => {
    expect(scoreColor(9)).toBe('#10b981');
    expect(scoreColor(10)).toBe('#10b981');
    expect(scoreColor(9.5)).toBe('#10b981');
  });

  it('returns amber for 7 <= score < 9', () => {
    expect(scoreColor(7)).toBe('#f59e0b');
    expect(scoreColor(8.9)).toBe('#f59e0b');
  });

  it('returns red for score < 7', () => {
    expect(scoreColor(6.9)).toBe('#ef4444');
    expect(scoreColor(0)).toBe('#ef4444');
  });
});

describe('validateAffiliateForm()', () => {
  const valid = { name: 'คุณแพร', phone: '0812345678', email: 'prae@example.com', line: '@praekh' };

  it('returns no errors for valid input', () => {
    expect(validateAffiliateForm(valid)).toHaveLength(0);
  });

  it('flags short name', () => {
    expect(validateAffiliateForm({ ...valid, name: 'ก' })).toContain('name');
  });

  it('flags invalid Thai mobile (must start 06-09)', () => {
    expect(validateAffiliateForm({ ...valid, phone: '0212345678' })).toContain('phone');
    expect(validateAffiliateForm({ ...valid, phone: '081234567' })).toContain('phone'); // 9 digits
  });

  it('accepts valid Thai mobile numbers', () => {
    ['0812345678', '0912345678', '0623456789'].forEach(phone => {
      expect(validateAffiliateForm({ ...valid, phone })).not.toContain('phone');
    });
  });

  it('flags malformed email', () => {
    expect(validateAffiliateForm({ ...valid, email: 'notanemail' })).toContain('email');
    expect(validateAffiliateForm({ ...valid, email: 'a@' })).toContain('email');
  });

  it('flags short LINE ID', () => {
    expect(validateAffiliateForm({ ...valid, line: 'ab' })).toContain('line');
  });

  it('flags multiple errors at once', () => {
    const errors = validateAffiliateForm({ name: '', phone: '123', email: 'bad', line: '' });
    expect(errors).toContain('name');
    expect(errors).toContain('phone');
    expect(errors).toContain('email');
    expect(errors).toContain('line');
  });
});

describe('formatTHB()', () => {
  it('formats with baht symbol', () => {
    expect(formatTHB(0)).toMatch(/^฿/);
    expect(formatTHB(1000)).toMatch(/^฿/);
  });

  it('handles string numbers', () => {
    expect(formatTHB('2500')).toMatch(/^฿/);
  });
});

describe('maskEmail()', () => {
  it('masks local part keeping first 2 chars', () => {
    expect(maskEmail('prae@example.com')).toBe('pr***@example.com');
  });

  it('handles malformed email gracefully', () => {
    expect(maskEmail('notanemail')).toBe('***');
  });

  it('preserves domain', () => {
    const result = maskEmail('someone@openthai-ai.com');
    expect(result).toContain('@openthai-ai.com');
  });
});
