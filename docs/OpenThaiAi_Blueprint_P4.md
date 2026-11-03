# OpenThaiAi Blueprint P4 — Model Router & Telemetry (ต้นทุน AI ต่อคำขอ)

**สถานะ:** Draft · อิง PR #106 (`feat/ai-usage-log-extend`, ยังไม่ merge ลง main) · Migration 009 **ยังไม่ได้รันบน Supabase**
**เสิร์ฟกลุ่มผู้ใช้:** (3) แพลตฟอร์ม — ให้มีข้อมูลต้นทุน AI จริงสำหรับสูตร Cross-Subsidy
**หลักการ:** ทุกตัวเลขในเอกสารนี้อ้างอิงโค้ด/schema ที่ตรวจแล้ว ตัวที่ไม่ได้วัดกำกับว่า "ยังไม่ได้วัด"

> เอกสารนี้อธิบายเฉพาะสิ่งที่มีใน repo จริงและสิ่งที่ PR #106 เพิ่ม ไม่ได้ครอบคลุม 10 ค่าย AI — **มีโค้ดเรียกเพียง 3 ค่าย** (Gemini, Grok, Claude)

---

## 1. Router ที่มีอยู่จริง (`backend/server.js`, ฟังก์ชัน `routeAI`)

| ค่าย | label | `costPer1k` (USD ต่อ 1k tokens) | สถานะตัวเลข |
|---|---|---|---|
| gemini | Gemini Flash | 0.0004 | **ยังไม่ได้วัดเทียบเรตจริง** (ค่าประมาณในโค้ด) |
| grok | Grok | 0.0005 | **ยังไม่ได้วัดเทียบเรตจริง** |
| claude | Claude Haiku | 0.0008 | **ยังไม่ได้วัดเทียบเรตจริง** |

- **Tier:** `heavy` = claude → gemini → grok · `bulk` = gemini → grok → claude · `eco` = gemini → grok
- **Eco Mode:** เมื่อค่าใช้จ่ายสะสมรายวันถึง `AI_DAILY_BUDGET_USD` (ค่าเริ่มต้นในโค้ด 1.0 USD — เป็นค่า config ไม่ใช่ผลวัด)
- **Failover:** ค่ายที่ล้มติดกัน 3 ครั้งถูกปิดชั่วคราว รีเซ็ตรายวัน
- **จำนวน token เป็นค่าประมาณ:** `ceil(ความยาวข้อความ / 4)` ทั้ง prompt และคำตอบ ไม่ได้อ่านจาก usage ของ API ผู้ให้บริการ
- สถานะรายวันของ router เก็บในหน่วยความจำ (`routerState`) — **หายเมื่อ process รีสตาร์ต** จึงยังไม่ใช่ข้อมูลระยะยาว

## 2. Schema ที่มีจริง

**Migration 003 (`ai_usage_log`):** `id, user_id, session_id, ai_source, model_id, endpoint, product, platform, category, style, input_tokens, output_tokens, cost_usd, cost_thb, response_ms, critic_score, is_cached, ip_hash, created_at`
`ai_source` จำกัดที่ `claude | gemini | mock | mock-fallback`

**ตารางสรุป:** `daily_cost_summary` (มีคอลัมน์ `claude_requests`, `gemini_requests`, `mock_requests` — **ไม่มีของ grok**) และ view `monthly_cost_per_user`

**Migration 009 (ใน PR #106):** เพิ่ม `grok` ใน CHECK ของ `ai_source`, เพิ่มคอลัมน์ `tried TEXT[]` และ `tokens_est BOOLEAN DEFAULT TRUE`

## 3. Write path (PR #106)

- `backend/ai-usage-log.js` → `logAiUsage()` เขียนผ่าน Supabase REST แบบ fire-and-forget ไม่ throw (แบบเดียวกับ `audit.js`)
- `routeAI()` เรียกหลังได้คำตอบสำเร็จ: บันทึก provider ที่ตอบจริง (หลัง fallback), `tried`, `cost_usd`, latency
- `input_tokens` / `output_tokens` เป็น `null` (router ไม่แยก — ไม่เดา) และ `tokens_est = true`
- `cost_thb` คำนวณเมื่อตั้ง env `USD_THB_RATE` เท่านั้น ไม่ตั้ง → `null`
- ทดสอบแล้ว: unit test 5 ข้อด้วย fetch จำลอง (ไม่ได้ทดสอบกับ Supabase จริง)

## 4. ผูกกับสูตร Cross-Subsidy

ตัวแปรที่ P3 ใช้ (`C_serv`, `C_free`) หาค่าได้จาก `SUM(cost_thb)` ใน `ai_usage_log` แยกตามกลุ่มผู้ใช้ — **เมื่อเงื่อนไขต่อไปนี้ครบ:**

| เงื่อนไข | สถานะ |
|---|---|
| รัน migration 009 บน Supabase | ยังไม่ได้ทำ |
| ตั้ง `USD_THB_RATE` (มิฉะนั้น `cost_thb` เป็น null) | ยังไม่ได้ตั้ง/ยังไม่กำหนดแหล่งอัตรา |
| มีคอลัมน์จำแนกกลุ่ม Paid/Free ใน log | **ยังไม่มี** — `ai_usage_log` มี `user_id` ต้อง join กับตารางผู้ใช้/แผน |
| เทียบ `costPer1k` กับเรตจริงของแต่ละค่าย | ยังไม่ได้วัด |
| ผลรวมจริง (`C_serv`, `C_free`) | **ยังไม่ได้วัด** (ยังไม่มีข้อมูล) |

หมายเหตุ: ผู้เขียนยังไม่ได้อ่าน P3 (PR #104) ฉบับเต็ม ต้องตรวจนิยามตัวแปรให้ตรงกันก่อน merge

## 5. ช่องว่างที่ยังไม่ปิด (follow-up)

1. **จุดเรียก AI ที่ไม่ผ่าน `routeAI()` ยังไม่บันทึก log** — เช่น `anthropic.messages.create` โดยตรง (บน main ประมาณบรรทัด 218, 1386, 1526, 1585, 1853, 1863, 5188, 5299, 5632) และ Council ที่เรียก `callClaude/callGeminiText/callGrok` ตรง (ประมาณ 1773–1834) ต้นทุนส่วนนี้จึงยังไม่อยู่ใน `ai_usage_log`
2. ตรวจด้วย grep ไม่พบการอ่านค่า usage จาก response ของ API → token ยังเป็นค่าประมาณทั้งหมด
3. `daily_cost_summary` ไม่มี grok และยังไม่มีโค้ดเขียนลงตารางนี้
4. เลข migration ซ้ำ: มี `008_pdpa_consents.sql` และ `008_vault_ledger.sql` (cleanup แยกต่างหาก)
5. Vercel deploy ของ PR #105/#106 ล้ม ยังไม่ทราบสาเหตุ (เปิด build log ไม่ได้) — ไม่เกี่ยวกับเอกสารนี้แต่เป็นเงื่อนไขก่อน release

## 6. นอกขอบเขตเอกสารนี้

การรองรับค่ายอื่น (GPT, Llama, DeepSeek ฯลฯ) — ยังไม่มีโค้ด ให้เพิ่มเมื่อมี adapter จริง และต้องขยาย CHECK ของ `ai_source` ผ่าน migration ถัดไป
