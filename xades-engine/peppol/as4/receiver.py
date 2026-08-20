"""
หมวด 6 — Drivers/Adapters: Peppol AS4 Message Receiver
รับ AS4 message เข้ามาที่ Access Point, validate, ส่งต่อให้ e-Tax pipeline
"""

from __future__ import annotations
import base64
import gzip
from typing import Callable
from lxml import etree
from fastapi import Request, HTTPException

AS4_NS = {
    'S12': 'http://www.w3.org/2003/05/soap-envelope',
    'eb':  'http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/',
}


class AS4Receiver:
    """รับและ parse AS4 SOAP message"""

    def __init__(self, on_invoice: Callable[[dict], None]):
        """
        on_invoice: callback ที่จะถูกเรียกเมื่อได้รับ invoice
                    รับ dict: {message_id, sender_id, payload_xml, timestamp}
        """
        self._on_invoice = on_invoice

    async def handle_request(self, request: Request) -> dict:
        body = await request.body()
        if not body:
            raise HTTPException(400, "ไม่มี request body")

        content_type = request.headers.get("content-type", "")
        if "application/soap+xml" not in content_type:
            raise HTTPException(415, f"Content-Type ไม่รองรับ: {content_type}")

        try:
            envelope = etree.fromstring(body)
        except etree.XMLSyntaxError as e:
            raise HTTPException(400, f"SOAP XML ไม่ถูกต้อง: {e}")

        message = self._extract_message(envelope)
        await self._process_message(message)

        return self._build_receipt(message["message_id"])

    def _extract_message(self, envelope: etree._Element) -> dict:
        S = AS4_NS['S12']
        eb = AS4_NS['eb']

        # ดึง MessageId
        msg_id_el = envelope.find(f".//{{{eb}}}MessageId")
        message_id = msg_id_el.text.strip() if msg_id_el is not None else "unknown"

        # ดึง sender PartyId
        from_el = envelope.find(f".//{{{eb}}}From/{{{eb}}}PartyId")
        sender_id = from_el.text.strip() if from_el is not None else ""

        # ดึง timestamp
        ts_el = envelope.find(f".//{{{eb}}}Timestamp")
        timestamp = ts_el.text.strip() if ts_el is not None else ""

        # ดึง payload
        body_el = envelope.find(f"{{{S}}}Body")
        payload_b64 = body_el.find("payload").text if body_el is not None else None
        if not payload_b64:
            raise HTTPException(400, "ไม่พบ payload ใน SOAP Body")

        payload_bytes = base64.b64decode(payload_b64)
        # ลอง decompress ถ้า gzip
        try:
            payload_xml = gzip.decompress(payload_bytes)
        except Exception:
            payload_xml = payload_bytes

        return {
            "message_id": message_id,
            "sender_id": sender_id,
            "timestamp": timestamp,
            "payload_xml": payload_xml,
        }

    async def _process_message(self, message: dict):
        # ตรวจสอบ UBL Invoice structure เบื้องต้น
        try:
            root = etree.fromstring(message["payload_xml"])
            local = etree.QName(root.tag).localname
            if local not in ("Invoice", "CreditNote"):
                raise ValueError(f"Document type ไม่รองรับ: {local}")
        except etree.XMLSyntaxError as e:
            raise HTTPException(400, f"Payload XML ไม่ถูกต้อง: {e}")

        # ส่งต่อให้ callback
        self._on_invoice(message)

    def _build_receipt(self, message_id: str) -> dict:
        """สร้าง AS4 Receipt (Signal Message)"""
        return {
            "type": "Receipt",
            "refToMessageId": message_id,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        }
