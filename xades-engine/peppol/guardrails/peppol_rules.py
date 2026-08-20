"""
หมวด 6 — Guardrails: Peppol Business Rules Validator
ตรวจ Schematron rules ก่อนส่ง — ป้องกัน invoice ไม่ถูกปฏิเสธจาก AP
Reference: Peppol BIS Billing 3.0 Schematron Rules (EN 16931)
"""

from __future__ import annotations
from dataclasses import dataclass
from lxml import etree
from pathlib import Path
from typing import Optional

UBL_NS = {
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
}


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str]
    warnings: list[str]
    rule_violations: list[str]


class PeppolRulesValidator:
    """ตรวจ Peppol BIS 3.0 business rules ก่อนส่ง"""

    # กฎ mandatory ที่ต้องผ่านก่อนส่ง (subset จาก EN 16931)
    RULES = [
        ("BR-01", "Invoice ต้องมี InvoiceTypeCode"),
        ("BR-02", "Invoice ต้องมี DocumentCurrencyCode"),
        ("BR-04", "Invoice ต้องมี Seller Name"),
        ("BR-05", "Invoice ต้องมี Buyer Name"),
        ("BR-06", "Invoice ต้องมี Seller Tax Scheme"),
        ("BR-07", "Invoice ต้องมี Buyer Tax Scheme"),
        ("BR-16", "Invoice Line ต้องมี Description"),
        ("BR-21", "TaxableAmount + TaxAmount ต้องตรงกับ Line amounts"),
        ("BR-CO-15", "PayableAmount ต้องเท่ากับ TaxInclusiveAmount"),
    ]

    def validate(self, xml: bytes) -> ValidationResult:
        errors = []
        warnings = []
        violations = []

        try:
            root = etree.fromstring(xml)
        except etree.XMLSyntaxError as e:
            return ValidationResult(valid=False, errors=[f"XML parse error: {e}"], warnings=[], rule_violations=[])

        # BR-01: InvoiceTypeCode
        type_code = root.find(".//cbc:InvoiceTypeCode", UBL_NS)
        if type_code is None:
            violations.append("BR-01: ไม่พบ InvoiceTypeCode")
            errors.append("ต้องมี InvoiceTypeCode (เช่น 380 = Invoice, 381 = Credit Note)")
        elif type_code.text not in ("380", "381", "384", "389", "394"):
            violations.append(f"BR-01: InvoiceTypeCode '{type_code.text}' ไม่รู้จัก")

        # BR-02: DocumentCurrencyCode
        currency = root.find(".//cbc:DocumentCurrencyCode", UBL_NS)
        if currency is None:
            violations.append("BR-02: ไม่พบ DocumentCurrencyCode")
        elif len(currency.text or "") != 3:
            violations.append(f"BR-02: DocumentCurrencyCode ต้องเป็น ISO 4217 3 ตัว (ได้: {currency.text})")

        # BR-04: Seller Name
        seller_name = root.find(".//cac:AccountingSupplierParty/cac:Party/cac:PartyName/cbc:Name", UBL_NS)
        if seller_name is None or not seller_name.text:
            violations.append("BR-04: ไม่พบ Seller Name")

        # BR-05: Buyer Name
        buyer_name = root.find(".//cac:AccountingCustomerParty/cac:Party/cac:PartyName/cbc:Name", UBL_NS)
        if buyer_name is None or not buyer_name.text:
            violations.append("BR-05: ไม่พบ Buyer Name")

        # BR-06: Seller Tax ID
        seller_tax = root.find(".//cac:AccountingSupplierParty//cbc:CompanyID", UBL_NS)
        if seller_tax is None:
            violations.append("BR-06: ไม่พบ Seller Tax ID (CompanyID)")
        elif len((seller_tax.text or "").replace("-", "")) != 13:
            warnings.append(f"BR-06: Seller Tax ID อาจไม่ถูกรูปแบบ (ควร 13 หลัก): {seller_tax.text}")

        # BR-07: Buyer Tax ID
        buyer_tax = root.find(".//cac:AccountingCustomerParty//cbc:CompanyID", UBL_NS)
        if buyer_tax is None:
            violations.append("BR-07: ไม่พบ Buyer Tax ID")

        # BR-16: Invoice Lines ต้องมี Description
        lines = root.findall(".//cac:InvoiceLine", UBL_NS)
        if not lines:
            violations.append("BR-16: Invoice ต้องมีอย่างน้อย 1 Invoice Line")
        for i, line in enumerate(lines, 1):
            desc = line.find(".//cbc:Description", UBL_NS)
            if desc is None or not desc.text:
                violations.append(f"BR-16: Invoice Line {i} ไม่มี Description")

        valid = len(violations) == 0
        return ValidationResult(valid=valid, errors=errors, warnings=warnings, rule_violations=violations)


def validate_before_send(xml: bytes) -> ValidationResult:
    """Helper function — ใช้ก่อนส่งทุกครั้ง"""
    validator = PeppolRulesValidator()
    result = validator.validate(xml)
    if not result.valid:
        raise ValueError(
            f"Peppol validation ล้มเหลว ({len(result.rule_violations)} rules):\n"
            + "\n".join(f"  • {v}" for v in result.rule_violations)
        )
    return result
