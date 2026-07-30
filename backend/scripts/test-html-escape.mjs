// Unit test for backend/html-escape.js — the escaping every notification email relies on,
// and the low-stock alert body that was the one email path interpolating product fields raw.
//
// The threat it guards (see module header): upstream clip() strips `<tag>` with /<[^>]*>/g,
// which an UNCLOSED `<` bypasses (`<img src=x onerror=alert(1)` has no `>`), so the raw
// opener reaches the email HTML and completes against the template's next `>` — injecting a
// live tag into the recipient's mail client. escapeHtml at the insertion point is what stops it.
import { escapeHtml, lowStockAlertHtml } from '../html-escape.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== escapeHtml: all five HTML-significant characters ===');
ok(escapeHtml('<') === '&lt;', '< → &lt;');
ok(escapeHtml('>') === '&gt;', '> → &gt;');
ok(escapeHtml('&') === '&amp;', '& → &amp;');
ok(escapeHtml('"') === '&quot;', '" → &quot;');
ok(escapeHtml("'") === '&#39;', "' → &#39;");
ok(escapeHtml('a & b < c > d') === 'a &amp; b &lt; c &gt; d', 'mixed run escaped left-to-right (& first, so no double-escape)');

console.log('\n=== escapeHtml: the clip()-bypass payload is fully neutralized ===');
const unclosed = '<img src=x onerror=alert(1)';   // the exact shape clip() lets through
ok(!escapeHtml(unclosed).includes('<'), 'an UNCLOSED tag-opener still loses its < (can\'t complete against a later >)');
ok(escapeHtml(unclosed) === '&lt;img src=x onerror=alert(1)', 'unclosed opener escaped to inert text');
ok(escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'a full script tag is inert');

console.log('\n=== escapeHtml: non-string / nullish inputs never throw ===');
ok(escapeHtml(null) === '', 'null → ""');
ok(escapeHtml(undefined) === '', 'undefined → ""');
ok(escapeHtml(42) === '42', 'number coerced');
ok(escapeHtml(0) === '0', '0 coerced (not treated as empty)');

console.log('\n=== lowStockAlertHtml: product name/sku are escaped, numbers are plain ===');
const evilName = lowStockAlertHtml({ name: '<img src=x onerror=alert(1)>', sku: 'S<b>1', stock: 3, low_stock: 5 }, 'https://x.test');
ok(!/onerror=alert\(1\)>/.test(evilName) || evilName.includes('&lt;img'), 'malicious product name is escaped in the body');
ok(evilName.includes('&lt;img src=x onerror=alert(1)&gt;'), 'the injected <img …> comes out as inert &lt;img…&gt; text');
ok(evilName.includes('S&lt;b&gt;1'), 'a tag in the SKU is escaped too');
ok(!/<img|<script|onerror=alert\(1\)"/.test(evilName.replace(/&lt;|&gt;/g, '')), 'no un-escaped attacker tag survives anywhere in the body');
ok(evilName.includes('>3<') && evilName.includes('จุดเตือน 5'), 'numeric stock/low_stock render as plain numbers');
ok(evilName.includes('href="https://x.test/admin"'), 'the trusted domain URL is used verbatim');

console.log('\n=== lowStockAlertHtml: a normal product renders cleanly ===');
const clean = lowStockAlertHtml({ name: 'สบู่สมุนไพร', sku: 'SKU-001', stock: 2, low_stock: 10 }, 'https://openthai-ai.com');
ok(clean.includes('<b>สบู่สมุนไพร</b>') && clean.includes('(SKU SKU-001)'), 'plain Thai name/sku pass through unchanged');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
