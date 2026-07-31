# Database — Claude Code Context

Supabase Postgres only. No local DB, no ORM — raw SQL via Supabase client.

## Migration convention
Files live in `backend/migrations/`. Naming: `NNN_description.sql`.
- Run manually via Supabase dashboard or `psql`
- No automatic migration runner — apply by hand then commit

## Extensions
- `pgvector` enabled (see `001_pgvector.sql`) — used for semantic/vector memory

## Key tables
| Table | Purpose |
|---|---|
| `users` | Auth + profile |
| `subscriptions` | Plan + Omise subscription link |
| `ai_usage_log` | Every AI call with tokens/cost |
| `affiliate_tracking` | Referral links + commissions |
| `orders` | B2B/B2C orders |
| `order_disputes` | Dispute workflow |
| `portal_leads` | B2B portal lead capture |
| `agents` | AI agent state (JSON blob) |
| `system_log` | Operational events |

## Writing migrations
```sql
-- NNN_description.sql
-- Always idempotent: use IF NOT EXISTS, DO $$ BEGIN ... EXCEPTION WHEN ... END $$
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_col TEXT;
```

## Querying from backend
```js
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```
Never expose `SUPABASE_SERVICE_KEY` to the frontend.
