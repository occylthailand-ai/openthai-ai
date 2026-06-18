"""
OpenThai.ai — Payment Module
PromptPay QR Code + Omise integration
"""
import os
import io
import base64
import hashlib
import struct
import qrcode
from qrcode.image.pil import PilImage

PROMPTPAY_ID = os.getenv("PROMPTPAY_ID", "")

# ── PromptPay EMV QR payload builder ──────────────────────────────────────────

def _crc16(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc

def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"

def build_promptpay_payload(amount: float = None) -> str:
    if not PROMPTPAY_ID:
        return ""

    pid = PROMPTPAY_ID.strip().replace("-", "").replace(" ", "")

    # Format phone or tax ID
    if len(pid) == 10 and pid.startswith("0"):
        formatted = "0066" + pid[1:]  # phone → international
    elif len(pid) == 13:
        formatted = pid  # tax ID
    else:
        formatted = pid

    merchant_info = _tlv("00", "A000000677010111") + _tlv("01", formatted)
    body = (
        _tlv("00", "01")           # Payload Format Indicator
        + _tlv("01", "12")         # Point of Initiation — dynamic
        + _tlv("29", merchant_info) # PromptPay merchant info
        + _tlv("53", "764")        # Currency — THB
    )
    if amount and amount > 0:
        body += _tlv("54", f"{amount:.2f}")  # Transaction Amount

    body += _tlv("58", "TH")       # Country Code
    body += "6304"                  # CRC placeholder

    crc = _crc16(body.encode("ascii"))
    return body + f"{crc:04X}"

def generate_qr_base64(amount: float = None) -> str:
    payload = build_promptpay_payload(amount)
    if not payload:
        return ""
    try:
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        return ""

def get_payment_methods() -> dict:
    has_promptpay = bool(PROMPTPAY_ID)
    has_omise     = bool(os.getenv("OMISE_SECRET_KEY"))
    return {
        "promptpay": {
            "available": has_promptpay,
            "id": PROMPTPAY_ID,
            "label": "PromptPay QR Code",
        },
        "credit_card": {
            "available": has_omise,
            "label": "บัตรเครดิต/เดบิต (Omise)",
        },
        "bank_transfer": {
            "available": True,
            "label": "โอนเงินธนาคาร (แนบสลิป)",
            "accounts": [
                {"bank": "กสิกรไทย", "account": os.getenv("BANK_KBANK", ""), "name": "OpenThai.ai"},
                {"bank": "ไทยพาณิชย์", "account": os.getenv("BANK_SCB", ""), "name": "OpenThai.ai"},
            ],
        },
    }
