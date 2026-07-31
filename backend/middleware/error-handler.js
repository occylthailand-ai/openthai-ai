// @ts-check
import { log } from '../logger.js';

/** @import { Request, Response, NextFunction, RequestHandler } from 'express' */

/**
 * Canonical API error — throw this instead of res.status(n).json({error:…}).
 * The centralized `errorHandler` middleware formats it into the standard shape.
 */
export class ApiError extends Error {
  /**
   * @param {string} code     machine-readable code, e.g. 'NOT_FOUND'
   * @param {string} message  human-readable message
   * @param {number} [status=400]  HTTP status code
   */
  constructor(code, message, status = 400) {
    super(message);
    /** @type {string} */ this.code   = code;
    /** @type {number} */ this.status = status;
  }

  /** @param {string} [msg] @returns {ApiError} */
  static notFound    (msg = 'Not found')           { return new ApiError('NOT_FOUND',    msg, 404); }
  /** @param {string} [msg] @returns {ApiError} */
  static unauthorized(msg = 'Unauthorized')         { return new ApiError('UNAUTHORIZED', msg, 401); }
  /** @param {string} [msg] @returns {ApiError} */
  static forbidden   (msg = 'Forbidden')            { return new ApiError('FORBIDDEN',    msg, 403); }
  /** @param {string} [msg] @returns {ApiError} */
  static badRequest  (msg = 'Bad request')          { return new ApiError('BAD_REQUEST',  msg, 400); }
  /** @param {string} [msg] @returns {ApiError} */
  static internal    (msg = 'Internal server error'){ return new ApiError('INTERNAL',     msg, 500); }
}

/**
 * Wraps an async route handler so thrown errors reach `errorHandler`.
 * Express 4 does not auto-catch rejected promises — use this on every async route.
 *
 * @template {RequestHandler} T
 * @param {T} fn
 * @returns {RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Centralized Express 4 error-handling middleware — must be the LAST middleware registered.
 * Formats any thrown error (ApiError or generic) into:
 *   { success: false, error: { code, message, requestId } }
 *
 * @param {Error & { status?: number; statusCode?: number; code?: string }} err
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} _next  — required by Express (4-arg signature = error handler)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const reqId   = req.id;
  const status  = err.status || err.statusCode || 500;
  const code    = err.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL');
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    log.error('unhandled_error', { event: err.message, stack: err.stack, reqId, path: req.path });
  }

  res.status(status).json({
    success: false,
    error: { code, message, requestId: reqId },
  });
}
