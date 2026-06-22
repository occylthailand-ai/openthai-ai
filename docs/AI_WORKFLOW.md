# 🧭 OpenThai.ai — Unified AI Operating Model

> Cowork + Claude Code + แพลตฟอร์ม = **ระบบเดียวกัน** มี "engine กลาง" ตัวเดียว
> ปรับปรุง: 2026-06-09

---

## หลักการ: หนึ่ง engine, สองมือ

แทนที่จะมี AI หลายตัวต่างคนต่างทำ เรารวมให้เหลือ **engine สร้างคอนเทนต์ตัวเดียว**
(`backend smartGenerate` ที่ `POST /api/generate`) แล้วให้ทุกช่องทาง "เรียกใช้ตัวเดียวกัน"

```
                    ┌───────────────────────────────────────────┐
                    │      OpenThai.ai ENGINE กลาง (1 เดียว)      │
                    │   backend/server.js · POST /api/generate   │
                    │   สูตร Hook/Story/CTA + AI Critic + Learn   │
                    │   ข้อมูล → Supabase / KV (source of truth)  │
                    └───────────────▲───────────────▲───────────┘
                                    │ ใช้งาน         │ ดูแล/สร้าง
              ┌─────────────────────┴──┐         ┌──┴────────────────────┐
              │   🟢 ปีกธุรกิจ/คอนเทนต์   │         │   🔵 ปีกวิศวกรรม        │
              │   Claude COWORK         │         │   Claude CODE          │
              │   (Desktop, ทีมไม่ใช่dev)│         │   (terminal, ทีม dev)  │
              │   • batch จาก CSV       │         │   • สร้าง/แก้ engine     │
              │   • รายงาน/เด็ค/อีเมล     │         │   • เทส/security/deploy │
              │   • เรียก /api/generate │         │   • PR → CI → main      │
              └────────────────────────┘         └────────────────────────┘
```

**ผลลัพธ์:** คอนเทนต์ที่ออกจาก Cowork = คอนเทนต์ที่ออกจากเว็บ/แอป (สูตร คะแนน การเรียนรู้ เหมือนกันเป๊ะ)
เพราะมาจาก engine เดียวกัน ไม่ใช่ prompt แยกของใครของมัน

---

## การเชื่อมจริง (ทำแล้วในโค้ด)

| ส่วน | เดิม | ตอนนี้ (รวมเป็นหนึ่ง) |
|---|---|---|
| `cowork/automation.py` | สร้างคอนเทนต์ด้วย prompt ของ Cowork เอง (silo แยก) | **เรียก `POST {OPENTHAI_API_URL}/api/generate`** = engine กลาง · ถ้า backend ล่ม → fallback ให้ Cowork สร้างเอง |
| ผลลัพธ์ Cowork | schema เฉพาะ Cowork | map กลับเป็น schema เดิม (hook/story/cta/caption/hashtags/critic_score) อัตโนมัติ |
| Claude Code | งานทั่วไป | สร้าง/ดูแล engine + แพลตฟอร์ม ผ่าน PR/CI (มี guardrail) |

ตั้งค่า: `export OPENTHAI_API_URL=https://www.openthai-ai.com` (default `http://localhost:8000`)

---

## ใครทำอะไร (แบ่งมือ ไม่ทับกัน)

| งาน | มือ | ช่องทาง |
|---|---|---|
| batch สร้างคอนเทนต์จาก CSV สินค้า | 🟢 Cowork | drop ไฟล์ → `/api/generate` |
| รายงาน KPI / เด็คนำเสนอ / ร่างอีเมลสื่อ | 🟢 Cowork | Office files บนเครื่อง |
| สร้าง/แก้ engine, endpoint, n8n workflow | 🔵 Claude Code | PR → CI → main |
| เทส, security, deploy, migration, Supabase | 🔵 Claude Code | PR → CI → main |
| เอกสารใน repo (positioning, press release) | 🔵 Claude Code | version control |

> กฎเหล็ก: **อะไรที่กระทบ production ต้องผ่าน Claude Code → PR → CI เท่านั้น**
> Cowork ใช้กับงานที่ "พังแล้วไม่กระทบลูกค้า" (คอนเทนต์/เอกสาร/ออฟฟิศ)

---

## Data = source of truth เดียว

ทั้งสองมือเขียนข้อมูลกลับเข้า **backend เดียวกัน** → ไฟล์ใน `data/` (local) หรือ **Supabase/KV** (production)
ดังนั้นไม่มีข้อมูลซ้อน/หลุดกัน — ดูการ persist ถาวรที่ `backend/kv-store.js` + `migrations/005_kv_store.sql`

---

## ข้อควรระวัง (guardrails)

1. **ต้นทุน** — engine กลางเรียก AI API; งาน batch ซ้ำๆ คุ้มสุด ตั้ง rate limit ไว้แล้ว (`/api/generate` = 10/นาที/IP)
2. **ความปลอดภัย** — Cowork เข้าถึงไฟล์ในเครื่อง: จำกัดโฟลเดอร์ที่อนุญาต, อย่าวางคีย์/ข้อมูลลูกค้าจริงในที่ที่ไม่จำเป็น (สอดคล้องกับ fail-closed ใน PR #44)
3. **เอกลักษณ์เดียว** — ถ้าจะแก้ "สูตรคอนเทนต์" แก้ที่ engine กลาง (`buildPrompt`/`smartGenerate`) ที่เดียว แล้วทุกช่องทางได้เหมือนกันทันที ห้ามไปแก้ prompt แยกใน Cowork อีก

---

## TL;DR
- **1 engine** (`/api/generate`) · **2 มือ** (Cowork = ใช้งาน, Claude Code = สร้าง/ดูแล) · **1 ฐานข้อมูล**
- Cowork ตอนนี้ "เสียบ" เข้า engine กลางแล้ว → ผลงานเหมือนแพลตฟอร์มทุกประการ
- แก้สูตรที่เดียว ได้ผลทุกที่ · งานกระทบ production ผ่าน PR/CI เสมอ
