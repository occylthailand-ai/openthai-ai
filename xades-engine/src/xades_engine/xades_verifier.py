"""Core XAdES Verification Engine — supports BES / EPES / T / A profiles."""
import base64
import hashlib
import logging
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET  # used by xades_a (stdlib compat)

from lxml import etree

from .c14n_fast import canonicalize_node_fast
from .exceptions import XAdESVerificationError
from .revocation import LiveRevocationChecker
from .xades_a import XAdESAExtractor, has_archival_evidence
from .xades_epes import XAdESEPESVerifier
from .xades_t import verify_xades_t_timestamp

logger = logging.getLogger("xades_engine.verifier")

NS_DS = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
_NS = {"ds": NS_DS, "xades": NS_XADES}

_DIGEST_ALGO_MAP = {
    "http://www.w3.org/2001/04/xmlenc#sha256": hashlib.sha256,
    "http://www.w3.org/2001/04/xmldsig-more#sha384": hashlib.sha384,
    "http://www.w3.org/2001/04/xmlenc#sha512": hashlib.sha512,
    "http://www.w3.org/2007/05/xmldsig-more#sha3-256": hashlib.sha3_256,
    # Aliases
    "http://www.w3.org/2001/04/xmldsig#sha1": hashlib.sha1,
}

_SIG_ALGO_PSS_URIS = {
    "http://www.w3.org/2007/05/xmldsig-more#rsa-pss",
    "http://www.w3.org/2007/05/xmldsig-more#rsa-pss-sha3-256",
}

_SIG_ALGO_PKCS_URIS = {
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha384",
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512",
    "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
}


class XAdESVerifier:
    """Verifies XAdES-BES / EPES / T / A signatures on XML e-Tax documents."""

    def __init__(
        self,
        expected_policy_id: Optional[str] = None,
        tsa_hash_algorithm: str = "sha3_256",
        check_revocation: bool = False,
        revocation_cache_ttl: int = 3600,
        revocation_timeout: int = 8,
    ) -> None:
        self._epes = XAdESEPESVerifier(expected_policy_id)
        self._a_extractor = XAdESAExtractor()
        self._tsa_algo = tsa_hash_algorithm
        self._check_revocation = check_revocation
        self._revocation = LiveRevocationChecker(
            cache_ttl_seconds=revocation_cache_ttl,
            timeout_seconds=revocation_timeout,
        ) if check_revocation else None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def verify(
        self,
        xml_bytes: bytes,
        tsa_token_der: Optional[bytes] = None,
        tsa_target_reference_uri: Optional[str] = None,
        require_timestamp: bool = False,
    ) -> Dict[str, Any]:
        """Verify *xml_bytes* and return a structured result dict."""
        try:
            root = etree.fromstring(xml_bytes)
        except etree.XMLSyntaxError as exc:
            raise XAdESVerificationError(f"Malformed XML: {exc}") from exc

        sig_elem = root.find(".//ds:Signature", namespaces=_NS)
        if sig_elem is None:
            raise XAdESVerificationError("No <ds:Signature> found in document")

        errors: List[str] = []
        result: Dict[str, Any] = {
            "is_valid": False,
            "xades_profile": "XAdES-BES",
            "errors": errors,
        }

        # 1. Reference digest validation (Multi-Reference Loop)
        ref_results = self._verify_references(root, sig_elem)
        result["references"] = ref_results
        ref_errors = [r for r in ref_results if not r.get("valid")]
        if ref_errors:
            errors.extend(f"Reference [{r['uri']}]: {r.get('error')}" for r in ref_errors)

        # 2. Signature value verification
        sig_valid, sig_error = self._verify_signature_value(root, sig_elem)
        result["signature_valid"] = sig_valid
        if not sig_valid:
            errors.append(sig_error or "Signature value verification failed")

        # 3. EPES policy check
        try:
            policy_result = self._epes.verify_policy_identifier(root)
            result["policy"] = policy_result
            if policy_result.get("profile") == "XAdES-EPES":
                result["xades_profile"] = "XAdES-EPES"
        except XAdESVerificationError as exc:
            errors.append(f"Policy: {exc}")

        # 4. XAdES-T timestamp
        try:
            ts_result = verify_xades_t_timestamp(root, self._tsa_algo, require_timestamp)
            result["timestamp"] = ts_result
            if ts_result:
                result["xades_profile"] = "XAdES-T"
                if not ts_result.get("valid"):
                    errors.append("XAdES-T: Timestamp verification failed")
        except XAdESVerificationError as exc:
            errors.append(f"XAdES-T: {exc}")

        # 5. XAdES-A archival (reuse already-parsed root via stdlib ET for xades_a compat)
        try:
            std_root = ET.fromstring(xml_bytes)
            if has_archival_evidence(std_root):
                arch = self._a_extractor.extract_and_validate(std_root)
                result["archival"] = arch
                if arch.get("is_archival_ready"):
                    result["xades_profile"] = "XAdES-A"
        except Exception as exc:
            errors.append(f"XAdES-A: {exc}")

        # 6. Live revocation check (opt-in via check_revocation=True)
        if self._check_revocation:
            rev_result = self._check_signing_cert_revocation(sig_elem)
            result["revocation"] = rev_result
            if rev_result.get("status") == "REVOKED":
                errors.append("Signing certificate is REVOKED")
            elif rev_result.get("status") == "UNDETERMINED":
                logger.warning("Revocation status undetermined for signing certificate")

        result["is_valid"] = len(errors) == 0
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _check_signing_cert_revocation(self, sig_elem: etree._Element) -> Dict[str, Any]:
        """Extract signing cert (+ issuer if available) and check revocation."""
        if self._revocation is None:
            return {"status": "SKIPPED", "reason": "check_revocation=False"}
        try:
            from cryptography import x509 as crypto_x509

            cert_elems = sig_elem.findall(".//ds:X509Data/ds:X509Certificate", namespaces=_NS)
            if not cert_elems:
                return {"status": "SKIPPED", "reason": "No X509Certificate in signature"}

            certs = []
            for elem in cert_elems:
                der = base64.b64decode((elem.text or "").strip())
                certs.append(crypto_x509.load_der_x509_certificate(der))

            signing_cert = certs[0]
            issuer_cert = certs[1] if len(certs) > 1 else None

            return self._revocation.validate(signing_cert, issuer_cert)
        except Exception as exc:
            logger.warning("Revocation check failed: %s", exc)
            return {"status": "UNDETERMINED", "reason": str(exc)}

    def _verify_references(
        self, root: etree._Element, sig_elem: etree._Element
    ) -> List[Dict[str, Any]]:
        results = []
        for ref in sig_elem.findall(".//ds:SignedInfo/ds:Reference", namespaces=_NS):
            uri = ref.get("URI", "")
            results.append(self._verify_single_reference(root, ref, uri))
        return results

    def _verify_single_reference(
        self, root: etree._Element, ref_elem: etree._Element, uri: str
    ) -> Dict[str, Any]:
        digest_method_elem = ref_elem.find("ds:DigestMethod", namespaces=_NS)
        digest_value_elem = ref_elem.find("ds:DigestValue", namespaces=_NS)

        if digest_method_elem is None or digest_value_elem is None:
            return {"uri": uri, "valid": False, "error": "Missing DigestMethod or DigestValue"}

        algo_uri = digest_method_elem.get("Algorithm", "")
        hash_fn = _DIGEST_ALGO_MAP.get(algo_uri)
        if hash_fn is None:
            return {"uri": uri, "valid": False, "error": f"Unknown digest algorithm: {algo_uri}"}

        expected = base64.b64decode(digest_value_elem.text.strip() if digest_value_elem.text else "")

        try:
            target_bytes = self._resolve_reference(root, uri, ref_elem)
        except XAdESVerificationError as exc:
            return {"uri": uri, "valid": False, "error": str(exc)}

        actual = hash_fn(target_bytes).digest()
        valid = actual == expected
        return {
            "uri": uri,
            "algorithm": algo_uri,
            "valid": valid,
            "error": None if valid else "Digest mismatch — document may have been tampered",
        }

    def _resolve_reference(
        self, root: etree._Element, uri: str, ref_elem: etree._Element
    ) -> bytes:
        if not uri or uri == "":
            target = root
        elif uri.startswith("#"):
            frag = uri[1:]
            target = self._find_by_id(root, frag)
            if target is None:
                raise XAdESVerificationError(f"Reference target not found: {uri}")
        else:
            raise XAdESVerificationError(f"External reference URI not supported: {uri}")

        exclusive = any(
            t.get("Algorithm", "").endswith("xml-exc-c14n#")
            for t in ref_elem.findall("ds:Transforms/ds:Transform", namespaces=_NS)
        )
        return canonicalize_node_fast(target, exclusive=exclusive)

    def _find_by_id(self, root: etree._Element, id_val: str) -> Optional[etree._Element]:
        for attr in ("Id", "ID", "id"):
            found = root.find(f'.//*[@{attr}="{id_val}"]')
            if found is not None:
                return found
        return None

    def _verify_signature_value(
        self, root: etree._Element, sig_elem: etree._Element
    ) -> tuple[bool, Optional[str]]:
        try:
            from cryptography.hazmat.primitives import hashes as crypto_hashes
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
            from cryptography import x509 as crypto_x509

            sig_val_elem = sig_elem.find(".//ds:SignatureValue", namespaces=_NS)
            cert_elem = sig_elem.find(".//ds:X509Certificate", namespaces=_NS)
            sig_method_elem = sig_elem.find(".//ds:SignatureMethod", namespaces=_NS)
            signed_info_elem = sig_elem.find("ds:SignedInfo", namespaces=_NS)

            if any(e is None for e in [sig_val_elem, cert_elem, sig_method_elem, signed_info_elem]):
                return False, "Missing SignatureValue, X509Certificate, SignatureMethod, or SignedInfo"

            cert_der = base64.b64decode(cert_elem.text.strip())
            cert = crypto_x509.load_der_x509_certificate(cert_der)
            pub_key = cert.public_key()
            if not isinstance(pub_key, RSAPublicKey):
                return False, "Only RSA keys are currently supported"

            sig_bytes = base64.b64decode(sig_val_elem.text.strip())
            signed_info_bytes = canonicalize_node_fast(signed_info_elem, exclusive=True)

            algo_uri = sig_method_elem.get("Algorithm", "")
            hash_obj = self._hash_for_sig_algo(algo_uri)

            if algo_uri in _SIG_ALGO_PSS_URIS:
                self._verify_rsa_pss(pub_key, sig_bytes, signed_info_bytes, hash_obj)
            else:
                pub_key.verify(sig_bytes, signed_info_bytes, padding.PKCS1v15(), hash_obj)

            return True, None
        except Exception as exc:
            return False, f"Signature value verification failed: {exc}"

    def _hash_for_sig_algo(self, algo_uri: str):
        from cryptography.hazmat.primitives import hashes as h
        if "sha3-256" in algo_uri or "sha3_256" in algo_uri:
            return h.SHA3_256()
        if "sha512" in algo_uri:
            return h.SHA512()
        if "sha384" in algo_uri:
            return h.SHA384()
        return h.SHA256()

    def _verify_rsa_pss(self, pub_key, sig_bytes, data, hash_obj):
        from cryptography.hazmat.primitives.asymmetric import padding
        for salt_len in (padding.PSS.MAX_LENGTH, 32, 0):
            try:
                pub_key.verify(
                    sig_bytes, data,
                    padding.PSS(mgf=padding.MGF1(hash_obj), salt_length=salt_len),
                    hash_obj,
                )
                return
            except Exception:
                continue
        raise XAdESVerificationError("RSA-PSS verification failed for all salt lengths")
