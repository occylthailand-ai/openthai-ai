# XAdES Release Gate Checklist

> **Internal** — อัปเดต: 2026-08-23  
> เสิร์ฟกลุ่ม: 2 (คนกลาง/ชิปปิ้ง/ผู้ส่งออก) + 6 (สายวิชาชีพ/นักบัญชี)

---

## ภาพรวม 2 สาย eTax

```
[ สาย MVP — ก.อ.01 ]                        [ สาย Production — บ.อ.01 ]
          │                                              │
ยื่น ก.อ.01 กรมสรรพากร                       ยื่น บ.อ.01 กรมสรรพากร
          │                                              │
ออก PDF/A-3 + Embedded XML                    ออก XML (ขมธอ.3-2560)
          │                                              │
ส่งผ่าน Authorized Sender Email               XAdES-BES + RFC 3161 TSA
          │                                              │
ETDA Timestamp อัตโนมัติ                      Self-signed + TSA Token
          │                                              │
Archival script เก็บ Timestamped PDF          ผ่าน XADES-RELEASE-GATE ทั้งหมด
          │                                              │
   เปิดบริการทันที ✅                          รอ CA cert + TSA URL จริง ⏳
```

| มิติ | ก.อ.01 (MVP) | บ.อ.01 (Production XAdES-T) |
|---|---|---|
| แบบฟอร์ม | **ก.อ.01** | **บ.อ.01** |
| รูปแบบไฟล์ | PDF/A-3 + Embedded XML | XML ขมธอ. 3-2560 |
| การรับรอง | ETDA Stamp ผ่านระบบ Email | XAdES-BES + RFC 3161 TSA (self) |
| ขีดจำกัด | รายได้ ≤ 30 ล้านบาท/ปี (ประมาณการ) | ไม่จำกัด — Real-time |
| ต้นทุนเพิ่ม | ฟรี (ไม่ต้องซื้อ CA cert) | CA cert + TSA subscription รายปี |
| spec ฉบับเต็ม | `docs/etax-email-mvp-spec.md` | เอกสารนี้ ขั้นที่ 1–5 |

---

---

## ขั้นที่ 1 — Code Freeze (ก่อน commit แรกของ release branch)

- [ ] **DER guards ผ่านครบ**: รัน `pytest tests/test_xades_integration.py -v -k "der"` → 0 failed
- [ ] **ASN.1 primitives ผ่าน**: `-k "integer or boolean or time"` → 0 failed
- [ ] **RFC 3161 OID layers ผ่าน**: `-k "oid"` → 0 failed
- [ ] **Structure tests ผ่านทุก Python**: CI matrix 3.10 / 3.11 / 3.12 → green
- [ ] **ตัวเลขทุกตัวในเอกสารมีที่มา** หรือระบุ "ประมาณการ" (หลักการ 3 CLAUDE.md)
- [ ] **ห้ามมีข้อมูลส่วนบุคคลจริง** ใน test fixtures (หลักการ PDPA)

---

## ขั้นที่ 2 — Engine Integration (ต้องผ่านก่อน tag)

- [ ] `pip install -e xades-engine/src` → `xades_engine` importable
- [ ] `pytest tests/ -v` → 0 failed, 0 error (skip อนุญาตเฉพาะ engine-optional)
- [ ] `TestExtractorIntegration` → `completeness_score == 1.0` กับ golden fixture
- [ ] `TestVerifierGateIntegration` → XPath alignment ผ่านทุก path
- [ ] `xades_rust_core.is_available()` คืน `True` (Rust core compiled)

---

## ขั้นที่ 3 — Artifact Verify (หลัง generate ก่อน commit)

### 3.1 Reference Fixtures (บันทึกแล้ว)

| ไฟล์ | สถานะ | คำอธิบาย |
|---|---|---|
| `docs/etax_output/SAMPLE-INV-2568-001.xml` | ✅ บันทึกแล้ว | Unsigned Thai e-Tax XML (ขมธอ. 3-2560) สำหรับใช้เป็น Input |
| `docs/etax_output/golden-xades-t-reference.xml` | ✅ บันทึกแล้ว | Reference โครงสร้าง XAdES-T ที่ถูกต้อง (ค่า PLACEHOLDER) |
| `docs/etax_output/golden-bes.xml` | ❌ ยังไม่มี | ต้องสร้างด้วย xades_signer.py + cert จริง |
| `docs/etax_output/golden-t.xml` | ❌ ยังไม่มี | ต้องสร้างด้วย xades_tsa_stamp.py + TSA จริง |
| `docs/etax_output/golden-hashes.sha256` | ❌ ยังไม่มี | SHA-256 fingerprint ของ BES + T |

### 3.2 คำสั่งสร้าง Artifact (ต้องรอ CA cert + TSA URL จริง)

```bash
# ขั้น 1: สร้าง BES (ต้องใช้ cert จาก ETDA-approved CA จริง)
python scripts/xades_signer.py \
  --xml docs/etax_output/SAMPLE-INV-2568-001.xml \
  --key certs/prod-key.pem \
  --cert certs/prod-cert.pem \
  --out docs/etax_output/golden-bes.xml

# ขั้น 2: เพิ่ม Timestamp (ต้องใช้ TSA URL จาก ETDA-approved TSA จริง)
python scripts/xades_tsa_stamp.py \
  --xml docs/etax_output/golden-bes.xml \
  --tsa <ETDA_APPROVED_TSA_URL> \
  --out docs/etax_output/golden-t.xml

# ขั้น 3: ตรวจ digest สำหรับ ArchiveTimeStamp (ขั้นที่ 5)
python scripts/archive_timestamp_digest.py \
  docs/etax_output/golden-t.xml
```

### 3.3 Structural Checklist ของ golden-t.xml (เทียบกับ golden-xades-t-reference.xml)

**Namespace บังคับ:**
- [ ] `xmlns:rsm="urn:etda:uncefact:data:standard:TaxInvoice_CrossIndustryInvoice:2"` ✓
- [ ] `xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"` ✓
- [ ] `xmlns:ds="http://www.w3.org/2000/09/xmldsig#"` ✓

**Schema ETDA (ขมธอ. 3-2560):**
- [ ] `rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID` = `ER3-2560`
- [ ] `rsm:ExchangedDocument/ram:TypeCode` = `388` (Tax Invoice)
- [ ] `IssueDateTime` มี ISO 8601 timezone offset (+07:00)

**XAdES-BES (3 จุดบังคับ — [B] ตาม ETDA):**
- [ ] `[A]` `ds:SignatureValue` มี attribute `Id="SignatureValue-001"` (บังคับก่อนส่ง hash ให้ TSA)
- [ ] `[B]` `xades:SignedProperties/xades:SignedSignatureProperties/xades:SigningTime` มีค่า + timezone
- [ ] `[B]` `xades:SigningCertificate/xades:Cert/xades:CertDigest` ใช้ `sha256` algorithm
- [ ] `[B]` `xades:IssuerSerial` ตรงกับ cert จริง (IssuerName + SerialNumber)
- [ ] `ds:CanonicalizationMethod` = `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` (C14N ไม่ใช่ C14N11)
- [ ] `ds:SignatureMethod` = `rsa-sha256`

**XAdES-T ([C] ตาม ETDA):**
- [ ] `xades:UnsignedProperties/xades:UnsignedSignatureProperties/xades:SignatureTimeStamp` มีอยู่
- [ ] `xades:EncapsulatedTimeStamp` มีค่า (Base64 DER TimeStampToken จาก TSA จริง)
- [ ] `[C]` ค่าใน EncapsulatedTimeStamp **ไม่ใช่** PLACEHOLDER — ต้องเป็น ASN.1 DER จริงที่ผ่าน RFC 3161 parser

**Deterministic signing:**
- [ ] SHA-256 hash ของทั้งสองไฟล์บันทึกใน `docs/etax_output/golden-hashes.sha256`
- [ ] Hash ไม่เปลี่ยนเมื่อรัน signing ซ้ำด้วย input เดิม (deterministic RSA padding)

---

## ขั้นที่ 4 — Tag & Release

```bash
# tag รูปแบบ: xades-vMAJOR.MINOR.PATCH
git tag -a xades-v1.0.0 -m "XAdES-BES+T release gate passed"
```

- [ ] Tag ชี้ที่ commit ที่ CI ผ่านทั้ง 3 jobs (structure / engine / golden)
- [ ] `CHANGELOG` อัปเดตพร้อมวันที่และรายการ breaking changes
- [ ] xades-engine version pin ใน `requirements-xades-test.txt` ตรงกับ tag
- [ ] **ขออนุญาต Mythos** ก่อน push tag ไปยัง remote (กฎ CLAUDE.md §6)

---

## ขั้นที่ 5 — Post-Release (XAdES-A)

> งานนี้ยังไม่เริ่ม — ต้องรอ ETDA/NECTEC TSA URL จริง

- [ ] CertificateValues: เพิ่ม CA cert chain จริง (ไม่ใช่ SAMPLE)
- [ ] RevocationValues: CRL หรือ OCSP response จริงจาก CA
- [ ] `XAdESAExtractor.completeness_score >= 0.8` กับ production cert
- [ ] ArchiveTimeStamp digest ตรงกับ `compute_archive_digest_sha256()`
- [ ] ยืนยัน TSA endpoint: `docs/ETDA-TSA-CPS.md` (ยังไม่ได้รับเอกสาร)

---

## ขั้นที่ 6 — Thai e-Tax Standard Compliance (กรมสรรพากร)

> ตรวจสอบ: 23 ส.ค. 2569 | อ้างอิง: ประกาศอธิบดีกรมสรรพากร ฉบับที่ 20 (2562)

### 6.1 ช่องทาง e-Tax ไทย — เลือกก่อน deploy

| ช่องทาง | มาตรฐาน | ต้องใช้ XAdES CA | ความยาก | แนะนำสำหรับ |
|---|---|---|---|---|
| **e-Tax Invoice by Email** (ฉบับ 196/2561) | PDF/XML + email ลงทะเบียน | ❌ ไม่ต้อง | ต่ำ | **MVP Commerce** |
| **e-Tax Invoice & e-Receipt** (ฉบับ 20/2562) | XAdES-BES+T จาก ETDA CA | ✅ ต้อง | สูง | **Production** |

**การตัดสินใจ:** MVP Commerce ใช้ช่องทาง **e-Tax by Email** ก่อน — ลงทะเบียนกับกรมสรรพากรและรับ Token  
XAdES engine ที่สร้างไว้ใช้กับช่องทาง 2 เมื่อพร้อม production

### 6.2 ช่องทาง 2 — XAdES Compatibility Gap

| รายการ | สถานะ | หมายเหตุ |
|---|---|---|
| XAdES-BES code | ✅ พร้อม | ผ่านทุก DER/ASN.1 guard |
| XAdES-T (RFC 3161 timestamp) | ✅ code พร้อม | TSA URL ยังเป็น placeholder |
| **TSA URL จาก ETDA-recognized provider** | ❌ placeholder | ต้องได้ NECTEC/CAT/INET TSA URL จริง |
| **CA Certificate จาก ETDA-recognized CA** | ❌ ยังไม่มี | ต้องซื้อ/ขอ Digital Certificate จาก CAT-CA / NECTEC-NeST / INET |
| Thai e-Tax XML schema validation | ❓ ยังไม่ตรวจ | ต้อง validate input XML ตาม schema กรมสรรพากร |
| XAdES-A (7-year archival retention) | ❌ ยังไม่เริ่ม | ขั้นที่ 5 — ไม่บล็อก MVP |
| Golden artifact กับ Thai e-Tax XML จริง | ❌ ยังไม่มี | ต้องรอ CA cert + TSA จริง |

### 6.3 ETDA-Recognized Providers (ข้อมูลสาธารณะ — ตรวจยืนยันก่อนสั่งซื้อ)

| ประเภท | ผู้ให้บริการ | หมายเหตุ |
|---|---|---|
| CA (Digital Certificate) | CAT Telecom CA | ต้องยืนยัน ETDA รับรองล่าสุด |
| CA | NECTEC-NeST CA | ต้องยืนยัน ETDA รับรองล่าสุด |
| CA | INET/T-TAX CA | ต้องยืนยัน ETDA รับรองล่าสุด |
| TSA | NECTEC TSA | URL จริงอยู่ใน CPS ของ NECTEC — ต้องขอเอกสาร |
| TSA | CAT TSA | ต้องขอ CPS จาก CAT |

⚠️ ตัวเลข/URL ทุกรายการในตาราง = "ต้องยืนยันจากแหล่งปฐมภูมิก่อนใช้" (หลักการ CLAUDE.md ข้อ 3)

### 6.4 Checklist ก่อนต่อ XAdES เข้า Commerce (ช่องทาง 2)

- [ ] ลงทะเบียนกับกรมสรรพากร (e-Tax Invoice & e-Receipt)
- [ ] ซื้อ Digital Certificate จาก ETDA-recognized CA → บันทึกลงใน Vault (ไม่ใช่ repo)
- [ ] ได้ TSA endpoint URL จริง → อัปเดต config ใน `xades_engine/config.py`
- [ ] รัน Golden artifact test ด้วย Thai e-Tax XML จริง (ไม่ใช่ SAMPLE)
- [ ] ผ่าน XAdES-T verify โดย relying party ภายนอก (กรมสรรพากร หรือ ETDA verifier)
- [ ] **ขออนุญาต Mythos** ก่อน submit e-Tax ชุดแรกเข้าระบบกรมสรรพากร (กฎ CLAUDE.md §6)

---

## ข้อสังเกตสำคัญ (จาก session 2026-08-22)

| หัวข้อ | สถานะ |
|--------|-------|
| DER guards (tag + length octets) | ✅ ครบ (short/long-form/non-minimal/leading-zero) |
| ASN.1 INTEGER non-minimal encoding | ✅ ครบ |
| DER BOOLEAN (TRUE=0xFF, ไม่ใช่ BER any-nonzero) | ✅ ครบ |
| GeneralizedTime DER strict form | ✅ ครบ |
| RFC 3161 OID สองชั้น (signedData + TSTInfo) | ✅ ครบ |
| xades-engine installed ใน CI | ❌ ยังไม่ได้ตั้ง PYTHONPATH |
| ETDA/NECTEC TSA URL | ❌ ยังเป็น placeholder |
| Python 3.12 ติดตั้งใน dev machine | ❌ ยังไม่ได้รัน winget |
| Golden artifact committed | ❌ ยังไม่มีไฟล์ |
