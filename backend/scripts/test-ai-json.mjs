import { parseAIJson } from '../ai-json.js';

// Unit test for parseAIJson — the extractor every AI skill (36 call sites) + dispute arbitration
// relies on to turn a model's text reply into structured data; a throw sends the caller to a
// generic mock, so making more valid replies parse directly is a real quality win. Pins the
// behaviour-compatible hardening: null-safety and ```json fence handling, without regressing the
// plain-object / prose-around-object cases that already worked.
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const throws = (fn, m) => { try { fn(); ok(false, m + ' (expected throw)'); } catch { ok(true, m); } };

console.log('=== the cases that already worked keep working (backward compatible) ===');
ok(parseAIJson('{"a":1,"b":"x"}').a === 1, 'a bare JSON object parses');
ok(parseAIJson('Here you go: {"ok":true} — enjoy!').ok === true, 'a single object embedded in prose parses');
ok(parseAIJson('{"nested":{"k":[1,2,3]},"n":2}').nested.k[2] === 3, 'nested objects/arrays parse');
throws(() => parseAIJson('no json here at all'), 'text with no object → throws');

console.log('\n=== new: null / non-string / empty reply throws a clean Error (not a TypeError) ===');
throws(() => parseAIJson(null), 'null reply → throws (was a TypeError before)');
throws(() => parseAIJson(undefined), 'undefined reply → throws');
throws(() => parseAIJson(''), 'empty string → throws');
throws(() => parseAIJson('   '), 'whitespace-only → throws');
throws(() => parseAIJson({ already: 'object' }), 'a non-string (object) → throws, does not crash');
// specifically NOT a TypeError — a clean Error whose message mentions json
try { parseAIJson(null); } catch (e) { ok(!(e instanceof TypeError) && /json/i.test(e.message), 'the null-reply error is a clean Error mentioning "json"'); }

console.log('\n=== new: JSON wrapped in a ```json code fence (with trailing prose) parses ===');
const fenced = 'สรุปให้แล้วครับ:\n```json\n{"caption":"ลอง!","tags":["a","b"]}\n```\nหวังว่าจะช่วยได้ :)}';  // note the stray "}" after the fence
ok(parseAIJson(fenced).caption === 'ลอง!', 'a ```json fenced block is preferred over a greedy scan that the trailing "}" would have broken');
ok(Array.isArray(parseAIJson(fenced).tags) && parseAIJson(fenced).tags.length === 2, 'the fenced object is fully parsed');
ok(parseAIJson('```\n{"x":9}\n```').x === 9, 'a bare ``` fence (no language tag) also works');

console.log('\n=== a malformed object still throws (caller falls back to mock, as before) ===');
throws(() => parseAIJson('{"a":1,'), 'a truncated/broken object → throws');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
