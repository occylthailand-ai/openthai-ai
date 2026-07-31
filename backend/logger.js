/**
 * Structured logger — ใช้แทน console.log ทั่วไป
 * Output เป็น JSON เมื่อรันบน Vercel (IS_VERCEL=1) เพื่อให้ log aggregator อ่านได้
 * Output เป็น human-readable เมื่อ dev local
 */

const IS_VERCEL = process.env.VERCEL === '1' || process.env.IS_VERCEL === '1';
const SERVICE = 'openthai-backend';

function format(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  if (IS_VERCEL) {
    return JSON.stringify({ ts, level, service: SERVICE, msg, ...meta });
  }
  const prefix = {
    info:  '\x1b[36m[INFO]\x1b[0m ',
    warn:  '\x1b[33m[WARN]\x1b[0m ',
    error: '\x1b[31m[ERR ]\x1b[0m ',
    debug: '\x1b[90m[DBG ]\x1b[0m ',
  }[level] ?? '[LOG] ';
  const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${ts} ${prefix}${msg}${extra}`;
}

export const log = {
  info:  (msg, meta) => console.log(format('info',  msg, meta)),
  warn:  (msg, meta) => console.warn(format('warn',  msg, meta)),
  error: (msg, meta) => console.error(format('error', msg, meta)),
  debug: (msg, meta) => { if (process.env.LOG_DEBUG) console.log(format('debug', msg, meta)); },

  /** Log HTTP request — ใช้ใน Express middleware */
  request: (req, status, ms) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    log[level](`${req.method} ${req.path}`, {
      status,
      ms,
      ip: req.ip,
      ua: req.headers['user-agent']?.slice(0, 80),
    });
  },

  /** Log AI call — track token usage */
  ai: (provider, model, tokens, ms, ok) => {
    log.info('ai_call', { provider, model, tokens, ms, ok });
  },
};
