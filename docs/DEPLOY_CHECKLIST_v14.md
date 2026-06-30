# OpenThai AI v14 — Deploy & Config Checklist

อัปเดต: 2026-06-30 · branch `claude/openthaiai-v14-setup-qq30gy`

รวมขั้นตอน deploy ที่ต้องทำใน dashboard ภายนอก (ผมรันให้ในเครื่องไม่ได้ — ต้องทำเองในหน้าเว็บ
Vercel / Supabase) ไว้ที่เดียว พร้อมจุดที่ verify ได้

---

## ✅ ทำอัตโนมัติ/verify แล้วใน session นี้
- [x] Backend `server.js` syntax ผ่าน (`node --check`)
- [x] Server boot + `GET /api/health` → `status: ok`
- [x] เพิ่ม **S36 · Trade Intelligence** (`/api/skills/trade-intel`) — registry รวมเป็น **36 skills**
- [x] S36 โผล่บนหน้า `/skills` อัตโนมัติ (frontend data-driven จาก `/api/skills`)
- [x] Trade Engine microservice (`services/trade-engine/`) — unit tests 19/19 ผ่าน
- [x] เพิ่ม `services/trade-engine/` ใน `.vercelignore` (ไม่กระทบ Vercel build)

---

## 1. Environment Variables (Vercel Dashboard → Settings → Environment Variables)
ตั้งค่าใน Production (และ Preview ถ้าต้องการ):

| ตัวแปร | ใช้ทำอะไร | จำเป็น |
|--------|-----------|--------|
| `JWT_SECRET` | เซ็น JWT (auth) | ✅ |
| `ADMIN_KEY` / `ADMIN_USERNAME` / `ADMIN_PASSWORD_PLAIN` | login แอดมิน | ✅ |
| `ANTHROPIC_API_KEY` | AI router หลัก (Claude) | ✅ (อย่างน้อย 1 ใน 2) |
| `GEMINI_API_KEY` | AI fallback | ✅ (อย่างน้อย 1 ใน 2) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | DB | ✅ |
| `OMISE_SECRET_KEY` / `OMISE_PUBLIC_KEY` / `OMISE_WEBHOOK_SECRET` | ชำระเงิน | ✅ ถ้าใช้ payment |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | อีเมล | ⬜ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | ⬜ |
| `FRONTEND_URL` | = `https://www.openthai-ai.com` | ✅ |
| `ELEVENLABS_API_KEY` | S5 TTS Voice | ⬜ (skill `needs_key`) |
| `LINE_CHANNEL_TOKEN` | S8 LINE OA | ⬜ (skill `needs_key`) |

> ตรวจว่าค่าไหนยังขาด: เปิด `https://www.openthai-ai.com/api/health`
> ดู `ai_primary`, `ai_fallback`, `google_oauth`, `line_oa`, `elevenlabs`

## 2. Supabase SQL Migrations (Supabase → SQL Editor → รันตามลำดับ)
1. `backend/migrations/FULL-MIGRATION.sql` (167 บรรทัด — schema หลักทั้งหมด)
2. `backend/migrations/005_user_sync.sql` (12 บรรทัด — Cloud Sync ข้ามอุปกรณ์)

> migration เป็น idempotent (`CREATE TABLE IF NOT EXISTS …`) รันซ้ำได้ปลอดภัย

## 3. ตรวจหลัง deploy
```bash
curl https://www.openthai-ai.com/api/health          # → {"status":"ok", ...}
curl https://www.openthai-ai.com/api/skills           # → {"total":36, "active":34, ...}
curl -X POST https://www.openthai-ai.com/api/skills/trade-intel \
  -H "Content-Type: application/json" \
  -d '{"product":"ข้าวหอมมะลิ","target_market":"สหรัฐฯ","hs_code":"100630"}'
```
- `active: 34` = 36 ทักษะ − S5/S8 ที่ยังเป็น `needs_key` (เพิ่ม key แล้วจะขึ้นเป็น active)

## 4. Trade Engine sandbox (ทางเลือก — deploy แยก ไม่ใช่ Vercel)
```bash
cd services/trade-engine/docker && cp .env.example .env   # แก้รหัส/คีย์
docker compose up -d                                       # postgres+neo4j+qdrant+redis
cd .. && pip install -r requirements.txt
uvicorn app.main:app --port 8000                           # → GET /health
```
