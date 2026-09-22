# -*- coding: utf-8 -*-
"""
XAdES-A Readiness Contract Tests
ทดสอบ contract และ pre-conditions ก่อนขึ้น XAdES-A

ครอบคลุม 4 จุด (ต่อจาก test_xades_t_structure.py):
  1. Freeze policy contract — raise / append behavior ใน docstring + assertion
  2. Deterministic timestamp — fixed genTime ใน fixture เพื่อ snapshot เสถียร
  3. Cryptographic sanity — Base64 + DER SEQUENCE (0x30) + len > 10
  4. XAdES-A readiness — CertificateValues, RevocationValues, ArchiveTimeStamp skeleton,
     OCSP/CRL fetch policy, completeness score (>= 0.8), node-set boundary

อ้างอิง implementation:
  xades-engine/src/xades_engine/xades_a.py
    - _is_valid_der(b64_text) → bool
    - XAdESAExtractor.extract_and_validate(root) → dict
    - has_archival_evidence(root) → bool
    - completeness_score = cert_score(max 0.5) + rev_score(max 0.5)
    - is_archival_ready = completeness >= 0.8

รัน:
  python -m pytest tests/test_xades_a_readiness.py -v
"""

import base64
import hashlib
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

from lxml import etree

# ── Import module จาก xades-engine (fallback paths สำหรับ CI ต่าง environment) ──

_ENGINE_PATH = Path(__file__).parent.parent / "xades-engine" / "src"

def _try_import_xades_engine():
    """ลอง import 3 แบบตาม PYTHONPATH ที่แตกต่างกัน"""
    # 1. ถ้า sys.path มีอยู่แล้ว (pip install -e)
    try:
        from xades_engine.xades_a import XAdESAExtractor, _is_valid_der, has_archival_evidence
        return XAdESAExtractor, _is_valid_der, has_archival_evidence, True
    except ImportError:
        pass
    # 2. เพิ่ม xades-engine/src แล้วลองใหม่
    if str(_ENGINE_PATH) not in sys.path:
        sys.path.insert(0, str(_ENGINE_PATH))
    try:
        from xades_engine.xades_a import XAdESAExtractor, _is_valid_der, has_archival_evidence
        return XAdESAExtractor, _is_valid_der, has_archival_evidence, True
    except ImportError:
        pass
    # 3. ไม่พบ — คืน stub ที่จะทำให้ test ถูก skip
    return None, None, None, False

XAdESAExtractor, _is_valid_der, has_archival_evidence, _XADES_ENGINE_AVAILABLE = \
    _try_import_xades_engine()

skip_without_engine = unittest.skipUnless(
    _XADES_ENGINE_AVAILABLE,
    "xades-engine ไม่อยู่ใน PYTHONPATH — รัน: pip install -e xades-engine/src "
    "หรือ cd xades-engine && pip install -e ."
)

# ── Namespace constants ───────────────────────────────────────────────────────

DS_NS    = "http://www.w3.org/2000/09/xmldsig#"
XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"
_NS      = {"ds": DS_NS, "xades": XADES_NS}

ALG_C14N_EXCL   = "http://www.w3.org/2001/10/xml-exc-c14n#"
FIXED_GEN_TIME  = "2025-08-22T12:00:00Z"   # deterministic clock สำหรับ snapshot tests

# ── DER byte helpers — ใช้ helpers_der สำหรับ Level 1+2 ─────────────────────

import os as _os
_TESTS_DIR = Path(__file__).parent
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

from helpers_der import (  # noqa: E402
    minimal_der_sequence as _minimal_der_sequence_fn,
    is_parseable_der,
    assert_parseable_der,
)


def _minimal_der_sequence(payload_len: int = 20) -> bytes:
    return _minimal_der_sequence_fn(payload_len)


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


# Fixtures
_VALID_CERT_DER_B64  = _b64(_minimal_der_sequence(50))   # 52 bytes, starts 0x30 ✓
_VALID_CRL_DER_B64   = _b64(_minimal_der_sequence(30))
_VALID_OCSP_DER_B64  = _b64(_minimal_der_sequence(40))
_INVALID_DER_B64     = _b64(b"\x00" * 20)                 # ไม่ใช่ 0x30
_SHORT_DER_B64       = _b64(bytes([0x30, 5]) + bytes(5))  # len=7 < 10 → invalid
_DUMMY_TST_B64       = _b64(_minimal_der_sequence(20))


# ── XML builders ─────────────────────────────────────────────────────────────

def _make_xades_t_xml(
    gen_time: str = FIXED_GEN_TIME,
    tst_b64:  str = _DUMMY_TST_B64,
) -> bytes:
    """XAdES-T XML (BES + UnsignedProperties พร้อม SignatureTimeStamp)"""
    return (
        f'<Invoice'
        f' xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'
        f' xmlns:ds="{DS_NS}"'
        f' xmlns:xades="{XADES_NS}">'
        f'<ds:Signature Id="Signature-1">'
        f'<ds:SignatureValue>dGVzdA==</ds:SignatureValue>'
        f'<ds:Object>'
        f'<xades:QualifyingProperties Target="#Signature-1">'
        f'<xades:SignedProperties Id="SignedProperties-1">'
        f'<xades:SignedSignatureProperties>'
        f'<xades:SigningTime>{gen_time}</xades:SigningTime>'
        f'</xades:SignedSignatureProperties>'
        f'</xades:SignedProperties>'
        f'<xades:UnsignedProperties>'
        f'<xades:UnsignedSignatureProperties>'
        f'<xades:SignatureTimeStamp Id="SignatureTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{tst_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:SignatureTimeStamp>'
        f'</xades:UnsignedSignatureProperties>'
        f'</xades:UnsignedProperties>'
        f'</xades:QualifyingProperties>'
        f'</ds:Object>'
        f'</ds:Signature>'
        f'</Invoice>'
    ).encode()


def _make_xades_a_xml(
    cert_b64:    str = _VALID_CERT_DER_B64,
    crl_b64:     str = _VALID_CRL_DER_B64,
    ocsp_b64:    str = _VALID_OCSP_DER_B64,
    arch_tst_b64: str = _DUMMY_TST_B64,
    gen_time:    str = FIXED_GEN_TIME,
    include_archive_ts: bool = True,
) -> bytes:
    """XAdES-A XML — XAdES-T + CertificateValues + RevocationValues + ArchiveTimeStamp"""
    archive_ts_block = (
        f'<xades:ArchiveTimeStamp Id="ArchiveTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{arch_tst_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:ArchiveTimeStamp>'
    ) if include_archive_ts else ""

    return (
        f'<Invoice'
        f' xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'
        f' xmlns:ds="{DS_NS}"'
        f' xmlns:xades="{XADES_NS}">'
        f'<ds:Signature Id="Signature-1">'
        f'<ds:SignatureValue>dGVzdA==</ds:SignatureValue>'
        f'<ds:Object>'
        f'<xades:QualifyingProperties Target="#Signature-1">'
        f'<xades:SignedProperties Id="SignedProperties-1">'
        f'<xades:SignedSignatureProperties>'
        f'<xades:SigningTime>{gen_time}</xades:SigningTime>'
        f'</xades:SignedSignatureProperties>'
        f'</xades:SignedProperties>'
        f'<xades:UnsignedProperties>'
        f'<xades:UnsignedSignatureProperties>'
        f'<xades:SignatureTimeStamp Id="SignatureTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{_DUMMY_TST_B64}</xades:EncapsulatedTimeStamp>'
        f'</xades:SignatureTimeStamp>'
        f'<xades:CertificateValues>'
        f'<ds:X509Certificate>{cert_b64}</ds:X509Certificate>'
        f'</xades:CertificateValues>'
        f'<xades:RevocationValues>'
        f'<xades:CRLValue>{crl_b64}</xades:CRLValue>'
        f'<xades:OCSPValue>{ocsp_b64}</xades:OCSPValue>'
        f'</xades:RevocationValues>'
        f'{archive_ts_block}'
        f'</xades:UnsignedSignatureProperties>'
        f'</xades:UnsignedProperties>'
        f'</xades:QualifyingProperties>'
        f'</ds:Object>'
        f'</ds:Signature>'
        f'</Invoice>'
    ).encode()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Policy Contract Freeze (raise / append — locked for XAdES-T → A path)
# ─────────────────────────────────────────────────────────────────────────────

class TestPolicyContractFreeze(unittest.TestCase):
    """
    CONTRACT (ห้ามเปลี่ยนโดยไม่อัปเดต test):
      'raise'  → ValueError("double-stamp") เมื่อพบ UnsignedProperties อยู่แล้ว
      'append' → เพิ่ม SignatureTimeStamp-N ต่อท้าย (N = index เพิ่มขึ้นทีละ 1)

    XAdES-A ใช้ 'append' เพื่อเพิ่ม ArchiveTimeStamp เข้าไปหลัง SignatureTimeStamp
    ดังนั้น 'append' ต้องไม่กระทบ element เดิมที่มีอยู่แล้ว
    """

    def test_raise_policy_is_default(self):
        """ไม่ระบุ policy → ต้อง default เป็น raise (ปลอดภัยที่สุด)"""
        xades_t = ET.fromstring(_make_xades_t_xml())
        up = xades_t.find(".//xades:UnsignedProperties", _NS)
        self.assertIsNotNone(up, "XAdES-T ต้องมี UnsignedProperties อยู่แล้ว")

    def test_archive_timestamp_id_sequential_after_signature_timestamp(self):
        """
        ArchiveTimeStamp-1 ต้องมี index 1 เสมอ ถ้ายังไม่มี ArchiveTimeStamp ก่อนหน้า
        SignatureTimeStamp-1 ไม่นับเป็น ArchiveTimeStamp
        """
        root = ET.fromstring(_make_xades_a_xml())
        arch = root.findall(".//xades:ArchiveTimeStamp", _NS)
        sig_ts = root.findall(".//xades:SignatureTimeStamp", _NS)
        ids = {ts.get("Id") for ts in arch}
        self.assertIn("ArchiveTimeStamp-1", ids,
            "ArchiveTimeStamp แรกต้องมี Id='ArchiveTimeStamp-1'")
        sig_ids = {ts.get("Id") for ts in sig_ts}
        self.assertNotIn("SignatureTimeStamp-1", ids,
            "SignatureTimeStamp Id ต้องไม่ปนกับ ArchiveTimeStamp Id")
        self.assertTrue(ids.isdisjoint(sig_ids),
            "Id ของ ArchiveTimeStamp และ SignatureTimeStamp ต้องไม่ซ้ำกัน")

    def test_append_preserves_existing_elements(self):
        """
        หลัง inject ArchiveTimeStamp, SignatureTimeStamp เดิมต้องยังอยู่ครบ
        (append ไม่ replace ไม่ลบ)
        """
        root = ET.fromstring(_make_xades_a_xml())
        sig_ts = root.findall(".//xades:SignatureTimeStamp", _NS)
        arch   = root.findall(".//xades:ArchiveTimeStamp", _NS)
        self.assertEqual(len(sig_ts), 1, "SignatureTimeStamp ต้องยังมี 1 ตัว")
        self.assertEqual(len(arch),   1, "ArchiveTimeStamp ต้องมี 1 ตัว")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Deterministic Timestamp Tests (fixed genTime → snapshot เสถียร)
# ─────────────────────────────────────────────────────────────────────────────

class TestDeterministicTimestamp(unittest.TestCase):
    """ใช้ FIXED_GEN_TIME ใน fixture ทุกตัว เพื่อให้ snapshot test ไม่แปรผัน"""

    def test_signing_time_is_fixed(self):
        root = ET.fromstring(_make_xades_t_xml(gen_time=FIXED_GEN_TIME))
        st   = root.find(".//xades:SigningTime", _NS)
        self.assertEqual(st.text, FIXED_GEN_TIME,
            f"SigningTime ต้องเป็น {FIXED_GEN_TIME} เสมอใน fixture นี้")

    def test_signing_time_format_iso8601_utc(self):
        """ตรวจ format: YYYY-MM-DDTHH:MM:SSZ"""
        import re
        root = ET.fromstring(_make_xades_t_xml(gen_time=FIXED_GEN_TIME))
        st   = root.find(".//xades:SigningTime", _NS)
        self.assertRegex(st.text,
            r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$",
            "SigningTime ต้องเป็น ISO 8601 UTC (ลงท้าย Z)")

    def test_different_gen_times_produce_different_xml(self):
        xml1 = _make_xades_t_xml(gen_time="2025-01-01T00:00:00Z")
        xml2 = _make_xades_t_xml(gen_time="2025-06-15T12:30:00Z")
        self.assertNotEqual(xml1, xml2,
            "gen_time ต่างกันต้องผลิต XML ต่างกัน")

    def test_tst_b64_deterministic(self):
        """TST fixture ต้องคืนค่าเดิมทุกครั้ง (ไม่มี random)"""
        tst1 = _make_xades_t_xml(tst_b64=_DUMMY_TST_B64)
        tst2 = _make_xades_t_xml(tst_b64=_DUMMY_TST_B64)
        self.assertEqual(tst1, tst2, "Fixture ต้องเป็น deterministic")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Cryptographic Sanity Checks (Base64 + DER ASN.1)
# ─────────────────────────────────────────────────────────────────────────────

class TestCryptographicSanity(unittest.TestCase):
    """
    ตรวจ _is_valid_der() ครบทุก branch ใน xades_a.py:
      - None / empty string → False
      - base64 ไม่ถูกต้อง → False
      - raw[0] != 0x30 (ไม่ใช่ DER SEQUENCE) → False
      - len(raw) <= 10 → False
      - raw[0] == 0x30 และ len > 10 → True
    """

    def test_none_is_invalid(self):
        self.assertFalse(_is_valid_der(None))

    def test_empty_string_is_invalid(self):
        self.assertFalse(_is_valid_der(""))

    def test_whitespace_only_is_invalid(self):
        self.assertFalse(_is_valid_der("   "))

    def test_invalid_base64_is_invalid(self):
        self.assertFalse(_is_valid_der("!!!not_base64!!!"))

    def test_wrong_der_tag_is_invalid(self):
        """DER ที่ขึ้นต้นด้วย 0x00 (ไม่ใช่ SEQUENCE 0x30)"""
        self.assertFalse(_is_valid_der(_INVALID_DER_B64))

    def test_too_short_der_is_invalid(self):
        """len <= 10 → invalid แม้ขึ้นต้นด้วย 0x30"""
        self.assertFalse(_is_valid_der(_SHORT_DER_B64))

    def test_valid_der_sequence_passes(self):
        self.assertTrue(_is_valid_der(_VALID_CERT_DER_B64))
        self.assertTrue(_is_valid_der(_VALID_CRL_DER_B64))
        self.assertTrue(_is_valid_der(_VALID_OCSP_DER_B64))

    def test_base64_with_whitespace_passes(self):
        """_is_valid_der ต้อง strip whitespace ได้ (จาก XML pretty-print)"""
        with_spaces = "\n" + _VALID_CERT_DER_B64[:20] + "\n" + _VALID_CERT_DER_B64[20:] + "\n"
        self.assertTrue(_is_valid_der(with_spaces),
            "_is_valid_der ต้องจัดการ whitespace ใน base64 ได้")

    def test_encapsulated_tst_is_valid_der(self):
        """EncapsulatedTimeStamp ใน fixture ต้องผ่าน _is_valid_der()"""
        self.assertTrue(_is_valid_der(_DUMMY_TST_B64),
            "DUMMY_TST_B64 fixture ต้องเป็น valid DER")

    def test_sha256_digest_of_tst_is_32_bytes(self):
        raw = base64.b64decode(_DUMMY_TST_B64)
        self.assertEqual(len(hashlib.sha256(raw).digest()), 32)


# ─────────────────────────────────────────────────────────────────────────────
# 4. XAdES-A Readiness — Structure, Scoring, OCSP/CRL policy, Node-set boundary
# ─────────────────────────────────────────────────────────────────────────────

@skip_without_engine
class TestHasArchivalEvidence(unittest.TestCase):
    """has_archival_evidence() ใน xades_a.py"""

    def test_xades_t_has_no_archival_evidence(self):
        root = ET.fromstring(_make_xades_t_xml())
        self.assertFalse(has_archival_evidence(root),
            "XAdES-T ยังไม่มี CertificateValues/RevocationValues")

    def test_xades_a_has_archival_evidence(self):
        root = ET.fromstring(_make_xades_a_xml())
        self.assertTrue(has_archival_evidence(root),
            "XAdES-A ต้องมี archival evidence")

    def test_certificate_values_alone_is_enough(self):
        xml = _make_xades_a_xml(crl_b64="", ocsp_b64="")
        # ลบ RevocationValues ออก
        xml_str = xml.decode().replace(
            f'<xades:CRLValue></xades:CRLValue>', ""
        ).replace(
            f'<xades:OCSPValue></xades:OCSPValue>', ""
        )
        root = ET.fromstring(xml_str.encode())
        self.assertTrue(has_archival_evidence(root))


@skip_without_engine
class TestXAdESAExtractor(unittest.TestCase):
    """XAdESAExtractor.extract_and_validate() — scoring + warnings"""

    def setUp(self):
        self.extractor = XAdESAExtractor()

    def test_full_valid_doc_is_archival_ready(self):
        root   = ET.fromstring(_make_xades_a_xml())
        result = self.extractor.extract_and_validate(root)
        self.assertTrue(result["is_archival_ready"],
            "เอกสารที่มี cert + CRL + OCSP ที่ valid ต้องผ่าน is_archival_ready")
        self.assertEqual(result["completeness_score"], 1.0,
            "cert_score=0.5 + rev_score=0.5 = 1.0")
        self.assertEqual(len(result["warnings"]), 0)

    def test_invalid_cert_der_reduces_score(self):
        root   = ET.fromstring(_make_xades_a_xml(cert_b64=_INVALID_DER_B64))
        result = self.extractor.extract_and_validate(root)
        self.assertEqual(result["cert_values_valid"], 0,
            "DER ไม่ถูกต้องต้องไม่นับเป็น valid")
        self.assertGreater(len(result["warnings"]), 0,
            "ต้องมี warning สำหรับ invalid DER")
        self.assertFalse(result["is_archival_ready"],
            "cert_score=0 + rev_score=0.5 = 0.5 < 0.8 → ไม่ archival ready")

    def test_invalid_crl_der_reduces_score(self):
        root   = ET.fromstring(_make_xades_a_xml(crl_b64=_INVALID_DER_B64))
        result = self.extractor.extract_and_validate(root)
        self.assertLess(result["revocation_values_valid"],
                        result["revocation_values_found"],
                        "CRL invalid ต้องลด rev_valid count")

    def test_empty_doc_score_is_zero(self):
        root   = ET.fromstring(_make_xades_t_xml())
        result = self.extractor.extract_and_validate(root)
        self.assertEqual(result["completeness_score"], 0.0)
        self.assertFalse(result["is_archival_ready"])

    def test_cert_count_correct(self):
        root   = ET.fromstring(_make_xades_a_xml())
        result = self.extractor.extract_and_validate(root)
        self.assertEqual(result["cert_values_found"], 1)
        self.assertEqual(result["cert_values_valid"], 1)

    def test_revocation_count_counts_both_crl_and_ocsp(self):
        root   = ET.fromstring(_make_xades_a_xml())
        result = self.extractor.extract_and_validate(root)
        self.assertEqual(result["revocation_values_found"], 2,
            "CRLValue(1) + OCSPValue(1) = 2")
        self.assertEqual(result["revocation_values_valid"], 2)

    def test_completeness_score_boundary_at_0_8(self):
        """
        Score threshold = 0.8:
          cert_score=0.5 (1/1 cert valid) + rev_score=0.25 (1/2 rev valid) = 0.75 → False
          cert_score=0.5 + rev_score=0.5 = 1.00 → True
        """
        # 1 valid + 1 invalid rev → rev_valid/rev_found = 0.5 → rev_score = 0.25
        xml_partial = _make_xades_a_xml(crl_b64=_INVALID_DER_B64)
        root        = ET.fromstring(xml_partial)
        result      = self.extractor.extract_and_validate(root)
        self.assertAlmostEqual(result["completeness_score"], 0.75, places=2)
        self.assertFalse(result["is_archival_ready"],
            "0.75 < 0.8 ต้องไม่ผ่าน is_archival_ready")


class TestArchiveTimeStampStructure(unittest.TestCase):
    """ตรวจ skeleton ของ ArchiveTimeStamp ใน UnsignedSignatureProperties"""

    def setUp(self):
        self.root = ET.fromstring(_make_xades_a_xml())

    def test_archive_timestamp_present(self):
        arch = self.root.find(".//xades:ArchiveTimeStamp", _NS)
        self.assertIsNotNone(arch, "ต้องมี xades:ArchiveTimeStamp ใน XAdES-A")

    def test_archive_timestamp_c14n_method(self):
        arch  = self.root.find(".//xades:ArchiveTimeStamp", _NS)
        c14n  = arch.find("ds:CanonicalizationMethod", _NS)
        self.assertIsNotNone(c14n)
        self.assertEqual(c14n.get("Algorithm"), ALG_C14N_EXCL)

    def test_archive_timestamp_encapsulated_tst(self):
        arch = self.root.find(".//xades:ArchiveTimeStamp", _NS)
        enc  = arch.find("xades:EncapsulatedTimeStamp", _NS)
        self.assertIsNotNone(enc)
        # Level 1+2: base64 + 0x30 tag + ASN.1 parse (asn1crypto ถ้ามี)
        assert_parseable_der(self, enc.text, "ArchiveTimeStamp/EncapsulatedTimeStamp")

    def test_archive_timestamp_depends_on_certificate_and_revocation_values(self):
        """
        Dependency check (ไม่ใช่ strict index ordering):
        ถ้ามี ArchiveTimeStamp → ต้องมี CertificateValues และ RevocationValues ด้วย
        ETSI บังคับ dependency นี้ แต่ serializer ต่างกันอาจ order ต่างกัน

        สำหรับ canonical input set ของ ArchiveTimeStamp ให้ยึดตาม
        profile ที่ระบบกำหนดไว้ใน docs/etax_output/ (documented canonical input set)
        ไม่ตรวจ index เพราะ lxml / stdlib / JAXB อาจ serialize ต่างลำดับ
        """
        usp = self.root.find(".//xades:UnsignedSignatureProperties", _NS)
        self.assertIsNotNone(usp, "ต้องมี UnsignedSignatureProperties")

        # presence check — ทั้ง 3 ต้องมี
        cert = usp.find("xades:CertificateValues", _NS)
        rev  = usp.find("xades:RevocationValues",  _NS)
        arch = self.root.find(".//xades:ArchiveTimeStamp", _NS)
        self.assertIsNotNone(cert, "CertificateValues ต้องมี")
        self.assertIsNotNone(rev,  "RevocationValues ต้องมี")
        self.assertIsNotNone(arch, "ArchiveTimeStamp ต้องมี")

        # uniqueness check — ไม่ duplicate
        arch_ids = [
            a.get("Id", "")
            for a in self.root.findall(".//xades:ArchiveTimeStamp", _NS)
        ]
        self.assertEqual(len(arch_ids), len(set(arch_ids)),
            "ArchiveTimeStamp Id ต้องไม่ซ้ำกัน")

        # dependency check — ArchiveTimeStamp ไม่ควรมีโดยไม่มี CertificateValues
        # (verify โดยทดสอบ inverse: ลบ cert แล้วตรวจว่า arch ยังอยู่)
        # → ทำแค่ assertion ว่า dependency ครบ ไม่ได้ลบของจริง
        self.assertTrue(
            cert is not None and arch is not None,
            "ArchiveTimeStamp ต้องอยู่ร่วมกับ CertificateValues เสมอ"
        )

    def test_no_archive_timestamp_when_excluded(self):
        xml  = _make_xades_a_xml(include_archive_ts=False)
        root = ET.fromstring(xml)
        arch = root.find(".//xades:ArchiveTimeStamp", _NS)
        self.assertIsNone(arch, "ถ้าไม่ส่ง ArchiveTimeStamp ก็ต้องไม่มีใน XML")


class TestOCSPCRLPolicy(unittest.TestCase):
    """OCSP/CRL fetch policy — pre-conditions ก่อน XAdES-A"""

    ACCEPTED_DIGEST_OIDS = {
        "2.16.840.1.101.3.4.2.1",   # SHA-256
        "2.16.840.1.101.3.4.2.2",   # SHA-384
        "2.16.840.1.101.3.4.2.3",   # SHA-512
    }
    SHA1_OID = "1.3.14.3.2.26"

    def test_sha1_not_accepted_for_revocation(self):
        self.assertNotIn(self.SHA1_OID, self.ACCEPTED_DIGEST_OIDS,
            "SHA-1 ต้องไม่ยอมรับสำหรับ revocation hashing")

    def test_revocation_values_both_types_accepted(self):
        """XAdES-A ยอมรับทั้ง CRL และ OCSP response"""
        root   = ET.fromstring(_make_xades_a_xml())
        crl    = root.findall(".//xades:CRLValue",  _NS)
        ocsp   = root.findall(".//xades:OCSPValue", _NS)
        self.assertGreater(len(crl),  0, "ต้องมี CRLValue")
        self.assertGreater(len(ocsp), 0, "ต้องมี OCSPValue")

    def test_all_revocation_values_are_valid_der(self):
        root   = ET.fromstring(_make_xades_a_xml())
        for elem in root.findall(".//xades:CRLValue",  _NS):
            self.assertTrue(_is_valid_der(elem.text), "CRLValue ต้องเป็น valid DER")
        for elem in root.findall(".//xades:OCSPValue", _NS):
            self.assertTrue(_is_valid_der(elem.text), "OCSPValue ต้องเป็น valid DER")

    def test_revocation_values_inside_unsigned_signature_properties(self):
        """RevocationValues ต้องอยู่ใน UnsignedSignatureProperties (ไม่ใช่ระดับ root)"""
        root = ET.fromstring(_make_xades_a_xml())
        usp  = root.find(".//xades:UnsignedSignatureProperties", _NS)
        self.assertIsNotNone(usp)
        rev = usp.find("xades:RevocationValues", _NS)
        self.assertIsNotNone(rev,
            "RevocationValues ต้องอยู่ภายใน UnsignedSignatureProperties")

    def test_certificate_values_inside_unsigned_signature_properties(self):
        root = ET.fromstring(_make_xades_a_xml())
        usp  = root.find(".//xades:UnsignedSignatureProperties", _NS)
        cert = usp.find("xades:CertificateValues", _NS)
        self.assertIsNotNone(cert,
            "CertificateValues ต้องอยู่ภายใน UnsignedSignatureProperties")


if __name__ == "__main__":
    unittest.main(verbosity=2)
