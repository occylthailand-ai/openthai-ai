// Centralized auth guards — single source of truth for admin-key and JWT checks.
// This logic used to be copy-pasted inline at the top of ~35 route handlers in
// server.js (`const key = req.headers['x-admin-key'] || req.query.key; if
// (!checkAdminKey(key)) return res.status(401)...`). Moved here so there is
// exactly one place that defines what "admin" means and one place that checks it.
import { requireAuth as jwtRequireAuth } from '../../auth.js';

const IS_VERCEL = !!process.env.VERCEL;

// Admin key resolution — in production (serverless) there is no fallback
// default; ADMIN_KEY must be set explicitly. Local dev keeps a default for
// convenience.
function resolveAdminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  return IS_VERCEL ? null : 'openthai-admin-2026';
}

export function checkAdminKey(provided) {
  const key = resolveAdminKey();
  return !!key && provided === key;
}

export function adminDenyMessage() {
  return 'Unauthorized';
}

// Express middleware — replaces the inline `x-admin-key` check that was
// duplicated across admin routes. Usage: app.get('/api/x/admin/y', requireAdmin, handler)
export function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!checkAdminKey(key)) {
    return res.status(401).json({ success: false, message: adminDenyMessage() });
  }
  next();
}

// Re-exported so route modules only need one import path for both guard types.
export const requireAuth = jwtRequireAuth;
