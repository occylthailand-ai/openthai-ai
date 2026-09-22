"""
OpenThai AI ↔ Hermes Agent Bridge
===================================
FastAPI service ที่ทำหน้าที่เป็นตัวกลางระหว่าง OpenThai AI Backend กับ Hermes Agent

Architecture:
  openthai-ai (Vercel/FastAPI) 
       ↓  POST /api/generate
  hermes_bridge.py  ← รันบน VPS/localhost:8001
       ↓  calls Hermes OpenAI-compatible API
  Hermes Agent (localhost:8642)
       ↓  generates TikTok script
  Response → OpenThai AI

Run:
  uvicorn bridge.hermes_bridge:app --host 0.0.0.0 --port 8001 --reload

Dependencies:
  pip install fastapi uvicorn httpx python-dotenv
"""

import os
import json
import httpx
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/.hermes/.env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openthai-bridge")

app = FastAPI(
    title="OpenThai AI — Hermes Bridge",
    description="เชื่อม OpenThai AI กับ Hermes Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://openthai-ai.vercel.app", "http://localhost:3000", "*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Hermes runs its OpenAI-compatible server on port 8642 by default
HERMES_API_URL = os.getenv("HERMES_API_URL", "http://localhost:8642/v1")
HERMES_API_KEY = os.getenv("HERMES_GATEWAY_KEY", "openthai-hermes-secret")
BRIDGE_API_KEY = os.getenv("BRIDGE_API_KEY", "openthai-bridge-key")


# ===== Request/Response Models =====

class ScriptRequest(BaseModel):
    product_name: str
    product_type: Optional[str] = "ทั่วไป"
    price: Optional[str] = ""
    target_audience: Optional[str] = "คนไทยทั่วไป"
    language: Optional[str] = "th"  # th | en | zh
    user_id: Optional[str] = "anonymous"

class ScriptResponse(BaseModel):
    hook: str
    content: str
    cta: str
    hashtags: list[str]
    score: int
    tips: str
    generated_by: str = "hermes-agent"
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    hermes_connected: bool
    version: str


# ===== System Prompt =====

SYSTEM_PROMPT = """คุณคือ OpenThai AI — ผู้เชี่ยวชาญสร้าง TikTok Script สำหรับสินค้าไทย
เชี่ยวชาญ: สินค้า OTOP, สินค้าไทย-จีน, ของใช้ในบ้าน, แฟชั่น, อาหาร, เครื่องสำอาง

กฎการสร้าง Script:
1. HOOK (3 วิ): ดึงดูดทันที ใช้ pain point หรือ curiosity gap
2. CONTENT (20 วิ): จุดเด่น 3 ข้อ กระชับ เข้าใจง่าย ภาษาพูด
3. CTA (7 วิ): กระตุ้นให้ซื้อ/สอบถาม/กดติดตาม
4. HASHTAG: 10 ตัวที่แม่นยำ (5 ทั่วไป + 5 เฉพาะสินค้า)

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown หรือ backtick:
{
  "hook": "...",
  "content": "...",
  "cta": "...",
  "hashtags": ["#...", "#...", "#...", "#...", "#...", "#...", "#...", "#...", "#...", "#..."],
  "score": 85,
  "tips": "คำแนะนำปรับปรุง..."
}"""


# ===== Helper Functions =====

async def call_hermes(prompt: str, user_id: str = "anonymous") -> dict:
    """เรียก Hermes Agent ผ่าน OpenAI-compatible API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {
            "model": "hermes-agent",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.7,
            "user": user_id,
        }
        headers = {
            "Authorization": f"Bearer {HERMES_API_KEY}",
            "Content-Type": "application/json",
            "X-OpenThai-Source": "openthai-bridge/1.0",
        }

        response = await client.post(
            f"{HERMES_API_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Clean JSON response
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        return json.loads(content)


def build_prompt(req: ScriptRequest) -> str:
    price_str = f"\nราคา: {req.price}" if req.price else ""
    return f"""สร้าง TikTok Script สำหรับ:
สินค้า: {req.product_name}
ประเภท: {req.product_type}{price_str}
กลุ่มเป้าหมาย: {req.target_audience}
ภาษา: {"ไทย" if req.language == "th" else "English" if req.language == "en" else "中文"}

สร้าง script ที่น่าสนใจ สั้น กระชับ เหมาะกับ TikTok"""


# ===== API Endpoints =====

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ตรวจสอบสถานะ Bridge และ Hermes Agent"""
    hermes_ok = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{HERMES_API_URL.replace('/v1', '')}/health")
            hermes_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "status": "ok",
        "hermes_connected": hermes_ok,
        "version": "1.0.0"
    }


@app.post("/api/generate", response_model=ScriptResponse)
async def generate_script(
    request: ScriptRequest,
    x_api_key: Optional[str] = Header(None),
):
    """
    สร้าง TikTok Script ผ่าน Hermes Agent

    เรียกจาก OpenThai AI Backend:
    POST https://your-vps:8001/api/generate
    Headers: X-API-Key: your-bridge-key
    Body: {"product_name": "สบู่มะขาม", "price": "150 บาท"}
    """
    # Validate API key
    if x_api_key != BRIDGE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if not request.product_name.strip():
        raise HTTPException(status_code=400, detail="กรุณาระบุชื่อสินค้า")

    prompt = build_prompt(request)

    try:
        result = await call_hermes(prompt, request.user_id)
        return ScriptResponse(
            hook=result.get("hook", ""),
            content=result.get("content", ""),
            cta=result.get("cta", ""),
            hashtags=result.get("hashtags", []),
            score=result.get("score", 0),
            tips=result.get("tips", ""),
            generated_by="hermes-agent",
            timestamp=datetime.utcnow().isoformat(),
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="ไม่สามารถเชื่อมต่อ Hermes Agent ได้ — กรุณาตรวจสอบว่า hermes gateway รันอยู่"
        )
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Hermes ส่ง response ผิดรูปแบบ")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/batch", response_model=list[ScriptResponse])
async def batch_generate(
    requests: list[ScriptRequest],
    x_api_key: Optional[str] = Header(None),
):
    """สร้าง script หลายชิ้นพร้อมกัน (สูงสุด 10 ชิ้น)"""
    if x_api_key != BRIDGE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if len(requests) > 10:
        raise HTTPException(status_code=400, detail="สูงสุด 10 ชิ้นต่อครั้ง")

    import asyncio
    results = await asyncio.gather(
        *[generate_script(req, x_api_key) for req in requests],
        return_exceptions=True
    )

    return [r for r in results if isinstance(r, ScriptResponse)]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
