# -*- coding: utf-8 -*-
"""
RFC 3161 TimeStampToken OID helpers สำหรับ XAdES test suite

OID สองชั้นที่ต้องตรวจ:
  Outer ContentInfo.contentType  = id-signedData    (1.2.840.113549.1.7.2)
  Inner eContentType             = id-ct-TSTInfo    (1.2.840.113549.1.9.16.1.4)

วิธีตรวจ:
  Level A — asn1crypto (ถ้ามี): parse CMS ContentInfo อย่างสมบูรณ์
  Level B — fallback byte-scan: หา OID TLV bytes ใน DER stream
             (ใช้เมื่อ asn1crypto ไม่ได้ติดตั้ง — เพียงพอสำหรับ positive test)

อ้างอิง:
  RFC 3161 §2.4.2  — TimeStampToken = ContentInfo
  RFC 5652 §5      — SignedData structure
  IETF CMS OID     — 1.2.840.113549.1.7.2 (id-signedData)
  IANA TSP OID     — 1.2.840.113549.1.9.16.1.4 (id-ct-TSTInfo)
"""

from __future__ import annotations

# ── OID constants (dotted notation) ──────────────────────────────────────────

ID_SIGNED_DATA = "1.2.840.113549.1.7.2"
ID_CT_TST_INFO = "1.2.840.113549.1.9.16.1.4"

# ── OID TLV bytes (tag 0x06 + length + encoded OID content) ──────────────────
#
# Encoding: first two arcs → 40*a0 + a1 (= 42 = 0x2A for 1.2)
# Remaining arcs: base-128 big-endian, continuation bit 0x80
#
# 1.2.840.113549.1.7.2:
#   2a  86 48  86 f7 0d  01  07  02
#   (42)(840) (113549)  (1) (7) (2)
#
# 1.2.840.113549.1.9.16.1.4:
#   2a  86 48  86 f7 0d  01  09  10  01  04
#   (42)(840) (113549)  (1) (9)(16) (1) (4)

OID_SIGNED_DATA_TLV = bytes([
    0x06, 0x09,                                   # tag + length (9)
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d,          # 1.2.840.113549
    0x01, 0x07, 0x02,                             # .1.7.2
])

OID_TST_INFO_TLV = bytes([
    0x06, 0x0b,                                   # tag + length (11)
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d,          # 1.2.840.113549
    0x01, 0x09, 0x10, 0x01, 0x04,                # .1.9.16.1.4
])


# ── Byte-level OID presence checks (Level B) ─────────────────────────────────


def has_outer_signed_data_oid(tst_der: bytes) -> bool:
    """True ถ้าพบ id-signedData TLV ใน DER stream"""
    return OID_SIGNED_DATA_TLV in tst_der


def has_encap_tst_info_oid(tst_der: bytes) -> bool:
    """True ถ้าพบ id-ct-TSTInfo TLV ใน DER stream"""
    return OID_TST_INFO_TLV in tst_der


# ── Full OID extraction (Level A → fallback Level B) ─────────────────────────


def extract_tst_oids(tst_der: bytes) -> dict[str, str | None]:
    """
    ดึง OID สองชั้นจาก RFC 3161 TimeStampToken DER

    เรียง: asn1crypto ก่อน (parse สมบูรณ์); fallback byte-scan ถ้าไม่มี

    Returns:
      {
        'content_type':      '1.2.840.113549.1.7.2'        หรือ None,
        'encap_content_type':'1.2.840.113549.1.9.16.1.4'   หรือ None,
      }
    """
    if not tst_der:
        return {"content_type": None, "encap_content_type": None}

    # Level A: asn1crypto
    try:
        from asn1crypto import cms as _cms  # type: ignore

        ci = _cms.ContentInfo.load(tst_der)
        content_type = ci["content_type"].dotted
        signed_data  = ci["content"].parsed
        encap_type   = signed_data["encap_content_info"]["content_type"].dotted
        return {"content_type": content_type, "encap_content_type": encap_type}
    except Exception:
        pass

    # Level B: byte-scan fallback
    return {
        "content_type": (
            ID_SIGNED_DATA if OID_SIGNED_DATA_TLV in tst_der else None
        ),
        "encap_content_type": (
            ID_CT_TST_INFO if OID_TST_INFO_TLV in tst_der else None
        ),
    }


# ── DER encoding helpers (private) ───────────────────────────────────────────


def _der_len(n: int) -> bytes:
    """Encode DER length (minimal: short-form ≤ 127, long-form otherwise)"""
    if n < 128:
        return bytes([n])
    lb = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(lb)]) + lb


def _seq(content: bytes) -> bytes:
    return b"\x30" + _der_len(len(content)) + content


# ── Minimal TST DER fixture builder ──────────────────────────────────────────


def build_minimal_tst_der() -> bytes:
    """
    สร้าง RFC 3161 TimeStampToken DER ขั้นต่ำสำหรับ test

    Structure:
      ContentInfo SEQUENCE {
          contentType  OID(id-signedData)            ← outer OID
          content [0] EXPLICIT {
              SignedData SEQUENCE {
                  version          INTEGER(3)
                  digestAlgorithms SET {}
                  encapContentInfo SEQUENCE {
                      eContentType OID(id-ct-TSTInfo) ← inner OID
                  }
              }
          }
      }

    ผลลัพธ์: ~40 bytes, ผ่าน is_valid_der_sequence(min_len=11)
    ไม่ใช่ TST จริง (ไม่มี TSTInfo, certificates, สิ่งที่ TSA ลงนาม)
    ใช้ได้เฉพาะ OID layer detection tests เท่านั้น
    """
    # EncapContentInfo SEQUENCE { eContentType OID(id-ct-TSTInfo) }
    encap_ci = _seq(OID_TST_INFO_TLV)

    # SignedData SEQUENCE { version INTEGER(3), digestAlgorithms SET{}, encapContentInfo }
    signed_data = _seq(
        b"\x02\x01\x03"   # INTEGER 3
        + b"\x31\x00"     # SET {} (digestAlgorithms)
        + encap_ci
    )

    # [0] EXPLICIT content (constructed, context-specific tag 0)
    explicit_content = bytes([0xa0]) + _der_len(len(signed_data)) + signed_data

    # ContentInfo SEQUENCE { contentType OID, content [0] }
    return _seq(OID_SIGNED_DATA_TLV + explicit_content)
