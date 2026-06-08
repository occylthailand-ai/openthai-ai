# 💳 Credit Ledger — Persistence Setup

ระบบเครดิต (รางวัล spin / streak ที่ใช้ generate เกินโควต้าฟรี) ทำงาน **2 โหมดอัตโนมัติ**:

| โหมด | เงื่อนไข | ความถาวร |
|---|---|---|
| 🗄️ **Supabase** | ตั้ง `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | ถาวร ข้าม instance/deploy ✅ |
| 📄 **File (fallback)** | ไม่ได้ตั้ง Supabase | ชั่วคราว (`/tmp` บน Vercel — หายเมื่อ instance รีไซเคิล) |

Backend เลือกโหมดเองตอนบูต — log: `[credits] ledger mode: Supabase|file`

---

## เปิดโหมด Supabase (แนะนำสำหรับ production)

### 1. สร้างตาราง
เปิด Supabase → **SQL Editor** → รันไฟล์ [`backend/migrations/credits-schema.sql`](../backend/migrations/credits-schema.sql)

### 2. ตั้ง env บน Vercel
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>   # Settings → API → service_role (secret)
```
> ใช้ **service_role** key (ไม่ใช่ anon) เพราะ backend bypass RLS. อย่าใส่ key นี้ฝั่ง frontend

### 3. redeploy
หลัง deploy เครดิตจะถูกอ่าน/เขียนที่ Supabase อัตโนมัติ — ทดสอบ:
```
curl -s https://www.OpenThaiAi.com/api/credits -H "x-device-id: test123"
# → {"success":true,"mode":"supabase", ...}
```

---

## หมายเหตุ
- ถ้า Supabase ล่ม/เรียกไม่ได้ → ระบบ **fallback เป็นไฟล์อัตโนมัติ** (ไม่ทำให้ generate พัง)
- ตารางใช้ระบุตัวตนด้วย `id`: `e:<email>` (login) > `d:<device>` (anonymous) > `i:<ip>`
- ผู้ใช้ที่ login จะพกเครดิตข้ามอุปกรณ์ได้ (key by email)
