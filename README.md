# 🇹🇭 OpenThaiAi

**แพลตฟอร์ม AI สำหรับ SME ไทย — ตั้งแต่สร้างคอนเทนต์/การตลาดด้วย AI ไปจนถึง
ระบบสั่งซื้อ ผู้ผลิต Affiliate และคนกลาง ครบวงจร**

> เนื้อหาในไฟล์นี้ตรวจสอบกับโค้ดจริงในเซสชันนี้ (2026-07-02) — สำหรับสถานะแบบละเอียด
> (จำนวน skill/route/module จริง, env var, migration) ดู `PROJECT_STATUS.md`
> (สร้างใหม่ได้ด้วย `node scripts/generate-project-status.mjs`) และประวัติการตัดสินใจ
> จริงทั้งหมดดู `DECISIONS_LOG.md`

---

## ✨ สิ่งที่ทำงานจริง (ไม่ใช่แผน)

- 🧠 **35 AI Skills** — สร้างคอนเทนต์ TikTok, วิเคราะห์เทรนด์, SEO, sentiment,
  live-selling script, sales conversion engine ฯลฯ ผ่าน Claude/Gemini API จริง
- 🤝 **ระบบสมาชิก 5 กลุ่ม** — ผู้ผลิต, ผู้บริโภค, คนกลาง/ตัวแทนจำหน่าย, สินค้า, Affiliate
  (สมัครจริงผ่าน `/portals/*`, เก็บข้อมูลจริงใน Supabase)
- 🛒 **ระบบสั่งซื้อ + ข้อพิพาท** — ติดตามสถานะจัดส่ง, เปิดข้อพิพาทพร้อม AI ช่วยแนะนำ,
  ผู้ดูแลระบบตัดสินใจสุดท้าย
- 💳 **ชำระเงินจริง** — Omise (PromptPay QR + บัตร) สกุลเงินบาทเท่านั้น
- 🔌 **Integration Hub** — เชื่อม LINE OA / Facebook Page (Graph API จริง) /
  Canva ได้ทันทีเมื่อใส่ API key จริง
- 🏛️ **Council Room** (`/council`) — ห้องคุยกับ Claude + Gemini + Grok พร้อมกัน
  ผ่าน API จริงของแต่ละเจ้า (ต้องตั้ง API key ของแต่ละแพลตฟอร์มเอง)

---

## 🚀 Quick Start (dev จริง)

```bash
git clone <repo-url>
cd openthai-ai

# Backend (Express, Node.js — ไม่ใช่ Python/FastAPI)
cd backend
npm install
cp .env.example .env
# ใส่ ANTHROPIC_API_KEY อย่างน้อย 1 ตัว ให้ AI skills ทำงานได้จริง
npm run dev          # node --watch server.js

# Frontend (React + Vite) — เปิดอีก terminal
cd frontend
npm install
npm run dev           # vite dev server
```

Deploy จริงผ่าน Vercel (`vercel.json`): build frontend ด้วย `npm run build`,
backend รันเป็น Serverless Function (`api/index.js` ห่อ `backend/server.js`
ทั้งไฟล์), auto-deploy ทุกครั้งที่ push เข้า `main`

---

## 📁 โครงสร้างโปรเจกต์จริง

```
openthai-ai/
├── backend/           → Express (ES modules) — API หลักทั้งหมด, 24 modules
├── frontend/           → React + Vite — 81 routes
├── api/                → Vercel Serverless entrypoint (ห่อ backend/server.js)
├── scripts/            → เครื่องมือ dev (generate-project-status.mjs ฯลฯ)
├── docs/                → เอกสารจริง (outreach copy, ai-memory)
├── n8n-workflows/      → n8n workflow JSON (import ใช้ได้จริง)
├── database/, landing/, cowork/  → จากเวอร์ชันก่อนหน้า สถานะการใช้งานปัจจุบันยังไม่ยืนยัน
```

---

## 🛠 Tech Stack จริง (ตรวจจาก package.json)

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Express (Node.js, ES modules) บน Vercel Serverless |
| Frontend | React + Vite |
| AI | `@anthropic-ai/sdk` (Claude), `@google/generative-ai` (Gemini), Grok ผ่าน `fetch` ตรงไปที่ `api.x.ai` |
| Database | Supabase Postgres (เข้าถึงผ่าน REST ไม่ใช้ ORM) |
| Payment | Omise — PromptPay QR + บัตร, บาทเท่านั้น |
| Automation | node-cron (Vercel Cron) + n8n workflows (เสริม) |

---

## 💰 Pricing จริง (จาก `backend/omise-payment.js`)

| Plan | ราคา |
|---|---|
| Free | ฿0 |
| Pro | ฿20/เดือน |
| Premier | ฿30/เดือน |

---

## 📜 License

© 2026 OpenThaiAi
