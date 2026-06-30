"""Qdrant vector client — semantic search ของคำอธิบายสินค้า/บริษัท.

import qdrant แบบ lazy เพื่อให้ส่วนอื่นทดสอบได้โดยไม่ต้องมี Qdrant รัน.
"""
from __future__ import annotations

from functools import lru_cache

from .config import get_settings


@lru_cache
def get_vector_client():
    from qdrant_client import QdrantClient  # lazy import

    s = get_settings()
    return QdrantClient(host=s.qdrant_host, port=s.qdrant_port)


def ensure_collection(dim: int = 768) -> None:
    """สร้าง collection ถ้ายังไม่มี (idempotent)."""
    from qdrant_client.models import Distance, VectorParams

    s = get_settings()
    client = get_vector_client()
    existing = {c.name for c in client.get_collections().collections}
    if s.qdrant_collection not in existing:
        client.create_collection(
            collection_name=s.qdrant_collection,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
