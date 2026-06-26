# 🧠 OpenThai.ai — AI Skills Framework

ทักษะ AI ทั้งหมด **30 ตัว (S1–S30)** ขับเคลื่อนด้วย AI Router: **Claude (Anthropic) → Gemini → Mock fallback**
ทุก endpoint ทำงานได้แม้ไม่มี API key (mock fallback) — ใส่ `ANTHROPIC_API_KEY` หรือ `GEMINI_API_KEY` เพื่อผลลัพธ์จริง

---

## 📚 Skills Registry & Catalog

| ทรัพยากร | รายละเอียด |
|---|---|
| `GET /api/skills` | แคตตาล็อก machine-readable ของทุกทักษะ (id · name · endpoint · method · inputs · status) · รองรับ `?category=` |
| `/skills` | **AI Skills Hub** — แท็บสร้างจาก registry แบบ data-driven |
| `/skills-catalog` | หน้ารวมทักษะทั้งหมด จัดกลุ่มตามหมวด + ค้นหา + deep-link |
| `/skills?skill=S20` | deep-link เปิดแท็บทักษะที่ต้องการตรงๆ |

**Data-driven Hub:** เพิ่มทักษะใหม่ใน `SKILLS_REGISTRY` (backend) แล้วแท็บจะ**ปรากฏเองในหน้า `/skills`** ผ่าน `GenericSkillRunner` (ฟอร์ม + ปุ่มรันสร้างอัตโนมัติจาก `inputs`) — ถ้าต้องการ UI สวยกว่านั้นค่อยเขียน component เฉพาะแล้วผูกใน `TAB_COMPONENTS`

---

## ทักษะทั้งหมด

### Core (S1–S8) — ฝังในหน้า Generator / Tools
| ID | ชื่อ | Endpoint | หมายเหตุ |
|----|------|----------|----------|
| S1 | RCCF Prompt | `POST /api/generate` | สร้างคอนเทนต์หลัก |
| S2 | Taste Check | `POST /api/generate` | ตรวจรสนิยม/คุณภาพ |
| S3 | Master Prompt | `POST /api/generate` | prompt ระดับสูง |
| S4 | Image Analysis | `POST /api/analyze-image` | ต้องส่งภาพ base64 |
| S5 | TTS Voice | `POST /api/tts` | ⚠️ ต้องการ `ELEVENLABS_API_KEY` |
| S6 | AI Critic | `POST /api/generate` | ประเมินผลงาน |
| S7 | Context Card | `POST /api/generate` | การ์ดบริบท |
| S8 | LINE OA Connect | `POST /api/line/send` | ⚠️ ต้องการ `LINE_CHANNEL_TOKEN` |

### Skills Hub (S9–S23) — หน้า `/skills`
| ID | ชื่อ | Endpoint | Inputs หลัก |
|----|------|----------|-------------|
| S9 | Learning Layer | `GET /api/skills/learning/patterns` · `POST .../rate` · `POST .../enhance` | feedback loop |
| S10 | Trend Analyzer | `POST /api/skills/trend` | product, category, platform |
| S11 | Hashtag Generator | `POST /api/skills/hashtag` | product, category, platform |
| S12 | SEO Thai | `POST /api/skills/seo` | product, category, platform |
| S13 | Sentiment Scanner | `POST /api/skills/sentiment` | text |
| S14 | Video Script | `POST /api/skills/video-script` | product, duration, style |
| S15 | Multi-Language | `POST /api/skills/translate` | text, from, to |
| S16 | Prompt Builder | `POST /api/skills/prompt-builder` | goal, technique |
| S17 | Cultural Wisdom | `POST /api/skills/cultural-wisdom` | situation, tradition |
| S18 | Sales Conversion Engine | `POST /api/skills/promo-engine` | product, usp, platform |
| **S19** | **Supply Chain AI** | `POST /api/skills/supply-chain` | product, category, sourcing |
| **S20** | **Pricing Optimizer** | `POST /api/skills/pricing` | product, cost, competitor_price |
| **S21** | **Customer Service AI** | `POST /api/skills/customer-service` | message, product, channel |
| **S22** | **Ad Budget Planner** | `POST /api/skills/ad-budget` | product, budget, platforms |
| **S23** | **Break-even Planner** | `POST /api/skills/break-even` | product, price, unit_cost, fixed_costs |
| **S24** | **Campaign Calendar** | `POST /api/skills/campaign-calendar` | product, category, period |
| **S25** | **Live Selling Script** | `POST /api/skills/live-script` | product, platform, duration |
| **S26** | **Omni-Solver** (แก้ปัญหารอบด้าน 4 ศาสตร์) | `POST /api/skills/omni-solver` | problem, context, goal |
| **S27** | **Negotiation Coach** | `POST /api/skills/negotiation` | situation, my_goal, their_position |
| **S28** | **Conflict Mediator** | `POST /api/skills/mediation` | conflict, parties, desired_outcome |
| **S29** | **Crisis Manager** | `POST /api/skills/crisis` | situation, channel, severity |
| **S30** | **Persona Builder** | `POST /api/skills/persona` | product, category, market |

---

## 🔗 Supply Chain Control Tower — `/supply-chain`
ศูนย์บัญชาการห่วงโซ่อุปทานเรียลไทม์จากคลังสินค้าจริง:
- KPI: SKU · หน่วยในสต๊อก · inventory turnover · sell-through · มูลค่าสต๊อก
- 🚨 แจ้งเตือนสั่งซื้อซ้ำ + **ปุ่มเติมสต๊อกจริง** (`POST /api/inventory/admin/adjust`)
- 🤖 ปุ่ม "AI วางแผน" รายสินค้า → เรียก S19 ด้วยข้อมูลจริง (ปิดวงจร ข้อมูล → AI → restock)

---

## ➕ วิธีเพิ่มทักษะใหม่ (S24+)

1. **Backend** (`backend/server.js`): เพิ่ม handler ตาม pattern เดิม
   ```js
   app.post('/api/skills/<name>', generateLimiter, async (req, res) => {
     const { product } = req.body || {};
     if (!product?.trim()) return res.status(400).json({ error: 'product required' });
     const prompt = `...`;
     try {
       const text = await callAI(prompt, 2048);
       return res.json({ success: true, source: anthropic ? 'claude' : 'gemini', ...parseAIJson(text) });
     } catch (e) { addLog('warn', 'Skills/<Name>', e.message); }
     res.json({ success: true, source: 'mock', /* mock fallback */ });
   });
   ```
2. เพิ่มใน `SKILLS_REGISTRY` (และ `our_skills` ของ `/api/system/skills-gap`)
3. **เท่านี้ก็ใช้งานได้** — แท็บจะปรากฏใน `/skills` อัตโนมัติผ่าน `GenericSkillRunner`
4. (ทางเลือก) เขียน rich UI: เพิ่ม `Tab<Name>` ใน `AISkillsPage.jsx`, ใส่ใน `TABS` + `TAB_COMPONENTS`; เพิ่มหมวดใน `SkillsCatalogPage.jsx` `CAT_META` + `HUB`

---

## ✅ การทดสอบ

```bash
cd backend && npm run test:smoke
```
boot เซิร์ฟเวอร์แล้วยิงทุก hub skill ใน registry (mock fallback) ยืนยันว่าตอบ `200` ครบ
ใช้ `DISABLE_RATE_LIMIT=1` เฉพาะตอนเทสต์ (production ไม่ตั้ง flag นี้)
