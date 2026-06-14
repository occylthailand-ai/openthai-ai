# OpenThai.ai — Non-MLM Compliance Framework v1.0
# Chief Legal Guild · มีผลบังคับใช้ทันที

## หลักการสำคัญ: Non-MLM ทุกกรณี

OpenThai.ai ดำเนินธุรกิจภายใต้กฎหมาย **ไม่ใช่ MLM (Multi-Level Marketing)** อย่างเคร่งครัด

---

## 1. กฎ Affiliate Commission (ห้ามละเมิด)

| กฎ | รายละเอียด |
|----|-----------|
| ชั้นสูงสุด | 2 ชั้นเท่านั้น (Direct + 1 Upline) |
| Commission ชั้น 1 | ≤30% จาก direct sale |
| Commission ชั้น 2 | ≤5% จาก sale ของ downline ชั้น 1 |
| ชั้น 3 ขึ้นไป | ห้ามทุกกรณี — ระบบต้อง reject อัตโนมัติ |
| ที่มาของรายได้ | ต้องมาจาก actual product/service sale เท่านั้น |

## 2. สิ่งที่ห้ามทำ

- ❌ จ่าย commission จากการชักชวนสมาชิก (recruitment fee)
- ❌ บังคับซื้อสินค้าเพื่อเป็นสมาชิก (mandatory purchase)
- ❌ สร้าง downline เกิน 2 ชั้น
- ❌ จ่าย passive income โดยไม่มี actual sale
- ❌ โครงสร้างแบบ pyramid ทุกรูปแบบ

## 3. Code Compliance — Developer Must Follow

```python
def check_non_mlm_compliance(affiliate_id: str, commission_chain: list) -> bool:
    """
    ตรวจสอบว่า commission chain ไม่เกิน 2 ชั้น
    Returns True if compliant, raises ComplianceError if not
    """
    if len(commission_chain) > 2:
        raise ComplianceError(
            f"Commission chain depth {len(commission_chain)} exceeds max 2 levels. "
            "Non-MLM policy violation."
        )
    return True
```

ทุก Payout function ต้องเรียก `check_non_mlm_compliance()` ก่อน process เสมอ

## 4. FinTech & Crypto Compliance

- KYC ทุก user ก่อน transaction เกิน 15,000 บาท (AMLO requirement)
- PDPA: เก็บ consent ก่อนประมวลผลข้อมูลส่วนบุคคลทุกครั้ง
- OTAI Token: ต้องผ่าน SEC Thailand consultation ก่อน public offering
- FinTech License: ยื่นขอ e-Payment License กับ BOT ก่อนเปิด Noti Pay

## 5. Data Privacy (PDPA Thailand)

| ข้อมูล | การจัดการ |
|--------|----------|
| ชื่อ-นามสกุล | เข้ารหัส AES-256 at rest |
| เลขบัตรประชาชน | Hash SHA-256 — ไม่เก็บ plaintext |
| เบอร์โทรศัพท์ | Mask เมื่อแสดงผล (0XX-XXX-X789) |
| Log files | ห้ามบันทึก PII — anonymize ก่อน log |
| Data retention | ลบหลัง 3 ปี หรือตามคำขอของ user |

## 6. Regulatory Checklist ก่อน Launch

- [ ] Non-MLM Legal Opinion จาก Law Firm
- [ ] PDPA Compliance Audit
- [ ] FinTech/e-Payment License (BOT)
- [ ] OTAI Token SEC Consultation
- [ ] Terms of Service (TH/CN/EN)
- [ ] Privacy Policy (TH/CN/EN)
- [ ] Affiliate Agreement Template
- [ ] Smart Contract Audit Report
- [ ] MOU ภาครัฐ (กระทรวงพาณิชย์)

## 7. Incident Response

หากพบ Compliance Violation:
1. หยุด transaction ที่เกี่ยวข้องทันที
2. แจ้ง Chief Legal ภายใน 1 ชั่วโมง
3. บันทึก Incident Log พร้อม timestamp
4. ประเมินผลกระทบและแจ้ง User ที่เกี่ยวข้อง
5. รายงาน Regulatory Body หากจำเป็น (ภายใน 72 ชม. — PDPA requirement)

---
*อัปเดต: มิถุนายน 2569 | Chief Legal Guild, OpenThai.ai*
