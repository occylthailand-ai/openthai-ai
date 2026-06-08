# 🧪 ระบบทดสอบอัตโนมัติ — Openthai.ai

ทดสอบ + ตรวจความปลอดภัย + บูตทั้งโปรเจกต์ "อัตโนมัติ วนจนผ่าน 100%" และทำงานต่อเนื่อง 24/7

## รันด้วยมือ

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | รันชุดเทสทั้งหมดรอบเดียว (frontend + backend + audit + build) |
| `npm run test:loop` | วนซ้ำจนกว่าทุกอย่างจะเขียว 100% แล้วหยุด |
| `npm run test:watch` | โหมด 24/7 — รันต่อเนื่องทุก ๆ `INTERVAL` วินาที (default 600) ไม่หยุด |
| `cd backend && npm test` | เฉพาะเทส backend (`node:test` — ไม่ต้องมี dependency เพิ่ม) |
| `cd frontend && npm test` | เฉพาะเทส frontend (vitest) |

ปรับช่วงเวลาโหมด watch: `INTERVAL=300 npm run test:watch`

## สิ่งที่ตรวจ (7 ด่าน)

1. **backend: unit + integration** — `backend/test/*.test.js`
   - `auth.test.js` — bcrypt hash/verify, JWT, override key (timing-safe), recovery codes
   - `omise.test.js` — ตรวจลายเซ็น webhook (fail-closed ใน production)
   - `modules.test.js` — inventory (สต๊อก/ขาย/แจ้งเตือน), credits (กันติดลบ/กัน claim ซ้ำ)
   - `security.integration.test.js` — บูตเซิร์ฟเวอร์จริง ยืนยันว่า "จุดอ่อนถูกปิด":
     default admin / default ADMIN_KEY / default n8n secret / CORS reflect / Google OAuth ถูกปิดในโหมด production
2. **backend: prod audit** — `npm audit --omit=dev --audit-level=high` ต้องสะอาด
3. **backend: syntax check** — `node --check server.js`
4. **backend: boot health smoke** — เซิร์ฟเวอร์ต้องตอบ `/api/health` = 200
5. **frontend: vitest** — 30 เทส
6. **frontend: prod audit** — runtime deps ต้องสะอาด
7. **frontend: build** — `vite build` ต้องผ่าน

## อัตโนมัติบน GitHub (24/7)

- **`.github/workflows/test.yml`** — รันทุก push และทุก PR (frontend tests+build, backend tests+audit+smoke, secret scan)
- **`.github/workflows/autotest.yml`** — รันชุดเต็มซ้ำ **ทุก 6 ชั่วโมง** (จับ regression + ช่องโหว่ dependency ใหม่ที่เพิ่งประกาศ แม้ไม่มีใคร push)
- **`.github/workflows/health-watch.yml`** — ping production ทุก 10 นาที

## หมายเหตุความปลอดภัย (fail-closed ใน production)

ในโหมด production (`NODE_ENV=production` หรือบน Vercel) ระบบจะ **ไม่** ใช้ค่า default สาธารณะ:
ต้องตั้ง `ADMIN_USERS`/`ADMIN_PASSWORD_PLAIN`, `ADMIN_KEY`, `N8N_WEBHOOK_SECRET`,
`OMISE_WEBHOOK_SECRET`, `GOOGLE_ALLOWED_EMAILS`, `CORS_ORIGINS` (ดู `backend/.env.example`)
มิฉะนั้นช่องทางนั้น ๆ จะถูกปิดไว้แทนที่จะเปิดโล่ง
