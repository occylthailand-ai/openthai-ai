"""RFC 3161 TimeStampToken (TST) verifier.

Parses the ASN.1 DER-encoded TSA response and checks that the embedded
messageImprint matches the supplied digest.
"""
import hashlib
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("xades_engine.tsa")

try:
    from pyasn1.codec.der import decoder as der_decoder
    from pyasn1_modules import rfc3161, rfc2459
    HAS_PYASN1 = True
except ImportError:
    HAS_PYASN1 = False
    logger.warning("pyasn1 not available — TSA verification will use fallback heuristic only")

_ALGO_MAP = {
    "sha3_256": hashlib.sha3_256,
    "sha256": hashlib.sha256,
    "sha384": hashlib.sha384,
    "sha512": hashlib.sha512,
}

_ALGO_OID_MAP = {
    "2.16.840.1.101.3.4.2.8": "sha3_256",
    "2.16.840.1.101.3.4.2.1": "sha256",
    "2.16.840.1.101.3.4.2.2": "sha384",
    "2.16.840.1.101.3.4.2.3": "sha512",
}


def verify_tsa_response(
    tsa_der_bytes: bytes,
    expected_digest: bytes,
    expected_algorithm: str = "sha3_256",
) -> Dict[str, Any]:
    """Verify a RFC 3161 TSA DER token against an expected digest.

    Returns a dict with keys: status, algorithm, gen_time, matched.
    Raises XAdESVerificationError on malformed token or digest mismatch.
    """
    from .exceptions import XAdESVerificationError

    if not tsa_der_bytes:
        raise XAdESVerificationError("TSA DER bytes are empty")

    if HAS_PYASN1:
        return _verify_with_pyasn1(tsa_der_bytes, expected_digest, expected_algorithm)
    return _verify_heuristic(tsa_der_bytes, expected_digest, expected_algorithm)


def _verify_with_pyasn1(
    tsa_der_bytes: bytes, expected_digest: bytes, expected_algorithm: str
) -> Dict[str, Any]:
    from .exceptions import XAdESVerificationError

    try:
        tst_response, _ = der_decoder.decode(tsa_der_bytes, asn1Spec=rfc3161.TimeStampResp())
        status = int(tst_response["status"]["status"])
        if status != 0:
            raise XAdESVerificationError(f"TSA response status not GRANTED (got {status})")

        tst_info_der = bytes(tst_response["timeStampToken"]["content"]["encapContentInfo"]["eContent"])
        tst_info, _ = der_decoder.decode(tst_info_der, asn1Spec=rfc3161.TSTInfo())

        msg_imprint = tst_info["messageImprint"]
        hash_oid = str(msg_imprint["hashAlgorithm"]["algorithm"])
        algo_name = _ALGO_OID_MAP.get(hash_oid, "unknown")
        embedded_digest = bytes(msg_imprint["hashedMessage"])
        gen_time = str(tst_info["genTime"])

        if embedded_digest != expected_digest:
            raise XAdESVerificationError(
                f"TSA messageImprint mismatch: "
                f"expected {expected_digest.hex()[:16]}… "
                f"got {embedded_digest.hex()[:16]}…"
            )

        return {
            "status": "VALID",
            "algorithm": algo_name,
            "gen_time": gen_time,
            "matched": True,
        }
    except XAdESVerificationError:
        raise
    except Exception as exc:
        raise XAdESVerificationError(f"TSA DER parse error: {exc}") from exc


def _verify_heuristic(
    tsa_der_bytes: bytes, expected_digest: bytes, expected_algorithm: str
) -> Dict[str, Any]:
    """Fallback heuristic: scan DER bytes for the digest value."""
    from .exceptions import XAdESVerificationError

    if expected_digest in tsa_der_bytes:
        return {"status": "VALID", "algorithm": expected_algorithm, "gen_time": None, "matched": True}
    raise XAdESVerificationError("TSA messageImprint not found in DER token (heuristic check)")
