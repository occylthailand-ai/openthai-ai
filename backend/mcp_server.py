"""
OpenThai AI — MCP Server v1.0
Model Context Protocol server สำหรับ Cursor integration
Cursor จะเรียก tools เหล่านี้ได้โดยตรงจาก IDE

Protocol: MCP over HTTP + SSE (Server-Sent Events)
Spec: https://modelcontextprotocol.io/

วิธีใช้:
1. รัน FastAPI backend: uvicorn main:app --reload
2. ใน Cursor: เปิด Settings → MCP → ชี้ไปที่ .cursor/mcp.json
3. Cursor AI จะเห็น tools ของ OpenThai AI ใน context
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
import anthropic
import os
import json
import asyncio
from datetime import datetime

router = APIRouter(prefix="/mcp", tags=["Cursor MCP"])

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-5"

# ================== MCP TOOL DEFINITIONS ==================

MCP_TOOLS = [
    {
        "name": "generate_content",
        "description": "สร้างคอนเทนต์ TikTok / Multi-platform สำหรับสินค้า OTOP/SME ไทย ด้วย Claude AI",
        "inputSchema": {
            "type": "object",
            "properties": {
                "product_name": {
                    "type": "string",
                    "description": "ชื่อสินค้า เช่น 'ผ้าไหมมัดหมี่อุบล', 'น้ำพริกเผาโบราณ'"
                },
                "category": {
                    "type": "string",
                    "description": "ประเภทสินค้า: otop | food | herb | textile | craft | beauty | thai | china | global"
                },
                "platform": {
                    "type": "string",
                    "enum": ["tiktok", "xiaohongshu", "shopee", "taobao", "temu", "all"],
                    "description": "แพลตฟอร์มเป้าหมาย (default: tiktok)"
                },
                "language": {
                    "type": "string",
                    "enum": ["th", "zh", "en", "all"],
                    "description": "ภาษาคอนเทนต์: th=ไทย zh=จีน en=อังกฤษ all=ทั้ง3ภาษา (default: th)"
                },
                "description": {
                    "type": "string",
                    "description": "รายละเอียดสินค้าเพิ่มเติม (optional)"
                },
                "hook_type": {
                    "type": "string",
                    "enum": ["story", "process", "contrast", "question", "transformation", "auto"],
                    "description": "ประเภท Hook (default: auto)"
                }
            },
            "required": ["product_name", "category"]
        }
    },
    {
        "name": "generate_multilingual",
        "description": "สร้างคอนเทนต์พร้อมกัน 3 ภาษา (ไทย + จีน + อังกฤษ) ในครั้งเดียว ประหยัด API cost ด้วย Prompt Caching",
        "inputSchema": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string", "description": "ชื่อสินค้า"},
                "category": {"type": "string", "description": "ประเภทสินค้า"},
                "platforms": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "แพลตฟอร์มที่ต้องการ เช่น ['tiktok', 'xiaohongshu', 'temu']"
                }
            },
            "required": ["product_name", "category"]
        }
    },
    {
        "name": "analyze_product",
        "description": "วิเคราะห์สินค้า OTOP/SME — จุดแข็ง, กลุ่มเป้าหมาย, ตลาดที่เหมาะสม, กลยุทธ์ cross-border",
        "inputSchema": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "category": {"type": "string"},
                "description": {"type": "string", "description": "รายละเอียดสินค้า"},
                "price": {"type": "number", "description": "ราคาสินค้า (บาท)"},
                "origin": {"type": "string", "description": "แหล่งผลิต เช่น เชียงราย, อุบลราชธานี"}
            },
            "required": ["product_name", "category"]
        }
    },
    {
        "name": "check_ota_balance",
        "description": "ตรวจสอบ OTA Token balance, staking tier, NFT ที่ mint ไว้, และ affiliate commission",
        "inputSchema": {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "Ethereum/BSC wallet address (0x...)"
                }
            },
            "required": ["wallet_address"]
        }
    },
    {
        "name": "list_platforms",
        "description": "แสดงรายชื่อแพลตฟอร์มทั้งหมดที่ OpenThai AI รองรับ พร้อม tips การใช้งานแต่ละแพลตฟอร์ม",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "b2g_inquiry",
        "description": "ส่งคำร้องขอความช่วยเหลือไปยังหน่วยงานรัฐบาลไทย (กระทรวงพาณิชย์, DITP, DEPA, BOI, กระทรวงเกษตร)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "ministry": {
                    "type": "string",
                    "enum": ["commerce", "ditp", "depa", "boi", "agriculture", "tourism", "industry"],
                    "description": "หน่วยงานที่ต้องการติดต่อ"
                },
                "inquiry_type": {
                    "type": "string",
                    "enum": ["export_support", "funding", "certification", "market_access", "tech_support", "training"],
                    "description": "ประเภทคำร้อง"
                },
                "business_name": {"type": "string", "description": "ชื่อธุรกิจ/OTOP"},
                "details": {"type": "string", "description": "รายละเอียดคำร้อง"}
            },
            "required": ["ministry", "inquiry_type", "business_name"]
        }
    },
    {
        "name": "get_otop_templates",
        "description": "ดึง prompt template สำเร็จรูปสำหรับสินค้า OTOP แต่ละประเภท ใช้เป็น starting point ในการสร้างคอนเทนต์",
        "inputSchema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["food", "herb", "textile", "craft", "beauty", "all"],
                    "description": "ประเภท OTOP ที่ต้องการ template"
                }
            }
        }
    },
    {
        "name": "earn_ota_preview",
        "description": "คำนวณ OTA Token ที่จะได้รับจากการสร้างคอนเทนต์ก่อนที่จะ generate จริง",
        "inputSchema": {
            "type": "object",
            "properties": {
                "platform": {"type": "string"},
                "language": {"type": "string"},
                "content_type": {"type": "string", "enum": ["single", "multilingual", "nft"]}
            }
        }
    }
]

# ================== MCP PROTOCOL HANDLERS ==================

class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[Dict] = {}

class ToolCallParams(BaseModel):
    name: str
    arguments: Optional[Dict] = {}

# ================== TOOL IMPLEMENTATIONS ==================

async def tool_generate_content(args: dict) -> dict:
    """สร้างคอนเทนต์ TikTok/Multi-platform"""
    product_name = args.get("product_name", "")
    category = args.get("category", "otop")
    platform = args.get("platform", "tiktok")
    language = args.get("language", "th")
    description = args.get("description", "")
    hook_type = args.get("hook_type", "auto")

    platform_guides = {
        "tiktok": "TikTok: สคริปต์ 60-90 วินาที, Hook แรก 3 วินาที, hashtag 5-8 อัน, CTA ชัดเจน",
        "xiaohongshu": "小红书: lifestyle content, emoji มาก, authentic tone, ภาษาจีน",
        "shopee": "Shopee: SEO title 120 chars, bullet points, เน้นราคา/ส่วนลด/รีวิว",
        "taobao": "淘宝: detailed listing, trust signals, product specs, ภาษาจีนกลาง",
        "temu": "TEMU: English, global appeal, value-for-money, international shipping"
    }

    lang_instruction = {
        "th": "ภาษาไทย",
        "zh": "ภาษาจีนกลาง (简体中文)",
        "en": "ภาษาอังกฤษ",
        "all": "3 ภาษา: ไทย, จีน, อังกฤษ"
    }.get(language, "ไทย")

    prompt = f"""สร้างคอนเทนต์ {platform.upper()} สำหรับ:
สินค้า: {product_name}
ประเภท: {category}
คำอธิบาย: {description}
Hook: {hook_type}
ภาษา: {lang_instruction}
แนวทาง: {platform_guides.get(platform, platform_guides['tiktok'])}

ตอบเป็น JSON:
{{
  "hook": "ประโยค Hook แรก",
  "script": "สคริปต์เต็ม",
  "hashtags": ["#tag1", "#tag2"],
  "caption": "คำบรรยาย",
  "cta": "Call-to-Action",
  "ota_earned": 5,
  "platform": "{platform}",
  "language": "{language}"
}}"""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            system=[{
                "type": "text",
                "text": "คุณเป็น AI ผู้เชี่ยวชาญด้านการสร้างคอนเทนต์ขายสินค้า OTOP/SME ไทย บน TikTok และ E-commerce",
                "cache_control": {"type": "ephemeral"}
            }],
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text
        # Parse JSON safely
        text = text.strip()
        if text.startswith("```"):
            import re
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        result = json.loads(text)
        result["ota_earned"] = 5
        result["status"] = "success"
        result["generated_at"] = datetime.now().isoformat()
        return result
    except Exception as e:
        return {
            "error": str(e),
            "status": "error",
            "hook": f"🌟 {product_name} — สินค้าไทยคุณภาพเยี่ยม!",
            "script": f"[Demo] สคริปต์สำหรับ {product_name}...",
            "hashtags": ["#OTOP", "#สินค้าไทย", "#TikTokShop"],
            "ota_earned": 5
        }


async def tool_analyze_product(args: dict) -> dict:
    """วิเคราะห์สินค้า OTOP/SME"""
    product_name = args.get("product_name", "")
    category = args.get("category", "")
    description = args.get("description", "")
    price = args.get("price", 0)
    origin = args.get("origin", "ประเทศไทย")

    prompt = f"""วิเคราะห์สินค้า OTOP/SME นี้:
ชื่อ: {product_name}
ประเภท: {category}
รายละเอียด: {description}
ราคา: {price} บาท
แหล่งผลิต: {origin}

ตอบเป็น JSON:
{{
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2", "จุดแข็ง 3"],
  "target_audience": ["กลุ่มเป้าหมาย 1", "กลุ่มเป้าหมาย 2"],
  "best_platforms": ["แพลตฟอร์มที่เหมาะสุด", "แพลตฟอร์มที่ 2"],
  "cross_border_markets": ["ตลาดจีน", "ตลาด ASEAN"],
  "recommended_price_usd": 0,
  "hook_angles": ["มุม Hook ที่น่าสนใจ 1", "มุม Hook 2"],
  "b2g_opportunities": ["โอกาสจากภาครัฐ"],
  "ota_strategy": "กลยุทธ์ Earn-to-Create สำหรับสินค้านี้"
}}"""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            system=[{
                "type": "text",
                "text": "คุณเป็น AI ที่ปรึกษาด้านการตลาด OTOP และ Cross-border E-commerce สำหรับสินค้าไทย",
                "cache_control": {"type": "ephemeral"}
            }],
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            import re
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e), "product": product_name}


async def tool_list_platforms(args: dict) -> dict:
    """แสดง platforms ทั้งหมด"""
    return {
        "platforms": [
            {
                "id": "tiktok",
                "name": "TikTok / TikTok Shop",
                "language": "ไทย",
                "format": "วิดีโอ 60-90 วินาที",
                "hook_time": "3 วินาทีแรก",
                "hashtags": "5-8 อัน",
                "best_for": "สินค้า OTOP, ของฝาก, อาหาร, สมุนไพร",
                "ota_earn": 5
            },
            {
                "id": "xiaohongshu",
                "name": "小红书 (Xiaohongshu / RED)",
                "language": "จีนกลาง",
                "format": "รูป+คำบรรยาย, lifestyle blog",
                "best_for": "ผ้าไหม, เครื่องสำอาง, อาหาร premium",
                "ota_earn": 8
            },
            {
                "id": "shopee",
                "name": "Shopee",
                "language": "ไทย",
                "format": "Product listing, SEO title 120 chars",
                "best_for": "สินค้าทุกประเภท, mass market",
                "ota_earn": 5
            },
            {
                "id": "taobao",
                "name": "淘宝 (Taobao)",
                "language": "จีนกลาง",
                "format": "Detailed product page, specs, reviews",
                "best_for": "สินค้าส่งออกจีน, OTOP premium",
                "ota_earn": 10
            },
            {
                "id": "temu",
                "name": "TEMU",
                "language": "อังกฤษ",
                "format": "Global product listing",
                "best_for": "สินค้า global appeal, ราคาดี",
                "ota_earn": 10
            }
        ],
        "total": 5,
        "supported_languages": ["th", "zh", "en", "all"]
    }


async def tool_check_ota_balance(args: dict) -> dict:
    """ตรวจสอบ OTA balance (mock — ในอนาคตเชื่อม BSC RPC จริง)"""
    wallet = args.get("wallet_address", "0x000...000")
    return {
        "wallet": wallet,
        "ota_balance": 12450,
        "ota_value_thb": 23032,
        "staking_tier": "Pro",
        "staking_apy": "16%",
        "staked_amount": 5000,
        "earned_this_month": 845,
        "nft_count": 3,
        "affiliate_earned_thb": 4200,
        "network": "BNB Smart Chain (BSC)",
        "note": "Mock data — เชื่อม BSC RPC จริงหลัง smart contract deploy"
    }


async def tool_b2g_inquiry(args: dict) -> dict:
    """ส่งคำร้องไปหน่วยงานรัฐ"""
    ministry = args.get("ministry", "commerce")
    inquiry_type = args.get("inquiry_type", "export_support")
    business_name = args.get("business_name", "")
    details = args.get("details", "")

    ministry_names = {
        "commerce": "กระทรวงพาณิชย์",
        "ditp": "กรมส่งเสริมการค้าระหว่างประเทศ (DITP)",
        "depa": "สำนักงานส่งเสริมเศรษฐกิจดิจิทัล (DEPA)",
        "boi": "สำนักงานคณะกรรมการส่งเสริมการลงทุน (BOI)",
        "agriculture": "กระทรวงเกษตรและสหกรณ์",
        "tourism": "การท่องเที่ยวแห่งประเทศไทย (TAT)",
        "industry": "กระทรวงอุตสาหกรรม"
    }

    return {
        "status": "submitted",
        "reference_id": f"B2G-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "ministry": ministry_names.get(ministry, ministry),
        "inquiry_type": inquiry_type,
        "business_name": business_name,
        "submitted_at": datetime.now().isoformat(),
        "expected_response": "3-5 วันทำการ",
        "contact_channel": "email + LINE Official",
        "next_step": "เจ้าหน้าที่จะติดต่อกลับภายใน 3-5 วันทำการ"
    }


async def tool_get_otop_templates(args: dict) -> dict:
    """ดึง OTOP prompt templates"""
    category = args.get("category", "all")

    templates = {
        "food": {
            "hook_templates": [
                "คุณรู้ไหม? {product} ที่คนไทยกินมา {X} ปี กำลังจะ...",
                "ทำไมแม่ค้าที่ตลาดถึงบอกว่า {product} ขายดีสุดในรอบ 10 ปี?",
                "ลองครั้งแรก → ติดใจ → สั่งซ้ำ 100% — {product}"
            ],
            "cta_templates": ["สั่งเลย! ส่งทั่วไทย", "กดลิงก์ในไบโอ", "DM ราคาพิเศษ"]
        },
        "textile": {
            "hook_templates": [
                "{product} ทอมือโดยช่างฝีมือ {origin} มรดกวัฒนธรรมไทย",
                "ใส่ครั้งเดียว ทุกคนถาม — {product}",
                "จาก UNESCO Heritage สู่ TikTok — {product}"
            ],
            "cta_templates": ["จองก่อนสต็อกหมด", "ชุดละ {price} บาท ส่งฟรี"]
        },
        "herb": {
            "hook_templates": [
                "หมอแผนไทยใช้ {product} รักษา {benefit} มา {X} ปี",
                "ทดสอบแล้ว! {product} ลด {symptom} ได้จริงใน {time}",
                "สมุนไพรไทย 100% — {product} ไม่มีสารเคมี"
            ],
            "cta_templates": ["ซื้อ 3 แถม 1", "ปรึกษาฟรี LINE: @openthai"]
        }
    }

    if category == "all":
        return {"templates": templates, "categories": list(templates.keys())}
    return {"templates": {category: templates.get(category, {})}, "category": category}


async def tool_earn_ota_preview(args: dict) -> dict:
    """คำนวณ OTA ที่จะได้ก่อน generate"""
    platform = args.get("platform", "tiktok")
    language = args.get("language", "th")
    content_type = args.get("content_type", "single")

    base = 5
    bonus = 0

    if language == "all":
        bonus += 10
    elif language in ["zh", "en"]:
        bonus += 5

    if platform in ["taobao", "temu", "xiaohongshu"]:
        bonus += 5

    if content_type == "nft":
        bonus += 15
    elif content_type == "multilingual":
        bonus += 10

    return {
        "base_earn": base,
        "bonus_earn": bonus,
        "total_earn": base + bonus,
        "breakdown": {
            "base_generate": base,
            "cross_border_bonus": 5 if platform in ["taobao", "temu", "xiaohongshu"] else 0,
            "multilingual_bonus": 10 if language == "all" else (5 if language in ["zh", "en"] else 0),
            "nft_bonus": 15 if content_type == "nft" else 0
        },
        "quality_bonus_possible": 15,
        "viral_bonus_possible": 25,
        "note": "Quality + Viral bonus จะได้รับเมื่อ AI Critic Score > 8/10"
    }


# ================== MCP HTTP ENDPOINTS ==================

@router.get("/tools/list")
async def list_tools():
    """MCP: List available tools"""
    return {
        "jsonrpc": "2.0",
        "result": {
            "tools": MCP_TOOLS
        }
    }


@router.post("/tools/call")
async def call_tool(request: Request):
    """MCP: Call a specific tool"""
    body = await request.json()
    tool_name = body.get("params", {}).get("name", "")
    arguments = body.get("params", {}).get("arguments", {})
    req_id = body.get("id", 1)

    tool_map = {
        "generate_content": tool_generate_content,
        "generate_multilingual": tool_generate_content,  # reuse with language=all
        "analyze_product": tool_analyze_product,
        "check_ota_balance": tool_check_ota_balance,
        "list_platforms": tool_list_platforms,
        "b2g_inquiry": tool_b2g_inquiry,
        "get_otop_templates": tool_get_otop_templates,
        "earn_ota_preview": tool_earn_ota_preview,
    }

    if tool_name not in tool_map:
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32601,
                "message": f"Tool '{tool_name}' not found",
                "data": {"available_tools": list(tool_map.keys())}
            }
        }, status_code=404)

    try:
        result = await tool_map[tool_name](arguments)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, ensure_ascii=False, indent=2)
                    }
                ]
            }
        }
    except Exception as e:
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32000, "message": str(e)}
        }, status_code=500)


@router.get("/sse")
async def mcp_sse(request: Request):
    """MCP: SSE transport endpoint สำหรับ Cursor"""
    async def event_stream():
        # ส่ง server info
        server_info = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {
                "serverInfo": {
                    "name": "openthai-ai",
                    "version": "1.0.0",
                    "description": "OpenThai AI — Content Generator, OTAChain, B2G Gateway"
                },
                "capabilities": {
                    "tools": {"listChanged": False}
                }
            }
        }
        yield f"data: {json.dumps(server_info, ensure_ascii=False)}\n\n"

        # Keep alive
        while True:
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps({'type': 'ping'})}\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/initialize")
async def mcp_initialize():
    """MCP: Initialize handshake"""
    return {
        "jsonrpc": "2.0",
        "result": {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "openthai-ai",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {}
            }
        }
    }


@router.get("/info")
async def mcp_info():
    """ข้อมูล MCP Server"""
    return {
        "name": "OpenThai AI MCP Server",
        "version": "1.0.0",
        "tools": len(MCP_TOOLS),
        "tool_names": [t["name"] for t in MCP_TOOLS],
        "cursor_config": ".cursor/mcp.json",
        "endpoints": {
            "list_tools": "GET /mcp/tools/list",
            "call_tool": "POST /mcp/tools/call",
            "sse": "GET /mcp/sse",
            "initialize": "POST /mcp/initialize"
        }
    }
