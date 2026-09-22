"""XAdES-T (Timestamped) verifier tests."""
import base64
import hashlib
import pytest
from unittest.mock import patch
from lxml import etree
from tests.fixtures.xades_builder import XAdESMultiRefFixtureBuilder
from xades_engine.xades_t import verify_xades_t_timestamp
from xades_engine.exceptions import XAdESVerificationError

NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
NS_DS = "http://www.w3.org/2000/09/xmldsig#"


@pytest.fixture(scope="module")
def builder():
    return XAdESMultiRefFixtureBuilder()


def _inject_timestamp(root: etree._Element, tsa_der_b64: str) -> etree._Element:
    """Inject <xades:UnsignedProperties> with a mocked EncapsulatedTimeStamp."""
    ns = {"xades": NS_XADES}
    qp = root.find(".//xades:QualifyingProperties", namespaces=ns)
    if qp is None:
        qp = etree.SubElement(root, f"{{{NS_XADES}}}QualifyingProperties")
    unsigned = etree.SubElement(qp, f"{{{NS_XADES}}}UnsignedProperties")
    unsigned_sig = etree.SubElement(unsigned, f"{{{NS_XADES}}}UnsignedSignatureProperties")
    ts = etree.SubElement(unsigned_sig, f"{{{NS_XADES}}}SignatureTimeStamp")
    encap = etree.SubElement(ts, f"{{{NS_XADES}}}EncapsulatedTimeStamp")
    encap.text = tsa_der_b64
    return root


def test_xades_t_valid(builder):
    xml = builder.create_signed_xades_xml()
    root = etree.fromstring(xml)

    # Compute expected digest as the real verifier will
    sig_val = root.find(".//{%s}SignatureValue" % NS_DS)
    sig_bytes = base64.b64decode(sig_val.text.strip())
    digest = hashlib.sha3_256(sig_bytes).digest()

    fake_der = b"\x30\x82\x01fake_tsa_der_bytes"
    _inject_timestamp(root, base64.b64encode(fake_der).decode())

    with patch("xades_engine.xades_t.verify_tsa_response") as mock_tsa:
        mock_tsa.return_value = {"status": "VALID", "gen_time": "2026-08-12T00:00:00Z", "matched": True}
        result = verify_xades_t_timestamp(root, expected_algorithm="sha3_256")

    assert result is not None
    assert result["xades_profile"] == "XAdES-T"
    assert result["valid"] is True


def test_xades_bes_returns_none(builder):
    xml = builder.create_signed_xades_xml()
    root = etree.fromstring(xml)
    result = verify_xades_t_timestamp(root, require_timestamp=False)
    assert result is None


def test_require_timestamp_raises_when_absent(builder):
    xml = builder.create_signed_xades_xml()
    root = etree.fromstring(xml)
    with pytest.raises(XAdESVerificationError, match="XAdES-T required"):
        verify_xades_t_timestamp(root, require_timestamp=True)


def test_malformed_encapsulated_ts(builder):
    xml = builder.create_signed_xades_xml()
    root = etree.fromstring(xml)
    _inject_timestamp(root, "")  # empty text → malformed
    with pytest.raises(XAdESVerificationError, match="missing or empty"):
        verify_xades_t_timestamp(root)


def test_tsa_mismatch_raises(builder):
    xml = builder.create_signed_xades_xml()
    root = etree.fromstring(xml)
    _inject_timestamp(root, base64.b64encode(b"\x30\x01x").decode())
    with patch("xades_engine.xades_t.verify_tsa_response") as mock_tsa:
        from xades_engine.exceptions import XAdESVerificationError as E
        mock_tsa.side_effect = E("TSA messageImprint mismatch")
        with pytest.raises(E, match="mismatch"):
            verify_xades_t_timestamp(root)
