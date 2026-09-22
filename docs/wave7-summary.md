# Wave 7 Summary — Infrastructure & Real Work

**เสร็จ:** 14 ก.ย. 2569 | **หัวหน้า Wave:** chief-of-staff  
**ชื่อ Wave:** "Infrastructure & Real Work" — ทำของจริง ไม่ใช่แค่วางแผน

---

## 1. Wave 7 ต่างจาก Wave ก่อนอย่างไร

| ด้าน | Wave 1–6 | Wave 7 |
|------|----------|--------|
| ผลลัพธ์ | เอกสาร spec, แผน, หนังสือ | โค้ดและ runnable tools จริง |
| การรอ | หลายงานรอ Mythos / Board | ทุกงานทำได้ทันที ไม่รอใคร |
| เน้น | Planning + Documentation | Implementation + Verification |
| ผู้ใช้ผลลัพธ์ได้ทันที | Mythos อ่านเอกสาร | นักพัฒนา run script ได้เลย |

Wave 7 เป็น "งานที่ไม่มีข้ออ้าง" — ไม่ต้องรอ model จริง ไม่ต้องรอนิติบุคคล ไม่ต้องรอ Board มติ ทำได้เดี๋ยวนี้

---

## 2. ตารางงาน 8 ชิ้น

| ID | ชื่องาน | Agent | Output | กลุ่มผู้ใช้ | สถานะ |
|----|---------|-------|--------|-------------|-------|
| 7.1 | Secret Hygiene Guide | security-guard | `docs/secret-rotation-guide.md` | 3 แพลตฟอร์ม | ✅ |
| 7.2 | FastAPI Backend Stubs | backend-engineer | `backend/api/routes_wave7.py` | 2 คนกลาง, 4 ผู้บริโภค | ✅ |
| 7.3 | PDPA Audit Report | legal-compliance | `docs/pdpa-audit-wave7.md` | ทุกกลุ่ม | ✅ |
| 7.4 | Thai Eval Runner Script | ai-ml-engineer | `tools/thai_eval_runner.py` | 5 ชุมชน/นักพัฒนา | ✅ |
| 7.5 | Monitoring & Health Check Spec | devops-sre | `docs/monitoring-spec.md` | 3 แพลตฟอร์ม | ✅ |
| 7.6 | KPI Dashboard Spec | data-analytics | `docs/kpi-dashboard-spec.md` | 3 แพลตฟอร์ม | ✅ |
| 7.7 | Content Audit (ตัวเลขลอย) | content-localization | `docs/content-audit-floating-numbers.md` | 5 ชุมชน | ✅ |
| 7.8 | Community Strategy | ecosystem-agent | `docs/community-strategy.md` | 5 ชุมชน/นักพัฒนา | ✅ |

**ทุกงานส่งมอบเป็นไฟล์จริงที่ใช้งานได้**

---

## 3. Dependencies ระหว่างงาน

```
7.1 (Secret Hygiene) ──────────────────────────── ทำได้ทันที
7.2 (FastAPI Stubs)  ←── ต้องการ api-stub-spec.md (5.2) ✅
7.3 (PDPA Audit)     ←── ดูจาก Portal code (Wave 6) ✅
7.4 (Eval Runner)    ←── ต้องการ thai-eval-suite-v1.json (6.2) ✅
7.5 (Monitoring)     ──────────────────────────── ทำได้ทันที
7.6 (KPI Dashboard)  ←── ดูจาก 7.4 eval output (loosely)
7.7 (Content Audit)  ──────────────────────────── ทำได้ทันที
7.8 (Community)      ←── ต้องการ developer-onboarding.md (3.8) ✅
```

Wave 7 ทำขนาน (parallel) ได้ทั้งหมด — ไม่มี hard sequential dependency

---

## 4. Definition of Done — Wave 7 ทั้งหมด ✅

- [x] **7.1** — `docs/secret-rotation-guide.md` มีขั้นตอน rotate ครบ 4 ประเภท secret + runbook
- [x] **7.2** — `backend/api/routes_wave7.py` compiles ด้วย FastAPI, มี stub ครบ 8 endpoints, Pydantic v2 models
- [x] **7.3** — `docs/pdpa-audit-wave7.md` มี pass/fail ทุก Portal + gap analysis
- [x] **7.4** — `tools/thai_eval_runner.py` runnable ด้วย `python tools/thai_eval_runner.py --help`
- [x] **7.5** — `docs/monitoring-spec.md` มี alert rules + on-prem stack recommendation
- [x] **7.6** — `docs/kpi-dashboard-spec.md` มี 5 KPI พร้อมสูตรและแหล่งข้อมูล
- [x] **7.7** — `docs/content-audit-floating-numbers.md` มีรายการตัวเลขไม่มีที่มา + แนวทางแก้
- [x] **7.8** — `docs/community-strategy.md` มีแผน First 100 Members + contribution pathway

---

## 5. สิ่งที่ Wave 7 ยังไม่ครอบคลุม → Wave 8

| ช่องว่าง | เหตุผลที่ยัง missing | งาน Wave 8 ที่ควรทำ |
|----------|---------------------|---------------------|
| Backend stubs ยังเป็น mock | ยังไม่มี AI integration จริง | 8.1 connect consumer API กับ AI |
| Eval runner มีแต่ script | ยังไม่เคย run กับ model จริง | 8.2 run baseline eval M0 |
| Monitoring เป็นแค่ spec | ยังไม่ได้ deploy Prometheus/Grafana | 8.3 deploy uptime-kuma MVP |
| Community strategy บน paper | ยังไม่มี GitHub org/Discord จริง | 8.4 setup community channels |
| Frontend portals ทำงานแยก | ยังไม่มี shared navigation/auth | 8.5 nav + auth layer |
| Affiliate spec เสร็จ | ยังไม่มี commission engine จริง | 8.6 affiliate engine stub |

---

## 6. สรุป impact ต่อ 6 กลุ่มผู้ใช้

| กลุ่ม | Wave 7 ให้อะไร |
|-------|----------------|
| 1. ผู้ผลิต | PDPA audit ปกป้องข้อมูลเกษตรกร |
| 2. คนกลาง | FastAPI stubs พร้อม wire HS-code + trade-doc API |
| 3. แพลตฟอร์ม | Monitoring spec + KPI dashboard + Secret hygiene |
| 4. ผู้บริโภค | FastAPI stubs พร้อม wire welfare + contract summary |
| 5. ชุมชน/นักพัฒนา | Eval runner tool + Community strategy |
| 6. วิชาชีพ | PDPA audit ครอบคลุม Professional Portal |

---

**เสิร์ฟกลุ่มผู้ใช้:** ทุกกลุ่ม (infrastructure รองรับทุกกลุ่ม)  
**สิ่งที่ยังไม่ได้ทำ:** Wave 8 (ดูตารางข้อ 5)  
**รอ Mythos ตัดสินใจ:** ไม่มี — Wave 7 เสร็จสมบูรณ์ในตัว
