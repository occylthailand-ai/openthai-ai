import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createOrders } from '../orders.js';

function ordersWithProducers(list) {
  const dataDir = mkdtempSync(join(tmpdir(), 'orders-public-'));
  return createOrders(dataDir, { getProducers: async () => list });
}

describe('orders public lookup', () => {
  it('creates order when exactly one approved producer matches by (producer, product_name)', async () => {
    const orders = ordersWithProducers([
      { email: 'seller@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
      { email: 'pending@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'pending' },
    ]);
    const res = await orders.place({
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
      qty: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(res.id);
  });

  it('returns PRODUCT_NOT_FOUND when no approved exact match is found', async () => {
    const orders = ordersWithProducers([
      { email: 'seller@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'pending' },
    ]);
    const res = await orders.place({
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'PRODUCT_NOT_FOUND');
    assert.equal(res.error, 'PRODUCT_NOT_FOUND');
  });

  it('returns AMBIGUOUS_PRODUCT when more than one approved exact match exists', async () => {
    const orders = ordersWithProducers([
      { email: 'seller1@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
      { email: 'seller2@thai.test', company: 'Thai Herbs Co', product_name: 'Herbal Tea', status: 'approved' },
    ]);
    const res = await orders.place({
      producer: 'Thai Herbs Co',
      product_name: 'Herbal Tea',
      customer_name: 'Alice',
      contact: 'alice-line',
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'AMBIGUOUS_PRODUCT');
    assert.equal(res.error, 'AMBIGUOUS_PRODUCT');
  });
});
