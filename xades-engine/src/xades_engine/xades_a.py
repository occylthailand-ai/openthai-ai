"""XAdES-A (Archival) profile extractor and structural validator.

Checks <xades:CertificateValues> and <xades:RevocationValues> for valid
ASN.1 DER payloads and computes a weighted completeness score.
"""
import base64
import logging
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET

logger = logging.getLogger("xades_engine.xades_a")

_NS = {
    "ds": "http://www.w3.org/2000/09/xmldsig#",
    "xades": "http://uri.etsi.org/01903/v1.3.2#",
}

try:
    from cryptography import x509
    from cryptography.hazmat.primitives.serialization import Encoding
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False


def _is_valid_der(b64_text: Optional[str]) -> bool:
    """True when *b64_text* decodes to a non-empty ASN.1 DER SEQUENCE (0x30)."""
    if not b64_text:
        return False
    try:
        raw = base64.b64decode("".join(b64_text.split()), validate=True)
        return len(raw) > 10 and raw[0] == 0x30
    except Exception:
        return False


def _parse_cert_fields(b64_text: str) -> Dict[str, Any]:
    """Extract basic X.509 fields using cryptography library."""
    fields: Dict[str, Any] = {}
    if not HAS_CRYPTOGRAPHY:
        return fields
    try:
        raw = base64.b64decode("".join(b64_text.split()))
        cert = x509.load_der_x509_certificate(raw)
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        not_after = cert.not_valid_after_utc if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after.replace(tzinfo=datetime.timezone.utc)
        not_before = cert.not_valid_before_utc if hasattr(cert, "not_valid_before_utc") else cert.not_valid_before.replace(tzinfo=datetime.timezone.utc)
        fields = {
            "subject": cert.subject.rfc4514_string(),
            "issuer": cert.issuer.rfc4514_string(),
            "serial": hex(cert.serial_number),
            "not_before": not_before.isoformat(),
            "not_after": not_after.isoformat(),
            "is_expired": now > not_after,
            "not_yet_valid": now < not_before,
        }
    except Exception as exc:
        logger.debug("Certificate parse failed: %s", exc)
    return fields


class XAdESAExtractor:
    """Extracts and validates XAdES-A archival elements."""

    def extract_and_validate(self, root: ET.Element) -> Dict[str, Any]:
        cert_found = cert_valid = 0
        cert_details: List[Dict[str, Any]] = []
        rev_found = rev_valid = 0
        warnings: List[str] = []

        # CertificateValues
        for elem in root.findall(".//xades:CertificateValues//ds:X509Certificate", _NS):
            cert_found += 1
            ok = _is_valid_der(elem.text)
            if ok:
                cert_valid += 1
                detail = {"index": cert_found, "valid_der": True}
                detail.update(_parse_cert_fields(elem.text or ""))
                cert_details.append(detail)
            else:
                warnings.append(f"Certificate #{cert_found}: invalid Base64/DER structure")
                cert_details.append({"index": cert_found, "valid_der": False})

        # RevocationValues — CRL
        for elem in root.findall(".//xades:RevocationValues//xades:CRLValue", _NS):
            rev_found += 1
            if _is_valid_der(elem.text):
                rev_valid += 1
            else:
                warnings.append(f"CRLValue #{rev_found}: invalid Base64/DER structure")

        # RevocationValues — OCSP
        for elem in root.findall(".//xades:RevocationValues//xades:OCSPValue", _NS):
            rev_found += 1
            if _is_valid_der(elem.text):
                rev_valid += 1
            else:
                warnings.append(f"OCSPValue #{rev_found}: invalid Base64/DER structure")

        cert_score = (cert_valid / cert_found) * 0.5 if cert_found else 0.0
        rev_score = (rev_valid / rev_found) * 0.5 if rev_found else 0.0
        completeness = round(cert_score + rev_score, 2)

        return {
            "cert_values_found": cert_found,
            "cert_values_valid": cert_valid,
            "cert_details": cert_details,
            "revocation_values_found": rev_found,
            "revocation_values_valid": rev_valid,
            "completeness_score": completeness,
            "is_archival_ready": completeness >= 0.8,
            "warnings": warnings,
        }


def has_archival_evidence(root: ET.Element) -> bool:
    return (
        root.find(".//xades:CertificateValues", _NS) is not None
        or root.find(".//xades:RevocationValues", _NS) is not None
    )
