# 🇹🇭 Openthai.ai — Complete Setup Guide

> AI-powered TikTok content generator สำหรับสินค้าไทยและสินค้าทั่วโลก

---

## 📁 โครงสร้างโปรเจกต์

```
openthai-ai/
├── landing/                 # Landing Page (Vercel)
│   ├── index.html          # หน้าหลัก + Waitlist Form
│   ├── privacy.html        # นโยบายความเป็นส่วนตัว (PDPA)
│   └── google_apps_script.js  # Script สำหรับ Google Sheets
│
├── backend/                 # FastAPI Backend
│   ├── main.py             # API Server + Claude Integration
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
│
├── n8n-workflows/          # n8n Automation
│   └── openthai-ai-workflow.json  # 11-node workflow (9-Skills)
│
├── cowork/                  # Desktop Automation
│   └── automation.py       # Cowork batch processing
│
├── database/               # Product Data
│   └── sample_products.csv # ตัวอย่างสินค้า
│
├── docs/                   # Documentation
│   └── SETUP.md           # (this file)
│
└── vercel.json            # Vercel configuration
```

---

## 🚀 Quick Start (5 ขั้นตอน)

### ขั้นตอนที่ 1: Deploy Landing Page (10 นาที)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit: Openthai.ai"
git remote add origin https://github.com/YOUR_USERNAME/openthai-ai.git
git push -u origin main

# 2. ไปที่ vercel.com
# 3. Import project จาก GitHub
# 4. Deploy!
# 5. URL: https://openthai-ai.vercel.app
```

### ขั้นตอนที่ 2: Setup Google Sheets Waitlist (5 นาที)

1. สร้าง Google Sheet ใหม่
2. ไป **Extensions → Apps Script**
3. Copy โค้ดจาก `landing/google_apps_script.js`
4. **Deploy → New deployment → Web app**
5. Copy URL และใส่ใน `landing/index.html` (แทน `YOUR_GOOGLE_APPS_SCRIPT_URL`)

### ขั้นตอนที่ 3: Setup Backend API (10 นาที)

```bash
cd backend

# สร้าง virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# สร้างไฟล์ .env
cp .env.example .env
# แก้ไข .env และใส่ ANTHROPIC_API_KEY

# รัน server
uvicorn main:app --reload --port 8000

# ทดสอบ: http://localhost:8000/docs
```

### ขั้นตอนที่ 4: Import n8n Workflow (5 นาที)

1. เปิด n8n (cloud หรือ self-hosted)
2. ไป **Workflows → Import from File**
3. เลือก `n8n-workflows/openthai-ai-workflow.json`
4. ตั้งค่า Credentials:
   - **HTTP Header Auth**: `x-api-key` = `YOUR_ANTHROPIC_API_KEY`
   - **Google Sheets API** (ถ้าใช้ Knowledge Base)
5. **Activate** workflow

### ขั้นตอนที่ 5: Test Everything (5 นาที)

```bash
# ทดสอบ API
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "ผ้าไหมมัดหมี่ สุรินทร์",
    "product_category": "textile",
    "hook_type": "story"
  }'

# ทดสอบ n8n Webhook
curl -X POST https://YOUR_N8N_URL/webhook/openthai-ai \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "น้ำพริกเผาแม่ประนอม",
    "category": "food"
  }'
```

---

## ⚙️ Configuration Details

### Environment Variables (.env)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional
HOST=0.0.0.0
PORT=8000
DEBUG=false
GOOGLE_SHEETS_ID=xxxxx
```

### Claude API Model

ใช้ `claude-sonnet-4-5-20251001` สำหรับ balance ระหว่าง quality และ cost

### n8n Credentials Setup

| Credential | Type | Value |
|------------|------|-------|
| Anthropic API | HTTP Header Auth | `x-api-key: YOUR_KEY` |
| Google Sheets | OAuth2 or API Key | ตาม setup |

---

## 🔧 9-Skills Framework

| Skill | Node | Description |
|-------|------|-------------|
| S1 | Prompt Assembly | RCCF Prompt (Role, Context, Constraint, Format) |
| S2 | Taste Check | ตรวจสอบกับ reference library |
| S3 | Prompt Assembly | Master Prompt สำหรับ output format |
| S4 | IF Gate | Output Iteration (max 3x loop) |
| S5 | Prompt Assembly | Category System Prompts |
| S6 | AI Critic | ให้คะแนนและ feedback |
| S7 | Context Card | Context Compression (5 fields) |
| S8 | Knowledge Base | Google Sheets product data |
| S9 | Learning Layer | อธิบาย why it works |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check |
| POST | `/generate` | Generate TikTok content |
| GET | `/hook-types` | List available hooks |
| GET | `/categories` | List product categories |

### POST /generate

**Request:**
```json
{
  "product_name": "ผ้าไหมมัดหมี่",
  "product_category": "textile",
  "product_description": "ผ้าไหมทอมือแท้",
  "target_audience": "คนรักผ้าไทย",
  "hook_type": "story"
}
```

**Response:**
```json
{
  "script": {
    "hook": "รู้ไหมว่าผ้าผืนนี้ใช้เวลาทอ 3 เดือน?",
    "story": "...",
    "cta": "..."
  },
  "caption": "...",
  "hashtags": ["#ผ้าไหมไทย", "..."],
  "quality": {
    "critic_score": 8.5,
    "taste_score": 8,
    "iterations": 1
  },
  "learning": {
    "hook_type": "story",
    "why_it_works": "...",
    "next_try": "..."
  }
}
```

---

## 🎯 Validation Goals (4 Weeks)

| Week | Goal | Metric |
|------|------|--------|
| 1 | Launch | 500 visits, 50 waitlist |
| 2 | Demo | 100 demo users |
| 3 | WTP | 20%+ willingness-to-pay |
| 4 | Revenue | 10+ pre-sales |

---

## 💰 Pricing Model

| Plan | Price | Features |
|------|-------|----------|
| Free | ฿0 | 3/day, OTOP only |
| Pro | ฿149/mo | Unlimited, all products |
| Business | ฿299/mo | API access, team 5 |

---

## 📞 Support

- **Email**: contact@OpenThaiAi.com
- **LINE**: @OpenThaiAi
- **GitHub Issues**: [Report bugs](https://github.com/YOUR_USERNAME/openthai-ai/issues)

---

## 📜 License

© 2026 Openthai.ai — Made with ❤️ in Thailand

---

## 🙏 Acknowledgments

- Claude AI by Anthropic
- n8n for workflow automation
- Vercel for hosting
- Google Sheets for database
