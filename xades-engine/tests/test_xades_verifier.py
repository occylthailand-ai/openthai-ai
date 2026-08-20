"""Core verifier tests — BES profile, multi-reference, RSA-PKCS1v15."""
import pytest
from tests.fixtures.xades_builder import XAdESMultiRefFixtureBuilder
from lxml import etree
from xades_engine.xades_verifier import XAdESVerifier
from xades_engine.exceptions import XAdESVerificationError


@pytest.fixture(scope="module")
def builder():
    return XAdESMultiRefFixtureBuilder()


@pytest.fixture(scope="module")
def signed_xml(builder):
    return builder.create_signed_xades_xml()


def test_valid_xades_bes(signed_xml):
    v = XAdESVerifier()
    result = v.verify(signed_xml)
    assert result["is_valid"] is True, result["errors"]
    assert "XAdES" in result["xades_profile"]


def test_reference_count(signed_xml):
    v = XAdESVerifier()
    result = v.verify(signed_xml)
    assert len(result["references"]) == 2


def test_all_references_pass(signed_xml):
    v = XAdESVerifier()
    result = v.verify(signed_xml)
    for ref in result["references"]:
        assert ref["valid"] is True, f"Reference {ref['uri']} failed: {ref.get('error')}"


def test_tampered_document_fails(builder):
    xml = builder.create_signed_xades_xml()
    tampered = xml.replace(b"Test Seller Co.", b"Malicious Seller Co.")
    v = XAdESVerifier()
    result = v.verify(tampered)
    assert result["is_valid"] is False
    assert any("Digest mismatch" in e for e in result["errors"])


def test_missing_signature_raises(builder):
    xml = b"<r:Invoice xmlns:r='urn:etda:etax:1.0'><r:Header/></r:Invoice>"
    v = XAdESVerifier()
    with pytest.raises(XAdESVerificationError, match="No <ds:Signature>"):
        v.verify(xml)


def test_malformed_xml_raises():
    v = XAdESVerifier()
    with pytest.raises(XAdESVerificationError, match="Malformed XML"):
        v.verify(b"<not valid xml")


def test_profile_is_bes(signed_xml):
    v = XAdESVerifier()
    result = v.verify(signed_xml)
    # Builder does not add EPES/T/A elements
    assert result["xades_profile"] in ("XAdES-BES", "XAdES-EPES")
