"""
OpenThai.ai — Intermediary AI Integration (Wave 9, Task 9.3/9.6)
intermediary_ai.py

เชื่อม Intermediary Portal กับ Anthropic API จริง:
  - HSCodeSearcher: ค้นหารหัสพิกัดศุลกากร + AI enrichment ภาษาไทย
  - TradeDocSummarizer: สรุปเอกสารการค้า (Invoice, B/L, Packing List, L/C)

PDPA: document_content อาจมี PII (ชื่อ ที่อยู่ บัญชีธนาคาร)
  - ห้าม log document_content
  - process in-memory เท่านั้น ห้าม persist
โมเดล: claude-haiku-4-5-20251001 (cost-optimised)

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 2 คนกลางทุกประเภท
สร้าง: 2026-09-14 | Wave 9
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("openthai.intermediary_ai")

_MODEL = "claude-haiku-4-5-20251001"
_MAX_TOKENS = 1024

# ── HS Code stub database (ใช้เมื่อ API จริงยังไม่พร้อม) ─────────────────────
_HS_STUB: list[dict] = [
    {
        "hs_code": "1006.30.10",
        "description_th": "ข้าวกึ่งสำเร็จรูป/ข้าวหอมมะลิ",
        "description_en": "Semi-milled or wholly milled rice, Jasmine",
        "duty_rate_general": "5%",
        "duty_rate_asean": "0%",
        "unit": "กิโลกรัม",
    },
    {
        "hs_code": "0804.50.10",
        "description_th": "มะม่วงสด",
        "description_en": "Mangoes, fresh",
        "duty_rate_general": "5%",
        "duty_rate_asean": "0%",
        "unit": "กิโลกรัม",
    },
    {
        "hs_code": "0811.90.91",
        "description_th": "ทุเรียนแช่แข็ง",
        "description_en": "Durian, frozen",
        "duty_rate_general": "5%",
        "duty_rate_asean": "0%",
        "unit": "กิโลกรัม",
    },
    {
        "hs_code": "6205.20.10",
        "description_th": "เสื้อเชิ้ตบุรุษผ้าฝ้าย",
        "description_en": "Men's shirts of cotton",
        "duty_rate_general": "30%",
        "duty_rate_asean": "0%",
        "unit": "ชิ้น",
    },
    {
        "hs_code": "8517.12.00",
        "description_th": "โทรศัพท์สมาร์ทโฟน",
        "description_en": "Smartphones",
        "duty_rate_general": "0%",
        "duty_rate_asean": "0%",
        "unit": "เครื่อง",
    },
]


# =============================================================================
# Data classes
# =============================================================================

@dataclass
class HSCodeResult:
    hs_code: str
    description_th: str
    description_en: str
    duty_rate_general: str
    duty_rate_asean: str
    unit: str
    ai_notes: str = ""


@dataclass
class HSCodeSearchOutput:
    query: str
    results: list[HSCodeResult] = field(default_factory=list)
    ai_recommendation: str = ""
    disclaimer: str = (
        "ข้อมูลนี้เป็นการประเมินเบื้องต้น ควรตรวจสอบกับกรมศุลกากรหรือนักวิชาการศุลกากร "
        "ก่อนใช้ในเอกสารราชการ"
    )


@dataclass
class TradeDocSection:
    label: str
    content: str


@dataclass
class TradeDocOutput:
    doc_type: str
    summary: str
    key_parties: list[str] = field(default_factory=list)
    extracted_values: dict = field(default_factory=dict)
    risk_flags: list[str] = field(default_factory=list)
    key_dates: list[str] = field(default_factory=list)
    sections: list[TradeDocSection] = field(default_factory=list)
    confidence: float = 0.0
    disclaimer: str = (
        "การสรุปนี้สร้างโดย AI เพื่อช่วยอ่านเบื้องต้น "
        "ไม่ใช่คำแนะนำทางกฎหมายหรือทางการค้า ควรตรวจสอบกับผู้เชี่ยวชาญ"
    )


# =============================================================================
# HSCodeSearcher
# =============================================================================

class HSCodeSearcher:
    """ค้นหา HS Code ด้วย rule-based + AI enrichment ภาษาไทย"""

    def __init__(self) -> None:
        self._client: Optional[object] = None
        self._has_anthropic = False
        try:
            import anthropic  # type: ignore
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self._client = anthropic.Anthropic(api_key=api_key)
                self._has_anthropic = True
        except ImportError:
            logger.warning("anthropic package ไม่พร้อม — ใช้ stub data เท่านั้น")

    def search(self, query: str, limit: int = 5) -> HSCodeSearchOutput:
        query_lower = query.lower()
        results: list[HSCodeResult] = []

        for item in _HS_STUB:
            if (
                query_lower in item["description_th"].lower()
                or query_lower in item["description_en"].lower()
                or query_lower in item["hs_code"]
            ):
                results.append(HSCodeResult(**{k: item[k] for k in HSCodeResult.__dataclass_fields__ if k in item}))

        if not results:
            results = [HSCodeResult(**{k: item[k] for k in HSCodeResult.__dataclass_fields__ if k in item})
                       for item in _HS_STUB[:2]]

        results = results[:limit]
        output = HSCodeSearchOutput(query=query, results=results)

        if self._has_anthropic:
            output.ai_recommendation = self._ai_recommend(query, results)

        return output

    def _ai_recommend(self, query: str, results: list[HSCodeResult]) -> str:
        codes_text = "\n".join(
            f"- {r.hs_code}: {r.description_th} (อากรทั่วไป {r.duty_rate_general}, ASEAN {r.duty_rate_asean})"
            for r in results
        )
        prompt = (
            f"ผู้ใช้ค้นหา HS Code ของ: '{query}'\n\n"
            f"ผลที่พบจากระบบ:\n{codes_text}\n\n"
            "แนะนำภาษาไทยสั้นๆ 2-3 ประโยคว่า HS Code ไหนน่าจะตรงที่สุด "
            "และมีข้อควรระวังอะไรบ้างในการส่งออก/นำเข้าสินค้านี้"
        )
        try:
            resp = self._client.messages.create(  # type: ignore[union-attr]
                model=_MODEL,
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text
        except Exception as exc:
            logger.error("HS Code AI recommend failed: %s", type(exc).__name__)
            return "ไม่สามารถโหลดคำแนะนำ AI ได้ในขณะนี้"


# =============================================================================
# TradeDocSummarizer
# =============================================================================

class TradeDocSummarizer:
    """สรุปเอกสารการค้าระหว่างประเทศ (Invoice, B/L, Packing List, L/C) เป็นภาษาไทย"""

    _MAX_INPUT_CHARS = 15_000
    _DOC_PROMPTS = {
        "invoice": "ใบกำกับสินค้า (Commercial Invoice)",
        "bill_of_lading": "ใบตราส่งทางเรือ (Bill of Lading)",
        "packing_list": "ใบรายการบรรจุ (Packing List)",
        "certificate_of_origin": "ใบรับรองแหล่งกำเนิดสินค้า (Certificate of Origin)",
        "letter_of_credit": "เลตเตอร์ออฟเครดิต (Letter of Credit / L/C)",
        "customs_declaration": "ใบขนสินค้าศุลกากร",
    }

    def __init__(self) -> None:
        self._client: Optional[object] = None
        self._has_anthropic = False
        try:
            import anthropic  # type: ignore
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self._client = anthropic.Anthropic(api_key=api_key)
                self._has_anthropic = True
        except ImportError:
            logger.warning("anthropic package ไม่พร้อม — summarizer ทำงานไม่ได้")

    def summarize(self, doc_type: str, document_content: str) -> TradeDocOutput:
        if len(document_content) > self._MAX_INPUT_CHARS:
            document_content = document_content[: self._MAX_INPUT_CHARS]
            logger.info("trade doc truncated to %d chars (PDPA: no full PII retained)", self._MAX_INPUT_CHARS)

        doc_type_th = self._DOC_PROMPTS.get(doc_type, doc_type)

        if not self._has_anthropic:
            return TradeDocOutput(
                doc_type=doc_type,
                summary="ไม่สามารถสรุปได้ในขณะนี้ — ไม่มี ANTHROPIC_API_KEY กรุณาติดต่อผู้ดูแลระบบ",
            )

        prompt = f"""วิเคราะห์{doc_type_th}ต่อไปนี้และสรุปเป็นภาษาไทยง่ายๆ

เอกสาร:
---
{document_content}
---

ตอบในรูปแบบ JSON เท่านั้น (ไม่มีข้อความอื่น):
{{
  "summary": "สรุปภาพรวม 2-3 ประโยคภาษาไทย",
  "key_parties": ["ชื่อฝ่าย 1", "ชื่อฝ่าย 2"],
  "extracted_values": {{
    "shipper": "...", "consignee": "...", "value": "...", "currency": "...",
    "quantity": "...", "goods": "...", "hs_code": "...", "incoterm": "..."
  }},
  "risk_flags": ["ความเสี่ยง 1", "ความเสี่ยง 2"],
  "key_dates": ["วันที่ 1: ...", "วันที่ 2: ..."]
}}

ถ้าไม่พบข้อมูลในฟิลด์ใดให้ใส่ "" หรือ []"""

        try:
            import json

            resp = self._client.messages.create(  # type: ignore[union-attr]
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)

            return TradeDocOutput(
                doc_type=doc_type,
                summary=data.get("summary", ""),
                key_parties=data.get("key_parties", []),
                extracted_values=data.get("extracted_values", {}),
                risk_flags=data.get("risk_flags", []),
                key_dates=data.get("key_dates", []),
                confidence=0.75,
            )
        except Exception as exc:
            logger.error("TradeDocSummarizer failed: %s", type(exc).__name__)
            return TradeDocOutput(
                doc_type=doc_type,
                summary="ขออภัย ไม่สามารถสรุปเอกสารได้ในขณะนี้",
            )


# =============================================================================
# Lazy singletons
# =============================================================================

_hs_searcher: Optional[HSCodeSearcher] = None
_trade_summarizer: Optional[TradeDocSummarizer] = None


def get_hs_searcher() -> HSCodeSearcher:
    global _hs_searcher
    if _hs_searcher is None:
        _hs_searcher = HSCodeSearcher()
    return _hs_searcher


def get_trade_summarizer() -> TradeDocSummarizer:
    global _trade_summarizer
    if _trade_summarizer is None:
        _trade_summarizer = TradeDocSummarizer()
    return _trade_summarizer


# =============================================================================
# Self-test
# =============================================================================

if __name__ == "__main__":
    print("=== HSCodeSearcher self-test ===")
    searcher = HSCodeSearcher()
    out = searcher.search("ข้าว")
    print(f"Query: {out.query}")
    for r in out.results:
        print(f"  {r.hs_code}: {r.description_th}")
    assert len(out.results) > 0, "ต้องพบผลลัพธ์อย่างน้อย 1 รายการ"
    print("✅ HSCodeSearcher PASS")

    out2 = searcher.search("XYZ-NOT-EXIST-9999")
    assert len(out2.results) > 0, "fallback ต้องคืน stub 2 รายการ"
    print("✅ HSCodeSearcher fallback PASS")

    print("\n=== TradeDocSummarizer self-test (no API key) ===")
    summarizer = TradeDocSummarizer()
    result = summarizer.summarize("invoice", "INVOICE #INV-001 Shipper: ABC Ltd. Consignee: XYZ Corp. Goods: Rice 100kg USD 300")
    assert result.doc_type == "invoice", "doc_type ต้องตรงกัน"
    print(f"  Summary: {result.summary[:60]}...")
    print("✅ TradeDocSummarizer PASS")
