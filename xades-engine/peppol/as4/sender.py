"""
หมวด 6 — Drivers/Adapters: Peppol AS4 Message Sender
ส่ง e-Invoice ผ่าน Peppol Network ตาม AS4 (OASIS ebMS 3.0 profile)
Reference: Peppol AS4 Profile v2.0, BIS Billing 3.0
"""

from __future__ import annotations
import uuid
import hashlib
import base64
from datetime import datetime, timezone
from typing import Optional
import httpx
from lxml import etree

AS4_NS = {
    'S12': 'http://www.w3.org/2003/05/soap-envelope',
    'eb':  'http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/',
    'wsse':'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
    'wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
}

PEPPOL_TEST_SMP = "https://test-smp.peppol.eu"
PEPPOL_PROD_SMP = "https://smp.peppol.eu"


class AS4Sender:
    """ส่ง AS4 message ผ่าน Peppol Access Point"""

    def __init__(
        self,
        sender_id: str,           # Peppol Participant ID ของผู้ส่ง เช่น "0195:5101234567890"
        ap_endpoint: str,          # URL ของ Peppol Access Point ปลายทาง
        signing_cert_path: str,    # path ไปยัง client cert (mTLS)
        signing_key_path: str,
        environment: str = "test", # "test" | "prod"
    ):
        self.sender_id = sender_id
        self.ap_endpoint = ap_endpoint
        self.environment = environment
        self._client = httpx.Client(
            cert=(signing_cert_path, signing_key_path),
            timeout=60.0,
            headers={"Content-Type": "application/soap+xml; charset=UTF-8"},
        )

    def send_invoice(
        self,
        receiver_id: str,
        ubl_xml: bytes,
        document_id: str,
        conversation_id: Optional[str] = None,
    ) -> dict:
        """
        ส่ง UBL Invoice ผ่าน Peppol AS4
        Returns: {"message_id": str, "status": "sent", "timestamp": str}
        """
        message_id = str(uuid.uuid4())
        conv_id = conversation_id or str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        envelope = self._build_soap_envelope(
            message_id=message_id,
            conv_id=conv_id,
            sender_id=self.sender_id,
            receiver_id=receiver_id,
            document_id=document_id,
            payload=ubl_xml,
            timestamp=timestamp,
        )

        response = self._client.post(
            self.ap_endpoint,
            content=etree.tostring(envelope, xml_declaration=True, encoding="UTF-8"),
        )
        response.raise_for_status()

        return {
            "message_id": message_id,
            "conversation_id": conv_id,
            "status": "sent",
            "timestamp": timestamp,
            "http_status": response.status_code,
        }

    def _build_soap_envelope(
        self,
        message_id: str,
        conv_id: str,
        sender_id: str,
        receiver_id: str,
        document_id: str,
        payload: bytes,
        timestamp: str,
    ) -> etree._Element:
        """สร้าง SOAP Envelope ตาม Peppol AS4 Profile"""
        S = AS4_NS['S12']
        eb = AS4_NS['eb']

        envelope = etree.Element(f"{{{S}}}Envelope", nsmap=AS4_NS)

        # Header
        header = etree.SubElement(envelope, f"{{{S}}}Header")

        # Messaging header
        messaging = etree.SubElement(header, f"{{{eb}}}Messaging")
        user_msg = etree.SubElement(messaging, f"{{{eb}}}UserMessage")

        # MessageInfo
        msg_info = etree.SubElement(user_msg, f"{{{eb}}}MessageInfo")
        etree.SubElement(msg_info, f"{{{eb}}}Timestamp").text = timestamp
        etree.SubElement(msg_info, f"{{{eb}}}MessageId").text = message_id

        # PartyInfo
        party_info = etree.SubElement(user_msg, f"{{{eb}}}PartyInfo")
        from_el = etree.SubElement(party_info, f"{{{eb}}}From")
        etree.SubElement(from_el, f"{{{eb}}}PartyId", type="urn:fdc:peppol.eu:2017:identifiers:ap").text = sender_id
        etree.SubElement(from_el, f"{{{eb}}}Role").text = "http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/initiator"
        to_el = etree.SubElement(party_info, f"{{{eb}}}To")
        etree.SubElement(to_el, f"{{{eb}}}PartyId", type="urn:fdc:peppol.eu:2017:identifiers:ap").text = receiver_id
        etree.SubElement(to_el, f"{{{eb}}}Role").text = "http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/responder"

        # CollaborationInfo
        collab = etree.SubElement(user_msg, f"{{{eb}}}CollaborationInfo")
        etree.SubElement(collab, f"{{{eb}}}AgreementRef").text = "urn:fdc:peppol.eu:2017:agreements:tia:ap_provider"
        svc_el = etree.SubElement(collab, f"{{{eb}}}Service", type="urn:fdc:peppol.eu:2017:identifiers:svc")
        svc_el.text = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
        etree.SubElement(collab, f"{{{eb}}}Action").text = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1"
        etree.SubElement(collab, f"{{{eb}}}ConversationId").text = conv_id

        # MessageProperties
        props = etree.SubElement(user_msg, f"{{{eb}}}MessageProperties")
        etree.SubElement(props, f"{{{eb}}}Property", name="MessageId").text = document_id

        # PayloadInfo
        payload_info = etree.SubElement(user_msg, f"{{{eb}}}PayloadInfo")
        part = etree.SubElement(payload_info, f"{{{eb}}}PartInfo", href="cid:invoice@openthai.ai")
        part_props = etree.SubElement(part, f"{{{eb}}}PartProperties")
        etree.SubElement(part_props, f"{{{eb}}}Property", name="MimeType").text = "application/xml"
        etree.SubElement(part_props, f"{{{eb}}}Property", name="CompressionType").text = "application/gzip"

        # Body
        body = etree.SubElement(envelope, f"{{{S}}}Body")
        body_id = etree.SubElement(body, "payload")
        body_id.text = base64.b64encode(payload).decode()

        return envelope

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def lookup_access_point(receiver_peppol_id: str, doc_type_id: str, environment: str = "test") -> str:
    """
    ค้นหา Access Point URL ของผู้รับผ่าน DNS SML → SMP (Peppol 4-Corner)
    Returns: endpoint URL

    ใช้ PeppolSMPResolver (DNS-based) ก่อน — fallback ไปยัง direct SMP URL
    หาก resolver ล้มเหลวหรือ dependencies ไม่ครบ
    """
    from .smp_resolver import PeppolSMPResolver

    resolver = PeppolSMPResolver(environment=environment)
    result = resolver.resolve(receiver_peppol_id, doc_type_id)

    if result.get("as4_endpoint"):
        return result["as4_endpoint"]

    # Legacy fallback: direct SMP URL (เดิม)
    smp_base = PEPPOL_TEST_SMP if environment == "test" else PEPPOL_PROD_SMP
    smp_url = f"{smp_base}/{receiver_peppol_id}/services/{doc_type_id}"
    response = httpx.get(smp_url, timeout=10.0)
    response.raise_for_status()
    root = etree.fromstring(response.content)
    ns = {'smp': 'http://busdox.org/serviceMetadata/publishing/1.0/'}
    endpoints = root.findall('.//smp:EndpointURI', ns)
    if not endpoints:
        raise ValueError(f"ไม่พบ Access Point สำหรับ {receiver_peppol_id}")
    return endpoints[0].text
