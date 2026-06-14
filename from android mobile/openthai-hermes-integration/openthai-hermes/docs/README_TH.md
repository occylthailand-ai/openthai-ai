# 🤖 Hermes Agent × Openthai.ai — Integration Guide

เชื่อม Hermes Agent เข้ากับ Openthai.ai เพื่อเพิ่ม:
- 🧠 **Memory** — จดจำ preference ของแต่ละ user ข้ามการสนทนา
- 📱 **Multi-platform** — LINE, Telegram, WhatsApp ใช้ AI เดียวกัน
- 🔄 **Auto-content** — Cron job สร้าง content อัตโนมัติ
- 📈 **Self-improving** — Hermes เรียนรู้และปรับปรุงตัวเองตามเวลา

---

## 📐 Architecture

```
[User]
  ├── TikTok/Web → openthai-ai.vercel.app (Frontend)
  │                      ↓ API call
  │               FastAPI Backend (backend/)
  │                      ↓ hermes_client.py
  │               Hermes Bridge :8001 (bridge/hermes_bridge.py)
  │                      ↓ OpenAI-compatible API
  │               Hermes Agent :8642
  │                      ↓ LLM
  │               Claude API (Anthropic)
  │
  ├── Telegram → Hermes Gateway (telegram bot)
  │                      ↓ memory + skills
  │               Hermes Agent
  │
  └── n8n → Webhook → Hermes Bridge → Hermes Agent
              (openthai_hermes_workflow.json)
```

---

## 🚀 วิธีติดตั้ง (Step by Step)

### Step 1: ติดตั้ง Hermes Agent (ถ้ายังไม่มี)

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### Step 2: ตั้งค่า API Keys

เปิดไฟล์ `~/.hermes/.env` แล้วเพิ่ม:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
HERMES_GATEWAY_KEY=openthai-hermes-secret-changeme
TELEGRAM_BOT_TOKEN=xxxxxxxx:xxxxxxxxx (ได้จาก @BotFather)
BRIDGE_API_KEY=openthai-bridge-key-changeme
```

### Step 3: Copy Hermes Config

```bash
# Merge config กับที่มีอยู่
cat config/hermes_openthai_config.yaml >> ~/.hermes/config.yaml

# Copy OpenThai skill
cp skill/openthai_tiktok.py ~/.hermes/skills/
```

### Step 4: ติดตั้ง Bridge Dependencies

```bash
pip install fastapi uvicorn httpx python-dotenv anthropic
```

### Step 5: รัน Hermes Gateway

```bash
# Terminal 1 — Hermes Agent (OpenAI Server Mode)
hermes gateway start --openai-server

# Terminal 2 — Hermes Bridge
uvicorn bridge.hermes_bridge:app --host 0.0.0.0 --port 8001
```

### Step 6: อัปเดต Openthai.ai Backend

```bash
# Copy hermes_client.py ไปที่ backend ของ Openthai.ai
cp bridge/hermes_client.py C:/Projects/openthai-ai/backend/

# เพิ่มใน backend/.env
echo "HERMES_BRIDGE_URL=http://localhost:8001" >> C:/Projects/openthai-ai/backend/.env
echo "BRIDGE_API_KEY=openthai-bridge-key-changeme" >> C:/Projects/openthai-ai/backend/.env
```

แล้วแก้ไข backend endpoint:

```python
# แทนที่การเรียก Claude โดยตรง
from hermes_client import generate_script_via_hermes

@app.post("/api/generate")
async def generate(req: ScriptRequest):
    result = await generate_script_via_hermes(
        product_name=req.product_name,
        price=req.price,
        user_id=req.user_id,
    )
    return result.to_dict()
```

### Step 7: Import n8n Workflow

1. เปิด n8n Dashboard
2. ไปที่ **Workflows → Import**
3. Upload `n8n/openthai_hermes_workflow.json`
4. ตั้งค่า credentials: Google Sheets, Telegram Bot
5. เปิด Workflow

---

## 🧪 ทดสอบระบบ

```bash
# Test Bridge health
curl http://localhost:8001/health

# Test script generation
curl -X POST http://localhost:8001/api/generate \
  -H "X-API-Key: openthai-bridge-key-changeme" \
  -H "Content-Type: application/json" \
  -d '{"product_name": "สบู่มะขามสด", "price": "150 บาท"}'

# Test via Hermes directly
hermes "สร้าง TikTok script สำหรับ สบู่มะขามสด ราคา 150 บาท"
```

---

## 🤖 Telegram Bot Commands

เมื่อ connect Telegram แล้ว user ใช้คำสั่ง:

```
/script สบู่มะขามสด ราคา 150 บาท
/script เสื้อผ้าแฟชั่นเกาหลี กลุ่มวัยรุ่น
/script น้ำพริกเผาแม่บ้าน ราคา 80 บาท
```

Hermes จะจดจำ preference ของแต่ละ user และ generate script ที่ตรงกับสไตล์ที่ชอบมากขึ้นเรื่อยๆ

---

## 📊 Cron Jobs อัตโนมัติ

| เวลา | งาน |
|------|-----|
| ทุกวัน 8:00 น. | วิเคราะห์ TikTok trending hooks ส่งรายงานทาง Telegram |
| ทุกจันทร์ 9:00 น. | เคล็ดลับ content สัปดาห์นี้ |

---

## 🔧 Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|---------|
| `Cannot connect to Hermes Bridge` | ตรวจสอบว่า `uvicorn bridge.hermes_bridge:app` รันอยู่ |
| `Hermes not connected` | ตรวจสอบว่า `hermes gateway start --openai-server` รันอยู่ |
| `Invalid API key` | ตรวจสอบ `BRIDGE_API_KEY` ใน .env ตรงกันทั้ง 2 ฝั่ง |
| `JSON parse error` | เพิ่ม `temperature: 0.3` ใน config เพื่อให้ output stable ขึ้น |

---

## 📁 ไฟล์ในแพคเกจนี้

```
openthai-hermes/
├── skill/
│   └── openthai_tiktok.py       ← Hermes custom skill
├── bridge/
│   ├── hermes_bridge.py         ← FastAPI Bridge (Hermes ↔ OpenThai)
│   └── hermes_client.py         ← Client สำหรับ OpenThai Backend
├── config/
│   └── hermes_openthai_config.yaml  ← Hermes config patch
├── n8n/
│   └── openthai_hermes_workflow.json  ← n8n workflow
└── docs/
    └── README_TH.md             ← คู่มือนี้
```

---

## 💡 ขั้นต่อไป (Phase 2)

- [ ] เพิ่ม LINE Messaging API integration
- [ ] สร้าง product database ให้ Hermes เข้าถึงได้
- [ ] เพิ่ม analytics dashboard — ดูว่า script ไหน score สูงสุด
- [ ] Hermes RL training จาก user feedback
- [ ] Multi-language support (TH/EN/ZH)

---

สร้างโดย Openthai.ai Team 🇹🇭  
Powered by Hermes Agent (Nous Research) × Claude (Anthropic)
