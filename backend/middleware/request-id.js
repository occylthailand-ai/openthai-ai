import { randomUUID } from 'node:crypto';

// Propagates or generates X-Request-ID on every request.
// req.id is available downstream; the header echoes back in the response.
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
