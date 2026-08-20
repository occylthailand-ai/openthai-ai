# OpenThaiAi — Agent Task Breakdown

**เริ่มวันที่:** 17 ส.ค. 2569  
**อ้างอิง:** `CLAUDE.md`, `docs/TEAM-BACKLOG.md`, `docs/30-DAY-BACKLOG.md`, `docs/AGENT-BACKLOG.md`

> Roadmap แบบสรุป 30/60/90 วัน: [docs/ROADMAP-30-60-90.md](ROADMAP-30-60-90.md)

---

## 1. วัตถุประสงค์

เอกสารนี้จะทำให้แต่ละ agent มี task list ที่สามารถเริ่มทำได้ทันที โดยเริ่มจาก P0 ก่อน และแบ่งงานเป็น task แบบปฏิบัติจริง พร้อม owner, deliverable, acceptance criteria และ dependency

---

## 2. P0 — Workstream ที่ต้องเริ่มก่อน

### 2.1 `legal-compliance`

#### Task L-01: Audit PDPA + Data Flow
- Owner: `legal-compliance`
- Due: 3 วัน
- Goal: สรุปว่าฟีเจอร์ใดเก็บข้อมูลอะไร และมีฐานกฎหมายหรือไม่
- Deliverable:
  - [ ] Data inventory
  - [ ] Data flow map
  - [ ] Risk register
- Acceptance criteria:
  - [ ] ทุกฟีเจอร์หลักมี owner ของข้อมูลชัดเจน
  - [ ] ระบุ data type, storage, transfer, retention
  - [ ] มี legal basis สำหรับทุกการเก็บข้อมูล

#### Task L-02: Affiliate / Non-MLM Review
- Owner: `legal-compliance`
- Due: 5 วัน
- Goal: ตรวจว่า affiliate model ไม่กลายเป็น MLM หรือผิดข้อกำหนด
- Deliverable:
  - [ ] Affiliate policy review
  - [ ] Non-MLM checklist
  - [ ] Sign-off recommendation
- Acceptance criteria:
  - [ ] ไม่มีการจ่ายจากค่าสมัคร
  - [ ] ไม่ลึกเกิน 2 ชั้น
  - [ ] ค่าตอบแทนเชื่อมโยงกับยอดขายจริงเท่านั้น

#### Task L-03: Professional Module Compliance Check
- Owner: `legal-compliance`
- Due: 7 วัน
- Goal: ตรวจว่าความช่วยเหลือ AI ไม่ล้ำเส้นสภาวิชาชีพหรือกฎหมาย
- Deliverable:
  - [ ] Professional risk matrix
  - [ ] Allowed / prohibited use cases
- Acceptance criteria:
  - [ ] มีกรอบกฎหมายและระดับความเสี่ยงชัดเจน
  - [ ] ระบุอะไรที่ต้องมีคนตรวจจริง

### 2.2 `security-guard`

#### Task S-01: Secret Hygiene Review
- Owner: `security-guard`
- Due: 2 วัน
- Goal: ลบ credentials ที่ค้างอยู่ใน repo หรือ filesystem
- Deliverable:
  - [ ] Secret inventory
  - [ ] Rotation plan
  - [ ] Remediation list
- Acceptance criteria:
  - [ ] ไม่มี API key / password / token รั่วใน repo
  - [ ] มี secret manager หรือ env vault

#### Task S-02: Security Checklist for Production
- Owner: `security-guard`
- Due: 4 วัน
- Goal: ตรวจว่าฟีเจอร์ใดพร้อม deploy หรือไม่
- Deliverable:
  - [ ] Security checklist
  - [ ] High-risk findings
  - [ ] Hardening actions
- Acceptance criteria:
  - [ ] มี clear go/no-go criteria
  - [ ] ทุก high-risk issue มี owner และ due date

#### Task S-03: AI Guardrails Review
- Owner: `security-guard`
- Due: 5 วัน
- Goal: ตรวจความเสี่ยงของ prompt, data leakage, unsafe output
- Deliverable:
  - [ ] Guardrail list
  - [ ] Risk areas
  - [ ] Recommended mitigation
- Acceptance criteria:
  - [ ] ระบุ sensitive cases
  - [ ] ระบุ fallback behavior สำหรับ misuse

### 2.3 `devops-sre`

#### Task D-01: Staging Environment Setup
- Owner: `devops-sre`
- Due: 5 วัน
- Goal: สร้าง environment สำหรับตรวจก่อน production
- Deliverable:
  - [ ] Staging environment
  - [ ] Environment variables
  - [ ] Setup docs
- Acceptance criteria:
  - [ ] สร้างสภาพแวดล้อมสำหรับทุกฟีเจอร์หลักได้
  - [ ] deploy ไป staging ได้จริง

#### Task D-02: Deployment Gate + Rollback Runbook
- Owner: `devops-sre`
- Due: 7 วัน
- Goal: ลดความเสี่ยงเรื่อง deploy ผิด
- Deliverable:
  - [ ] Deployment checklist
  - [ ] Rollback procedure
  - [ ] Runbook
- Acceptance criteria:
  - [ ] ทุก deploy ต้องมี approval
  - [ ] rollback ทำได้จริงภายในเวลาที่พอเหมาะ

#### Task D-03: Monitoring + Alerting Baseline
- Owner: `devops-sre`
- Due: 7 วัน
- Goal: การตรวจคลื่น/ความผิดปกติแบบ real-time
- Deliverable:
  - [ ] Alert rules
  - [ ] Health check
  - [ ] Log retention policy
- Acceptance criteria:
  - [ ] มี alert สำหรับ error, latency, deployment failure
  - [ ] มี status page หรือ dashboard ที่ใช้งานได้

### 2.4 `ai-ml-engineer`

#### Task A-01: Thai Eval Suite Setup
- Owner: `ai-ml-engineer`
- Due: 10 วัน
- Goal: ทำ benchmark แบบมีแหล่งที่มาและเห็นได้จริง
- Deliverable:
  - [ ] Eval dataset
  - [ ] Metric definitions
  - [ ] Evaluation script
  - [ ] Benchmark report
- Acceptance criteria:
  - [ ] ทุกตัวเลขมี source, date, method
  - [ ] มี benchmark สำหรับ relevant use cases
  - [ ] ไม่มีสถิติแบบ “ดูดีแต่ไม่มีหลักฐาน”

#### Task A-02: AI Guardrails and RAG Review
- Owner: `ai-ml-engineer`
- Due: 12 วัน
- Goal: ทดสอบว่าความแม่นยำและความปลอดภัยเพียงพอหรือยัง
- Deliverable:
  - [ ] RAG validation checklist
  - [ ] Guardrail test cases
  - [ ] Improvement plan
- Acceptance criteria:
  - [ ] เอกสารและคำตอบไม่รั่วข้อมูลที่ไม่ควรเข้าถึง
  - [ ] มี fallback เมื่อมีกลุ่มข้อมูลเสี่ยง

---

## 3. P1 — Customer and User-facing Workstreams

### 3.1 `consumer-agent`

#### Task C-01: Consumer Persona and Needs
- Owner: `consumer-agent`
- Due: 4 วัน
- Goal: สร้างภาพผู้ใช้สำหรับผู้บริโภคจริง
- Deliverable:
  - [ ] Persona map
  - [ ] Customer pain points
  - [ ] Needs and jobs-to-be-done
- Acceptance criteria:
  - [ ] มีผู้ใช้ 3–5 กลุ่มที่ชัดเจน
  - [ ] ระบุค่าและ pain point ที่ต้องแก้

#### Task C-02: Consumer Portal MVP Scope
- Owner: `consumer-agent` + `frontend-engineer`
- Due: 10 วัน
- Goal: กำหนด MVP ที่ใช้งานได้จริง
- Deliverable:
  - [ ] User flow
  - [ ] Required screens
  - [ ] MVP feature list
- Acceptance criteria:
  - [ ] Search, trust, rights, and access flow มีชัดเจน
  - [ ] สามารถบอกได้ว่าตั้งแต่เริ่มใช้จนถึงเสร็จสิ้นที่ไหน

### 3.2 `intermediary-agent`

#### Task I-01: 7 Segment Mapping
- Owner: `intermediary-agent`
- Due: 5 วัน
- Goal: ระบุคนกลาง 7 ประเภทและความต้องการของแต่ละประเภท
- Deliverable:
  - [ ] Segment map
  - [ ] Role-to-value chart
- Acceptance criteria:
  - [ ] ครอบคลุม 7 ประเภทจริง
  - [ ] ค่าแต่ละ segment ถูกระบุชัดเจน

#### Task I-02: Intermediary Portal MVP
- Owner: `intermediary-agent` + `frontend-engineer`
- Due: 12 วัน
- Goal: สร้าง portal ให้คนกลางใช้งานได้จริง
- Deliverable:
  - [ ] Flow for each segment
  - [ ] Portal screen spec
  - [ ] MVP UI
- Acceptance criteria:
  - [ ] มีงานหลักและ flow ที่ใช้ได้เพียงพอ
  - [ ] ผู้ใช้สามารถเข้าใจว่าตัวเองได้รับอะไร

### 3.3 `professional-agent`

#### Task P-01: Select Priority Professions
- Owner: `professional-agent`
- Due: 4 วัน
- Goal: เลือก 2–3 กลุ่มก่อนเพื่อให้เข้าใจภาระจริง
- Deliverable:
  - [ ] Profession shortlist
  - [ ] Risk level and constraints
- Acceptance criteria:
  - [ ] มีความชัดเจนว่าทำกลุ่มไหนก่อนและเหตุผลอะไร

#### Task P-02: Professional Module MVP
- Owner: `professional-agent` + `legal-compliance` + `frontend-engineer`
- Due: 15 วัน
- Goal: จัดทำ module ที่คนในสายงานใช้ได้จริง
- Deliverable:
  - [ ] Use-case definition
  - [ ] Risk matrix
  - [ ] MVP UI
- Acceptance criteria:
  - [ ] มีส่วนที่ AI ช่วยได้และส่วนที่ต้องมีคนตรวจชัดเจน
  - [ ] มี guardrail และ safe operation path

### 3.4 `data-analytics`

#### Task DA-01: KPI Dashboard
- Owner: `data-analytics`
- Due: 7 วัน
- Goal: วัดสุขภาพธุรกิจ และประสิทธิภาพการใช้งาน
- Deliverable:
  - [ ] KPI list
  - [ ] Dashboard mockup
  - [ ] Data source mapping
- Acceptance criteria:
  - [ ] สามต่อกับระบบที่มีจริง
  - [ ] มี metrics สำหรับ trust, conversion, engagement, operational health

### 3.5 `growth-community`

#### Task G-01: Funnel + Marketing Funnel Review
- Owner: `growth-community`
- Due: 7 วัน
- Goal: ดูว่าจุดติดตาม lead และ conversion จริงหรือยัง
- Deliverable:
  - [ ] Funnel map
  - [ ] Campaign plan
  - [ ] Conversion tracking requirement
- Acceptance criteria:
  - [ ] มีวาง funnel ให้เห็นการเปลี่ยนผ่าน
  - [ ] มีแผน outreach ที่เชื่อมกับ target user

### 3.6 `frontend-engineer`

#### Task F-01: Shared UI Foundation
- Owner: `frontend-engineer`
- Due: 5 วัน
- Goal: สร้าง base UI ที่สามารถใช้ร่วมได้
- Deliverable:
  - [ ] Design tokens
  - [ ] Shared layout
  - [ ] Component library
- Acceptance criteria:
  - [ ] CSS/theme และ component ใช้งานร่วมกันได้
  - [ ] สามารถนำไปใช้กับ portal หลัก ๆ

---

## 4. P2 — Post-Foundation Work

### 4.1 `chief-of-staff`

#### Task CH-01: Cross-team Status Board
- Owner: `chief-of-staff`
- Due: 3 วัน
- Goal: ควบคุมความก้าวหน้าทั้งระบบ
- Deliverable:
  - [ ] Dashboard of status
  - [ ] Blocker list
  - [ ] Weekly summary
- Acceptance criteria:
  - [ ] ทุก task มี owner
  - [ ] blocker ถูกทำให้เห็นอย่างชัดเจน

#### Task CH-02: Launch Gate Review
- Owner: `chief-of-staff`
- Due: 7 วัน
- Goal: ให้แน่ใจว่าความพร้อมก่อน production
- Deliverable:
  - [ ] Launch checklist
  - [ ] Go/no-go readout
- Acceptance criteria:
  - [ ] มี review จาก legal, security, devops, AI
  - [ ] Mythos approve ก่อน deploy

---

## 5. Dependency Map

- `legal-compliance` ต้องให้ green light ก่อน `professional-agent` และ `growth-community` เยอะครับ
- `security-guard` ต้องทำก่อน `devops-sre` deploy และ `ai-ml-engineer` validation
- `devops-sre` ต้องตั้ง staging ให้เสร็จก่อน `frontend-engineer` ดึง flow จริง
- `ai-ml-engineer` ตรงมากกับ `data-analytics` และ `professional-agent`
- `chief-of-staff` เป็น hub ที่ติดตามทุก task

---

## 6. Definition of Done สำหรับ task รายชิ้น

Task ถือว่าจบเมื่อ:
- [ ] มี owner ชัดเจน
- [ ] มี output ที่จับต้องได้
- [ ] ตรวจผลแล้ว
- [ ] มี blocking item หรือ next step ระบุชัด
- [ ] มี link หรือไฟล์อ้างอิงถ้าจำเป็น

---

## 7. Next Action

เริ่มจาก task ต่อไปนี้ก่อน:

- [ ] L-01 Audit PDPA + Data Flow
- [ ] S-01 Secret Hygiene Review
- [ ] D-01 Staging Environment Setup
- [ ] A-01 Thai Eval Suite Setup
- [ ] CH-01 Cross-team Status Board

เมื่อ P0 เสร็จสิ้นแล้ว ให้เริ่มตามลำดับ:

- [ ] C-02 Consumer Portal MVP Scope
- [ ] I-02 Intermediary Portal MVP
- [ ] P-02 Professional Module MVP
- [ ] DA-01 KPI Dashboard

---

**Conclusion:** เวลาที่เหมาะสมที่สุดคือเริ่มจาก risk controls แล้วค่อยสร้าง value delivery อย่างเป็นระบบ ไม่ใช่เริ่มจาก UI ก่อน
