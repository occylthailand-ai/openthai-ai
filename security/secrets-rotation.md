# Secret Rotation Policy — OpenThai AI

## ตารางหมุนเวียน

| Secret | ระยะเวลา | วิธีทำ |
|--------|---------|--------|
| JWT_SECRET | 180 วัน | Generate ใหม่ + อัปเดต Vercel env + redeploy |
| ANTHROPIC_API_KEY | 90 วัน | ออก key ใหม่ใน console.anthropic.com ก่อน revoke เก่า |
| GEMINI_API_KEY | 90 วัน | Google Cloud Console → API Keys |
| SUPABASE_SERVICE_KEY | 180 วัน | Supabase Dashboard → Settings → API |
| ADMIN_KEY | 90 วัน | สร้างใหม่ + แจ้งทีมงาน |
| SMTP_PASS | 365 วัน | Gmail → App Passwords → Revoke + Create |
| SLACK_WEBHOOK_URL | 180 วัน | Slack → Manage Apps → Incoming Webhooks → Regenerate |

> **หมายเหตุ:** ตั้ง GitHub Actions reminder หรือ calendar alert ก่อนวันหมดอายุ 7 วัน

## ขั้นตอนการหมุนเวียน (Zero Downtime)

1. **สร้าง secret ใหม่** — อย่าลบเก่าก่อน
2. **อัปเดต Vercel** → Settings → Environment Variables
3. **Redeploy** → Vercel Dashboard → Deployments → Redeploy
4. **ทดสอบ** → เรียก `/api/health` ให้ผ่านก่อน
5. **Revoke เก่า** — หลังจาก deploy ใหม่ทำงานได้แล้วเท่านั้น
6. **บันทึก** ใน audit log ด้วยตนเอง

## วันที่หมุนเวียนล่าสุด

| Secret | วันที่ล่าสุด | วันที่ควรทำครั้งถัดไป |
|--------|------------|---------------------|
| JWT_SECRET | 2026-05-11 | 2026-11-11 |
| ANTHROPIC_API_KEY | 2026-05-14 | 2026-08-14 |
| GEMINI_API_KEY | 2026-05-14 | 2026-08-14 |
| SUPABASE_SERVICE_KEY | 2026-05-11 | 2026-11-11 |
| ADMIN_KEY | 2026-05-11 | 2026-08-11 |
| SMTP_PASS | 2026-05-11 | 2027-05-11 |
| SLACK_WEBHOOK_URL | 2026-05-14 | 2026-11-14 |

## กรณีฉุกเฉิน (Secret รั่วไหล)

1. Revoke ทันทีใน provider dashboard
2. Generate ใหม่ + อัปเดต Vercel ทันที
3. บันทึก incident ใน `docs/runbooks/incident-response.md`
4. แจ้งผู้ใช้ถ้ามีผลกระทบ
