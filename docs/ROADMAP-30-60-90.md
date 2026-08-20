# OpenThaiAi — Roadmap 30 / 60 / 90 วัน

**เริ่มวันที่:** 17 ส.ค. 2569  
**ผู้บัญชาการ:** Mythos  
**อ้างอิง:** `CLAUDE.md`, `docs/TEAM-BACKLOG.md`, `docs/30-DAY-BACKLOG.md`, `docs/AGENT-BACKLOG.md`, `docs/AGENT-TASK-BREAKDOWN.md`

---

## 1. เป้าหมายรวม

ใน 90 วัน OpenThaiAi ควรย้ายจากโซนเอกสาร/สเปก ไปสู่สถานะที่พร้อมใช้งานจริงแบบมีหลักฐาน โดยต้องบรรลุ 3 ข้อสำคัญต่อไปนี้:

1. ผ่านเกณฑ์ความเสี่ยง: PDPA, security, deployment gate
2. มีฟีเจอร์หลักที่ใช้งานได้จริงสำหรับผู้ใช้ที่ขาดอยู่: Consumer, Intermediary, Professional
3. มี benchmark และ KPI ที่พิสูจน์ประสิทธิภาพจริงก่อนเปิดใช้งานเต็มรูปแบบ

---

## 2. Roadmap แบบสั้น

### Phase 1 — 30 วัน: Stabilize + Gatekeeping

**วัตถุประสงค์:** ปิดความเสี่ยงสูงสุดและสร้างฐานการทำงานที่ปลอดภัย

| งาน | Owner | Deliverable | Exit Criteria |
|---|---|---|---|
| Audit PDPA + data flow | `legal-compliance` | Data map + risk register | ทุก feature มี legal basis |
| Secret hygiene review | `security-guard` | Secret inventory + remediation | ไม่มี credential รั่วใน repo |
| Staging environment | `devops-sre` | staging env + setup doc | deploy staging ได้จริง |
| Rollback + monitoring | `devops-sre` | runbook + alarm rules | rollback ทำได้จริง |
| Thai Eval Suite | `ai-ml-engineer` | benchmark/doc + eval script | ตัวเลขมี source และ method |
| Status board + blocker tracking | `chief-of-staff` | tracking dashboard | ทุก task มี owner |

**Gate for Phase 2:**
- ไม่มี high-risk issue ที่ยังไม่ resolve
- มี staging environment ที่ใช้งานได้
- มี benchmark และ legal review ที่ชัดเจน

### Phase 2 — 60 วัน: Build user value

**วัตถุประสงค์:** ทำฟีเจอร์จริงสำหรับกลุ่มที่ยังขาดอยู่

| งาน | Owner | Deliverable | Exit Criteria |
|---|---|---|---|
| Consumer Portal MVP | `consumer-agent` + `frontend-engineer` | usable portal flow | ผู้บริโภคเข้าใช้งานได้จริง |
| Intermediary Portal MVP | `intermediary-agent` + `frontend-engineer` | user flow + UI | 7 segment มี MVP ที่รู้ว่าทำอะไร |
| Professional Module MVP | `professional-agent` + `legal-compliance` | module + safe workflow | มี safe operation path |
| KPI dashboard | `data-analytics` | usage and revenue metrics | มี dashboard สำหรับธุรกิจ |
| Affiliate + legal validation | `legal-compliance` | final review | pass compliance gate |

**Gate for Phase 3:**
- portal ที่สร้างขึ้นใช้งานได้จริงใน staging
- มี KPI ที่ติดตามได้จริง
- compliance review ผ่านแล้ว

### Phase 3 — 90 วัน: Production-ready + launch decision

**วัตถุประสงค์:** เตรียมให้ OpenThaiAi พร้อมก้าวสู่ production อย่างมีหลักฐาน

| งาน | Owner | Deliverable | Exit Criteria |
|---|---|---|---|
| Final security audit | `security-guard` | final cert + remediation | no unresolved critical risk |
| Final compliance sign-off | `legal-compliance` | go/no-go approval | ผ่าน review ก่อน launch |
| Final deployment readiness | `devops-sre` | production gate checklist | deploy ready |
| Final benchmark review | `ai-ml-engineer` | final evaluation report | มี evidence สำหรับ launch |
| Launch gate review | `chief-of-staff` | go/no-go call | Mythos approve |

---

## 3. งานที่ให้เริ่มก่อนตามลำดับ

### P0 — ทำก่อนทันที
- PDPA + data flow audit
- Secret hygiene and access review
- Staging environment
- Rollback and monitoring
- Thai Eval Suite benchmark

### P1 — ทำต่อทันที
- Consumer Portal MVP
- Intermediary Portal MVP
- Professional Module MVP
- KPI dashboard
- Affiliate/legal validation

### P2 — ทำหลังจากหลักผ่าน
- RAG + guardrails tuning
- Funnel and growth tracking
- repo cleanup
- launch gate + readiness review

---

## 4. Success Criteria ราย 90 วัน

OpenThaiAi จะถือว่าประสบความสำเร็จใน 90 วัน หากมีเงื่อนไขต่อไปนี้:

- [ ] ทุกฟีเจอร์ที่เก็บข้อมูลมี legal basis
- [ ] ไม่มี secret หรือ credential ที่ค้างใน repo
- [ ] staging environment ใช้งานได้จริง
- [ ] deploy มี rollback และ monitoring
- [ ] benchmark มีแหล่งที่มาและวิธีวัดชัดเจน
- [ ] Consumer / Intermediary / Professional modules มี MVP ที่ใช้งานได้
- [ ] มี KPI dashboard สำหรับคุณภาพและธุรกิจ
- [ ] มี go/no-go review ก่อน production

---

## 5. Suggested Owner Map

- `chief-of-staff` — orchestration and gatekeeping
- `legal-compliance` — compliance, risk, policy
- `security-guard` — secret, hardening, guardrails
- `devops-sre` — staging, deploy, monitoring
- `ai-ml-engineer` — eval, model quality, RAG
- `consumer-agent` — consumer needs and flows
- `intermediary-agent` — intermediary segment flows
- `professional-agent` — professional module requirements
- `frontend-engineer` — UX/UI implementation
- `data-analytics` — KPI and metrics
- `growth-community` — funnel and acquisition

---

## 6. สรุปสั้น

ถ้า OpenThaiAi ทำได้ตาม Roadmap นี้ จะกลายจาก “โครงการที่มีเอกสารดี” เป็น “โครงการที่สามารถพิสูจน์ว่าพร้อมใช้งานจริง” ได้ใน 90 วัน โดยเริ่มจากความเสี่ยงก่อน แล้วค่อยสร้างมูลค่าให้ผู้ใช้จริงตาม 6 กลุ่มผู้ใช้

---

**Next decision gate:** หลังจาก P0 เสร็จสิ้นให้เริ่มเปิด Phase 2 โดยตรง และให้ `chief-of-staff` เป็นคน review go/no-go ทุกสัปดาห์
