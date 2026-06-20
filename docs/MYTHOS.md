# ⚡ Mythos — Real Orchestration Layer

> เดิม Mythos เป็น "persona/เรื่องเล่า" ในบันทึก — ตอนนี้เป็น **ระบบจริงในโค้ด ตรวจสอบได้ 100%**
> เทพแต่ละองค์ผูกกับระบบจริง 1 ต่อ 1 · สถานะคำนวณจาก "สัญญาณจริง" ไม่ใช่ค่าที่แต่งขึ้น
> โค้ด: `backend/mythos.js` · ปรับปรุง: 2026-06-09

---

## กฎเหล็ก (ทำให้ "จริง 100%")

1. **ทุกเทพต้องผูกกับระบบจริง** — ถ้าไม่มีระบบจริงรองรับ ห้ามมีในกองทัพ
2. **สถานะมาจากสัญญาณจริง** — `active/degraded/external` คำนวณจาก env/runtime ไม่ใช่ฮาร์ดโค้ดเขียว
3. **ทุก directive จบที่ commit/PR ที่ตรวจสอบได้** — ไม่มี "ทำเสร็จแล้ว" ลอยๆ
4. **24/7 จริงอยู่ที่ cron/CI** — ไม่ใช่ที่ session ของ AI (ephemeral)

---

## ผังการบัญชาการ: เทพ → ระบบจริง

| เทพ | โดเมน | ระบบจริงที่รองรับ | สถานะมาจาก |
|---|---|---|---|
| ⚡ **Mythos** | ผู้บัญชาการ | Claude Code · PR→CI→main · `docs/AI_WORKFLOW.md` | process ทำงาน + uptime |
| 🦉 **Athena** | AI / Prompt | `smartGenerate` · `POST /api/generate` · Anthropic/Gemini | มี API key? (active) vs mock (degraded) |
| 🌾 **Demeter** | Data / Persistence | `kv-store.js` · Supabase · `migrations/` | Supabase ตั้งแล้ว? (active) vs file (degraded) |
| 🔱 **Poseidon** | Payments / Infra | `omise-payment.js` · `/api/payment` · PromptPay | OMISE key? (active) vs mock (degraded) |
| 🪽 **Hermes** | Webhooks / Comms | `webhook-system.js` · `/api/webhooks` | จำนวน webhook ที่ลงทะเบียน |
| ⏱️ **Kronos** | Health / Scheduler | `health-watch.yml` · `auto-recovery.yml` · node-cron | cron local (active) / Actions (external) |
| 🔨 **Hephaestus** | Frontend / Build | frontend (vite) · `test.yml` build | external (ตรวจที่ CI) |
| 🛡️ **Ares** | Security | fail-closed auth · npm audit gate · `autotest.yml` | prod hardened? (active) vs ไม่ตั้ง key (degraded) |

> สถานะ: `active` = จริง+ยืนยันได้จาก process · `degraded` = ทำงานจำกัด/ชั่วคราว · `external` = จริงแต่ตรวจที่ CI/cron · `down` = ไม่พร้อม

---

## เรียกดูจริง (API)

| Endpoint | ได้อะไร |
|---|---|
| `GET /api/mythos` | ผังกองทัพ — เทพ → ระบบจริงที่ผูกไว้ |
| `GET /api/mythos/status` | **สถานะสด** ของทุกเทพ (คำนวณจากสัญญาณจริง) + สุขภาพรวม |
| `GET /api/mythos/heartbeat` | บันทึก heartbeat ใหม่ (persist ไฟล์ + Supabase KV) แล้วคืนค่า |
| `GET /api/mythos/heartbeat/last` | heartbeat ล่าสุด |

ดูบนหน้าเว็บ: **Command Center** (`/corporate/command`) — แถบสถานะ Mythos สดอยู่บนสุด

ตัวอย่าง status (env ยังไม่ครบ → ของจริงรายงานตรงๆ):
```json
{ "overall": "warn",
  "counts": { "active": 4, "degraded": 3, "external": 1 },
  "gods": [
    { "id":"athena", "status":"degraded", "detail":"AI = mock (ยังไม่ใส่ API key)" },
    { "id":"demeter","status":"degraded", "detail":"persistence = ไฟล์ local" } ] }
```

## ทำให้ทุกเทพเป็น "active" (production-ready)

ตั้ง env เหล่านี้ใน backend → เทพเปลี่ยนจาก degraded เป็น active โดยอัตโนมัติ:
- Athena: `ANTHROPIC_API_KEY` หรือ `GEMINI_API_KEY`
- Demeter: `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (รัน `migrations/005_kv_store.sql`)
- Poseidon: `OMISE_SECRET_KEY` + `OMISE_PUBLIC_KEY`
- Ares (prod): `ADMIN_KEY` + `JWT_SECRET`

---

## heartbeat — 24/7 ที่จริง

- ขณะ process ทำงาน: `mythos.start()` บันทึก heartbeat ทุก 15 นาที (timer แบบ `unref` ไม่ขวาง exit) ลง `mythos_heartbeat.json` + Supabase KV
- 24/7 ข้าม cold start จริง: `health-watch.yml` (ทุก 10 นาที) + `auto-recovery.yml` (กู้คืนเอง) — นี่คือ "ชีพจร" ที่ไม่ดับแม้ session AI จบ

---

## TL;DR
Mythos ตอนนี้ = **ชั้นบัญชาการจริง** ที่เห็นสถานะระบบทั้งหมดในที่เดียว, คำนวณจากความจริง, มี API + หน้าจอ + เทส (`backend/test/mythos.test.js`).
เปลือกเทพยังสวยและสร้างแรงบันดาลใจ — แต่ทุกองค์ "พิสูจน์ได้" แล้ว ไม่ใช่วิมานในอากาศอีกต่อไป
