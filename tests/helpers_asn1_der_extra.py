# -*- coding: utf-8 -*-
"""
ASN.1 / DER content validators สำหรับ XAdES test suite (ส่วนขยาย)
ใช้คู่กับ helpers_der.py ซึ่งตรวจ SEQUENCE tag + length

ครอบคลุม primitive types ที่พบใน XAdES/RFC 3161 timestamps:
  - INTEGER  (tag 0x02) — two's-complement minimal encoding
  - BOOLEAN  (tag 0x01) — DER: TRUE=0xFF, FALSE=0x00, ห้ามค่าอื่น
  - GeneralizedTime (tag 0x18) — YYYYMMDDHHMMSSZ เท่านั้น

ทั้งหมด validate ระดับ "content octets" (ไม่รวม tag/length)
"""

from __future__ import annotations

import re


# ── INTEGER ──────────────────────────────────────────────────────────────────


def validate_der_integer_content(content: bytes) -> bool:
    """
    ตรวจ content octets ของ DER INTEGER

    DER กำหนด two's-complement minimal encoding:
    - content ว่างไม่ได้
    - ห้าม leading 0x00 ถ้า byte ถัดไป MSB=0 (positive ที่ไม่จำเป็น)
    - ห้าม leading 0xFF ถ้า byte ถัดไป MSB=1 (negative ที่ไม่จำเป็น)

    Args:
      content: bytes หลัง tag+length (ห้ามรวม tag 0x02)

    Returns:
      True ถ้าเป็น DER minimal, False ถ้าละเมิดกฎ
    """
    if len(content) == 0:
        return False

    if len(content) > 1:
        # Unnecessary leading 0x00 สำหรับ positive integer
        if content[0] == 0x00 and (content[1] & 0x80) == 0:
            return False
        # Unnecessary leading 0xFF สำหรับ negative integer
        if content[0] == 0xFF and (content[1] & 0x80) == 0x80:
            return False

    return True


# ── BOOLEAN ──────────────────────────────────────────────────────────────────


def validate_der_boolean_content(content: bytes) -> bool:
    """
    ตรวจ content octets ของ DER BOOLEAN

    DER กำหนดเข้มกว่า BER:
    - ต้องมีความยาว 1 byte เท่านั้น
    - TRUE  ต้องเป็น 0xFF เท่านั้น (BER ยอมค่า non-zero ทุกค่า)
    - FALSE ต้องเป็น 0x00 เท่านั้น

    Args:
      content: bytes หลัง tag+length (ห้ามรวม tag 0x01)

    Returns:
      True ถ้าเป็น DER valid, False ถ้าละเมิดกฎ
    """
    if len(content) != 1:
        return False
    return content[0] in (0x00, 0xFF)


# ── GeneralizedTime ───────────────────────────────────────────────────────────

_GT_RE = re.compile(r"^\d{14}Z$")   # YYYYMMDDHHMMSSZ (DER strict form)


def validate_der_generalized_time(value: str) -> bool:
    """
    ตรวจ DER GeneralizedTime (เข้มกว่า BER):
    - ต้องเป็น YYYYMMDDHHMMSSZ เท่านั้น
    - ต้อง UTC (Z suffix บังคับ)
    - ห้าม fractional seconds (เช่น .123)
    - ห้าม timezone offset (เช่น +07:00)

    Args:
      value: string content ของ GeneralizedTime element

    Returns:
      True ถ้าผ่าน DER strict form, False ถ้าไม่ผ่าน
    """
    if not _GT_RE.match(value):
        return False

    yyyy = int(value[0:4])
    mm   = int(value[4:6])
    dd   = int(value[6:8])
    HH   = int(value[8:10])
    MM   = int(value[10:12])
    SS   = int(value[12:14])

    if not (1 <= mm <= 12):
        return False
    if not (1 <= dd <= 31):
        return False
    if not (0 <= HH <= 23):
        return False
    if not (0 <= MM <= 59):
        return False
    if not (0 <= SS <= 59):
        return False

    return True
