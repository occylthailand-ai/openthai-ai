# XAdES Release Gate Checklist

> **Internal** — อัปเดต: 2026-08-22  
> เสิร์ฟกลุ่ม: 2 (คนกลาง/ชิปปิ้ง/ผู้ส่งออก) + 6 (สายวิชาชีพ/นักบัญชี)

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

```bash
# สร้าง BES
python scripts/xades_signer.py \
  --xml docs/etax_output/SAMPLE-INV-2568-001.xml \
  --key certs/sample-key.pem \
  --cert certs/sample-cert.pem \
  --out docs/etax_output/golden-bes.xml

# BES → T
python scripts/xades_tsa_stamp.py \
  --xml docs/etax_output/golden-bes.xml \
  --tsa https://tsa.example.th/tsr \
  --out docs/etax_output/golden-t.xml

# ตรวจ digest สำหรับ ArchiveTimeStamp
python scripts/archive_timestamp_digest.py \
  docs/etax_output/golden-t.xml
```

- [ ] `golden-bes.xml` XML valid + มี `ds:Signature` + มี `xades:SignedProperties`
- [ ] `golden-t.xml` มี `xades:UnsignedProperties/xades:SignatureTimeStamp`
- [ ] SHA-256 hash ของทั้งสองไฟล์บันทึกใน `docs/etax_output/golden-hashes.sha256`
- [ ] Hash ไม่เปลี่ยนเมื่อรันซ้ำ (deterministic signing ตรวจสอบ)

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
