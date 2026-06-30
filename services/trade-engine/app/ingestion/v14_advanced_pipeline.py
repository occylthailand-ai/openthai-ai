"""Ingestion pipeline — normalize → entity-resolve → (optional LLM clean) → graph write.

ออกแบบให้ทดสอบได้: รับ resolver มาฉีด (dependency injection) และเขียนกราฟผ่าน callback
จึงรันได้โดยไม่ต้องมี Neo4j จริงระหว่างเทสต์.
"""
from __future__ import annotations

import logging
from typing import Callable

from ..schemas import IngestResponse, TradeRecord
from .entity_resolution import EntityResolver

log = logging.getLogger("trade-engine.pipeline")

# callback ที่เขียน 1 shipment ลงกราฟ คืนจำนวน write (0/1) — inject ของจริงตอน runtime
GraphWriter = Callable[[dict], int]


def _noop_writer(_: dict) -> int:
    return 0


def run_pipeline(
    records: list[TradeRecord],
    resolver: EntityResolver | None = None,
    graph_writer: GraphWriter = _noop_writer,
    clean_with_llm: bool = False,
) -> IngestResponse:
    resolver = resolver or EntityResolver()
    warnings: list[str] = []
    seen_keys: set[str] = set()
    accepted = skipped = graph_writes = 0

    for rec in records:
        # de-dupe ตาม (source, source_record_id) ถ้ามี
        if rec.source_record_id:
            key = f"{rec.source.value}:{rec.source_record_id}"
            if key in seen_keys:
                skipped += 1
                continue
            seen_keys.add(key)

        shipper_id = resolver.resolve(rec.shipper.name, rec.shipper.country, rec.shipper.tax_id)
        consignee_id = resolver.resolve(rec.consignee.name, rec.consignee.country, rec.consignee.tax_id)
        rec.shipper.canonical_id = shipper_id
        rec.consignee.canonical_id = consignee_id

        description = rec.product_description
        if clean_with_llm and description:
            try:
                from ..core.llm_client import clean_product_description
                description = clean_product_description(description)
            except Exception as e:  # noqa: BLE001 — LLM optional, อย่าให้ล้ม batch
                warnings.append(f"LLM clean ล้มเหลวที่ record {rec.source_record_id}: {e}")

        try:
            graph_writes += graph_writer({
                "shipper_id": shipper_id,
                "shipper_name": rec.shipper.name,
                "shipper_country": rec.shipper.country,
                "consignee_id": consignee_id,
                "consignee_name": rec.consignee.name,
                "consignee_country": rec.consignee.country,
                "source_record_id": rec.source_record_id or "",
                "date": rec.shipment_date.isoformat() if rec.shipment_date else None,
                "value_usd": rec.value_usd,
                "weight_kg": rec.weight_kg,
                "hs_code": rec.hs_code,
                "source": rec.source.value,
            })
        except Exception as e:  # noqa: BLE001
            warnings.append(f"graph write ล้มเหลวที่ record {rec.source_record_id}: {e}")

        accepted += 1

    return IngestResponse(
        accepted=accepted,
        resolved_entities=len(resolver.entities),
        skipped_duplicates=skipped,
        graph_writes=graph_writes,
        warnings=warnings,
    )
