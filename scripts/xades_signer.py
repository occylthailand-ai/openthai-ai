"""
XAdES-BES Signer — OpenThai AI
ลงลายเซ็นดิจิทัลบนไฟล์ UBL 2.1 XML ตามมาตรฐาน XAdES-BES (ETDA Thailand)

Pipeline Step 4:
  bis3_to_etax.py → [ไฟล์ XML] → xades_signer.py → [ไฟล์ XML ที่เซ็นแล้ว]

ฟังก์ชันที่ Rust Core ส่งออก (xades_rust_core):
  c14n_exclusive(xml_bytes, inclusive_prefix_list=None) → bytes
    Exclusive XML C14N (http://www.w3.org/2001/10/xml-exc-c14n#)

การเซ็น RSA-SHA256 ใช้ Python cryptography library
ไม่ใช้ sign_digest_rsa_sha256 จาก Rust Core เนื่องจากไม่ได้ export

ใช้งาน:
  python xades_signer.py \
    --xml docs/etax_output/SAMPLE-INV-2568-001.xml \
    --key path/to/private_key.pem \
    --cert path/to/certificate.pem \
    --out docs/etax_output/SAMPLE-INV-2568-001-signed.xml

เสิร์ฟ: กลุ่ม 2 (คนกลาง/B2B ต้องการเอกสารเซ็นดิจิทัล), กลุ่ม 3 (Platform e-Tax ETDA)
อ้างอิง: ETSI EN 319 132 (XAdES-BES), W3C XML Signature Syntax (xmldsig)
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from lxml import etree
except ImportError:
    sys.exit("[ERROR] ต้องติดตั้ง lxml: pip install lxml")

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.backends import default_backend
except ImportError:
    sys.exit("[ERROR] ต้องติดตั้ง cryptography: pip install cryptography")

try:
    import xades_rust_core
    _HAS_RUST_C14N = True
except ImportError:
    _HAS_RUST_C14N = False


# ── Namespace constants ───────────────────────────────────────────────────────

NS_DS    = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"

# Exclusive C14N — ตรงกับสิ่งที่ xades_rust_core.c14n_exclusive() implement
ALG_C14N_EXCL      = "http://www.w3.org/2001/10/xml-exc-c14n#"
ALG_RSA_SHA256     = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
ALG_SHA256         = "http://www.w3.org/2001/04/xmlenc#sha256"
ALG_ENVELOPED_SIG  = "http://www.w3.org/2000/09/xmldsig#enveloped-signature"
ALG_SIGNED_PROPS   = "http://uri.etsi.org/01903#SignedProperties"


# ── C14N helper ───────────────────────────────────────────────────────────────

def _c14n(xml_bytes: bytes) -> bytes:
    """Exclusive C14N — ใช้ Rust Core ถ้ามี ไม่งั้น fallback ไป lxml"""
    if _HAS_RUST_C14N:
        return bytes(xades_rust_core.c14n_exclusive(xml_bytes))
    # lxml fallback (Exclusive C14N)
    root = etree.fromstring(xml_bytes)
    out = b""
    root.getroottree().write_c14n(out, exclusive=True)
    # lxml write_c14n ต้องการ BytesIO
    import io
    buf = io.BytesIO()
    root.getroottree().write_c14n(buf, exclusive=True)
    return buf.getvalue()


def _sha256_b64(data: bytes) -> str:
    return base64.b64encode(hashlib.sha256(data).digest()).decode()


# ── Certificate helpers ───────────────────────────────────────────────────────

def _cert_b64(cert_pem: str) -> str:
    """ดึง base64 ของ DER จาก PEM (ไม่มี header/footer)"""
    lines = cert_pem.strip().splitlines()
    return "".join(l for l in lines if not l.startswith("-----"))


def _cert_raw(cert_pem: str) -> bytes:
    return base64.b64decode(_cert_b64(cert_pem))


def _issuer_serial(cert_pem: str) -> tuple[str, str]:
    """ดึง IssuerName และ SerialNumber จาก PEM"""
    from cryptography import x509
    cert = x509.load_pem_x509_certificate(cert_pem.encode(), default_backend())
    issuer = cert.issuer.rfc4514_string()
    serial = str(cert.serial_number)
    return issuer, serial


# ── Core signing function ─────────────────────────────────────────────────────

def sign_peppol_ubl_xades_bes(
    xml_file_path: str | Path,
    private_key_pem: str,
    cert_pem: str,
    output_signed_path: str | Path,
) -> None:
    """
    อ่าน UBL 2.1 XML → เซ็น XAdES-BES → เขียน XML พร้อม ds:Signature

    XAdES-BES ประกอบด้วย:
    - SignedInfo: Reference ไปยัง document root และ SignedProperties
    - SignedProperties: SigningTime + SigningCertificate (Cert Digest + IssuerSerial)
    - ds:Signature ฝังเป็น Enveloped Signature ใน root element
    """
    raw_xml = Path(xml_file_path).read_bytes()

    # ─ 1. Digest ของ XML Document (enveloped-signature ยกเว้น ds:Signature ที่จะเพิ่ม) ─
    c14n_doc      = _c14n(raw_xml)
    doc_digest_b64 = _sha256_b64(c14n_doc)

    # ─ 2. Digest ของ Signing Certificate ─
    cert_digest_b64 = _sha256_b64(_cert_raw(cert_pem))
    cert_b64_val    = _cert_b64(cert_pem)

    try:
        issuer_name, serial_num = _issuer_serial(cert_pem)
    except Exception:
        issuer_name = "CN=CA-RD-TEST,O=Revenue Department,C=TH"
        serial_num  = "10001"

    signing_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # ─ 3. SignedProperties ─
    signed_props_xml = (
        f'<xades:SignedProperties'
        f' xmlns:xades="{NS_XADES}"'
        f' xmlns:ds="{NS_DS}"'
        f' Id="SignedProperties-1">'
        f'<xades:SignedSignatureProperties>'
        f'<xades:SigningTime>{signing_time}</xades:SigningTime>'
        f'<xades:SigningCertificate>'
        f'<xades:Cert>'
        f'<xades:CertDigest>'
        f'<ds:DigestMethod Algorithm="{ALG_SHA256}"/>'
        f'<ds:DigestValue>{cert_digest_b64}</ds:DigestValue>'
        f'</xades:CertDigest>'
        f'<xades:IssuerSerial>'
        f'<ds:X509IssuerName>{issuer_name}</ds:X509IssuerName>'
        f'<ds:X509SerialNumber>{serial_num}</ds:X509SerialNumber>'
        f'</xades:IssuerSerial>'
        f'</xades:Cert>'
        f'</xades:SigningCertificate>'
        f'</xades:SignedSignatureProperties>'
        f'</xades:SignedProperties>'
    )

    c14n_props        = _c14n(signed_props_xml.encode())
    props_digest_b64  = _sha256_b64(c14n_props)

    # ─ 4. SignedInfo ─
    signed_info_xml = (
        f'<ds:SignedInfo xmlns:ds="{NS_DS}">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<ds:SignatureMethod Algorithm="{ALG_RSA_SHA256}"/>'
        f'<ds:Reference URI="">'
        f'<ds:Transforms>'
        f'<ds:Transform Algorithm="{ALG_ENVELOPED_SIG}"/>'
        f'<ds:Transform Algorithm="{ALG_C14N_EXCL}"/>'
        f'</ds:Transforms>'
        f'<ds:DigestMethod Algorithm="{ALG_SHA256}"/>'
        f'<ds:DigestValue>{doc_digest_b64}</ds:DigestValue>'
        f'</ds:Reference>'
        f'<ds:Reference Type="{ALG_SIGNED_PROPS}" URI="#SignedProperties-1">'
        f'<ds:DigestMethod Algorithm="{ALG_SHA256}"/>'
        f'<ds:DigestValue>{props_digest_b64}</ds:DigestValue>'
        f'</ds:Reference>'
        f'</ds:SignedInfo>'
    )

    # ─ 5. เซ็น SignedInfo ด้วย RSA-SHA256 ─
    c14n_signed_info = _c14n(signed_info_xml.encode())

    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(), password=None, backend=default_backend()
    )
    sig_value = private_key.sign(c14n_signed_info, padding.PKCS1v15(), hashes.SHA256())
    sig_value_b64 = base64.b64encode(sig_value).decode()

    # ─ 6. ประกอบ ds:Signature ─
    full_signature_xml = (
        f'<ds:Signature xmlns:ds="{NS_DS}" Id="Signature-1">'
        f'{signed_info_xml}'
        f'<ds:SignatureValue>{sig_value_b64}</ds:SignatureValue>'
        f'<ds:KeyInfo>'
        f'<ds:X509Data>'
        f'<ds:X509Certificate>{cert_b64_val}</ds:X509Certificate>'
        f'</ds:X509Data>'
        f'</ds:KeyInfo>'
        f'<ds:Object>'
        f'<xades:QualifyingProperties'
        f' xmlns:xades="{NS_XADES}"'
        f' Target="#Signature-1">'
        f'{signed_props_xml}'
        f'</xades:QualifyingProperties>'
        f'</ds:Object>'
        f'</ds:Signature>'
    )

    # ─ 7. ฝัง Signature เข้า Root Element ─
    parser   = etree.XMLParser(remove_blank_text=True, resolve_entities=False)
    root     = etree.fromstring(raw_xml, parser=parser)
    sig_node = etree.fromstring(full_signature_xml.encode(), parser=parser)
    root.append(sig_node)

    signed_bytes = etree.tostring(
        root, pretty_print=True, xml_declaration=True, encoding="utf-8"
    )
    Path(output_signed_path).write_bytes(signed_bytes)
    print(f"[OK] เซ็น XAdES-BES เรียบร้อย: {output_signed_path}")
    print(f"     C14N Engine: {'xades_rust_core (Exclusive C14N)' if _HAS_RUST_C14N else 'lxml fallback'}")
    print(f"     Algorithm:   RSA-SHA256 + Exclusive C14N")
    print(f"     ขั้นต่อไป:   ส่งไปยัง TSA เพื่อ XAdES-T (Timestamp)")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="XAdES-BES Signer — OpenThai AI e-Tax Pipeline"
    )
    p.add_argument("--xml",  required=True,  type=Path, help="ไฟล์ UBL 2.1 XML จาก bis3_to_etax.py")
    p.add_argument("--key",  required=True,  type=Path, help="RSA Private Key (PEM)")
    p.add_argument("--cert", required=True,  type=Path, help="X.509 Certificate (PEM)")
    p.add_argument("--out",  type=Path, help="ไฟล์ output (default: เพิ่ม -signed ก่อน .xml)")
    args = p.parse_args()

    if not args.xml.exists():
        sys.exit(f"[ERROR] ไม่พบไฟล์ XML: {args.xml}")
    if not args.key.exists():
        sys.exit(f"[ERROR] ไม่พบ Private Key: {args.key}")
    if not args.cert.exists():
        sys.exit(f"[ERROR] ไม่พบ Certificate: {args.cert}")

    out_path = args.out or args.xml.with_stem(args.xml.stem + "-signed")

    sign_peppol_ubl_xades_bes(
        xml_file_path      = args.xml,
        private_key_pem    = args.key.read_text(encoding="utf-8"),
        cert_pem           = args.cert.read_text(encoding="utf-8"),
        output_signed_path = out_path,
    )
