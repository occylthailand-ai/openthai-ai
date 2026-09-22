"""XAdES-EPES (Explicit Policy) verifier — ETDA e-Tax standard."""
import logging
from typing import Any, Dict, Optional

from lxml import etree

from .exceptions import XAdESPolicyError, XAdESVerificationError

logger = logging.getLogger("xades_engine.xades_epes")

NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
NS_DS = "http://www.w3.org/2000/09/xmldsig#"
_NS = {"ds": NS_DS, "xades": NS_XADES}

ETDA_POLICY_URI = "http://www.etda.or.th/specification/etax/v1.0/policy.pdf"


class XAdESEPESVerifier:
    """Verify <xades:SignaturePolicyIdentifier> against ETDA standard."""

    def __init__(self, expected_policy_id: Optional[str] = None) -> None:
        self.expected_policy_id = expected_policy_id or ETDA_POLICY_URI

    def verify_policy_identifier(self, root: etree._Element) -> Dict[str, Any]:
        policy_node = root.find(
            ".//xades:SignedSignatureProperties/xades:SignaturePolicyIdentifier",
            namespaces=_NS,
        )
        if policy_node is None:
            return {
                "profile": "XAdES-BES",
                "policy_present": False,
                "is_valid": True,
                "message": "No SignaturePolicyIdentifier — XAdES-BES mode",
            }

        # Implied policy
        if policy_node.find("xades:SignaturePolicyImplied", namespaces=_NS) is not None:
            return {
                "profile": "XAdES-EPES",
                "policy_type": "implied",
                "policy_present": True,
                "is_valid": True,
                "policy_identifier": "IMPLIED",
            }

        # Explicit policy
        id_elem = policy_node.find(
            "xades:SignaturePolicyId/xades:SigPolicyId/xades:Identifier",
            namespaces=_NS,
        )
        digest_val_elem = policy_node.find(
            "xades:SignaturePolicyId/xades:SigPolicyHash/ds:DigestValue",
            namespaces=_NS,
        )
        digest_method_elem = policy_node.find(
            "xades:SignaturePolicyId/xades:SigPolicyHash/ds:DigestMethod",
            namespaces=_NS,
        )

        if id_elem is None or not id_elem.text:
            raise XAdESVerificationError(
                "Malformed XAdES-EPES: <xades:Identifier> is missing or empty"
            )

        policy_id = id_elem.text.strip()
        digest_b64 = digest_val_elem.text.strip() if (digest_val_elem is not None and digest_val_elem.text) else None
        digest_algo = digest_method_elem.get("Algorithm") if digest_method_elem is not None else None

        if self.expected_policy_id and policy_id != self.expected_policy_id:
            logger.warning("Policy ID mismatch: expected=%s got=%s", self.expected_policy_id, policy_id)
            raise XAdESPolicyError(
                f"Policy Identifier mismatch: expected [{self.expected_policy_id}] got [{policy_id}]"
            )

        return {
            "profile": "XAdES-EPES",
            "policy_type": "explicit",
            "policy_present": True,
            "policy_identifier": policy_id,
            "digest_method_uri": digest_algo,
            "digest_value_base64": digest_b64,
            "is_valid": True,
        }
