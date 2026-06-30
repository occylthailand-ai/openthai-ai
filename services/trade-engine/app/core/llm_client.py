"""LLM client — Anthropic Claude สำหรับ data-cleaning คำอธิบายสินค้า.

แยก get_llm_client() (lazy) เพื่อให้ test mock ได้ และ import anthropic เฉพาะตอนใช้จริง
(โมดูล entity_resolution / test จึงไม่ต้องติดตั้ง anthropic).
"""
from __future__ import annotations

from functools import lru_cache

from .config import get_settings


@lru_cache
def get_llm_client():
    from anthropic import Anthropic  # import แบบ lazy

    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า — ตั้งใน docker/.env ก่อนใช้ LLM cleaning")
    return Anthropic(api_key=settings.anthropic_api_key)


def clean_product_description(raw: str) -> str:
    """คลีนคำอธิบายสินค้าดิบ (ตัวย่อ/พิมพ์ผิด/ภาษาปน) ให้เป็นข้อความมาตรฐานสั้น ๆ."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    settings = get_settings()
    client = get_llm_client()
    msg = client.messages.create(
        model=settings.llm_model,
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": (
                "Normalize this customs product description into a concise, standardized "
                "English product name (max 12 words, no shipping jargon). "
                f"Return only the cleaned text.\n\n{raw[:500]}"
            ),
        }],
    )
    return (msg.content[0].text or "").strip()
