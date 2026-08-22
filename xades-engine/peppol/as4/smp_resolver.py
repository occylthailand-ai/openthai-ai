"""
Peppol SML/SMP Resolver — DNS-based Access Point discovery
หมวด 6 (Drivers/Peppol) + หมวด 12 (Network/mTLS)

4-Corner Model:
  Corner 1 (Buyer)  → Corner 2 (Sender AP)
  → [SML DNS → SMP lookup → AP URL]
  → Corner 3 (Receiver AP) → Corner 4 (Seller/RD)

ลำดับการค้นหา:
  1. Hash Participant ID → SML DNS CNAME
  2. DNS CNAME → SMP hostname
  3. SMP REST → AS4 endpoint URL + รับรอง X.509 ของ AP ปลายทาง

สภาพแวดล้อมที่รองรับ:
  test: edelivery.tech.ec.europa.eu (Peppol test)
  pilot: pilot.peppol.eu (ยังไม่มี TH SMP — ประมาณการ)
  prod: peppol.eu (ต้องขึ้นทะเบียน Peppol Authority จริงก่อน)
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Dict, Optional
from urllib.parse import quote as url_quote

logger = logging.getLogger("peppol.smp_resolver")

# ────────────────────────────────────────────────────────────────────────────
# Optional imports (ลด hard dependency — ทำงานได้แม้ dnspython ไม่มี)
# ────────────────────────────────────────────────────────────────────────────
try:
    import dns.resolver as _dns_resolver
    HAS_DNSPYTHON = True
except ImportError:
    _dns_resolver = None
    HAS_DNSPYTHON = False
    logger.info("dnspython not installed — DNS SML lookup disabled, falling back to direct SMP")

try:
    import httpx as _httpx
    _HTTP = "httpx"
except ImportError:
    _httpx = None
    try:
        import requests as _requests
        _HTTP = "requests"
    except ImportError:
        _requests = None
        _HTTP = None
        logger.warning("httpx and requests both missing — SMP HTTP queries disabled")

try:
    from lxml import etree as _etree
    HAS_LXML = True
except ImportError:
    HAS_LXML = False
    logger.warning("lxml not installed — SMP XML parsing disabled")


# ────────────────────────────────────────────────────────────────────────────
# SML zones (per environment)
# ────────────────────────────────────────────────────────────────────────────
SML_ZONES: Dict[str, str] = {
    "test":  "edelivery.tech.ec.europa.eu",
    "pilot": "pilot.peppol.eu",
    "prod":  "peppol.eu",
}

# Scheme ที่ใช้กับเลขประจำตัวผู้เสียภาษีไทย (ICD 0147 = Thailand VAT)
THAI_PEPPOL_SCHEME = "0147"
DEFAULT_SCHEME = "iso6523-actorid-upis"

# XML namespaces ใน SMP response
SMP_NS = {
    "smp":  "http://busdox.org/serviceMetadata/publishing/1.0/",
    "wsa":  "http://www.w3.org/2005/08/addressing",
    "ds":   "http://www.w3.org/2000/09/xmldsig#",
}


# ────────────────────────────────────────────────────────────────────────────
# Utility: HTTP GET (ใช้ httpx ก่อน, fallback requests)
# ────────────────────────────────────────────────────────────────────────────
def _http_get(url: str, timeout: float = 8.0) -> Optional[Any]:
    """GET URL → response object (with .status_code and .content) หรือ None"""
    if _HTTP == "httpx":
        try:
            return _httpx.get(url, timeout=timeout, follow_redirects=True)
        except Exception as exc:
            logger.debug("httpx GET %s failed: %s", url, exc)
    elif _HTTP == "requests":
        try:
            return _requests.get(url, timeout=timeout)
        except Exception as exc:
            logger.debug("requests GET %s failed: %s", url, exc)
    return None


# ────────────────────────────────────────────────────────────────────────────
# Core: PeppolSMPResolver
# ────────────────────────────────────────────────────────────────────────────
class PeppolSMPResolver:
    """
    ค้นหา AS4 Access Point ของผู้รับ ตาม Peppol 4-Corner Discovery

    ใช้งาน:
        resolver = PeppolSMPResolver(environment="test")
        info = resolver.resolve("0147:0107563000999",
                               "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##...")
        # info["as4_endpoint"] = URL ของ Access Point ผู้รับ
        # info["recipient_cert_pem"] = X.509 Certificate (base64)
    """

    def __init__(
        self,
        environment: str = "test",
        timeout_seconds: float = 8.0,
    ) -> None:
        if environment not in SML_ZONES:
            raise ValueError(f"environment ต้องเป็น: {list(SML_ZONES.keys())}")
        self.environment = environment
        self.sml_zone = SML_ZONES[environment]
        self.timeout = timeout_seconds

    # ── Public API ─────────────────────────────────────────────────────────

    def resolve(self, participant_id: str, doc_type_id: str) -> Dict[str, Any]:
        """
        ค้นหา AS4 endpoint ของ participant_id สำหรับ doc_type_id

        participant_id รูปแบบ "SCHEME:VALUE" เช่น "0147:0107563000999"
        doc_type_id   รูปแบบ UBL Profile ID ยาว ๆ ของ Peppol BIS Billing 3.0

        คืน:
          {
            "participant_id": str,
            "as4_endpoint": str | None,
            "recipient_cert_pem": str | None,  # base64 X.509 DER
            "smp_host": str | None,
            "lookup_method": "DNS" | "DIRECT" | "FAILED",
            "error": str | None,
          }
        """
        base_result: Dict[str, Any] = {
            "participant_id": participant_id,
            "as4_endpoint": None,
            "recipient_cert_pem": None,
            "smp_host": None,
            "lookup_method": "FAILED",
            "error": None,
        }

        # Step 1: หา SMP host
        smp_host, method = self._find_smp_host(participant_id)
        if not smp_host:
            base_result["error"] = "ไม่พบ SMP host (DNS lookup ล้มเหลวและไม่มี fallback)"
            return base_result

        base_result["smp_host"] = smp_host
        base_result["lookup_method"] = method

        # Step 2: Query SMP
        endpoint_info = self._query_smp(smp_host, participant_id, doc_type_id)
        if not endpoint_info:
            base_result["error"] = f"SMP ที่ {smp_host} ไม่ตอบสนองหรือไม่มี service"
            return base_result

        base_result.update(endpoint_info)
        return base_result

    # ── DNS SML lookup ─────────────────────────────────────────────────────

    def _generate_sml_hostname(self, participant_id: str) -> str:
        """
        แปลง participant_id → CNAME ที่ต้องค้นใน DNS
        ตาม Peppol BDX-SMP specification (MD5 hash of lowercased canonical form)
        """
        canonical = f"{DEFAULT_SCHEME}::{participant_id.lower()}"
        md5 = hashlib.md5(canonical.encode("utf-8")).hexdigest()
        return f"B-{md5}.{DEFAULT_SCHEME}.{self.sml_zone}"

    def _find_smp_host(self, participant_id: str) -> tuple[Optional[str], str]:
        """
        คืน (smp_host, method) โดย method = "DNS" | "DIRECT"
        "DIRECT" ใช้ SMP base URL โดยตรงเมื่อ DNS ไม่พร้อม
        """
        if HAS_DNSPYTHON:
            try:
                cname = self._generate_sml_hostname(participant_id)
                answers = _dns_resolver.resolve(cname, "CNAME")
                smp_host = str(answers[0].target).rstrip(".")
                logger.debug("SML DNS CNAME %s → %s", cname, smp_host)
                return smp_host, "DNS"
            except Exception as exc:
                logger.info("SML DNS lookup failed: %s — falling back to direct SMP", exc)

        # Fallback: ใช้ SMP base URL โดยตรง (สำหรับ dev/staging)
        fallback_base = {
            "test":  "test-smp.peppol.eu",
            "pilot": "pilot-smp.peppol.eu",
            "prod":  "smp.peppol.eu",
        }.get(self.environment)

        return fallback_base, "DIRECT"

    # ── SMP REST query ─────────────────────────────────────────────────────

    def _query_smp(
        self,
        smp_host: str,
        participant_id: str,
        doc_type_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        ดึง ServiceMetadata จาก SMP
        URL format: https://{smp_host}/{participant_id}/services/{encoded_doc_type}
        """
        if _HTTP is None:
            logger.warning("ไม่มี HTTP library — SMP query ทำไม่ได้")
            return None

        if not HAS_LXML:
            logger.warning("lxml ไม่ได้ติดตั้ง — parse SMP response ไม่ได้")
            return None

        encoded_doc = url_quote(doc_type_id, safe="")
        url = f"https://{smp_host}/{participant_id}/services/{encoded_doc}"
        logger.debug("SMP query: %s", url)

        resp = _http_get(url, self.timeout)
        if resp is None or resp.status_code != 200:
            logger.warning(
                "SMP returned HTTP %s for %s",
                getattr(resp, "status_code", "N/A"), url,
            )
            return None

        return self._parse_smp_response(resp.content, smp_host)

    def _parse_smp_response(self, content: bytes, smp_host: str) -> Optional[Dict[str, Any]]:
        """Parse SMP XML → endpoint URL + AP certificate"""
        try:
            root = _etree.fromstring(content)
        except Exception as exc:
            logger.warning("SMP XML parse error: %s", exc)
            return None

        endpoint_url = root.xpath(
            "string(//smp:Endpoint/wsa:Address)", namespaces=SMP_NS
        ).strip()
        cert_b64 = root.xpath(
            "string(//smp:Endpoint/smp:Certificate)", namespaces=SMP_NS
        ).strip()
        transport_profile = root.xpath(
            "string(//smp:Endpoint/@transportProfile)", namespaces=SMP_NS
        ).strip()

        if not endpoint_url:
            logger.warning("SMP response จาก %s ไม่มี EndpointURI", smp_host)
            return None

        return {
            "as4_endpoint": endpoint_url,
            "recipient_cert_pem": cert_b64 or None,
            "transport_profile": transport_profile or None,
        }
