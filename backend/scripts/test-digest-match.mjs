// Deterministic unit test (no server, no SMTP) — the consumer-digest product selector.
// Pins the two rules sendConsumerDigest relies on: strict category match, and NEVER feature a
// sold-out product (stock === 0) while still featuring untracked (stock == null) and in-stock ones.
import { selectDigestMatches, dedupeConsumerLeads } from '../digest-match.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const catalog = [
  { producer: 'A', product_name: 'ยาดม',        category: 'สมุนไพร',   price: 50,  stock: 10 },   // in stock
  { producer: 'B', product_name: 'ยาหม่อง',      category: 'สมุนไพร',   price: 60,  stock: 0 },    // SOLD OUT
  { producer: 'C', product_name: 'ชาสมุนไพร',    category: 'สมุนไพร',   price: 80,  stock: null }, // untracked
  { producer: 'D', product_name: 'น้ำพริก',      category: 'อาหาร',     price: 40,  stock: 5 },    // other category
  { producer: 'E', product_name: 'ลูกประคบ',     category: 'สมุนไพร',   price: 120, stock: -3 },   // garbage/negative → unavailable
];

console.log('=== rule 1: strict category match ===');
const herbs = selectDigestMatches(catalog, 'สมุนไพร');
ok(herbs.every((p) => p.category === 'สมุนไพร'), 'only the requested category is returned');
ok(!herbs.some((p) => p.product_name === 'น้ำพริก'), 'a different category (อาหาร) is not included');
ok(selectDigestMatches(catalog, 'เครื่องดื่ม').length === 0, 'a category with no producers → empty (consumer gets skipped, not an empty email)');
ok(selectDigestMatches(catalog, '').length === 0, 'an empty category → empty (no accidental match-all)');

console.log('\n=== rule 2: never feature a sold-out product ===');
const names = herbs.map((p) => p.product_name);
ok(names.includes('ยาดม'), 'in-stock product is featured');
ok(names.includes('ชาสมุนไพร'), 'untracked stock (null) is treated as available and featured');
ok(!names.includes('ยาหม่อง'), 'SOLD-OUT product (stock === 0) is excluded');
ok(!names.includes('ลูกประคบ'), 'negative/garbage stock is treated as unavailable and excluded');
ok(herbs.length === 2, `exactly the 2 available herbs remain (got ${herbs.length})`);

console.log('\n=== limit + robustness ===');
const many = Array.from({ length: 9 }, (_, i) => ({ product_name: `p${i}`, category: 'อาหาร', stock: 3 }));
ok(selectDigestMatches(many, 'อาหาร', 5).length === 5, 'caps at the given limit (5)');
ok(selectDigestMatches(many, 'อาหาร', 3).length === 3, 'honours a smaller limit (3)');
ok(selectDigestMatches(null, 'อาหาร').length === 0, 'a null catalog never throws → empty');
ok(selectDigestMatches([{ category: 'อาหาร', stock: 3 }, null, undefined], 'อาหาร').length === 1, 'null/undefined catalog entries are skipped safely');
ok(selectDigestMatches(catalog, 'สมุนไพร', 0).length === 0, 'a zero limit returns nothing (no negative-slice surprise)');

console.log('\n=== dedup: one digest per email address (no spammy repeat sends) ===');
const dupEmail = [
  { email: 'a@x.com',  form_data: { category: 'สมุนไพร' }, created_at: '2026-08-01T00:00:00Z' },
  { email: 'A@x.com',  form_data: { category: 'อาหาร' },   created_at: '2026-08-03T00:00:00Z' }, // same addr, newer, has cat
  { email: 'b@x.com',  form_data: { category: 'อาหาร' },   created_at: '2026-08-02T00:00:00Z' },
];
const deduped = dedupeConsumerLeads(dupEmail);
ok(deduped.length === 2, `3 records over 2 addresses collapse to 2 (got ${deduped.length})`);
const aRec = deduped.find((l) => l.email.toLowerCase() === 'a@x.com');
ok(aRec && aRec.form_data.category === 'อาหาร', 'for duplicates, the most recent submission wins (latest intent)');

console.log('\n=== dedup: a record WITH a category beats a newer blank one (so we can still match) ===');
const catBeatsBlank = [
  { email: 'c@x.com', form_data: { category: 'สมุนไพร' }, created_at: '2026-08-01T00:00:00Z' }, // older, HAS category
  { email: 'c@x.com', form_data: {},                      created_at: '2026-08-05T00:00:00Z' }, // newer, blank
];
const dc = dedupeConsumerLeads(catBeatsBlank);
ok(dc.length === 1 && dc[0].form_data.category === 'สมุนไพร', 'kept the categorized record even though a newer blank one exists');

console.log('\n=== dedup: robustness ===');
ok(dedupeConsumerLeads([]).length === 0, 'empty input → empty');
ok(dedupeConsumerLeads(null).length === 0, 'null input never throws → empty');
ok(dedupeConsumerLeads([{ form_data: {} }, { email: '' }, null]).length === 0, 'records with no usable email are dropped');
ok(dedupeConsumerLeads([{ email: 'd@x.com' }, { email: ' D@X.com ' }]).length === 1, 'case + surrounding whitespace treated as the same address');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
