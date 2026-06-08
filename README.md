# 🇹🇭 OpenThaiAi

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

# Deploy landing page to Vercel
vercel deploy

# Setup backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
uvicorn main:app --reload
```

📖 **Full setup guide**: [docs/SETUP.md](docs/SETUP.md)

---

## 📁 Project Structure

```
openthai-ai/
├── landing/          → Vercel (Landing + Waitlist)
├── backend/          → FastAPI + Claude API
├── n8n-workflows/    → 11-node automation
├── cowork/           → Desktop batch processing
├── database/         → Product data
└── docs/             → Documentation
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Landing | HTML/CSS/JS, Vercel |
| Backend | FastAPI, Python |
| AI | Claude API (claude-sonnet-4-5-20251001) |
| Automation | n8n (11 nodes, 9-Skills) |
| Database | Google Sheets |
| Desktop | Claude Cowork |

---

## 💰 Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | ฿0 | 3 contents/day |
| Pro | ฿149/mo | Unlimited |
| Business | ฿299/mo | API + Team |

---

## 📞 Contact

- **Website**: [OpenThaiAi.com](https://OpenThaiAi.com)
- **Email**: contact@OpenThaiAi.com
- **LINE**: @OpenThaiAi

---

## 📜 License

© 2026 OpenThaiAi — Made with ❤️ in Thailand
