import { mapModel, extractText } from '../openrouter-map.js';

// Unit guard for openrouter-map.js — the pure request/response mapping of the OpenRouter AI
// wrapper (server.js). The wrapper used to do `data.choices[0].message.content` unguarded, so a
// content-filtered response (message.content === null), an empty `choices`, or any non-error
// malformed body threw a cryptic "Cannot read properties of undefined (reading '0')" instead of a
// clear, catchable error — defeating the graceful hybrid fallback (→ Gemini → mock). These asserts
// pin: (1) the model-id mapping, and (2) that extractText returns the Anthropic shape on a good
// response and throws a CLEAR error on every malformed shape. No network — pure functions.
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const throwsWith = (fn, needle, m) => {
  try { fn(); ok(false, `${m} (expected throw, none)`); }
  catch (e) { ok(String(e.message).includes(needle), `${m} (threw: ${e.message})`); }
};

console.log('\n=== mapModel: Anthropic id -> OpenRouter id ===');
ok(mapModel('claude-haiku-4-5-20251001') === 'anthropic/claude-haiku-4-5', 'dated haiku id maps to anthropic/claude-haiku-4-5');
ok(mapModel('claude-sonnet-4-5') === 'anthropic/claude-sonnet-4-5', 'sonnet id maps to anthropic/claude-sonnet-4-5');
ok(mapModel('claude-3-haiku-20240307') === 'anthropic/claude-3-haiku', 'legacy haiku id maps to anthropic/claude-3-haiku');
ok(mapModel('claude-opus-9-9') === 'anthropic/claude-opus-9-9', 'an unknown claude-* id is namespaced under anthropic/');
ok(mapModel('openai/gpt-4o') === 'openai/gpt-4o', 'a non-claude / fully-qualified id passes through unchanged');
ok(mapModel(undefined) === undefined, 'a non-string model does not throw (passes through)');

console.log('\n=== extractText: good response -> Anthropic { content:[{text}] } ===');
const good = extractText({ choices: [{ message: { role: 'assistant', content: 'สวัสดีครับ' } }] });
ok(good && Array.isArray(good.content) && good.content[0].text === 'สวัสดีครับ', 'maps message.content to content[0].text');
ok(extractText({ choices: [{ message: { content: '' } }] }).content[0].text === '', 'an empty-string content is valid (returned as "")');

console.log('\n=== extractText: malformed / error responses throw a CLEAR error ===');
throwsWith(() => extractText({ error: { message: 'rate limited' } }), 'rate limited', 'an error body throws the error message');
throwsWith(() => extractText({ error: {} }), 'OpenRouter error', 'an error body with no message throws a generic OpenRouter error');
throwsWith(() => extractText({}), 'no message content', 'a body with no choices throws "no message content" (not a TypeError)');
throwsWith(() => extractText({ choices: [] }), 'no message content', 'an empty choices array throws "no message content"');
throwsWith(() => extractText({ choices: [{ message: { content: null } }] }), 'no message content', 'a content-filtered null content throws (not a silent { text: null })');
throwsWith(() => extractText(null), 'empty response', 'a null/empty response throws "empty response"');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
