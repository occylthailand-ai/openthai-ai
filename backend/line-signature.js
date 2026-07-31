import { createHmac, timingSafeEqual } from 'crypto';

// Verifies a LINE webhook's X-Line-Signature (HMAC-SHA256 over the RAW request body,
// base64-encoded — the scheme LINE's Messaging API uses).
//
// WHY this exists as its own tested function: the check used to be inline in server.js as
//   if (LINE_CHANNEL_SECRET && signature) { ...verify... }
// which FAILS OPEN — when the secret IS configured but the request carries no
// `x-line-signature` header, `signature` is '' (falsy), the whole block is skipped, and the
// forged events are processed. So an attacker could inject fake LINE events (fake follows /
// messages / userIds into the CRM) just by omitting the signature header, exactly the class of
// bug the Omise webhook already fails-closed against (verifyOmiseWebhook rejects a missing sig
// via a length mismatch). This mirrors that fail-closed behaviour and is unit-testable.
//
// Returns:
//   null  — no secret configured (dev mode); the caller decides (process locally, but a
//           production deploy always sets the secret, so this never means "skip" in prod).
//   true  — a valid signature (secret set + header present + HMAC matches, constant-time).
//   false — secret set but the signature is MISSING, empty, wrong length, or mismatched → reject.
export function verifyLineSignature(rawBody, signatureHeader, secret) {
  if (!secret) return null; // dev mode — no channel secret configured
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  const provided = typeof signatureHeader === 'string' ? signatureHeader : '';
  // Length check first: timingSafeEqual throws on unequal-length buffers, and a missing/empty
  // header (length 0) can never match the 44-char base64 digest — so it is rejected here.
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
