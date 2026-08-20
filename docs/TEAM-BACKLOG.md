# OpenThai.ai — แฟ้มมอบหมายงานทีม (Team Backlog)

**เริ่มใช้:** 23 ก.ค. 2569 | **ผู้บัญชาการ:** Mythos
**คำสั่งถาวร:** `CLAUDE.md` | **นิยามทีม:** `.claude/agents/`

---

## 🧭 ผังทีม 15 ตัว

```
                        Mythos (Founder & Commander)
                                   │
                          chief-of-staff (เสนาธิการ)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
  หน่วยรบตามผู้ใช้ (6)         หน่วยสร้าง (6)            หน่วยกำกับ (3)
        │                          │                          │
  producer-agent            ai-ml-engineer            legal-compliance 🛑
  intermediary-agent        backend-engineer          content-localization
  platform-agent            frontend-engineer         growth-community
  consumer-agent            data-analytics
  ecosystem-agent           devops-sre
  professional-agent        security-guard

🛑 = มีอำนาจหยุดงานที่สุ่มเสี่ยงผิดกฎหมาย
```

## 📊 ตารางความครอบคลุม 6 กลุ่มผู้ใช้

| กลุ่ม | Agent เจ้าของ | สถานะในหนังสือ | สถานะในระบบ |
|---|---|---|---|
| 1. ผู้ผลิต | producer-agent | ✅ บทที่ 4.1 | 🟡 Producer Portal มีแล้ว |
| 2. คนกลางทุกประเภท | intermediary-agent | 🟡 บท 4.2 ครอบคลุมแค่โลจิสติกส์ | 🔴 ยังไม่มี Portal |
| 3. แพลตฟอร์ม | platform-agent | ✅ บทที่ 4.3 | ✅ 7 Portal |
| 4. ผู้บริโภค | consumer-agent | ✅ บทที่ 4.4 | 🔴 ยังไม่มีหน้าเฉพาะ |
| 5. ชุมชน/นักพัฒนา/รัฐ | ecosystem-agent | ✅ บทที่ 4.5 | 🟡 Gov Portal มีแล้ว |
| 6. **สายงานวิชาชีพ** | professional-agent | 🔴 **ยังไม่มีในหนังสือเลย** | 🔴 ยังไม่มี |

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
| ยังไม่มี staging environment | Deploy ตรง prod เสี่ยงสูง | devops-sre |

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
- [ ] ย้าย API key / secret / credential ออกจาก repo
- [ ] เพิ่ม `.gitignore` สำหรับไฟล์ที่มีความอ่อนไหว
- [ ] ใช้ secret manager หรือ environment vault แทนไฟล์ข้อความบน repo
- [ ] Rotate keys และตรวจทุก 90 วัน
- [ ] ตรวจสอบความลับที่ค้างอยู่ใน logs / cache / backup

### 2. ทำต่อ: ปิดช่องว่างตาม 6 กลุ่มผู้ใช้

#### กลุ่มที่ 2 — คนกลางทุกประเภท
- [ ] ขยายแผนจาก “โลจิสติกส์” เป็น 7 ประเภทจริง
- [ ] วาง user flow, pain point และ offer สำหรับแต่ละประเภท
- [ ] สร้าง Intermediary Portal MVP
  - [ ] ตัวแทนจำหน่าย
  - [ ] นายหน้า
  - [ ] ผู้ส่งออก/นำเข้า
  - [ ] คลังสินค้า
  - [ ] ผู้จัดจำหน่าย
  - [ ] ผู้ประสานการค้า
  - [ ] ผู้ดูแลโซ่อุปทาน

#### กลุ่มที่ 4 — ผู้บริโภค
- [ ] สร้าง Consumer Portal MVP
- [ ] เพิ่มฟังก์ชันค้นหาสินค้า
- [ ] เพิ่มตรวจสิทธิ/รับสิทธิแบบเรียลไทม์
- [ ] เพิ่มระบบรีวิวและความน่าเชื่อถือ
- [ ] วางแผนฟังก์ชันการใช้งานที่ตรงตามความต้องการจริง

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
