# -*- coding: utf-8 -*-
"""
XAdES Integration Tests
ทดสอบ end-to-end: XML structure → XAdESAExtractor → scoring → verifier gate

ออกแบบให้:
  - รันได้ทั้งกรณีมี / ไม่มี xades-engine ใน PYTHONPATH
  - test ที่ต้องใช้ engine จะถูก skip อัตโนมัติพร้อมเหตุผล
  - test ที่ไม่ต้องใช้ engine (XML structure, DER helpers) รันเสมอ

รัน:
  python -m pytest tests/test_xades_integration.py -v
  python -m pytest tests/test_xades_integration.py -v -k "not engine"  # เฉพาะ structure
"""

import base64
import hashlib
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

# ── Import helpers ────────────────────────────────────────────────────────────

_TESTS_DIR = Path(__file__).parent
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

from helpers_der import (
    decode_b64_der,
    is_parseable_der,
    is_valid_der_sequence,
    assert_parseable_der,
    minimal_der_sequence,
    try_parse_asn1,
    calculate_archive_readiness_score,
    needs_engine as _needs_engine_mark,
    needs_asn1  as _needs_asn1_mark,
    _HAS_ASN1CRYPTO,
)

# ── xades-engine import (fallback) ────────────────────────────────────────────

_ENGINE_PATHS = [
    Path(__file__).parent.parent / "xades-engine" / "src",
    Path(__file__).parent.parent / "xades-engine",
]


def _try_import_engine():
    for path in _ENGINE_PATHS:
        if str(path) not in sys.path:
            sys.path.insert(0, str(path))
    names = ("XAdESAExtractor", "_is_valid_der", "has_archival_evidence",
             "verify_xades_t_timestamp")
    try:
        from xades_engine.xades_a import (
            XAdESAExtractor, _is_valid_der, has_archival_evidence,
        )
        try:
            from xades_engine.xades_t import verify_xades_t_timestamp
        except ImportError:
            verify_xades_t_timestamp = None
        return XAdESAExtractor, _is_valid_der, has_archival_evidence, \
               verify_xades_t_timestamp, True
    except ImportError as exc:
        return None, None, None, None, False


(XAdESAExtractor, _is_valid_der, has_archival_evidence,
 verify_xades_t_timestamp, _ENGINE_OK) = _try_import_engine()

# pytest.mark variants from helpers_der (work on unittest.TestCase under pytest)
needs_engine = _needs_engine_mark
needs_asn1   = _needs_asn1_mark

# ── Namespace / Algorithm constants ──────────────────────────────────────────

DS_NS    = "http://www.w3.org/2000/09/xmldsig#"
XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"
_NS      = {"ds": DS_NS, "xades": XADES_NS}
ALG_C14N_EXCL = "http://www.w3.org/2001/10/xml-exc-c14n#"

# ── Shared fixture builders ───────────────────────────────────────────────────

def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


_VALID_DER_B64 = _b64(minimal_der_sequence(50))
_INVALID_B64   = _b64(b"\x00" * 20)
_DUMMY_TST_B64 = _b64(minimal_der_sequence(20))


def _full_xades_a_xml(
    cert_b64: str = _VALID_DER_B64,
    crl_b64:  str = _VALID_DER_B64,
    ocsp_b64: str = _VALID_DER_B64,
    arch_b64: str = _DUMMY_TST_B64,
    sig_ts_b64: str = _DUMMY_TST_B64,
) -> bytes:
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
        f'<xades:SigningTime>2025-08-22T12:00:00Z</xades:SigningTime>'
        f'</xades:SignedSignatureProperties>'
        f'</xades:SignedProperties>'
        f'<xades:UnsignedProperties>'
        f'<xades:UnsignedSignatureProperties>'
        f'<xades:SignatureTimeStamp Id="SignatureTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{sig_ts_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:SignatureTimeStamp>'
        f'<xades:CertificateValues>'
        f'<ds:X509Certificate>{cert_b64}</ds:X509Certificate>'
        f'</xades:CertificateValues>'
        f'<xades:RevocationValues>'
        f'<xades:CRLValue>{crl_b64}</xades:CRLValue>'
        f'<xades:OCSPValue>{ocsp_b64}</xades:OCSPValue>'
        f'</xades:RevocationValues>'
        f'<xades:ArchiveTimeStamp Id="ArchiveTimeStamp-1">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{arch_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:ArchiveTimeStamp>'
        f'</xades:UnsignedSignatureProperties>'
        f'</xades:UnsignedProperties>'
        f'</xades:QualifyingProperties>'
        f'</ds:Object>'
        f'</ds:Signature>'
        f'</Invoice>'
    ).encode()


# ─────────────────────────────────────────────────────────────────────────────
# A. helpers_der sanity (ไม่ต้องใช้ engine — รันเสมอ)
# ─────────────────────────────────────────────────────────────────────────────

class TestHelpersDerLevel1(unittest.TestCase):
    """decode_b64_der() — Level 1 only"""

    def test_valid_der_returns_bytes(self):
        raw = decode_b64_der(_VALID_DER_B64)
        self.assertEqual(raw[0], 0x30)
        self.assertGreater(len(raw), 10)

    def test_empty_raises(self):
        with self.assertRaises(ValueError):
            decode_b64_der("")

    def test_wrong_tag_raises(self):
        with self.assertRaises(ValueError):
            decode_b64_der(_INVALID_B64)

    def test_short_der_raises(self):
        short = _b64(bytes([0x30, 5]) + bytes(5))
        with self.assertRaises(ValueError):
            decode_b64_der(short)

    def test_whitespace_stripped(self):
        with_ws = "\n" + _VALID_DER_B64[:10] + "\n" + _VALID_DER_B64[10:] + "\n"
        raw = decode_b64_der(with_ws)
        self.assertEqual(raw[0], 0x30)


class TestHelpersDerLevel2(unittest.TestCase):
    """try_parse_asn1() — Level 2"""

    def test_graceful_without_asn1crypto(self):
        """ถ้าไม่มี asn1crypto ต้องคืน (True, 'skipped') ไม่ raise"""
        ok, reason = try_parse_asn1(minimal_der_sequence(50))
        self.assertTrue(ok, f"ต้องคืน True: {reason}")

    @needs_asn1
    def test_valid_der_parses(self):
        ok, reason = try_parse_asn1(minimal_der_sequence(50))
        self.assertTrue(ok, f"minimal DER ต้อง parse ได้: {reason}")

    @needs_asn1
    def test_garbage_bytes_fail(self):
        garbage = b"\x30\xFF\xFF\xFF\xFF\xFF" + b"\x00" * 20
        ok, reason = try_parse_asn1(garbage)
        self.assertFalse(ok, "garbage DER ต้อง fail parse")

    def test_is_parseable_der_ok(self):
        ok, reason = is_parseable_der(_VALID_DER_B64)
        self.assertTrue(ok, f"valid DER b64: {reason}")

    def test_is_parseable_der_invalid(self):
        ok, reason = is_parseable_der(_INVALID_B64)
        self.assertFalse(ok)
        self.assertIn("0x30", reason)

    def test_is_parseable_der_none(self):
        ok, reason = is_parseable_der(None)
        self.assertFalse(ok)


# ─────────────────────────────────────────────────────────────────────────────
# B. XML Structure (ไม่ต้องใช้ engine — รันเสมอ)
# ─────────────────────────────────────────────────────────────────────────────

class TestXAdESAStructureNoEngine(unittest.TestCase):
    """ตรวจ XML structure โดยใช้ ET/XPath เท่านั้น"""

    def setUp(self):
        self.root = ET.fromstring(_full_xades_a_xml())

    def test_required_elements_present(self):
        required = [
            ".//xades:CertificateValues",
            ".//xades:RevocationValues",
            ".//xades:CRLValue",
            ".//xades:OCSPValue",
            ".//xades:ArchiveTimeStamp",
            ".//xades:SignatureTimeStamp",
        ]
        for xpath in required:
            el = self.root.find(xpath, _NS)
            self.assertIsNotNone(el, f"ต้องพบ {xpath}")

    def test_all_timestamps_have_c14n(self):
        for ts_tag in ("SignatureTimeStamp", "ArchiveTimeStamp"):
            ts = self.root.find(f".//xades:{ts_tag}", _NS)
            c14n = ts.find("ds:CanonicalizationMethod", _NS)
            self.assertIsNotNone(c14n, f"{ts_tag} ต้องมี CanonicalizationMethod")
            self.assertEqual(c14n.get("Algorithm"), ALG_C14N_EXCL)

    def test_all_encapsulated_tst_are_parseable_der(self):
        for enc in self.root.findall(".//xades:EncapsulatedTimeStamp", _NS):
            assert_parseable_der(self, enc.text, "EncapsulatedTimeStamp")

    def test_all_cert_values_are_parseable_der(self):
        for cert in self.root.findall(".//xades:CertificateValues//ds:X509Certificate", _NS):
            assert_parseable_der(self, cert.text, "X509Certificate")

    def test_all_revocation_values_are_parseable_der(self):
        for crl in self.root.findall(".//xades:CRLValue", _NS):
            assert_parseable_der(self, crl.text, "CRLValue")
        for ocsp in self.root.findall(".//xades:OCSPValue", _NS):
            assert_parseable_der(self, ocsp.text, "OCSPValue")

    def test_timestamp_ids_globally_unique(self):
        all_ids = [
            el.get("Id", "")
            for el in self.root.findall(".//*[@Id]", _NS)
            if el.get("Id", "")
        ]
        self.assertEqual(len(all_ids), len(set(all_ids)),
            "Id attribute ทุกตัวใน document ต้องไม่ซ้ำกัน")

    def test_archive_dependency_on_cert_and_rev(self):
        """dependency: ถ้ามี ArchiveTimeStamp → ต้องมี CertificateValues + RevocationValues"""
        usp  = self.root.find(".//xades:UnsignedSignatureProperties", _NS)
        arch = usp.find("xades:ArchiveTimeStamp",   _NS)
        cert = usp.find("xades:CertificateValues",  _NS)
        rev  = usp.find("xades:RevocationValues",   _NS)
        if arch is not None:
            self.assertIsNotNone(cert, "ArchiveTimeStamp ต้องมี CertificateValues")
            self.assertIsNotNone(rev,  "ArchiveTimeStamp ต้องมี RevocationValues")

    def test_invalid_cert_der_detected(self):
        xml  = _full_xades_a_xml(cert_b64=_INVALID_B64)
        root = ET.fromstring(xml)
        cert = root.find(".//xades:CertificateValues//ds:X509Certificate", _NS)
        ok, reason = is_parseable_der(cert.text)
        self.assertFalse(ok, "invalid DER cert ต้องตรวจพบ")
        self.assertIn("0x30", reason)


# ─────────────────────────────────────────────────────────────────────────────
# C. Engine Integration Tests (skip ถ้าไม่มี xades-engine)
# ─────────────────────────────────────────────────────────────────────────────

@needs_engine
class TestExtractorIntegration(unittest.TestCase):
    """XAdESAExtractor.extract_and_validate() — integration"""

    def setUp(self):
        self.extractor = XAdESAExtractor()
        self.root_ok   = ET.fromstring(_full_xades_a_xml())
        self.root_bad  = ET.fromstring(_full_xades_a_xml(cert_b64=_INVALID_B64))

    def test_valid_doc_completeness_1_0(self):
        r = self.extractor.extract_and_validate(self.root_ok)
        self.assertEqual(r["completeness_score"], 1.0)
        self.assertTrue(r["is_archival_ready"])
        self.assertEqual(r["warnings"], [])

    def test_invalid_cert_drops_score_below_threshold(self):
        r = self.extractor.extract_and_validate(self.root_bad)
        self.assertLess(r["completeness_score"], 0.8,
            "invalid cert ต้อง drop score ต่ำกว่า threshold 0.8")
        self.assertFalse(r["is_archival_ready"])
        self.assertTrue(any("Certificate" in w for w in r["warnings"]))

    def test_cert_and_rev_counts(self):
        r = self.extractor.extract_and_validate(self.root_ok)
        self.assertEqual(r["cert_values_found"], 1)
        self.assertEqual(r["cert_values_valid"], 1)
        self.assertEqual(r["revocation_values_found"], 2)   # 1 CRL + 1 OCSP
        self.assertEqual(r["revocation_values_valid"], 2)

    def test_has_archival_evidence_true(self):
        self.assertTrue(has_archival_evidence(self.root_ok))

    def test_engine_is_valid_der_consistent_with_helpers(self):
        """_is_valid_der() ใน engine ต้องสอดคล้องกับ is_parseable_der() ใน helpers"""
        for b64, expected in [
            (_VALID_DER_B64,  True),
            (_INVALID_B64,    False),
        ]:
            engine_result = _is_valid_der(b64)
            helper_ok, _  = is_parseable_der(b64)
            # Level 1 check (0x30 + len) ต้องตรงกันเสมอ
            self.assertEqual(engine_result, helper_ok,
                f"_is_valid_der() != is_parseable_der() สำหรับ {b64[:20]}...")


@needs_engine
class TestVerifierGateIntegration(unittest.TestCase):
    """ตรวจ XPath ที่ verify_xades_t_timestamp() และ XAdESAExtractor ใช้ร่วมกัน"""

    def setUp(self):
        self.root = ET.fromstring(_full_xades_a_xml())

    def test_signature_value_xpath(self):
        """xades_t.py line 43: root.find('.//ds:SignatureValue')"""
        sigv = self.root.find(".//ds:SignatureValue", _NS)
        self.assertIsNotNone(sigv)
        raw = base64.b64decode(sigv.text.strip())
        self.assertGreater(len(raw), 0)
        self.assertEqual(len(hashlib.sha256(raw).digest()), 32)

    def test_signature_timestamp_xpath(self):
        """xades_t.py line 56: './/xades:UnsignedSignatureProperties/xades:SignatureTimeStamp'"""
        ts = self.root.find(
            ".//xades:UnsignedSignatureProperties/xades:SignatureTimeStamp", _NS
        )
        self.assertIsNotNone(ts)

    def test_encapsulated_timestamp_xpath(self):
        """xades_t.py line 68: ts_elem.find('.//xades:EncapsulatedTimeStamp')"""
        ts  = self.root.find(".//xades:SignatureTimeStamp", _NS)
        enc = ts.find(".//xades:EncapsulatedTimeStamp", _NS)
        self.assertIsNotNone(enc)
        self.assertTrue(enc.text and enc.text.strip())

    def test_certificate_values_xpath(self):
        """xades_a.py line 73: './/xades:CertificateValues//ds:X509Certificate'"""
        certs = self.root.findall(".//xades:CertificateValues//ds:X509Certificate", _NS)
        self.assertGreater(len(certs), 0)
        for cert in certs:
            ok, reason = is_parseable_der(cert.text)
            self.assertTrue(ok, f"X509Certificate DER: {reason}")

    def test_revocation_values_xpath(self):
        """xades_a.py lines 86, 93"""
        crls  = self.root.findall(".//xades:RevocationValues//xades:CRLValue",  _NS)
        ocsps = self.root.findall(".//xades:RevocationValues//xades:OCSPValue", _NS)
        self.assertGreater(len(crls),  0)
        self.assertGreater(len(ocsps), 0)

    def test_xxe_guard(self):
        xxe = b"""<?xml version='1.0'?>
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>
<Invoice xmlns:ds="http://www.w3.org/2000/09/xmldsig#">&x;</Invoice>"""
        root = ET.fromstring(xxe)
        text = ET.tostring(root, encoding="unicode")
        self.assertNotIn("/etc/passwd", text)


# ─────────────────────────────────────────────────────────────────────────────
# D. DER Structure — negative tests (ไม่ต้องใช้ engine หรือ asn1crypto)
# ─────────────────────────────────────────────────────────────────────────────

class TestDerStructureValidation(unittest.TestCase):
    """
    ตรวจ is_valid_der_sequence() แบบ white-box
    ครอบคลุม: short-form, long-form, truncated, over-declared, wrong tag
    """

    # ── short-form ────────────────────────────────────────────────────────────

    def test_short_form_valid(self):
        raw = bytes([0x30, 20]) + bytes(20)
        self.assertTrue(is_valid_der_sequence(raw, min_len=11))

    def test_short_form_truncated(self):
        # declared content_len=20 แต่มีแค่ 10 bytes
        raw = bytes([0x30, 20]) + bytes(10)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_short_form_exact_boundary(self):
        # header(2) + content(0) = 2 bytes — ผ่าน structure แต่ fail min_len=11
        raw = bytes([0x30, 0])
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))
        # min_len=2 ควรผ่าน
        self.assertTrue(is_valid_der_sequence(raw, min_len=2))

    # ── long-form ─────────────────────────────────────────────────────────────

    def test_long_form_1byte_valid(self):
        payload = bytes(200)
        raw = bytes([0x30, 0x81, 200]) + payload   # 0x81 = 1 length byte
        self.assertTrue(is_valid_der_sequence(raw, min_len=11))

    def test_long_form_2bytes_valid(self):
        payload = bytes(400)
        # 0x82 = 2 length bytes, 400 = 0x0190
        raw = bytes([0x30, 0x82, 0x01, 0x90]) + payload
        self.assertTrue(is_valid_der_sequence(raw, min_len=11))

    def test_long_form_n_zero_indefinite(self):
        # 0x80 = indefinite length — ไม่ใช่ DER valid
        raw = bytes([0x30, 0x80]) + bytes(30)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_long_form_length_bytes_missing(self):
        # 0x82 แปลว่า n=2 แต่ stream หมดก่อนมี 2 bytes
        raw = bytes([0x30, 0x82, 0x01])            # ขาด 1 byte
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_long_form_n_too_large(self):
        # n=5 เกิน limit 4
        raw = bytes([0x30, 0x85]) + bytes(30)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    # ── over-declared length ──────────────────────────────────────────────────

    def test_over_declared_short_form(self):
        # declared 100 bytes of content แต่มีแค่ 20 bytes จริง
        raw = bytes([0x30, 100]) + bytes(20)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_over_declared_long_form(self):
        # declared 1000 bytes (0x03E8) แต่ actual payload แค่ 50 bytes
        raw = bytes([0x30, 0x82, 0x03, 0xE8]) + bytes(50)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    # ── wrong ASN.1 tag ───────────────────────────────────────────────────────

    def test_wrong_tag_integer(self):
        raw = bytes([0x02, 20]) + bytes(20)        # INTEGER (0x02) ไม่ใช่ SEQUENCE
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_wrong_tag_octet_string(self):
        raw = bytes([0x04, 20]) + bytes(20)        # OCTET STRING (0x04)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    def test_wrong_tag_set(self):
        raw = bytes([0x31, 20]) + bytes(20)        # SET (0x31)
        self.assertFalse(is_valid_der_sequence(raw, min_len=11))

    # ── edge cases ────────────────────────────────────────────────────────────

    def test_empty_bytes(self):
        self.assertFalse(is_valid_der_sequence(b"", min_len=11))

    def test_single_byte_tag_only(self):
        self.assertFalse(is_valid_der_sequence(bytes([0x30]), min_len=11))

    def test_min_len_enforcement(self):
        # 12 bytes valid structurally แต่ fail ถ้า min_len=50
        raw = bytes([0x30, 10]) + bytes(10)
        self.assertFalse(is_valid_der_sequence(raw, min_len=50))
        self.assertTrue(is_valid_der_sequence(raw, min_len=11))

    def test_minimal_der_sequence_helper_passes(self):
        # fixture helper ต้อง generate ของที่ผ่าน validator เสมอ
        for size in (20, 50, 127, 128, 200):
            raw = minimal_der_sequence(size)
            self.assertTrue(
                is_valid_der_sequence(raw, min_len=11),
                f"minimal_der_sequence({size}) ควรผ่าน validator"
            )


# ─────────────────────────────────────────────────────────────────────────────
# E. Archive Readiness Score (ไม่ต้องใช้ engine)
# ─────────────────────────────────────────────────────────────────────────────

class TestArchiveReadinessScore(unittest.TestCase):
    """ตรวจ calculate_archive_readiness_score() สอดคล้องกับ XAdESAExtractor"""

    def test_full_score(self):
        # 2 certs + 1 revocation → 0.5 + 0.5 = 1.0
        self.assertAlmostEqual(
            calculate_archive_readiness_score(2, 1), 1.0
        )

    def test_single_cert_single_rev(self):
        # 1 cert (0.25) + 1 rev (0.5) = 0.75 < 0.8 threshold
        self.assertAlmostEqual(
            calculate_archive_readiness_score(1, 1), 0.75
        )

    def test_no_cert_no_rev(self):
        self.assertAlmostEqual(
            calculate_archive_readiness_score(0, 0), 0.0
        )

    def test_cert_capped_at_half(self):
        # cert_count=10 → capped at 0.5
        score = calculate_archive_readiness_score(10, 1)
        self.assertAlmostEqual(score, 1.0)

    def test_rev_capped_at_half(self):
        score = calculate_archive_readiness_score(2, 100)
        self.assertAlmostEqual(score, 1.0)

    def test_threshold_boundary(self):
        # score >= 0.8 → is_archival_ready per xades_a.py
        self.assertGreaterEqual(
            calculate_archive_readiness_score(2, 1), 0.8
        )
        self.assertLess(
            calculate_archive_readiness_score(1, 1), 0.8
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
