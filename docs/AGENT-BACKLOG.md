# OpenThaiAi — Agent-by-Agent Backlog

**เริ่มวันที่:** 17 ส.ค. 2569  
**อ้างอิง:** `CLAUDE.md`, `docs/TEAM-BACKLOG.md`, `docs/30-DAY-BACKLOG.md`

> ดูรายละเอียด task รายชิ้นเพิ่มเติมใน [docs/AGENT-TASK-BREAKDOWN.md](AGENT-TASK-BREAKDOWN.md)
> ดู Roadmap 30/60/90 วัน แบบสรุปใน [docs/ROADMAP-30-60-90.md](ROADMAP-30-60-90.md)

---

## 1. วัตถุประสงค์

เอกสารนี้แยกงานออกเป็นแต่ละ agent ให้เห็นชัดว่าใครควรทำอะไรและเมื่อไร เพื่อให้ทีมทำงานต่อเนื่องและราบรื่น โดยให้เริ่มจาก P0 ก่อนเสมอ

---

## 2. บทบาทและความรับผิดชอบ

### `chief-of-staff`

**หน้าที่หลัก**
- [ ] จัดทำ status board และ owner tracking
- [ ] ตรวจว่า task ทั้งหมดมีคนรับผิดชอบชัดเจน
- [ ] ปิด blocker ที่ข้ามหรือล่าช้า
- [ ] ทำ go/no-go review ก่อน deploy production
- [ ] จัดทำรายงานสรุปความคืบหน้าให้ Mythos

**Deliverables**
- [ ] status dashboard
- [ ] blocker log
- [ ] go-live gate checklist

### `legal-compliance`

**หน้าที่หลัก**
- [ ] Audit PDPA + data flow ทุกฟีเจอร์หลัก
- [ ] ตรวจ affiliate model และ Non-MLM compliance
- [ ] ระบุความเสี่ยงทางกฎหมายต่อฟีเจอร์แต่ละตัว
- [ ] จัดทำ legal sign-off checklist
- [ ] ตรวจ Professional module ว่าล้ำเส้นสภาวิชาชีพหรือไม่

**Deliverables**
- [ ] PDPA data map
- [ ] affiliate/legal checklist
- [ ] risk register สำหรับแต่ละโมดูล

### `security-guard`

**หน้าที่หลัก**
- [ ] ตรวจ secrets, credentials, API keys, config files
- [ ] จัดทำ security review checklist
- [ ] ประเมิน exposure และ risk
- [ ] ตรวจ guardrails สำหรับ AI workflows
- [ ] Review sensitive data handling

**Deliverables**
- [ ] secret inventory
- [ ] security risk report
- [ ] guardrail checklist

### `devops-sre`

**หน้าที่หลัก**
- [ ] ตั้ง staging environment
- [ ] ตั้ง deployment gate
- [ ] สร้าง rollback plan
- [ ] เพิ่ม monitoring + alerting
- [ ] จัดทำ runbook สำหรับ production incident

**Deliverables**
- [ ] staging env
- [ ] rollback runbook
- [ ] alert rules
- [ ] deployment checklist

### `ai-ml-engineer`

**หน้าที่หลัก**
- [ ] ทำ Thai Eval Suite แบบมี benchmark จริง
- [ ] ระบุวิธีวัด, dataset, metric และ date
- [ ] ปรับ RAG + Guardrails สำหรับข้อมูลวิชาชีพ
- [ ] ตรวจความถูกต้องของโมเดลและการตอบกลับ

**Deliverables**
- [ ] benchmark report
- [ ] eval dataset
- [ ] guardrail spec

### `data-analytics`

**หน้าที่หลัก**
- [ ] สร้าง KPI dashboard สำหรับธุรกิจ
- [ ] จัดทำ funnel tracking
- [ ] ตรวจ conversion, trust, engagement และ revenue signal
- [ ] ทำรายงานสถิติที่มี source

**Deliverables**
- [ ] KPI dashboard
- [ ] funnel/report
- [ ] source-backed metrics

### `consumer-agent`

**หน้าที่หลัก**
- [ ] กำหนดผังผู้ใช้สำหรับ Consumer Portal
- [ ] ระบุ pain point + jobs-to-be-done
- [ ] ทำ MVP flows สำหรับสินค้า/สิทธิ/ความน่าเชื่อถือ
- [ ] ตรวจ feedback loop

**Deliverables**
- [ ] user story list
- [ ] consumer flow map
- [ ] MVP scope document

### `intermediary-agent`

**หน้าที่หลัก**
- [ ] กำหนด user segment สำหรับคนกลาง 7 ประเภท
- [ ] วาง MVP flows สำหรับแต่ละ segment
- [ ] ออกแบบ offer และ workflow
- [ ] ตรวจความแตกต่างระหว่างคนกลางแต่ละประเภท

**Deliverables**
- [ ] intermediary segment map
- [ ] MVP flow specs
- [ ] offer definition

### `professional-agent`

**หน้าที่หลัก**
- [ ] เลือก 2–3 กลุ่มสายวิชาชีพก่อน
- [ ] กำหนดความเสี่ยงและข้อจำกัดของข้อมูล
- [ ] ทำ Professional Module MVP
- [ ] ระบุส่วนที่ AI ช่วยและส่วนที่ต้องมีคนตรวจ

**Deliverables**
- [ ] professional use-case list
- [ ] module scope
- [ ] risk / safety matrix

### `frontend-engineer`

**หน้าที่หลัก**
- [ ] สร้าง Consumer Portal UI
- [ ] สร้าง Intermediary Portal UI
- [ ] สร้าง Professional Module UI
- [ ] ทำ UX flow ที่ตรงกับ acceptance criteria

**Deliverables**
- [ ] working UI
- [ ] component library
- [ ] mock flows + frontend QA checklist

### `growth-community`

**หน้าที่หลัก**
- [ ] ทำ funnel และ acquisition plan
- [ ] ตรวจ onboarding flow และ conversion
- [ ] เพิ่ม growth tracking สำหรับ portal ใหม่
- [ ] เสนอยุทธศาสตร์ outreach แบบจริง

**Deliverables**
- [ ] growth funnel
- [ ] outreach plan
- [ ] acquisition metrics

---

## 3. Timeline ราย agent

### Week 1 — Risk and control

- [ ] `legal-compliance` — PDPA + affiliate/legal review
- [ ] `security-guard` — secret scan + review
- [ ] `devops-sre` — staging + deploy gates
- [ ] `chief-of-staff` — status board and blocker tracking

### Week 2 — Foundation and validation

- [ ] `ai-ml-engineer` — Thai Eval Suite + benchmark
- [ ] `data-analytics` — KPI dashboard template
- [ ] `devops-sre` — rollback + monitoring
- [ ] `chief-of-staff` — review progress and unblock

### Week 3 — User portal deliverables

- [ ] `consumer-agent` + `frontend-engineer` — Consumer Portal MVP
- [ ] `intermediary-agent` + `frontend-engineer` — Intermediary Portal MVP
- [ ] `professional-agent` + `legal-compliance` — Professional Module MVP

### Week 4 — Launch readiness

- [ ] `chief-of-staff` + `devops-sre` — go-live review
- [ ] `legal-compliance` + `security-guard` — final compliance sign-off
- [ ] `ai-ml-engineer` + `data-analytics` — final validation and metrics report
- [ ] `growth-community` — acquisition plan + funnel check

---

## 4. Priority stack

### P0 — ต้องเสร็จก่อน
- [ ] PDPA / legal / data flow
- [ ] staging environment
- [ ] secrets hygiene
- [ ] rollback & monitoring
- [ ] Thai Eval Suite

### P1 — ทำต่อทันที
- [ ] Consumer portal MVP
- [ ] Intermediary portal MVP
- [ ] Professional module MVP
- [ ] KPI dashboard
- [ ] affiliate/legal validation

### P2 — ทำหลังจาก P0/P1
- [ ] RAG + Guardrails
- [ ] funnel/marketing tracking
- [ ] repo cleanup
- [ ] launch gate checklist

---

## 5. Definition of Done สำหรับแต่ละ Agent

แต่ละ agent ต้องมี:
- [ ] task list ที่ชัดเจน
- [ ] owner เดียว
- [ ] tangible output
- [ ] verification หรือ evidence
- [ ] ช่วงสิ่งที่ยังไม่เสร็จ/ติด blocker

---

## 6. Summary

สิ่งที่ต้องเร่งจริงคือการปิดความเสี่ยงก่อน แล้วค่อยสร้างฟีเจอร์ที่ช่วยผู้ใช้จริง โดย agent โครงสร้างมีความชัดเจนแล้ว แต่สิ่งที่ขาดคือการจับงานเป็น executable backlog ที่มี owner และ verification ได้ชัดเจน

---

**Next Action:** ให้ `legal-compliance`, `security-guard`, `devops-sre`, และ `ai-ml-engineer` เริ่ม task P0 ก่อนโดยตรง
