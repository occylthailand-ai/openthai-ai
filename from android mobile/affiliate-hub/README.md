# Affiliate Hub — Production Setup Guide

> Next.js 14 + Supabase + Omise + SCB Business API + Resend

---

## ภาพรวมระบบ

```
คนคลิกลิงก์ /api/track?ref=XXX
    ↓ บันทึก click + เซต cookie
ผู้ใช้ซื้อสินค้า → Omise รับชำระเงิน
    ↓ Omise webhook → /api/webhook/omise
บันทึก commission → ส่งอีเมลแจ้ง affiliate
    ↓
Affiliate กดถอนเงิน → /api/withdraw
    ↓ SCB API โอน PromptPay อัตโนมัติ
```

---

## ขั้นตอนการ Setup

### 1. สมัครบริการที่จำเป็น

| บริการ | ใช้ทำอะไร | ลิงก์สมัคร | ราคา |
|--------|-----------|-----------|------|
| **Supabase** | Database + Auth | [supabase.com](https://supabase.com) | ฟรี (tier ฟรี 500MB) |
| **Omise** | รับชำระเงิน | [omise.co](https://dashboard.omise.co) | 3.65% ต่อ transaction |
| **Resend** | ส่ง Email | [resend.com](https://resend.com) | ฟรี 3,000 emails/เดือน |
| **SCB Business** | โอน PromptPay | [developer.scb.co.th](https://developer.scb.co.th) | ค่าธรรมเนียมโอน |
| **Vercel** | Host Next.js | [vercel.com](https://vercel.com) | ฟรี (Hobby) |

---

### 2. Setup Supabase

```bash
# 1. ไปที่ https://supabase.com → New Project
# 2. ไปที่ SQL Editor
# 3. วางเนื้อหาจาก supabase/schema.sql แล้วกด Run
# 4. คัดลอก URL + Keys จาก Settings → API
```

---

### 3. Clone + Install

```bash
git clone https://github.com/yourname/affiliate-hub.git
cd affiliate-hub
npm install
```

---

### 4. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
# แก้ไขค่าทั้งหมดใน .env.local
```

ค่าที่ต้องใส่ขั้นต่ำ:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com

# Payment (ใช้ test keys ก่อน)
OMISE_PUBLIC_KEY=pkey_test_...
OMISE_SECRET_KEY=skey_test_...
OMISE_WEBHOOK_SECRET=...

# Internal secret (สร้างเองได้)
INTERNAL_API_SECRET=some-very-long-random-string-here

# SCB (ใส่ทีหลังเมื่อพร้อม)
SCB_API_KEY=...
SCB_API_SECRET=...
SCB_APP_ID=...
SCB_ACCOUNT_NO=...
```

---

### 5. รัน Development

```bash
npm run dev
# เปิด http://localhost:3000
```

---

### 6. ตั้งค่า Omise Webhook

```
1. ไปที่ Omise Dashboard → Webhooks
2. เพิ่ม: https://yourdomain.com/api/webhook/omise
3. เลือก Event: charge.complete
4. คัดลอก Webhook Secret → ใส่ใน .env OMISE_WEBHOOK_SECRET
```

---

### 7. ตั้งค่า Resend Domain

```
1. ไปที่ Resend → Domains → Add Domain
2. เพิ่ม DNS records ตามที่ระบุ
3. รอ verify (5-10 นาที)
4. อัปเดต EMAIL_FROM=noreply@yourdomain.com
```

---

### 8. SCB Business API (ถ้าพร้อม)

```
1. สมัครที่ https://developer.scb.co.th
2. สร้าง App → คัดลอก API Key + Secret
3. ขอเปิดใช้ API: Payment - Transfer to PromptPay
4. ต้องมีบัญชี SCB Business และ ยื่นเอกสาร
5. ใส่ค่าใน .env
```

> **หมายเหตุ:** ระหว่างรอ SCB API อนุมัติ ระบบจะบันทึก withdrawal request  
> และทีมงานสามารถ export แล้วโอนแบบ batch ได้

---

### 9. Deploy บน Vercel

```bash
npm install -g vercel
vercel --prod

# หรือ connect GitHub repo ที่ vercel.com
# แล้วใส่ Environment Variables ใน Vercel Dashboard
```

---

## การใช้งาน Affiliate Link

```
https://yourdomain.com/api/track?ref=REFCODE&redirect=https://yourdomain.com/product
```

เมื่อคนคลิกลิงก์นี้:
1. ระบบบันทึก click
2. เซต cookie `affiliate_ref=REFCODE` (อายุ 30 วัน)
3. Redirect ไปยัง product page

เมื่อมีการชำระเงิน (ผ่าน Omise):
```javascript
// ตอนสร้าง charge ต้องส่ง metadata
const charge = await omise.charges.create({
  amount:      100000,   // 1,000 บาท (สตางค์)
  currency:    "thb",
  source:      token,
  description: "OpenThai Pro",
  metadata: {
    affiliate_ref: req.cookies.get("affiliate_ref")?.value ?? "",
  },
});
```

---

## API Reference

### POST `/api/auth/register`
```json
{ "name": "สมชาย", "email": "user@email.com", "password": "123456" }
```

### GET `/api/auth/verify-email?token=xxx`
ลิงก์ยืนยันอีเมล (ส่งผ่าน email อัตโนมัติ)

### POST `/api/withdraw`
```json
{
  "method": "promptpay",
  "destination": "0812345678",
  "amount": 5000
}
```
Header: `Authorization: Bearer <supabase_access_token>`

### POST `/api/commission` (Internal)
```json
{
  "ref_code": "SOMCHAI99",
  "product": "OpenThai Pro",
  "order_amount": 1990,
  "secret": "your-internal-secret"
}
```

---

## Checklist ก่อน Launch

- [ ] รัน schema.sql ใน Supabase แล้ว
- [ ] ตั้งค่า .env ครบทุก key
- [ ] ทดสอบ register + email verification
- [ ] ทดสอบ Omise test payment
- [ ] ตั้งค่า Omise webhook
- [ ] ทดสอบถอนเงิน (SCB sandbox)
- [ ] เพิ่ม custom domain ใน Vercel
- [ ] เพิ่ม domain ใน Resend
- [ ] เปลี่ยน Omise จาก test → live keys
- [ ] เปลี่ยน SCB จาก sandbox → production

---

## Support

ติดต่อ: support@openthai.ai
