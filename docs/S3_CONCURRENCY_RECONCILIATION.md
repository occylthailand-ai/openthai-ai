# S3 — Concurrent Batch Submission & Reconciliation

กรมสรรพากร e-Tax Invoice & e-Receipt  
Stage ที่ 3: ยื่น batch พร้อมกัน + reconcile สถานะ

---

## ภาพรวม

Stage S3 จัดการกรณีที่ต้องยื่นเอกสารจำนวนมากในคราวเดียว:

```
etax_queue/          ← ไฟล์ XML ที่รอยื่น
     └─ INV-001.xml
     └─ INV-002.xml
     └─ ...

          ↓  run_stage_s3_batch.py

etax_ledger.json     ← สถานะของทุกเอกสาร (idempotency store)

          ↓  reconcile_stage_s3.py (ถ้ามี ERROR/PENDING)

etax_ledger.json     ← อัปเดตสถานะจาก RD
```

---

## Architecture

### Worker Pool

```
Queue [INV-001, INV-002, ..., INV-N]
         │
    ┌────┴────┐
    │  Worker │ × S3_MAX_WORKERS (default 4)
    └────┬────┘
         │
    _process_one()
         │
    ┌────┴──────────────────────────────┐
    │ 1. Idempotency check (ledger)     │
    │ 2. Build XAdES-T payload          │
    │ 3. POST to RD (mTLS TLS 1.3)     │
    │ 4. Parse ACK → update ledger      │
    └───────────────────────────────────┘
```

### Ledger (idempotency store)

Key: `{sender_tax_id}::{document_number}`

| State | Meaning | Action on next run |
|---|---|---|
| `PENDING` | ยังไม่ได้ยื่น | ยื่น |
| `SUBMITTED` | RD รับแล้ว (ACCEPTED) | **ข้ามเสมอ — ไม่ยื่นซ้ำ** |
| `DUPLICATE` | RD บอกว่ารับไปแล้ว | **ข้ามเสมอ** |
| `FAILED` | RD ปฏิเสธถาวร (4xx/REJECTED) | **ข้ามเสมอ** — ต้องแก้เอกสาร |
| `ERROR` | Transient (5xx/timeout) | Retry ถ้า retries < MAX_RETRIES |

---

## Idempotency Rules

1. ก่อนส่งทุกครั้ง — ตรวจ key `(sender_tax_id, document_number)` ใน ledger
2. ถ้า state เป็น `SUBMITTED`, `DUPLICATE`, หรือ `FAILED` → **ข้ามทันที ไม่ POST**
3. `submission_id` เป็น UUID v4 ใหม่ทุก attempt (RD ใช้ `document_number` เป็น idempotency key ฝั่งตัวเอง)
4. ถ้า RD ตอบ `DUPLICATE` → บันทึก state เป็น `DUPLICATE` (ถือว่าสำเร็จ)

---

## Retry Policy

| Condition | Action |
|---|---|
| HTTP 200/201 + ACCEPTED | `SUBMITTED` — หยุด |
| HTTP 200/201 + DUPLICATE | `DUPLICATE` — หยุด |
| HTTP 400/422 / REJECTED | `FAILED` — หยุด (ไม่ retry) |
| HTTP 5xx / timeout / network error | `ERROR` + retry ด้วย backoff |
| retries ≥ MAX_RETRIES | `ERROR` final — ขึ้น FAIL ใน summary |

### Backoff

```
delay = BACKOFF_BASE ^ attempt
attempt 0 → 2s
attempt 1 → 4s
attempt 2 → 8s
```

ค่า default: `S3_MAX_RETRIES=3`, `S3_BACKOFF_BASE=2.0`

---

## Reconciler

`reconcile_stage_s3.py` ทำงานหลังจาก `run_stage_s3_batch.py` เพื่อ:

1. ดึงทุก record ที่ไม่อยู่ใน terminal state (`SUBMITTED`, `DUPLICATE`, `FAILED`)
2. Query RD status endpoint สำหรับแต่ละ document
3. อัปเดต ledger ตาม response

| RD response | Ledger → |
|---|---|
| ACCEPTED | SUBMITTED |
| DUPLICATE | DUPLICATE |
| REJECTED | FAILED |
| NOT_FOUND | PENDING (ยื่นใหม่รอบถัดไป) |

`--requeue` flag: หลัง reconcile แล้ว ถ้ายังมี non-terminal → เรียก `run_stage_s3_batch.py` อัตโนมัติ

---

## Env Vars

| Variable | Required | Default | Description |
|---|---|---|---|
| `S3_MAX_WORKERS` | no | 4 | จำนวน worker thread สูงสุด |
| `S3_MAX_RETRIES` | no | 3 | จำนวน retry สูงสุดสำหรับ ERROR |
| `S3_BACKOFF_BASE` | no | 2.0 | ฐานของ exponential backoff (วินาที) |
| `RD_ENDPOINT` | live | — | Base URL ของ RD API |
| `RD_CLIENT_CERT` | live | — | Client cert (.pem) |
| `RD_CLIENT_KEY` | live | — | Client private key |
| `RD_CA_BUNDLE` | optional | system | RD CA bundle |
| `RD_SENDER_TAX_ID` | live | — | Tax ID 13 หลัก |
| `RD_AUTH_TOKEN` | optional | — | Bearer JWT |

---

## Scripts

```bash
# Batch submit (mock)
python3 scripts/run_stage_s3_batch.py --dir etax_queue/

# Batch submit (live)
python3 scripts/run_stage_s3_batch.py --live --dir etax_queue/ --workers 8

# ใช้ manifest JSON
python3 scripts/run_stage_s3_batch.py --manifest etax_manifest.json

# Reconcile (mock)
python3 scripts/reconcile_stage_s3.py

# Reconcile (live) แล้ว requeue ERROR อัตโนมัติ
python3 scripts/reconcile_stage_s3.py --live --requeue

# ดู ledger สถานะ
python3 -c "import json; d=json.load(open('etax_ledger.json')); \
  [print(k, v['status']) for k,v in d.items()]"
```

---

## Pass Criteria (S3)

- [x] Mock mode: exit 0 (ไม่มี cert/endpoint)
- [x] `SUBMITTED` / `DUPLICATE` ไม่ถูก POST ซ้ำ (idempotency)
- [x] Worker pool จำกัดด้วย `S3_MAX_WORKERS`
- [x] Retry เฉพาะ 5xx/timeout, ไม่ retry 4xx
- [x] Backoff: `BACKOFF_BASE ^ attempt` วินาที
- [x] Reconciler อัปเดต ledger จาก RD status query
- [x] `--requeue` flag เรียก batch runner อัตโนมัติ
- [x] Exit 0 = ทุกเอกสาร terminal; Exit 1 = ยังมีค้างอยู่

---

## Blocker (รอจาก กรมสรรพากร)

- [ ] URL จริงของ submission endpoint และ status endpoint
- [ ] CA bundle สำหรับ verify RD server certificate
- [ ] Client certificate (ออกโดย CA ที่ RD รับรอง)
- [ ] ตัวอย่าง ACK response format (JSON field names จริง)
- [ ] TSA endpoint สำหรับ XAdES-T timestamp
