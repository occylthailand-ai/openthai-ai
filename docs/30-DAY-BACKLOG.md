# OpenThaiAi — 30-Day Execution Backlog

**เริ่มวันที่:** 17 ส.ค. 2569  
**แก้ไขล่าสุด:** 17 ส.ค. 2569  
**ผู้บัญชาการ:** Mythos  
**อ้างอิง:** `CLAUDE.md`, `docs/TEAM-BACKLOG.md`, `00-OPENTHAI-AI-INDEX.md`

---

## 1. วัตถุประสงค์

สรุปให้เห็นว่าควรทำอะไรก่อน เพื่อให้ OpenThaiAi ขยับจาก “เอกสารและสเปก” ไปสู่ “ระบบจริงที่พร้อมเปิดใช้งานได้” โดยให้ความสำคัญกับความเสี่ยงและการพิสูจน์ผลมากที่สุดก่อน.

---

## 2. หลักการทำงาน

1. ทำงานตามลำดับความเสี่ยง: Compliance → Production → User value → Validation
2. ทุก feature ต้องมี owner ชัดเจน
3. ทุก deliverable ต้องมี evidence ที่ตรวจได้
4. ห้าม deploy ใน production โดยไม่มี staging + review
5. ห้ามอ้างตัวเลขหรือ KPI ที่ไม่มีแหล่งที่มา

---

## 3. Backlog ระดับความสำคัญ

### Priority P0 — ต้องทำก่อนทันที

| ID | ชื่องาน | Owner | Due | Deliverable | Status |
|---|---|---|---|---|---|
| P0-01 | Audit PDPA + data flow ทุกฟีเจอร์หลัก | `legal-compliance` + `security-guard` | 3 วัน | Data flow map + risk register | 🔴 |
| P0-02 | ตั้ง staging environment + deployment guardrail | `devops-sre` | 5 วัน | Staging env + deploy checklist | 🔴 |
| P0-03 | Secret hygiene / rotate keys / remove sensitive files | `security-guard` + `devops-sre` | 3 วัน | Secrets inventory + remediation | 🔴 |
| P0-04 | Deployment rollback + monitoring baseline | `devops-sre` | 7 วัน | Rollback runbook + alert rules | 🔴 |
| P0-05 | Thai Eval Suite แบบมี benchmark จริง | `ai-ml-engineer` | 10 วัน | Eval report + dataset + method | 🔴 |

### Priority P1 — ปิดช่องว่างของผู้ใช้

| ID | ชื่องาน | Owner | Due | Deliverable | Status |
|---|---|---|---|---|---|
| P1-01 | Consumer Portal MVP | `consumer-agent` + `frontend-engineer` | 14 วัน | Landing + flows + dashboard | 🔴 |
| P1-02 | Intermediary Portal MVP | `intermediary-agent` + `frontend-engineer` | 14 วัน | 7-user-segment flow | 🔴 |
| P1-03 | Professional Module MVP (2 กลุ่มแรก) | `professional-agent` + `legal-compliance` | 20 วัน | Module + risk gate + UI | 🔴 |
| P1-04 | KPI dashboard สำหรับธุรกิจ | `data-analytics` | 10 วัน | Metrics dashboard | 🔴 |
| P1-05 | Affiliate/legal review และ Non-MLM validation | `legal-compliance` | 7 วัน | Compliance checklist + legal sign-off | 🔴 |

### Priority P2 — ทำต่อหลังจากหลักแล้ว

| ID | ชื่องาน | Owner | Due | Deliverable | Status |
|---|---|---|---|---|---|
| P2-01 | RAG + Guardrails สำหรับข้อมูลวิชาชีพ | `ai-ml-engineer` + `security-guard` | 15 วัน | Guardrail spec and test cases | 🔴 |
| P2-02 | ผู้ใช้งาน/Lead funnel + conversion tracking | `growth-community` + `data-analytics` | 15 วัน | Funnel metrics + attribution | 🔴 |
| P2-03 | Repository cleanup + doc structure | `chief-of-staff` | 5 วัน | Clean source of truth directories | 🔴 |
| P2-04 | Launch checklist + go-live gate | `chief-of-staff` + `devops-sre` | 7 วัน | Launch checklist | 🔴 |

---

## 4. Scope งานแยกสัปดาห์

### Week 1 — Risk gate

- [ ] `legal-compliance` ทำ PDPA checklist และ map data flow
- [ ] `security-guard` ตรวจ secrets, credential, and exposed files
- [ ] `devops-sre` ตั้ง staging environment และจำกัด production deploy
- [ ] `chief-of-staff` จัดการ owner mapping และ tracking board

### Week 2 — Platform readiness

- [ ] `devops-sre` สร้าง rollback playbook, monitoring, log retention
- [ ] `data-analytics` กำหนด KPI และ dashboard structure
- [ ] `ai-ml-engineer` เริ่ม Thai Eval Suite และ benchmark protocol
- [ ] `legal-compliance` ตรวจ affiliate model และ Non-MLM policy

### Week 3 — User-facing MVP

- [ ] `consumer-agent` + `frontend-engineer` ทำ Consumer Portal MVP
- [ ] `intermediary-agent` + `frontend-engineer` ทำ Intermediary Portal MVP
- [ ] `professional-agent` + `legal-compliance` ทำ Professional Module MVP สำหรับ 2 กลุ่มแรก

### Week 4 — Validation + go/no-go

- [ ] ทำ end-to-end testing ผ่าน staging
- [ ] ตรวจความครบของ compliance gate และ security review
- [ ] ทำ go-live review โดย `chief-of-staff` และ `legal-compliance`
- [ ] รอ Mythos approve ก่อน deploy production

---

## 5. Workstream รายละเอียด

### 5.1 Compliance & Security Workstream

**Owner:** `legal-compliance`, `security-guard`

Deliverables:
- Data processing inventory
- Consent and retention policy
- Security checklist
- Secret hygiene report
- Red/amber/green status for each feature

Accept criteria:
- ทุก feature มี owner
- ทุก feature มี legal basis
- ไม่มี secret หรือ credential ใน repo
- ไม่มี deploy production ถ้าไม่ผ่าน review

### 5.2 Platform Readiness Workstream

**Owner:** `devops-sre`, `chief-of-staff`

Deliverables:
- Staging environment
- Rollback runbook
- Monitoring and alerting
- Deployment checklist
- Production go-live gate

Accept criteria:
- deploy สามารถ rollback ได้ภายใน 15 นาที
- alert ส่งต่อได้จริง
- staging environment สาม reproduces production flow ได้

### 5.3 User Value Workstream

**Owner:** `consumer-agent`, `intermediary-agent`, `professional-agent`, `frontend-engineer`

Deliverables:
- Consumer portal MVP
- Intermediary portal MVP
- Professional module MVP
- Workflow และ flow map

Accept criteria:
- มี persona clear
- flow เรียกใช้งานได้จริง
- มีความชัดเจนว่าบริการช่วยคนกลุ่มไหนอย่างไร

### 5.4 Validation Workstream

**Owner:** `ai-ml-engineer`, `data-analytics`

Deliverables:
- Thai Eval Suite
- KPI dashboard
- Benchmark report
- Source-traceable results

Accept criteria:
- ทุกตัวเลขมี source, date, method
- ไม่มีผลลัพธ์ที่ “ดูดีแต่ไม่มีหลักฐาน”
- metrics ครอบคลุมประสิทธิภาพและความน่าเชื่อถือ

---

## 6. Definition of Done สำหรับทุกงาน

งานถือว่าเสร็จเมื่อ:

- มี owner ชัดเจน
- มี deliverable จริง
- มี proof หรือ evidence
- มีสิ่งที่ยังไม่ได้ทำ/ยังค้างและระบุชัด
- ผ่าน review ของ agent ที่เกี่ยวข้อง
- ไม่ข้ามกฎ PDPA / security / brand / legal

---

## 7. รายการ “รับผิดชอบทีม” ที่ควรเริ่มทันที

- `legal-compliance` → PDPA + affiliate/legal gate
- `security-guard` → secret scan + security checklist
- `devops-sre` → staging + deploy + alerting
- `ai-ml-engineer` → Eval Suite + benchmark
- `consumer-agent` + `frontend-engineer` → Consumer Portal MVP
- `intermediary-agent` + `frontend-engineer` → Intermediary Portal MVP
- `professional-agent` + `legal-compliance` → Professional Module MVP
- `data-analytics` → KPI dashboard
- `chief-of-staff` → tracking, blockers, status update

---

## 8. สรุปสั้น

โฟกัส 30 วันนี้คือการปิด “ความเสี่ยงที่ทำให้โปรเจ็กต์หยุดช้า” ให้ก่อน แล้วค่อยสร้างฟีเจอร์ที่ช่วยผู้ใช้จริง ๆ เพราะ OpenThaiAi ในปัจจุบันมีเอกสารและความคิดที่ดี แต่ยังขาด “ready-for-production gate” และ “proof-backed execution” มากที่สุด

---

**Next Step:** ดำเนิน P0-01 ถึง P0-05 ให้เสร็จก่อน แล้วค่อยเริ่ม P1 workstream ตาม timeline.
