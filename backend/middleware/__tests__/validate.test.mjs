// Node 22 built-in test runner — no extra deps needed.
// Run: node --test backend/middleware/__tests__/validate.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../validate.js';
import { ApiError } from '../error-handler.js';

function throws400(fn) {
  try { fn(); assert.fail('expected throw'); }
  catch (e) {
    assert.ok(e instanceof ApiError, `expected ApiError, got ${e?.constructor?.name}: ${e?.message}`);
    assert.equal(e.status, 400);
    assert.equal(e.code, 'BAD_REQUEST');
  }
}

describe('validate()', () => {
  describe('required rule', () => {
    it('passes when field is present', () => {
      assert.doesNotThrow(() => validate({ name: 'Alice' }, { name: 'required' }));
    });

    it('throws when field is missing', () => {
      throws400(() => validate({}, { name: 'required' }));
    });

    it('throws when field is empty string', () => {
      throws400(() => validate({ name: '' }, { name: 'required' }));
    });

    it('throws when field is null', () => {
      throws400(() => validate({ name: null }, { name: 'required' }));
    });
  });

  describe('email rule', () => {
    it('passes on valid email', () => {
      assert.doesNotThrow(() => validate({ email: 'a@b.com' }, { email: 'required|email' }));
    });

    it('throws on missing @', () => {
      throws400(() => validate({ email: 'notanemail' }, { email: 'required|email' }));
    });

    it('throws on missing domain', () => {
      throws400(() => validate({ email: 'a@' }, { email: 'required|email' }));
    });
  });

  describe('minlen / maxlen rules', () => {
    it('passes when exactly at minlen', () => {
      assert.doesNotThrow(() => validate({ pw: 'abcd' }, { pw: 'required|minlen:4' }));
    });

    it('throws when below minlen', () => {
      throws400(() => validate({ pw: 'abc' }, { pw: 'required|minlen:4' }));
    });

    it('throws when over maxlen', () => {
      throws400(() => validate({ pw: 'abcde' }, { pw: 'required|maxlen:4' }));
    });
  });

  describe('number rule', () => {
    it('passes for numeric string', () => {
      assert.doesNotThrow(() => validate({ amount: '100' }, { amount: 'required|number' }));
    });

    it('throws for non-numeric string', () => {
      throws400(() => validate({ amount: 'abc' }, { amount: 'required|number' }));
    });
  });

  describe('uuid rule', () => {
    it('passes for valid UUID v4', () => {
      assert.doesNotThrow(() =>
        validate({ id: '550e8400-e29b-41d4-a716-446655440000' }, { id: 'required|uuid' })
      );
    });

    it('throws for non-UUID string', () => {
      throws400(() => validate({ id: 'not-a-uuid' }, { id: 'required|uuid' }));
    });
  });

  describe('optional fields', () => {
    it('skips validation when optional field is absent', () => {
      assert.doesNotThrow(() => validate({}, { note: 'email' })); // not required, absent → skip
    });

    it('still validates optional field when present', () => {
      throws400(() => validate({ note: 'bad-email' }, { note: 'email' }));
    });
  });

  describe('multiple fields', () => {
    it('collects error from first failing field only (one error per field)', () => {
      try {
        validate({ email: 'bad', name: '' }, { name: 'required', email: 'required|email' });
        assert.fail('expected throw');
      } catch (e) {
        assert.ok(e.message.includes('name') || e.message.includes('email'));
      }
    });
  });
});
