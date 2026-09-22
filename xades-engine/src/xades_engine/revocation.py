"""Live OCSP / CRL revocation checker with in-memory TTL cache.

Phase 3: Full network validation against Thai Root CAs
(ETDA, INET, ThaiDigitalID).

Improvements over v1:
  - OCSP GET support (RFC 5019) as fallback after POST failure
  - this_update instead of deprecated produced_at (cryptography 42+)
  - Basic retry with fixed delay (2 retries, 1 s apart)
  - Separate TTL for CRL responses (24 h default)
  - Known Thai CA OCSP endpoints as last-resort fallback
  - Top-level import of load_der_x509_crl
  - Structured result keys normalised (all results have method/status/checked_at)
"""
from __future__ import annotations

import base64
import datetime
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("xades_engine.revocation")

try:
    import requests
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.x509 import load_der_x509_crl, ocsp
    HAS_REVOCATION = True
except ImportError:
    HAS_REVOCATION = False
    logger.warning("requests/cryptography not installed — live revocation disabled")

# ---------------------------------------------------------------------------
# Known Thai PKI OCSP responders (ประมาณการ — ยังไม่ได้ยืนยันจาก CPS จริง)
# อัปเดตจากเอกสาร CPS ของแต่ละ CA ก่อน deploy production
# ---------------------------------------------------------------------------
_ETDA_KNOWN_OCSP: List[str] = [
    # Placeholder — replace with actual ETDA OCSP URL from CPS document
    # e.g. "http://ocsp.etda.or.th/"
]

_THAI_CA_KNOWN_CRL: List[str] = [
    # Placeholder — replace with actual CRL Distribution Point URLs from CA CPS
]


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _retry_get(url: str, timeout: int, retries: int = 2) -> Optional[requests.Response]:
    """GET with simple fixed-delay retry."""
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                return resp
            logger.debug("GET %s → HTTP %s (attempt %d)", url, resp.status_code, attempt + 1)
        except Exception as exc:
            logger.debug("GET %s failed (attempt %d): %s", url, attempt + 1, exc)
        if attempt < retries:
            time.sleep(1.0)
    return None


def _retry_post(
    url: str, data: bytes, headers: dict, timeout: int, retries: int = 2
) -> Optional[requests.Response]:
    """POST with simple fixed-delay retry."""
    for attempt in range(retries + 1):
        try:
            resp = requests.post(url, data=data, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                return resp
            logger.debug("POST %s → HTTP %s (attempt %d)", url, resp.status_code, attempt + 1)
        except Exception as exc:
            logger.debug("POST %s failed (attempt %d): %s", url, attempt + 1, exc)
        if attempt < retries:
            time.sleep(1.0)
    return None


class LiveRevocationChecker:
    """Network-backed certificate revocation checker.

    Check order: OCSP POST → OCSP GET → CRL.
    OCSP results cached for *ocsp_ttl_seconds* (default 1 h).
    CRL results cached for *crl_ttl_seconds* (default 24 h).
    """

    def __init__(
        self,
        cache_ttl_seconds: int = 3600,
        timeout_seconds: int = 8,
        crl_ttl_seconds: int = 86400,
        retries: int = 2,
    ) -> None:
        self.ocsp_ttl = cache_ttl_seconds
        self.crl_ttl = crl_ttl_seconds
        self.timeout = timeout_seconds
        self.retries = retries
        # serial_hex → (cached_at, result_dict)
        self._cache: Dict[str, Tuple[datetime.datetime, Dict[str, Any]]] = {}

    def validate(
        self,
        cert: Any,
        issuer_cert: Optional[Any] = None,
    ) -> Dict[str, Any]:
        if not HAS_REVOCATION:
            return {"status": "SKIPPED", "reason": "revocation libraries not installed"}

        sn = hex(cert.serial_number)
        now = _utcnow()

        if sn in self._cache:
            cached_at, result = self._cache[sn]
            ttl = self.crl_ttl if result.get("method") == "CRL" else self.ocsp_ttl
            if (now - cached_at).total_seconds() < ttl:
                logger.debug("Revocation cache hit serial=%s", sn)
                return {**result, "cached": True}

        result: Optional[Dict[str, Any]] = None

        if issuer_cert:
            result = self._check_ocsp(cert, issuer_cert, now)

        if not result or result.get("status") not in ("GOOD", "REVOKED"):
            result = self._check_crl(cert, now)

        if not result or result.get("status") not in ("GOOD", "REVOKED"):
            return {
                "status": "UNDETERMINED",
                "reason": "Neither OCSP nor CRL returned a definitive status",
                "checked_at": now.isoformat(),
                "cached": False,
            }

        self._cache[sn] = (now, result)
        return result

    # ------------------------------------------------------------------
    def _build_ocsp_request(self, cert: Any, issuer_cert: Any) -> bytes:
        builder = ocsp.OCSPRequestBuilder().add_certificate(
            cert, issuer_cert, hashes.SHA256()
        )
        return builder.build().public_bytes(serialization.Encoding.DER)

    def _parse_ocsp_response(
        self, content: bytes, server: str, now: datetime.datetime
    ) -> Optional[Dict[str, Any]]:
        try:
            ocsp_resp = ocsp.load_der_ocsp_response(content)
        except Exception as exc:
            logger.warning("Failed to parse OCSP response from %s: %s", server, exc)
            return None

        if ocsp_resp.response_status != ocsp.OCSPResponseStatus.SUCCESSFUL:
            return {"status": "UNKNOWN", "method": "OCSP", "server": server, "checked_at": now.isoformat(), "cached": False}

        cert_status = ocsp_resp.certificate_status
        status_str = (
            "GOOD" if cert_status == ocsp.OCSPCertStatus.GOOD
            else "REVOKED" if cert_status == ocsp.OCSPCertStatus.REVOKED
            else "UNKNOWN"
        )

        # this_update is the authoritative "freshness" timestamp
        this_update = getattr(ocsp_resp, "this_update", None) or getattr(ocsp_resp, "produced_at", None)

        return {
            "method": "OCSP",
            "server": server,
            "status": status_str,
            "this_update": this_update.isoformat() if this_update else None,
            "next_update": ocsp_resp.next_update.isoformat() if ocsp_resp.next_update else None,
            "checked_at": now.isoformat(),
            "cached": False,
        }

    def _check_ocsp(
        self, cert: Any, issuer_cert: Any, now: datetime.datetime
    ) -> Optional[Dict[str, Any]]:
        try:
            aia = cert.extensions.get_extension_for_oid(
                x509.ExtensionOID.AUTHORITY_INFORMATION_ACCESS
            ).value
            servers = [
                d.full_name[0].value
                for d in aia
                if d.access_method == x509.AuthorityInformationAccessOID.OCSP
            ]
        except Exception:
            servers = []

        # Fallback to known Thai CA endpoints if AIA is empty
        if not servers:
            servers = list(_ETDA_KNOWN_OCSP)

        if not servers:
            return None

        try:
            req_der = self._build_ocsp_request(cert, issuer_cert)
        except Exception as exc:
            logger.warning("Failed to build OCSP request: %s", exc)
            return None

        for server in servers:
            # Try POST first (RFC 2560)
            resp = _retry_post(
                server, req_der,
                {"Content-Type": "application/ocsp-request"},
                self.timeout, self.retries,
            )
            if resp is not None:
                result = self._parse_ocsp_response(resp.content, server, now)
                if result:
                    return result

            # Fallback to GET (RFC 5019) — base64url-encode the DER request
            try:
                encoded = base64.b64encode(req_der).decode().replace("+", "%2B").replace("/", "%2F").replace("=", "%3D")
                get_url = f"{server.rstrip('/')}/{encoded}"
                resp = _retry_get(get_url, self.timeout, self.retries)
                if resp is not None:
                    result = self._parse_ocsp_response(resp.content, server, now)
                    if result:
                        return result
            except Exception as exc:
                logger.debug("OCSP GET fallback failed for %s: %s", server, exc)

        return None

    def _check_crl(self, cert: Any, now: datetime.datetime) -> Optional[Dict[str, Any]]:
        try:
            cdp = cert.extensions.get_extension_for_oid(
                x509.ExtensionOID.CRL_DISTRIBUTION_POINTS
            ).value
            urls = [
                p.full_name[0].value
                for p in cdp
                if p.full_name and hasattr(p.full_name[0], "value")
            ]
        except Exception:
            urls = []

        if not urls:
            urls = list(_THAI_CA_KNOWN_CRL)

        if not urls:
            return None

        for url in urls:
            resp = _retry_get(url, self.timeout, self.retries)
            if resp is None:
                continue
            try:
                crl = load_der_x509_crl(resp.content)
                revoked = crl.get_revoked_certificate_by_serial_number(cert.serial_number)
                return {
                    "method": "CRL",
                    "url": url,
                    "status": "REVOKED" if revoked else "GOOD",
                    "revocation_date": revoked.revocation_date_utc.isoformat() if revoked else None,
                    "next_update": crl.next_update_utc.isoformat() if crl.next_update else None,
                    "checked_at": now.isoformat(),
                    "cached": False,
                }
            except Exception as exc:
                logger.warning("CRL parse failed for %s: %s", url, exc)

        return None
