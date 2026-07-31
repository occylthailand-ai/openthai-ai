---
name: frontend
type: path
triggers:
  - frontend/
---

# Frontend Microagent

Loaded when working on any file under `frontend/`.

## Critical patterns

### API calls — always use apiFetch
```js
import { apiFetch } from '../apiBase'
const res = await apiFetch('/api/route', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
```
Never use raw `fetch()` — `apiFetch()` auto-attaches auth headers.

### Auth
```js
const email = localStorage.getItem('otai_email')  // null if not logged in
```

### i18n
```js
import { useLanguage } from '../i18n'
const { t } = useLanguage()
// <p>{t('my_key')}</p>  — add key to both th and en in src/i18n/
```

### Adding a page
1. `src/pages/MyPage.jsx`
2. Route in `src/App.jsx`
3. Run: `bash .claude/tools/scaffold-page.sh MyPage` for boilerplate

## Run
```bash
cd frontend && npm run dev
```
