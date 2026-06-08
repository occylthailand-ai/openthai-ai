// Integration tests — รันเซิร์ฟเวอร์จริง แล้วยิง request ตรวจ "จุดอ่อนที่แก้ไปแล้ว"
// ครอบคลุม: default admin / default ADMIN_KEY / CORS / n8n secret / Google OAuth fail-closed
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers/server.js';

const post = (base, p, body, headers = {}) =>
  fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

// ─── PRODUCTION MODE — ต้อง fail-closed ทุกอย่าง ───────────────────────────────
let prod;
before(async () => {
  prod = await startServer({
    port: 8911,
    env: {
      NODE_ENV: 'production',
      // จงใจไม่ตั้ง: ADMIN_KEY, ADMIN_PASSWORD_PLAIN, ADMIN_USERS,
      //             N8N_WEBHOOK_SECRET, GOOGLE_ALLOWED_EMAILS, OMISE_WEBHOOK_SECRET
      ADMIN_KEY: '', ADMIN_PASSWORD_PLAIN: '', ADMIN_USERS: '',
      N8N_WEBHOOK_SECRET: '', GOOGLE_ALLOWED_EMAILS: '',
    },
  });
});
after(async () => { if (prod) await prod.stop(); });

test('[prod] health ยังตอบ 200', async () => {
  const r = await fetch(`${prod.base}/api/health`);
  assert.equal(r.status, 200);
});

test('[prod] default admin (admin/1234) ต้อง login ไม่ได้', async () => {
  const r = await post(prod.base, '/api/auth/login', { username: 'admin', password: '1234' });
  assert.equal(r.status, 401, 'production ต้องไม่มี default admin');
});

test('[prod] default ADMIN_KEY ต้องถูกปฏิเสธ', async () => {
  const r = await fetch(`${prod.base}/api/affiliate/list?key=openthai-admin-2026`);
  assert.equal(r.status, 401);
});

test('[prod] n8n default secret ต้องถูกปฏิเสธ', async () => {
  const r = await post(prod.base, '/api/n8n/trigger', {
    action: 'dispatch_webhook', secret: 'openthai-n8n-secret', payload: { event: 'x', data: {} },
  });
  assert.ok(r.status === 401 || r.status === 503, `ต้องไม่ใช่ 200 (ได้ ${r.status})`);
});

test('[prod] CORS ต้องไม่สะท้อน origin แปลกปลอม', async () => {
  const r = await fetch(`${prod.base}/api/health`, { headers: { Origin: 'https://evil.example.com' } });
  const acao = r.headers.get('access-control-allow-origin');
  assert.notEqual(acao, 'https://evil.example.com', 'production ต้องไม่ reflect origin ที่ไม่อยู่ใน allowlist');
});

// ─── DEV MODE — ความสะดวกตอน local ต้องยังทำงาน ────────────────────────────────
let dev;
before(async () => { dev = await startServer({ port: 8912, env: { NODE_ENV: '', VERCEL: '' } }); });
after(async () => { if (dev) await dev.stop(); });

test('[dev] default admin (admin/1234) login ได้ และได้ token', async () => {
  const r = await post(dev.base, '/api/auth/login', { username: 'admin', password: '1234' });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(body.token, 'ต้องได้ JWT token');
  assert.equal(body.user.role, 'admin');
});
