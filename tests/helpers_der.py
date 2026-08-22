# -*- coding: utf-8 -*-
"""
DER Sanity Helpers สำหรับ XAdES test suite
ใช้ร่วมกันระหว่าง test_xades_a_readiness.py และ test_xades_integration.py

ลำดับการตรวจ (ลึกขึ้นตามลำดับ):
  Level 1 — is_valid_der_sequence()  : tag 0x30 + length octets + total size
  Level 2 — try_parse_asn1()         : asn1crypto parse ถ้ามี lib (ไม่บังคับ)
  Level 3 — is_parseable_der()        : รวม Level 1+2 — ใช้ใน test assertion

ทำไมต้องตรวจ length octets:
  - 0x30 เป็น tag ของ SEQUENCE แต่ short-form อาจ truncated
  - Long-form (0x80|n) อาจมี n=0 (indefinite) หรือ bytes ไม่พอ
  - declared total_len อาจใหญ่กว่า actual bytes (over-declared)
  - asn1crypto parse จะจับ malformed content ที่ผ่าน tag+length แล้ว
"""

from __future__ import annotations

import base64
import importlib
import logging

import pytest

logger = logging.getLogger(__name__)

# ── Optional asn1crypto ───────────────────────────────────────────────────────

try:
    from asn1crypto import core as _asn1_core
    _HAS_ASN1CRYPTO = True
except ImportError:
    _HAS_ASN1CRYPTO = False
    logger.debug(
        "asn1crypto ไม่ได้ติดตั้ง — DER check ใช้แค่ tag + length: "
        "pip install asn1crypto"
    )

# ── Engine detection ──────────────────────────────────────────────────────────


def check_engine_available() -> bool:
    """คืน True ถ้า xades_engine import ได้"""
    try:
        importlib.import_module("xades_engine")
        return True
    except ImportError:
        return False


needs_engine = pytest.mark.skipif(
    not check_engine_available(),
    reason="ต้องติดตั้งแพ็กเกจ xades-engine ใน PYTHONPATH: "
           "pip install -e xades-engine/src",
)

needs_asn1 = pytest.mark.skipif(
    not _HAS_ASN1CRYPTO,
    reason="asn1crypto ไม่ได้ติดตั้ง: pip install asn1crypto",
)


# ── DER structure validator (Level 1) ────────────────────────────────────────


def is_valid_der_sequence(raw_bytes: bytes, min_len: int = 50) -> bool:
    """
    ตรวจ DER SEQUENCE: tag + length octets + total size

    Args:
      raw_bytes: bytes ที่จะตรวจ
      min_len:   ขนาดขั้นต่ำที่ยอมรับ (default 50 สำหรับ real-world DER;
                 ใช้ min_len=11 สำหรับ test fixtures)

    Returns:
      True ถ้าผ่านทุกเงื่อนไข, False อย่างใดอย่างหนึ่งล้มเหลว
    """
    if not raw_bytes or len(raw_bytes) < min_len:
        return False
    if raw_bytes[0] != 0x30:           # ต้องเป็น ASN.1 SEQUENCE tag
        return False
    if len(raw_bytes) < 2:
        return False

    first_len = raw_bytes[1]
    if first_len <= 0x7F:              # short-form: ความยาวอยู่ใน byte เดียว
        content_len = first_len
        header_len  = 2
    else:                              # long-form: 0x80|n ตามด้วย n bytes
        n = first_len & 0x7F
        if n == 0:                     # 0x80 = indefinite length — ไม่ใช่ DER
            return False
        if n > 4:                      # ยาวเกินสมเหตุสมผล
            return False
        if len(raw_bytes) < 2 + n:    # bytes ไม่พอสำหรับ length field
            return False
        if raw_bytes[2] == 0x00:       # leading zero — DER ห้าม (non-minimal)
            return False
        content_len = int.from_bytes(raw_bytes[2:2 + n], "big")
        # DER minimal encoding: ถ้า content_len ≤ 127 ต้องใช้ short-form
        if content_len <= 0x7F:
            return False
        header_len  = 2 + n

    total_len = header_len + content_len
    if total_len > len(raw_bytes):     # declared length เกิน actual bytes
        return False

    return True


# ── Level 1: decode + validate ────────────────────────────────────────────────


def decode_b64_der(text: str) -> bytes:
    """
    ถอดรหัส base64 → bytes พร้อมตรวจ DER structure ขั้นต้น

    Raises:
      ValueError: ถ้า base64 ไม่ถูกต้อง, raw[0] != 0x30,
                  หรือ is_valid_der_sequence() ล้มเหลว
    """
    if not text or not text.strip():
        raise ValueError("DER text is empty or whitespace-only")
    try:
        raw = base64.b64decode("".join(text.split()), validate=True)
    except Exception as exc:
        raise ValueError(f"Base64 decode failed: {exc}") from exc
    if len(raw) == 0:
        raise ValueError("DER decoded to empty bytes")
    if raw[0] != 0x30:
        raise ValueError(
            f"Not a DER SEQUENCE: expected tag 0x30, got 0x{raw[0]:02X}"
        )
    if not is_valid_der_sequence(raw, min_len=11):
        raise ValueError(
            f"DER structure invalid: tag=0x{raw[0]:02X} total_bytes={len(raw)}"
        )
    return raw


# ── Level 2: asn1crypto parse ─────────────────────────────────────────────────


def try_parse_asn1(raw: bytes) -> tuple[bool, str]:
    """
    พยายาม parse DER bytes ด้วย asn1crypto (ถ้ามี)

    Returns:
      (True, "")        — parse สำเร็จหรือ asn1crypto ไม่มี (skip gracefully)
      (False, reason)   — parse ล้มเหลว
    """
    if not _HAS_ASN1CRYPTO:
        return True, "asn1crypto not available — skipped"
    try:
        obj = _asn1_core.load(raw)
        _ = obj.native           # force full parse (lazy evaluation)
        return True, ""
    except Exception as exc:
        return False, str(exc)


# ── Level 3: combined check ───────────────────────────────────────────────────


def is_parseable_der(b64_text: str | None) -> tuple[bool, str]:
    """
    ตรวจ DER แบบครบ (Level 1 + Level 2)

    Returns:
      (True, "")           — ผ่านทั้งหมด
      (False, reason_str)  — ล้มเหลว พร้อมสาเหตุ
    """
    if not b64_text:
        return False, "empty input"
    try:
        raw = decode_b64_der(b64_text)
    except ValueError as exc:
        return False, str(exc)
    return try_parse_asn1(raw)


def assert_parseable_der(test_case, b64_text: str | None, label: str = "DER") -> None:
    """
    Shorthand สำหรับใช้ใน unittest.TestCase:
      assert_parseable_der(self, elem.text, "EncapsulatedTimeStamp")
    """
    ok, reason = is_parseable_der(b64_text)
    test_case.assertTrue(ok, f"{label} ไม่ผ่าน DER parse: {reason}")


# ── Fixture helpers ───────────────────────────────────────────────────────────


def minimal_der_sequence(payload_len: int = 20) -> bytes:
    """สร้าง minimal valid DER SEQUENCE สำหรับ test fixture"""
    payload = bytes(payload_len)
    if payload_len < 128:                       # short-form
        return bytes([0x30, payload_len]) + payload
    # long-form
    n_bytes = payload_len.to_bytes(
        (payload_len.bit_length() + 7) // 8, "big"
    )
    return bytes([0x30, 0x80 | len(n_bytes)]) + n_bytes + payload


# ── Scoring helper (mirrors xades_a.py formula) ───────────────────────────────


def has_archival_evidence(cert_count: int, rev_count: int) -> bool:
    """
    XAdES-XL/A readiness gate:
    ต้องมีทั้ง CertificateValues และ RevocationValues อย่างน้อยอย่างละ 1
    """
    return cert_count > 0 and rev_count > 0


def calculate_archive_readiness_score(cert_count: int, rev_count: int) -> float:
    """
    คำนวณ completeness score แบบเดียวกับ XAdESAExtractor
      cert_score = min(0.5, cert_count * 0.25)
      rev_score  = min(0.5, rev_count  * 0.5)
    """
    cert_score = min(0.5, cert_count * 0.25)
    rev_score  = min(0.5, rev_count  * 0.5)
    return cert_score + rev_score
