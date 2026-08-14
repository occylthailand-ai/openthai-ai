// Constant-time comparison for the one-click confirm-link tokens (unsubscribe,
// PDPA data-erasure/access, affiliate withdrawal, payment-cancel). These were all
// verified with a plain `token !== unsubToken(...)` — a `!==` string compare
// short-circuits at the first differing character, which is the textbook
// non-constant-time secret comparison every security linter flags. The tokens are
// truncated HMACs delivered in URLs (so a remote timing attack is impractical), but
// several of these links move money or delete a user's data, so comparing them in
// constant time is the correct defence-in-depth and costs nothing. Pure, no state.
import { timingSafeEqual } from 'crypto';

// True iff `provided` equals `expected`, compared in constant time. `provided` comes
// straight off a URL query param, so it may be undefined or an array (?token=a&token=b);
// anything that isn't a string is simply "not equal". timingSafeEqual throws on a
// length mismatch, and the expected length here is fixed and non-secret (a 16-char hex
// slice), so short-circuiting unequal lengths leaks nothing an attacker doesn't already
// know while keeping the equal-length path branch-free.
export function safeTokenEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length !== expected.length) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // lengths are equal here, but guard anyway (multi-byte utf8 could differ from char length)
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
