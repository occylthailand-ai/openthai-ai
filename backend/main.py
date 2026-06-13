"""
OpenThai AI Backend — FastAPI + Claude API
สร้างคอนเทนต์ TikTok อัตโนมัติสำหรับสินค้าไทยและสินค้าทั่วโลก

วิธีรัน:
1. pip install fastapi uvicorn anthropic python-dotenv
2. สร้างไฟล์ .env และใส่ ANTHROPIC_API_KEY=your_key
3. uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import asyncio
import os
import time
import logging
import secrets
from dotenv import load_dotenv
import json
from datetime import datetime, date
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Load environment variables
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("openthai")

# ── Rate limiting (in-memory, resets on restart) ──────────────────────────────
_rate_store: dict = defaultdict(lambda: {"count": 0, "date": str(date.today())})
FREE_DAILY_LIMIT = 3

def check_rate_limit(ip: str) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    today = str(date.today())
    rec = _rate_store[ip]
    if rec["date"] != today:
        rec["count"] = 0
        rec["date"] = today
    if rec["count"] >= FREE_DAILY_LIMIT:
        return False
    rec["count"] += 1
    return True

# Initialize FastAPI
app = FastAPI(
    title="OpenThai AI API",
    description="AI-powered TikTok content generator for Thai and global products",
    version="1.0.0"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"
ALLOWED_ORIGINS = (
    [os.getenv("FRONTEND_URL", "https://www.openthai-ai.com")]
    if IS_PRODUCTION
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup validation ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY is not set — cannot start server")
    try:
        from db import init_db
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"DB init skipped: {e}")
    try:
        from news_monitor import start_scheduler, run_news_fetch
        start_scheduler()
        asyncio.create_task(run_news_fetch())  # immediate first fetch
        logger.info("News monitor started")
    except Exception as e:
        logger.warning(f"News monitor skipped: {e}")
    logger.info(f"OpenThai AI started | env={'production' if IS_PRODUCTION else 'dev'} | origins={ALLOWED_ORIGINS}")

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ================== DATA MODELS ==================

class ProductInput(BaseModel):
    product_name: str
    product_category: str  # otop, thai, china, global
    product_description: Optional[str] = ""
    target_audience: Optional[str] = "คนไทยทั่วไป"
    hook_type: Optional[str] = "auto"  # story, process, contrast, question, transformation, auto

class ContentOutput(BaseModel):
    script: dict  # hook, story, cta
    caption: str
    hashtags: List[str]
    quality: dict  # critic_score, taste_score, iterations
    learning: dict  # hook_type, why_it_works, next_try

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

# ================== SYSTEM PROMPTS ==================

SYSTEM_PROMPTS = {
    "food": """คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับอาหารและเครื่องดื่มไทย
เน้น: รสชาติ, สูตรโบราณ, วัตถุดิบท้องถิ่น, เรื่องเล่าของชุมชน
สไตล์: น่ากิน, ชวนลอง, อบอุ่น, authenticity""",

    "craft": """คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับหัตถกรรมและของใช้
เน้น: ฝีมือช่าง, ภูมิปัญญา, กระบวนการผลิต, ความละเอียดประณีต
สไตล์: น่าทึ่ง, ชื่นชม, เห็นคุณค่า, unique""",

    "herb": """คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับสมุนไพรและความงาม
เน้น: สรรพคุณ, วิธีใช้, ผลลัพธ์, ธรรมชาติ
สไตล์: น่าเชื่อถือ, ปลอดภัย, effective, transformation""",

    "textile": """คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับผ้าและสิ่งทอ
เน้น: ลวดลาย, กระบวนการย้อม/ทอ, ความหมาย, heritage
สไตล์: สวยงาม, มีเรื่องราว, premium, cultural pride""",

    "global": """คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับสินค้านำเข้าและ trending
เน้น: ความคุ้มค่า, ฟีเจอร์เด่น, เทรนด์, lifestyle
สไตล์: ทันสมัย, น่าสนใจ, relatable, FOMO"""
}

HOOK_TYPES = {
    "story": "เล่าเรื่องราวที่น่าสนใจ เริ่มด้วย 'รู้ไหมว่า...' หรือ 'เคยเจอไหม...'",
    "process": "แสดงกระบวนการที่น่าทึ่ง เน้น ASMR, การผลิต, behind the scenes",
    "contrast": "เปรียบเทียบก่อน-หลัง หรือ ความแตกต่างที่น่าตกใจ",
    "question": "ตั้งคำถามที่กระตุ้นความอยากรู้ 'ทำไม...?', 'อะไรคือ...?'",
    "transformation": "แสดงการเปลี่ยนแปลงที่ dramatic, before/after, results"
}

MASTER_PROMPT = """
คุณคือ AI ผู้เชี่ยวชาญสร้างคอนเทนต์ TikTok สำหรับตลาดไทย

【OUTPUT FORMAT】
สร้างคอนเทนต์ที่มีโครงสร้างดังนี้:

1. SCRIPT (30 วินาที)
   - Hook (3 วินาที): ดึงความสนใจทันที
   - Story (20 วินาที): เนื้อหาหลัก
   - CTA (7 วินาที): Call to Action

2. CAPTION
   - 2-3 ประโยค กระชับ ดึงดูด
   - มี emoji ที่เหมาะสม

3. HASHTAGS
   - 10 แฮชแท็กที่เกี่ยวข้อง
   - ผสม: trending + niche + product-specific

【QUALITY CRITERIA】
- Hook ต้องดึงความสนใจใน 1 วินาทีแรก
- เนื้อหาต้อง authentic ไม่โอ้อวดเกินจริง
- CTA ต้องชัดเจน actionable
- ภาษาเป็นธรรมชาติ ไม่เป็นทางการเกินไป

【RESPONSE FORMAT】
ตอบเป็น JSON เท่านั้น ไม่มี markdown หรือข้อความอื่น:
{
  "script": {
    "hook": "...",
    "story": "...",
    "cta": "..."
  },
  "caption": "...",
  "hashtags": ["...", "..."],
  "hook_type": "story|process|contrast|question|transformation",
  "why_it_works": "...",
  "next_try": "..."
}
"""

AI_CRITIC_PROMPT = """
คุณคือ AI Critic ผู้เชี่ยวชาญประเมินคุณภาพคอนเทนต์ TikTok

ให้คะแนน 1-10 ตามเกณฑ์:
1. Hook Strength (น้ำหนัก 30%): ดึงความสนใจทันทีหรือไม่
2. Story Flow (น้ำหนัก 25%): เนื้อหาลื่นไหล น่าติดตาม
3. CTA Clarity (น้ำหนัก 20%): ชัดเจน actionable
4. Authenticity (น้ำหนัก 15%): จริงใจ ไม่โอ้อวด
5. Viral Potential (น้ำหนัก 10%): โอกาสแชร์ต่อ

ตอบเป็น JSON:
{
  "scores": {
    "hook_strength": 0,
    "story_flow": 0,
    "cta_clarity": 0,
    "authenticity": 0,
    "viral_potential": 0
  },
  "total_score": 0,
  "feedback": "...",
  "improvement_suggestions": ["...", "..."]
}
"""

# ================== HELPER FUNCTIONS ==================

def get_system_prompt(category: str) -> str:
    """Get category-specific system prompt"""
    category_map = {
        "otop": "craft",
        "food": "food",
        "beverage": "food",
        "textile": "textile",
        "craft": "craft",
        "herb": "herb",
        "beauty": "herb",
        "thai": "craft",
        "china": "global",
        "global": "global"
    }
    key = category_map.get(category.lower(), "global")
    return SYSTEM_PROMPTS.get(key, SYSTEM_PROMPTS["global"])

def get_hook_instruction(hook_type: str) -> str:
    """Get hook type instruction"""
    if hook_type == "auto":
        return "เลือกรูปแบบ Hook ที่เหมาะสมที่สุดกับสินค้านี้"
    return f"ใช้รูปแบบ Hook แบบ {hook_type}: {HOOK_TYPES.get(hook_type, '')}"

async def generate_content(product: ProductInput) -> dict:
    """Generate content using Claude API"""
    system_prompt = get_system_prompt(product.product_category)
    hook_instruction = get_hook_instruction(product.hook_type)
    
    user_prompt = f"""
สร้างคอนเทนต์ TikTok สำหรับสินค้านี้:

【ข้อมูลสินค้า】
- ชื่อ: {product.product_name}
- หมวดหมู่: {product.product_category}
- รายละเอียด: {product.product_description or 'ไม่ระบุ'}
- กลุ่มเป้าหมาย: {product.target_audience}

【รูปแบบ Hook】
{hook_instruction}

{MASTER_PROMPT}
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        # Parse JSON response
        content = response.content[0].text.strip()
        # Remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        return json.loads(content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

async def critique_content(content: dict) -> dict:
    """Critique content using AI Critic"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=1000,
            system=AI_CRITIC_PROMPT,
            messages=[{
                "role": "user", 
                "content": f"ประเมินคอนเทนต์นี้:\n\n{json.dumps(content, ensure_ascii=False, indent=2)}"
            }]
        )
        
        critique_text = response.content[0].text.strip()
        if critique_text.startswith("```"):
            critique_text = critique_text.split("```")[1]
            if critique_text.startswith("json"):
                critique_text = critique_text[4:]
        critique_text = critique_text.strip()
        
        return json.loads(critique_text)
        
    except Exception as e:
        return {"total_score": 7, "feedback": "Critique unavailable", "improvement_suggestions": []}

# ================== API ENDPOINTS ==================

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/generate", response_model=ContentOutput)
async def generate_tiktok_content(product: ProductInput, request: Request):
    """
    Generate TikTok content for a product
    
    - **product_name**: ชื่อสินค้า
    - **product_category**: หมวดหมู่ (otop, thai, china, global)
    - **product_description**: รายละเอียดสินค้า (optional)
    - **target_audience**: กลุ่มเป้าหมาย (optional)
    - **hook_type**: รูปแบบ Hook (story, process, contrast, question, transformation, auto)
    """
    
    # Rate limiting for free tier
    ip = request.client.host if request.client else "unknown"
    auth = request.headers.get("Authorization", "")
    is_pro = auth.startswith("Bearer ")  # Pro users bypass rate limit
    if not is_pro and not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="ครบโควตาฟรี 3 ครั้ง/วันแล้ว — อัปเกรดเพื่อใช้งานไม่จำกัด")

    t_start = time.time()
    logger.info(f"generate | product={product.product_name[:40]} | category={product.product_category} | ip={ip}")

    max_iterations = 3
    best_content = None
    best_score = 0
    
    for iteration in range(max_iterations):
        # Generate content
        content = await generate_content(product)
        
        # Critique content
        critique = await critique_content(content)
        score = critique.get("total_score", 0)
        
        # Keep best content
        if score > best_score:
            best_score = score
            best_content = content
            best_critique = critique
        
        # If score >= 7, accept
        if score >= 7:
            break
    
    logger.info(f"generate done | product={product.product_name[:40]} | score={best_score} | elapsed={time.time()-t_start:.1f}s")

    # Prepare response
    return ContentOutput(
        script={
            "hook": best_content.get("script", {}).get("hook", ""),
            "story": best_content.get("script", {}).get("story", ""),
            "cta": best_content.get("script", {}).get("cta", "")
        },
        caption=best_content.get("caption", ""),
        hashtags=best_content.get("hashtags", []),
        quality={
            "critic_score": best_score,
            "taste_score": 8,  # Placeholder
            "iterations": iteration + 1
        },
        learning={
            "hook_type": best_content.get("hook_type", "auto"),
            "why_it_works": best_content.get("why_it_works", ""),
            "next_try": best_content.get("next_try", "")
        }
    )

@app.get("/hook-types")
async def get_hook_types():
    """Get available hook types"""
    return HOOK_TYPES

@app.get("/categories")
async def get_categories():
    """Get available product categories"""
    return {
        "otop": "สินค้า OTOP (หนึ่งตำบลหนึ่งผลิตภัณฑ์)",
        "thai": "สินค้าไทยทั่วไป",
        "china": "สินค้านำเข้าจากจีน",
        "global": "สินค้านำเข้าจากทั่วโลก"
    }

# ================== AUTH & USER ENDPOINTS ==================

class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""

class OrderRequest(BaseModel):
    name: str
    email: str
    phone: str
    package: str
    pay_method: str = "promptpay"
    affiliate_ref: Optional[str] = ""
    user_type: Optional[str] = ""

@app.post("/auth/register")
async def register_user(req: RegisterRequest):
    """Register a new user and return an API key."""
    try:
        from db import get_db, User, new_api_key
        from sqlalchemy.ext.asyncio import AsyncSession
        from db import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.email == req.email))
            existing = result.scalar_one_or_none()
            if existing:
                return {"api_key": existing.api_key, "name": existing.name, "email": existing.email, "plan": existing.plan, "message": "มีบัญชีอยู่แล้ว — ใช้ API key นี้ได้เลย"}
            key = new_api_key()
            user = User(email=req.email, name=req.name, api_key=key, plan="free")
            db.add(user)
            await db.commit()
            return {"api_key": key, "name": req.name, "email": req.email, "plan": "free", "message": "สมัครสำเร็จ! เก็บ API key ไว้ให้ดี"}
    except Exception as e:
        logger.error(f"register error: {e}")
        key = "otai_" + secrets.token_urlsafe(16)
        return {"api_key": key, "name": req.name, "email": req.email, "plan": "free", "message": "สมัครสำเร็จ (offline mode)"}

@app.get("/auth/me")
async def auth_me(request: Request):
    """Validate API key and return user info."""
    key = request.headers.get("X-API-Key", "")
    if not key:
        raise HTTPException(status_code=401, detail="ต้องใส่ X-API-Key header")
    try:
        from db import AsyncSessionLocal, User, ApiUsage
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.api_key == key))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=401, detail="API key ไม่ถูกต้อง")
            today = str(date.today())
            usage_res = await db.execute(select(ApiUsage).where(ApiUsage.api_key == key, ApiUsage.date == today))
            usage = usage_res.scalar_one_or_none()
            used_today = usage.count if usage else 0
            from auth import PLAN_LIMITS
            limit = PLAN_LIMITS.get(user.plan, 10)
            return {"name": user.name, "email": user.email, "plan": user.plan, "api_key": key, "used_today": used_today, "daily_limit": limit, "created_at": user.created_at.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/payment/qr")
async def get_payment_qr(amount: Optional[float] = None):
    """Generate PromptPay QR code."""
    try:
        from payment import generate_qr_base64, PROMPTPAY_ID, build_promptpay_payload
        qr_b64 = generate_qr_base64(amount)
        payload = build_promptpay_payload(amount)
        return {"qr_base64": qr_b64, "payload": payload, "promptpay_id": PROMPTPAY_ID, "amount": amount}
    except Exception as e:
        return {"qr_base64": "", "payload": "", "promptpay_id": os.getenv("PROMPTPAY_ID", ""), "amount": amount, "error": str(e)}

@app.get("/payment/methods")
async def get_payment_methods_endpoint():
    """Get available payment methods."""
    try:
        from payment import get_payment_methods
        return get_payment_methods()
    except Exception as e:
        return {"promptpay": {"available": bool(os.getenv("PROMPTPAY_ID")), "id": os.getenv("PROMPTPAY_ID", "")}, "bank_transfer": {"available": False}}

@app.post("/order")
async def create_order(req: OrderRequest, request: Request):
    """Create a payment order."""
    import uuid
    order_id = "OT" + datetime.now().strftime("%y%m%d") + secrets.token_hex(3).upper()
    prices = {"pro": 149, "business": 299}
    price = prices.get(req.package, 149)
    try:
        from db import AsyncSessionLocal, Order as OrderModel
        async with AsyncSessionLocal() as db:
            order = OrderModel(
                order_id=order_id, name=req.name, email=req.email, phone=req.phone,
                package=req.package, price=price, pay_method=req.pay_method,
                affiliate_ref=req.affiliate_ref or "", user_type=req.user_type or "",
                status="pending_payment"
            )
            db.add(order)
            await db.commit()
    except Exception as e:
        logger.warning(f"Order DB save failed (non-fatal): {e}")
    logger.info(f"order | id={order_id} | pkg={req.package} | email={req.email}")
    from payment import build_promptpay_payload, PROMPTPAY_ID
    try:
        payload = build_promptpay_payload(float(price))
    except Exception:
        payload = ""
    return {"order_id": order_id, "package": req.package, "price": price, "status": "pending_payment", "promptpay_payload": payload, "promptpay_id": PROMPTPAY_ID}

# ================== TASK ROUTER ENDPOINTS ==================

class ManualTaskRequest(BaseModel):
    content: str
    source: str = "manual"
    sender: Optional[str] = ""

@app.post("/webhook/line")
async def webhook_line(request: Request):
    """LINE OA Webhook — รับข้อความจาก LINE Official Account"""
    body = await request.body()
    sig = request.headers.get("X-Line-Signature", "")
    from task_router import verify_line_signature, route_message
    if not verify_line_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid LINE signature")
    try:
        payload = json.loads(body)
        results = []
        for event in payload.get("events", []):
            if event.get("type") != "message":
                continue
            msg = event.get("message", {})
            if msg.get("type") not in ("text",):
                continue
            content = msg.get("text", "")
            source_obj = event.get("source", {})
            sender = source_obj.get("userId", "")
            ref = msg.get("id", "")
            result = await route_message("line", content, sender, ref)
            results.append(result)
        return {"status": "ok", "processed": len(results)}
    except Exception as e:
        logger.error("LINE webhook error: %s", e)
        return {"status": "error", "detail": str(e)}

@app.post("/webhook/github")
async def webhook_github(request: Request):
    """GitHub Webhook — รับ issues, PR, comments"""
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")
    from task_router import verify_github_signature, parse_github_event, route_message
    if not verify_github_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid GitHub signature")
    try:
        payload = json.loads(body)
        parsed = parse_github_event(event_type, payload)
        if not parsed:
            return {"status": "skipped", "reason": "event not actionable"}
        result = await route_message("github", parsed["content"], parsed["sender"], event_type)
        return {"status": "ok", "task": result}
    except Exception as e:
        logger.error("GitHub webhook error: %s", e)
        return {"status": "error", "detail": str(e)}

@app.post("/webhook/form")
async def webhook_form(request: Request):
    """Web Form Webhook — รับ waitlist, checkout, affiliate submissions"""
    try:
        payload = await request.json()
        form_type = payload.get("type", "form")
        name = payload.get("name", "")
        email = payload.get("email", "")
        content_parts = [f"[Form: {form_type}]"]
        for k, v in payload.items():
            if k not in ("type",) and v:
                content_parts.append(f"{k}: {v}")
        content = "\n".join(content_parts)
        sender = f"{name} <{email}>" if name or email else "anonymous"
        from task_router import route_message
        result = await route_message("form", content, sender, form_type)
        return {"status": "ok", "task": result}
    except Exception as e:
        logger.error("Form webhook error: %s", e)
        return {"status": "error", "detail": str(e)}

@app.post("/webhook/email")
async def webhook_email(request: Request):
    """Email Webhook — สำหรับ email services เช่น SendGrid Inbound Parse"""
    try:
        # Support both JSON and form-data (SendGrid format)
        ct = request.headers.get("content-type", "")
        if "application/json" in ct:
            payload = await request.json()
            subject = payload.get("subject", "")
            body_text = payload.get("text", payload.get("body", ""))
            sender = payload.get("from", payload.get("sender", ""))
        else:
            form = await request.form()
            subject = form.get("subject", "")
            body_text = form.get("text", form.get("body", ""))
            sender = form.get("from", "")
        content = f"Subject: {subject}\n\n{body_text}"
        from task_router import route_message
        result = await route_message("email", content, sender, subject[:50])
        return {"status": "ok", "task": result}
    except Exception as e:
        logger.error("Email webhook error: %s", e)
        return {"status": "error", "detail": str(e)}

@app.post("/tasks/manual")
async def create_manual_task(req: ManualTaskRequest):
    """สร้าง task ด้วยตนเอง (test / manual input)"""
    from task_router import route_message
    result = await route_message(req.source, req.content, req.sender or "manual")
    return result

@app.get("/tasks")
async def get_tasks(
    department: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    page: int = 1,
):
    """ดู task ทั้งหมด พร้อม filter"""
    try:
        from db import AsyncSessionLocal, AutoTask
        from sqlalchemy import select, desc
        async with AsyncSessionLocal() as db:
            q = select(AutoTask).order_by(desc(AutoTask.created_at))
            if department:
                q = q.where(AutoTask.department == department)
            if status:
                q = q.where(AutoTask.status == status)
            if priority:
                q = q.where(AutoTask.priority == priority)
            q = q.offset((page - 1) * limit).limit(limit)
            res = await db.execute(q)
            tasks = res.scalars().all()
        return {
            "tasks": [
                {
                    "task_id": t.task_id, "source": t.source, "sender": t.sender,
                    "department": t.department, "priority": t.priority,
                    "summary": t.summary, "action": t.action, "status": t.status,
                    "created_at": t.created_at.isoformat(),
                }
                for t in tasks
            ],
            "page": page, "count": len(tasks),
        }
    except Exception as e:
        return {"tasks": [], "error": str(e)}

@app.patch("/tasks/{task_id}")
async def update_task_status(task_id: str, request: Request):
    """อัปเดตสถานะ task: open → in_progress → done"""
    try:
        body = await request.json()
        new_status = body.get("status", "")
        if new_status not in ("open", "in_progress", "done"):
            raise HTTPException(status_code=400, detail="status must be open|in_progress|done")
        from db import AsyncSessionLocal, AutoTask
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(AutoTask).where(AutoTask.task_id == task_id))
            task = res.scalar_one_or_none()
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            task.status = new_status
            task.updated_at = datetime.utcnow()
            await db.commit()
        return {"task_id": task_id, "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/departments")
async def get_department_summary():
    """สถิติ task แต่ละแผนก"""
    try:
        from db import AsyncSessionLocal, AutoTask
        from sqlalchemy import select, func
        from task_router import DEPARTMENTS
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(AutoTask.department, AutoTask.status, func.count().label("cnt"))
                .group_by(AutoTask.department, AutoTask.status)
            )
            rows = res.all()
        summary = {}
        for dept_id, info in DEPARTMENTS.items():
            summary[dept_id] = {"label": info["label"], "emoji": info["emoji"],
                                "open": 0, "in_progress": 0, "done": 0}
        for dept, status, cnt in rows:
            if dept in summary and status in summary[dept]:
                summary[dept][status] = cnt
        return summary
    except Exception as e:
        return {"error": str(e)}

# ================== NEWS ENDPOINTS ==================

@app.get("/news")
async def get_news(
    source: Optional[str] = None,
    priority: Optional[int] = None,
    limit: int = 30,
    page: int = 1,
):
    """ดึงข่าว AI ล่าสุดจาก database"""
    try:
        from db import AsyncSessionLocal, NewsArticle
        from sqlalchemy import select, desc
        async with AsyncSessionLocal() as db:
            q = select(NewsArticle).order_by(desc(NewsArticle.priority), desc(NewsArticle.published_at))
            if source:
                q = q.where(NewsArticle.source == source)
            if priority is not None:
                q = q.where(NewsArticle.priority >= priority)
            q = q.offset((page - 1) * limit).limit(limit)
            res = await db.execute(q)
            articles = res.scalars().all()
        return {
            "articles": [
                {
                    "id": a.id, "source": a.source, "label": a.source_label,
                    "emoji": a.source_emoji, "title": a.title, "url": a.url,
                    "summary": a.summary[:200] if a.summary else "",
                    "published_at": a.published_at.isoformat(),
                    "priority": a.priority,
                }
                for a in articles
            ],
            "page": page,
            "count": len(articles),
        }
    except Exception as e:
        return {"articles": [], "error": str(e), "page": page, "count": 0}


@app.post("/news/fetch")
async def trigger_news_fetch():
    """Trigger manual news fetch (admin use)"""
    try:
        from news_monitor import run_news_fetch
        result = await run_news_fetch()
        return {"status": "ok", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/news/sources")
async def get_news_sources():
    """รายชื่อแหล่งข่าวทั้งหมด"""
    from news_monitor import FEEDS
    return [{"source": f["source"], "label": f["label"], "emoji": f["emoji"], "priority": f["priority"]} for f in FEEDS]


# ================== RUN SERVER ==================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
