// @ts-check
import { randomUUID } from 'node:crypto';

/** @import { Request, Response, NextFunction } from 'express' */

/**
 * Propagates or generates X-Request-ID on every request.
 * Sets `req.id` for downstream use; echoes the header in the response.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export function requestId(req, res, next) {
  const id = /** @type {string} */ (req.headers['x-request-id']) || randomUUID();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
