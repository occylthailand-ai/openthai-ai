# Frontend — Claude Code Context

React 18 + Vite, plain JSX (no TypeScript).

## Key patterns

### API calls
Always use `apiFetch()` or `apiUrl()` from `src/apiBase.js` — never raw `fetch()`.
```js
import { apiFetch } from '../apiBase'
const res = await apiFetch('/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
```

### Auth identity
- `localStorage.otai_email` — logged-in user email
- `localStorage.otai_device` — anonymous device id (always present)
- `apiFetch()` auto-attaches `x-user-email` and `x-device-id` headers

### i18n
Wrap text with the `useLanguage()` hook from `src/i18n`. Every user-facing string needs a translation key in both `th` and `en`.

### Adding a page
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. No default layout wrapper needed — pages control their own structure

## Structure
```
src/
  pages/       # 30+ page-level components (one per route)
  components/  # Shared: Logo, CreditChip, ErrorBoundary, LanguageSwitcher, ToastContext
  i18n/        # LanguageProvider + translation maps
  assets/      # Static images/icons
  apiBase.js   # API helpers (apiFetch, apiUrl, authHeaders, getDeviceId)
  App.jsx      # Router + top-level state
  main.jsx     # Entry — ReactDOM.render, LanguageProvider, SW registration
```

## Environment
- `VITE_API_URL` — backend origin in production (empty = same-origin proxy)
- Dev proxy: Vite proxies `/api` → `localhost:8000`

## Run
```bash
cd frontend && npm run dev    # dev server
cd frontend && npm run build  # production build
```
