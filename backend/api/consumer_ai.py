"""
OpenThai.ai — Consumer AI Integration (Wave 8, Task 8.1)
consumer_ai.py

เชื่อม Consumer Portal กับ Anthropic API จริง:
  - WelfareChecker: ตรวจสิทธิสวัสดิการ 6 โปรแกรม
  - ContractSummarizer: ย่อสัญญา/TOS เป็นภาษาไทยอ่านง่าย

PDPA: ไม่ log user input โดยตรง, ไม่เก็บข้อมูลส่วนบุคคลใน AI call
โมเดล: claude-haiku-4-5-20251001 (cost-optimised)

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 4 ผู้บริโภค
สร้าง: 2026-09-14 | Wave 8
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("openthai.consumer_ai")

# ── Model ──────────────────────────────────────────────────────────────────────
_MODEL = "claude-haiku-4-5-20251001"
_MAX_TOKENS = 1024

# ── Welfare programme definitions ─────────────────────────────────────────────
_WELFARE_PROGRAMMES = [
    {
        "id": "baan_khon_jon",
        "name": "บัตรสวัสดิการแห่งรัฐ (บัตรคนจน)",
        "criteria": "รายได้ต่อปีไม่เกิน 100,000 บาท ไม่มีทรัพย์สินเกินเกณฑ์",
        "link": "https://govwelfare.cgd.go.th",
        "income_threshold_annual": 100_000,
    },
    {
        "id": "sso",
        "name": "ประกันสังคม (มาตรา 33/39/40)",
        "criteria": "ลูกจ้างเอกชน/ผู้ประกอบอาชีพอิสระที่ขึ้นทะเบียน",
        "link": "https://www.sso.go.th",
        "income_threshold_annual": None,
    },
    {
        "id": "elderly_allowance",
        "name": "เบี้ยยังชีพผู้สูงอายุ",
        "criteria": "อายุ 60 ปีขึ้นไป มีสัญชาติไทย",
        "link": "https://www.dla.go.th",
        "income_threshold_annual": None,
        "age_min": 60,
    },
    {
        "id": "disability_allowance",
        "name": "เบี้ยความพิการ",
        "criteria": "มีบัตรประจำตัวคนพิการ",
        "link": "https://dep.go.th",
        "income_threshold_annual": None,
    },
    {
        "id": "child_subsidy",
        "name": "เงินอุดหนุนบุตร",
        "criteria": "บุตรอายุต่ำกว่า 6 ปี รายได้ครัวเรือนต่ำกว่า 100,000 บาทต่อปี",
        "link": "https://csgcheck.dcy.go.th",
        "income_threshold_annual": 100_000,
    },
    {
        "id": "korch",
        "name": "กองทุนการออมแห่งชาติ (กอช.)",
        "criteria": "อายุ 15–60 ปี ไม่ใช่สมาชิกกองทุนบำนาญอื่น",
        "link": "https://www.nsf.or.th",
        "income_threshold_annual": None,
        "age_min": 15,
        "age_max": 60,
    },
]


# =============================================================================
# Data classes
# =============================================================================

@dataclass
class WelfareInput:
    age: int
    monthly_income: float          # บาทต่อเดือน
    num_children_under_6: int = 0
    has_disability_card: bool = False
    is_employed: bool = True
    province: str = ""


@dataclass
class WelfareResult:
    eligible: list[dict] = field(default_factory=list)
    possibly_eligible: list[dict] = field(default_factory=list)
    not_eligible: list[dict] = field(default_factory=list)
    disclaimer: str = (
        "ผลนี้เป็นการประเมินเบื้องต้นจาก AI เท่านั้น "
        "กรุณาตรวจสอบกับหน่วยงานที่รับผิดชอบโดยตรงก่อนดำเนินการ"
    )
    ai_summary: str = ""


@dataclass
class ContractSummary:
    duties: list[str] = field(default_factory=list)          # หน้าที่ของคู่สัญญา
    rights: list[str] = field(default_factory=list)           # สิทธิที่ได้รับ
    prohibitions: list[str] = field(default_factory=list)     # ข้อห้าม
    risks: list[str] = field(default_factory=list)            # ความเสี่ยง
    important_dates: list[str] = field(default_factory=list)  # วันสำคัญ
    plain_summary: str = ""
    disclaimer: str = (
        "สรุปนี้สร้างโดย AI เพื่อช่วยอ่านเบื้องต้น "
        "ไม่ใช่คำแนะนำทางกฎหมาย กรุณาปรึกษาทนายความก่อนลงนาม"
    )


# =============================================================================
# WelfareChecker
# =============================================================================

class WelfareChecker:
    """ตรวจสิทธิสวัสดิการ 6 โปรแกรมด้วย rule-based + AI enrichment"""

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
            logger.warning("anthropic package ไม่พร้อม ใช้ rule-based เท่านั้น")

    def check(self, inp: WelfareInput) -> WelfareResult:
        result = WelfareResult()
        annual_income = inp.monthly_income * 12

        for prog in _WELFARE_PROGRAMMES:
            pid = prog["id"]
            eligible = None  # None = unknown

            if pid == "baan_khon_jon":
                eligible = annual_income <= prog["income_threshold_annual"]  # type: ignore[arg-type]
            elif pid == "sso":
                eligible = inp.is_employed
            elif pid == "elderly_allowance":
                eligible = inp.age >= prog.get("age_min", 0)
            elif pid == "disability_allowance":
                eligible = inp.has_disability_card
            elif pid == "child_subsidy":
                eligible = (
                    inp.num_children_under_6 > 0
                    and annual_income <= prog["income_threshold_annual"]  # type: ignore[arg-type]
                )
            elif pid == "korch":
                age_ok = prog.get("age_min", 0) <= inp.age <= prog.get("age_max", 999)
                eligible = age_ok and not inp.is_employed

            entry = {
                "id": pid,
                "name": prog["name"],
                "link": prog["link"],
                "criteria": prog["criteria"],
            }
            if eligible is True:
                result.eligible.append(entry)
            elif eligible is False:
                result.not_eligible.append(entry)
            else:
                result.possibly_eligible.append(entry)

        if self._has_anthropic and result.eligible:
            result.ai_summary = self._enrich_with_ai(inp, result)

        return result

    def _enrich_with_ai(self, inp: WelfareInput, result: WelfareResult) -> str:
        import anthropic  # type: ignore

        eligible_names = [e["name"] for e in result.eligible]
        # PDPA: ส่งเฉพาะข้อมูลที่จำเป็น ไม่ใช่ชื่อ/เลขบัตร
        prompt = (
            f"ผู้ใช้อายุ {inp.age} ปี รายได้ต่อเดือนประมาณ {int(inp.monthly_income):,} บาท "
            f"{'มีบุตรอายุต่ำกว่า 6 ปี' if inp.num_children_under_6 > 0 else ''} "
            f"{'มีบัตรคนพิการ' if inp.has_disability_card else ''}\n\n"
            f"โปรแกรมสวัสดิการที่น่าจะมีสิทธิ์: {', '.join(eligible_names)}\n\n"
            "สรุปขั้นตอนที่ต้องทำเพื่อยื่นขอสวัสดิการเหล่านี้ เป็นภาษาไทยง่าย ๆ 3-5 ข้อ "
            "ห้ามแนะนำข้อมูลที่ต้องการหลักฐานที่ไม่แน่ชัด"
        )
        try:
            resp = self._client.messages.create(  # type: ignore[union-attr]
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text
        except Exception as exc:
            logger.error("AI enrich failed: %s", type(exc).__name__)
            return "ไม่สามารถโหลดคำแนะนำเพิ่มเติมได้ในขณะนี้"


# =============================================================================
# ContractSummarizer
# =============================================================================

class ContractSummarizer:
    """ย่อสัญญา/TOS เป็น 5 หมวดภาษาไทยอ่านง่าย ระดับ ป.6"""

    _MAX_INPUT_CHARS = 10_000

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

    def summarize(self, contract_text: str) -> ContractSummary:
        if len(contract_text) > self._MAX_INPUT_CHARS:
            contract_text = contract_text[: self._MAX_INPUT_CHARS]
            logger.info("contract truncated to %d chars (PDPA: no full PII retained)", self._MAX_INPUT_CHARS)

        if not self._has_anthropic:
            return ContractSummary(
                plain_summary="ไม่สามารถสรุปได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ"
            )

        prompt = f"""วิเคราะห์สัญญา/ข้อตกลงต่อไปนี้และสรุปเป็นภาษาไทยง่าย ๆ ระดับ ป.6

ข้อความสัญญา:
---
{contract_text}
---

ตอบในรูปแบบ JSON เท่านั้น (ไม่มีข้อความอื่น):
{{
  "duties": ["หน้าที่ที่ต้องทำ 1", "หน้าที่ที่ต้องทำ 2"],
  "rights": ["สิทธิที่ได้รับ 1", "สิทธิที่ได้รับ 2"],
  "prohibitions": ["ข้อห้าม 1", "ข้อห้าม 2"],
  "risks": ["ความเสี่ยง 1", "ความเสี่ยง 2"],
  "important_dates": ["วันสำคัญ 1", "วันสำคัญ 2"],
  "plain_summary": "สรุป 2-3 ประโยคภาษาไทยง่ายมาก"
}}

ถ้าไม่มีข้อมูลในหมวดใด ให้ใส่ list ว่าง []"""

        try:
            import anthropic  # type: ignore
            import json

            resp = self._client.messages.create(  # type: ignore[union-attr]
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
            # strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            return ContractSummary(
                duties=data.get("duties", []),
                rights=data.get("rights", []),
                prohibitions=data.get("prohibitions", []),
                risks=data.get("risks", []),
                important_dates=data.get("important_dates", []),
                plain_summary=data.get("plain_summary", ""),
            )
        except Exception as exc:
            logger.error("ContractSummarizer failed: %s", type(exc).__name__)
            return ContractSummary(plain_summary="ขออภัย ไม่สามารถสรุปสัญญาได้ในขณะนี้")


# =============================================================================
# FastAPI route wiring helper — ใช้ใน routes_wave7.py
# =============================================================================

_welfare_checker: Optional[WelfareChecker] = None
_contract_summarizer: Optional[ContractSummarizer] = None


def get_welfare_checker() -> WelfareChecker:
    global _welfare_checker
    if _welfare_checker is None:
        _welfare_checker = WelfareChecker()
    return _welfare_checker


def get_contract_summarizer() -> ContractSummarizer:
    global _contract_summarizer
    if _contract_summarizer is None:
        _contract_summarizer = ContractSummarizer()
    return _contract_summarizer
