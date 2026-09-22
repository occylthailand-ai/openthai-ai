# Due Diligence Checklist — เตรียมความพร้อมก่อนเข้าสู่กระบวนการ FA
## [INTERNAL STRICTLY CONFIDENTIAL — ห้ามแชร์ภายนอกองค์กร]
**สถานะ:** ร่างภายใน | อัปเดต: สิงหาคม 2569 | ผู้ดูแล: Mythos (Commander)

---

> เอกสารนี้ใช้เตรียมข้อมูลก่อนนัดพบที่ปรึกษาทางการเงิน (FA) ที่ขึ้นทะเบียน ก.ล.ต.
> **ไม่มีตัวเลขทางการเงิน** ในเอกสารนี้ — ตัวเลขอยู่ในระบบ Internal Finance เท่านั้น

---

## หมวด A — นิติบุคคลและธรรมาภิบาล

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|---------|
| A1. หนังสือรับรองบริษัท (DBD) | ❌ ยังไม่มีนิติบุคคล | จดทะเบียนก่อน |
| A2. หนังสือบริคณห์สนธิ (Memorandum of Association) | ❌ | ต้องการ ≥ 15 ผู้เริ่มก่อตั้ง |
| A3. ข้อบังคับบริษัท (Articles of Association) | ❌ | ร่างโดยทนายความ |
| A4. รายชื่อกรรมการ ≥ 5 คน (ครึ่งหนึ่งมีถิ่นที่อยู่ในไทย) | ❌ | Innovation Board (task เปิดอยู่) |
| A5. โครงสร้างผู้ถือหุ้น (Cap Table) | ❌ | ต้องการ FA ช่วยออกแบบ |
| A6. นโยบายธรรมาภิบาลบริษัท (Corporate Governance Policy) | ⚠️ ร่างบางส่วน | `docs/INVESTOR_GOVERNANCE_DRAFT.md` |
| A7. นโยบาย Anti-Corruption / Conflict of Interest | ❌ | — |

---

## หมวด B — เทคโนโลยีและระบบ (Technical Due Diligence)

| รายการ | สถานะ | ไฟล์อ้างอิง |
|--------|--------|------------|
| B1. สถาปัตยกรรมระบบ 12 หมวด (ครบถ้วน) | ⚠️ ประมาณการ | `docs/READINESS-ROADMAP-12.md` (plan) |
| B2. Source Code Repository (version-controlled) | ✅ | GitHub — branch master |
| B3. XAdES Engine — ใบรับรองลายเซ็น | ✅ ทางเทคนิค | `xades-engine/src/` |
| B4. PDPA Consent System (backend + frontend) | ✅ | `backend/consent.js`, migration 008 |
| B5. Consumer Portal + Intermediary Portal | ✅ | `frontend/src/pages/` |
| B6. Peppol AS4 Gateway | ⚠️ โค้ดมี แต่ไม่มีสาย MPLS | `xades-engine/peppol/` |
| B7. SoftHSM2 / HSM Integration | ⚠️ | `xades-engine/src/xades_engine/hsm_integration.py` |
| B8. Privacy Notice + PDPA Policy (ฉบับเต็ม) | ✅ | `docs/privacy-notice.md` |
| B9. Security Audit / Penetration Test Report | ❌ ยังไม่มี | ต้องจ้าง 3rd party |
| B10. ISO 27001 / SOC2 หรือเทียบเท่า | ❌ | — |
| B11. Business Continuity Plan (BCP) | ⚠️ มีโครงร่าง | `ISO22301-BUSINESS-CONTINUITY.md` |
| B12. Thai Eval Suite Benchmark Results | ✅ โค้ดมี แต่ยังไม่ได้รัน Production | `tests/thai_eval_suite.py` |

---

## หมวด C — การเงิน (Financial Due Diligence)

> รายการนี้ต้องการ FA + ผู้สอบบัญชีรับอนุญาต (CPA) — ตัวเลขเป็น Confidential ไม่อยู่ในเอกสารนี้

| รายการ | สถานะ |
|--------|--------|
| C1. งบการเงิน 3 ปีย้อนหลัง (หรือนับแต่ก่อตั้ง) | ❌ ยังไม่มีนิติบุคคล |
| C2. รายงาน Cash Flow Projection 5 ปี | ❌ |
| C3. โครงสร้างทุน — ส่ง FA เพื่อประเมิน | ❌ เตรียมไว้ภายใน |
| C4. บัญชีค้างจ่าย / ลูกหนี้ / ทรัพย์สิน IP | ❌ |
| C5. สัญญาสำคัญกับคู่ค้า / ลูกค้า | ❌ |

---

## หมวด D — กฎหมายและการปฏิบัติตามกฎระเบียบ

| รายการ | สถานะ |
|--------|--------|
| D1. ความเห็นทางกฎหมาย (Legal Opinion) เรื่องโครงสร้างธุรกิจ | ❌ |
| D2. ทะเบียน IP / สิทธิบัตร / เครื่องหมายการค้า | ❌ |
| D3. ใบอนุญาตดำเนินธุรกิจที่เกี่ยวข้อง (FinTech, AI) | ❌ |
| D4. PDPA DPO แต่งตั้งอย่างเป็นทางการ | ❌ |
| D5. สัญญาพนักงานและ NDA ครบชุด | ❌ |
| D6. ไม่มีคดีความค้างอยู่ (Litigation Disclosure) | ❌ ต้องยืนยัน |

---

## หมวด E — การตลาดและธุรกิจ

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|---------|
| E1. Business Plan ฉบับสมบูรณ์ | ⚠️ มีบางส่วน | ต้องรวม C3 |
| E2. Competitive Analysis | ⚠️ | `docs/competitive-positioning.md` |
| E3. Pipeline ลูกค้า / MOU | ❌ | — |
| E4. ทีมผู้บริหาร CV ครบ | ❌ | — |
| E5. Partnership / ข้อตกลงกับหน่วยงานรัฐ | ❌ | — |

---

## สรุปขั้นตอนก่อนนัด FA

```
1. จดทะเบียนบริษัทมหาชน → ได้หนังสือรับรอง (A1)
2. แต่งตั้งกรรมการ ≥ 5 คน (A4) → Innovation Board
3. จ้าง Security Audit (B9) → รายงาน pentest
4. จ้าง CPA ทำงบการเงิน (C1)
5. จ้างทนายความทำ Legal Opinion (D1)
6. รวบรวม A1-D6 → นัด FA สัมภาษณ์เบื้องต้น
```

**ประมาณการเวลา (ยังไม่ได้วัด):** เตรียมเอกสารครบหมวด A-D ใช้เวลาประมาณ 3-6 เดือน ขึ้นกับความเร็วจดทะเบียนและจ้างที่ปรึกษา
