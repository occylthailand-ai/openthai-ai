import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';

import { createOrders } from '../orders.js';

async function postJson(app, path, body) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function appWithProducers(list) {
  const dataDir = mkdtempSync(join(tmpdir(), 'orders-public-'));
  const orders = createOrders(dataDir, { getProducers: async () => list });
  const app = express();
  app.use(express.json());
  app.use(orders.router);
  return app;
}

describe('orders public lookup', () => {
  it('creates order when exactly one approved producer matches by (producer, product_name)', async () => {
    const app = appWithProducers([
      { email: 'seller@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
      { email: 'pending@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'pending' },
    ]);
    const res = await postJson(app, '/api/orders', {
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
      qty: 2,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.id);
  });

  it('returns 404 PRODUCT_NOT_FOUND when no approved exact match is found', async () => {
    const app = appWithProducers([
      { email: 'seller@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'pending' },
    ]);
    const res = await postJson(app, '/api/orders', {
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
    });
    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
    assert.equal(res.data.code, 'PRODUCT_NOT_FOUND');
    assert.equal(res.data.error, 'PRODUCT_NOT_FOUND');
  });

  it('returns 409 AMBIGUOUS_PRODUCT when more than one approved exact match exists', async () => {
    const app = appWithProducers([
      { email: 'seller1@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
      { email: 'seller2@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
    ]);
    const res = await postJson(app, '/api/orders', {
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.success, false);
    assert.equal(res.data.code, 'AMBIGUOUS_PRODUCT');
    assert.equal(res.data.error, 'AMBIGUOUS_PRODUCT');
  });
});
