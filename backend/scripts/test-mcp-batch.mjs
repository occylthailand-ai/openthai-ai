import { handleMcp } from '../mcp-handler.js';

// Guard for the MCP JSON-RPC batch cap (mcp-handler.js).
// A batch fans out to one processOne() per element via Promise.all, and several tools proxy to a
// real (paid) AI call. The per-request mcpLimiter counts requests, not the tool calls inside a
// batch — so an unbounded batch let a single request trigger thousands of concurrent AI calls
// (cost amplification / resource exhaustion). handleMcp now rejects a batch larger than MAX_BATCH
// (20) and an empty batch, BEFORE any element is processed. These asserts use only local methods
// (initialize / tools/list) so nothing hits the network.
const MAX_BATCH = 20;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

function mockRes() {
  const r = { _status: 200, _json: undefined };
  r.status = (c) => { r._status = c; return r; };
  r.json = (j) => { r._json = j; return r; };
  r.end = () => r;
  return r;
}
const call = async (body) => { const res = mockRes(); await handleMcp({ body, headers: { host: 'localhost:8000' }, socket: {} }, res); return res; };
const initReq = (i) => ({ jsonrpc: '2.0', id: i, method: 'initialize' });

console.log('\n=== an over-sized batch is rejected before any element is processed ===');
const over = await call(Array.from({ length: MAX_BATCH + 1 }, (_, i) => initReq(i)));
ok(over._status === 400, `a batch of ${MAX_BATCH + 1} → HTTP 400 (got ${over._status})`);
ok(!Array.isArray(over._json) && over._json?.error?.code === -32600, 'response is a single JSON-RPC error (-32600), not a processed array');
ok(/Batch too large/.test(over._json?.error?.message || ''), 'error message says the batch is too large');

console.log('\n=== an empty batch is rejected (invalid per JSON-RPC 2.0) ===');
const empty = await call([]);
ok(empty._status === 400 && /empty batch/.test(empty._json?.error?.message || ''), 'an empty array batch → 400 "empty batch"');

console.log('\n=== a batch at the limit is processed normally ===');
const atLimit = await call(Array.from({ length: MAX_BATCH }, (_, i) => initReq(i)));
ok(Array.isArray(atLimit._json) && atLimit._json.length === MAX_BATCH, `a batch of exactly ${MAX_BATCH} → an array of ${MAX_BATCH} results`);
ok(atLimit._json.every(r => r.result?.serverInfo?.name === 'openthai-ai'), 'every element in the in-limit batch was actually processed');

console.log('\n=== a small batch and a single request still work ===');
const small = await call([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }, initReq(2)]);
ok(Array.isArray(small._json) && small._json.length === 2, 'a 2-element batch → 2 results');
ok(Array.isArray(small._json[0].result?.tools), 'tools/list inside the batch returns the tool list');
const single = await call({ jsonrpc: '2.0', id: 9, method: 'tools/list' });
ok(!Array.isArray(single._json) && Array.isArray(single._json.result?.tools), 'a single (non-batch) request still returns one result object');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
