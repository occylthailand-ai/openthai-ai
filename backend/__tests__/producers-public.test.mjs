import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProducers } from '../producers.js';

function seedProducers(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'producers.json'), JSON.stringify({
    'approved@example.com': {
      email: 'approved@example.com',
      company: 'Approved Farm',
      contact_name: 'Alice',
      phone: '0812345678',
      website: 'https://approved.example.com',
      category: 'เกษตร',
      description: 'Fresh jasmine rice',
      product_name: 'Jasmine Rice',
      price: 120,
      stock: 15,
      status: 'approved',
      created_at: '2026-09-04T10:00:00.000Z',
    },
    'pending@example.com': {
      email: 'pending@example.com',
      company: 'Pending Farm',
      contact_name: 'Bob',
      phone: '0899999999',
      website: 'https://pending.example.com',
      category: 'เกษตร',
      description: 'Pending listing',
      product_name: 'Pending Product',
      price: 90,
      stock: 4,
      status: 'pending',
      created_at: '2026-09-04T09:00:00.000Z',
    },
    'empty-product@example.com': {
      email: 'empty-product@example.com',
      company: 'No Product Co',
      contact_name: 'Carol',
      phone: '0888888888',
      website: 'https://noproduct.example.com',
      category: 'อาหาร',
      description: 'Approved but no product name',
      product_name: '',
      price: 55,
      stock: 8,
      status: 'approved',
      created_at: '2026-09-04T08:00:00.000Z',
    },
    'suspended@example.com': {
      email: 'suspended@example.com',
      company: 'Suspended Farm',
      contact_name: 'Dave',
      phone: '0877777777',
      website: 'https://suspended.example.com',
      category: 'เกษตร',
      description: 'Should stay hidden',
      product_name: 'Hidden Product',
      price: 70,
      stock: 1,
      status: 'suspended',
      created_at: '2026-09-04T07:00:00.000Z',
    },
  }, null, 2), 'utf8');
}

async function withServer(router, run) {
  const app = express();
  app.use(router);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

const tempRoot = mkdtempSync(join(tmpdir(), 'producers-public-'));
after(() => rmSync(tempRoot, { recursive: true, force: true }));

describe('producer public mapper hotfix', () => {
  it('catalog exposes only allowlisted fields for approved products', async () => {
    const dataDir = join(tempRoot, 'catalog');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    const products = await producers.catalog();

    assert.deepEqual(products, [{
      producer: 'Approved Farm',
      product_name: 'Jasmine Rice',
      price: 120,
      category: 'เกษตร',
      description: 'Fresh jasmine rice',
      stock: 15,
    }]);
  });

  it('search returns matched approved products without PII', async () => {
    const dataDir = join(tempRoot, 'search-hit');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    await withServer(producers.router, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/producers/search?q=jasmine`);
      const body = await res.json();

      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.deepEqual(body.producers, [{
        producer: 'Approved Farm',
        product_name: 'Jasmine Rice',
        price: 120,
        category: 'เกษตร',
        description: 'Fresh jasmine rice',
        stock: 15,
      }]);
    });
  });

  it('search miss returns an empty array without leaking email', async () => {
    const dataDir = join(tempRoot, 'search-miss');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    await withServer(producers.router, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/producers/search?q=does-not-exist`);
      const body = await res.json();

      assert.equal(body.success, true);
      assert.equal(body.count, 0);
      assert.deepEqual(body.producers, []);
      assert.equal(JSON.stringify(body).includes('email'), false);
    });
  });

  it('empty search returns only approved products with product_name', async () => {
    const dataDir = join(tempRoot, 'search-empty');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    await withServer(producers.router, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/producers/search`);
      const body = await res.json();

      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.deepEqual(body.producers.map((p) => p.producer), ['Approved Farm']);
      assert.equal(JSON.stringify(body).includes('email'), false);
    });
  });

  it('internal all and summary still retain producer PII', async () => {
    const dataDir = join(tempRoot, 'internal');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    const all = await producers.all();
    const summary = await producers.summary();

    assert.equal(all[0].email, 'approved@example.com');
    assert.equal(all[0].phone, '0812345678');
    assert.equal(summary.recent[0].email, 'approved@example.com');
    assert.equal(summary.recent[0].phone, '0812345678');
  });

  it('setStatus still returns email for internal admin workflows', async () => {
    const dataDir = join(tempRoot, 'set-status');
    seedProducers(dataDir);
    const producers = createProducers(dataDir);

    const result = await producers.setStatus('approved@example.com', 'rejected');

    assert.deepEqual(result, { ok: true, email: 'approved@example.com', status: 'rejected' });
  });
});
