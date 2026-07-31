// PDPA consent-record construction — extracted so its shape can be pinned by a test against
// migrations/009_pdpa_consents.sql. Why this matters: the record is POSTed verbatim to the
// Supabase `pdpa_consents` table via PostgREST. If a field is ever added here whose column does
// NOT exist in the migration, PostgREST rejects the whole upsert (400), the code falls back to the
// ephemeral /tmp file, and every consent proof is silently wiped on the next Vercel redeploy — the
// exact PDPA durability bug the migration was written to fix. The schema test keeps the two in lockstep.

// The columns migration 009 must define. Kept next to the builder so a reviewer sees both at once.
export const CONSENT_COLUMNS = ['id', 'email', 'ip', 'purposes', 'version', 'consented', 'ts'];

// Build the durable consent proof. `ip` is resolved by the caller (headers/socket); `now` is
// injectable for deterministic tests. Values are normalised the same way the route always did:
// email lowercased/trimmed/capped, purposes coerced to an array, consented always true.
export function buildConsentRecord({ email, ip, purposes, version, now = new Date() } = {}) {
  return {
    id:        now.getTime().toString(),
    email:     String(email ?? '').toLowerCase().trim().slice(0, 254),
    ip:        ip || 'unknown',
    purposes:  Array.isArray(purposes) ? purposes : [purposes],
    version:   version || '1.0',
    consented: true,
    ts:        now.toISOString(),
  };
}
