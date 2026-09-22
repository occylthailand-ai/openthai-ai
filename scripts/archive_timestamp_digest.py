# -*- coding: utf-8 -*-
"""
ArchiveTimeStamp Digest Computation (XAdES-A, ETSI EN 319 132)

ขั้นตอน:
  1. รวม node-set: SignedInfo (C14N) + SignatureValue (raw DER)
     + KeyInfo (C14N) + UnsignedSignatureProperties ทุก child ก่อน ArchiveTimeStamp (C14N)
  2. SHA-256 ผลลัพธ์ → digest ส่งให้ TSA

เสิร์ฟกลุ่ม: 2 (คนกลาง/ชิปปิ้ง) + 6 (สายวิชาชีพ/นักบัญชี)

อ้างอิง:
  ETSI EN 319 132-1 v1.1.1 §6.4  (ArchiveTimeStamp)
  RFC 3161 §2.4.2               (MessageImprint)
"""

from __future__ import annotations

import base64
import hashlib

from lxml import etree

DS_NS    = "http://www.w3.org/2000/09/xmldsig#"
XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"

NS = {
    "ds":    DS_NS,
    "xades": XADES_NS,
}


def _c14n(node: etree._Element) -> bytes:
    """Exclusive C14N ไม่มี comments — ตรงกับ ALG_C14N_EXCL ใน xades_signer.py"""
    return etree.tostring(node, method="c14n", exclusive=True, with_comments=False)


def build_archive_scope_bytes(root: etree._Element) -> bytes:
    """
    สร้าง byte string สำหรับ ArchiveTimeStamp digest

    Node-set รวมตามลำดับ:
      1. ds:SignedInfo           (C14N)
      2. ds:SignatureValue       (raw DER bytes — ถอดรหัส base64)
      3. ds:KeyInfo              (C14N, ถ้ามี)
      4. xades:UnsignedSignatureProperties children ทุกตัว
         ก่อน xades:ArchiveTimeStamp ตัวใหม่ (C14N)

    Args:
      root: root element ของ signed XML document

    Returns:
      bytes พร้อมส่ง hashlib.sha256()

    Raises:
      ValueError: ถ้าไม่พบ ds:SignedInfo หรือ ds:SignatureValue
    """
    parts: list[bytes] = []

    # 1. SignedInfo
    si_nodes = root.xpath("//ds:Signature/ds:SignedInfo", namespaces=NS)
    if not si_nodes:
        raise ValueError("ไม่พบ ds:SignedInfo ใน document")
    parts.append(_c14n(si_nodes[0]))

    # 2. SignatureValue (raw bytes — ไม่ใช่ C14N)
    sv_text = root.xpath(
        "string(//ds:Signature/ds:SignatureValue)", namespaces=NS
    ).strip()
    if not sv_text:
        raise ValueError("ไม่พบ ds:SignatureValue หรือว่างเปล่า")
    parts.append(base64.b64decode(sv_text))

    # 3. KeyInfo (optional — ข้ามถ้าไม่มี)
    ki_nodes = root.xpath("//ds:Signature/ds:KeyInfo", namespaces=NS)
    if ki_nodes:
        parts.append(_c14n(ki_nodes[0]))

    # 4. UnsignedSignatureProperties children ก่อน ArchiveTimeStamp ใหม่
    usp_nodes = root.xpath(
        "//xades:UnsignedSignatureProperties", namespaces=NS
    )
    if usp_nodes:
        for child in usp_nodes[0]:
            local = etree.QName(child).localname
            if local == "ArchiveTimeStamp":
                # หยุดก่อนถึง ArchiveTimeStamp ตัวที่กำลังจะ stamp
                break
            parts.append(_c14n(child))

    return b"".join(parts)


def compute_archive_digest_sha256(root: etree._Element) -> bytes:
    """
    คำนวณ SHA-256 digest สำหรับ ArchiveTimeStamp MessageImprint

    Args:
      root: root element ของ signed XML document

    Returns:
      32 bytes (SHA-256 digest)
    """
    data = build_archive_scope_bytes(root)
    return hashlib.sha256(data).digest()


def compute_archive_digest_b64(root: etree._Element) -> str:
    """เหมือน compute_archive_digest_sha256 แต่คืน base64 string"""
    return base64.b64encode(compute_archive_digest_sha256(root)).decode()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python archive_timestamp_digest.py <signed.xml>")
        sys.exit(1)

    tree = etree.parse(sys.argv[1])
    digest_b64 = compute_archive_digest_b64(tree.getroot())
    print(f"ArchiveTimeStamp SHA-256 digest (base64): {digest_b64}")
