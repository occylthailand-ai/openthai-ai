# S2 — XAdES-T Submission Specification

กรมสรรพากร e-Tax Invoice & e-Receipt  
Stage ที่ 2: ยื่นเอกสารด้วย XAdES-T Signature

---

## ภาพรวม

Stage S2 รับไฟล์ XML (UBL Invoice / Credit Note / Debit Note) ที่ **ลงนาม XAdES-T** แล้ว  
แล้วส่งไปยัง API ของกรมสรรพากรในรูปแบบ **Base64-encoded JSON envelope**  
ผ่าน mTLS (TLS 1.3) ที่ทดสอบใน Stage S1

---

## Request Format

```
POST {RD_ENDPOINT}/etax/document/submit
Content-Type: application/json
Authorization: Bearer {RD_AUTH_TOKEN}   ← ถ้า gateway ต้องการ JWT layer
X-Submission-ID: {uuid-v4}              ← ใช้ idempotency key
```

### JSON Body

| Field | Type | Required | Description |
|---|---|---|---|
| `submission_id` | string (UUID v4) | ✓ | Idempotency key — unique per attempt |
| `sender_tax_id` | string (13 digits) | ✓ | เลขประจำตัวผู้เสียภาษีของผู้ออกเอกสาร |
| `document_number` | string | ✓ | เลขที่เอกสาร (ดึงจาก `cbc:ID`) |
| `issue_date` | string (YYYY-MM-DD) | ✓ | วันที่ออกเอกสาร (`cbc:IssueDate`) |
| `document_type` | string | ✓ | UN/EDIFACT: `380`=Invoice, `381`=CreditNote, `383`=DebitNote |
| `document` | string (Base64) | ✓ | XAdES-T signed XML ทั้งหมด (Base64 encoded) |
| `document_hash` | string (Base64-SHA256) | ✓ | `base64(sha256(raw_xml_bytes))` สำหรับ integrity check |
| `submitted_at` | string (ISO-8601 UTC) | ✓ | เวลาที่ client ส่ง |

ตัวอย่าง:

```json
{
  "submission_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sender_tax_id": "1234567890123",
  "document_number": "INV-2026-00001",
  "issue_date": "2026-08-05",
  "document_type": "380",
  "document": "<Base64 of XAdES-T signed XML>",
  "document_hash": "<Base64 of SHA-256>",
  "submitted_at": "2026-08-05T09:00:00Z"
}
```

---

## XAdES-T Requirements

| Requirement | Detail |
|---|---|
| Signature type | XAdES-BES ขั้นต่ำ, แนะนำ XAdES-T |
| Timestamp authority | TSA ที่กรมสรรพากรรับรอง |
| Certificate | ใบรับรองอิเล็กทรอนิกส์ที่ออกโดย CA ที่กรมสรรพากรรับรอง |
| Canonicalization | `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` |
| Digest algorithm | SHA-256 |
| Signature algorithm | RSA-SHA256 หรือ ECDSA-SHA256 |

---

## Response — ACK Map

### HTTP 200 / 201 (Success)

```json
{
  "status": "ACCEPTED",
  "reference_id": "RD-2026-XXXXXXXX",
  "message": "เอกสารได้รับการยืนยันแล้ว"
}
```

| `status` | Ledger state | การจัดการ |
|---|---|---|
| `ACCEPTED` | `SUBMITTED` | สำเร็จ — ไม่ยื่นซ้ำ |
| `DUPLICATE` | `DUPLICATE` | ยืนยันสำเร็จแล้วก่อนหน้า — ไม่ยื่นซ้ำ |

### HTTP 400 / 422 (Client error — terminal)

```json
{
  "status": "REJECTED",
  "error_code": "INVALID_SIGNATURE",
  "message": "XAdES-T signature validation failed"
}
```

| `status` | Ledger state | การจัดการ |
|---|---|---|
| `REJECTED` | `FAILED` | ปฏิเสธถาวร — ต้องแก้ไขเอกสารก่อนยื่นใหม่ |

**ไม่ retry HTTP 4xx** — สาเหตุมาจาก client (signature ผิด, format ผิด, ข้อมูลขาด)

### HTTP 5xx / Timeout (Transient — retry)

| Condition | Ledger state | การจัดการ |
|---|---|---|
| HTTP 5xx | `ERROR` | Retry ด้วย exponential backoff |
| Connection timeout | `ERROR` | Retry |
| TLS error | `ERROR` | ตรวจ cert ก่อน retry |

---

## Pass Criteria (S2)

- [x] Mock mode: exit 0 (ไม่ต้องมี cert/endpoint)
- [x] Live mode (ถ้า certs พร้อม): HTTP 200 + `ACCEPTED` → exit 0
- [x] `DUPLICATE` ถือว่าผ่าน (เอกสารถูกรับแล้ว)
- [x] ไม่ retry HTTP 4xx (terminal rejection)
- [x] Retry HTTP 5xx ด้วย backoff สูงสุด `S3_MAX_RETRIES` ครั้ง
- [x] `document_hash` ตรวจก่อนส่ง (ป้องกัน bit-flip)

---

## Env Vars

| Variable | Required | Description |
|---|---|---|
| `RD_ENDPOINT` | live only | Base URL ของ RD API gateway |
| `RD_CLIENT_CERT` | live only | Path ไปยัง client certificate (.pem) |
| `RD_CLIENT_KEY` | live only | Path ไปยัง client private key |
| `RD_CA_BUNDLE` | optional | Path ไปยัง RD CA bundle (ถ้าไม่ตั้ง ใช้ system default) |
| `RD_SENDER_TAX_ID` | live only | เลขประจำตัวผู้เสียภาษี 13 หลัก |
| `RD_AUTH_TOKEN` | optional | Bearer JWT สำหรับ gateway ชั้นบน |

---

## Script

```bash
# Mock (ทดสอบโดยไม่มี cert)
python3 scripts/submit_stage_s2_xades.py

# ยื่นไฟล์เดียว
python3 scripts/submit_stage_s2_xades.py --live path/to/invoice.xml

# ยื่นทุกไฟล์ใน directory
python3 scripts/submit_stage_s2_xades.py --live --batch path/to/queue/
```
