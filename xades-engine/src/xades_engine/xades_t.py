"""XAdES-T (Timestamped) profile verifier.

Extracts <xades:SignatureTimeStamp> from UnsignedProperties and verifies that
the embedded RFC 3161 TST covers <ds:SignatureValue>.
"""
import base64
import hashlib
import logging
from typing import Any, Dict, Optional

from lxml import etree

from .exceptions import XAdESVerificationError
from .tsa_verifier import verify_tsa_response

logger = logging.getLogger("xades_engine.xades_t")

NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
NS_DS = "http://www.w3.org/2000/09/xmldsig#"

_NS = {"ds": NS_DS, "xades": NS_XADES}

_HASH_FN = {
    "sha3_256": hashlib.sha3_256,
    "sha256": hashlib.sha256,
    "sha384": hashlib.sha384,
    "sha512": hashlib.sha512,
}


def verify_xades_t_timestamp(
    root: etree._Element,
    expected_algorithm: str = "sha3_256",
    require_timestamp: bool = False,
) -> Optional[Dict[str, Any]]:
    """Verify the embedded XAdES-T timestamp token.

    Returns None when no SignatureTimeStamp is present and *require_timestamp*
    is False (indicating the document is XAdES-BES, not XAdES-T).

    Raises XAdESVerificationError on malformed structure or digest mismatch.
    """
    sig_val_elem = root.find(".//ds:SignatureValue", namespaces=_NS)
    if sig_val_elem is None or not sig_val_elem.text:
        if require_timestamp:
            raise XAdESVerificationError("XAdES-T required but <ds:SignatureValue> is missing")
        return None

    sig_val_bytes = base64.b64decode(sig_val_elem.text.strip())

    hash_fn = _HASH_FN.get(expected_algorithm)
    if hash_fn is None:
        raise XAdESVerificationError(f"Unsupported hash algorithm: {expected_algorithm}")
    sig_val_digest = hash_fn(sig_val_bytes).digest()

    ts_elem = root.find(
        ".//xades:UnsignedSignatureProperties/xades:SignatureTimeStamp",
        namespaces=_NS,
    )
    if ts_elem is None:
        if require_timestamp:
            raise XAdESVerificationError(
                "XAdES-T required but <xades:SignatureTimeStamp> is absent"
            )
        logger.debug("No <xades:SignatureTimeStamp> — document is XAdES-BES")
        return None

    encap_elem = ts_elem.find(".//xades:EncapsulatedTimeStamp", namespaces=_NS)
    if encap_elem is None or not encap_elem.text:
        raise XAdESVerificationError(
            "Malformed XAdES-T: <xades:EncapsulatedTimeStamp> is missing or empty"
        )

    tsa_der = base64.b64decode(encap_elem.text.strip())
    tsa_result = verify_tsa_response(tsa_der, sig_val_digest, expected_algorithm)

    return {
        "xades_profile": "XAdES-T",
        "timestamp_target": "SignatureValue",
        "target_digest_hex": sig_val_digest.hex(),
        "tsa_info": tsa_result,
        "present": True,
        "valid": tsa_result.get("status") == "VALID",
    }
