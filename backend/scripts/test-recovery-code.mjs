import { useRecoveryCode } from '../auth.js';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Guard for auth.js useRecoveryCode() — the one-time emergency admin recovery-code check.
//  (1) A non-string code (a JSON number/object/array in the request body) must be rejected
//      cleanly, not throw: the /api/auth/recovery route only guards `!code`, so a truthy
//      non-string like {"code":123} or {"code":{}} slipped past and hit inputCode.trim() →
//      TypeError → a 500 on an auth endpoint. Now a non-string returns false (route → 401).
//  (2) The core one-time semantics: a configured code works exactly once (case-insensitive),
//      then never again; a wrong code is rejected; no configured codes → always false.
// Hermetic: the check appends sha256 hashes of used codes to .used-recovery-codes.json next to
// auth.js — snapshot + restore that file so this test never pollutes or leaks runtime state.
const BACKEND = dirname(dirname(fileURLToPath(import.meta.url)));
const USED_FILE = join(BACKEND, '.used-recovery-codes.json');
const snap = existsSync(USED_FILE) ? readFileSync(USED_FILE, 'utf8') : null;
const reset = () => { try { rmSync(USED_FILE, { force: true }); } catch {} };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const noThrow = (fn, m) => { try { ok(fn() === false, m); } catch (e) { ok(false, `${m} (threw ${e.constructor.name}: ${e.message})`); } };

try {
  reset();

  console.log('\n=== non-string input is rejected cleanly (no 500 on the auth route) ===');
  process.env.RECOVERY_CODES = 'ABCD-1234-EF56';
  noThrow(() => useRecoveryCode(123), 'a numeric code → false (not a TypeError)');
  noThrow(() => useRecoveryCode({}), 'an object code → false');
  noThrow(() => useRecoveryCode(['x']), 'an array code → false');
  noThrow(() => useRecoveryCode(undefined), 'undefined → false');
  noThrow(() => useRecoveryCode(null), 'null → false');

  console.log('\n=== no configured recovery codes → always false ===');
  process.env.RECOVERY_CODES = '';
  ok(useRecoveryCode('ABCD-1234-EF56') === false, 'with RECOVERY_CODES unset, any code → false');

  console.log('\n=== a valid code works exactly once, case-insensitive ===');
  reset();
  process.env.RECOVERY_CODES = 'ABCD-1234-EF56, ZZZZ-9999-YYYY';
  ok(useRecoveryCode('ABCD-1234-EF56') === true, 'a valid code → true on first use');
  ok(useRecoveryCode('ABCD-1234-EF56') === false, 'the same code → false on reuse (one-time)');
  ok(useRecoveryCode('abcd-1234-ef56') === false, 'the lowercased same code is still counted as used');
  ok(useRecoveryCode('zzzz-9999-yyyy') === true, 'a different valid code (lowercased) → true (case-insensitive match)');
  ok(useRecoveryCode('WRONG-0000-0000') === false, 'a code that was never issued → false');
} finally {
  if (snap === null) reset(); else writeFileSync(USED_FILE, snap);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
