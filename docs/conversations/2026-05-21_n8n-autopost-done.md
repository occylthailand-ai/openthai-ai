# n8n Auto-Post Workflow — เสร็จสมบูรณ์
วันที่: 21 พฤษภาคม 2569 | เสร็จ ~18:05

---

## สิ่งที่ทำสำเร็จในเซสชันนี้

### n8n Setup
- n8n v2.14.2 รันอยู่ที่ localhost:5678 ✅
- สร้าง owner account: occylthailand@gmail.com / OpenThai@2026 ✅
- Import workflow "OpenThai AI — Auto-Post X (3x Daily)" ✅
- **ACTIVE: True** — ทำงานจริงแล้ว ✅

### Workflow: Auto-Post X (3x Daily)
| เวลา Bangkok | UTC Cron | สถานะ |
|---|---|---|
| 08:00 | `0 1 * * *` | Active ✅ |
| 12:00 | `0 5 * * *` | Active ✅ |
| 17:00 | `0 10 * * *` | Active ✅ |

**Flow:**
1. Schedule Trigger (3 triggers)
2. Prepare Prompt (JS — เลือก theme ตามเวลา)
3. Gemini 2.0 Flash — Generate Tweet (AI สร้าง content ภาษาไทย)
4. Extract Tweet Text (JS — trim 275 chars)
5. **X Post TODO Tomorrow** (Placeholder — รอ X API credentials)
6. LINE Notify Log (fallback — รอ LINE_NOTIFY_TOKEN)

### API Keys ที่ได้และตั้งค่า
- **GEMINI_API_KEY**: `AIzaSyC-UfSJYjH-VKF5YSBtTPk5xAD8lXT_WqE`
  - บันทึกใน: `backend/.env` ✅
  - บันทึกใน: n8n workflow node โดยตรง ✅

### Auto-Start n8n
- สร้าง `%AppData%\Microsoft\Windows\Start Menu\Programs\Startup\start-n8n.bat` ✅
- n8n จะ start อัตโนมัติเมื่อ Windows เปิด

---

## สิ่งที่ต้องทำพรุ่งนี้ (แนวทางที่ 1 — X API)

### ขั้นที่ 1 — หา True Card CVV
- เปิดแอป True Money Wallet → ข้อมูลบัตร → Face ID/PIN
- หรือโทร 1240

### ขั้นที่ 2 — ซื้อ Anthropic Credits
- platform.claude.com/settings/billing → Buy credits → $20-30
- True Card: มี Card Number + Expiry + CVV (จากขั้นที่ 1)
- Thai VAT: 6500950122445

### ขั้นที่ 3 — สมัคร X Developer + เพิ่ม API Key
- developer.twitter.com → Create App → @OCCYL2
- ต้องการ: Consumer Key, Consumer Secret, Access Token, Access Secret
- เพิ่มใน n8n: เปิด localhost:5678 → Credentials → Add OAuth1 → X (Twitter)
- แก้ node "X Post TODO Tomorrow" → เปลี่ยนเป็น HTTP Request จริง

### ขั้นที่ 4 — เพิ่ม ANTHROPIC_API_KEY ใน Vercel
- `vercel env add ANTHROPIC_API_KEY production` → ใส่ key
- `vercel --prod` → redeploy

---

## สถานะระบบทั้งหมด

| ระบบ | สถานะ |
|------|--------|
| openthai-ai.com | ✅ Live (Gemini working) |
| n8n Auto-Post | ✅ Active — รอ X credentials |
| Supabase 10 Tables | ✅ Ready |
| GitHub repo | ✅ Push แล้ว |
| 3-Way Sync | ✅ Local+OneDrive+GitHub |
| ANTHROPIC_API_KEY | ⚠️ Key มี / Balance $0 |
| X API (@OCCYL2) | ⏳ พรุ่งนี้ |
| Moltbook mythosai | ⏳ รอ @MattPRD approve |
| LINE_NOTIFY_TOKEN | ⏳ ค้างอยู่ |
| Omise Payment | ⏳ ค้างอยู่ |

---

*บันทึกโดย Mythos — 21 พ.ค. 2569*
