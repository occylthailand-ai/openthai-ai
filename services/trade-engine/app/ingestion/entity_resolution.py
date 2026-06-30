"""Entity Resolution — รวมบริษัทเดียวกันที่สะกด/เขียนต่างกันให้เป็น canonical entity เดียว.

ปัญหา: ข้อมูลการค้าจาก 6 แพลตฟอร์มเขียนชื่อบริษัทไม่เหมือนกัน เช่น
    "Siam Trading Co., Ltd."  /  "SIAM TRADING CO LTD"  /  "Siam Trading Company Limited"
ทั้งหมดคือบริษัทเดียว. โมดูลนี้ normalize + จับคู่ด้วย similarity แบบ deterministic
(ไม่พึ่ง network/DB) จึงทดสอบ edge case ได้ครบและ reproducible.

อัลกอริทึม (เร็ว, อธิบายได้):
  1. normalize_name() — lowercase, ตัด legal suffix, ตัด punctuation, ยุบ whitespace
  2. ถ้ามี tax_id ตรงกัน → match ทันที (สัญญาณแข็งแรงที่สุด)
  3. มิฉะนั้นใช้ token-set Jaccard + ใช้ country เป็น tie-breaker/blocking key
"""
from __future__ import annotations

import re
import unicodedata
import uuid
from dataclasses import dataclass, field

# คำต่อท้ายเชิงกฎหมาย (legal suffixes) หลายภาษา — ตัดทิ้งก่อนเทียบ
_LEGAL_SUFFIXES = {
    "co", "ltd", "limited", "inc", "incorporated", "corp", "corporation",
    "llc", "llp", "plc", "gmbh", "ag", "sa", "srl", "bv", "nv", "pte",
    "company", "trading", "international", "intl", "group", "holdings",
    "enterprise", "enterprises", "industries", "industry", "manufacturing",
    "import", "export", "imports", "exports",
    # ไทย
    "บริษัท", "จำกัด", "มหาชน", "หจก", "หสน",
}

_PUNCT_RE = re.compile(r"[^\w\s]", flags=re.UNICODE)
_WS_RE = re.compile(r"\s+", flags=re.UNICODE)


def normalize_name(name: str) -> str:
    """คืนชื่อมาตรฐานสำหรับเทียบ: lowercase, ตัด suffix/เครื่องหมาย, ยุบช่องว่าง."""
    if not name:
        return ""
    # แปลง unicode ให้อยู่ในรูปแบบเดียว (NFKC) เพื่อรองรับอักขระเต็ม/ครึ่ง
    text = unicodedata.normalize("NFKC", name).lower()
    text = _PUNCT_RE.sub(" ", text)
    tokens = [t for t in _WS_RE.split(text) if t and t not in _LEGAL_SUFFIXES]
    return " ".join(tokens).strip()


def name_similarity(a: str, b: str) -> float:
    """Jaccard บน token set ของชื่อที่ normalize แล้ว — คืนค่า 0.0–1.0."""
    ta, tb = set(normalize_name(a).split()), set(normalize_name(b).split())
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union


@dataclass
class CanonicalEntity:
    canonical_id: str
    display_name: str
    country: str | None
    tax_ids: set[str] = field(default_factory=set)
    aliases: set[str] = field(default_factory=set)
    member_count: int = 0


class EntityResolver:
    """In-memory resolver. ใช้ tax_id เป็น exact key และชื่อเป็น fuzzy fallback.

    threshold: ค่าความคล้ายขั้นต่ำที่จะถือว่าเป็นบริษัทเดียวกัน (default 0.6).
    """

    def __init__(self, threshold: float = 0.6) -> None:
        if not 0.0 < threshold <= 1.0:
            raise ValueError("threshold ต้องอยู่ในช่วง (0, 1]")
        self.threshold = threshold
        self._entities: dict[str, CanonicalEntity] = {}
        self._tax_index: dict[str, str] = {}  # tax_id -> canonical_id

    @staticmethod
    def _new_id() -> str:
        return f"ent_{uuid.uuid4().hex[:12]}"

    def resolve(self, name: str, country: str | None = None, tax_id: str | None = None) -> str:
        """คืน canonical_id ของบริษัท — สร้างใหม่ถ้าไม่พบคู่ที่เข้าเกณฑ์."""
        norm = normalize_name(name)
        tax_id = (tax_id or "").strip() or None
        country = (country or "").strip().upper() or None

        # 1) tax_id ตรง = สัญญาณแข็งแรงสุด ใช้ก่อนเสมอ
        if tax_id and tax_id in self._tax_index:
            cid = self._tax_index[tax_id]
            self._absorb(cid, name, country, tax_id)
            return cid

        # ชื่อว่างเปล่าหลัง normalize และไม่มี tax_id → ไม่สามารถ resolve ได้อย่างมั่นใจ
        if not norm and not tax_id:
            cid = self._create(name, country, tax_id)
            return cid

        # 2) fuzzy match บนชื่อ — blocking ด้วย country (ถ้าทั้งคู่มี country ต้องตรง)
        best_id, best_score = None, 0.0
        for cid, ent in self._entities.items():
            if country and ent.country and country != ent.country:
                continue  # คนละประเทศ ไม่จับคู่ (ลด false positive)
            score = max((name_similarity(name, alias) for alias in ent.aliases), default=0.0)
            if score > best_score:
                best_id, best_score = cid, score

        if best_id is not None and best_score >= self.threshold:
            self._absorb(best_id, name, country, tax_id)
            return best_id

        return self._create(name, country, tax_id)

    def _create(self, name: str, country: str | None, tax_id: str | None) -> str:
        cid = self._new_id()
        ent = CanonicalEntity(canonical_id=cid, display_name=name.strip(), country=country)
        ent.aliases.add(name.strip())
        ent.member_count = 1
        if tax_id:
            ent.tax_ids.add(tax_id)
            self._tax_index[tax_id] = cid
        self._entities[cid] = ent
        return cid

    def _absorb(self, cid: str, name: str, country: str | None, tax_id: str | None) -> None:
        ent = self._entities[cid]
        ent.aliases.add(name.strip())
        ent.member_count += 1
        if country and not ent.country:
            ent.country = country
        if tax_id:
            ent.tax_ids.add(tax_id)
            self._tax_index[tax_id] = cid

    def get(self, canonical_id: str) -> CanonicalEntity | None:
        return self._entities.get(canonical_id)

    @property
    def entities(self) -> list[CanonicalEntity]:
        return list(self._entities.values())
