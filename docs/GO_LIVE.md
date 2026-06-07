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

1. ดู key ที่ https://dashboard.omise.co → **Keys**
2. Vercel env เพิ่ม:
   ```
   OMISE_PUBLIC_KEY = pkey_live_xxx   (หรือ pkey_test_ ตอนทดสอบ)
   OMISE_SECRET_KEY = skey_live_xxx
   ```

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
