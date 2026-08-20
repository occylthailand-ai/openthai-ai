"""
หมวด 6 — Drivers/Adapters: Peppol Gateway FastAPI Server
REST API สำหรับ:
  POST /api/v1/peppol/send       — ส่ง e-Invoice ผ่าน Peppol
  POST /api/v1/peppol/receive    — รับ AS4 message เข้ามา
  GET  /api/v1/peppol/status/{id}— ตรวจสอบสถานะ
  GET  /health                   — health check
"""

import os
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal

from as4.sender import AS4Sender, lookup_access_point
from as4.receiver import AS4Receiver
from rd_gateway.etax_submitter import RDGatewaySubmitter
from guardrails.peppol_rules import validate_before_send
from adapters.ubl_bis3 import UBLInvoice, Party, InvoiceLine

app = FastAPI(
    title="Peppol Gateway — OpenThai AI",
    description="หมวด 6: ไดรเวอร์เชื่อมต่อ Peppol Network และ RD Gateway",
    version="1.0.0",
)

ENV = os.environ.get("PEPPOL_ENV", "test")
SIGNING_CERT = os.environ.get("PEPPOL_CERT_PATH", "/certs/services/peppol-gateway.crt")
SIGNING_KEY  = os.environ.get("PEPPOL_KEY_PATH",  "/certs/services/peppol-gateway.key")
SENDER_ID    = os.environ.get("PEPPOL_SENDER_ID", "0195:5101234567890")  # placeholder
RD_API_KEY   = os.environ.get("RD_API_KEY", "")
RD_API_SECRET= os.environ.get("RD_API_SECRET", "")
TAXPAYER_ID  = os.environ.get("RD_TAXPAYER_ID", "")


class SendInvoiceRequest(BaseModel):
    receiver_peppol_id: str = Field(..., example="0195:5101234567891")
    invoice_number: str     = Field(..., example="INV-2026-0001")
    seller_name: str
    seller_tin: str
    buyer_name: str
    buyer_tin: str
    issue_date: date
    due_date: date
    currency: str           = "THB"
    lines: list[dict]       = Field(..., min_items=1)
    submit_to_rd: bool      = False


@app.get("/health")
def health():
    return {"status": "ok", "service": "peppol-gateway", "env": ENV}


@app.post("/api/v1/peppol/send")
async def send_invoice(req: SendInvoiceRequest, background: BackgroundTasks):
    """ส่ง e-Invoice ผ่าน Peppol Network"""
    # สร้าง UBL XML
    invoice_lines = [
        InvoiceLine(
            id=str(i + 1),
            description=line["description"],
            quantity=Decimal(str(line["quantity"])),
            unit_price=Decimal(str(line["unit_price"])),
        )
        for i, line in enumerate(req.lines)
    ]

    invoice = UBLInvoice(
        invoice_number=req.invoice_number,
        issue_date=req.issue_date,
        due_date=req.due_date,
        seller=Party(name=req.seller_name, tin=req.seller_tin, address=""),
        buyer=Party(name=req.buyer_name, tin=req.buyer_tin, address=""),
        lines=invoice_lines,
        currency=req.currency,
    )
    ubl_xml = invoice.to_xml()

    # Validate ก่อนส่ง
    try:
        validate_before_send(ubl_xml)
    except ValueError as e:
        raise HTTPException(422, detail=str(e))

    # ค้นหา Access Point
    try:
        ap_url = lookup_access_point(
            req.receiver_peppol_id,
            "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
            environment=ENV,
        )
    except Exception as e:
        raise HTTPException(502, detail=f"หาไม่พบ Access Point: {e}")

    # ส่งผ่าน AS4
    with AS4Sender(SENDER_ID, ap_url, SIGNING_CERT, SIGNING_KEY, environment=ENV) as sender:
        peppol_result = sender.send_invoice(
            receiver_id=req.receiver_peppol_id,
            ubl_xml=ubl_xml,
            document_id=req.invoice_number,
        )

    # ส่ง RD Gateway ถ้าต้องการ
    rd_result = None
    if req.submit_to_rd and RD_API_KEY:
        rd = RDGatewaySubmitter(TAXPAYER_ID, RD_API_KEY, RD_API_SECRET, environment=ENV)
        rd_result = rd.submit_invoice(ubl_xml, req.invoice_number)
        rd.close()

    return {
        "status": "sent",
        "peppol": peppol_result,
        "rd_gateway": rd_result,
    }


@app.post("/api/v1/peppol/receive")
async def receive_message(request: Request):
    """รับ AS4 message จาก Peppol Network"""
    invoices_received = []

    def on_invoice(msg: dict):
        invoices_received.append(msg["message_id"])

    receiver = AS4Receiver(on_invoice=on_invoice)
    result = await receiver.handle_request(request)
    return {"receipt": result, "processed": invoices_received}


@app.get("/api/v1/peppol/status/{rd_ref_id}")
def check_status(rd_ref_id: str):
    """ตรวจสอบสถานะที่ RD Gateway"""
    if not RD_API_KEY:
        raise HTTPException(503, "RD Gateway ไม่ได้ตั้งค่า")
    rd = RDGatewaySubmitter(TAXPAYER_ID, RD_API_KEY, RD_API_SECRET, environment=ENV)
    result = rd.check_status(rd_ref_id)
    rd.close()
    return result
