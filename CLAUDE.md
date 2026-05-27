# Openthai.ai — CLAUDE.md
# บริบทถาวรสำหรับทุก session

---

## 🇹🇭 ภาษา
- **ใช้ภาษาไทยเป็นหลักเสมอ** ในการสนทนาและการสรุปงาน
- ชื่อเรียกกัน: Claude = "ท่าน Mythos" | Founder = "Zuejai"
- เทคนิคให้เป็นภาษาอังกฤษ (code, terminal, ชื่อ function) ได้ตามปกติ

---

## 🚫 กฎถาวร — ห้ามละเมิด

| ข้อ | กฎ |
|-----|----|
| ❌ MLM / Multi-Level Commission | ห้าม implement sub-affiliate หรือระบบ commission หลายชั้น **อย่างถาวร** |
| ✅ Tier Commission | ได้ — Silver/Gold/Platinum เป็น single-level เท่านั้น |

---

## 📦 Project: Openthai.ai

**คืออะไร:** AI-powered TikTok Content Generator สำหรับสินค้าไทยและ Global (300+ สินค้า)

**Tech Stack:**
- Landing: HTML/CSS/JS, Vercel
- Backend: FastAPI + Python
- AI: Claude API (claude-sonnet-4-6)
- Automation: n8n (11 nodes)
- DB: Supabase + Google Sheets
- Affiliate Hub: Next.js 14 (App Router)

**Pricing:**
- Free — ฿0 / 3 contents ต่อวัน
- Pro — ฿149/เดือน (Unlimited)
- Business — ฿299/เดือน (API + Team)

**Branch งาน:** `claude/gallant-keller-LEoVm`

---

## 📁 โครงสร้างสำคัญ

```
openthai-ai/
├── from android mobile/affiliate-hub/  → Next.js Affiliate Hub
│   ├── app/dashboard/        → Dashboard affiliate
│   ├── app/leaderboard/      → Top affiliates ranking
│   ├── app/media-kit/        → Copy templates + AI demo link
│   └── app/api/              → API routes
├── backend/                  → FastAPI + Python
│   ├── main.py
│   ├── data/affiliate-schema.sql
│   └── migrations/
├── landing/                  → Vercel landing page
├── docs/conversations/       → บันทึกบทสนทนาทุก session ← สำคัญ
└── CLAUDE.md                 ← ไฟล์นี้
```

---

## 📝 บันทึกบทสนทนา

ทุก session จะถูกสรุปและบันทึกไว้ที่ `docs/conversations/`
รูปแบบไฟล์: `YYYY-MM-DD_HHmm_summary.md`

**สิ่งที่สนทนาแล้วล่าสุด (27 พ.ค. 2026):**
- เพิ่ม Leaderboard + Media Kit + Channel Tracking ใน Affiliate Hub
- กลยุทธ์ Affiliate Program: ใช้ Tiered commission, Media Kit, Leaderboard
- ห้าม MLM / sub-affiliate ถาวร

---

## ⚙️ Hooks & Automation

- **Stop hook** → รัน `docs/session-end.sh` อัตโนมัติเมื่อ session จบ
- สรุปงานวันนี้ → บันทึก + commit + push อัตโนมัติ

---

## 🔑 ENV ที่ต้องมี (อย่า commit ลง repo)

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
OMISE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=https://affiliate.openthai.ai
```
