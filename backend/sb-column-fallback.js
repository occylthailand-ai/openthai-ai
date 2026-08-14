// ── Supabase missing-column fallback (shared, testable) ────────────────────────
// Several dual-mode modules upsert a whole record to Supabase via PostgREST. When
// the code writes a column the live table doesn't have yet (a migration the owner
// hasn't run — see the consent / counter_response rounds in DECISIONS_LOG), PostgREST
// rejects the ENTIRE write with PGRST204 ("Could not find the 'X' column of 'Y' in
// the schema cache") rather than dropping the unknown key. Without a fallback the
// record then lands only in the ephemeral file store (/tmp on Vercel, wiped on
// redeploy) — the core record is lost until the owner runs the alter.
//
// missingColumnFrom() extracts the offending column name from that specific error
// (and only that error). A caller can then retry the write once with the column
// stripped, so the record persists durably now and the column upgrades itself once
// the migration runs. Stripping a column is the safe direction: the row still
// exists; the missing value just takes the column default (e.g. consent=false),
// which under-claims rather than over-claims.

// Return the column name PostgREST says is missing, or null if the error isn't a
// missing-column error. Handles the PGRST204 phrasing and the raw Postgres
// "column ... does not exist" phrasing.
export function missingColumnFrom(message) {
  const m = String(message || '');
  // PostgREST: Could not find the 'consent' column of 'producers' in the schema cache
  let hit = m.match(/could not find the '([a-z_][a-z0-9_]*)' column/i);
  if (hit) return hit[1];
  // Raw Postgres: column "consent" does not exist  /  column producers.consent does not exist
  hit = m.match(/column ["']?(?:[a-z_][a-z0-9_]*\.)?([a-z_][a-z0-9_]*)["']? does not exist/i);
  if (hit && /schema cache|does not exist|PGRST204/i.test(m)) return hit[1];
  return null;
}

// Return a shallow copy of a row (or, for an array body, each row) without `col`.
// Returns null when nothing would change, so a caller can tell a pointless retry
// (the column wasn't in the payload) from a useful one.
export function stripColumn(body, col) {
  if (!col) return null;
  if (Array.isArray(body)) {
    if (!body.some((r) => r && typeof r === 'object' && col in r)) return null;
    return body.map((r) => { if (r && typeof r === 'object' && col in r) { const { [col]: _drop, ...rest } = r; return rest; } return r; });
  }
  if (body && typeof body === 'object' && col in body) {
    const { [col]: _drop, ...rest } = body;
    return rest;
  }
  return null;
}
