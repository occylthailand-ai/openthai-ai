"""
BIS 3 → e-Tax XML Generator — OpenThai AI
แปลงข้อมูลใบกำกับภาษีที่ผ่านการตรวจสอบ (OCR Validated) → UBL 2.1 Invoice
ตามมาตรฐาน Peppol BIS Billing 3.0 + ETDA Thailand

Pipeline:
  extract_images_text.py → ocr_field_validator.py → [สคริปต์นี้] → XAdES Engine

ใช้งาน:
  python bis3_to_etax.py --demo
  python bis3_to_etax.py --json path/to/validated_fields.json
  python bis3_to_etax.py \
    --invoice-no "INV-2568-001" \
    --issue-date "2025-08-15" \
    --seller-tax-id "0105563000990" \
    --seller-name "บริษัท โอเพ่นไทย เอไอ จำกัด (มหาชน)" \
    --buyer-tax-id "0107563000999" \
    --buyer-name "บริษัท ผู้ซื้อ จำกัด" \
    --before-vat 10000.00 \
    --vat 700.00 \
    --total 10700.00

เสิร์ฟ: กลุ่ม 2 (คนกลาง ใบกำกับ/VAT) + กลุ่ม 3 (Platform e-Tax)
อ้างอิง: Peppol BIS Billing 3.0, ETDA Thai e-Tax Invoice Standard
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

# ── Namespaces (UBL 2.1) ──────────────────────────────────────────────────────

NS_INVOICE  = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
NS_CAC      = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
NS_CBC      = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

CUSTOMIZATION_ID = (
    "urn:cen.eu:en16931:2017#compliant"
    "#urn:fdc:peppol.eu:2017:poacc:billing:3.0"
)
PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"
# InvoiceTypeCode 380 = Commercial Invoice (UN/EDIFACT)
INVOICE_TYPE_CODE = "380"
# ICD 0147 = Thai VAT number (Peppol Participant ID scheme for Thailand)
THAI_PEPPOL_SCHEME = "0147"
CURRENCY = "THB"
VAT_RATE = Decimal("0.07")


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class PartyInfo:
    tax_id: str          # 13-digit Thai tax ID (validated)
    name: str
    address_line: str = ""
    city: str = ""
    postal_code: str = ""
    country_code: str = "TH"


@dataclass
class InvoiceData:
    invoice_number: str
    issue_date: str                  # YYYY-MM-DD (CE)
    seller: PartyInfo
    buyer: PartyInfo
    before_vat: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    currency: str = CURRENCY
    note: str = ""


# ── Validator (Tax ID check digit ตาม ocr_field_validator.py) ─────────────────

def _check_tax_id(tax_id: str) -> str:
    """คืน tax_id ที่ผ่าน check digit หรือ raise ValueError"""
    digits = re.sub(r'[\s\-]', '', tax_id)
    if not digits.isdigit() or len(digits) != 13:
        raise ValueError(f"Tax ID ต้องเป็นตัวเลข 13 หลัก: '{tax_id}'")
    total = sum(int(digits[i]) * (13 - i) for i in range(12))
    expected = (11 - (total % 11)) % 10
    if int(digits[12]) != expected:
        raise ValueError(
            f"Tax ID check digit ผิด: '{digits}' "
            f"(expected {expected}, got {digits[12]})"
        )
    return digits


def _check_amounts(data: InvoiceData) -> None:
    """ตรวจ before_vat × 0.07 ≈ vat และ before_vat + vat ≈ total (±0.05 บาท)"""
    expected_vat = (data.before_vat * VAT_RATE).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    if abs(data.vat_amount - expected_vat) > Decimal("0.05"):
        raise ValueError(
            f"VAT ไม่ตรง: {data.before_vat} × 7% = {expected_vat}, "
            f"ระบุมา {data.vat_amount}"
        )
    expected_total = data.before_vat + data.vat_amount
    if abs(data.total_amount - expected_total) > Decimal("0.05"):
        raise ValueError(
            f"ยอดรวมไม่ตรง: {data.before_vat} + {data.vat_amount} = {expected_total}, "
            f"ระบุมา {data.total_amount}"
        )


# ── XML Builder (lxml หรือ stdlib) ────────────────────────────────────────────

def _build_xml(data: InvoiceData) -> bytes:
    """สร้าง UBL 2.1 Invoice XML พร้อม namespace declarations"""
    try:
        from lxml import etree as ET
        _USE_LXML = True
    except ImportError:
        import xml.etree.ElementTree as ET  # type: ignore
        _USE_LXML = False

    def ns(prefix: str, local: str) -> str:
        nsmap = {"": NS_INVOICE, "cac": NS_CAC, "cbc": NS_CBC}
        return f"{{{nsmap[prefix]}}}{local}"

    def sub(parent, prefix: str, local: str, text: str = "", **attribs):
        el = ET.SubElement(parent, ns(prefix, local), **attribs)
        if text:
            el.text = text
        return el

    def party_block(parent, tag: str, info: PartyInfo) -> None:
        party_el = sub(parent, "cac", tag)
        p = sub(party_el, "cac", "Party")
        sub(p, "cbc", "EndpointID", info.tax_id, schemeID=THAI_PEPPOL_SCHEME)
        name_el = sub(p, "cac", "PartyName")
        sub(name_el, "cbc", "Name", info.name)
        if info.address_line or info.city:
            addr = sub(p, "cac", "PostalAddress")
            if info.address_line:
                sub(addr, "cbc", "StreetName", info.address_line)
            if info.city:
                sub(addr, "cbc", "CityName", info.city)
            if info.postal_code:
                sub(addr, "cbc", "PostalZone", info.postal_code)
            country = sub(addr, "cac", "Country")
            sub(country, "cbc", "IdentificationCode", info.country_code)
        legal = sub(p, "cac", "PartyLegalEntity")
        sub(legal, "cbc", "RegistrationName", info.name)
        sub(legal, "cbc", "CompanyID", info.tax_id)
        tax_scheme_el = sub(p, "cac", "PartyTaxScheme")
        sub(tax_scheme_el, "cbc", "CompanyID", info.tax_id)
        ts = sub(tax_scheme_el, "cac", "TaxScheme")
        sub(ts, "cbc", "ID", "VAT")

    if _USE_LXML:
        nsmap_root = {"": NS_INVOICE, "cac": NS_CAC, "cbc": NS_CBC}
        root = ET.Element(ns("", "Invoice"), nsmap=nsmap_root)
    else:
        ET.register_namespace("",    NS_INVOICE)
        ET.register_namespace("cac", NS_CAC)
        ET.register_namespace("cbc", NS_CBC)
        root = ET.Element(ns("", "Invoice"))

    # ── Header ────────────────────────────────────────────────────────────────
    sub(root, "cbc", "CustomizationID", CUSTOMIZATION_ID)
    sub(root, "cbc", "ProfileID",       PROFILE_ID)
    sub(root, "cbc", "ID",              data.invoice_number)
    sub(root, "cbc", "IssueDate",       data.issue_date)
    sub(root, "cbc", "InvoiceTypeCode", INVOICE_TYPE_CODE)
    sub(root, "cbc", "DocumentCurrencyCode", data.currency)
    if data.note:
        sub(root, "cbc", "Note", data.note)

    # ── Seller / Buyer ────────────────────────────────────────────────────────
    party_block(root, "AccountingSupplierParty", data.seller)
    party_block(root, "AccountingCustomerParty", data.buyer)

    # ── TaxTotal ──────────────────────────────────────────────────────────────
    tax_total = sub(root, "cac", "TaxTotal")
    sub(tax_total, "cbc", "TaxAmount",
        f"{data.vat_amount:.2f}", currencyID=data.currency)
    subtotal = sub(tax_total, "cac", "TaxSubtotal")
    sub(subtotal, "cbc", "TaxableAmount",
        f"{data.before_vat:.2f}", currencyID=data.currency)
    sub(subtotal, "cbc", "TaxAmount",
        f"{data.vat_amount:.2f}", currencyID=data.currency)
    cat = sub(subtotal, "cac", "TaxCategory")
    sub(cat, "cbc", "ID", "S")
    sub(cat, "cbc", "Percent", "7.0")
    ts2 = sub(cat, "cac", "TaxScheme")
    sub(ts2, "cbc", "ID", "VAT")

    # ── LegalMonetaryTotal ────────────────────────────────────────────────────
    lmt = sub(root, "cac", "LegalMonetaryTotal")
    sub(lmt, "cbc", "LineExtensionAmount",
        f"{data.before_vat:.2f}", currencyID=data.currency)
    sub(lmt, "cbc", "TaxExclusiveAmount",
        f"{data.before_vat:.2f}", currencyID=data.currency)
    sub(lmt, "cbc", "TaxInclusiveAmount",
        f"{data.total_amount:.2f}", currencyID=data.currency)
    sub(lmt, "cbc", "PayableAmount",
        f"{data.total_amount:.2f}", currencyID=data.currency)

    if _USE_LXML:
        return ET.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)
    else:
        import xml.dom.minidom as minidom
        raw = ET.tostring(root, encoding="unicode")
        return minidom.parseString(raw).toprettyxml(
            indent="    ", encoding="UTF-8"
        )


# ── Demo data (SAMPLE — ห้ามใช้เป็นข้อมูลจริง) ──────────────────────────────

DEMO_DATA = InvoiceData(
    invoice_number="SAMPLE-INV-2568-001",
    issue_date="2025-08-15",
    seller=PartyInfo(
        tax_id="0105563000990",   # SAMPLE check digit: sum=221 → (11-1)%10=0 ✓
        name="บริษัท ตัวอย่าง จำกัด (SAMPLE ONLY)",
        address_line="159 หมู่ 6 ตำบลมาบยางพร",
        city="ระยอง",
        postal_code="21140",
    ),
    buyer=PartyInfo(
        tax_id="0107563000999",   # SAMPLE — ไม่ใช่เลขจริง
        name="บริษัท ผู้ซื้อทดสอบ จำกัด (SAMPLE ONLY)",
    ),
    before_vat=Decimal("10000.00"),
    vat_amount=Decimal("700.00"),
    total_amount=Decimal("10700.00"),
    note="SAMPLE DATA — ใช้เพื่อทดสอบ Pipeline เท่านั้น ไม่ใช่ใบกำกับจริง",
)


# ── Loader จาก JSON ───────────────────────────────────────────────────────────

def _load_from_json(path: Path) -> InvoiceData:
    """
    อ่าน JSON ที่มีโครงสร้าง:
    {
      "invoice_number": "...",
      "issue_date": "YYYY-MM-DD",
      "seller": {"tax_id": "...", "name": "...", ...},
      "buyer": {...},
      "before_vat": 10000.00,
      "vat_amount": 700.00,
      "total_amount": 10700.00
    }
    """
    raw = json.loads(path.read_text(encoding="utf-8"))
    seller = PartyInfo(**raw["seller"])
    buyer = PartyInfo(**raw["buyer"])
    return InvoiceData(
        invoice_number=raw["invoice_number"],
        issue_date=raw["issue_date"],
        seller=seller,
        buyer=buyer,
        before_vat=Decimal(str(raw["before_vat"])),
        vat_amount=Decimal(str(raw["vat_amount"])),
        total_amount=Decimal(str(raw["total_amount"])),
        currency=raw.get("currency", CURRENCY),
        note=raw.get("note", ""),
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="BIS 3 → e-Tax UBL 2.1 XML Generator (OpenThai AI)"
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--demo", action="store_true",
                      help="สร้าง XML จาก SAMPLE data (ทดสอบ pipeline)")
    mode.add_argument("--json", type=Path, metavar="FILE",
                      help="อ่านข้อมูลจาก JSON file")
    mode.add_argument("--invoice-no", metavar="NO",
                      help="ระบุข้อมูลผ่าน CLI flags")

    p.add_argument("--issue-date",   default=date.today().isoformat())
    p.add_argument("--seller-tax-id", default="")
    p.add_argument("--seller-name",   default="")
    p.add_argument("--seller-addr",   default="")
    p.add_argument("--buyer-tax-id",  default="")
    p.add_argument("--buyer-name",    default="")
    p.add_argument("--before-vat",    type=float, default=0.0)
    p.add_argument("--vat",           type=float, default=0.0)
    p.add_argument("--total",         type=float, default=0.0)
    p.add_argument("--note",          default="")
    p.add_argument("--out", type=Path,
                   default=Path(r"E:\OPENTHAI AI\docs\etax_output"),
                   help="โฟลเดอร์ output (default: docs/etax_output/)")
    p.add_argument("--no-validate", action="store_true",
                   help="ข้าม check digit + amount validation")
    return p.parse_args()


def generate(data: InvoiceData, out_dir: Path, validate: bool = True) -> Path:
    """
    Validate + Build XML + เขียนไฟล์
    คืน Path ของไฟล์ที่สร้าง
    """
    if validate:
        _check_tax_id(data.seller.tax_id)
        _check_tax_id(data.buyer.tax_id)
        _check_amounts(data)

    xml_bytes = _build_xml(data)

    out_dir.mkdir(parents=True, exist_ok=True)
    filename = re.sub(r'[^\w\-]', '_', data.invoice_number) + ".xml"
    out_path = out_dir / filename
    out_path.write_bytes(xml_bytes)
    return out_path


if __name__ == "__main__":
    args = _parse_args()

    if args.demo:
        data = DEMO_DATA
        print("[DEMO] ใช้ SAMPLE data — ไม่ใช่ใบกำกับจริง")
    elif args.json:
        data = _load_from_json(args.json)
    else:
        # CLI flags
        if not args.invoice_no:
            print("[ERROR] ต้องระบุ --invoice-no")
            sys.exit(1)
        data = InvoiceData(
            invoice_number=args.invoice_no,
            issue_date=args.issue_date,
            seller=PartyInfo(
                tax_id=args.seller_tax_id,
                name=args.seller_name,
                address_line=args.seller_addr,
            ),
            buyer=PartyInfo(
                tax_id=args.buyer_tax_id,
                name=args.buyer_name,
            ),
            before_vat=Decimal(str(args.before_vat)),
            vat_amount=Decimal(str(args.vat)),
            total_amount=Decimal(str(args.total)),
            note=args.note,
        )

    try:
        out = generate(data, args.out, validate=not args.no_validate)
        print(f"[OK] XML เขียนแล้ว: {out}")
        print(f"     ขนาด: {out.stat().st_size:,} bytes")
        print(f"     ขั้นต่อไป: ส่งผ่าน XAdES Engine เพื่อลงลายเซ็นดิจิทัล")
        print(f"     คำสั่ง: python xades-engine/src/api_server.py sign --input \"{out}\"")
    except ValueError as exc:
        print(f"[ERROR] Validation failed: {exc}")
        sys.exit(1)
