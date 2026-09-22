"""
XAdES-T Stamper — OpenThai AI
ขอ RFC 3161 TimeStampToken จาก TSA และยกระดับ XAdES-BES → XAdES-T

Pipeline Step 4b (optional upgrade):
  xades_signer.py → [signed.xml] → xades_tsa_stamp.py → [signed-t.xml]

TSA URL ที่ควรใช้ใน Production (ยังไม่ได้รับการยืนยันอย่างเป็นทางการ):
  - ETDA TSA: ติดต่อ https://www.etda.or.th สำหรับ endpoint จริง
  - NECTEC PKI TSA: ติดต่อ https://www.nectec.or.th/pki
  สำหรับทดสอบ: https://freetsa.org/tsr (public test TSA)

ใช้งาน:
  python xades_tsa_stamp.py \
    --xml docs/etax_output/invoice-signed.xml \
    --tsa https://freetsa.org/tsr \
    --out docs/etax_output/invoice-signed-t.xml

เสิร์ฟ: กลุ่ม 2 (คนกลาง/B2B), กลุ่ม 3 (Platform e-Tax ETDA)
อ้างอิง: RFC 3161, ETSI EN 319 132 XAdES-T
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import sys
from pathlib import Path

try:
    from lxml import etree
except ImportError:
    sys.exit("[ERROR] ต้องติดตั้ง lxml: pip install lxml")

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False

try:
    from pyasn1.codec.der import encoder as der_encoder
    from pyasn1.codec.der import decoder as der_decoder
    from pyasn1.type import univ
    from pyasn1_modules import rfc3161, rfc2459
    _HAS_ASN1 = True
except ImportError:
    _HAS_ASN1 = False


# ── Namespace constants ───────────────────────────────────────────────────────

NS_DS    = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
ALG_C14N_EXCL = "http://www.w3.org/2001/10/xml-exc-c14n#"
_NS = {"ds": NS_DS, "xades": NS_XADES}

# SHA-256 OID: 2.16.840.1.101.3.4.2.1
_SHA256_OID = univ.ObjectIdentifier((2, 16, 840, 1, 101, 3, 4, 2, 1)) if _HAS_ASN1 else None


# ── TSA Request (RFC 3161) ────────────────────────────────────────────────────

def fetch_tsa_token(signature_value_b64: str, tsa_url: str) -> str:
    """
    ส่ง TimeStampReq (RFC 3161 DER) ไปยัง TSA endpoint
    รับ TimeStampResp กลับมา แล้วคืน TimeStampToken ในรูป base64

    ขั้นตอน:
    1. SHA-256 digest ของ SignatureValue bytes
    2. ประกอบ TimeStampReq ด้วย pyasn1 → DER
    3. POST ไปยัง TSA (Content-Type: application/timestamp-query)
    4. แยก TimeStampToken จาก TimeStampResp → base64
    """
    if not _HAS_ASN1:
        raise RuntimeError(
            "pyasn1 / pyasn1-modules ไม่ได้ติดตั้ง: pip install pyasn1 pyasn1-modules"
        )
    if not _HAS_REQUESTS:
        raise RuntimeError("requests ไม่ได้ติดตั้ง: pip install requests")

    sig_bytes  = base64.b64decode(signature_value_b64)
    sig_digest = hashlib.sha256(sig_bytes).digest()

    # ── ประกอบ MessageImprint ─────────────────────────────────────────────────
    alg_id = rfc2459.AlgorithmIdentifier()
    alg_id["algorithm"]  = _SHA256_OID
    alg_id["parameters"] = univ.Null()

    msg_imprint = rfc3161.MessageImprint()
    msg_imprint["hashAlgorithm"] = alg_id
    msg_imprint["hashedMessage"] = univ.OctetString(sig_digest)

    # ── ประกอบ TimeStampReq ───────────────────────────────────────────────────
    ts_req = rfc3161.TimeStampReq()
    ts_req["version"]        = 1
    ts_req["messageImprint"] = msg_imprint
    ts_req["certReq"]        = True

    req_der = der_encoder.encode(ts_req)

    # ── ส่ง HTTP POST ─────────────────────────────────────────────────────────
    resp = requests.post(
        tsa_url,
        data=req_der,
        headers={"Content-Type": "application/timestamp-query"},
        timeout=15,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"TSA ตอบกลับ HTTP {resp.status_code} จาก {tsa_url}"
        )
    if not resp.content:
        raise RuntimeError("TSA ส่งข้อมูลกลับมาว่างเปล่า")

    # ── ถอดรหัส TimeStampResp → ดึง TimeStampToken ────────────────────────────
    ts_resp, _remainder = der_decoder.decode(
        resp.content, asn1Spec=rfc3161.TimeStampResp()
    )
    status = int(ts_resp["status"]["status"])
    if status not in (0, 1):  # 0=granted, 1=grantedWithMods
        raise RuntimeError(f"TSA ปฏิเสธคำขอ: PKIStatus={status}")

    tst_der = der_encoder.encode(ts_resp["timeStampToken"])
    return base64.b64encode(tst_der).decode()


# ── Inject UnsignedProperties into signed XML (BES → T) ──────────────────────

def upgrade_to_xades_t(
    signed_xml_path: str | Path,
    tst_b64: str,
    output_path: str | Path,
) -> None:
    """
    อ่าน XAdES-BES XML → เพิ่ม UnsignedProperties ใน QualifyingProperties
    ผลลัพธ์คือไฟล์ XAdES-T ที่ ds:SignatureValue ถูกประทับตราเวลาแล้ว

    โครงสร้างที่เพิ่มเข้าไปใน xades:QualifyingProperties:
      <xades:UnsignedProperties>
        <xades:UnsignedSignatureProperties>
          <xades:SignatureTimeStamp Id="SignatureTimeStamp-1">
            <ds:CanonicalizationMethod Algorithm="...exc-c14n#"/>
            <xades:EncapsulatedTimeStamp>{tst_b64}</xades:EncapsulatedTimeStamp>
          </xades:SignatureTimeStamp>
        </xades:UnsignedSignatureProperties>
      </xades:UnsignedProperties>
    """
    parser = etree.XMLParser(remove_blank_text=True, resolve_entities=False)
    root   = etree.parse(str(signed_xml_path), parser=parser).getroot()

    # หา xades:QualifyingProperties (ต้องมีแล้วจาก xades_signer.py)
    qp = root.find(".//xades:QualifyingProperties", namespaces=_NS)
    if qp is None:
        raise ValueError(
            "ไม่พบ <xades:QualifyingProperties> — ไฟล์นี้อาจไม่ใช่ XAdES-BES ที่ถูกสร้างโดย xades_signer.py"
        )

    # ตรวจว่ายังไม่มี UnsignedProperties อยู่แล้ว
    existing = qp.find("xades:UnsignedProperties", namespaces=_NS)
    if existing is not None:
        raise ValueError("เอกสารนี้มี UnsignedProperties อยู่แล้ว (อาจเป็น XAdES-T แล้ว)")

    # ── สร้าง UnsignedProperties block ───────────────────────────────────────
    unsigned_props_xml = (
        f'<xades:UnsignedProperties'
        f' xmlns:xades="{NS_XADES}"'
        f' xmlns:ds="{NS_DS}">'
        f'<xades:UnsignedSignatureProperties>'
        f'<xades:SignatureTimeStamp Id="SignatureTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{tst_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:SignatureTimeStamp>'
        f'</xades:UnsignedSignatureProperties>'
        f'</xades:UnsignedProperties>'
    )
    unsigned_node = etree.fromstring(unsigned_props_xml.encode(), parser=parser)
    qp.append(unsigned_node)

    # ── เขียนไฟล์ XAdES-T ────────────────────────────────────────────────────
    signed_bytes = etree.tostring(
        root, pretty_print=True, xml_declaration=True, encoding="utf-8"
    )
    Path(output_path).write_bytes(signed_bytes)
    print(f"[OK] XAdES-T เรียบร้อย: {output_path}")
    print(f"     EncapsulatedTimeStamp: {tst_b64[:40]}...")
    print(f"     ตรวจสอบด้วย: python -m pytest xades-engine/tests/test_xades_t.py -v")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _extract_sig_value(xml_path: Path) -> str:
    """ดึง ds:SignatureValue จาก signed XML"""
    root = etree.parse(str(xml_path)).getroot()
    el = root.find(".//ds:SignatureValue", namespaces=_NS)
    if el is None or not el.text:
        raise ValueError("ไม่พบ <ds:SignatureValue> ในไฟล์ XML")
    return el.text.strip()


if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="XAdES-T Stamper — ยกระดับ BES → T ด้วย RFC 3161 TSA"
    )
    p.add_argument("--xml",  required=True,  type=Path,
                   help="ไฟล์ XAdES-BES signed XML จาก xades_signer.py")
    p.add_argument("--tsa",  required=True,
                   help="TSA endpoint URL เช่น https://freetsa.org/tsr")
    p.add_argument("--out",  type=Path,
                   help="ไฟล์ output (default: เพิ่ม -t ก่อน .xml)")
    p.add_argument("--tst-b64", dest="tst_b64",
                   help="ข้าม TSA request — ระบุ TimeStampToken (base64) โดยตรง")
    args = p.parse_args()

    if not args.xml.exists():
        sys.exit(f"[ERROR] ไม่พบไฟล์: {args.xml}")

    out_path = args.out or args.xml.with_stem(args.xml.stem + "-t")

    try:
        if args.tst_b64:
            tst_b64 = args.tst_b64
            print("[INFO] ใช้ TST ที่ระบุโดยตรง (ข้าม TSA request)")
        else:
            sig_val_b64 = _extract_sig_value(args.xml)
            print(f"[INFO] ส่งคำขอไปยัง TSA: {args.tsa}")
            tst_b64 = fetch_tsa_token(sig_val_b64, args.tsa)
            print(f"[OK]  ได้รับ TimeStampToken ({len(base64.b64decode(tst_b64)):,} bytes)")

        upgrade_to_xades_t(args.xml, tst_b64, out_path)

    except (RuntimeError, ValueError) as exc:
        sys.exit(f"[ERROR] {exc}")
