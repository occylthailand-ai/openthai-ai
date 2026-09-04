import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createOrders } from '../orders.js';

function makeDataDir() {
  return mkdtempSync(join(tmpdir(), 'orders-test-'));
}

async function withServer(handler) {
  const server = handler.listen(0);
  const close = () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  after(async () => { await close(); });
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    post: async (path, body) => fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    get: async (path) => fetch(`http://127.0.0.1:${port}${path}`),
  };
}

describe('orders catalog lookup hardening', () => {
  it('resolves an approved catalog item, ignores browser producer_email, and hides sensitive fields from tracking', async () => {
    const dataDir = makeDataDir();
    after(() => rmSync(dataDir, { recursive: true, force: true }));

    const orders = createOrders(dataDir, {
      listProducers: async () => [{
        email: 'real@producer.test',
        company: 'Thai Farm',
        product_name: 'Mango Chips',
        price: 55,
        status: 'approved',
      }],
    });
    const app = express();
    app.use(express.json());
    app.use(orders.router);
    const http = await withServer(app);

    const res = await http.post('/api/orders', {
      producer: 'Thai Farm',
      producer_email: 'browser@evil.test',
      product_name: 'Mango Chips',
      customer_name: 'Buyer',
      contact: '@linebuyer',
      qty: 2,
      price: 1,
    });
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.success, true);

    const saved = await orders.getOne(payload.id);
    assert.equal(saved.producer_email, 'real@producer.test');
    assert.equal(saved.amount, 110);

    const trackRes = await http.get(`/api/orders/track?id=${encodeURIComponent(payload.id)}&contact=${encodeURIComponent('@linebuyer')}`);
    assert.equal(trackRes.status, 200);
    const tracked = await trackRes.json();
    assert.equal(tracked.success, true);
    assert.equal(tracked.order.product_name, 'Mango Chips');
    assert.equal(Object.hasOwn(tracked.order, 'producer_email'), false);
    assert.equal(Object.hasOwn(tracked.order, 'contact'), false);
    assert.equal(Object.hasOwn(tracked.order, 'customer_name'), false);
  });

  it('returns 400 MALFORMED_REQUEST when producer is missing', async () => {
    const dataDir = makeDataDir();
    after(() => rmSync(dataDir, { recursive: true, force: true }));

    const orders = createOrders(dataDir, { listProducers: async () => [] });
    const app = express();
    app.use(express.json());
    app.use(orders.router);
    const http = await withServer(app);

    const res = await http.post('/api/orders', {
      producer_email: 'legacy@catalog.test',
      product_name: 'Mango Chips',
      customer_name: 'Buyer',
      contact: '@linebuyer',
    });
    assert.equal(res.status, 400);
    const payload = await res.json();
    assert.equal(payload.code, 'MALFORMED_REQUEST');
  });

  it('returns 503 LOOKUP_UNAVAILABLE when listProducers is not wired', async () => {
    const dataDir = makeDataDir();
    after(() => rmSync(dataDir, { recursive: true, force: true }));

    const orders = createOrders(dataDir);
    const app = express();
    app.use(express.json());
    app.use(orders.router);
    const http = await withServer(app);

    const res = await http.post('/api/orders', {
      producer: 'Thai Farm',
      product_name: 'Mango Chips',
      customer_name: 'Buyer',
      contact: '@linebuyer',
    });
    assert.equal(res.status, 503);
    const payload = await res.json();
    assert.equal(payload.code, 'LOOKUP_UNAVAILABLE');
  });

  it('returns 404 PRODUCT_NOT_FOUND when no approved match exists', async () => {
    const dataDir = makeDataDir();
    after(() => rmSync(dataDir, { recursive: true, force: true }));

    const orders = createOrders(dataDir, {
      listProducers: async () => [{
        email: 'pending@producer.test',
        company: 'Thai Farm',
        product_name: 'Mango Chips',
        status: 'pending',
      }],
    });
    const app = express();
    app.use(express.json());
    app.use(orders.router);
    const http = await withServer(app);

    const res = await http.post('/api/orders', {
      producer: 'Thai Farm',
      product_name: 'Mango Chips',
      customer_name: 'Buyer',
      contact: '@linebuyer',
    });
    assert.equal(res.status, 404);
    const payload = await res.json();
    assert.equal(payload.code, 'PRODUCT_NOT_FOUND');
  });

  it('returns 409 AMBIGUOUS_PRODUCT when multiple approved matches exist', async () => {
    const dataDir = makeDataDir();
    after(() => rmSync(dataDir, { recursive: true, force: true }));

    const orders = createOrders(dataDir, {
      listProducers: async () => [
        { email: 'one@producer.test', company: 'Thai Farm', product_name: 'Mango Chips', status: 'approved' },
        { email: 'two@producer.test', company: 'Thai Farm', product_name: 'Mango Chips', status: 'approved' },
      ],
    });
    const app = express();
    app.use(express.json());
    app.use(orders.router);
    const http = await withServer(app);

    const res = await http.post('/api/orders', {
      producer: 'Thai Farm',
      product_name: 'Mango Chips',
      customer_name: 'Buyer',
      contact: '@linebuyer',
    });
    assert.equal(res.status, 409);
    const payload = await res.json();
    assert.equal(payload.code, 'AMBIGUOUS_PRODUCT');
  });
});
