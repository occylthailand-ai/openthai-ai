"""Unit tests สำหรับ Entity Resolution — เน้น edge cases.

รัน:  cd services/trade-engine && pytest -q
(หรือ python -m pytest)
"""
import pytest

from app.ingestion.entity_resolution import (
    EntityResolver,
    name_similarity,
    normalize_name,
)


# ── normalize_name ────────────────────────────────────────────────────────────
@pytest.mark.parametrize("raw,expected", [
    ("Siam Trading Co., Ltd.", "siam"),
    ("SIAM TRADING CO LTD", "siam"),
    ("Siam Trading Company Limited", "siam"),
    ("  Siam   Trading  ", "siam"),
    ("Acme Corporation", "acme"),
])
def test_normalize_strips_legal_suffixes_and_punct(raw, expected):
    assert normalize_name(raw) == expected


def test_normalize_empty_and_none_safe():
    assert normalize_name("") == ""
    assert normalize_name("   ") == ""
    # ชื่อที่เหลือแต่ suffix ล้วน → ว่าง
    assert normalize_name("Co., Ltd.") == ""


def test_normalize_unicode_fullwidth():
    # อักขระเต็มความกว้าง (full-width) ต้องถูกพับให้เทียบกับ ASCII ได้
    assert normalize_name("ＡＣＭＥ") == "acme"


# ── name_similarity ───────────────────────────────────────────────────────────
def test_similarity_identical_after_normalize():
    assert name_similarity("Siam Trading Co., Ltd.", "SIAM TRADING CO LTD") == 1.0


def test_similarity_disjoint_is_zero():
    assert name_similarity("Acme", "Globex") == 0.0


def test_similarity_empty_is_zero():
    assert name_similarity("", "Acme") == 0.0


# ── EntityResolver: การจับคู่ ─────────────────────────────────────────────────
def test_resolver_merges_name_variants_to_one_entity():
    r = EntityResolver()
    a = r.resolve("Siam Trading Co., Ltd.", country="TH")
    b = r.resolve("SIAM TRADING CO LTD", country="TH")
    c = r.resolve("Siam Trading Company Limited", country="TH")
    assert a == b == c
    assert len(r.entities) == 1
    assert r.get(a).member_count == 3


def test_resolver_distinct_companies_stay_separate():
    r = EntityResolver()
    a = r.resolve("Acme Corporation", country="US")
    b = r.resolve("Globex International", country="US")
    assert a != b
    assert len(r.entities) == 2


def test_tax_id_match_wins_over_different_name():
    # คนละชื่อโดยสิ้นเชิงแต่ tax_id เดียวกัน → ต้องเป็น entity เดียว (สัญญาณแข็งแรงสุด)
    r = EntityResolver()
    a = r.resolve("Old Brand Co", country="TH", tax_id="0105551234567")
    b = r.resolve("New Rebranded Holdings", country="TH", tax_id="0105551234567")
    assert a == b
    ent = r.get(a)
    assert "0105551234567" in ent.tax_ids
    assert ent.member_count == 2


def test_country_blocking_prevents_false_positive():
    # ชื่อเหมือนกันเป๊ะแต่คนละประเทศ → ไม่ควร merge (กัน false positive)
    r = EntityResolver()
    a = r.resolve("Lotus Trading", country="TH")
    b = r.resolve("Lotus Trading", country="VN")
    assert a != b
    assert len(r.entities) == 2


def test_missing_country_does_not_block():
    # ถ้าฝั่งใดฝั่งหนึ่งไม่มี country → ยังจับคู่ตามชื่อได้
    r = EntityResolver()
    a = r.resolve("Mekong Foods Co Ltd", country="TH")
    b = r.resolve("Mekong Foods", country=None)
    assert a == b


def test_empty_name_without_taxid_creates_unique_entities():
    # ชื่อว่าง + ไม่มี tax_id แต่ละครั้งต้องเป็น entity แยก (resolve ไม่มั่นใจ)
    r = EntityResolver()
    a = r.resolve("", country="TH")
    b = r.resolve("   ", country="TH")
    assert a != b
    assert len(r.entities) == 2


def test_threshold_validation():
    with pytest.raises(ValueError):
        EntityResolver(threshold=0)
    with pytest.raises(ValueError):
        EntityResolver(threshold=1.5)


def test_high_threshold_requires_closer_match():
    # threshold สูง → ชื่อที่ต่างกันบางส่วนจะไม่ merge
    # normalize: {bangkok, premium, rice} vs {bangkok, rice} → Jaccard = 2/3 ≈ 0.67 < 0.95
    r = EntityResolver(threshold=0.95)
    a = r.resolve("Bangkok Premium Rice", country="TH")
    b = r.resolve("Bangkok Rice", country="TH")
    assert a != b


def test_alias_accumulates_for_later_match():
    # หลัง absorb alias ใหม่แล้ว record ถัดมาที่ตรงกับ alias นั้นต้อง match ได้
    r = EntityResolver()
    a = r.resolve("CP Foods", country="TH")
    r.resolve("Charoen Pokphand Foods", country="TH", tax_id="0107537000025")
    # อันนี้ตรงกับ alias แรก "CP Foods"
    c = r.resolve("CP Foods", country="TH")
    assert c == a
