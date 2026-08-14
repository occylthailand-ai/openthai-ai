// Guards that the guessable default admin (admin/1234) is NEVER a live login in production.
// Previously getAdminUsers() created the admin/1234 account REGARDLESS of environment and the
// Vercel branch only logged a warning — so a prod deploy that forgot to set ADMIN_USERS /
// ADMIN_PASSWORD_PLAIN shipped a publicly-guessable, full-access admin login. auth.js now refuses
// to create that default in a prod-like env (VERCEL or NODE_ENV=production); password login stays
// disabled until real credentials are configured. Dev keeps admin/1234 for local convenience.
//
// Boots the real server per-config and probes POST /api/auth/login.
import { spawn } from 'child_process';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

let portSeq = 8951;
async function bootAndLogin(env, creds) {
  const PORT = portSeq++;
  const srv = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '',
           DISABLE_RATE_LIMIT: '1', VERCEL: '', NODE_ENV: '',
           ADMIN_USERS: '', ADMIN_USERNAME: '', ADMIN_PASSWORD_PLAIN: '', ...env },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${PORT}`;
    let up = false;
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(base + '/api/health'); if (r.ok) { up = true; break; } } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!up) return { status: 0 };
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds),
    });
    let body = null; try { body = await res.json(); } catch {}
    return { status: res.status, hasToken: !!(body && body.token) };
  } finally {
    srv.kill();
    await new Promise((r) => setTimeout(r, 150));
  }
}

console.log('=== production (NODE_ENV=production) with NO admin configured: admin/1234 is NOT a login ===');
const prodDefault = await bootAndLogin({ NODE_ENV: 'production' }, { username: 'admin', password: '1234' });
ok(prodDefault.status === 401, `prod + admin/1234 → 401 (rejected, no default admin) (got ${prodDefault.status})`);

console.log('\n=== production WITH a real ADMIN_PASSWORD_PLAIN: the configured admin still logs in ===');
const realPw = 'S3cure-Prod-Admin-Pw!';
const prodReal = await bootAndLogin({ NODE_ENV: 'production', ADMIN_PASSWORD_PLAIN: realPw }, { username: 'admin', password: realPw });
ok(prodReal.status === 200 && prodReal.hasToken, `prod + real ADMIN_PASSWORD_PLAIN + correct creds → 200 + token (got ${prodReal.status})`);
// and the weak default must not work even when a real password is set
const prodRealWrong = await bootAndLogin({ NODE_ENV: 'production', ADMIN_PASSWORD_PLAIN: realPw }, { username: 'admin', password: '1234' });
ok(prodRealWrong.status === 401, `prod + real password set + admin/1234 → 401 (got ${prodRealWrong.status})`);

console.log('\n=== local dev (no prod signal, no creds): admin/1234 still works for local testing ===');
const devDefault = await bootAndLogin({}, { username: 'admin', password: '1234' });
ok(devDefault.status === 200 && devDefault.hasToken, `dev + admin/1234 → 200 + token (got ${devDefault.status})`);
const devWrong = await bootAndLogin({}, { username: 'admin', password: 'wrong' });
ok(devWrong.status === 401, `dev + admin/wrong → 401 (got ${devWrong.status})`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
