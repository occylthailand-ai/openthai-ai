# api/ — Claude Code Context

This directory contains only one file: `index.js` — the Vercel serverless entry point.

## How it works
```
Vercel receives /api/* request
  → api/index.js (this dir)
    → imports { app } from backend/server.js
      → Express handles the route
```

## Rules
- Do NOT add routes here — all routes belong in `backend/server.js` and its domain files
- Do NOT import anything except `{ app } from '../backend/server.js'`
- This file should stay exactly as-is unless Vercel's serverless adapter changes

## Local dev vs Vercel
- **Local dev**: `backend/server.js` calls `app.listen(8000)` directly
- **Vercel**: `api/index.js` exports `app` as the default handler — Vercel manages HTTP
- The `IS_VERCEL` env var (set automatically by Vercel) controls which path runs
