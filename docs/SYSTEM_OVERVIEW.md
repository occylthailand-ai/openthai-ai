# 🧭 OpenThaiAi — System Overview (Revenue & Marketing Engine)

ภาพรวมระบบหารายได้ + การตลาด ที่สร้างในเซสชันนี้ — ครบวงจร, ถูก ToS 100%, ทดสอบจริงทุกชั้น

> หลักการ: ระบบช่วยให้ "ทุกบาทที่ลูกค้าจ่าย เข้าบัญชีคุณถูกต้องอัตโนมัติ" และช่วยทำการตลาด/วัดผลได้ —
> แต่ **ไม่มีระบบไหนเสกลูกค้าหรือโพสต์แทนในช่องที่ไม่ได้เป็นเจ้าของได้** (ToS ห้ามบอทโพสต์)

---

## 🗺️ แผนผังระบบ (End-to-End)

```
[เพิ่มสินค้า /admin] ──► [Content Studio: แคปชั่น 3 ภาษา] ──► [Scheduler queue]
                                     │                              │ (Vercel Cron ทุก 15 นาที)
                                     │                              ▼
                            [Smart Model Router]          [/api/scheduler/process]
                          (เลือกโมเดลถูกสุด+คุมงบ)          ├─ LINE OA → broadcast อัตโนมัติ (ช่องคุณเอง)
                                                            └─ TikTok/FB/IG → "ready" รอกดโพสต์เอง
                                                                     │
[ลูกค้าคลิกลิงก์ ?ref=&utm_source=] ──► [/pay พร้อมเพย์] ──► [Omise webhook (signed)]
                                                                     │
                                       ┌─────────────────────────────┤
                                       ▼                             ▼
                            [เครดิตค่าคอม auto-tier]        [Attribution by source]
                            20% → 30% → 40%                clicks + sales + earned ต่อช่อง
                                       │
                                       ▼
                  [Leaderboard] · [ขอถอน → admin อนุมัติ → จ่ายเข้าพร้อมเพย์]
```

---

## 🧩 โมดูลหลัก

### 1. ขาย & รับเงิน (พร้อมเพย์)
| Endpoint | หน้าที่ |
|----------|---------|
| `POST /api/quickpay/create` | สร้าง PromptPay QR (ยอดกำหนดเอง, รับ `ref` + `source`) |
| `GET /api/payment/status/:id` | poll สถานะ (หน้า `/pay` ใช้ยืนยัน) |
| `POST /api/payment/webhook` | ยืนยันจาก Omise — **ตรวจลายเซ็น HMAC** (กันปลอม) |
| `POST /api/shop/checkout` | ซื้อสินค้าในคลัง + ตัดสต๊อก |

หน้า: `/pay` `/earn` (ศูนย์รายได้ + คลิป TikTok + สินค้าจริง)

### 2. Affiliate (gamified)
| Endpoint | หน้าที่ |
|----------|---------|
| `POST /api/affiliate/apply` | สมัคร → ref_code + คอม 20% |
| `POST /api/affiliate/click` | นับคลิก (+ `source` attribution) |
| `GET /api/affiliate/stats/:ref` | สถิติ + next_tier + clicks/sales/earned by source |
| `GET /api/affiliate/leaderboard` | จัดอันดับ (ปิดบังชื่อ) |
| `POST /api/affiliate/withdraw` | ขอถอนเข้าพร้อมเพย์ (ขั้นต่ำ ฿100) |
| `… /withdrawals/admin` (+`:id`) | admin: approve/reject/paid |
| `POST /api/track/link` | สร้างลิงก์ติดตาม (UTM + ref) |

**Tier อัตโนมัติ:** starter 20% (0–9) → pro 30% (10–49) → elite 40% (50+) — เลื่อนเองตอนปิดดีล
หน้า: `/affiliate` `/affiliate/dashboard` `/leaderboard` `/affiliate-programs` (57 โปรแกรม)

### 3. การตลาด (ToS-compliant)
| Endpoint | หน้าที่ |
|----------|---------|
| `POST /api/captions/generate` | แคปชั่นต่อแพลตฟอร์ม 3 ภาษา (th/en/zh) |
| `POST /api/scheduler/create` | เพิ่มคิวโพสต์ (เก็บไฟล์ถาวร) |
| `GET /api/scheduler/due` | โพสต์ที่ถึงเวลา |
| `GET\|POST /api/scheduler/process` | LINE broadcast / mark ready (Vercel Cron ยิง GET) |

หน้า: `/content-studio` `/scheduler`
**สำคัญ:** ไม่มี AutoPoster ยิง TikTok/FB/IG (ToS ห้าม) — สร้างแคปชั่น+ตั้งเวลา แล้วคุณกดโพสต์เอง; เฉพาะ LINE OA (ช่องคุณเอง) broadcast อัตโนมัติ

### 4. Infra
| Endpoint | หน้าที่ |
|----------|---------|
| `GET /api/router/status` · `POST /api/router/run` | Smart Model Router: เลือกถูกสุด + failover + คุมงบ/วัน (Eco Mode) |
| `POST /api/council` | OpenThaiAi Council — Claude+Gemini+Grok วิเคราะห์ + สังเคราะห์ |
| `GET /api/system/readiness` | เช็คความพร้อม (Omise/Supabase/Admin) |

หน้า: `/router` `/council`

### 5. Admin (`/admin`, ต้องมี ADMIN_KEY)
คลังสินค้า · affiliate + **คำขอถอนเงิน** · **คิว Scheduler** (แท็บ content) · ออเดอร์ · leads

---

## 🔑 Environment Variables (ตั้งใน Vercel)

| ตัวแปร | จำเป็น | ใช้ทำอะไร |
|--------|:------:|-----------|
| `OMISE_SECRET_KEY` | ✅ | สร้าง QR + ตรวจสถานะ (ไม่ตั้ง = mock mode ไม่ตัดเงินจริง) |
| `OMISE_PUBLIC_KEY` | บัตร | tokenize บัตร |
| `OMISE_WEBHOOK_SECRET` | แนะนำ | ยืนยัน webhook (ตั้ง URL `…/api/payment/webhook` ใน Omise) |
| `ADMIN_KEY` | ✅ | ป้องกันหน้า/endpoint admin |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `XAI_API_KEY` | — | เปิด AI จริงใน Router/Council/Captions (ไม่ตั้ง = mock) |
| `AI_DAILY_BUDGET_USD` | — | เพดานงบ token/วัน → เกิน = Eco Mode (default 1.0) |
| `LINE_CHANNEL_TOKEN` | — | เปิด LINE OA broadcast อัตโนมัติ |
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | — | เก็บข้อมูลถาวร (ไม่ตั้ง = ไฟล์ชั่วคราว) |

ดูขั้นตอนตั้ง Omise: [`docs/OMISE_SETUP.md`](./OMISE_SETUP.md) · go-live: [`docs/GO_LIVE.md`](./GO_LIVE.md)

---

## 🔬 การทดสอบ

```bash
cd backend
OMISE_WEBHOOK_SECRET=testsecret ADMIN_KEY=testadmin npm start   # terminal 1
npm run test:revenue       # terminal 2 — E2E รวมระบบ (26 เคส)
npm run test:affiliate     # E2E affiliate flow (22 เคส)
```

ครอบ: captions · router · council · attribution (clicks/sales by source) · tier · leaderboard · withdrawals · scheduler · webhook signature guard

---

## ⚠️ ขอบเขตที่ระบบ "ไม่ทำ" (โดยตั้งใจ)
- ❌ บอทโพสต์อัตโนมัติเข้า TikTok/FB/IG/Shopee — ละเมิด ToS, เสี่ยงแบนถาวร
- ❌ เครื่องมือหลบ shadowban / spintax หลบระบบตรวจบอท
- ❌ การันตี "เงินเข้าเองโดยไม่มีลูกค้า" หรือ "AI โพสต์แทน 24/7"

สิ่งที่ทำได้จริง: เตรียมคอนเทนต์/ตั้งเวลา/วัดผล + LINE OA broadcast (ช่องคุณเอง) + รับเงิน/เครดิตค่าคอมอัตโนมัติ 24/7 บน cloud — ส่วน "โพสต์จริงบนช่องอื่น + ลูกค้าจ่ายจริง" ยังต้องมาจากคุณ
