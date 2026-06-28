# 🚀 Deployment Runbook — OpenThaiAi (go-live ครบจบไฟล์เดียว)

สแตกจริงของโปรเจกต์: **React + Vite (frontend)** · **Express ES Modules (backend, Vercel Serverless)** · **Supabase REST + ไฟล์ (storage)** · **Omise (PromptPay)**

> ⚠️ ไม่ใช้ Prisma / DATABASE_URL / `npx prisma db push` — สคริปต์ bootstrap แบบ Prisma ที่เห็นจากที่อื่นคนละสถาปัตยกรรม **อย่ารันกับโปรเจกต์นี้**

ตรวจความพร้อมได้ตลอดที่ 👉 `https://www.openthai-ai.com/api/system/readiness`

---

## ขั้นที่ 1 — Merge โค้ด
Merge PR เข้า `main` → Vercel จะ build + deploy อัตโนมัติ (git integration)

## ขั้นที่ 2 — Environment Variables (Vercel → Settings → Environment Variables)

**จำเป็นสำหรับรับเงิน + admin:**
```
OMISE_SECRET_KEY      = skey_live_xxx     # ไม่ตั้ง = mock mode ไม่ตัดเงินจริง
OMISE_PUBLIC_KEY      = pkey_live_xxx     # สำหรับจ่ายด้วยบัตร
OMISE_WEBHOOK_SECRET  = <รหัสลับของคุณ>
ADMIN_KEY             = <รหัสลับยาว ๆ>     # ป้องกันหน้า/endpoint admin
JWT_SECRET            = <รหัสลับ>
```
**แนะนำ (ถ้ามี):**
```
SUPABASE_URL + SUPABASE_SERVICE_KEY      # เก็บข้อมูลถาวร (ไม่ตั้ง = ไฟล์ชั่วคราว /tmp)
ANTHROPIC_API_KEY / GEMINI_API_KEY / XAI_API_KEY   # เปิด AI จริง (Router/Council/Captions)
AI_DAILY_BUDGET_USD  = 1.0               # เพดานงบ token/วัน → เกิน = Eco Mode
LINE_CHANNEL_TOKEN                       # เปิด LINE OA broadcast อัตโนมัติ
FRONTEND_URL = https://www.openthai-ai.com
```
> หลังเพิ่ม env → ไป **Deployments → Redeploy** (env ใหม่มีผลหลัง redeploy)

## ขั้นที่ 3 — Omise (รับเงินพร้อมเพย์จริง)
ทำตาม [`docs/OMISE_SETUP.md`](./OMISE_SETUP.md) — สรุป:
1. สมัคร + ยืนยันตัวตน + ผูกบัญชีธนาคาร ที่ dashboard.omise.co
2. เปิดวิธีจ่าย **PromptPay**
3. ตั้ง **Webhook URL** → `https://www.openthai-ai.com/api/payment/webhook`

## ขั้นที่ 4 — UptimeRobot (ให้ Scheduler รันต่อเนื่องจริง · ฟรี)

Vercel Hobby cron รัน ~วันละครั้ง — ถ้าต้องการให้คิวโพสต์ประมวลผล **ทุก ~15 นาทีจริง** (LINE OA broadcast ตามเวลา) ใช้ pinger ฟรี:

1. สมัคร **UptimeRobot.com** (หรือ cron-job.org)
2. Add New Monitor:
   - Type: **HTTP(s)**
   - URL: `https://www.openthai-ai.com/api/scheduler/process`
   - Monitoring Interval: **15 minutes** (cron-job.org ตั้งถี่กว่าได้)
3. บันทึก → ระบบจะถูก ping เป็นรอบ → โพสต์ที่ถึงเวลาในคิวถูกประมวลผลอัตโนมัติ
   - 💚 LINE OA (ช่องคุณเอง) → broadcast เลย
   - 📲 ช่องอื่น → mark "ready" รอคุณกดโพสต์ (ToS ห้ามบอทโพสต์)

> มี Vercel cron `*/15 * * * *` ใน `vercel.json` อยู่แล้ว — บน **Pro** ทำงานเต็มที่; บน **Hobby** ใช้ UptimeRobot เสริม

## ขั้นที่ 5 — ยืนยันว่าใช้ได้จริง
1. `GET /api/health` → `status: ok`
2. `GET /api/system/readiness` → `checks.payments.ok = true` (SECRET ✅ PUBLIC ✅ WEBHOOK ✅)
3. **ทดสอบจ่ายจริง ฿1:** เปิด `/pay` → ตั้งยอด `1` → สแกนด้วยแอปธนาคาร → จ่าย → หน้าเด้ง "รับเงินสำเร็จ" → เงินเข้าบัญชี Omise → refund คืนได้ใน dashboard

## ขั้นที่ 6 — รันชุดทดสอบ (ก่อน/หลัง deploy)
```bash
cd backend
OMISE_WEBHOOK_SECRET=testsecret ADMIN_KEY=testadmin npm start   # terminal 1
npm run test:revenue      # 26 เคส — captions/router/council/affiliate/withdraw/scheduler
npm run test:affiliate    # 22 เคส — affiliate + commission crediting
```

---

## ✅ Checklist สรุป
- [ ] Merge PR → Vercel deploy
- [ ] ตั้ง env (`OMISE_*`, `ADMIN_KEY`, `JWT_SECRET`) → Redeploy
- [ ] Omise: เปิด PromptPay + ตั้ง webhook URL
- [ ] UptimeRobot ping `/api/scheduler/process` ทุก 15 นาที
- [ ] `/api/system/readiness` เขียว → ทดสอบจ่ายจริง ฿1
- [ ] (ถ้ามี) `LINE_CHANNEL_TOKEN` → ทดสอบ LINE broadcast

## ⚠️ ความจริงที่ต้องเข้าใจ
ครบทุกข้อข้างบน = **ระบบพร้อมรับเงินจริง 24/7** — แต่เงินจะเข้าก็ต่อเมื่อมี **ลูกค้าจริงสแกนจ่าย** (หรือคุณโอนทดสอบเอง) ระบบไม่เสกเงิน/ลูกค้า และ AI โอนเงินเข้าบัญชีแทนไม่ได้
