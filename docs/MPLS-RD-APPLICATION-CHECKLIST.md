# Checklist ขอเชื่อมต่อ MPLS กรมสรรพากร — e-Tax Invoice

**วัตถุประสงค์:** ขอ MPLS Private Circuit เพื่อส่งใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice)  
**เสิร์ฟกลุ่ม:** ผู้ผลิต + คนกลาง + แพลตฟอร์ม (หมวด 6 Peppol/Gateway)  
**ติดต่อ:** webservice@rd.go.th | โทร 1161  
**อัปเดต:** 20 ส.ค. 2569

---

## ทำไมต้องใช้ MPLS

RD ไม่ได้เปิด public REST API — การส่งใบกำกับภาษีต้องผ่านหนึ่งในสามช่องทาง:

| ช่องทาง | สำหรับ | endpoint |
|---------|--------|----------|
| **MPLS Private Network** | Service Provider ขนาดใหญ่ | `etaxservicempls.rd.go.th` |
| Web Upload | SME / ทดสอบ | `https://etax.rd.go.th` |
| ผ่าน SP ที่ได้รับอนุญาต | ทุกขนาด | endpoint ของ SP นั้น |

สำหรับ OpenThai.ai ในฐานะ Platform/Service Provider ต้องใช้ MPLS

---

## Phase 1 — เตรียมเอกสาร (ทำก่อนติดต่อ RD)

- [ ] **หนังสือรับรองบริษัท** — ไม่เกิน 6 เดือน
- [ ] **สำเนาใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)** — บริษัทต้องจด VAT
- [ ] **รายชื่อบุคคลที่ติดต่อ (Contact Person)** — ชื่อ-นามสกุล, เบอร์โทร, อีเมล ทั้งฝ่ายธุรกิจและ IT
- [ ] **ข้อมูลทางเทคนิค:**
  - IP Address ที่จะใช้เชื่อมต่อ (Static IP ฝั่ง OpenThai)
  - ช่วง IP Subnet ที่ต้องการ
  - ISP ที่ใช้งาน
- [ ] **ตัวอย่างใบกำกับภาษี XML** ที่ผ่าน XAdES signature แล้ว (ตรวจสอบ format ก่อน)

---

## Phase 2 — ยื่นขอกับ RD

### ขั้น 2.1 ลงทะเบียนเป็น Service Provider
- [ ] ส่งอีเมลถึง webservice@rd.go.th ชื่อเรื่อง: **"ขอลงทะเบียน Service Provider e-Tax Invoice — [ชื่อบริษัท]"**
- [ ] แนบเอกสาร Phase 1 ทั้งหมด
- [ ] รอการตอบรับ (ปกติ 5–15 วันทำการ)

### ขั้น 2.2 ทดสอบกับ UAT
- [ ] รับ Credential จาก RD (Username / Client Certificate)
- [ ] ตั้งค่าใน `etax_submitter.py`:
  ```python
  environment = "uat"
  # host จะชี้ไปที่ etaxserviceuatmpls.rd.go.th
  ```
- [ ] รัน test ส่งใบกำกับภาษีทดสอบ 10 ใบ
- [ ] ยืนยันผลกับ RD ว่าผ่าน UAT

### ขั้น 2.3 ขอ MPLS Circuit
- [ ] แจ้ง RD ว่าผ่าน UAT แล้ว ขอเปิด Production
- [ ] RD จัดสรร IP ให้ในช่วง `10.255.1.x` / `10.255.2.x`
- [ ] ประสานกับ ISP ทั้งสองฝ่ายเพื่อตั้งค่า MPLS

---

## Phase 3 — ตั้งค่าระบบ Production

### Certificate
- [ ] รับ Client Certificate (SHA-2) จาก RD
- [ ] เก็บใน SoftHSM2: `xades-engine/hsm/init-hsm.sh`
- [ ] อัปเดต path ใน `docker-compose.production.yml`:
  ```yaml
  PEPPOL_CERT_PATH: /certs/rd-client.crt
  ```

### Code Configuration
- [ ] เปลี่ยน environment เป็น `"production"` ใน `etax_submitter.py`
- [ ] ยืนยัน CN ของ certificate ตรงกับที่ RD กำหนด
- [ ] ตั้งค่า `hosts` file ชี้ IP จาก MPLS:
  ```
  10.255.1.183  etaxservicempls.rd.go.th
  10.255.2.183  etaxservicempls.rd.go.th  # backup
  ```

### Monitoring
- [ ] เพิ่ม alert ใน `telemetry/alerts.yaml` สำหรับ MPLS connection failure
- [ ] ทดสอบ alert ไปที่ LINE/Slack

---

## Phase 4 — Verification สุดท้าย

- [ ] ส่งใบกำกับภาษีจริงฉบับแรก (ตรวจสอบในระบบ RD)
- [ ] ตรวจสอบ PCR Ledger (`008_vault_ledger.sql` ตาราง `pcr_ledger`)
- [ ] ตรวจสอบ Audit Log ใน `vault_access_log`
- [ ] บันทึกเลข Reference ID จาก RD เก็บไว้

---

## สิ่งที่ OpenThai.ai มีพร้อมแล้ว

| รายการ | ไฟล์ | สถานะ |
|--------|------|--------|
| XAdES signer (BES/T/A) | `xades-engine/src/` | ✅ Production-Ready |
| MPLS Submitter code | `peppol/rd_gateway/etax_submitter.py` | ✅ รอ MPLS circuit |
| UBL BIS 3.0 Builder | `peppol/adapters/ubl_bis3.py` | ✅ |
| Peppol Rules Validator | `peppol/guardrails/peppol_rules.py` | ✅ |
| SoftHSM2 Integration | `hsm/hsm_integration.py` | ✅ |
| Client Cert (SHA-2) | — | ⏳ รับจาก RD หลัง UAT |
| MPLS Circuit | — | ⏳ รอ RD จัดสรร |

---

*อ้างอิง: ประกาศกรมสรรพากร เรื่องใบกำกับภาษีอิเล็กทรอนิกส์ · rd.go.th/62829.html*  
*ติดต่อ RD: webservice@rd.go.th | 1161*
