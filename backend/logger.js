// @ts-check
// Structured logger — JSON on Vercel, human-readable locally.
// Usage: log.info('event', { key: value }), log.error('event', err), log.request(req, status, ms)

/** @import { Request } from 'express' */

/** @typedef {'debug'|'info'|'warn'|'error'} Level */

const IS_VERCEL = !!process.env.VERCEL;
/** @type {Record<Level, number>} */
const LEVEL_NUM = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVEL_NUM[/** @type {Level} */ (process.env.LOG_LEVEL)] ?? LEVEL_NUM.info;

/**
 * @param {Level} level
 * @param {string} event
 * @param {Record<string, unknown>} [meta]
 */
function emit(level, event, meta = {}) {
  if (LEVEL_NUM[level] < MIN_LEVEL) return;
  const entry = { ts: new Date().toISOString(), level, event, ...flatten(meta) };
  if (IS_VERCEL) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  } else {
    /** @type {Record<Level, string>} */
    const colors = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' };
    const rst = '\x1b[0m';
    const extras = Object.entries(entry)
      .filter(([k]) => !['ts', 'level', 'event'].includes(k))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${colors[level]}${level.toUpperCase()}${rst} ${event}${extras ? ' ' + extras : ''}`);
  }
}

/**
 * Flatten nested error objects so they serialize cleanly.
 * @param {Record<string, unknown>} meta
 * @returns {Record<string, unknown>}
 */
function flatten(meta) {
  if (!meta || typeof meta !== 'object') return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v instanceof Error) {
      out[k] = v.message;
      if (v.stack) out[`${k}_stack`] = v.stack.split('\n').slice(0, 3).join(' | ');
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const log = {
  /** @param {string} event @param {Record<string, unknown>} [meta] */
  debug: (event, meta) => emit('debug', event, meta),
  /** @param {string} event @param {Record<string, unknown>} [meta] */
  info:  (event, meta) => emit('info',  event, meta),
  /** @param {string} event @param {Record<string, unknown>} [meta] */
  warn:  (event, meta) => emit('warn',  event, meta),
  /** @param {string} event @param {Record<string, unknown>} [meta] */
  error: (event, meta) => emit('error', event, meta),

  /**
   * @param {Request} req
   * @param {number} status
   * @param {number} ms
   */
  request(req, status, ms) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    emit(level, 'http_request', {
      method: req.method,
      path:   req.path,
      status,
      ms,
      reqId:  req.id,
      ip:     req.ip,
    });
  },

  /**
   * @param {string} provider
   * @param {string} model
   * @param {number} tokens
   * @param {number} ms
   * @param {boolean} ok
   */
  ai(provider, model, tokens, ms, ok) {
    emit(ok ? 'info' : 'warn', 'ai_call', { provider, model, tokens, ms, ok });
  },
};
