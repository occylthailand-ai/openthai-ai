# 🚀 เปิดใช้เต็มระบบ (Go Live) — 5 นาที

> โค้ดพร้อม 100% แล้ว เหลือแค่ใส่ **key ของคุณ** (ผมตั้งให้แทนไม่ได้ — เป็นความลับของคุณบน Vercel/Supabase)
> เปิดทีละส่วนได้ ไม่ต้องครบทุกอย่างพร้อมกัน

ตรวจผลได้ตลอดที่: **`https://www.openthai-ai.com/api/system/readiness`** (ไฟเขียว = เปิดสำเร็จ)

---

## 1) 🗄️ Supabase — เก็บข้อมูลถาวร (เครดิต/ผู้ผลิต/ออเดอร์)

ไม่ตั้ง = ใช้ไฟล์ชั่วคราว (หายเมื่อ Vercel รีไซเคิล) · ตั้ง = ถาวรข้าม instance

1. สร้างโปรเจกต์ที่ https://supabase.com (ฟรี)
2. **SQL Editor** → วางไฟล์ [`backend/migrations/000-all-in-one.sql`](../backend/migrations/000-all-in-one.sql) → **Run** (สร้าง 3 ตารางครั้งเดียว)
3. **Settings → API** → คัดลอก **Project URL** และ **service_role key** (secret)
4. Vercel → Project → **Settings → Environment Variables** → เพิ่ม:
   ```
   SUPABASE_URL          = https://<project>.supabase.co
   SUPABASE_SERVICE_KEY  = <service_role key>
   ```

---

## 2) 💳 Omise — รับเงินจริง

ไม่ตั้ง = mock mode (ส่วนลด/เครดิตทำงานครบ แต่ไม่ตัดเงินจริง)

1. สมัคร/ยืนยันบัญชี Omise + **ผูกพร้อมเพย์** (บัญชีธนาคารร้าน) ที่ https://dashboard.omise.co
2. ดู key ที่ **Keys** แล้วเพิ่มใน Vercel env:
   ```
   OMISE_PUBLIC_KEY     = pkey_live_xxx   (หรือ pkey_test_ ตอนทดสอบ)
   OMISE_SECRET_KEY     = skey_live_xxx
   OMISE_WEBHOOK_SECRET = <ความลับที่คุณตั้งเอง — ต้องตรงกับฝั่ง Omise>
   ```
3. **ตั้ง Webhook ใน Omise** (Dashboard → **Webhooks**) ให้ยิงมาที่:
   ```
   https://www.openthai-ai.com/api/payment/webhook
   ```
   > ระบบตรวจลายเซ็น HMAC ทุกครั้ง — กันคนปลอมการแจ้งจ่ายเงิน ถ้าไม่ตั้ง `OMISE_WEBHOOK_SECRET` webhook จะถูกปฏิเสธทั้งหมด
   >
   > หมายเหตุ: หน้า `/pay` และ `/payment` ยัง poll สถานะเองทุก 4–5 วิอยู่แล้ว webhook เป็นตัวยืนยันสำรอง (เผื่อปิดหน้าจอ)

---

## 3) 🔐 ADMIN_KEY — ป้องกันหน้า Admin บน production

**จำเป็นบน production** (ไม่ตั้ง = หน้า Admin/รายงานจะถูกปฏิเสธ)

```
ADMIN_KEY = <ตั้งรหัสลับยาวๆ ของคุณเอง>
```
> ใช้รหัสนี้ตอน login หน้า `/admin` ด้วย (หรือใส่ `VITE_ADMIN_KEY` ตอน build ให้ตรงกัน)

---

## 4) 📱 LINE_NOTIFY_TOKEN — แจ้งเตือนเข้ามือถือ (optional)

```
LINE_NOTIFY_TOKEN = <token จาก notify-bot.line.me>
```
ใช้กับ health-watch / auto-recovery (เว็บล่มแล้วเตือนเข้า LINE)

---

## ✅ หลังตั้งค่า

1. Vercel → **Redeploy** (หรือ push อะไรก็ได้ — git integration deploy เอง)
2. เปิด **`/api/system/readiness`** → ดูว่าทุกอย่าง `ok: true`
   ```json
   { "ready": true, "ledger_mode": "supabase (ถาวร)",
     "checks": { "supabase": {"ok": true}, "payments": {"ok": true}, "admin_key": {"ok": true} } }
   ```
3. เสร็จ! ระบบรับเงินจริง + เก็บข้อมูลถาวร + admin ปลอดภัย

> หมายเหตุตรงไปตรงมา: นี่เปิด **"ระบบ"** ให้พร้อมรับจริง — ส่วนการดึงผู้ผลิต/ลูกค้าตัวจริงเข้ามายังต้องทำการตลาดเอง

---

## ⚡ รับเงินด่วนวันนี้ — หน้า QuickPay (`/pay`)

หลังตั้ง Omise (ข้อ 2) เสร็จ คุณ **ขายได้ทันที** โดยไม่ต้องตั้งสินค้าในคลัง:

1. เปิด **`https://www.openthai-ai.com/pay`**
2. ตั้งยอด (มีปุ่มลัด ฿199 / ฿499 / **฿1,000** / ฿1,990) + ใส่ชื่อแพ็กเกจที่ลูกค้าเห็น
3. กด **"สร้าง QR รับเงิน"** → ได้ PromptPay QR
4. ส่ง QR / ลิงก์ให้ลูกค้า → ลูกค้าสแกนจ่าย → **เงินเข้าพร้อมเพย์ของร้าน** → หน้าเด้งยืนยันอัตโนมัติ

> ทำลิงก์สำเร็จรูปได้: `…/pay?amount=1000&label=แพ็กเกจคอนเทนต์%20AI%2030%20ชิ้น`
> ก่อนตั้ง Omise หน้านี้ทำงานใน **โหมดทดสอบ** (ไม่ตัดเงินจริง) เพื่อให้ลองดู flow ได้
