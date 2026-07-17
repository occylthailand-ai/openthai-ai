// Unit test for the affiliate public-stats projection (affiliate-public.js).
// Pins the leak invariant: GET /api/affiliate/stats/:ref_code is unauthenticated
// (ref_code-gated only, and ref_codes are public in affiliate links), so the recent_sales
// it returns must NOT carry the referred buyer's Omise charge_id. The affiliate-facing
// numbers (amount, commission, source, date) must survive.
import { publicAffiliateSale, publicAffiliateSales } from '../affiliate-public.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

// exactly what creditAffiliateSale stores (server.js): { amount_thb, commission, charge_id, source, at }
const stored = { amount_thb: 500, commission: 100, charge_id: 'ch_test_5abcXYZ', source: 'shop', at: '2026-07-17T00:00:00Z' };

console.log('\n=== publicAffiliateSale drops the buyer charge_id (public endpoint) ===');
const v = publicAffiliateSale(stored);
ok(!('charge_id' in v), 'charge_id is NOT in the public projection');
ok(!JSON.stringify(v).includes('ch_test_5abcXYZ'), 'the Omise charge id string does not leak anywhere in the object');

console.log('\n=== but the affiliate-facing numbers survive ===');
ok(v.amount_thb === 500, 'sale amount preserved');
ok(v.commission === 100, 'commission preserved');
ok(v.source === 'shop', 'source/channel preserved');
ok(v.at === '2026-07-17T00:00:00Z', 'timestamp preserved');
ok(v.date === '2026-07-17T00:00:00Z', 'date mirrors `at` (the dashboard table reads `date`)');

console.log('\n=== defaults + defensive ===');
ok(publicAffiliateSale({ commission: 5 }).source === 'direct', 'missing source defaults to "direct"');
ok(JSON.stringify(publicAffiliateSale({})) === JSON.stringify({ amount_thb: undefined, commission: undefined, source: 'direct', at: undefined, date: undefined }), 'empty sale → shape with no charge_id, no crash');
ok(JSON.stringify(publicAffiliateSale(null)) === '{}', 'null → {} (no crash)');
ok(JSON.stringify(publicAffiliateSale('x')) === '{}', 'non-object → {} (no crash)');

console.log('\n=== publicAffiliateSales maps a list and never leaks a charge_id ===');
const list = publicAffiliateSales([stored, { amount_thb: 200, commission: 40, charge_id: 'ch_two', source: 'direct', at: '2026-07-16T00:00:00Z' }]);
ok(list.length === 2, 'both sales projected');
ok(!JSON.stringify(list).includes('ch_'), 'no charge id (ch_*) anywhere in the list output');
ok(list[1].amount_thb === 200 && list[1].commission === 40, 'second sale numbers preserved');
ok(JSON.stringify(publicAffiliateSales(null)) === '[]', 'null list → [] (no crash)');
ok(JSON.stringify(publicAffiliateSales(undefined)) === '[]', 'undefined list → [] (no crash)');

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
