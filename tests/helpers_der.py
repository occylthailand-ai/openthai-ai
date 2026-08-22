# -*- coding: utf-8 -*-
"""
DER Sanity Helpers สำหรับ XAdES test suite
ใช้ร่วมกันระหว่าง test_xades_a_readiness.py และ test_xades_integration.py

ลำดับการตรวจ (ลึกขึ้นตามลำดับ):
  Level 1 — decode_b64_der()  : base64 valid + raw[0] == 0x30 + len > 10
  Level 2 — try_parse_asn1()  : asn1crypto parse ถ้ามี lib (ไม่บังคับ)
  Level 3 — is_parseable_der(): รวม Level 1+2 — ใช้ใน test assertion

ทำไมต้องลึกกว่า raw[0] == 0x30:
  - 0x30 เป็น tag ของ SEQUENCE แต่ length byte หรือ content อาจ malformed ได้
  - asn1crypto parse จะจับ truncated length, invalid sub-element, forbidden BER
  - ป้องกัน test false-positive จาก dummy bytes ที่บังเอิญขึ้นต้นด้วย 0x30
"""

from __future__ import annotations

import base64
import logging

logger = logging.getLogger(__name__)

try:
    from asn1crypto import core as _asn1_core
    _HAS_ASN1CRYPTO = True
except ImportError:
    _HAS_ASN1CRYPTO = False
    logger.debug("asn1crypto ไม่ได้ติดตั้ง — DER check ใช้แค่ tag + length: pip install asn1crypto")


def decode_b64_der(text: str) -> bytes:
    """
    ถอดรหัส base64 → bytes พร้อมตรวจขั้นต้น

    Raises:
      ValueError: ถ้า base64 ไม่ถูกต้อง, ผลลัพธ์ว่าง, raw[0] != 0x30, หรือ len <= 10
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
    if len(raw) <= 10:
        raise ValueError(
            f"DER too short: {len(raw)} bytes (minimum 11 required)"
        )
    return raw


def try_parse_asn1(raw: bytes) -> tuple[bool, str]:
    """
    พยายาม parse DER bytes ด้วย asn1crypto (ถ้ามี)

    Returns:
      (True, "")        — parse สำเร็จหรือ asn1crypto ไม่มี (skip gracefully)
      (False, reason)   — parse ล้มเหลว

    ไม่ raise exception เพื่อให้ caller ตัดสินใจเอง
    """
    if not _HAS_ASN1CRYPTO:
        return True, "asn1crypto not available — skipped"
    try:
        obj = _asn1_core.load(raw)
        _ = obj.native  # force full parse (lazy evaluation)
        return True, ""
    except Exception as exc:
        return False, str(exc)


def is_parseable_der(b64_text: str | None) -> tuple[bool, str]:
    """
    ตรวจ DER แบบครบ (Level 1 + Level 2)

    Returns:
      (True, "")           — ผ่านทั้งหมด
      (False, reason_str)  — ล้มเหลว พร้อมสาเหตุ

    ใช้ใน test assertion:
      ok, reason = is_parseable_der(b64_text)
      self.assertTrue(ok, f"DER invalid: {reason}")
    """
    if not b64_text:
        return False, "empty input"
    try:
        raw = decode_b64_der(b64_text)
    except ValueError as exc:
        return False, str(exc)
    ok, reason = try_parse_asn1(raw)
    return ok, reason


def assert_parseable_der(test_case, b64_text: str | None, label: str = "DER") -> None:
    """
    Shorthand สำหรับใช้ใน unittest.TestCase:
      assert_parseable_der(self, elem.text, "EncapsulatedTimeStamp")
    """
    ok, reason = is_parseable_der(b64_text)
    test_case.assertTrue(ok, f"{label} ไม่ผ่าน DER parse: {reason}")


def minimal_der_sequence(payload_len: int = 20) -> bytes:
    """สร้าง minimal valid DER SEQUENCE สำหรับ test fixture"""
    payload = bytes(payload_len)
    if payload_len < 128:
        return bytes([0x30, payload_len]) + payload
    length_bytes = payload_len.to_bytes((payload_len.bit_length() + 7) // 8, "big")
    return bytes([0x30, 0x80 | len(length_bytes)]) + length_bytes + payload
