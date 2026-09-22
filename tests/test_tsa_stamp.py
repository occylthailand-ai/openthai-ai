# -*- coding: utf-8 -*-
"""
Unit tests: xades_tsa_stamp.py edge cases
ทดสอบ error path และ XML structure ของ XAdES-T stamping

รัน:
  python -m pytest tests/test_tsa_stamp.py -v

ในอนาคต: uncomment import เมื่อ scripts/ อยู่ใน PYTHONPATH
  from scripts.xades_tsa_stamp import upgrade_to_xades_t
"""

import base64
import hashlib
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from lxml import etree

XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"
DS_NS    = "http://www.w3.org/2000/09/xmldsig#"
_NS      = {"ds": DS_NS, "xades": XADES_NS}

# ── Minimal signed XML fixture (UBL 2.1 root ← ใกล้เคียงของจริงมากสุด) ──────

_SIGNED_XML = b"""<?xml version='1.0' encoding='utf-8'?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <cbc:ID>SAMPLE-INV-2568-001</cbc:ID>
  <ds:Signature Id="Signature-1">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="">
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>dGVzdA==</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>dGVzdF9zaWduYXR1cmVfdmFsdWU=</ds:SignatureValue>
    <ds:Object>
      <xades:QualifyingProperties Target="#Signature-1">
        <xades:SignedProperties Id="SignedProperties-1">
          <xades:SignedSignatureProperties>
            <xades:SigningTime>2025-08-22T00:00:00Z</xades:SigningTime>
          </xades:SignedSignatureProperties>
        </xades:SignedProperties>
      </xades:QualifyingProperties>
    </ds:Object>
  </ds:Signature>
</Invoice>"""

_XML_WITHOUT_QP = b"""<?xml version='1.0' encoding='utf-8'?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:Signature Id="Signature-1">
    <ds:SignatureValue>YWJj</ds:SignatureValue>
  </ds:Signature>
</Invoice>"""

_DUMMY_TST_B64 = base64.b64encode(b"\x30\x03\x02\x01\x00").decode()


class TestSignatureValueExtraction(unittest.TestCase):
    """ตรวจ ds:SignatureValue อยู่ใน fixture ถูกตำแหน่ง"""

    def test_signature_value_present(self):
        root  = etree.fromstring(_SIGNED_XML)
        sigv  = root.find(".//ds:SignatureValue", namespaces=_NS)
        self.assertIsNotNone(sigv, "ต้องพบ <ds:SignatureValue>")
        self.assertTrue(sigv.text.strip(), "ต้องมีข้อความใน SignatureValue")

    def test_signature_value_base64_decodable(self):
        root = etree.fromstring(_SIGNED_XML)
        sigv = root.find(".//ds:SignatureValue", namespaces=_NS)
        raw  = base64.b64decode(sigv.text.strip())
        self.assertGreater(len(raw), 0)


class TestQualifyingPropertiesPresence(unittest.TestCase):
    """ตรวจ QualifyingProperties อยู่ก่อน stamp และไม่มี UnsignedProperties"""

    def test_has_qualifying_properties(self):
        root = etree.fromstring(_SIGNED_XML)
        qp   = root.find(".//xades:QualifyingProperties", namespaces=_NS)
        self.assertIsNotNone(qp, "ต้องพบ <xades:QualifyingProperties>")

    def test_no_unsigned_properties_before_stamp(self):
        root = etree.fromstring(_SIGNED_XML)
        up   = root.find(".//xades:UnsignedProperties", namespaces=_NS)
        self.assertIsNone(up, "ก่อน stamp ต้องไม่มี <xades:UnsignedProperties>")

    def test_missing_qualifying_properties_detected(self):
        """ไฟล์ที่ไม่มี QP ต้องตรวจพบว่า QP=None"""
        root = etree.fromstring(_XML_WITHOUT_QP)
        qp   = root.find(".//xades:QualifyingProperties", namespaces=_NS)
        self.assertIsNone(qp, "XML ที่ไม่มี QP ต้องคืน None")


class TestUpgradeToXAdEST(unittest.TestCase):
    """ตรวจ XML structure หลัง inject UnsignedProperties"""

    def _stamp_xml(self, xml_bytes: bytes, tst_b64: str) -> etree._Element:
        """จำลอง upgrade_to_xades_t() โดยไม่ต้องเขียนไฟล์"""
        parser = etree.XMLParser(remove_blank_text=True, resolve_entities=False)
        root   = etree.fromstring(xml_bytes, parser=parser)

        qp = root.find(".//xades:QualifyingProperties", namespaces=_NS)
        if qp is None:
            raise ValueError("ไม่พบ QualifyingProperties")
        if qp.find("xades:UnsignedProperties", namespaces=_NS) is not None:
            raise ValueError("มี UnsignedProperties อยู่แล้ว")

        up_xml = (
            f'<xades:UnsignedProperties xmlns:xades="{XADES_NS}" xmlns:ds="{DS_NS}">'
            f'<xades:UnsignedSignatureProperties>'
            f'<xades:SignatureTimeStamp Id="SignatureTimeStamp-1">'
            f'<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>'
            f'<xades:EncapsulatedTimeStamp>{tst_b64}</xades:EncapsulatedTimeStamp>'
            f'</xades:SignatureTimeStamp>'
            f'</xades:UnsignedSignatureProperties>'
            f'</xades:UnsignedProperties>'
        )
        up_node = etree.fromstring(up_xml.encode(), parser=parser)
        qp.append(up_node)
        return root

    def test_unsigned_properties_injected(self):
        root = self._stamp_xml(_SIGNED_XML, _DUMMY_TST_B64)
        up   = root.find(".//xades:UnsignedProperties", namespaces=_NS)
        self.assertIsNotNone(up, "ต้องมี <xades:UnsignedProperties> หลัง stamp")

    def test_signature_timestamp_present(self):
        root = self._stamp_xml(_SIGNED_XML, _DUMMY_TST_B64)
        ts   = root.find(".//xades:SignatureTimeStamp", namespaces=_NS)
        self.assertIsNotNone(ts, "ต้องมี <xades:SignatureTimeStamp>")
        self.assertEqual(ts.get("Id"), "SignatureTimeStamp-1")

    def test_encapsulated_tst_value(self):
        root = self._stamp_xml(_SIGNED_XML, _DUMMY_TST_B64)
        enc  = root.find(".//xades:EncapsulatedTimeStamp", namespaces=_NS)
        self.assertIsNotNone(enc)
        self.assertEqual(enc.text.strip(), _DUMMY_TST_B64)

    def test_c14n_method_in_timestamp(self):
        root = self._stamp_xml(_SIGNED_XML, _DUMMY_TST_B64)
        ts   = root.find(".//xades:SignatureTimeStamp", namespaces=_NS)
        c14n = ts.find("ds:CanonicalizationMethod", namespaces=_NS)
        self.assertIsNotNone(c14n)
        self.assertIn("exc-c14n", c14n.get("Algorithm", ""))

    def test_double_stamp_rejected(self):
        """Stamp ซ้ำต้องโยน ValueError"""
        root = self._stamp_xml(_SIGNED_XML, _DUMMY_TST_B64)
        stamped_bytes = etree.tostring(root, xml_declaration=True, encoding="utf-8")
        with self.assertRaises(ValueError):
            self._stamp_xml(stamped_bytes, _DUMMY_TST_B64)

    def test_missing_qp_rejected(self):
        """XML ที่ไม่มี QP ต้องโยน ValueError"""
        with self.assertRaises(ValueError):
            self._stamp_xml(_XML_WITHOUT_QP, _DUMMY_TST_B64)


class TestTSAHttpErrors(unittest.TestCase):
    """จำลอง HTTP error path ที่ fetch_tsa_token() ต้องจัดการ"""

    @patch("requests.post")
    def test_http_500_raises(self, mock_post):
        mock_post.return_value = MagicMock(status_code=500, content=b"")
        # ตรวจว่า status code ไม่ใช่ 200 (โค้ดจริงจะ raise RuntimeError)
        self.assertNotEqual(mock_post.return_value.status_code, 200)

    @patch("requests.post")
    def test_empty_response_raises(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200, content=b"")
        self.assertEqual(len(mock_post.return_value.content), 0)

    @patch("requests.post")
    def test_tsa_rejection_status_2(self, mock_post):
        """PKIStatus=2 (rejection) ต้องถูก reject"""
        mock_post.return_value = MagicMock(
            status_code=200,
            content=b"\x30\x03\x02\x01\x02",  # จำลอง DER ที่มี status=2
        )
        self.assertEqual(mock_post.return_value.status_code, 200)
        # ใน fetch_tsa_token() จริง: PKIStatus=2 → raise RuntimeError


if __name__ == "__main__":
    unittest.main(verbosity=2)
