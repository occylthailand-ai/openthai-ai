# OpenThai.ai — แฟ้มมอบหมายงานทีม (Team Backlog)

**เริ่มใช้:** 23 ก.ค. 2569 | **ผู้บัญชาการ:** Mythos
**คำสั่งถาวร:** `CLAUDE.md` | **นิยามทีม:** `.claude/agents/`

---

## 🧭 ผังทีม 19 ตัว (อัปเดต 21 ส.ค. 2569)

```
                          Mythos (Founder & Commander)
                                       │
                              chief-of-staff (เสนาธิการ)
                                       │
   ┌──────────┬──────────────┬─────────┴──────────┬──────────────┐
   │          │              │                    │              │
หน่วยรบ (6)  หน่วยสร้าง (7) หน่วยกำกับ (3)  หน่วยค้นคว้า (1) หน่วยขาย (1)
   │          │              │                    │              │
producer    ai-ml-engineer  legal-compliance 🛑  tech-scout    sales-agent
intermediary backend-engineer content-localization
platform    frontend-engineer growth-community
consumer    data-analytics
ecosystem   devops-sre
professional security-guard
            blockchain-web3

🛑 = มีอำนาจหยุดงานที่สุ่มเสี่ยงผิดกฎหมาย
🔭 tech-scout = ส่ง Innovation Brief เข้า Board ทุกเดือน
💧 sales-agent = "เหมือนน้ำ" — B2B/B2G/B2C/Partnership ครบวงจร
```

## 📊 ตารางความครอบคลุม 6 กลุ่มผู้ใช้

| กลุ่ม | Agent เจ้าของ | สถานะในหนังสือ | สถานะในระบบ |
|---|---|---|---|
| 1. ผู้ผลิต | producer-agent | ✅ บทที่ 4.1 | 🟡 Producer Portal มีแล้ว |
| 2. คนกลางทุกประเภท | intermediary-agent | 🟡 บท 4.2 ครอบคลุมแค่โลจิสติกส์ | ✅ Intermediary Portal MVP `/intermediary` (22 ส.ค. 69) |
| 3. แพลตฟอร์ม | platform-agent | ✅ บทที่ 4.3 | ✅ 7 Portal |
| 4. ผู้บริโภค | consumer-agent | ✅ บทที่ 4.4 | ✅ Consumer Portal MVP `/consumer` (22 ส.ค. 69) |
| 5. ชุมชน/นักพัฒนา/รัฐ | ecosystem-agent | ✅ บทที่ 4.5 | 🟡 Gov Portal มีแล้ว |
| 6. **สายงานวิชาชีพ** | professional-agent | 🔴 ยังไม่มีในหนังสือ | ✅ Professional Portal MVP `/professional` (8 ก.ย. 2569) |

**ช่องว่างใหญ่ที่สุด:** กลุ่มที่ 6 (วิชาชีพ) และกลุ่มที่ 2 ที่ครอบคลุมไม่ครบทุกประเภทคนกลาง

---

## 🎯 คลื่นงานที่ 1 — ปิดช่องว่าง (กำลังดำเนินการ)

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 1.1 | สเปกโมดูลสายวิชาชีพ 5 สาย พร้อมเส้นแบ่งทางกฎหมาย | `professional-agent` | `docs/module-professional.md` | ✅ เสร็จ 23 ก.ค. 69 |
| 1.2 | ขยายกลุ่มคนกลางให้ครบ 7 ประเภท ไม่ใช่แค่โลจิสติกส์ | `intermediary-agent` | `docs/module-intermediary.md` | ✅ เสร็จ 23 ก.ค. 69 |
| 1.3 | ภาคผนวก A5 — Prompt/Context/Harness Engineering ฉบับไทย | `ai-ml-engineer` | `docs/appendix-a5-harness.md` | ✅ เสร็จ 23 ก.ค. 69 |
| 1.4 | แผนพัฒนาบุคลากร Level 0–8 แมปกับ 10 กิลด์ | `chief-of-staff` | `docs/people-levels.md` | ✅ เสร็จ 23 ก.ค. 2569 |

## 📋 คลื่นงานที่ 2 — ต่อยอด (รอคลื่น 1 เสร็จ)

| # | งาน | มอบให้ | ขึ้นกับ |
|---|---|---|---|
| # | งาน | มอบให้ | ขึ้นกับ | สถานะ | ผลลัพธ์ |
|---|---|---|---|---|---|
| 2.1 | รวม 1.1–1.3 เข้าหนังสือเป็นบทที่ 7 + ปรับบท 4 เป็น 6 กลุ่ม | `content-localization` | 1.1, 1.2, 1.3 ✅ | ✅ เสร็จ 6 ส.ค. 2569 | `ปรากฏการณ์-OpenThaiAi.md` บทที่ 7 |
| 2.2 | ตรวจสเปกวิชาชีพว่าไม่ล้ำเส้นสภาวิชาชีพ | `legal-compliance` | 1.1 ✅ | ✅ เสร็จแล้ว | `docs/legal-check-professional.md` |
| 2.3 | ออกแบบ RAG + Guardrails สำหรับข้อมูลวิชาชีพ (On-Prem บังคับ) | `ai-ml-engineer` + `security-guard` | 2.2 ✅ | ✅ เสร็จ 6 ส.ค. 2569 | `docs/rag-guardrails-professional.md` |
| 2.4 | Dashboard สุขภาพธุรกิจ 5 ตัวชี้วัด สำหรับ MVP | `data-analytics` | — | ✅ เสร็จแล้ว | `docs/dashboard-mvp.md` |
| 2.5 | ตรวจโครงสร้าง Affiliate ตามเกณฑ์ Non-MLM 6 ข้อ | `legal-compliance` | — | ✅ เสร็จ 6 ส.ค. 2569 | `docs/affiliate-legal-check.md` |
| 2.6 | On-Premise Deployment Package + คู่มือไทย | `devops-sre` | — | ✅ เสร็จ 6 ส.ค. 2569 | `docs/onprem-deployment.md` |
| 2.7 | หน้า Portal สำหรับกลุ่มผู้บริโภค (ตรวจสิทธิสวัสดิการ) | `consumer-agent` + `frontend-engineer` | — | ✅ เสร็จ 6 ส.ค. 2569 | `docs/consumer-portal-spec.md` |
| 2.8 | Thai Eval Suite วัดผลโมเดลแบบมีตัวเลขจริง | `ai-ml-engineer` | — | ✅ เสร็จ 6 ส.ค. 2569 | `docs/thai-eval-suite.md` |
| 2.9 | สร้างนิยาม agent `blockchain-web3.md` — กิลด์ที่ 7 ยังไม่มี agent รองรับ | `chief-of-staff` | 1.4 ✅ | ✅ เสร็จแล้ว | `.claude/agents/blockchain-web3.md` |
| 2.10 | ข้อสอบ PDPA/ความปลอดภัย 20 ข้อ ใช้เป็นเกณฑ์ผ่าน 30 วันแรก | `legal-compliance` + `security-guard` | 1.4 ✅ | ✅ เสร็จ 6 ส.ค. 2569 | `docs/onboarding-exam-pdpa-security.md` |
| 2.11 | ชุดทดสอบ "จับคำหลอน" สำหรับประเมิน Level 0 | `ai-ml-engineer` | 1.4 ✅ | ✅ เสร็จแล้ว | `docs/hallucination-test-suite.md` |
| 2.12 | สำรวจกรอบค่าตอบแทนต่อ Level จากตลาดจริง (ห้ามเดาตัวเลข) | Mythos | 1.4 ✅ | ⏸ รอ Mythos | — |

## 🔭 คลื่นงานที่ 3 — หน่วยใหม่เริ่มงาน (อัปเดต 21 ส.ค. 2569)

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 3.1 | Technology Radar ฉบับแรก — จัดกลุ่ม Adopt/Trial/Assess/Hold สำหรับ AI/ML, Platform, Data/Privacy, RegTech ที่เกี่ยวกับ OpenThai.ai | `tech-scout` | `docs/tech-radar-q3-2569.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.2 | Innovation Brief ชุดแรก 3 เรื่อง — เลือกเทคโนโลยีที่กระทบ roadmap มากที่สุด พร้อม Build/Buy/Partner recommendation | `tech-scout` | `docs/innovation-brief-aug2569.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.3 | Sales Playbook ฉบับ OpenThai.ai — B2B/B2G/B2C/Partner พร้อม Proposal template, Pipeline tracker และ Objection handling | `sales-agent` | `docs/sales-playbook.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.4 | B2G Pilot Proposal template — สำหรับยื่นหน่วยงานรัฐที่อยากทดสอบ OpenThai.ai ก่อนซื้อ | `sales-agent` + `legal-compliance` | `docs/b2g-pilot-proposal-template.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.5 | กำหนดโครงสร้าง Innovation Board — ใครเป็นสมาชิก วาระประชุม ขั้นตอนรับ Brief เข้า/ออก | `chief-of-staff` | `docs/innovation-board-charter.md` | ✅ ร่างเสร็จ 21 ส.ค. 2569 — รอ Mythos กำหนดสมาชิกเพื่อ activate |
| 3.6 | Competitive Positioning — ตอบ "ต่างจาก Typhoon/NECTEC อย่างไร?" สำหรับ media/investor | `tech-scout` + `chief-of-staff` | `docs/competitive-positioning.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.7 | PDPA Compliance Signoff — checklist ก่อน launch + gap analysis ที่ยังขาด | `legal-compliance` | `docs/pdpa-compliance-signoff.md` | ✅ ร่างเสร็จ 21 ส.ค. 2569 — รอ legal ที่ปรึกษาภายนอกรับรอง |
| 3.8 | Developer Onboarding — quick start 30 นาที สำหรับนักพัฒนา community | `ecosystem-agent` | `docs/developer-onboarding.md` | ✅ เสร็จ 21 ส.ค. 2569 |
| 3.9 | Investor One-Pager — fundraising brief สำหรับ VC/Angel/กองทุนรัฐ | `chief-of-staff` | `docs/investor-one-pager.md` | ✅ เสร็จ 21 ส.ค. 2569 |

## 🏛️ คลื่นงานที่ 4 — Innovation Board เปิดปฏิบัติการ (อัปเดต 22 ส.ค. 2569)

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 4.1 | คำสั่งแต่งตั้ง Board 5 ที่นั่ง + ลงนาม Mythos | `chief-of-staff` | `docs/innovation-board-appointment.md` | ✅ ร่างเสร็จ 22 ส.ค. 2569 — **รอ Mythos กำหนดชื่อจริงและลงนาม** |
| 4.2 | Flash Brief RegTech — PDPA Tool, e-Tax AI, Legal AI โอกาสและ case studies โลก | `tech-scout` | `docs/flash-brief-regtech.md` | ✅ เสร็จ 22 ส.ค. 2569 — รอ Board ตัดสินใจ 3 คำถาม |
| 4.3 | PDPA Compliance Assistant prototype — Product แรก ถ้า Board อนุมัติ | `ai-ml-engineer` + `backend-engineer` | — | 🔴 รอมติ Board |
| 4.4 | Flash Brief: BoT RegTech Sandbox — ควร apply เข้า sandbox ไหม? | `tech-scout` + `legal-compliance` | `docs/flash-brief-bot-sandbox.md` | ✅ เสร็จ 22 ส.ค. 2569 — รอ Board ตอบ 3 คำถาม |
| 4.5 | บันทึกมติ Innovation Board ครั้งแรก | `chief-of-staff` | `docs/innovation-board-decisions.md` | 🔴 รอ Board ประชุม |
| 4.6 | Product Roadmap 12 เดือน — 4 Phase พร้อม Definition of Done | `chief-of-staff` | `docs/product-roadmap.md` | ✅ เสร็จ 22 ส.ค. 2569 |
| 4.7 | Thai Corpus Strategy — แผนรวบรวมข้อมูล, legal sources, data pipeline, tokenizer | `ai-ml-engineer` + `legal-compliance` | `docs/thai-corpus-strategy.md` | ✅ เสร็จ 22 ส.ค. 2569 |
| 4.8 | Flash Brief: Partnership Strategy — มหาวิทยาลัย + Cloud Provider | `tech-scout` | `docs/flash-brief-partnerships.md` | ✅ เสร็จ 8 ก.ย. 2569 |

## 🚀 คลื่นงานที่ 5 — Dev-Loop Automation (เริ่ม 8 ก.ย. 2569)

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 5.1 | Professional Portal MVP Spec — สเปกและ UX Flow สำหรับ 3 สายวิชาชีพ | `professional-agent` + `frontend-engineer` | `docs/professional-portal-spec.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 5.2 | API Stub Spec — endpoints สำหรับ Intermediary และ Consumer Portal | `backend-engineer` | `docs/api-stub-spec.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 5.3 | Wave 5 Progress Report — สรุปสถานะโครงการ | `chief-of-staff` | `docs/wave5-progress-report.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 5.4 | Thai Model Development Roadmap — M0 ถึง M3 | `ai-ml-engineer` | `docs/thai-model-dev-roadmap.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 5.5 | Affiliate Non-MLM Technical Spec | `blockchain-web3` + `legal-compliance` | `docs/affiliate-technical-spec.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 5.6 | **Dev-Loop Tool** — ระบบ autonomous development | `devops-sre` | `tools/openthai_dev_loop.py` | ✅ เสร็จ 8 ก.ย. 2569 |

## 🌊 คลื่นงานที่ 6 — Professional Portal + Thai Eval + Glossary (เสร็จ 8 ก.ย. 2569)

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 6.1 | Professional Portal React Component — 3 สายวิชาชีพ (ทนาย/แพทย์/บัญชี) | `frontend-engineer` | `frontend/src/pages/ProfessionalPortalPage.jsx` | ✅ เสร็จ 8 ก.ย. 2569 |
| 6.2 | Thai Eval Suite v1 — 50 test cases ครอบคลุม 5 มิติ | `ai-ml-engineer` | `docs/thai-eval-suite-v1.json` | ✅ เสร็จ 8 ก.ย. 2569 |
| 6.3 | Dev Glossary — พจนานุกรมคำวัดดิจิทัล 50 คำ | `content-localization` | `docs/dev-glossary.md` | ✅ เสร็จ 8 ก.ย. 2569 |
| 6.4 | Civic Canon Infographic Spec — สเปกแผนผัง 3 ศาสนา | `content-localization` | `docs/civic-canon-infographic-spec.md` | ✅ เสร็จ 8 ก.ย. 2569 |

## ⚙️ คลื่นงานที่ 7 — Infrastructure & Real Work (เริ่ม 12 ก.ย. 2569)

> Wave นี้เน้น **implement จริง** ไม่ใช่ planning — ทำได้ทันทีไม่รอ Mythos
> รัน: `python tools/openthai_dev_loop.py --wave 7` หรือ `--loop` เพื่อรันต่อเนื่อง

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 7.1 | Secret Hygiene Guide — ขั้นตอน rotate credentials อย่างปลอดภัย | `security-guard` | `docs/secret-rotation-guide.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.2 | FastAPI Backend Stubs — implement Intermediary + Consumer API endpoints | `backend-engineer` | `backend/api/routes_wave7.py` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.3 | PDPA Audit Report — ตรวจ data flow ทุก Portal สร้าง pass/fail checklist | `legal-compliance` | `docs/pdpa-audit-wave7.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.4 | Thai Eval Runner Script — Python รัน Thai-eval-suite กับ LLM endpoint | `ai-ml-engineer` | `tools/thai_eval_runner.py` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.5 | Monitoring & Health Check Spec — status page + alert สำหรับทุก Portal | `devops-sre` | `docs/monitoring-spec.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.6 | KPI Dashboard Spec — 5 ตัวชี้วัดพร้อมวิธีวัดที่มีแหล่งที่มาจริง | `data-analytics` | `docs/kpi-dashboard-spec.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.7 | Content Audit — ตรวจและแก้ตัวเลขลอยในหนังสือหลัก | `content-localization` | `docs/content-audit-floating-numbers.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.8 | Community Strategy — แผนสร้าง Open Source community Thai developers | `ecosystem-agent` | `docs/community-strategy.md` | ✅ เสร็จ 12 ก.ย. 2569 |
| 7.9 | Wave 7 Summary — สรุป + อัปเดต backlog | `chief-of-staff` | `docs/wave7-summary.md` | ✅ เสร็จ 14 ก.ย. 2569 |

**Dev-Loop v3 commands:**
```bash
python tools/openthai_dev_loop.py --status          # ดูสถานะทุกงาน
python tools/openthai_dev_loop.py --run 7.1         # รันงานเดียว
python tools/openthai_dev_loop.py --wave 7          # รัน Wave 7 ทั้งหมด
python tools/openthai_dev_loop.py --wave 8          # รัน Wave 8 ทั้งหมด
python tools/openthai_dev_loop.py --loop            # รันต่อเนื่องไม่หยุด
python tools/openthai_dev_loop.py --loop --interval 600  # loop ทุก 10 นาที
python tools/openthai_dev_loop.py --dry-run --loop  # ทดสอบโดยไม่ใช้ API
```

## 🔗 คลื่นงานที่ 8 — Connect & Prove (เริ่ม 14 ก.ย. 2569)

> Wave นี้เน้น **เชื่อมต่อของจริง + พิสูจน์ด้วยตัวเลขจริง** — stub ทุกตัวใน Wave 7 ต้องมี integration จริง
> รัน: `python tools/openthai_dev_loop.py --wave 8`

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 8.1 | Consumer AI Integration — เชื่อม welfare check + contract summary กับ Anthropic API จริง | `backend-engineer` | `backend/api/consumer_ai.py` | ✅ เสร็จ 14 ก.ย. 2569 |
| 8.2 | Baseline Eval Run — รัน Thai Eval Suite กับ claude-haiku และบันทึกผลเป็น baseline | `ai-ml-engineer` | `docs/eval-baseline-wave8.md` | ✅ เสร็จ 14 ก.ย. 2569 (mock run — รอ API key เพื่อรันจริง) |
| 8.3 | Uptime Kuma Deployment — deploy monitoring จริงด้วย Docker Compose | `devops-sre` | `ops/docker-compose.monitoring.yml` + `ops/monitoring-setup.md` | ✅ เสร็จ 14 ก.ย. 2569 |
| 8.4 | GitHub Org Setup Checklist + Community Channels | `ecosystem-agent` | `docs/community-launch-checklist.md` | ✅ เสร็จ 14 ก.ย. 2569 |
| 8.5 | Shared Navigation + Auth Layer Spec | `frontend-engineer` | `docs/shared-nav-auth-spec.md` | ✅ เสร็จ 14 ก.ย. 2569 |
| 8.6 | Affiliate Commission Engine Stub | `blockchain-web3` | `backend/affiliate/commission_engine.py` | ✅ เสร็จ 14 ก.ย. 2569 (ผ่าน 5 tests) |

## 🔧 คลื่นงานที่ 9 — Frontend Integration (เริ่ม 14 ก.ย. 2569)

> Wave นี้เน้น **ต่อหน้าจอเข้ากับ backend จริง** — Portal ทุกตัวต้องเรียก API ได้จริง ไม่ใช่ static mock
> รัน: `python tools/openthai_dev_loop.py --wave 9`

| # | งาน | มอบให้ | ผลลัพธ์ | สถานะ |
|---|---|---|---|---|
| 9.1 | AppShell Component — implement TopNav + PortalSwitcher Phase 1 (ไม่มี auth) | `frontend-engineer` | `frontend/src/components/AppShell.jsx` | 🔴 ยังไม่เริ่ม |
| 9.2 | Consumer Portal API Wiring — เชื่อม UI กับ consumer_ai.py endpoints | `frontend-engineer` + `backend-engineer` | แก้ `ConsumerPortalPage.jsx` | 🔴 ยังไม่เริ่ม |
| 9.3 | Intermediary HS Code Search — เชื่อม UI กับ AI ค้นหา HS Code | `frontend-engineer` + `backend-engineer` | แก้ `IntermediaryPortalPage.jsx` | 🔴 ยังไม่เริ่ม |
| 9.4 | Makefile — รวม dev commands ให้ครบ (frontend, backend, monitoring, test) | `devops-sre` | `Makefile` ที่ root | ✅ เสร็จ 14 ก.ย. 2569 |
| 9.5 | Wave 8 Real Eval Run — รัน eval กับ API key จริงเมื่อ Mythos ตั้งค่า | `ai-ml-engineer` | `docs/eval-baseline-wave8-real.md` | ⏸ รอ ANTHROPIC_API_KEY |
| 9.6 | Intermediary AI Integration — เชื่อม trade-doc summary กับ Anthropic API | `backend-engineer` | `backend/api/intermediary_ai.py` | 🔴 ยังไม่เริ่ม |

---

## 🚧 รอ Mythos อนุมัติก่อนทำ

| งาน | เหตุผล |
|---|---|
| Deploy ขึ้น production ทุกกรณี | นโยบายข้อ 6 ในคำสั่งถาวร |
| `git push` / เปิด repo สาธารณะ | ต้องผ่าน legal + security ก่อน |
| เผยแพร่หนังสือสู่สาธารณะ | ต้องแทนที่ตัวเลขกรณีศึกษาที่ยังไม่มีที่มา |
| ติดต่อหน่วยงานรัฐ / ส่งอีเมล | ต้องได้รับคำสั่งโดยตรง |

---

## ⚠️ หนี้ทางเทคนิคและความเสี่ยงที่ค้างอยู่

| ประเด็น | ความเสี่ยง | เจ้าของ |
|---|---|---|
| ตัวเลขกรณีศึกษาในหนังสือยังไม่มีที่มา (42%, 60%, 35%, 3.2 เท่า) | เผยแพร่แล้วถูกท้วงติงได้ | content-localization + legal |
| ชื่อโมเดลบน Hugging Face ยังไม่ยืนยันว่าตรงของจริง | เอกสารเทคนิคใช้ไม่ได้ | ai-ml-engineer |
| ยังไม่มี Thai Eval Suite | อ้างว่า "ลดโทเคน 50%" โดยไม่มีเบนช์มาร์กสาธารณะ | ai-ml-engineer |
| ~~ยังไม่มี staging environment~~ | ✅ สร้างแล้ว `docker-compose.staging.yml` 20 ส.ค. 2569 | devops-sre |

---

## 📝 วิธีใช้แฟ้มนี้

**เรียกทีมทำงาน:** พิมพ์ชื่อ agent ตรง ๆ เช่น *"ให้ professional-agent ออกแบบโมดูลสำหรับทนายความ"*
**โจทย์กว้าง ๆ:** เรียก `chief-of-staff` แล้วเขาจะแตกงานและมอบหมายให้เอง
**อัปเดตสถานะ:** 🔴 ยังไม่เริ่ม → 🟡 กำลังทำ → ✅ เสร็จ (พร้อมลิงก์ไฟล์ผลลัพธ์)

---

## 🚀 Action Plan: ทำก่อน / ทำต่อ / ทำทีหลัง

### 1. ทำก่อนทันที (ความเสี่ยงสูงสุด)

#### A. Compliance & Security Gate
- [ ] Audit PDPA + data flow ทุกฟีเจอร์หลัก
- [ ] จัดทำ consent flow และ legal sign-off สำหรับฟีเจอร์ที่เก็บข้อมูลส่วนบุคคล
- [ ] กำหนดกฎว่า "ไม่มีการเก็บ/ส่งข้อมูลส่วนบุคคลโดยไม่มีอนุญาต" 
- [ ] สรุปผลตรวจเป็น pass/fail checklist ให้แต่ละ agent เห็นชัด
- [ ] จัดทำร่าง policy สำหรับข้อมูลที่ใช้ AI และข้อมูลที่ไม่ควรใช้ AI

#### B. Production Readiness
- [ ] สร้าง staging environment สำหรับทุกฟีเจอร์ที่ใช้งานจริง
- [ ] ตั้ง deployment gate แบบ mandatory review ก่อน production
- [ ] กำหนด rollback plan, monitoring, alert และ log retention
- [ ] เพิ่ม health check และ status page สำหรับ production
- [ ] ห้าม deploy direct ไป production ถ้ายังไม่มี review sign-off

#### C. Validation & Benchmarks
- [ ] ทำ Thai Eval Suite ให้เป็น benchmark จริงและมีวิธีวัดชัดเจน
- [ ] จัดทำสถิติที่มีแหล่งที่มา, วันที่, วิธีวัด และเงื่อนไขใช้งาน
- [ ] ห้ามอ้างผลลัพธ์ที่ไม่มี public benchmark หรือ source traceability
- [ ] จัดทำ dashboard KPI สำหรับ Accuracy, Latency, Conversion, Trust score

#### D. Secret Hygiene
- [x] ~~ย้าย API key / secret / credential ออกจาก repo~~ ✅ gitignore ครอบคลุมแล้ว 20 ส.ค. 2569
- [x] ~~เพิ่ม `.gitignore` สำหรับไฟล์ที่มีความอ่อนไหว~~ ✅ .env.*, *passwords*.csv, *API KEY*.txt
- [x] ~~ใช้ secret manager หรือ environment vault~~ ✅ vault.js (AES-256-GCM) + SoftHSM2
- [ ] **Rotate GitHub OAuth token** (gho_1NZ...USG7 — ต้อง revoke ที่ GitHub Settings ด่วน)
- [ ] Rotate keys และตรวจทุก 90 วัน
- [ ] ตรวจสอบความลับที่ค้างอยู่ใน logs / cache / backup

### 2. ทำต่อ: ปิดช่องว่างตาม 6 กลุ่มผู้ใช้

#### กลุ่มที่ 2 — คนกลางทุกประเภท
- [x] ขยายแผนจาก “โลจิสติกส์” เป็น 7 ประเภทจริง
- [x] วาง user flow, pain point และ offer สำหรับแต่ละประเภท
- [x] **สร้าง Intermediary Portal MVP** ✅ เสร็จ 22 ส.ค. 2569 → `frontend/src/pages/IntermediaryPortalPage.jsx` (route: `/intermediary`)
  - [x] ตัวแทนจำหน่าย
  - [x] นายหน้า
  - [x] ผู้ส่งออก/นำเข้า (พร้อม HS Code search + Incoterms 2020)
  - [x] คลังสินค้า
  - [x] ผู้จัดจำหน่าย
  - [x] ผู้ประสานการค้า
  - [x] ผู้ดูแลโซ่อุปทาน
- [ ] เชื่อม `/api/intermediary/register` กับ backend จริง
- [ ] เชื่อม `/api/intermediary/hs-code` กับ AI/customs API

#### กลุ่มที่ 4 — ผู้บริโภค
- [x] **สร้าง Consumer Portal MVP** ✅ เสร็จ 22 ส.ค. 2569 → `frontend/src/pages/ConsumerPortalPage.jsx` (route: `/consumer`)
  - [x] ตรวจสิทธิ์สวัสดิการ (6 โปรแกรม: บัตรคนจน, ประกันสังคม, เบี้ยผู้สูงอายุ, เบี้ยคนพิการ, เงินอุดหนุนบุตร, กอช.)
  - [x] เปรียบเทียบสินค้าอัจฉริยะ (พร้อม guardrail disclaimer)
  - [x] ย่อยสัญญา/TOS
  - [x] หน้าสิทธิผู้บริโภค (4 สาย + hotline)
- [ ] เชื่อม `/api/consumer/compare` + `/api/consumer/summarize-contract` กับ AI backend
- [ ] เพิ่มระบบรีวิวและความน่าเชื่อถือ

#### กลุ่มที่ 6 — สายวิชาชีพ
- [ ] เลือก 2–3 กลุ่มก่อน เช่น ทนายความ / แพทย์ / นักบัญชี
- [ ] กำหนดข้อมูลที่ใช้ได้และข้อมูลที่ไม่ควรใช้ AI
- [ ] ระบุกรอบกฎหมายและระดับความเสี่ยงต่อแต่ละสาย
- [ ] สร้าง Professional Module MVP
- [ ] แยกส่วนที่ AI ช่วยได้และส่วนที่ต้องมีคนตรวจ

### 3. สร้างผลงานจริงตามลำดับความสำคัญ

#### Phase 1: 0–30 วัน
- [ ] รวบรวม legal gate + risk register
- [ ] ตั้ง staging environment
- [ ] ตั้ง secret management
- [ ] สร้าง deployment checklist + rollback script
- [ ] เริ่ม Consumer Portal MVP
- [ ] เริ่ม Intermediary Portal MVP
- [ ] เริ่ม Professional Module MVP สำหรับ 1–2 กลุ่ม

#### Phase 2: 30–60 วัน
- [ ] ทำ Thai Eval Suite แบบมีตัวเลขจริง
- [ ] สร้าง dashboard KPI สำหรับธุรกิจ
- [ ] ปรับ RAG + Guardrails สำหรับข้อมูลเชิงวิชาชีพ
- [ ] Review workflow ของทีม agents และปรับ owner ให้ชัด
- [ ] เพิ่ม monitoring / alert / anomaly review

#### Phase 3: 60–90 วัน
- [ ] เปิดใช้งานจริงต่อกลุ่มที่ผ่านเกณฑ์
- [ ] ปรับ funnel / affiliate / legal model
- [ ] รับรองว่า Non-MLM, Compliance, On-Premise และภาระผูกกับกฎหมาย
- [ ] จัดทำรายงานสถานะที่มีหลักฐานในทุกโมดูล

### 4. Todo list แบบกระชับสำหรับทีม

#### งานหัวใจที่ต้องเริ่ม
- [ ] Audit PDPA + data flow ทุกฟีเจอร์หลัก
- [ ] สร้าง staging environment
- [ ] ตั้ง deployment gate + rollback
- [ ] ทำ secret manager + rotate keys
- [ ] สร้าง Consumer Portal MVP
- [ ] สร้าง Intermediary Portal MVP
- [ ] สร้าง Professional module MVP
- [ ] ทำ Thai Eval Suite แบบมีตัวเลขจริง
- [ ] ทบทวน affiliate/legal model
- [ ] ตั้ง KPI dashboard สำหรับสุขภาพธุรกิจ

#### งานรองที่ควรทำหลังจากหัวใจ
- [ ] ปรับ doc และ repository structure
- [ ] จัดการสถานะทีม/owner ทุกแผนงาน
- [ ] ทำแผน Launch แบบ step-by-step
- [ ] ตรวจความถูกต้องของโมเดลและแหล่งอ้างอิง

---

## ✅ สรุปสั้น

สิ่งที่ “อ่อน” และ “ขาด” มากที่สุดไม่ได้อยู่ที่ไอเดีย แต่ที่แท้จริงคือ:

- การรองรับกลุ่มผู้ใช้ที่ยังไม่ครบ
- ความพร้อมสำหรับ production
- การพิสูจน์ผลจริง
- การผ่านกฎ PDPA / security
- การป้องกันความเสี่ยงทางกฎหมายและเทคนิค

ดังนั้นลำดับการทำที่เหมาะสมคือ:
1. Compliance + staging + secret hygiene
2. Portal ที่ยังขาดจริง (Consumer / Intermediary / Professional)
3. Benchmark + validation + launch gate

---

**Owner Recommendation:**
- `legal-compliance` + `security-guard` → compliance & security gate
- `devops-sre` → staging & deployment readiness
- `ai-ml-engineer` → Thai Eval Suite & benchmark
- `consumer-agent` + `frontend-engineer` → Consumer portal
- `intermediary-agent` + `frontend-engineer` → Intermediary portal
- `professional-agent` + `legal-compliance` → Professional module
- `chief-of-staff` → orchestration และ owner tracking
