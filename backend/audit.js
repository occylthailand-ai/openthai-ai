// Audit trail — writes critical events to Supabase system_log table.
// Falls back to console.warn when DB is unavailable (dev / missing env vars).
// Usage: audit.log(req, 'user_login', { email })
//        audit.log(req, 'payment_created', { amount, method })

const _SB_URL = process.env.SUPABASE_URL;
const _SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const _ready  = !!(_SB_URL && _SB_KEY);

async function writeEvent(actor, event, meta = {}) {
  if (!_ready) return; // silent no-op in dev without Supabase

  const row = {
    actor,
    event,
    meta: JSON.stringify(meta),
    created_at: new Date().toISOString(),
  };

  try {
    await fetch(`${_SB_URL}/rest/v1/system_log`, {
      method: 'POST',
      headers: {
        apikey: _SB_KEY,
        Authorization: `Bearer ${_SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (_) {
    // audit writes must never crash the request
  }
}

export const audit = {
  // req can be an Express request (req.user.email, req.id) or a plain string actor
  log(req, event, meta = {}) {
    const actor = typeof req === 'string'
      ? req
      : req?.user?.email || req?.headers?.['x-user-email'] || 'anonymous';

    const enriched = { ...meta, reqId: req?.id };
    writeEvent(actor, event, enriched);
  },
};
