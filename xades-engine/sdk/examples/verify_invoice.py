"""ตัวอย่างการใช้งานจริง — บริษัทรับใบกำกับภาษี e-Tax แล้วตรวจสอบ

Use case: บริษัท A ได้รับ XML ใบกำกับภาษีอิเล็กทรอนิกส์ 500 ใบจาก supplier
          ต้องการตรวจสอบว่าทุกใบมีลายมือชื่ออิเล็กทรอนิกส์ถูกต้องตามมาตรฐาน ETDA

วิธีรัน (หลัง docker compose up):
    python verify_invoice.py --demo
    python verify_invoice.py invoice1.xml invoice2.xml --revocation
    python verify_invoice.py /path/to/invoice/folder/
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "python"))
from client import ETaxVerifier, VerifyResult


def demo_single_verify():
    """ตัวอย่าง: ตรวจสอบใบเดียว"""
    print("=" * 60)
    print("  ตัวอย่าง 1: ตรวจสอบใบกำกับภาษีใบเดียว")
    print("=" * 60)

    v = ETaxVerifier("http://localhost:8080")

    # ตรวจสอบ API พร้อมหรือยัง
    if not v.is_available():
        print("❌ API ยังไม่พร้อม — รัน: docker compose up -d")
        return

    info = v.health()
    print(f"✅ Engine: {info['engine_version']} | C14N: {info.get('c14n_backend', 'lxml')}")
    print()

    # สร้าง XML ตัวอย่างขึ้นมาทดสอบ (production: อ่านจากไฟล์จริง)
    sample_xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:etda:etax:invoice:1.0"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         ID="INV-2026-0001">
  <IssueDate>2026-08-12</IssueDate>
  <Seller><Name>บริษัท ผู้ขาย จำกัด</Name><TaxId>0105560012345</TaxId></Seller>
  <Buyer><Name>บริษัท ผู้ซื้อ จำกัด</Name><TaxId>0105560098765</TaxId></Buyer>
  <TotalAmount currency="THB">107000.00</TotalAmount>
  <VAT rate="7">7000.00</VAT>
</Invoice>"""

    try:
        result = v.verify_bytes(sample_xml, document_id="INV-2026-0001")
        print(result)
        print(f"  Profile  : {result.xades_profile}")
        print(f"  Revocation: {result.revocation_status}")
    except Exception as exc:
        print(f"⚠️  {exc}")


def demo_batch_verify():
    """ตัวอย่าง: ตรวจสอบ 500 ใบพร้อมกัน"""
    print()
    print("=" * 60)
    print("  ตัวอย่าง 2: Batch — ตรวจสอบหลายใบพร้อมกัน")
    print("=" * 60)

    v = ETaxVerifier("http://localhost:8080")
    if not v.is_available():
        print("❌ API ยังไม่พร้อม")
        return

    # สร้างชุดเอกสารตัวอย่าง 10 ใบ
    documents = []
    for i in range(1, 11):
        xml = f"""<?xml version="1.0"?>
<Invoice xmlns="urn:etda:etax:invoice:1.0" ID="INV-2026-{i:04d}">
  <IssueDate>2026-08-12</IssueDate>
  <TotalAmount currency="THB">{i * 10700}.00</TotalAmount>
</Invoice>""".encode()
        documents.append({"document_id": f"INV-2026-{i:04d}", "xml_bytes": xml})

    t0 = time.perf_counter()
    results = v.verify_batch(documents, max_workers=8)
    elapsed = time.perf_counter() - t0

    passed = sum(1 for r in results if r.passed)
    print(f"ผลลัพธ์: ผ่าน {passed}/{len(results)} ใบ ใน {elapsed:.2f} วินาที")
    print(f"Throughput: {len(results)/elapsed:.0f} ใบ/วินาที")


def demo_erp_integration():
    """ตัวอย่าง: Integration กับ ERP / ระบบบัญชี"""
    print()
    print("=" * 60)
    print("  ตัวอย่าง 3: Integration กับระบบ ERP")
    print("=" * 60)

    print("""
สำหรับระบบ ERP ที่ต้องการ integrate:

    # 1. ติดตั้ง (ภายใน environment ของ ERP)
    pip install requests

    # 2. เพิ่มในโค้ด ERP
    from openthai_etax import ETaxVerifier

    verifier = ETaxVerifier(
        api_url=os.getenv("ETAX_API_URL", "http://etax-api:8080"),
        check_revocation=True,   # ตรวจ OCSP/CRL จริงในสภาพแวดล้อม production
    )

    # 3. เมื่อรับใบกำกับภาษีจาก supplier
    def on_receive_invoice(xml_bytes: bytes, inv_id: str) -> bool:
        result = verifier.verify_bytes(xml_bytes, document_id=inv_id)

        if not result.passed:
            # บันทึก log + แจ้งแผนกบัญชี
            audit_log.error("ลายมือชื่อไม่ถูกต้อง: %s — %s", inv_id, result.errors)
            return False

        if result.revocation_status == "REVOKED":
            # ใบรับรองถูก revoke — หยุดประมวลผลทันที
            audit_log.critical("ใบรับรองถูก revoke: %s", inv_id)
            return False

        # บันทึก profile ลง ERP database
        db.update_invoice(inv_id, {
            "signature_verified": True,
            "xades_profile": result.xades_profile,
            "verified_at": datetime.now().isoformat(),
        })
        return True
""")


def demo_revenue_scenarios():
    """แสดงสถานการณ์การสร้างรายได้"""
    print()
    print("=" * 60)
    print("  Business Value — สถานการณ์การสร้างรายได้")
    print("=" * 60)
    print("""
┌─────────────────────────────────────────────────────────┐
│  ลูกค้าเป้าหมาย          │  ปริมาณ        │  Use case      │
├─────────────────────────────────────────────────────────┤
│  บริษัทขนาดกลาง-ใหญ่     │  1,000 ใบ/วัน  │  ตรวจรับใบแจ้ง │
│  โรงพยาบาล / ห้างสรรพสินค้า │  5,000 ใบ/วัน │  Audit trail   │
│  ระบบ e-Procurement รัฐ   │  50,000 ใบ/วัน │  Batch verify  │
│  สำนักงานบัญชี            │  100+ ลูกค้า   │  Multi-tenant  │
└─────────────────────────────────────────────────────────┘

  รูปแบบรายได้ที่เป็นไปได้:
  • On-Premise License: ติดตั้งในองค์กร — จ่ายครั้งเดียว/ปี
  • API SaaS: จ่ายตามจำนวนใบที่ verify จริง (Pay-per-use)
  • Integration Service: ช่วย integrate กับ ERP ที่ใช้อยู่
  • Compliance Audit: รายงาน + Dashboard สำหรับ CFO/ผู้สอบบัญชี
""")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="OpenThai eTax — ตัวอย่างการใช้งาน")
    parser.add_argument("--demo", action="store_true", help="รันตัวอย่างครบทุกแบบ")
    parser.add_argument("files", nargs="*", help="XML files ที่ต้องการตรวจสอบ")
    args = parser.parse_args()

    if args.demo or not args.files:
        demo_single_verify()
        demo_batch_verify()
        demo_erp_integration()
        demo_revenue_scenarios()
    else:
        v = ETaxVerifier("http://localhost:8080")
        for f in args.files:
            result = v.verify_file(f)
            print(result)
