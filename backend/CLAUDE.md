# Backend — Claude Code Context

Express 4 + ES modules (`import`/`export`). Entry: `server.js`.

## Key patterns

### Supabase client
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
```
Use `SUPABASE_SERVICE_KEY` (service role) server-side — never the anon key.

### Auth
- JWT signed with `process.env.JWT_SECRET`
- Middleware: `requireAuth` checks `Authorization: Bearer <token>`
- Identity also available via `x-user-email` + `x-device-id` headers (from frontend `apiFetch()`)

### AI
- Primary: Anthropic Claude via `@anthropic-ai/sdk` (`process.env.ANTHROPIC_API_KEY`)
- Fallback: Google Gemini via `@google/generative-ai` (`process.env.GOOGLE_API_KEY`)
- Pattern: try Claude, catch → try Gemini, catch → return error

### Payments
- Omise only — `omise-payment.js`
- THB only, no foreign currency
- PromptPay charges + card charges + subscriptions

### Rate limiting
Every route group must go through `express-rate-limit`. Add new limits in `server.js` near existing `rateLimit()` calls.

## File layout
Each domain has its own module file:
| File | Domain |
|---|---|
| `auth.js` | JWT login/register/Google OAuth |
| `credits.js` | Credit balance + top-up |
| `orders.js` | Order CRUD |
| `omise-payment.js` | Payment charge/webhook |
| `matching.js` | B2B/B2C/B2G matching engine |
| `disputes.js` | Order dispute flow |
| `affiliate-tracking.js` | Affiliate link + commission |
| `vector-memory.js` / `vector-memory-supabase.js` | pgvector semantic memory |
| `webhook-system.js` | Outgoing webhooks to tenants |
| `tenant-manager.js` | Multi-tenant plan enforcement |
| `agent-tools.js` | MCP tool definitions for AI agents |
| `mcp-handler.js` | MCP protocol endpoint |

## Middleware (enterprise layer)

### Request tracing
Every request gets `req.id` (X-Request-ID header). Use it in error messages and logs.

### Error responses
Throw `ApiError` — the centralized handler formats the response automatically:
```js
import { ApiError, asyncHandler } from './middleware/error-handler.js';
import { validate } from './middleware/validate.js';

app.post('/api/thing', asyncHandler(async (req, res) => {
  validate(req.body, { name: 'required|minlen:2', email: 'required|email' });
  const row = await db.query(...);
  if (!row) throw ApiError.notFound('Thing not found');
  res.json({ success: true, thing: row });
}));
```
Response shape is always `{success: false, error: {code, message, requestId}}`.
Always use `asyncHandler` — Express 4 doesn't catch async throws without it.

### Audit trail
Log critical actions (login, payment, order) with:
```js
import { audit } from './audit.js';
audit.log(req, 'payment_created', { amount, method });
```
Writes to `system_log` table in Supabase. Fire-and-forget — never throws.

### Structured logging
```js
import { log } from './logger.js';
log.info('my_event', { key: 'value' });
log.error('my_error', { err: new Error('oops') });
```
JSON on Vercel, color output locally. Respects `LOG_LEVEL` env var.

## Adding a route
1. Add handler to the relevant domain file (or create a new one)
2. Mount in `server.js` with `app.use('/api/...', myRouter)`
3. Wrap with rate limiter if it's a public endpoint
4. Use `asyncHandler` + `validate` + `ApiError` for consistent errors

## Run
```bash
cd backend && npm run dev     # nodemon watch
cd backend && npm start       # production
cd backend && npm run preflight  # pre-deploy checks
cd backend && npm run test:smoke # smoke tests
```

## Environment variables (required)
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `ANTHROPIC_API_KEY`,
`GOOGLE_API_KEY`, `OMISE_SECRET_KEY`, `OMISE_PUBLIC_KEY`
