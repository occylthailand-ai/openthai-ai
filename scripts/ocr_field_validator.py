"""
OCR Field Validator — OpenThai AI
ตรวจสอบความถูกต้องของฟิลด์ใบกำกับภาษีไทยที่สกัดจาก OCR

ฟิลด์ที่ตรวจ:
  - เลขประจำตัวผู้เสียภาษี 13 หลัก (check digit ตามกฎ กรมสรรพากร)
  - เลขที่ใบกำกับภาษี
  - วันที่ (รองรับ พ.ศ. และ ค.ศ.)
  - มูลค่าก่อน VAT, VAT 7%, ยอดรวม
  - cross-validation: ยอดก่อนภาษี × 0.07 ≈ VAT

ใช้งาน:
  python ocr_field_validator.py --input docs/extracted_image_texts.md
  python ocr_field_validator.py --text "0105563000999 วันที่ 15/08/2568 รวม 10700"

เสิร์ฟ: กลุ่ม 2 (คนกลาง ใบกำกับ/พิกัด) + กลุ่ม 5 (นักพัฒนา e-Tax)
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ── โครงสร้างผลลัพธ์ ──────────────────────────────────────────────────────────

@dataclass
class FieldResult:
    field_name: str
    raw_value: str
    normalized: str = ""
    valid: bool = False
    confidence: str = "ok"   # "ok" | "review" | "error"
    message: str = ""


@dataclass
class InvoiceValidationResult:
    tax_id_seller: Optional[FieldResult] = None
    tax_id_buyer: Optional[FieldResult] = None
    invoice_number: Optional[FieldResult] = None
    invoice_date: Optional[FieldResult] = None
    amount_before_vat: Optional[FieldResult] = None
    vat_amount: Optional[FieldResult] = None
    total_amount: Optional[FieldResult] = None
    cross_check: Optional[FieldResult] = None
    needs_human_review: bool = False
    summary: list[str] = field(default_factory=list)


# ── regex patterns ─────────────────────────────────────────────────────────────

# เลขผู้เสียภาษี 13 หลัก (มีเครื่องหมายขีดคั่นหรือไม่ก็ได้)
_TAX_ID_PATTERN = re.compile(
    r'\b(\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1})\b'
)

# เลขที่ใบกำกับภาษี: ตัวอักษร/เลข ขีด เลข (เช่น IV-2568-001, TH001/2568)
_INV_NO_PATTERN = re.compile(
    r'\b([A-Za-zก-๙]{1,6}[-/]?\d{4}[-/]\d{3,6})\b'
)

# วันที่: DD/MM/YYYY หรือ DD-MM-YYYY (พ.ศ. หรือ ค.ศ.)
_DATE_PATTERN = re.compile(
    r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b'
)

# ตัวเลขทางการเงิน (ทศนิยม 2 ตำแหน่ง, มี comma หรือไม่ก็ได้)
_AMOUNT_PATTERN = re.compile(
    r'(?<!\d)([\d,]{1,12}(?:\.\d{2})?)\b'
)


# ── Thai Tax ID check digit (กรมสรรพากร) ─────────────────────────────────────

def _validate_tax_id(raw: str) -> FieldResult:
    """
    ตรวจสอบเลขประจำตัวผู้เสียภาษี 13 หลัก (กรมสรรพากร / กรมพัฒนาธุรกิจการค้า)

    สูตรอย่างเป็นทางการ (1-indexed):
      Sum = Σ d[i] × (14 − i)  สำหรับ i = 1..12
          = d[0]×13 + d[1]×12 + … + d[11]×2   (0-indexed)
      Check digit = (11 − Sum % 11) % 10

    ตัวอย่าง: 0105563000990
      Sum = 0×13+1×12+0×11+5×10+5×9+6×8+3×7+0×6+0×5+0×4+9×3+9×2
          = 0+12+0+50+45+48+21+0+0+0+27+18 = 221
      (11 − 221%11) % 10 = (11 − 1) % 10 = 0  ✓ ตรงกับหลักที่ 13
    """
    digits = re.sub(r'[\s\-]', '', raw)
    result = FieldResult(field_name="tax_id", raw_value=raw, normalized=digits)

    if not digits.isdigit() or len(digits) != 13:
        result.confidence = "error"
        result.message = f"ต้องเป็นตัวเลข 13 หลัก พบ {len(digits)} หลัก"
        return result

    # น้ำหนัก 13 ลงไปถึง 2 (positions 0..11)
    total = sum(int(digits[i]) * (13 - i) for i in range(12))
    expected = (11 - (total % 11)) % 10   # ← % 10 ไม่ใช่ % 11
    actual = int(digits[12])

    if expected != actual:
        result.confidence = "error"
        result.message = (
            f"Check digit ไม่ถูกต้อง — ระบุมา: {actual}, "
            f"ค่าที่ถูกต้องตามสูตร: {expected} "
            f"(sum={total}, {total}%11={total%11}, (11−{total%11})%10={expected})"
        )
        return result

    formatted = (
        f"{digits[0]}-{digits[1:5]}-{digits[5:10]}"
        f"-{digits[10:12]}-{digits[12]}"
    )
    result.normalized = formatted
    result.valid = True
    result.confidence = "ok"
    result.message = f"ผ่าน check digit (sum={total}, expected={expected})"
    return result


# ── Date validator ─────────────────────────────────────────────────────────────

def _validate_date(raw: str) -> FieldResult:
    """
    ตรวจวันที่ — รองรับ พ.ศ. (2500+) และ ค.ศ. (1900+)
    แปลง พ.ศ. เป็น ค.ศ. โดยลบ 543
    """
    result = FieldResult(field_name="date", raw_value=raw)
    m = _DATE_PATTERN.search(raw)
    if not m:
        result.confidence = "error"
        result.message = "ไม่พบรูปแบบวันที่ DD/MM/YYYY"
        return result

    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))

    if y > 2400:          # พ.ศ.
        y_ce = y - 543
        era = "พ.ศ."
    elif y >= 1900:       # ค.ศ.
        y_ce = y
        era = "ค.ศ."
    else:
        result.confidence = "review"
        result.message = f"ปี {y} ไม่แน่ชัดว่า พ.ศ. หรือ ค.ศ."
        return result

    if not (1 <= mo <= 12 and 1 <= d <= 31):
        result.confidence = "error"
        result.message = f"วัน/เดือนไม่ถูกต้อง: {d}/{mo}"
        return result

    result.normalized = f"{d:02d}/{mo:02d}/{y_ce} (CE)"
    result.valid = True
    result.confidence = "ok"
    result.message = f"วันที่ถูกต้อง ({era})"
    return result


# ── Amount parser ──────────────────────────────────────────────────────────────

def _parse_amount(text: str) -> Optional[float]:
    """ดึงตัวเลขทางการเงินจากข้อความ คืน float หรือ None"""
    clean = re.sub(r'[,\s]', '', text)
    try:
        return float(clean)
    except ValueError:
        return None


def _validate_amount(raw: str, label: str) -> FieldResult:
    result = FieldResult(field_name=label, raw_value=raw)
    val = _parse_amount(raw)
    if val is None:
        result.confidence = "error"
        result.message = "แปลงเป็นตัวเลขไม่ได้"
        return result
    if val < 0:
        result.confidence = "error"
        result.message = "ยอดเงินติดลบ"
        return result
    result.normalized = f"{val:,.2f}"
    result.valid = True
    result.confidence = "ok"
    return result


# ── Cross-validation: amount_before_vat × 0.07 ≈ vat ─────────────────────────

def _cross_validate_amounts(
    before_vat: float,
    vat: float,
    total: float,
    tolerance_baht: float = 0.05,   # 0.05 บาท — รองรับค่าปัดทศนิยม
) -> FieldResult:
    result = FieldResult(field_name="cross_check", raw_value="")
    expected_vat = round(before_vat * 0.07, 2)
    expected_total = round(before_vat + vat, 2)
    vat_diff = abs(vat - expected_vat)
    total_diff = abs(total - expected_total)

    issues = []
    if vat_diff > tolerance_baht:
        issues.append(
            f"VAT ไม่ตรง: พบ {vat:,.2f} คาดหวัง {expected_vat:,.2f}"
            f" (diff {vat_diff:.2f} บาท)"
        )
    if total_diff > tolerance_baht:
        issues.append(
            f"ยอดรวมไม่ตรง: พบ {total:,.2f} คาดหวัง {expected_total:,.2f}"
            f" (diff {total_diff:.2f} บาท)"
        )

    if issues:
        result.confidence = "review"
        result.message = " | ".join(issues)
        result.valid = False
    else:
        result.valid = True
        result.confidence = "ok"
        result.message = (
            f"ยอด cross-check ผ่าน: {before_vat:,.2f} + {vat:,.2f} = {total:,.2f}"
        )
    return result


# ── หลักการดึงฟิลด์จากข้อความ OCR ────────────────────────────────────────────

def _extract_and_validate(text: str) -> InvoiceValidationResult:
    """ดึงฟิลด์จากข้อความ OCR และตรวจสอบ"""
    result = InvoiceValidationResult()
    lines = text.splitlines()

    # --- Tax IDs (อาจมีหลายตัว — seller + buyer) ---
    tax_ids_found = []
    for line in lines:
        for m in _TAX_ID_PATTERN.finditer(line):
            vr = _validate_tax_id(m.group(1))
            tax_ids_found.append(vr)

    if len(tax_ids_found) >= 1:
        result.tax_id_seller = tax_ids_found[0]
    if len(tax_ids_found) >= 2:
        result.tax_id_buyer = tax_ids_found[1]

    # --- Invoice number ---
    for line in lines:
        m = _INV_NO_PATTERN.search(line)
        if m:
            fr = FieldResult(
                field_name="invoice_number",
                raw_value=m.group(1),
                normalized=m.group(1).upper(),
                valid=True,
                confidence="ok",
            )
            result.invoice_number = fr
            break

    # --- Date ---
    for line in lines:
        m = _DATE_PATTERN.search(line)
        if m:
            result.invoice_date = _validate_date(line)
            break

    # --- Amounts: หา keyword แล้วดึงตัวเลขถัดไป ---
    before_vat_val: Optional[float] = None
    vat_val: Optional[float] = None
    total_val: Optional[float] = None

    for i, line in enumerate(lines):
        lower = line.lower()
        amounts = [_parse_amount(m.group(1)) for m in _AMOUNT_PATTERN.finditer(line)]
        amounts = [a for a in amounts if a is not None and a > 0]

        if any(kw in lower for kw in ("ก่อนภาษี", "มูลค่าสินค้า", "subtotal", "before vat", "before tax")):
            if amounts:
                before_vat_val = amounts[-1]
                result.amount_before_vat = _validate_amount(str(before_vat_val), "amount_before_vat")

        if any(kw in lower for kw in ("ภาษีมูลค่าเพิ่ม", "vat", "tax 7%", "ภาษี 7")):
            if amounts:
                vat_val = amounts[-1]
                result.vat_amount = _validate_amount(str(vat_val), "vat_amount")

        if any(kw in lower for kw in ("รวมทั้งสิ้น", "ยอดรวม", "total", "grand total", "net total")):
            if amounts:
                total_val = amounts[-1]
                result.total_amount = _validate_amount(str(total_val), "total_amount")

    # --- Cross-validation ---
    if before_vat_val and vat_val and total_val:
        result.cross_check = _cross_validate_amounts(
            before_vat_val, vat_val, total_val
        )

    # --- Human review flag ---
    all_fields = [
        result.tax_id_seller, result.tax_id_buyer,
        result.invoice_number, result.invoice_date,
        result.amount_before_vat, result.vat_amount,
        result.total_amount, result.cross_check,
    ]
    review_fields = [f for f in all_fields if f and f.confidence in ("review", "error")]
    result.needs_human_review = len(review_fields) > 0

    # --- Summary ---
    found = [f for f in all_fields if f is not None]
    result.summary = [
        f"พบฟิลด์: {len(found)} / 8",
        f"ต้องตรวจ: {len(review_fields)} ฟิลด์",
        "→ ต้องตรวจโดยมนุษย์" if result.needs_human_review else "→ ผ่านอัตโนมัติ",
    ]
    return result


# ── Output ─────────────────────────────────────────────────────────────────────

def _render_field(fr: Optional[FieldResult], label: str) -> str:
    if fr is None:
        return f"| {label} | — | — | ❓ ไม่พบ |"
    icon = {"ok": "✅", "review": "⚠️", "error": "❌"}.get(fr.confidence, "❓")
    norm = fr.normalized or fr.raw_value
    return f"| {label} | `{fr.raw_value}` | `{norm}` | {icon} {fr.message} |"


def validate_and_report(text: str, source_label: str = "") -> str:
    """ตรวจสอบฟิลด์และคืน Markdown report"""
    vr = _extract_and_validate(text)

    header = f"## ผลตรวจสอบ: {source_label}\n\n" if source_label else "## ผลตรวจสอบ\n\n"
    status = "⚠️ ต้องตรวจโดยมนุษย์" if vr.needs_human_review else "✅ ผ่านอัตโนมัติ"
    summary = f"**{status}** — {' | '.join(vr.summary)}\n\n"

    table = (
        "| ฟิลด์ | ค่าที่อ่านได้ | ค่าหลัง normalize | สถานะ |\n"
        "|------|------------|-----------------|-------|\n"
    )
    table += _render_field(vr.tax_id_seller, "เลขผู้เสียภาษี (ผู้ขาย)") + "\n"
    table += _render_field(vr.tax_id_buyer, "เลขผู้เสียภาษี (ผู้ซื้อ)") + "\n"
    table += _render_field(vr.invoice_number, "เลขที่ใบกำกับ") + "\n"
    table += _render_field(vr.invoice_date, "วันที่") + "\n"
    table += _render_field(vr.amount_before_vat, "มูลค่าก่อน VAT") + "\n"
    table += _render_field(vr.vat_amount, "VAT 7%") + "\n"
    table += _render_field(vr.total_amount, "ยอดรวม") + "\n"
    table += _render_field(vr.cross_check, "Cross-validation") + "\n"

    return header + summary + table + "\n---\n"


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="OCR Field Validator — ตรวจสอบฟิลด์ใบกำกับภาษีไทย"
    )
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--input", type=Path,
        help="ไฟล์ extracted_image_texts.md จาก extract_images_text.py"
    )
    group.add_argument(
        "--text", type=str,
        help="ข้อความ OCR โดยตรง (ใส่ใน quotes)"
    )
    p.add_argument(
        "--out", type=Path,
        default=Path(r"E:\OPENTHAI AI\docs\ocr_field_validation_report.md"),
        help="ไฟล์ผลลัพธ์ (default: docs/ocr_field_validation_report.md)"
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    if args.text:
        report = validate_and_report(args.text, source_label="inline text")
        print(report)
        sys.exit(0)

    # อ่านจาก extracted_image_texts.md
    if not args.input.exists():
        print(f"[ERROR] ไม่พบไฟล์: {args.input}")
        print("        รัน extract_images_text.py ก่อนแล้วระบุ --input")
        sys.exit(1)

    raw_md = args.input.read_text(encoding="utf-8")
    # แยกแต่ละ section ตาม ## ไฟล์ที่ N:
    sections = re.split(r'\n(?=## ไฟล์ที่ \d+)', raw_md)

    all_reports = [
        "# รายงานตรวจสอบฟิลด์ใบกำกับภาษี — OpenThai AI\n\n"
        f"**แหล่งข้อมูล:** `{args.input}`\n\n---\n\n"
    ]
    needs_review_count = 0

    for section in sections:
        label_m = re.search(r'## ไฟล์ที่ \d+: `([^`]+)`', section)
        label = label_m.group(1) if label_m else "ไม่ระบุ"
        code_m = re.search(r'```text\n(.*?)\n```', section, re.DOTALL)
        if not code_m:
            continue
        ocr_text = code_m.group(1).strip()
        if not ocr_text or ocr_text == "(ว่าง — ไม่พบข้อความ)":
            continue
        report = validate_and_report(ocr_text, source_label=label)
        all_reports.append(report)
        if "ต้องตรวจโดยมนุษย์" in report:
            needs_review_count += 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("".join(all_reports), encoding="utf-8")
    print(f"[DONE] ตรวจแล้ว {len(all_reports)-1} ไฟล์ | ต้อง Human Review: {needs_review_count}")
    print(f"       รายงาน: {args.out}")
