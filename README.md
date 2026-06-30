# 🇹🇭 Openthai.ai

**AI-powered TikTok content generator สำหรับสินค้าไทยและสินค้าทั่วโลก**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/openthai-ai)

---

## ✨ Features

- 🎬 **สคริปต์ TikTok 30 วินาที** — Hook 3วิ + Story 20วิ + CTA 7วิ
- 📝 **แคปชั่น + 10 แฮชแท็ก** — พร้อมใช้งานทันที
- 🏆 **5 รูปแบบ Hook** — Story / Process / Contrast / Question / Transformation
- 🌏 **300+ สินค้า** — OTOP + ไทย + จีน + Global (35 ประเทศ)
- 🧠 **AI Critic** — ให้คะแนนอัตโนมัติ ≥ 7/10
- 📚 **Learning Layer** — อธิบายว่าทำไม Hook นี้ถึงเวิร์ค

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/openthai-ai.git
cd openthai-ai

# 1) Backend — Express (ES Modules)
cd backend
npm install
cp .env.example .env          # ใส่ ANTHROPIC_API_KEY หรือ GEMINI_API_KEY
npm run dev                   # http://localhost:8000/api/health

# 2) Frontend — React + Vite (อีก terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# Deploy: push ขึ้น Vercel (build frontend + serverless backend อัตโนมัติ)
```

> หมายเหตุ: `backend/main.py` (FastAPI) เป็นต้นแบบรุ่นแรกที่ยังเก็บไว้อ้างอิง
> — runtime จริงบน production คือ `backend/server.js` (Express).

📖 **Full setup guide**: [docs/SETUP.md](docs/SETUP.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📁 Project Structure

```
openthai-ai/
├── api/index.js      → Vercel serverless entry → backend/server.js
├── backend/          → Express API (server.js) + 35-Skills + Omise + auth
│   └── migrations/   → Supabase PostgreSQL schema
├── frontend/         → React + Vite (SPA + PWA)
├── n8n-workflows/    → automation workflows
├── cowork/           → desktop batch processing
├── database/         → product data
└── docs/             → documentation
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite + React Router (PWA) |
| Backend | Express (Node.js, ES Modules) on Vercel Serverless |
| AI | Claude (Anthropic) → Gemini → Mock fallback · `claude-haiku-4-5` |
| Auth | JWT + bcrypt · Google OAuth |
| Payment | Omise (PromptPay QR + Card) |
| Database | Supabase (PostgreSQL) |
| Automation | n8n + Vercel Cron + GitHub Actions (health/self-heal) |

---

## 💰 Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | ฿0 | จำกัดต่อวัน |
| Pro | ฿20/mo | ปลดล็อกการใช้งาน |
| Premier | ฿30/mo | ฟีเจอร์เต็ม + ทีม |

> ราคาอ้างอิงจาก `backend/omise-payment.js` (`SUBSCRIPTION_PLANS`).

---

## 📞 Contact

- **Website**: [openthai-ai.vercel.app](https://openthai-ai.vercel.app)
- **Email**: contact@openthai.ai
- **LINE**: @openthai-ai

---

## 📜 License

© 2026 Openthai.ai — Made with ❤️ in Thailand
