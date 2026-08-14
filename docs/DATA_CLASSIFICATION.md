# OpenThaiAi — Data Classification Framework

> สร้างโดย `scripts/data-classification.mjs` — **อย่าแก้ไฟล์นี้ด้วยมือ** ทุกฟิลด์ถูก verify
> ว่ามีอยู่จริงในซอร์สโค้ด (สคริปต์ exit non-zero ถ้า field ไหนหลุดหาย) เพื่อไม่ให้เอกสาร
> จำแนกข้อมูลนี้ drift จากของจริง — แนวทางเดียวกับ `PROJECT_STATUS.md`.
>
> Generated: 2026-07-11T11:26:44.969Z

จำแนกฟิลด์ข้อมูลจริงในระบบตามประเภทข้อมูล 2 แกน: **Scale** (Quantitative/Qualitative) ×
**Level** (Nominal/Ordinal/Discrete/Continuous) พร้อมบทบาทต่อการตัดสินใจ (Decision-Making).

### Quantitative · Continuous

| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `revenue_thb` | Quantitative | Continuous (ต่อเนื่อง) | `backend/progress-tracker.js` | Σ orders.amount (฿), target ฿100,000 | รายได้จริงเทียบเป้า MVP ใน Progress Dashboard |
| `latency_ms` | Quantitative | Continuous (ต่อเนื่อง) | `backend/progress-tracker.js` | ≤ 500 ms (target) | KPI ประสิทธิภาพระบบ — ใช้ตั้ง alert เมื่อช้าเกินเกณฑ์ |
| `model_accuracy` | Quantitative | Continuous (ต่อเนื่อง) | `backend/progress-tracker.js` | 95 (target %) | KPI คุณภาพโมเดล |
| `criticScore` | Quantitative | Continuous (ต่อเนื่อง) | `backend/server.js` | 0.0–10.0 | คะแนนคุณภาพคอนเทนต์ที่ AI ให้ตัวเอง — คัด A/B และปรับ prompt |
| `costPer1k` | Quantitative | Continuous (ต่อเนื่อง) | `backend/server.js` | gemini 0.0004 · grok 0.0005 · claude 0.0008 (USD/1k tok) | ต้นทุนต่อโมเดล — LLM Router เรียงถูก→แพง |
| `AI_DAILY_BUDGET_USD` | Quantitative | Continuous (ต่อเนื่อง) | `backend/server.js` | 1.0 (USD/วัน) | เพดานงบ/วัน — เกินแล้ว Router เด้งเข้า Eco Mode |

### Quantitative · Discrete

| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `ai_calls_today` | Quantitative | Discrete (นับ/จำนวนเต็ม) | `backend/progress-tracker.js` | 50 (target) | จำนวนครั้งเรียก AI/วัน — วัด engagement + คุมต้นทุน |
| `orders_total` | Quantitative | Discrete (นับ/จำนวนเต็ม) | `backend/progress-tracker.js` | นับจาก orders.list() | จำนวนคำสั่งซื้อ — ตัวหารของ revenue |

### Qualitative

| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `caption` | Qualitative | Nominal (กลุ่ม ไม่มีลำดับ) | `backend/server.js` | "✨ สินค้าไทยแท้…" | ข้อความโฆษณาที่สร้าง — ประเมิน Content Quality เชิงคุณภาพ |
| `hashtags` | Qualitative | Nominal (กลุ่ม ไม่มีลำดับ) | `backend/server.js` | ['#OTOP','#สินค้าไทย',…] | ชุดแท็ก — จัดกลุ่ม/วิเคราะห์ธีมคอนเทนต์ (ไม่มีลำดับ) |

### Nominal (กลุ่ม ไม่มีลำดับ)

| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `platform` | Qualitative | Nominal (กลุ่ม ไม่มีลำดับ) | `backend/server.js` | 'TikTok' (default), Shopee, Lazada | แพลตฟอร์มปลายทาง — User Segmentation |
| `ROUTER_PROVIDERS` | Qualitative | Nominal (กลุ่ม ไม่มีลำดับ) | `backend/server.js` | claude · gemini · grok | ค่าย AI (ของจริงมี 3 ค่าย) — กระจาย workload |
| `privacy_level` | Qualitative | Nominal (กลุ่ม ไม่มีลำดับ) | `backend/server.js` | 'PUBLIC_TO_EVERYONE' | ค่าคงที่ TikTok publish visibility (ไม่ใช่ตัวถ่วงน้ำหนัก Router) |

### Ordinal (กลุ่ม มีลำดับ)

| Field | Scale | Level | Source | ตัวอย่าง | บทบาทต่อการวิเคราะห์/ตัดสินใจ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `ROUTER_TIERS` | Qualitative | Ordinal (กลุ่ม มีลำดับ) | `backend/server.js` | heavy › bulk › eco | ระดับคุณภาพ→ประหยัดของ Router (มีลำดับ) — เลือก tier ตามงบ/งาน |

### ⚠️ ฟิลด์ที่ถูกเสนอมาแต่ **ไม่มีจริงในโค้ด** (verified absent)

บันทึกไว้ตามหลัก DECISIONS_LOG — เพื่อไม่ให้ถูกนำไปสร้างงานต่อโดยเข้าใจผิดว่ามีอยู่:

| Token | เหตุผล |
| :-- | :-- |
| `est_margin_pct` | อ้างเป็น Continuous margin — ไม่มีในโค้ด (ต้นทุน/มาร์จินสินค้าไม่ได้ถูกเก็บแบบนี้) |
| `cost_thb` | อ้างเป็นต้นทุนสินค้า — ไม่มี (ฟิลด์ต้นทุนจริงคือ costPer1k ของโมเดล AI) |
| `fairnessScore` | ไม่มีเมตริกนี้ในระบบ |
| `journey_progress` | ไม่มี field นี้ |
| `local-llama` | ไม่ใช่ provider จริง — Router มีแค่ claude/gemini/grok |
| `mistral` | ไม่ใช่ provider จริง |
| `competition_level` | ไม่มี field นี้ — มีแค่ข้อความ insight คำว่า "competition" แบบอิสระ |
