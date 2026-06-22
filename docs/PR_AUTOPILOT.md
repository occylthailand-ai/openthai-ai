# 🤖 PR Autopilot — ผลิตสื่อประชาสัมพันธ์อัตโนมัติ วันเว้นวัน

> Directive: **PR-AUTO-001** (Mythos → Hermes + Athena + Kronos)
> โค้ด: `backend/pr-autopilot.js` · ปรับปรุง: 2026-06-09

ผลิตสื่อโซเชียลอัตโนมัติ **วันเว้นวัน** โดยดึง "อัปเดตของแพลตฟอร์มเราเอง" + "ยุคสมัย" มาเป็นวัตถุดิบ

---

## ทำงานอย่างไร (3 ขั้น)

```
  สัญญาณแพลตฟอร์ม                Engine กลาง (Athena)        ปฏิทินคอนเทนต์
  ┌────────────────────┐        ┌──────────────────┐        ┌──────────────────┐
  │ • สินค้าใหม่ในคลัง   │        │  smartGenerate    │        │ pr_content_       │
  │ • press release ล่าสุด│  ──▶  │  (สูตรเดียวกับเว็บ) │  ──▶  │ calendar.json     │
  │ • เวอร์ชัน/สุขภาพระบบ │        │  + era hashtags   │        │ + Supabase KV     │
  │ • trending + ข่าว    │        └──────────────────┘        └──────────────────┘
  └────────────────────┘
         ▲ ทุก "วันคู่" ของ epoch (= วันเว้นวัน) 09:00 — Kronos (cron)
```

1. **collectSignals()** — รวมอัปเดตแพลตฟอร์ม: สินค้าใหม่ล่าสุด, press release, เวอร์ชัน, trending hashtags (ยุคสมัย)
2. **planTopics()** — หมุน 3 เสาหลัก (Thai-first / Learning / All-in-one) + ดันสินค้าใหม่เป็น feature + แนบมุมยุคสมัย (เดือนปัจจุบัน + เทรนด์)
3. **produce()** — เรียก engine กลางผลิตคอนเทนต์ → ลงปฏิทิน (เก็บ 120 ชิ้นล่าสุด) + มิเรอร์ Supabase

> ใช้ **engine ตัวเดียวกับเว็บ/แอป** (Athena) → คอนเทนต์อัตโนมัติ = คุณภาพเดียวกับที่ผู้ใช้ได้

---

## รอบเวลา: "วันเว้นวัน" จริง

- cron รายวัน 09:00 แต่ **ลงมือเฉพาะวันคู่ของ epoch** (`epochDay % 2 === 0`) = เว้นวันจริง ไม่เพี้ยนข้ามเดือน
- ปรับจำนวนต่อรอบ: `PR_AUTOPILOT_POSTS` (default 3)
- บน Vercel (ไม่มี cron ในตัว): ตั้ง **Vercel Cron** เรียก `POST /api/pr/autopilot/run` วันเว้นวัน

---

## API

| Endpoint | สิทธิ์ | ได้อะไร |
|---|---|---|
| `GET /api/pr/autopilot` | public | สถานะ: cadence, รอบที่รัน, คิวที่จะลง, รันวันนี้ไหม |
| `GET /api/pr/autopilot/calendar` | public | ปฏิทินคอนเทนต์ 50 ชิ้นล่าสุด |
| `POST /api/pr/autopilot/run?key=ADMIN_KEY` | admin | สั่งผลิตเดี๋ยวนั้น |

ตัวอย่างผลผลิต 1 ชิ้น:
```json
{ "pillar":"learning", "feature":"ผ้าขาวม้า", "platform":"TikTok/Facebook",
  "hook":"...", "caption":"...", "hashtags":["#...","#เทรนด์เดือนนี้"],
  "critic_score":"8.2", "engine_source":"claude", "status":"planned" }
```

---

## ตำแหน่งในกองทัพ Mythos
- **Kronos** ตั้งเวลา (วันเว้นวัน) · **Athena** ผลิต (engine) · **Hermes** เผยแพร่ (สื่อ/autopost)
- ทุกชิ้นเป็น `status: planned` → คนตรวจ/อนุมัติก่อนโพสต์จริง (guardrail — ไม่โพสต์เองดิบ ๆ)

## เทส
`backend/test/pr-autopilot.test.js` — หมุน pillar, ผลิตครบรอบ, สะสมปฏิทิน, parity วันเว้นวัน, ทนเมื่อ engine ล้ม
