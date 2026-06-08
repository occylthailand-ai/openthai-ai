# 🤖 Operations & Automation — OpenThaiAi

ระบบอัตโนมัติ 24/7 ที่ดูแล production ให้เอง: **ทดสอบ → ตรวจจับ → กู้คืน → แจ้งเตือน**

---

## ภาพรวมระบบอัตโนมัติ

```
┌──────────────────────────────────────────────────────────────┐
│  🧪 CI — Tests & Build  (.github/workflows/test.yml)           │
│     ทริกเกอร์: ทุก push และทุก PR                              │
│     • frontend: vitest + production build                      │
│     • backend : syntax check + boot smoke (/api/health = 200)  │
│     • quality : สแกน hardcoded secret                          │
└──────────────────────────────────────────────────────────────┘
                          ↓  โค้ดที่ผ่านเท่านั้นเข้า main
┌──────────────────────────────────────────────────────────────┐
│  ❤️ Health Watch  (.github/workflows/health-watch.yml)  [DETECT]│
│     ทริกเกอร์: cron ทุก 10 นาที (24/7)                         │
│     • ping https://www.OpenThaiAi.com/api/health             │
│     • fail ถ้า HTTP != 200  /  เตือนถ้าช้า > 4000ms            │
└───────────────────────────────┬──────────────────────────────┘
                  ตรวจพบล่ม ─────┘
                          ↓  workflow_run trigger (อัตโนมัติ)
┌──────────────────────────────────────────────────────────────┐
│  🔧 Auto-Recovery  (.github/workflows/auto-recovery.yml)        │
│                                          [HEAL → ESCALATE]      │
│     • warm + retry /api/health 5 ครั้ง (backoff 12→60s)        │
│       → กู้คืน cold start / transient ได้เอง ✅                │
│     • กู้สำเร็จ → แจ้ง LINE "กู้คืนแล้ว"                        │
│     • กู้ไม่สำเร็จ → เปิด GitHub issue อัตโนมัติ + เตือน LINE 🚨│
└──────────────────────────────────────────────────────────────┘
```

---

## Workflows

| ไฟล์ | ทริกเกอร์ | หน้าที่ |
|---|---|---|
| `test.yml` | push / PR | จับ error ก่อนขึ้น production |
| `health-watch.yml` | cron ทุก 10 นาที | ตรวจ uptime production 24/7 |
| `auto-recovery.yml` | เมื่อ health-watch fail (+ กดมือได้) | กู้คืนเอง → เปิดเคส+เตือนถ้ากู้ไม่ได้ |
| `drive-report.yml` | cron ทุก 6 ชม. (+ กดมือได้) | รันเทส+health → เขียนผลเข้า Google Drive ([ตั้งค่า](docs/DRIVE_REPORTS_SETUP.md)) |

### การ deploy
Production deploy จัดการโดย **Vercel GitHub git integration** (auto-deploy เมื่อ push เข้า `main`) — ไม่ใช้ GitHub Actions deploy workflow

---

## Secrets / Env ที่เกี่ยวข้อง

| ชื่อ | จำเป็น? | ใช้ทำอะไร |
|---|---|---|
| `LINE_NOTIFY_TOKEN` | optional | ส่งแจ้งเตือน health/recovery เข้า LINE (ไม่ตั้งก็ได้ — workflow ยังเห็นสถานะใน Actions tab) |
| `GITHUB_TOKEN` | อัตโนมัติ | auto-recovery ใช้เปิด issue (มีให้ในตัว ไม่ต้องตั้ง) |
| `OMISE_PUBLIC_KEY` / `OMISE_SECRET_KEY` | สำหรับรับเงินจริง | ตั้งใน Vercel env — ถ้าไม่ตั้ง payment รันใน **mock mode** |
| `ADMIN_KEY` | สำหรับ admin ใน prod | gate `/api/payment/admin/summary` และ `/api/affiliate/list` (prod จะปฏิเสธถ้าไม่ตั้ง — ไม่ fallback ค่า default) |

---

## คู่มือเมื่อเกิดเหตุ (Runbook)

**เว็บล่ม / ช้า**
1. ระบบ **กู้คืนเองอัตโนมัติ** ก่อน (warm + retry) — รอ ~1-2 นาที
2. ถ้ากู้ไม่สำเร็จ จะมี **GitHub issue** ชื่อ `🚨 Production incident` เปิดอัตโนมัติ
3. เช็ค: Vercel dashboard → Deployments / Functions logs
4. เช็คตรง: `https://www.OpenThaiAi.com/api/health`

**อยากทดสอบ auto-recovery เอง**
- ไป GitHub → Actions → "🔧 Auto-Recovery" → **Run workflow**

**payment ยังไม่รับเงินจริง**
- ใส่ `OMISE_PUBLIC_KEY` + `OMISE_SECRET_KEY` ใน Vercel env → redeploy → สลับจาก mock เป็น live อัตโนมัติ

---

## ขอบเขต (ตรงไปตรงมา)

ระบบนี้อัตโนมัติเต็มที่ในส่วนที่ทำได้จริง — จับ error ทุกการเปลี่ยนแปลง, กู้คืน transient/cold-start เอง, และแจ้งเตือน+เปิดเคสปัญหาจริงทันทีโดยไม่มีหลุด

ส่วนที่ยังต้องคนตัดสินใจ: การแก้ bug โค้ดที่ซับซ้อนหรือ config ผิด — แต่จะถูก **ตรวจจับและแจ้งเตือนภายใน 10 นาทีเสมอ** ไม่มีปัญหาไหนเงียบหาย
