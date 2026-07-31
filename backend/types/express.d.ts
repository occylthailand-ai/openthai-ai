// Augments the Express Request type with fields added by our middleware layer.
// Imported automatically by tsconfig — no explicit import needed in route files.

declare namespace Express {
  interface Request {
    /** X-Request-ID — set by middleware/request-id.js on every request */
    id: string;
    /** Authenticated user — set by requireAuth() in auth.js */
    user?: {
      username: string;
      role: string;
      email?: string;
    };
  }
}
