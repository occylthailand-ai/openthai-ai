// Node 22 built-in test runner — no extra deps needed.
// Run: node --test backend/middleware/__tests__/error-handler.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, asyncHandler } from '../error-handler.js';

describe('ApiError', () => {
  it('has correct code, message, status', () => {
    const e = new ApiError('MY_CODE', 'my message', 418);
    assert.equal(e.code, 'MY_CODE');
    assert.equal(e.message, 'my message');
    assert.equal(e.status, 418);
    assert.ok(e instanceof Error);
  });

  it('defaults to status 400', () => {
    const e = new ApiError('X', 'msg');
    assert.equal(e.status, 400);
  });

  describe('factory helpers', () => {
    it('notFound → 404 + NOT_FOUND', () => {
      const e = ApiError.notFound();
      assert.equal(e.status, 404);
      assert.equal(e.code, 'NOT_FOUND');
    });

    it('unauthorized → 401 + UNAUTHORIZED', () => {
      const e = ApiError.unauthorized();
      assert.equal(e.status, 401);
      assert.equal(e.code, 'UNAUTHORIZED');
    });

    it('forbidden → 403 + FORBIDDEN', () => {
      const e = ApiError.forbidden('no access');
      assert.equal(e.status, 403);
      assert.equal(e.message, 'no access');
    });

    it('badRequest → 400 + BAD_REQUEST', () => {
      const e = ApiError.badRequest('bad');
      assert.equal(e.status, 400);
      assert.equal(e.code, 'BAD_REQUEST');
    });

    it('internal → 500 + INTERNAL', () => {
      const e = ApiError.internal();
      assert.equal(e.status, 500);
      assert.equal(e.code, 'INTERNAL');
    });
  });
});

describe('asyncHandler', () => {
  it('calls handler and returns its result', async () => {
    const req = {}, res = {}, next = () => {};
    let called = false;
    const handler = asyncHandler(async (r, s, n) => {
      assert.equal(r, req);
      called = true;
    });
    await handler(req, res, next);
    assert.ok(called);
  });

  it('calls next(err) when handler throws', async () => {
    const err = new Error('boom');
    let caught;
    const handler = asyncHandler(async () => { throw err; });
    await handler({}, {}, (e) => { caught = e; });
    assert.equal(caught, err);
  });

  it('calls next(err) when handler rejects a promise', async () => {
    let caught;
    const handler = asyncHandler(() => Promise.reject(new ApiError('X', 'rejected', 400)));
    await handler({}, {}, (e) => { caught = e; });
    assert.ok(caught instanceof ApiError);
    assert.equal(caught.code, 'X');
  });
});
