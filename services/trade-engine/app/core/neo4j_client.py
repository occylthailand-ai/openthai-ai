"""Neo4j knowledge-graph client + Cypher คิวรีวิเคราะห์การกระจายสินค้าของคู่แข่ง.

โมเดลกราฟ:
    (:Company {canonical_id, name, country})
    (:Product {hs_code})
    (shipper:Company)-[:SHIPS {date, value_usd, weight_kg, source}]->(consignee:Company)
    (:Company)-[:TRADES]->(:Product)

import neo4j แบบ lazy เพื่อให้ทดสอบส่วนอื่นได้โดยไม่ต้องมี driver/DB.
"""
from __future__ import annotations

from contextlib import contextmanager
from functools import lru_cache

from .config import get_settings


@lru_cache
def get_neo4j_driver():
    from neo4j import GraphDatabase  # lazy import

    s = get_settings()
    if not s.neo4j_password:
        raise RuntimeError("NEO4J_PASSWORD ไม่ได้ตั้งค่า — ตั้งใน docker/.env ก่อนเชื่อมต่อ")
    return GraphDatabase.driver(s.neo4j_uri, auth=(s.neo4j_user, s.neo4j_password))


@contextmanager
def session():
    driver = get_neo4j_driver()
    sess = driver.session()
    try:
        yield sess
    finally:
        sess.close()


# ── Schema / constraints (idempotent) ────────────────────────────────────────
SCHEMA_CYPHER = [
    "CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.canonical_id IS UNIQUE",
    "CREATE CONSTRAINT product_hs IF NOT EXISTS FOR (p:Product) REQUIRE p.hs_code IS UNIQUE",
]


def apply_schema() -> None:
    with session() as s:
        for stmt in SCHEMA_CYPHER:
            s.run(stmt)


# ── Write: upsert ความสัมพันธ์การขนส่งหนึ่งรายการ ─────────────────────────────
UPSERT_SHIPMENT = """
MERGE (shipper:Company {canonical_id: $shipper_id})
  ON CREATE SET shipper.name = $shipper_name, shipper.country = $shipper_country
MERGE (consignee:Company {canonical_id: $consignee_id})
  ON CREATE SET consignee.name = $consignee_name, consignee.country = $consignee_country
MERGE (shipper)-[r:SHIPS {source_record_id: $source_record_id}]->(consignee)
  SET r.date = $date, r.value_usd = $value_usd, r.weight_kg = $weight_kg,
      r.hs_code = $hs_code, r.source = $source
WITH shipper, consignee
FOREACH (_ IN CASE WHEN $hs_code IS NULL THEN [] ELSE [1] END |
  MERGE (p:Product {hs_code: $hs_code})
  MERGE (shipper)-[:TRADES]->(p)
)
RETURN 1 AS written
"""


def upsert_shipment(s, params: dict) -> int:
    rec = s.run(UPSERT_SHIPMENT, **params).single()
    return int(rec["written"]) if rec else 0


# ─────────────────────────────────────────────────────────────────────────────
#  ANALYTICS — เจาะลึกการกระจายสินค้าของคู่แข่ง (competitor distribution)
# ─────────────────────────────────────────────────────────────────────────────

# คู่ค้า (ผู้รับสินค้า/distributor) ของคู่แข่ง เรียงตามมูลค่ารวม — เห็นว่าคู่แข่งส่งให้ใครบ้าง
COMPETITOR_DISTRIBUTORS = """
MATCH (comp:Company {canonical_id: $competitor_id})-[r:SHIPS]->(buyer:Company)
WHERE ($hs_code IS NULL OR r.hs_code = $hs_code)
  AND ($since IS NULL OR r.date >= date($since))
RETURN buyer.canonical_id AS buyer_id,
       buyer.name         AS buyer_name,
       buyer.country      AS buyer_country,
       count(r)           AS shipments,
       sum(coalesce(r.value_usd, 0)) AS total_value_usd,
       sum(coalesce(r.weight_kg, 0)) AS total_weight_kg
ORDER BY total_value_usd DESC
LIMIT $limit
"""

# ส่วนแบ่งตลาดตามประเทศปลายทางของคู่แข่ง — คู่แข่งกระจายสินค้าไปประเทศไหนมากสุด
COMPETITOR_COUNTRY_SHARE = """
MATCH (comp:Company {canonical_id: $competitor_id})-[r:SHIPS]->(buyer:Company)
WHERE ($hs_code IS NULL OR r.hs_code = $hs_code)
WITH buyer.country AS country, sum(coalesce(r.value_usd, 0)) AS value
WITH collect({country: country, value: value}) AS rows,
     sum(value) AS grand_total
UNWIND rows AS row
RETURN row.country AS country,
       row.value   AS value_usd,
       CASE WHEN grand_total = 0 THEN 0.0
            ELSE round(100.0 * row.value / grand_total, 2) END AS share_pct
ORDER BY value_usd DESC
"""

# ผู้ซื้อที่ทับซ้อน (shared buyers) ระหว่างเรากับคู่แข่ง — กลุ่มลูกค้าที่ต้องชิง
SHARED_BUYERS = """
MATCH (us:Company {canonical_id: $our_id})-[:SHIPS]->(buyer:Company)<-[:SHIPS]-(comp:Company {canonical_id: $competitor_id})
RETURN DISTINCT buyer.canonical_id AS buyer_id,
       buyer.name    AS buyer_name,
       buyer.country AS buyer_country
ORDER BY buyer_name
LIMIT $limit
"""


def competitor_distributors(s, competitor_id: str, hs_code: str | None = None,
                            since: str | None = None, limit: int = 25) -> list[dict]:
    rows = s.run(COMPETITOR_DISTRIBUTORS, competitor_id=competitor_id,
                 hs_code=hs_code, since=since, limit=limit)
    return [r.data() for r in rows]


def competitor_country_share(s, competitor_id: str, hs_code: str | None = None) -> list[dict]:
    rows = s.run(COMPETITOR_COUNTRY_SHARE, competitor_id=competitor_id, hs_code=hs_code)
    return [r.data() for r in rows]


def shared_buyers(s, our_id: str, competitor_id: str, limit: int = 50) -> list[dict]:
    rows = s.run(SHARED_BUYERS, our_id=our_id, competitor_id=competitor_id, limit=limit)
    return [r.data() for r in rows]
