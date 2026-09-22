# Dashboard สุขภาพธุรกิจ MVP — สเปกฉบับสมบูรณ์

**เอกสารนี้:** `docs/dashboard-mvp.md`
**สถานะใน Backlog:** งาน 2.4 — กลุ่ม Data/Analytics
**เสิร์ฟกลุ่มไหน:** กลุ่มที่ 3 (แพลตฟอร์ม) — ทีม Operations ของ OpenThai.ai เอง
**ข้อมูล ณ วันที่:** 6 สิงหาคม 2569
**อ้างอิงเอกสาร:** `MVP-AI-Income-Starter.md` (v2.0), `ปรากฏการณ์-OpenThaiAi.md` (บทที่ 4.3), `CLAUDE.md`

---

## 1. หลักการออกแบบ

### 1.1 เหตุผลที่เลือก 5 ตัวชี้วัดนี้ (ไม่ใช่ตัวอื่น)

Dashboard MVP ต้องเริ่มต้นด้วยคำถามว่า "ทีม Operations ต้องตัดสินใจอะไรในแต่ละวัน" ไม่ใช่ "อยากรู้อะไร"

ตัวชี้วัดที่คัดมา 5 ตัวนี้ ล้วนตอบคำถาม 5 ข้อที่ทีมต้องรู้ก่อนอื่น:

| คำถามที่ต้องตัดสินใจ | ตัวชี้วัดที่ตอบ |
|---|---|
| ผู้ใช้ยังอยู่ไหม — ใครใช้จริงบ้าง | MAU แยกตาม 6 กลุ่ม |
| เงินที่ไหลผ่านแพลตฟอร์มเป็นเท่าไร | Transaction Volume |
| AI ทำงานแทนคนได้จริงตาม promise ไหม | AI Query Success Rate |
| คุณภาพคำตอบดีพอไหม — ผู้ใช้วางใจได้ไหม | Response Quality Score |
| ระบบ Affiliate ถูกกฎหมายอยู่ไหม | Affiliate Payout Accuracy |

ตัวชี้วัดที่ตัดออก เช่น จำนวนผู้สมัคร (Signups), จำนวน Page Views, จำนวน AI ที่ generate ได้ต่อวัน — ถูกตัดออกเพราะเพิ่มขึ้นได้โดยไม่มีมูลค่าจริง และไม่นำไปสู่การตัดสินใจที่แตกต่าง

### 1.2 Vanity Metrics vs. Actionable Metrics

| ประเภท | ลักษณะ | ตัวอย่างที่ตัดออก |
|---|---|---|
| **Vanity Metrics** | ตัวเลขเพิ่มขึ้นได้เสมอโดยไม่สะท้อนคุณค่าจริง — ดูดีในรายงาน แต่ไม่บอกว่าต้องทำอะไร | จำนวน Signup รวม, จำนวน Content ที่ AI สร้าง, จำนวนหน้าที่มีผู้เยี่ยมชม |
| **Actionable Metrics** | ตัวเลขที่เปลี่ยนแปลงแล้วทีมต้องทำอะไรบางอย่างทันที — มีเกณฑ์ชัดว่าเมื่อเลขตกถึงเส้นนี้ ต้องทำสิ่งนี้ | MAU, Transaction Volume, AI Query Success Rate, Quality Score, Payout Accuracy |

กฎ: ถ้าตัวเลขลดลง 30% แต่ทีมไม่รู้ว่าต้องทำอะไร — ตัวเลขนั้นคือ Vanity Metric

### 1.3 หลัก "ตัวเลขที่แสดงต้องมีที่มา วันที่ และวิธีวัด"

ทุก KPI Card บน Dashboard ต้องแสดงข้อมูลต่อไปนี้ควบคู่กันเสมอ:

- **ค่าตัวเลข** — ตัวเลขปัจจุบัน
- **ช่วงเวลา** — "7 วันที่ผ่านมา", "เดือนนี้ (1–6 ส.ค. 69)" — ห้ามแสดงแค่ตัวเลขโดด
- **อัปเดตล่าสุด** — timestamp ครั้งล่าสุดที่ query วิ่ง
- **ลิงก์ Query ต้นทาง** — ไปยัง data lineage หรือ SQL query (เฉพาะทีม Ops)
- **สิ่งที่ตัวเลขนี้บอกไม่ได้** — เขียนไว้ใต้ Card เสมอ (ดูหัวข้อ 2)

---

## 2. ตัวชี้วัด 5 ตัว (KPI Cards)

---

### KPI-01: MAU — Monthly Active Users แยกตาม 6 กลุ่ม

**นิยาม:** จำนวนผู้ใช้ที่มี session ที่สำเร็จอย่างน้อย 1 ครั้งในรอบ 30 วันย้อนหลังนับจากวันที่แสดงผล แยกตาม 6 กลุ่มผู้ใช้ที่กำหนดไว้ใน `CLAUDE.md`

**สูตรคำนวณ:**
```sql
-- MAU รวม
SELECT COUNT(DISTINCT user_id) AS mau_total
FROM user_sessions
WHERE session_started_at >= NOW() - INTERVAL '30 days'
  AND session_status = 'completed';

-- MAU แยกกลุ่ม
SELECT user_group, COUNT(DISTINCT user_id) AS mau_by_group
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE session_started_at >= NOW() - INTERVAL '30 days'
  AND session_status = 'completed'
GROUP BY user_group;
```

**ทำไมตัวนี้สำคัญสำหรับ MVP:** MVP ของ AI-Income-Starter ตั้งเป้า Activation > 60% ภายใน 7 วัน — MAU บอกว่าใครที่ "ผ่าน Onboarding แล้วยังกลับมา" ซึ่งต่างจากผู้ที่สมัครแล้วหายไป การแยกตาม 6 กลุ่มช่วยให้รู้ว่าโมเดลธุรกิจรับใช้ใครได้จริง

**แหล่งข้อมูล:** Table `user_sessions` + `users` ใน Supabase/Postgres (ดูหัวข้อ 4)

**ความถี่อัปเดต:** Daily refresh ทุก 00:30 น. (rolling 30 วัน)

**เกณฑ์สีสัญญาณ (เกณฑ์เริ่มต้น — ต้องปรับหลังมีข้อมูลจริง 90 วัน):**

| สี | เงื่อนไข |
|---|---|
| เขียว | MAU รายสัปดาห์ทรงตัวหรือเพิ่มขึ้นเทียบสัปดาห์ก่อน |
| เหลือง | MAU ลดลง 10–20% เทียบสัปดาห์ก่อน |
| แดง | MAU ลดลง > 20% เทียบสัปดาห์ก่อน หรือกลุ่มใดกลุ่มหนึ่งหายไปทั้งหมด |

**การแจ้งเตือน:** Alert ไปยัง Operations Lead และ Platform Agent ทันทีที่ MAU ตกเกณฑ์แดง ผ่าน n8n webhook → Slack/LINE

**สิ่งที่ตัวเลขนี้บอกไม่ได้:** MAU ไม่บอกว่าผู้ใช้ทำอะไรใน session นั้น — ผู้ใช้ login แล้วออกใน 5 วินาทีก็นับ ต้องดู Engagement metrics ร่วมด้วยใน Phase 2

---

### KPI-02: Transaction Volume — มูลค่าธุรกรรมรายเดือน (บาท)

**นิยาม:** ผลรวมของ `revenue_thb` ทั้งหมดจาก sales_logs ที่มีสถานะ `completed` ในรอบเดือนปัจจุบัน แยกตาม platform (Shopee, TikTok Shop, Lazada) และแยกตาม ประเภท (Dropship vs. Affiliate)

**สูตรคำนวณ:**
```sql
-- Volume รวมเดือนนี้
SELECT
  DATE_TRUNC('month', occurred_at) AS month,
  platform,
  SUM(revenue_thb)                 AS total_revenue_thb,
  SUM(revenue_thb - cost_thb)      AS total_gross_profit_thb,
  COUNT(*)                         AS transaction_count
FROM sales_logs
WHERE status = 'completed'
  AND occurred_at >= DATE_TRUNC('month', NOW())
GROUP BY 1, 2
ORDER BY 1, 2;
```

**ทำไมตัวนี้สำคัญสำหรับ MVP:** เป็นตัวเลขหลักที่บอกว่าแพลตฟอร์มสร้างมูลค่าเศรษฐกิจได้จริงไหม รองรับการตรวจสอบอัตราส่วนสำคัญในภายหลัง เช่น Gross Margin, ต้นทุนต่อธุรกรรม ฯลฯ การแยกตาม platform ช่วย prioritize ว่าควรลงทุนพัฒนา connector ไหนก่อน

**แหล่งข้อมูล:** Table `sales_logs` ใน Supabase/Postgres

**ความถี่อัปเดต:** Daily refresh ทุก 01:00 น.

**เกณฑ์สีสัญญาณ (เกณฑ์เริ่มต้น — ต้องปรับหลังมีข้อมูลจริง 90 วัน):**

| สี | เงื่อนไข |
|---|---|
| เขียว | Month-over-Month growth ≥ 0% และ Gross Margin อยู่ในช่วง 15–35% |
| เหลือง | Month-over-Month ลดลง 1–15% หรือ Gross Margin ต่ำกว่า 15% |
| แดง | Month-over-Month ลดลง > 15% หรือ Gross Margin ติดลบ |

**การแจ้งเตือน:** Alert ทีม Operations ทันทีที่ Gross Margin ต่ำกว่า 15% ต่อเนื่อง 3 วัน

**สิ่งที่ตัวเลขนี้บอกไม่ได้:** Transaction Volume ไม่บอกว่ารายได้ที่ผู้ใช้ (คนที่ขาย) ได้รับนั้นยั่งยืนหรือไม่ — ยอดอาจพุ่งจากโปรโมชั่นสั้น ๆ แล้วตก ต้องดูควบคู่กับ Retention ของ seller

---

### KPI-03: AI Query Success Rate — อัตราสำเร็จของ AI

**นิยาม:** สัดส่วนของคำขอ (query) ที่ AI ตอบสำเร็จโดยไม่ต้อง fallback ไปหาทีม Human Support ใน session เดียวกัน คิดเป็น %

**สูตรคำนวณ:**
```
AI Query Success Rate (%) =
  (จำนวน query ที่ resolution_type = 'ai_resolved') /
  (จำนวน query ทั้งหมด) × 100

"ai_resolved" = AI ส่งคำตอบภายใน timeout ที่กำหนด
              + ไม่มี error code (5xx, timeout, content_filtered)
              + ผู้ใช้ไม่กดปุ่ม "ขอคุยกับทีมงาน" ภายใน 30 วินาทีหลังรับคำตอบ
```

```sql
SELECT
  DATE_TRUNC('hour', created_at)                          AS hour_bucket,
  COUNT(*)                                                  AS total_queries,
  COUNT(*) FILTER (WHERE resolution_type = 'ai_resolved')   AS ai_resolved,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE resolution_type = 'ai_resolved') / COUNT(*),
    2
  )                                                         AS success_rate_pct
FROM ai_query_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;
```

**ทำไมตัวนี้สำคัญสำหรับ MVP:** `MVP-AI-Income-Starter.md` ให้ค่าไว้ชัดเจนว่า "AI ทำแทน 80–90%" — ตัวชี้วัดนี้คือการพิสูจน์ว่า promise นั้นเป็นจริงหรือยัง หาก Success Rate ต่ำกว่า 80% แสดงว่าภาระงานตกไปอยู่กับทีม Human Support ซึ่งเพิ่ม OpEx และทำลาย unit economics

**แหล่งข้อมูล:** Table `ai_query_logs` (ต้องสร้างใหม่ — ดูหัวข้อ 4)

**ความถี่อัปเดต:** Realtime — aggregate ทุก 15 นาที แสดงเป็น rolling 24h และ rolling 7d

**เกณฑ์สีสัญญาณ (เกณฑ์เริ่มต้น — ต้องปรับหลังมีข้อมูลจริง 90 วัน):**

| สี | เงื่อนไข |
|---|---|
| เขียว | ≥ 80% ต่อเนื่อง |
| เหลือง | 70–79.99% |
| แดง | < 70% หรือ error rate > 5% ใน 1 ชั่วโมง |

**การแจ้งเตือน:** Alert ทีม AI/ML Engineer และ DevOps ทันทีที่ Success Rate ต่ำกว่า 70% ต่อเนื่อง 2 ช่วง 15 นาที หรือมี error spike > 10% ใน 15 นาที

**สิ่งที่ตัวเลขนี้บอกไม่ได้:** Success Rate บอกแค่ว่า AI "ตอบออก" — ไม่ได้บอกว่าตอบ "ถูก" หรือ "มีประโยชน์" ต้องดูควบคู่กับ KPI-04 (Quality Score) เสมอ

---

### KPI-04: Response Quality Score — คะแนนคุณภาพคำตอบ

**นิยาม:** คะแนนเฉลี่ยของคุณภาพคำตอบจาก AI ในช่วง 7 วันย้อนหลัง คำนวณจาก 3 แหล่งรวมกัน (weighted average)

**สูตรคำนวณ:**
```
Quality Score (0–100) =
  (User Rating Score × 0.40)
  + (Automated Eval Score × 0.40)
  + (Human Spot Check Score × 0.20)

แหล่งที่ 1 — User Rating Score (น้ำหนัก 40%):
  thumbs_up / (thumbs_up + thumbs_down) × 100
  [จาก response_quality_ratings ที่ rating_type = 'user_feedback']

แหล่งที่ 2 — Automated Eval Score (น้ำหนัก 40%):
  คะแนนเฉลี่ยจาก eval pipeline อัตโนมัติ ตรวจ 3 มิติ:
    - Groundedness (ตอบอิงข้อมูลจริง ไม่หลอน): 0–100
    - Coherence (ตอบต่อเนื่องสอดคล้อง): 0–100
    - Task Completion (ตอบตรงสิ่งที่ถาม): 0–100
  [จาก ai_query_logs ที่ automated_eval_score ไม่เป็น NULL]

แหล่งที่ 3 — Human Spot Check Score (น้ำหนัก 20%):
  ทีม QA ทำ spot check แบบ random sample สัปดาห์ละครั้ง
  ให้คะแนน 0–100 ต่อ query sample
  [จาก response_quality_ratings ที่ rating_type = 'human_review']
```

```sql
SELECT
  DATE_TRUNC('day', rated_at)  AS rating_date,
  rating_type,
  AVG(score)                   AS avg_score,
  COUNT(*)                     AS sample_size
FROM response_quality_ratings
WHERE rated_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

**ทำไมตัวนี้สำคัญสำหรับ MVP:** OpenThai.ai ยึดหลัก "Thai-First" และเป็นเรื่องของความไว้ใจ — ผู้ใช้ที่ได้คำตอบผิดในเรื่องกฎหมาย ภาษี หรือการเงิน อาจเสียหายจริง Quality Score คือตัวชี้วัดที่วัดว่าระบบ Guardrails และโมเดลทำงานได้ดีแค่ไหน และช่วยตัดสินใจว่าต้องไปปรับ prompt, RAG, หรือ Guardrails ตรงไหน

**แหล่งข้อมูล:** Table `response_quality_ratings` + `ai_query_logs` (ต้องสร้างใหม่ — ดูหัวข้อ 4)

**ความถี่อัปเดต:** Daily — อัปเดตทุก 06:00 น. (rolling 7d average)

**เกณฑ์สีสัญญาณ (เกณฑ์เริ่มต้น — ต้องปรับหลังมีข้อมูลจริง 90 วัน):**

| สี | เงื่อนไข |
|---|---|
| เขียว | คะแนนเฉลี่ย ≥ 75/100 |
| เหลือง | 60–74.99/100 |
| แดง | < 60/100 หรือ Human Spot Check พบ hallucination ในสาขาวิชาชีพ |

**การแจ้งเตือน:** Alert ทีม AI/ML Engineer ทันทีที่คะแนนต่ำกว่า 60 ต่อเนื่อง 3 วัน หรือ Human Spot Check พบ hallucination ที่อาจสร้างความเสียหายจริง (กฎหมาย การแพทย์ การเงิน)

**สิ่งที่ตัวเลขนี้บอกไม่ได้:** Quality Score จากผู้ใช้อาจ bias เพราะคนที่พอใจ rate มากกว่าคนไม่พอใจ — Human Spot Check จึงมีน้ำหนัก 20% เพื่อถ่วงดุล แต่ขึ้นอยู่กับ bandwidth ทีม QA ด้วย

---

### KPI-05: Affiliate Payout Accuracy — ความถูกต้องของการจ่าย Affiliate

**นิยาม:** สัดส่วนของรายการจ่าย Affiliate ที่ผ่านการตรวจสอบว่าถูกต้องตาม Non-MLM Rules ทั้ง 3 ข้อ คิดเป็น %

**Non-MLM Rules ที่ต้องตรวจทุกรายการ (อ้างอิงจาก `CLAUDE.md` ข้อ 5):**
1. จ่ายจากยอดขายจริงเท่านั้น — ห้ามจ่ายจากค่าสมัครของคนที่ referral ชวนมา
2. ความลึก Affiliate ต้องไม่เกิน 2 ชั้น
3. ไม่มีรายการที่ต้นทางไม่ใช่ยอดขาย (source ต้องเป็น `sales_logs.id` ที่มีอยู่จริง)

**สูตรคำนวณ:**
```
Affiliate Payout Accuracy (%) =
  (จำนวนรายการที่ผ่านตรวจ Rule 1 + Rule 2 + Rule 3 ครบ) /
  (จำนวนรายการที่ต้องจ่ายในรอบนั้น) × 100

หมายเหตุ: 100% = ไม่มีรายการที่ผิดกติกาแม้แต่รายการเดียว
```

```sql
-- ตรวจ Rule 1: ต้นทางต้องเป็น sales_log ที่มีอยู่จริง
SELECT ap.id, ap.amount_thb, ap.source_sale_id,
  CASE WHEN sl.id IS NOT NULL THEN 'pass' ELSE 'FAIL_no_sale_source' END AS rule1_status
FROM affiliate_payouts ap
LEFT JOIN sales_logs sl ON ap.source_sale_id = sl.id AND sl.status = 'completed'
WHERE ap.payout_period = '2026-08';

-- ตรวจ Rule 2: ความลึกต้องไม่เกิน 2 ชั้น
SELECT id, referral_depth,
  CASE WHEN referral_depth <= 2 THEN 'pass' ELSE 'FAIL_depth_exceeded' END AS rule2_status
FROM affiliate_payouts
WHERE payout_period = '2026-08';

-- ตรวจ Rule 3: ห้ามจ่ายจากค่าสมัคร
SELECT id, source_type,
  CASE WHEN source_type = 'sale' THEN 'pass' ELSE 'FAIL_non_sale_source' END AS rule3_status
FROM affiliate_payouts
WHERE payout_period = '2026-08';
```

**ทำไมตัวนี้สำคัญสำหรับ MVP:** Non-MLM เป็น "กฎเหล็ก" ใน `CLAUDE.md` — ถ้า Payout ผิดพลาดแม้ครั้งเดียว อาจสร้างความเสียหายทางกฎหมายและความเชื่อมั่น ตัวชี้วัดนี้เป็น compliance gate ไม่ใช่ business metric ทั่วไป — ไม่มีเกณฑ์ "ยอมรับได้บางส่วน"

**แหล่งข้อมูล:** Table `affiliate_payouts` + `sales_logs` (ต้องสร้างใหม่บางส่วน — ดูหัวข้อ 4)

**ความถี่อัปเดต:** Weekly (ทุกรอบจ่าย) + Daily verification run เพื่อตรวจก่อนจ่ายจริง

**เกณฑ์สีสัญญาณ:**

| สี | เงื่อนไข | หมายเหตุ |
|---|---|---|
| เขียว | 100% — ทุกรายการผ่านตรวจ 3 rules ครบ | เป้าหมายเดียวที่ยอมรับได้ |
| เหลือง | 98–99.99% — มีรายการผิดพลาดที่แก้ไขได้ก่อนจ่าย | ต้องหยุดจ่ายจนแก้ครบ |
| แดง | < 98% หรือพบรายการผิด Rule ใด ๆ | หยุดรอบจ่ายทันที แจ้ง Legal |

**การแจ้งเตือน:** ทันทีที่พบ rule violation แม้ 1 รายการ — Alert ไปยัง Legal Compliance Agent, Operations Lead, และ Mythos (Founder) ผ่าน priority channel

**สิ่งที่ตัวเลขนี้บอกไม่ได้:** Accuracy 100% บอกแค่ว่ากระบวนการถูกต้องตามกติกา Non-MLM — ไม่ได้บอกว่าโครงสร้าง Affiliate นั้นดึงดูดคนที่ใช่หรือสร้าง incentive ที่ดีหรือไม่

---

## 3. Layout และ UX ของ Dashboard

### 3.1 Wireframe (Text Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│  OpenThai.ai — Operations Dashboard          ข้อมูล ณ: 6 ส.ค. 2569 │
│  [กรองเวลา: 7d | 30d | MTD | 90d]           อัปเดตล่าสุด: 00:30 น.  │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 1 — สุขภาพหลัก (3 Card)                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│  │  KPI-03         │ │  KPI-04         │ │  KPI-05         │        │
│  │  AI Success     │ │  Quality Score  │ │  Payout Acc.    │        │
│  │  Rate           │ │                 │ │                 │        │
│  │  [REALTIME]     │ │  [7d avg]       │ │  [รอบล่าสุด]    │        │
│  │  ██.█%  ● เขียว │ │  ██/100 ● เขียว │ │  ███%  ● เขียว │        │
│  │  vs เมื่อวาน ▲  │ │  vs สัปดาห์ก่อน│ │  รอบ ส.ค. 69   │        │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 2 — ปริมาณและผู้ใช้ (2 Card ใหญ่)                              │
│  ┌───────────────────────────┐ ┌───────────────────────────┐        │
│  │  KPI-01                   │ │  KPI-02                   │        │
│  │  MAU แยกตาม 6 กลุ่ม       │ │  Transaction Volume       │        │
│  │  [30d rolling]            │ │  [MTD]                    │        │
│  │                           │ │                           │        │
│  │  รวม: ████ คน             │ │  รวม: ████,███,███ บาท    │        │
│  │  ■ กลุ่ม 1 ผู้ผลิต ████   │ │  ■ Shopee  ██%            │        │
│  │  ■ กลุ่ม 2 คนกลาง ███     │ │  ■ TikTok  ██%            │        │
│  │  ■ กลุ่ม 3 แพลตฯ  ███     │ │  ■ Lazada  ██%            │        │
│  │  ■ กลุ่ม 4 ผู้บริโภค ████ │ │                           │        │
│  │  ■ กลุ่ม 5 ชุมชน   ██     │ │  Gross Margin: ██.█%      │        │
│  │  ■ กลุ่ม 6 วิชาชีพ  ██    │ │  ● เขียว / เหลือง / แดง  │        │
│  └───────────────────────────┘ └───────────────────────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 3 — Timeline (กราฟเส้น 30 วัน)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Trend: [MAU] [Volume] [Success Rate] [Quality] — เลือกได้      ││
│  │  ████████████████████████████████████████████████████████████  ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  ROW 4 — Alerts ที่ยังไม่แก้ไข                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [!] ยังไม่มี Alert ที่ค้างอยู่  /  [รายการ Alert ที่แก้แล้ว]  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 ลำดับความสำคัญของ Card

ROW 1 แสดงก่อนเพราะเป็นตัวชี้วัดที่ต้องการการตัดสินใจทันที — ถ้า Success Rate หรือ Payout ติดแดง ต้องเห็นทันทีที่เปิดหน้าจอ ไม่ต้องเลื่อนลง

ROW 2 เป็นตัวเลขสะสมที่ดูเป็นภาพรวม ไม่ต้องการ action ทันทีในระดับเดียวกัน

### 3.3 Drill-down ที่ควรมี

| Card | คลิกแล้วไปดูอะไร |
|---|---|
| MAU | รายชื่อ user ระดับ cohort (สัปดาห์ที่ sign up) + Retention curve 4 สัปดาห์ |
| Transaction Volume | รายการธุรกรรมแต่ละ platform + top 20 seller by volume + Gross Margin รายสินค้า |
| AI Success Rate | Breakdown error by type (timeout / content_filtered / unknown) + query categories ที่ fail บ่อย |
| Quality Score | ตัวอย่าง query ที่ได้คะแนนต่ำ + manual review queue + trend รายวัน |
| Payout Accuracy | รายการ payout ที่ fail rule พร้อม rule ที่ผิดและ referral chain |

---

## 4. ข้อมูลที่ต้องมีก่อน Dashboard นี้ทำงานได้

### 4.1 Tables ที่มีอยู่แล้ว (จาก MVP-AI-Income-Starter.md)

| Table | ใช้ใน KPI |
|---|---|
| `users` | KPI-01 (join เพื่อดู user_group) |
| `sales_logs` | KPI-02, KPI-05 |
| `alerts` | ROW 4 (แสดง active alerts) |
| `journey_progress` | ข้อมูลประกอบ Drill-down MAU |

### 4.2 Tables ที่ต้องสร้างใหม่

**Table: `user_sessions`**
```sql
CREATE TABLE user_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  session_started_at TIMESTAMPTZ NOT NULL,
  session_ended_at   TIMESTAMPTZ,
  session_status   TEXT NOT NULL CHECK (session_status IN ('completed', 'abandoned', 'error')),
  -- 'completed' = ผู้ใช้ทำ action อย่างน้อย 1 อย่างได้สำเร็จ
  device_type      TEXT, -- 'mobile' | 'desktop'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON user_sessions (user_id, session_started_at);
```

**Table: `ai_query_logs`**
```sql
CREATE TABLE ai_query_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  session_id          UUID REFERENCES user_sessions(id),
  query_text          TEXT NOT NULL,
  response_text       TEXT,
  resolution_type     TEXT NOT NULL CHECK (resolution_type IN (
                        'ai_resolved', 'human_escalated', 'error_timeout',
                        'error_content_filtered', 'error_unknown'
                      )),
  latency_ms          INTEGER,
  model_version       TEXT, -- เก็บ version โมเดลที่ใช้
  prompt_version      TEXT, -- เก็บ prompt version
  automated_eval_score NUMERIC(5,2), -- 0–100, NULL ถ้ายังไม่ได้ eval
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ห้ามเก็บ PII ใน query_text โดยตรง — ต้องผ่าน PII filter ก่อน insert
CREATE INDEX ON ai_query_logs (created_at);
CREATE INDEX ON ai_query_logs (resolution_type, created_at);
```

**Table: `response_quality_ratings`**
```sql
CREATE TABLE response_quality_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id      UUID NOT NULL REFERENCES ai_query_logs(id),
  rating_type   TEXT NOT NULL CHECK (rating_type IN (
                  'user_feedback', 'automated_eval', 'human_review'
                )),
  score         NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  dimension     TEXT, -- 'groundedness' | 'coherence' | 'task_completion' (สำหรับ automated)
  reviewer_id   UUID REFERENCES users(id), -- NULL สำหรับ automated
  notes         TEXT, -- บันทึก reviewer (human_review เท่านั้น)
  rated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON response_quality_ratings (query_id, rating_type);
CREATE INDEX ON response_quality_ratings (rated_at);
```

**Table: `affiliate_payouts`**
```sql
CREATE TABLE affiliate_payouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id   UUID NOT NULL REFERENCES users(id), -- ผู้รับเงิน
  referrer_id      UUID REFERENCES users(id), -- คนที่ชวน (ถ้ามี)
  source_sale_id   UUID REFERENCES sales_logs(id), -- ต้องมี — Rule 1
  source_type      TEXT NOT NULL CHECK (source_type IN ('sale')),
  -- ห้ามมีค่าอื่น: 'signup_fee' ผิดกติกา Non-MLM
  referral_depth   SMALLINT NOT NULL CHECK (referral_depth BETWEEN 1 AND 2),
  -- Rule 2: ห้ามเกิน 2
  amount_thb       NUMERIC(12,2) NOT NULL CHECK (amount_thb > 0),
  payout_period    TEXT NOT NULL, -- 'YYYY-MM'
  verification_status TEXT NOT NULL DEFAULT 'pending'
                   CHECK (verification_status IN ('pending', 'passed', 'failed')),
  failure_reason   TEXT, -- บันทึก rule ที่ผิด
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON affiliate_payouts (payout_period, verification_status);
```

**Table: `dashboard_snapshots`**
```sql
CREATE TABLE dashboard_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE NOT NULL,
  kpi_key         TEXT NOT NULL, -- 'mau_total' | 'transaction_volume' | etc.
  value_numeric   NUMERIC,
  value_json      JSONB, -- สำหรับ KPI ที่มีหลายมิติ เช่น MAU by group
  source_query    TEXT, -- บันทึก query ที่ใช้คำนวณ
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date, kpi_key)
);
```

### 4.3 ข้อมูลที่ยังไม่มีและต้องสร้าง

| รายการ | สถานะ | หมายเหตุ |
|---|---|---|
| `user_sessions` tracking logic | ยังไม่มี | ต้องเพิ่ม event tracking ใน frontend (Next.js) |
| PII filter ก่อน insert ลง `ai_query_logs` | ยังไม่มี | บังคับตาม `CLAUDE.md` ข้อ 4 — ต้องตรวจซ้ำ 2 ชั้น |
| Automated Eval Pipeline | ยังไม่มี | ต้องออกแบบ eval harness แยก (อ้างอิง `docs/appendix-a5-harness.md`) |
| Human Spot Check process + queue | ยังไม่มี | ต้องนิยาม SLA ว่า QA ตรวจกี่ sample ต่อสัปดาห์ |
| `user_group` field ใน `users` table | ยังไม่ชัด | ต้องยืนยันว่า field นี้มีใน schema และมีค่า 6 กลุ่มครบ |
| n8n workflow สำหรับ alert routing | ยังไม่มี | ต้องสร้าง workflow แยกตาม severity |
| Affiliate compliance check job | ยังไม่มี | ต้องสร้าง daily verification job ที่รัน rule 3 ข้อ |

---

## 5. สิ่งที่ยังไม่ได้ทำ (Limitations ของ Dashboard MVP)

### 5.1 ข้อจำกัดที่รู้ล่วงหน้า

**ไม่มี Baseline ยังหาเกณฑ์สีไม่ได้จริง**
เกณฑ์สีทุกตัวที่ระบุไว้ในสเปกนี้เป็น "เกณฑ์เริ่มต้น" ที่ตั้งจากหลักการและ MVP promise ของ `MVP-AI-Income-Starter.md` ยังไม่มีข้อมูลจริงรองรับ ต้องทบทวนหลังเก็บข้อมูลได้ครบ 90 วัน

**ยังไม่มี Financial Health Ratios**
Dashboard MVP นี้ไม่ครอบคลุมอัตราส่วนสำคัญ 5 ตัวที่ระบุใน System Prompt ของ data-analytics agent (อัตรากำไร, ค่าจ้าง/รายได้, ต้นทุนวัตถุดิบ/รายได้ ฯลฯ) เพราะยังไม่มีข้อมูล Cost of Goods Sold และ Payroll จากระบบบัญชี — ต้องเพิ่มใน Phase 2

**ยังไม่มี Cross-Platform Dedup**
ผู้ใช้คนเดียวที่ขายทั้ง Shopee และ TikTok Shop อาจถูกนับซ้ำใน Transaction Volume ถ้า seller_id ต่าง platform ไม่ map กัน

**ยังไม่มี Cohort Analysis**
MAU ปัจจุบันเป็นตัวเลขรวม — ไม่บอกว่าผู้ใช้ที่สมัครเดือนที่แล้วยังอยู่ไหม (Retention) ซึ่งสำคัญกว่า MAU รวมในระยะยาว

**Quality Score ขึ้นกับ bandwidth ทีม QA**
Human Spot Check (20% ของ Quality Score) ต้องมีทีม QA สุ่มตรวจจริง — ถ้าไม่มีคน ตัวชี้วัดนี้จะ bias ไปทาง automated eval ที่อาจมีข้อจำกัดของตัวเอง

### 5.2 สิ่งที่ต้องเพิ่มใน Phase 2

| รายการ | เหตุผล |
|---|---|
| Cohort Retention (Day 7 / Day 30) | เข้าใจ LTV และ product-market fit ดีกว่า MAU รวม |
| Financial Health Ratios (5 ตัว) | ต้องรอข้อมูล Cost และ Payroll จากระบบบัญชี |
| NPS / CSAT Score | วัดความพึงพอใจโดยตรง (เป้า NPS > 50 ตาม MVP spec) |
| Seller Revenue Distribution | ดูว่ารายได้กระจุก top 10% หรือกระจายทั่ว |
| AI Model Version Performance Tracking | เปรียบเทียบ Quality Score ระหว่าง prompt/model versions |
| Anomaly Detection อัตโนมัติ | แทนที่เกณฑ์สีแบบ static ด้วย statistical anomaly detection |
| On-Premise Dashboard Variant | Dashboard เวอร์ชันสำหรับ deployment ที่ไม่ต้องส่งข้อมูลออกนอก |
| PDPA Audit Trail ครบ | บันทึกว่าใครดู query log ไหน เมื่อไร (ตาม `CLAUDE.md` ข้อ 4) |

---

*เอกสารนี้เป็น Definition of Done สำหรับงาน 2.4 ของ `docs/TEAM-BACKLOG.md` — สิ่งที่ส่งมอบคือสเปกที่ระบุ schema, query ต้นทาง, และ limitation ชัดเจน ยังไม่รวม implementation และ UI จริง*

*ตัวเลขเกณฑ์สีทุกตัวในเอกสารนี้เป็นประมาณการเริ่มต้น ยังไม่มีข้อมูล baseline รองรับ*
