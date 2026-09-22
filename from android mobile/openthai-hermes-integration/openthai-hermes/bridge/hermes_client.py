"""
OpenThai AI Backend — Hermes Integration Patch
================================================
แทนที่การเรียก Claude API โดยตรงด้วยการเรียกผ่าน Hermes Bridge

วิธีใช้:
1. แทนที่โค้ดเดิมที่เรียก anthropic.messages.create() ด้วย generate_script_via_hermes()
2. ตั้งค่า HERMES_BRIDGE_URL ใน environment variables
3. Hermes จะจัดการ memory, logging, และ multi-platform routing ให้อัตโนมัติ

ไฟล์นี้ใส่ใน: C:\\Projects\\openthai-ai\\backend\\hermes_client.py
"""

import os
import httpx
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger("openthai-hermes-client")

# ตั้งค่าใน .env ของ OpenThai AI
HERMES_BRIDGE_URL = os.getenv("HERMES_BRIDGE_URL", "http://localhost:8001")
BRIDGE_API_KEY = os.getenv("BRIDGE_API_KEY", "openthai-bridge-key")


@dataclass
class ScriptResult:
    hook: str
    content: str
    cta: str
    hashtags: list
    score: int
    tips: str
    success: bool = True
    error: str = ""

    def to_dict(self):
        return {
            "hook": self.hook,
            "content": self.content,
            "cta": self.cta,
            "hashtags": self.hashtags,
            "score": self.score,
            "tips": self.tips,
        }

    def to_text(self):
        return f"""🎬 TikTok Script
━━━━━━━━━━━━━━━━━━━━
⚡ Hook (3 วิ)
{self.hook}

📖 เนื้อหา (20 วิ)
{self.content}

📣 CTA (7 วิ)
{self.cta}

#️⃣ Hashtag
{' '.join(self.hashtags)}

📊 คะแนน: {self.score}/100
💡 {self.tips}
━━━━━━━━━━━━━━━━━━━━"""


async def generate_script_via_hermes(
    product_name: str,
    product_type: str = "ทั่วไป",
    price: str = "",
    target_audience: str = "คนไทยทั่วไป",
    user_id: str = "anonymous",
    language: str = "th",
) -> ScriptResult:
    """
    สร้าง TikTok script ผ่าน Hermes Agent Bridge
    
    ตัวอย่าง:
        result = await generate_script_via_hermes(
            product_name="สบู่มะขามสด",
            price="150 บาท",
            user_id="user_123"
        )
        print(result.to_text())
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HERMES_BRIDGE_URL}/api/generate",
                json={
                    "product_name": product_name,
                    "product_type": product_type,
                    "price": price,
                    "target_audience": target_audience,
                    "user_id": user_id,
                    "language": language,
                },
                headers={
                    "X-API-Key": BRIDGE_API_KEY,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
            return ScriptResult(**{k: data[k] for k in ScriptResult.__dataclass_fields__ if k in data})

    except httpx.ConnectError:
        logger.error("Cannot connect to Hermes Bridge — falling back to direct API")
        return await _fallback_direct_claude(product_name, product_type, price, target_audience)
    except Exception as e:
        logger.error(f"Hermes Bridge error: {e}")
        return ScriptResult(
            hook="", content="", cta="", hashtags=[], score=0, tips="",
            success=False, error=str(e)
        )


async def _fallback_direct_claude(
    product_name: str, product_type: str, price: str, target_audience: str
) -> ScriptResult:
    """
    Fallback: เรียก Claude API โดยตรงหาก Hermes Bridge ไม่พร้อมใช้งาน
    """
    import anthropic
    import json

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    price_str = f"\nราคา: {price}" if price else ""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system="""คุณคือ OpenThai AI สร้าง TikTok Script ตอบเป็น JSON:
{"hook":"...","content":"...","cta":"...","hashtags":["#..."],"score":85,"tips":"..."}""",
        messages=[{
            "role": "user",
            "content": f"สินค้า: {product_name}\nประเภท: {product_type}{price_str}\nกลุ่มเป้าหมาย: {target_audience}"
        }]
    )

    raw = message.content[0].text.strip()
    data = json.loads(raw)
    return ScriptResult(**{k: data[k] for k in ScriptResult.__dataclass_fields__ if k in data})


# ===== ตัวอย่างการใช้งานใน FastAPI endpoint เดิม =====
#
# BEFORE (เดิม):
# @app.post("/api/generate")
# async def generate(req: Request):
#     body = await req.json()
#     # เรียก Claude โดยตรง
#     result = anthropic_client.messages.create(...)
#     return result
#
# AFTER (ใหม่ — ใช้ Hermes):
# from hermes_client import generate_script_via_hermes
#
# @app.post("/api/generate")
# async def generate(req: Request):
#     body = await req.json()
#     result = await generate_script_via_hermes(
#         product_name=body["product_name"],
#         price=body.get("price", ""),
#         user_id=body.get("user_id", "anonymous"),
#     )
#     if not result.success:
#         raise HTTPException(500, detail=result.error)
#     return result.to_dict()
