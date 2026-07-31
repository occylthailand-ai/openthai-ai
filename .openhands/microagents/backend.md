---
name: backend
type: path
triggers:
  - backend/
  - api/
---

# Backend Microagent

Loaded when working on any file under `backend/` or `api/`.

## Critical patterns

### Supabase query
```js
const { data, error } = await supabase.from('table').select('*').eq('user_id', id)
if (error) throw error
```

### Auth middleware
```js
import { requireAuth } from './auth.js'
router.post('/protected', requireAuth, async (req, res) => {
  const { userId, email } = req.user
})
```

### AI with fallback
```js
try {
  const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
  return msg.content[0].text
} catch {
  const result = await gemini.generateContent(prompt)
  return result.response.text()
}
```

### Adding an endpoint
1. Add handler to relevant domain file (e.g. `orders.js`)
2. Mount in `server.js`: `app.use('/api/...', myRouter)`
3. Wrap public endpoints with `rateLimit()`

## Run
```bash
cd backend && npm run dev
cd backend && npm run test:smoke
```
