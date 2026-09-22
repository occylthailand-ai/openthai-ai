# ขอบเขตงานและ RFP — การตรวจสอบความมั่นคงปลอดภัย (Security Audit)
## บริษัท โอเพ่นไทย เอไอ จำกัด (มหาชน) — ระบบ OpenThai AI Platform
## [INTERNAL STRICTLY CONFIDENTIAL — ร่างขอบเขตงานภายใน]

**สถานะ:** ร่างขอบเขตงานสำหรับขอใบเสนอราคาผู้ตรวจสอบอิสระ | อัปเดต: สิงหาคม 2569

---

## 1. บริบทและเหตุผล (Background)

OpenThai AI Platform เป็นระบบโครงสร้างพื้นฐานปัญญาประดิษฐ์ที่ประมวลผลข้อมูลส่วนบุคคล (PII), ข้อมูลทางการเงิน (e-Tax Invoice), และเอกสารธุรกิจที่มีลายเซ็นดิจิทัล (XAdES/Peppol AS4) ก่อนเปิดให้บริการเชิงพาณิชย์และยื่นเอกสารต่อนักลงทุนและหน่วยงานกำกับดูแล บริษัทต้องการรายงาน Security Audit จากผู้ตรวจสอบอิสระที่ได้รับการยอมรับ

---

## 2. ขอบเขตการตรวจสอบ (Scope of Work)

### 2.1 Application Security Testing

| รายการ | ระบบที่ตรวจ | มาตรฐานอ้างอิง |
|--------|-----------|--------------|
| Web Application Penetration Test | Frontend (Next.js/React) + API (FastAPI/Node.js) | OWASP Top 10 2021, OWASP WSTG |
| API Security Assessment | REST API endpoints, Webhook, LINE Messaging API | OWASP API Security Top 10 |
| Authentication & Authorization | JWT, PKCE, Role-Based Access Control (RBAC) | NIST SP 800-63B |
| Session Management | Cookie security, token expiry, refresh flow | OWASP ASVS Level 2 |
| PDPA Data Flow Audit | การไหลของข้อมูลส่วนบุคคลตลอด pipeline | พ.ร.บ. PDPA + OWASP Privacy Top 10 |

### 2.2 Cryptographic & PKI Security

| รายการ | รายละเอียด |
|--------|-----------|
| XAdES Signature Engine | ตรวจสอบ C14N canonicalization, hash algorithm, key usage |
| OCSP/CRL Revocation | ตรวจสอบ LiveRevocationChecker: cache bypass, replay attack |
| SoftHSM2 / Key Management | ตรวจสอบ key isolation, PKCS#11 interface hardening |
| TLS/mTLS Configuration | Cipher suite, certificate validation, mutual authentication (Peppol AS4) |
| Key Storage & Rotation | ตรวจสอบ secret management ใน environment variables |

### 2.3 Infrastructure & DevOps Security

| รายการ | รายละเอียด |
|--------|-----------|
| Docker Container Security | Image scanning, privilege escalation, network policy |
| Nginx / Reverse Proxy | Header injection, CORS configuration, rate limiting |
| PostgreSQL / Supabase | SQL injection, RLS policy bypass, backup encryption |
| CI/CD Pipeline | GitHub Actions: secret exposure, dependency confusion |
| Environment Configuration | `.env` leak detection, สแกน secrets ใน git history |

### 2.4 Peppol AS4 Gateway Security

| รายการ | รายละเอียด |
|--------|-----------|
| SMP DNS Spoofing | ตรวจสอบความเสี่ยง DNS hijack ใน SML lookup |
| AS4 Message Integrity | SOAP envelope tampering, signature stripping |
| mTLS Certificate Validation | Certificate pinning, revocation checking |
| Endpoint Discovery | ตรวจสอบ SMP response parsing (lxml XXE, injection) |

### 2.5 AI/LLM-Specific Security (ถ้ามี component ใช้งาน)

| รายการ | รายละเอียด |
|--------|-----------|
| Prompt Injection | ตรวจสอบ input sanitization ก่อนส่งเข้า LLM |
| PII Leakage via LLM Output | ตรวจสอบว่าโมเดลไม่คาย PII จาก context |
| Model Endpoint Access Control | RBAC บน inference endpoints |

---

## 3. สิ่งที่อยู่นอกขอบเขต (Out of Scope)

- การทดสอบ Third-party services (Omise, Supabase Cloud, LINE API servers)
- Social engineering / Phishing ต่อพนักงาน
- Physical security testing
- Denial of Service (DoS/DDoS) testing ต่อ production environment

---

## 4. ผลส่งมอบที่คาดหวัง (Deliverables)

| รายการ | รูปแบบ | กำหนดส่ง |
|--------|--------|---------|
| Executive Summary Report | PDF (TH+EN) | ≤ 5 วันทำการหลังสิ้นสุดการทดสอบ |
| Technical Finding Report | PDF พร้อม PoC | ≤ 10 วันทำการ |
| Risk Rating Matrix | CVSS 3.1 Base Score | รวมในรายงานเทคนิค |
| Remediation Guidance | Per-finding (Code + Config) | รวมในรายงานเทคนิค |
| Retest Certificate | PDF | ≤ 5 วันหลัง remediation |
| Raw Evidence Archive | ZIP (screenshots, traffic capture) | ส่งพร้อม Technical Report |

---

## 5. คุณสมบัติผู้ตรวจสอบ (Vendor Requirements)

- **ใบรับรองวิชาชีพ:** OSCP, OSCE, CEH, หรือเทียบเท่า (อย่างน้อย 1 ใบต่อทีม)
- **ประสบการณ์:** ≥ 3 ปี ในการทดสอบระบบ AI Platform หรือ FinTech / e-Government
- **NDA:** ลงนาม Non-Disclosure Agreement ก่อนรับ Source Code
- **ความเป็นอิสระ:** ต้องไม่มีความขัดแย้งทางผลประโยชน์กับ OpenThai AI
- **ที่ตั้ง:** บริษัทจดทะเบียนในไทย หรือมีสาขาไทยที่ขึ้นตรงต่อกฎหมายไทย (เพื่อ Data Sovereignty)

### ตัวอย่างบริษัทที่ได้รับการยอมรับในไทย (ประมาณการ — ต้องตรวจสอบปัจจุบัน)

| บริษัท | ความเชี่ยวชาญ | เว็บไซต์ |
|--------|-------------|---------|
| ACIS Professional Center | PDPA + Pentest + ISO 27001 | acis.co.th |
| NT cyfence (TOT Subsidiary) | Government + Financial sector pentest | cyfence.com |
| SRAN Technology | Network + App Security + CERT-TH | sran.net |
| Cyber Elite | Red Team + Cloud Security | cyber-elite.com |

> หมายเหตุ: รายชื่อข้างต้นเป็นข้อมูลประมาณการ ต้องตรวจสอบสถานะใบรับรองและความพร้อมของแต่ละบริษัทอีกครั้งก่อนส่ง RFP

---

## 6. ข้อกำหนดเพิ่มเติม (Additional Terms)

- **Source Code Disclosure:** เปิดเผย Source Code ให้ผู้ตรวจสอบเฉพาะในสภาพแวดล้อม Staging ที่ควบคุม ห้ามส่งออกนอกสถานที่โดยไม่ได้รับอนุญาต
- **Test Environment:** ทดสอบบน Staging Environment เท่านั้น — ห้ามทดสอบ Production
- **Sensitive Data:** ข้อมูลที่ใช้ในการทดสอบต้องเป็น Synthetic/Anonymized ทั้งหมด
- **Reporting Language:** รายงานบรรณาธิการหลักเป็นภาษาไทย + บทสรุปภาษาอังกฤษ
- **Confidentiality:** ห้ามเปิดเผยผลการทดสอบต่อบุคคลที่สาม ผู้ตรวจสอบต้องลงนาม NDA ก่อนเริ่ม

---

## 7. Timeline ประมาณการ

```
[เดือน 1]
  ↓ จดทะเบียนนิติบุคคล (A1) → มีนิติบุคคลสำหรับทำสัญญา
  ↓ ส่ง RFP ฉบับนี้ให้ผู้สนใจ 3-5 ราย
  ↓ รับใบเสนอราคา → เปรียบเทียบและเลือกผู้ตรวจสอบ

[เดือน 2]
  ↓ ลงนาม NDA + สัญญาจ้าง
  ↓ เตรียม Staging Environment + Synthetic Data
  ↓ Kick-off meeting + Scope Confirmation

[เดือน 2-3]
  ↓ ดำเนินการทดสอบ (2-4 สัปดาห์)
  ↓ รับ Technical Report + PoC

[เดือน 3-4]
  ↓ Remediation (แก้ไขตามผล)
  ↓ Retest + Certification Letter
  ↓ [พร้อมส่งรายงานให้ FA สำหรับ Due Diligence B9 ✅]
```

---

*เอกสารนี้ใช้สำหรับเตรียมการภายในเท่านั้น ตัวเลขค่าใช้จ่ายและสัญญาจ้างต้องผ่านคณะกรรมการบริษัทก่อนลงนาม*
