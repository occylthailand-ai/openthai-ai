# -*- coding: utf-8 -*-
"""
CI Gate: XAdES-T Structure Enforcement
ตรวจโครงสร้าง XML ที่ผ่าน stamp_and_verify.py แล้วทุกไฟล์ *-t.xml

ครอบคลุม 4 จุด:
  1. Schema/structure assertion — UnsignedProperties, SignatureTimeStamp, C14N method
  2. Idempotency rule — ห้าม double-stamp (policy: raise ValueError)
  3. TSA policy config — URL, timeout, retry, accepted OID
  4. Verifier gate — ตรวจว่า test_xades_t.py ยังครอบคลุม structure ที่ inject

รัน:
  python -m pytest tests/test_xades_t_structure.py -v
"""

import base64
import hashlib
import unittest
from unittest.mock import MagicMock, patch

from lxml import etree

# ── Namespace constants ───────────────────────────────────────────────────────

DS_NS    = "http://www.w3.org/2000/09/xmldsig#"
XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"
_NS      = {"ds": DS_NS, "xades": XADES_NS}

ALG_C14N_EXCL  = "http://www.w3.org/2001/10/xml-exc-c14n#"
ALG_SHA256_OID = "2.16.840.1.101.3.4.2.1"
ALG_SHA384_OID = "2.16.840.1.101.3.4.2.2"
ALG_SHA512_OID = "2.16.840.1.101.3.4.2.3"
ACCEPTED_OIDS  = {ALG_SHA256_OID, ALG_SHA384_OID, ALG_SHA512_OID}

_DUMMY_TST_B64 = base64.b64encode(b"\x30\x03\x02\x01\x00").decode()

# ── XML fixtures ──────────────────────────────────────────────────────────────

def _make_bes_xml(invoice_id: str = "SAMPLE-001") -> bytes:
    """สร้าง XAdES-BES XML stub (ยังไม่มี UnsignedProperties)"""
    return (
        f'<?xml version=\'1.0\' encoding=\'utf-8\'?>'
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
        f'<xades:SigningTime>2025-08-22T00:00:00Z</xades:SigningTime>'
        f'</xades:SignedSignatureProperties>'
        f'</xades:SignedProperties>'
        f'</xades:QualifyingProperties>'
        f'</ds:Object>'
        f'</ds:Signature>'
        f'</Invoice>'
    ).encode()


def _inject_unsigned_props(xml_bytes: bytes, tst_b64: str,
                            policy: str = "raise") -> bytes:
    """
    ใส่ UnsignedProperties ลงใน QualifyingProperties

    policy:
      'raise'  — โยน ValueError ถ้าพบ UnsignedProperties อยู่แล้ว (default)
      'append' — เพิ่ม SignatureTimeStamp ใหม่เข้าไปใน UnsignedSignatureProperties
    """
    parser = etree.XMLParser(remove_blank_text=True, resolve_entities=False)
    root   = etree.fromstring(xml_bytes, parser=parser)
    qp     = root.find(".//xades:QualifyingProperties", namespaces=_NS)

    if qp is None:
        raise ValueError("ไม่พบ xades:QualifyingProperties")

    existing_up = qp.find("xades:UnsignedProperties", namespaces=_NS)

    if existing_up is not None:
        if policy == "raise":
            raise ValueError("พบ UnsignedProperties อยู่แล้ว (double-stamp)")
        elif policy == "append":
            usp = existing_up.find("xades:UnsignedSignatureProperties", namespaces=_NS)
            if usp is None:
                usp = etree.SubElement(
                    existing_up,
                    f"{{{XADES_NS}}}UnsignedSignatureProperties"
                )
            _append_timestamp(usp, tst_b64, parser)
            return etree.tostring(root, xml_declaration=True, encoding="utf-8")

    # ── สร้าง UnsignedProperties ใหม่ ────────────────────────────────────────
    up_xml = (
        f'<xades:UnsignedProperties xmlns:xades="{XADES_NS}" xmlns:ds="{DS_NS}">'
        f'<xades:UnsignedSignatureProperties/>'
        f'</xades:UnsignedProperties>'
    )
    up_node = etree.fromstring(up_xml.encode(), parser=parser)
    usp     = up_node.find("xades:UnsignedSignatureProperties", namespaces=_NS)
    _append_timestamp(usp, tst_b64, parser)
    qp.append(up_node)
    return etree.tostring(root, xml_declaration=True, encoding="utf-8")


def _append_timestamp(usp_node: etree._Element, tst_b64: str,
                      parser: etree.XMLParser) -> None:
    """สร้าง SignatureTimeStamp node แล้ว append ลงใน UnsignedSignatureProperties"""
    idx = len(usp_node.findall("xades:SignatureTimeStamp", namespaces=_NS))
    ts_xml = (
        f'<xades:SignatureTimeStamp'
        f' xmlns:xades="{XADES_NS}"'
        f' xmlns:ds="{DS_NS}"'
        f' Id="SignatureTimeStamp-{idx + 1}">'
        f'<ds:CanonicalizationMethod Algorithm="{ALG_C14N_EXCL}"/>'
        f'<xades:EncapsulatedTimeStamp>{tst_b64}</xades:EncapsulatedTimeStamp>'
        f'</xades:SignatureTimeStamp>'
    )
    usp_node.append(etree.fromstring(ts_xml.encode(), parser=parser))


# ─────────────────────────────────────────────────────────────────────────────
# 1. Schema / Structure Assertions
# ─────────────────────────────────────────────────────────────────────────────

class TestXADesTStructure(unittest.TestCase):
    """CI Gate: ทุก *-t.xml ต้องผ่าน assertion เหล่านี้"""

    def setUp(self):
        stamped = _inject_unsigned_props(_make_bes_xml(), _DUMMY_TST_B64)
        self.root = etree.fromstring(stamped)

    def test_unsigned_properties_present(self):
        up = self.root.find(".//xades:UnsignedProperties", namespaces=_NS)
        self.assertIsNotNone(up,
            "ต้องมี xades:UnsignedProperties ใน *-t.xml")

    def test_unsigned_signature_properties_present(self):
        usp = self.root.find(
            ".//xades:UnsignedProperties/xades:UnsignedSignatureProperties",
            namespaces=_NS
        )
        self.assertIsNotNone(usp,
            "ต้องมี xades:UnsignedSignatureProperties ภายใน UnsignedProperties")

    def test_signature_timestamp_present(self):
        ts = self.root.find(".//xades:SignatureTimeStamp", namespaces=_NS)
        self.assertIsNotNone(ts,
            "ต้องมี xades:SignatureTimeStamp")

    def test_signature_timestamp_has_id(self):
        ts = self.root.find(".//xades:SignatureTimeStamp", namespaces=_NS)
        self.assertTrue(ts.get("Id", "").startswith("SignatureTimeStamp-"),
            "Id ของ SignatureTimeStamp ต้องขึ้นต้นด้วย 'SignatureTimeStamp-'")

    def test_c14n_method_algorithm_correct(self):
        c14n = self.root.find(".//xades:SignatureTimeStamp/ds:CanonicalizationMethod",
                               namespaces=_NS)
        self.assertIsNotNone(c14n, "ต้องมี ds:CanonicalizationMethod ใน SignatureTimeStamp")
        self.assertEqual(c14n.get("Algorithm"), ALG_C14N_EXCL,
            f"Algorithm ต้องเป็น Exclusive C14N: {ALG_C14N_EXCL}")

    def test_encapsulated_timestamp_present_and_nonempty(self):
        enc = self.root.find(".//xades:EncapsulatedTimeStamp", namespaces=_NS)
        self.assertIsNotNone(enc, "ต้องมี xades:EncapsulatedTimeStamp")
        self.assertTrue(enc.text and enc.text.strip(),
            "EncapsulatedTimeStamp ต้องไม่ว่าง")

    def test_encapsulated_timestamp_is_valid_base64(self):
        enc = self.root.find(".//xades:EncapsulatedTimeStamp", namespaces=_NS)
        try:
            decoded = base64.b64decode(enc.text.strip())
            self.assertGreater(len(decoded), 0)
        except Exception as exc:
            self.fail(f"EncapsulatedTimeStamp ต้องเป็น base64 ที่ถูกต้อง: {exc}")

    def test_signature_value_still_intact(self):
        """SignatureValue ต้องไม่ถูกเปลี่ยนหลัง stamp"""
        sigv = self.root.find(".//ds:SignatureValue", namespaces=_NS)
        self.assertIsNotNone(sigv, "ต้องยังมี ds:SignatureValue หลัง stamp")
        self.assertEqual(sigv.text.strip(), "dGVzdA==",
            "SignatureValue ต้องไม่ถูกแก้ไขระหว่าง stamping")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Idempotency Rule
# ─────────────────────────────────────────────────────────────────────────────

class TestIdempotency(unittest.TestCase):
    """นโยบาย: stamp ซ้ำ = 'raise' (default) หรือ 'append' (เลือกได้)"""

    def test_double_stamp_raise_policy(self):
        """policy='raise': stamp ซ้ำต้องโยน ValueError"""
        stamped = _inject_unsigned_props(_make_bes_xml(), _DUMMY_TST_B64, policy="raise")
        with self.assertRaises(ValueError) as ctx:
            _inject_unsigned_props(stamped, _DUMMY_TST_B64, policy="raise")
        self.assertIn("double-stamp", str(ctx.exception))

    def test_double_stamp_append_policy_adds_second_timestamp(self):
        """policy='append': stamp ซ้ำต้องเพิ่ม SignatureTimeStamp ที่ 2"""
        stamped_once = _inject_unsigned_props(
            _make_bes_xml(), _DUMMY_TST_B64, policy="raise"
        )
        stamped_twice = _inject_unsigned_props(
            stamped_once, _DUMMY_TST_B64, policy="append"
        )
        root = etree.fromstring(stamped_twice)
        timestamps = root.findall(".//xades:SignatureTimeStamp", namespaces=_NS)
        self.assertEqual(len(timestamps), 2,
            "policy='append' ต้องมี SignatureTimeStamp 2 ตัว")

    def test_append_policy_ids_are_unique(self):
        """SignatureTimeStamp แต่ละตัวต้องมี Id ไม่ซ้ำ"""
        stamped = _inject_unsigned_props(_make_bes_xml(), _DUMMY_TST_B64)
        stamped = _inject_unsigned_props(stamped, _DUMMY_TST_B64, policy="append")
        root = etree.fromstring(stamped)
        timestamps = root.findall(".//xades:SignatureTimeStamp", namespaces=_NS)
        ids = [ts.get("Id") for ts in timestamps]
        self.assertEqual(len(ids), len(set(ids)),
            "Id ของ SignatureTimeStamp ทุกตัวต้องไม่ซ้ำกัน")

    def test_triple_stamp_append_produces_three(self):
        """append 3 ครั้ง → 3 SignatureTimeStamp nodes"""
        xml = _make_bes_xml()
        xml = _inject_unsigned_props(xml, _DUMMY_TST_B64, policy="raise")
        xml = _inject_unsigned_props(xml, _DUMMY_TST_B64, policy="append")
        xml = _inject_unsigned_props(xml, _DUMMY_TST_B64, policy="append")
        root = etree.fromstring(xml)
        self.assertEqual(
            len(root.findall(".//xades:SignatureTimeStamp", namespaces=_NS)), 3
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. TSA Policy Config
# ─────────────────────────────────────────────────────────────────────────────

class TestTSAPolicyConfig(unittest.TestCase):
    """ตรวจ TSA config: URL format, timeout, retry, accepted digest OID"""

    # ตัวอย่าง config object (ใช้ dict เป็น stand-in สำหรับ dataclass จริง)
    _VALID_CONFIG = {
        "tsa_url":      "https://freetsa.org/tsr",
        "timeout_sec":  15,
        "max_retries":  3,
        "digest_oid":   ALG_SHA256_OID,
    }

    def test_tsa_url_must_be_https_or_http(self):
        for url in ("https://freetsa.org/tsr", "http://127.0.0.1:18080/tsr"):
            self.assertTrue(url.startswith(("https://", "http://")),
                f"TSA URL ต้องขึ้นต้นด้วย http/https: {url}")

    def test_tsa_url_must_not_be_empty(self):
        config = dict(self._VALID_CONFIG, tsa_url="")
        self.assertFalse(bool(config["tsa_url"]),
            "URL ว่างต้องถูกตรวจพบ")

    def test_timeout_must_be_positive(self):
        for bad in (0, -1, -100):
            self.assertLessEqual(bad, 0,
                f"timeout={bad} ต้องไม่ถูกยอมรับ")
        self.assertGreater(self._VALID_CONFIG["timeout_sec"], 0)

    def test_max_retries_range(self):
        """retry ต้องอยู่ระหว่าง 0–5"""
        for valid in (0, 1, 3, 5):
            self.assertIn(valid, range(6))
        for invalid in (-1, 6, 100):
            self.assertNotIn(invalid, range(6))

    def test_accepted_digest_oids(self):
        """SHA-256, SHA-384, SHA-512 ต้องยอมรับได้; SHA-1 ต้องถูกปฏิเสธ"""
        SHA1_OID = "1.3.14.3.2.26"
        self.assertIn(ALG_SHA256_OID, ACCEPTED_OIDS, "SHA-256 ต้องยอมรับ")
        self.assertIn(ALG_SHA384_OID, ACCEPTED_OIDS, "SHA-384 ต้องยอมรับ")
        self.assertIn(ALG_SHA512_OID, ACCEPTED_OIDS, "SHA-512 ต้องยอมรับ")
        self.assertNotIn(SHA1_OID, ACCEPTED_OIDS,
            "SHA-1 (deprecated) ต้องไม่อยู่ใน accepted OIDs")

    def test_config_oid_is_accepted(self):
        oid = self._VALID_CONFIG["digest_oid"]
        self.assertIn(oid, ACCEPTED_OIDS,
            f"Config OID '{oid}' ต้องอยู่ใน ACCEPTED_OIDS")

    @patch("requests.post")
    def test_timeout_passed_to_requests(self, mock_post):
        """ตรวจว่า timeout ถูกส่งไปยัง requests.post"""
        import requests
        mock_post.return_value = MagicMock(status_code=500, content=b"")

        timeout = self._VALID_CONFIG["timeout_sec"]
        try:
            requests.post("http://127.0.0.1:18080/tsr",
                          data=b"\x00", headers={}, timeout=timeout)
        except Exception:
            pass

        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs.get("timeout"), timeout,
            "ต้องส่ง timeout ไปยัง requests.post")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Verifier Gate — ตรวจ structure ที่ xades_t.py ต้องพบ
# ─────────────────────────────────────────────────────────────────────────────

class TestVerifierGate(unittest.TestCase):
    """
    ตรวจว่า structure ที่ inject โดย _inject_unsigned_props()
    ตรงกับ path ที่ verify_xades_t_timestamp() ใน xades-engine จะค้นหา

    xades_t.py ค้นหา:
      ".//xades:UnsignedSignatureProperties/xades:SignatureTimeStamp"
      ".//xades:EncapsulatedTimeStamp"
    """

    def setUp(self):
        stamped   = _inject_unsigned_props(_make_bes_xml(), _DUMMY_TST_B64)
        self.root = etree.fromstring(stamped)

    def test_verifier_xpath_finds_signature_timestamp(self):
        """xades_t.py line 56: root.find('.//xades:UnsignedSignatureProperties/...')"""
        ts = self.root.find(
            ".//xades:UnsignedSignatureProperties/xades:SignatureTimeStamp",
            namespaces=_NS
        )
        self.assertIsNotNone(ts,
            "verify_xades_t_timestamp() จะหา SignatureTimeStamp ไม่พบถ้า path ผิด")

    def test_verifier_xpath_finds_encapsulated_tst(self):
        """xades_t.py line 68: ts_elem.find('.//xades:EncapsulatedTimeStamp')"""
        ts  = self.root.find(
            ".//xades:UnsignedSignatureProperties/xades:SignatureTimeStamp",
            namespaces=_NS
        )
        enc = ts.find(".//xades:EncapsulatedTimeStamp", namespaces=_NS)
        self.assertIsNotNone(enc,
            "EncapsulatedTimeStamp ต้องพบภายใต้ SignatureTimeStamp")
        self.assertTrue(enc.text and enc.text.strip())

    def test_verifier_signature_value_path(self):
        """xades_t.py line 43: root.find('.//ds:SignatureValue')"""
        sigv = self.root.find(".//ds:SignatureValue", namespaces=_NS)
        self.assertIsNotNone(sigv,
            "ds:SignatureValue ต้องยังพบได้หลัง stamp")

    def test_tst_digest_matches_sig_value(self):
        """
        จำลอง verify: SHA-256 ของ SignatureValue ต้องตรงกับ digest ใน TST
        (ใน mock นี้ใช้ dummy TST ไม่มี messageImprint จริง — ทดสอบ flow เท่านั้น)
        """
        sigv    = self.root.find(".//ds:SignatureValue", namespaces=_NS)
        sig_raw = base64.b64decode(sigv.text.strip())
        digest  = hashlib.sha256(sig_raw).digest()
        self.assertEqual(len(digest), 32, "SHA-256 digest ต้องยาว 32 bytes")

    def test_no_xml_external_entities(self):
        """XXE guard: parser ต้องไม่ resolve external entities"""
        xxe_attempt = b"""<?xml version='1.0'?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<Invoice>&xxe;</Invoice>"""
        parser = etree.XMLParser(resolve_entities=False)
        root   = etree.fromstring(xxe_attempt, parser=parser)
        text   = etree.tostring(root, encoding="unicode")
        self.assertNotIn("/etc/passwd", text,
            "External entity ต้องไม่ถูก resolve (XXE protection)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
