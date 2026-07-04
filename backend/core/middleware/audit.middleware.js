// Mandatory audit logging for sensitive (state-changing, irreversible, or
// financial) admin actions. Before this, routes like order ship/deliver,
// dispute resolution, inventory adjust/remove, and memory delete performed
// the mutation with zero record of who/when/what — verified by grep, no
// addLog/webhook call existed in orders.js, disputes.js, or inventory.js for
// any of these actions. Withdraw approve/reject/paid already logged manually
// in server.js and is left as-is to avoid double-logging.
//
// Usage: app.post(path, requireAdmin, auditAction(addLog, 'Orders', (req) =>
//   `ship order ${req.body?.id}`), handler)
//
// Logs only after a successful (2xx/3xx) response, so failed attempts (which
// already reach requireAdmin's own 401, or a handler's own 400/500) aren't
// recorded as if they happened.
export function auditAction(logFn, source, describe) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const message = describe(req, res);
        const actorKeyPresent = !!(req.headers['x-admin-key'] || req.query.key);
        logFn('info', source, message, { path: req.originalUrl, method: req.method, admin_key_used: actorKeyPresent });
      }
    });
    next();
  };
}
