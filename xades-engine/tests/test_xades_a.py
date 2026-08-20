"""XAdES-A archival extractor tests."""
import base64
from xml.etree import ElementTree as ET
import pytest
from xades_engine.xades_a import XAdESAExtractor, has_archival_evidence

NS_DS = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"

# Minimal valid DER SEQUENCE (0x30) — just enough to pass structural check
_VALID_DER_B64 = base64.b64encode(b"\x30\x82\x01\x00" + b"\x00" * 252).decode()
_INVALID_B64 = "Not-Valid-Base64!!!"
_WRONG_TAG_DER = base64.b64encode(b"\x02\x01\x00").decode()  # INTEGER, not SEQUENCE


def _xml(cert_b64: str = "", crl_b64: str = "", ocsp_b64: str = "") -> ET.Element:
    xml = f"""
    <UnsignedProperties xmlns:ds="{NS_DS}" xmlns:xades="{NS_XADES}">
        <xades:UnsignedSignatureProperties>
            {"<xades:CertificateValues><ds:X509Certificate>" + cert_b64 + "</ds:X509Certificate></xades:CertificateValues>" if cert_b64 else ""}
            <xades:RevocationValues>
                {"<xades:CRLValues><xades:CRLValue>" + crl_b64 + "</xades:CRLValue></xades:CRLValues>" if crl_b64 else ""}
                {"<xades:OCSPValues><xades:OCSPValue>" + ocsp_b64 + "</xades:OCSPValue></xades:OCSPValues>" if ocsp_b64 else ""}
            </xades:RevocationValues>
        </xades:UnsignedSignatureProperties>
    </UnsignedProperties>
    """
    return ET.fromstring(xml)


def test_complete_valid():
    root = _xml(cert_b64=_VALID_DER_B64, crl_b64=_VALID_DER_B64)
    result = XAdESAExtractor().extract_and_validate(root)
    assert result["cert_values_valid"] == 1
    assert result["revocation_values_valid"] == 1
    assert result["completeness_score"] == 1.0
    assert result["is_archival_ready"] is True


def test_cert_only_partial():
    root = _xml(cert_b64=_VALID_DER_B64)
    result = XAdESAExtractor().extract_and_validate(root)
    assert result["completeness_score"] == 0.5
    assert result["is_archival_ready"] is False


def test_invalid_base64():
    root = _xml(cert_b64=_INVALID_B64)
    result = XAdESAExtractor().extract_and_validate(root)
    assert result["cert_values_valid"] == 0
    assert result["completeness_score"] == 0.0


def test_wrong_asn1_tag():
    root = _xml(cert_b64=_WRONG_TAG_DER)
    result = XAdESAExtractor().extract_and_validate(root)
    assert result["cert_values_valid"] == 0


def test_mixed_valid_invalid():
    xml = f"""
    <UnsignedProperties xmlns:ds="{NS_DS}" xmlns:xades="{NS_XADES}">
        <xades:UnsignedSignatureProperties>
            <xades:CertificateValues>
                <ds:X509Certificate>{_VALID_DER_B64}</ds:X509Certificate>
                <ds:X509Certificate>{_INVALID_B64}</ds:X509Certificate>
            </xades:CertificateValues>
        </xades:UnsignedSignatureProperties>
    </UnsignedProperties>
    """
    root = ET.fromstring(xml)
    result = XAdESAExtractor().extract_and_validate(root)
    assert result["cert_values_found"] == 2
    assert result["cert_values_valid"] == 1
    assert result["completeness_score"] == 0.25  # 1/2 * 0.5


def test_no_archival_evidence():
    root = ET.fromstring("<doc/>")
    assert has_archival_evidence(root) is False


def test_has_archival_evidence():
    xml = f"""
    <doc xmlns:xades="{NS_XADES}">
        <xades:CertificateValues/>
    </doc>"""
    root = ET.fromstring(xml)
    assert has_archival_evidence(root) is True


def test_warnings_on_invalid():
    root = _xml(cert_b64=_INVALID_B64)
    result = XAdESAExtractor().extract_and_validate(root)
    assert len(result["warnings"]) > 0
