"""Unified JSON Schema สำหรับข้อมูลการค้าจาก 6 แพลตฟอร์ม
(TradeInt · Volza · Tendata · RocketReach · ImportGenius + manual).

ทุกแพลตฟอร์มถูก normalize เข้าสู่ TradeRecord เดียวกัน เพื่อให้ entity resolution
และ knowledge graph ทำงานข้ามแหล่งข้อมูลได้.
"""
from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SourcePlatform(str, Enum):
    tradeint = "tradeint"
    volza = "volza"
    tendata = "tendata"
    rocketreach = "rocketreach"
    importgenius = "importgenius"
    manual = "manual"


class TradeDirection(str, Enum):
    import_ = "import"
    export = "export"


class Company(BaseModel):
    """หน่วยงาน/บริษัทคู่ค้า — ก่อนผ่าน entity resolution อาจมีหลายชื่อสะกดต่างกัน."""

    name: str = Field(..., description="ชื่อบริษัทตามเอกสารต้นทาง (raw)")
    country: Optional[str] = Field(None, description="รหัสประเทศ ISO-3166 alpha-2 เช่น TH, CN, US")
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, description="เลขประจำตัวผู้เสียภาษี/registration ถ้ามี")
    # ป้ายกำกับหลัง entity resolution (เติมโดย pipeline)
    canonical_id: Optional[str] = Field(None, description="canonical entity id หลัง resolve")


class TradeRecord(BaseModel):
    """หนึ่งธุรกรรมการค้า (shipment) ที่ normalize แล้ว."""

    source: SourcePlatform
    source_record_id: Optional[str] = Field(None, description="id ต้นทางเพื่อ dedupe/อ้างกลับ")
    direction: TradeDirection

    shipper: Company
    consignee: Company

    hs_code: Optional[str] = Field(None, description="พิกัดศุลกากร HS (6-10 หลัก)")
    product_description: str = Field("", description="คำอธิบายสินค้า (raw, อาจคลีนต่อด้วย LLM)")

    quantity: Optional[float] = None
    unit: Optional[str] = None
    weight_kg: Optional[float] = None
    value_usd: Optional[float] = None

    shipment_date: Optional[date] = None
    origin_country: Optional[str] = None
    destination_country: Optional[str] = None

    raw: dict = Field(default_factory=dict, description="payload ดิบจากต้นทาง เผื่อ audit/ย้อนกลับ")


class IngestRequest(BaseModel):
    records: list[TradeRecord] = Field(..., min_length=1, max_length=1000)
    # ถ้า True จะรัน LLM data-cleaning ของ product_description ด้วย
    clean_with_llm: bool = False


class IngestResponse(BaseModel):
    accepted: int
    resolved_entities: int
    skipped_duplicates: int
    graph_writes: int
    warnings: list[str] = Field(default_factory=list)
