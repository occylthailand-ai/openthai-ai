"""
Thai Eval Suite — ชุดทดสอบคุณภาพ NLP/AI ภาษาไทย
เสิร์ฟ: กลุ่ม 3 (แพลตฟอร์ม) + กลุ่ม 5 (นักพัฒนา)
รัน: python -m pytest tests/thai_eval_suite.py -v
"""

import re
import sys
import time
import unittest
from typing import Optional


# ─── ข้อมูลทดสอบ ───────────────────────────────────────────────────────────

COMPANY_NAME    = "บริษัท โอเพ่นไทย เอไอ จำกัด (มหาชน)"
COMPANY_TAX_ID  = "0107563000999"   # ตัวอย่างสำหรับชุดทดสอบ ไม่ใช่เลขจริง
COMPANY_ADDRESS = (
    "อาคารตึก i ห้อง 525 เอเพ็กซ์อพาร์ทเม้นท์ มาบยางพร 159 หมู่ 6 "
    "ตำบลมาบยางพร อำเภอปลวกแดง จังหวัดระยอง 21140"
)
COMPANY_POSTCODE = "21140"


# ─── ฟังก์ชัน extraction ที่ต้องทดสอบ ────────────────────────────────────

def extract_company_name(text: str) -> Optional[str]:
    """ดึงชื่อบริษัทจากข้อความใบกำกับภาษี"""
    # รองรับทั้งรูปแบบ "บริษัท ... จำกัด", "หจก.", "ร้าน"
    match = re.search(
        r'(บริษัท\s+[฀-๿0-9A-Za-z\s\(\)\.]+?(?:จำกัด(?:\s*\(มหาชน\))?|จก\.|จำกัด))',
        text,
        re.UNICODE,
    )
    return match.group(1).strip() if match else None


def extract_tax_id(text: str) -> Optional[str]:
    """ดึงเลขประจำตัวผู้เสียภาษี 13 หลัก"""
    match = re.search(r'\b(\d{13})\b', text)
    return match.group(1) if match else None


def extract_address(text: str) -> Optional[str]:
    """ดึงที่อยู่จากข้อความ — รองรับ 'อาคาร...' ถึงรหัสไปรษณีย์ 5 หลัก"""
    # ขยาย character class ให้ครอบคลุม ASCII letters (เช่น ชื่ออาคาร "i")
    match = re.search(
        r'((?:อาคาร|เลขที่|ที่อยู่)\s*[฀-๿0-9A-Za-z\s\.\,\/\-\(\)]+?\b\d{5}\b)',
        text,
        re.UNICODE,
    )
    return match.group(1).strip() if match else None


def extract_postcode(text: str) -> Optional[str]:
    """ดึงรหัสไปรษณีย์ 5 หลัก (ตัวสุดท้ายในข้อความ)"""
    matches = re.findall(r'\b(\d{5})\b', text)
    return matches[-1] if matches else None


def normalize_thai_text(text: str) -> str:
    """ลบช่องว่างซ้ำและ trim"""
    return re.sub(r'\s+', ' ', text).strip()


def detect_language(text: str) -> str:
    """ตรวจภาษาหลัก: thai | english | mixed"""
    thai_chars   = len(re.findall(r'[฀-๿]', text))
    eng_chars    = len(re.findall(r'[a-zA-Z]', text))
    total        = thai_chars + eng_chars
    if total == 0:
        return 'unknown'
    thai_ratio   = thai_chars / total
    if thai_ratio > 0.7:
        return 'thai'
    if thai_ratio < 0.3:
        return 'english'
    return 'mixed'


# ─── ชุดทดสอบ ─────────────────────────────────────────────────────────────

class TestEntityExtraction(unittest.TestCase):
    """ทดสอบการดึงข้อมูลนิติบุคคลจากข้อความ"""

    # ──── ชุดข้อมูลทดสอบ ────
    sample_dataset = [
        {
            "id": "TC-001",
            "desc": "ใบกำกับภาษีมาตรฐาน — ที่อยู่ระยอง",
            "raw_text": (
                "ใบกำกับภาษี ออกโดย บริษัท โอเพ่นไทย เอไอ จำกัด (มหาชน) "
                f"เลขประจำตัวผู้เสียภาษี {COMPANY_TAX_ID} "
                f"{COMPANY_ADDRESS}"
            ),
            "expected_name":    COMPANY_NAME,
            "expected_tax_id":  COMPANY_TAX_ID,
            "expected_address": COMPANY_ADDRESS,
            "expected_postcode": COMPANY_POSTCODE,
        },
        {
            "id": "TC-002",
            "desc": "ใบกำกับภาษีแบบย่อ — มีเฉพาะเลขภาษีและชื่อ",
            "raw_text": (
                "ใบเสร็จรับเงิน บริษัท โอเพ่นไทย เอไอ จำกัด (มหาชน) "
                f"เลขที่ผู้เสียภาษี: {COMPANY_TAX_ID}"
            ),
            "expected_name":    COMPANY_NAME,
            "expected_tax_id":  COMPANY_TAX_ID,
            "expected_address": None,
            "expected_postcode": None,
        },
        {
            "id": "TC-003",
            "desc": "ข้อความไม่มีข้อมูลนิติบุคคล",
            "raw_text": "ยอดชำระ 1,500 บาท วันที่ 22 สิงหาคม 2569",
            "expected_name":    None,
            "expected_tax_id":  None,
            "expected_address": None,
            "expected_postcode": None,
        },
    ]

    def test_extract_company_name(self):
        for case in self.sample_dataset:
            with self.subTest(id=case["id"]):
                result = extract_company_name(case["raw_text"])
                self.assertEqual(
                    result,
                    case["expected_name"],
                    f'[{case["id"]}] ชื่อบริษัท: got {result!r}, want {case["expected_name"]!r}',
                )

    def test_extract_tax_id(self):
        for case in self.sample_dataset:
            with self.subTest(id=case["id"]):
                result = extract_tax_id(case["raw_text"])
                self.assertEqual(
                    result,
                    case["expected_tax_id"],
                    f'[{case["id"]}] เลขภาษี: got {result!r}, want {case["expected_tax_id"]!r}',
                )

    def test_extract_address(self):
        """ทดสอบเฉพาะ TC-001 ที่มีที่อยู่ครบ"""
        case = self.sample_dataset[0]
        result = extract_address(case["raw_text"])
        self.assertIsNotNone(result, f'[{case["id"]}] ต้องดึงที่อยู่ได้')
        self.assertIn("ระยอง", result, "ต้องมีจังหวัดระยอง")
        self.assertIn(COMPANY_POSTCODE, result, f"ต้องมีรหัสไปรษณีย์ {COMPANY_POSTCODE}")

    def test_extract_postcode(self):
        case = self.sample_dataset[0]
        result = extract_postcode(case["raw_text"])
        self.assertEqual(result, COMPANY_POSTCODE)


class TestTextNormalization(unittest.TestCase):
    """ทดสอบการ normalize ข้อความภาษาไทย"""

    def test_collapse_spaces(self):
        raw = "บริษัท   โอเพ่นไทย    เอไอ"
        expected = "บริษัท โอเพ่นไทย เอไอ"
        self.assertEqual(normalize_thai_text(raw), expected)

    def test_trim(self):
        self.assertEqual(normalize_thai_text("  ระยอง  "), "ระยอง")

    def test_mixed_newlines(self):
        raw = "อาคาร\n\nตึก i\r\nห้อง 525"
        self.assertEqual(normalize_thai_text(raw), "อาคาร ตึก i ห้อง 525")


class TestLanguageDetection(unittest.TestCase):
    """ทดสอบการตรวจภาษาหลักในข้อความ"""

    def test_thai_dominant(self):
        self.assertEqual(detect_language("สวัสดีครับ นี่คือข้อความภาษาไทย"), "thai")

    def test_english_dominant(self):
        self.assertEqual(detect_language("Hello World this is English text"), "english")

    def test_mixed(self):
        self.assertEqual(detect_language("OpenThaiAI แพลตฟอร์ม AI"), "mixed")

    def test_empty(self):
        self.assertEqual(detect_language(""), "unknown")


class TestPostcodeValidation(unittest.TestCase):
    """ทดสอบ format รหัสไปรษณีย์ไทย"""

    VALID_POSTCODES   = ["21140", "10110", "50200", "90000"]
    INVALID_POSTCODES = ["1234", "123456", "abcde", ""]

    def test_valid_postcodes(self):
        for pc in self.VALID_POSTCODES:
            with self.subTest(postcode=pc):
                self.assertRegex(pc, r'^\d{5}$')

    def test_invalid_postcodes(self):
        for pc in self.INVALID_POSTCODES:
            with self.subTest(postcode=pc):
                self.assertNotRegex(pc, r'^\d{5}$')


class TestAddressComponents(unittest.TestCase):
    """ทดสอบองค์ประกอบที่อยู่ที่อยู่ระยอง"""

    def test_address_contains_required_fields(self):
        required = ["ห้อง 525", "มาบยางพร", "ปลวกแดง", "ระยอง", "21140"]
        for field in required:
            self.assertIn(field, COMPANY_ADDRESS, f"ต้องมี: {field}")

    def test_address_moo_number(self):
        self.assertIn("หมู่ 6", COMPANY_ADDRESS)

    def test_address_tambon(self):
        self.assertIn("ตำบลมาบยางพร", COMPANY_ADDRESS)

    def test_address_amphoe(self):
        self.assertIn("อำเภอปลวกแดง", COMPANY_ADDRESS)


class TestPerformance(unittest.TestCase):
    """ทดสอบความเร็ว extraction — ต้องไม่เกิน 100ms ต่อครั้ง"""

    LONG_TEXT = (
        "ใบกำกับภาษีเลขที่ INV-2569-001 ออกโดย " + COMPANY_NAME + " "
        "เลขประจำตัวผู้เสียภาษี " + COMPANY_TAX_ID + " "
        + COMPANY_ADDRESS + " "
        "รายการสินค้า: บริการ AI Platform รายเดือน จำนวน 1 เดือน "
        "ราคาต่อหน่วย 9,900 บาท ภาษีมูลค่าเพิ่ม 7% = 693 บาท "
        "รวมทั้งสิ้น 10,593 บาท"
    ) * 10  # ยาว ~10x

    def _time_extraction(self, func, text):
        start = time.perf_counter()
        func(text)
        return (time.perf_counter() - start) * 1000  # ms

    def test_name_extraction_speed(self):
        ms = self._time_extraction(extract_company_name, self.LONG_TEXT)
        self.assertLess(ms, 100, f"extract_company_name ใช้เวลา {ms:.1f}ms (เกิน 100ms)")

    def test_tax_id_extraction_speed(self):
        ms = self._time_extraction(extract_tax_id, self.LONG_TEXT)
        self.assertLess(ms, 100, f"extract_tax_id ใช้เวลา {ms:.1f}ms (เกิน 100ms)")

    def test_address_extraction_speed(self):
        ms = self._time_extraction(extract_address, self.LONG_TEXT)
        self.assertLess(ms, 100, f"extract_address ใช้เวลา {ms:.1f}ms (เกิน 100ms)")


# ─── Entry point ──────────────────────────────────────────────────────────

if __name__ == '__main__':
    loader  = unittest.TestLoader()
    suite   = loader.loadTestsFromModule(sys.modules[__name__])
    runner  = unittest.TextTestRunner(verbosity=2)
    result  = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
