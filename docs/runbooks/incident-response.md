# Runbook: Incident Response — OpenThai AI

## ระดับ Severity

| Level | คำอธิบาย | เวลาตอบสนอง |
|-------|---------|------------|
| P0 | Production down ทั้งระบบ | ทันที |
| P1 | Feature หลักไม่ทำงาน (AI Generate) | 30 นาที |
| P2 | Feature รอง (Calendar, Trending) | 2 ชั่วโมง |
| P3 | UI bug เล็กน้อย | 24 ชั่วโมง |

---

## Scenario 1: เว็บไซต์ไม่เปิด (P0)

```
1. เช็ค https://www.openthai-ai.com/api/health
2. เช็ค Vercel Status: https://vercel-status.com
3. เช็ค GitHub Actions log ล่าสุด
4. ถ้า Vercel ปกติ → Redeploy ทันที: vercel --prod
5. แจ้ง LINE: @openthaiai
```

## Scenario 2: AI Generate ไม่ทำงาน (P1)

```
1. เช็ค /api/health → ai.claude_pct และ ai.gemini_pct
2. ถ้า claude_pct = 0 → ตรวจ ANTHROPIC_API_KEY ใน Vercel env
3. ถ้า gemini_pct = 0 → ตรวจ GEMINI_API_KEY
4. ถ้าทั้งคู่ = 0 → ระบบใช้ mock (แจ้ง user ชั่วคราว)
5. Check billing: https://console.anthropic.com/settings/billing
```

## Scenario 3: Login ไม่ได้ (P1)

```
1. เช็ค Supabase status: https://status.supabase.com
2. เช็ค JWT_SECRET ใน Vercel env ยังอยู่ไหม
3. เช็ค /api/auth/verify endpoint ตอบกลับอะไร
4. ถ้า Supabase down → แจ้ง user รอ
```

## Scenario 4: Payment ไม่ได้รับ (P1)

```
1. เช็ค LINE: @openthaiai ว่ามีสลิปเข้าไหม
2. ดู audit log: GET /api/admin/audit?action=PAYMENT
3. Confirm manual ผ่าน admin panel: /admin
4. อัปเดต plan ใน Supabase profiles table โดยตรง
```

## Scenario 5: Secret รั่วไหล (P0)

```
1. Revoke ทันทีใน provider dashboard
2. Generate ใหม่ + อัปเดต Vercel env + Redeploy
3. อ่าน security/secrets-rotation.md
4. บันทึก incident นี้ด้านล่าง
```

---

## Incident Log

| วันที่ | Severity | สาเหตุ | วิธีแก้ | ใช้เวลา |
|-------|---------|--------|--------|--------|
| - | - | ยังไม่มี incident | - | - |
