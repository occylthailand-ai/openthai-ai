// @ts-check
// Audit trail — writes critical events to Supabase system_log table.
// Usage: audit.log(req, 'user_login', { email })
//        audit.log(req, 'payment_created', { amount, method })

/** @import { Request } from 'express' */

const _SB_URL = process.env.SUPABASE_URL;
const _SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const _ready  = !!(_SB_URL && _SB_KEY);

/**
 * @param {string} actor
 * @param {string} event
 * @param {Record<string, unknown>} [meta]
 * @returns {Promise<void>}
 */
async function writeEvent(actor, event, meta = {}) {
  if (!_ready) return;

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
        apikey:           /** @type {string} */ (_SB_KEY),
        Authorization:    `Bearer ${_SB_KEY}`,
        'Content-Type':   'application/json',
        Prefer:           'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (_) {
    // audit writes must never crash the request
  }
}

export const audit = {
  /**
   * Fire-and-forget audit event. Never throws.
   * @param {Request | string} req  — Express request (extracts actor from it) or plain actor string
   * @param {string} event
   * @param {Record<string, unknown>} [meta]
   */
  log(req, event, meta = {}) {
    const actor = typeof req === 'string'
      ? req
      : req?.user?.email || String(req?.headers?.['x-user-email'] ?? 'anonymous');

    const enriched = { ...meta, reqId: typeof req === 'string' ? undefined : req?.id };
    writeEvent(actor, event, enriched);
  },
};
