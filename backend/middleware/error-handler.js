import { log } from '../logger.js';

// Canonical error codes — used by throw ApiError(code, message)
export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code    = code;
    this.status  = status;
  }
}

// Common factory helpers
ApiError.notFound    = (msg = 'Not found')          => new ApiError('NOT_FOUND',    msg, 404);
ApiError.unauthorized= (msg = 'Unauthorized')        => new ApiError('UNAUTHORIZED', msg, 401);
ApiError.forbidden   = (msg = 'Forbidden')           => new ApiError('FORBIDDEN',   msg, 403);
ApiError.badRequest  = (msg = 'Bad request')         => new ApiError('BAD_REQUEST', msg, 400);
ApiError.internal    = (msg = 'Internal server error')=> new ApiError('INTERNAL',   msg, 500);

// Wraps async route handlers so thrown errors reach the errorHandler middleware.
// Express 4 does not auto-catch rejected promises — use this on every async route.
// Usage: app.post('/path', asyncHandler(async (req, res) => { ... }))
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Express 4 error-handling middleware (4 args required)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const reqId  = req.id;
  const status = err.status || err.statusCode || 500;
  const code   = err.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL');
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    log.error('unhandled_error', { event: err.message, stack: err.stack, reqId, path: req.path });
  }

  res.status(status).json({
    success: false,
    error: { code, message, requestId: reqId },
  });
}
