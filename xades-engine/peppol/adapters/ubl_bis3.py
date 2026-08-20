"""
หมวด 6 — Adapters: UBL BIS Billing 3.0 Builder
สร้าง UBL 2.1 Invoice XML ตาม Peppol BIS Billing 3.0 (EN 16931)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import date
from lxml import etree

UBL_NS = {
    None:    "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "cac":   "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "cbc":   "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
}


@dataclass
class Party:
    name: str
    tin: str                  # เลขประจำตัวผู้เสียภาษี
    address: str
    country_code: str = "TH"
    peppol_id: str = ""       # Peppol Participant ID


@dataclass
class InvoiceLine:
    id: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    vat_rate: Decimal = Decimal("0.07")  # VAT 7%

    @property
    def line_amount(self) -> Decimal:
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))

    @property
    def vat_amount(self) -> Decimal:
        return (self.line_amount * self.vat_rate).quantize(Decimal("0.01"))

    @property
    def total_amount(self) -> Decimal:
        return self.line_amount + self.vat_amount


@dataclass
class UBLInvoice:
    invoice_number: str
    issue_date: date
    due_date: date
    seller: Party
    buyer: Party
    lines: list[InvoiceLine] = field(default_factory=list)
    note: str = ""
    currency: str = "THB"

    @property
    def subtotal(self) -> Decimal:
        return sum(l.line_amount for l in self.lines)

    @property
    def total_vat(self) -> Decimal:
        return sum(l.vat_amount for l in self.lines)

    @property
    def total(self) -> Decimal:
        return self.subtotal + self.total_vat

    def to_xml(self) -> bytes:
        root = etree.Element("Invoice", nsmap=UBL_NS)
        _t = lambda tag, text, parent=root: setattr(
            etree.SubElement(parent, f"{{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}}{tag}"),
            "text", str(text)
        ) or etree.SubElement(parent, f"{{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}}{tag}")

        def cbc(tag, text, parent=root):
            el = etree.SubElement(parent, f"{{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}}{tag}")
            el.text = str(text)
            return el

        def cac(tag, parent=root):
            return etree.SubElement(parent, f"{{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}}{tag}")

        cbc("CustomizationID", "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0")
        cbc("ProfileID", "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0")
        cbc("ID", self.invoice_number)
        cbc("IssueDate", self.issue_date.isoformat())
        cbc("DueDate", self.due_date.isoformat())
        cbc("InvoiceTypeCode", "380")  # 380 = Commercial Invoice
        if self.note:
            cbc("Note", self.note)
        cbc("DocumentCurrencyCode", self.currency)

        # Seller
        ac_supplier = cac("AccountingSupplierParty")
        p_supplier = cac("Party", ac_supplier)
        pi = cac("PartyIdentification", p_supplier)
        cbc("ID", self.seller.peppol_id or self.seller.tin, pi)
        pn = cac("PartyName", p_supplier)
        cbc("Name", self.seller.name, pn)
        pt = cac("PartyTaxScheme", p_supplier)
        cbc("CompanyID", self.seller.tin, pt)
        ts = cac("TaxScheme", pt)
        cbc("ID", "VAT", ts)

        # Buyer
        ac_customer = cac("AccountingCustomerParty")
        p_customer = cac("Party", ac_customer)
        pi2 = cac("PartyIdentification", p_customer)
        cbc("ID", self.buyer.peppol_id or self.buyer.tin, pi2)
        pn2 = cac("PartyName", p_customer)
        cbc("Name", self.buyer.name, pn2)
        pt2 = cac("PartyTaxScheme", p_customer)
        cbc("CompanyID", self.buyer.tin, pt2)
        ts2 = cac("TaxScheme", pt2)
        cbc("ID", "VAT", ts2)

        # Tax Total
        tt = cac("TaxTotal")
        cbc("TaxAmount", str(self.total_vat), tt).set("currencyID", self.currency)
        ts3 = cac("TaxSubtotal", tt)
        cbc("TaxableAmount", str(self.subtotal), ts3).set("currencyID", self.currency)
        cbc("TaxAmount", str(self.total_vat), ts3).set("currencyID", self.currency)
        tc = cac("TaxCategory", ts3)
        cbc("ID", "S", tc)
        cbc("Percent", "7", tc)
        ts4 = cac("TaxScheme", tc)
        cbc("ID", "VAT", ts4)

        # Legal Monetary Total
        lmt = cac("LegalMonetaryTotal")
        cbc("LineExtensionAmount", str(self.subtotal), lmt).set("currencyID", self.currency)
        cbc("TaxExclusiveAmount", str(self.subtotal), lmt).set("currencyID", self.currency)
        cbc("TaxInclusiveAmount", str(self.total), lmt).set("currencyID", self.currency)
        cbc("PayableAmount", str(self.total), lmt).set("currencyID", self.currency)

        # Invoice Lines
        for line in self.lines:
            il = cac("InvoiceLine")
            cbc("ID", line.id, il)
            cbc("InvoicedQuantity", str(line.quantity), il).set("unitCode", "EA")
            cbc("LineExtensionAmount", str(line.line_amount), il).set("currencyID", self.currency)
            item = cac("Item", il)
            cbc("Description", line.description, item)
            price = cac("Price", il)
            cbc("PriceAmount", str(line.unit_price), price).set("currencyID", self.currency)

        return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)
