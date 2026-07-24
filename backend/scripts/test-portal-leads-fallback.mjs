// Integration test — the portal-leads persist() retry actually recovers a lead
// when the live Supabase table is missing a column the record carries. No real DB:
// global.fetch is stubbed to emulate PostgREST rejecting an unknown column
// (PGRST204) on the first insert and accepting the stripped body on the retry.
// Exercises the real createPortalLeads().submit() → persist() path.
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.SUPABASE_URL = 'https://mock.supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const posts = [];   // record every POST body the "database" received
const realFetch = global.fetch;
global.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = (init.method || 'GET').toUpperCase();
  if (u.includes('/rest/v1/portal_leads')) {
    if (method === 'GET') return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (method === 'POST') {
      const body = JSON.parse(init.body);
      posts.push(body);
      const hasConsent = Array.isArray(body) && body.some((r) => 'consent' in r);
      if (hasConsent) {
        // emulate PostgREST rejecting the unknown column
        return new Response(JSON.stringify({ code: 'PGRST204', message: "Could not find the 'consent' column of 'portal_leads' in the schema cache" }),
          { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 204 }); // stripped body accepted
    }
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const { createPortalLeads } = await import('../portal-leads.js');
const dir = mkdtempSync(join(tmpdir(), 'pl-fallback-'));
try {
  const leads = createPortalLeads(dir);
  const r = await leads.submit({ type: 'consumer', lang: 'th', consent: true, name: 'สมชาย', email: 'somchai@example.com', category: 'อาหาร' });

  ok(r.ok === true, 'submit() succeeds');
  ok(posts.length === 2, `two POSTs attempted (first with consent then a stripped retry) — got ${posts.length}`);
  ok(posts[0].some((x) => x.consent === true), 'first POST carried consent (the one PostgREST rejected)');
  ok(posts[1] && !posts[1].some((x) => 'consent' in x), 'retry POST dropped the consent column');
  ok(posts[1] && posts[1][0].email === 'somchai@example.com' && posts[1][0].name === 'สมชาย', 'retry still carried the core lead data');

  const fileStore = join(dir, 'portal_leads.json');
  ok(!existsSync(fileStore) || Object.keys(JSON.parse(readFileSync(fileStore, 'utf8'))).length === 0,
    'lead persisted to Supabase (via retry), NOT dropped to the ephemeral file store');
} finally {
  global.fetch = realFetch;
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
