"""
OpenThai AI Backend — FastAPI + Claude API
สร้างคอนเทนต์ TikTok อัตโนมัติสำหรับสินค้าไทยและสินค้าทั่วโลก

วิธีรัน:
1. pip install fastapi uvicorn anthropic python-dotenv
2. สร้างไฟล์ .env และใส่ ANTHROPIC_API_KEY=your_key
3. uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import asyncio
import httpx
import os
import time
import logging
import secrets
from dotenv import load_dotenv
import json
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Load environment variables
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("openthai")

# ── Rate limiting — DB-backed via limits.py ────────────────────────────────────
import limits as _limits

async def check_rate_limit_db(ip: str) -> bool:
    """DB-backed rate limit for anonymous IPs. Returns True if allowed."""
    free_limit = _limits.get("free_ip_daily", 50)
    if free_limit == -1:
        return True  # unlimited
    pseudo_key = f"ip:{ip}"
    today = str(date.today())
    try:
        from db import AsyncSessionLocal, ApiUsage
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(ApiUsage).where(ApiUsage.api_key == pseudo_key, ApiUsage.date == today)
            )
            usage = res.scalar_one_or_none()
            if usage and usage.count >= free_limit:
                return False
            if usage:
                usage.count += 1
            else:
                db.add(ApiUsage(api_key=pseudo_key, date=today, count=1))
            await db.commit()
            return True
    except Exception:
        return True

# Initialize FastAPI
app = FastAPI(
    title="OpenThai AI API",
    description="AI-powered TikTok content generator for Thai and global products",
    version="1.0.0"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"
ALLOWED_ORIGINS = [
    "https://www.openthai-ai.com",
    "https://openthai-ai.com",
    "https://openthai-ai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]
_extra = os.getenv("FRONTEND_URL", "")
if _extra and _extra not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(_extra)

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
        # โหลด limit overrides จาก DB
        await _limits.load_db_overrides()
        logger.info("Limit overrides loaded")
    except Exception as e:
        logger.warning(f"DB init skipped: {e}")
    try:
        from news_monitor import start_scheduler, run_news_fetch, get_scheduler
        start_scheduler()
        asyncio.create_task(run_news_fetch())  # immediate first fetch
        logger.info("News monitor started")
        try:
            from mythos_command import register_mythos_jobs
            from mythos_goals import register_goal_jobs
            from error_hunter import register_error_hunter_jobs
            sched = get_scheduler()
            register_mythos_jobs(sched)
            register_goal_jobs(sched)
            register_error_hunter_jobs(sched)
            logger.info("Mythos Command System + Goal Tracker + Error Hunter started")
        except Exception as e2:
            logger.warning(f"Mythos scheduler skipped: {e2}")
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
            model="claude-sonnet-4-6",
            max_tokens=_limits.get("claude_max_tokens", 4000),
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
        
        result = json.loads(content)
        asyncio.create_task(_record_tokens("generate", response))
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

async def critique_content(content: dict) -> dict:
    """Critique content using AI Critic"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=_limits.get("claude_max_tokens_critic", 1000),
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
        
        result = json.loads(critique_text)
        asyncio.create_task(_record_tokens("critic", response))
        return result

    except Exception as e:
        return {"total_score": 7, "feedback": "Critique unavailable", "improvement_suggestions": []}


async def _record_tokens(call_type: str, response) -> None:
    """Helper: บันทึก token usage จาก Anthropic response object"""
    try:
        from token_counter import record_usage
        u = response.usage
        await record_usage(call_type, u.input_tokens, u.output_tokens)
    except Exception:
        pass

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
    
    # Rate limiting — check X-API-Key first, fall back to IP-based free quota
    ip = request.client.host if request.client else "unknown"
    api_key = request.headers.get("X-API-Key", "")
    is_pro = False

    if api_key:
        try:
            from db import AsyncSessionLocal, User, ApiUsage
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(User).where(User.api_key == api_key))
                user = res.scalar_one_or_none()
                if user and user.is_active:
                    is_pro = user.plan in ("pro", "business")
                    limit = _limits.plan_daily_limit(user.plan)
                    today = str(date.today())
                    usage_res = await db.execute(
                        select(ApiUsage).where(ApiUsage.api_key == api_key, ApiUsage.date == today)
                    )
                    usage = usage_res.scalar_one_or_none()
                    if limit != -1 and usage and usage.count >= limit:
                        raise HTTPException(status_code=429, detail=f"เกินโควตา {limit} ครั้ง/วัน สำหรับ plan {user.plan}")
                    # Track usage
                    if usage:
                        usage.count += 1
                    else:
                        db.add(ApiUsage(api_key=api_key, date=today, count=1))
                    await db.commit()
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("API key check error (non-fatal): %s", e)
    else:
        if not await check_rate_limit_db(ip):
            free_lim = _limits.get("free_ip_daily", 50)
            raise HTTPException(status_code=429, detail=f"ครบโควตาฟรี {free_lim} ครั้ง/วันแล้ว — อัปเกรดเพื่อใช้งานไม่จำกัด")

    t_start = time.time()
    logger.info(f"generate | product={product.product_name[:40]} | category={product.product_category} | ip={ip}")

    max_iterations = _limits.get("claude_max_iterations", 5)
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
            limit = _limits.plan_daily_limit(user.plan)
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

# ── ข้อ 1: Payment webhook endpoints ──────────────────────────────────────────

class SlipUploadRequest(BaseModel):
    slip_data: str          # base64 PNG/JPG ของสลิป
    bank_code: Optional[str] = ""

@app.post("/order/{order_id}/slip")
async def upload_payment_slip(order_id: str, req: SlipUploadRequest):
    """ลูกค้าอัปโหลดสลิปโอนเงิน → รอ admin ยืนยัน"""
    try:
        from db import AsyncSessionLocal, Order as OrderModel, PaymentSlip
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(OrderModel).where(OrderModel.order_id == order_id))
            order = res.scalar_one_or_none()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            if order.status not in ("pending_payment",):
                raise HTTPException(status_code=400, detail=f"Order status is already '{order.status}'")
            slip = PaymentSlip(
                order_id=order_id,
                bank_code=req.bank_code or "",
                slip_data=req.slip_data,
                verified=False,
            )
            db.add(slip)
            order.status = "slip_uploaded"
            await db.commit()
        logger.info("slip uploaded | order=%s | bank=%s", order_id, req.bank_code)
        # Notify admin via LINE
        admin_token = os.getenv("LINE_NOTIFY_FINANCE", os.getenv("LINE_NOTIFY_ALL", ""))
        if admin_token:
            try:
                async with httpx.AsyncClient() as c:
                    await c.post(
                        "https://notify-api.line.me/api/notify",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        data={"message": f"\n💳 สลิปใหม่รอยืนยัน\nOrder: {order_id}\nBank: {req.bank_code or 'ไม่ระบุ'}\n🔗 ยืนยัน: POST /order/{order_id}/confirm"},
                        timeout=8,
                    )
            except Exception:
                pass
        return {"order_id": order_id, "status": "slip_uploaded", "message": "อัปโหลดสลิปสำเร็จ รอ admin ยืนยัน 1-2 ชั่วโมง"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/order/{order_id}/confirm")
async def confirm_payment(order_id: str, request: Request):
    """Admin ยืนยันการชำระเงิน → เปลี่ยน order + user plan เป็น pro/business"""
    admin_key = request.headers.get("X-Admin-Key", "")
    if admin_key != os.getenv("ADMIN_API_KEY", ""):
        raise HTTPException(status_code=403, detail="Admin key required")
    try:
        from db import AsyncSessionLocal, Order as OrderModel, PaymentSlip, User
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(OrderModel).where(OrderModel.order_id == order_id))
            order = res.scalar_one_or_none()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            # Mark slip verified
            slip_res = await db.execute(
                select(PaymentSlip).where(PaymentSlip.order_id == order_id)
            )
            slip = slip_res.scalar_one_or_none()
            if slip:
                slip.verified = True
            # Upgrade order status
            order.status = "paid"
            # Upgrade user plan
            user_res = await db.execute(select(User).where(User.email == order.email))
            user = user_res.scalar_one_or_none()
            if user:
                user.plan = order.package  # "pro" or "business"
                logger.info("user_plan_upgraded | email=%s | plan=%s", order.email, order.package)
            await db.commit()
        logger.info("payment_confirmed | order=%s", order_id)
        return {"order_id": order_id, "status": "paid", "user_upgraded": bool(user)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/order/{order_id}/status")
async def get_order_status(order_id: str):
    """ลูกค้าตรวจสอบสถานะ order"""
    try:
        from db import AsyncSessionLocal, Order as OrderModel
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(OrderModel).where(OrderModel.order_id == order_id))
            order = res.scalar_one_or_none()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            return {
                "order_id": order.order_id, "package": order.package,
                "price": order.price, "status": order.status,
                "created_at": order.created_at.isoformat(),
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── ข้อ 4: Bulk generation endpoint ───────────────────────────────────────────

class BulkProductInput(BaseModel):
    products: List[ProductInput]
    max_parallel: Optional[int] = 3   # สูงสุด 3 requests พร้อมกัน

@app.post("/generate/bulk")
async def generate_bulk(req: BulkProductInput, request: Request):
    """สร้างคอนเทนต์ TikTok หลายสินค้าพร้อมกัน (สูงสุด 10 ชิ้น)"""
    ip = request.client.host if request.client else "unknown"
    api_key = request.headers.get("X-API-Key", "")
    if not api_key:
        raise HTTPException(status_code=401, detail="Bulk generation ต้องใช้ X-API-Key (plan pro/business)")

    # Verify pro/business plan
    try:
        from db import AsyncSessionLocal, User
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.api_key == api_key))
            user = res.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=401, detail="API key ไม่ถูกต้อง")
            if user.plan not in ("pro", "business"):
                raise HTTPException(status_code=403, detail="Bulk generation สำหรับ Pro/Business เท่านั้น")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    bulk_cap = _limits.get("bulk_max_products", 50)
    products = req.products[:bulk_cap]
    max_par = _limits.get("bulk_max_parallel", 10)
    sem = asyncio.Semaphore(min(req.max_parallel or max_par, max_par))

    async def _gen_one(p: ProductInput, idx: int):
        async with sem:
            try:
                content = await generate_content(p)
                critique = await critique_content(content)
                return {
                    "index": idx,
                    "product": p.product_name,
                    "status": "ok",
                    "script": content.get("script", {}),
                    "caption": content.get("caption", ""),
                    "hashtags": content.get("hashtags", []),
                    "score": critique.get("total_score", 0),
                }
            except Exception as e:
                return {"index": idx, "product": p.product_name, "status": "error", "error": str(e)}

    t_start = time.time()
    results = await asyncio.gather(*[_gen_one(p, i) for i, p in enumerate(products)])
    elapsed = round(time.time() - t_start, 1)
    logger.info("bulk_generate | count=%d | elapsed=%ss | ip=%s", len(products), elapsed, ip)
    return {
        "count": len(products),
        "elapsed_seconds": elapsed,
        "results": list(results),
    }

# ── ข้อ 5: Affiliate payout endpoints ─────────────────────────────────────────

class PayoutRequest(BaseModel):
    bank_name: str         # KBank, SCB, BBL …
    account_number: str
    account_name: str
    amount: Optional[float] = None   # None = request all available

@app.post("/affiliate/{code}/request-payout")
async def request_affiliate_payout(code: str, req: PayoutRequest):
    """ตัวแทนขอถอนค่าคอมมิชชั่น → สร้าง payout record รอ admin อนุมัติ"""
    try:
        from db import AsyncSessionLocal, Affiliate, Commission
        from sqlalchemy import func
        async with AsyncSessionLocal() as db:
            aff_res = await db.execute(
                select(Affiliate).where(Affiliate.code == code)
            )
            aff = aff_res.scalar_one_or_none()
            if not aff:
                raise HTTPException(status_code=404, detail="Affiliate code ไม่พบ")

            # Sum approved commissions minus paid-out payouts
            earned_res = await db.execute(
                select(func.sum(Commission.commission_amount)).where(
                    Commission.affiliate_code == code,
                    Commission.status == "approved"
                )
            )
            paid_res = await db.execute(
                select(func.sum(Commission.amount)).where(
                    Commission.affiliate_code == code,
                    Commission.status == "paid",
                    Commission.amount < 0
                )
            )
            earned = float(earned_res.scalar() or 0)
            paid_out = abs(float(paid_res.scalar() or 0))
            available = earned - paid_out
            payout_amount = min(req.amount, available) if req.amount else available

            if payout_amount < 100:
                raise HTTPException(status_code=400, detail=f"ยอดน้อยกว่าขั้นต่ำ 100 บาท (ยอดคงเหลือ {available:.2f} บาท)")

            # Create payout record as negative-amount Commission entry
            payout = Commission(
                affiliate_code=code,
                order_id=f"PAYOUT-{secrets.token_hex(4).upper()}",
                package="payout",
                amount=-payout_amount,
                commission_rate=0,
                commission_amount=0,
                status="payout_pending",
                note=f"ถอนเงิน → {req.bank_name} {req.account_number} ({req.account_name})",
            )
            db.add(payout)
            await db.commit()
            await db.refresh(payout)

        # Notify finance team
        finance_token = os.getenv("LINE_NOTIFY_FINANCE", os.getenv("LINE_MYTHOS_FINANCE", ""))
        if finance_token:
            try:
                async with httpx.AsyncClient() as c:
                    await c.post(
                        "https://notify-api.line.me/api/notify",
                        headers={"Authorization": f"Bearer {finance_token}"},
                        data={"message": f"\n💸 Affiliate Payout Request\nCode: {code}\nยอด: {payout_amount:.2f} บาท\nธนาคาร: {req.bank_name} {req.account_number}\nชื่อ: {req.account_name}\nยืนยัน: POST /affiliate/{code}/approve-payout/{payout.id}"},
                        timeout=8,
                    )
            except Exception:
                pass

        logger.info("payout_request | code=%s | amount=%.2f", code, payout_amount)
        return {
            "payout_id": payout.id, "code": code,
            "amount": payout_amount, "bank": req.bank_name,
            "account": req.account_number, "status": "payout_pending",
            "message": "คำขอถอนเงินส่งแล้ว Finance team จะโอนภายใน 3 วันทำการ",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/affiliate/{code}/approve-payout/{payout_id}")
async def approve_affiliate_payout(code: str, payout_id: int, request: Request):
    """Admin อนุมัติ payout → เปลี่ยน status เป็น paid"""
    admin_key = request.headers.get("X-Admin-Key", "")
    if admin_key != os.getenv("ADMIN_API_KEY", ""):
        raise HTTPException(status_code=403, detail="Admin key required")
    try:
        from db import AsyncSessionLocal, Commission
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Commission).where(Commission.id == payout_id))
            payout = res.scalar_one_or_none()
            if not payout:
                raise HTTPException(status_code=404, detail="Payout not found")
            payout.status = "paid"
            await db.commit()
        logger.info("payout_approved | id=%d | code=%s", payout_id, code)
        return {"payout_id": payout_id, "status": "paid"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/affiliate/{code}/balance")
async def get_affiliate_balance(code: str):
    """ดูยอดคอมมิชชั่นคงเหลือและประวัติ"""
    try:
        from db import AsyncSessionLocal, Affiliate, Commission
        from sqlalchemy import func
        async with AsyncSessionLocal() as db:
            aff_res = await db.execute(select(Affiliate).where(Affiliate.code == code))
            aff = aff_res.scalar_one_or_none()
            if not aff:
                raise HTTPException(status_code=404, detail="Affiliate code ไม่พบ")

            earned_res = await db.execute(
                select(func.sum(Commission.commission_amount)).where(
                    Commission.affiliate_code == code, Commission.status == "approved"
                )
            )
            paid_out_res = await db.execute(
                select(func.sum(Commission.amount)).where(
                    Commission.affiliate_code == code, Commission.amount < 0, Commission.status == "paid"
                )
            )
            earned = float(earned_res.scalar() or 0)
            paid_out = abs(float(paid_out_res.scalar() or 0))
            available = earned - paid_out

            history_res = await db.execute(
                select(Commission).where(Commission.affiliate_code == code)
                .order_by(Commission.created_at.desc()).limit(20)
            )
            history = [
                {"id": c.id, "order_id": c.order_id, "amount": c.amount,
                 "status": c.status, "note": c.note or "",
                 "created_at": c.created_at.isoformat()}
                for c in history_res.scalars().all()
            ]

        return {
            "code": code, "earned_total": round(earned, 2),
            "paid_out": round(paid_out, 2), "available": round(available, 2),
            "min_payout": 100, "history": history,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== SETUP & ADMIN ENDPOINTS ==================

@app.get("/admin/setup")
async def get_setup_status():
    """ตรวจสอบสถานะ integration ทั้งหมด"""
    from setup_check import run_setup_check
    return await run_setup_check()

@app.post("/admin/test-line/{department}")
async def test_line_notify(department: str):
    """ส่งข้อความทดสอบไป LINE Notify ของแผนก"""
    from task_router import DEPARTMENTS, send_team_line_notify
    if department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"department must be one of {list(DEPARTMENTS.keys())}")
    dept = DEPARTMENTS[department]
    token_env = dept["line_token_env"]
    token = os.getenv(token_env, "")
    if not token:
        return {"status": "not_configured", "env": token_env,
                "how_to": f"ตั้งค่า {token_env} ใน Railway environment variables"}
    msg = f"\n✅ ทดสอบ LINE Notify — {dept['label']}\nOpenThai AI Task Router พร้อมใช้งาน!\nเวลา: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ok = await send_team_line_notify(department, msg)
    return {"status": "ok" if ok else "failed", "department": department, "label": dept["label"]}

@app.post("/admin/register-github-webhook")
async def register_github_webhook():
    """Auto-register webhook ใน GitHub repo"""
    token = os.getenv("GITHUB_TOKEN", "")
    repo = os.getenv("GITHUB_REPO", "")
    api_url = os.getenv("API_URL", "")
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")

    if not all([token, repo, api_url]):
        return {
            "status": "missing_config",
            "required": {"GITHUB_TOKEN": bool(token), "GITHUB_REPO": bool(repo), "API_URL": bool(api_url)},
            "how_to": "ตั้งค่า GITHUB_TOKEN (Personal Access Token), GITHUB_REPO (owner/repo), API_URL ใน Railway"
        }
    webhook_url = api_url.rstrip("/") + "/webhook/github"
    payload = {
        "name": "web",
        "active": True,
        "events": ["issues", "issue_comment", "pull_request"],
        "config": {"url": webhook_url, "content_type": "json", "secret": secret or ""},
    }
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"https://api.github.com/repos/{repo}/hooks",
            json=payload,
            headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
            timeout=10,
        )
    if r.status_code in (201, 422):  # 422 = already exists
        return {"status": "ok", "webhook_url": webhook_url, "repo": repo, "events": ["issues", "issue_comment", "pull_request"]}
    return {"status": "error", "github_response": r.status_code, "detail": r.text[:200]}

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


# ================== MYTHOS COMMAND ENDPOINTS ==================

class MythosCommandRequest(BaseModel):
    directive: str
    context: Optional[str] = ""
    issued_by: Optional[str] = "Mythos"

class ExecutiveTaskUpdate(BaseModel):
    status: str  # assigned | in_progress | done | blocked | cancelled
    progress_note: Optional[str] = ""

@app.post("/mythos/command")
async def mythos_issue_command(req: MythosCommandRequest):
    """Mythos ออก directive → AI แตกงาน → มอบหมาย C-Suite/Regional/Dept → แจ้ง LINE"""
    from mythos_command import issue_directive
    result = await issue_directive(req.directive, req.context or "", req.issued_by or "Mythos")
    return result

@app.get("/mythos/directives")
async def mythos_get_directives(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    limit: int = 20,
):
    """รายการ directive ทั้งหมดของ Mythos"""
    try:
        from db import AsyncSessionLocal, MythosDirective, ExecutiveTask
        from sqlalchemy import select, desc
        async with AsyncSessionLocal() as db:
            q = select(MythosDirective).order_by(desc(MythosDirective.created_at))
            if status:
                q = q.where(MythosDirective.status == status)
            if urgency:
                q = q.where(MythosDirective.urgency == urgency)
            q = q.limit(limit)
            res = await db.execute(q)
            directives = res.scalars().all()

            all_ids = [d.directive_id for d in directives]
            tasks_by_dir: dict = {}
            if all_ids:
                tq = select(ExecutiveTask).where(ExecutiveTask.directive_id.in_(all_ids))
                tr = await db.execute(tq)
                for t in tr.scalars().all():
                    tasks_by_dir.setdefault(t.directive_id, []).append({
                        "assignee": t.assignee, "assignee_title": t.assignee_title,
                        "title": t.title, "status": t.status,
                        "deadline": t.deadline.isoformat(),
                    })

        return {"directives": [
            {
                "directive_id": d.directive_id, "summary": d.summary,
                "strategic_intent": d.strategic_intent, "urgency": d.urgency,
                "status": d.status, "task_count": d.task_count,
                "success_criteria": d.success_criteria,
                "review_date": d.review_date.isoformat(),
                "created_at": d.created_at.isoformat(),
                "tasks": tasks_by_dir.get(d.directive_id, []),
            }
            for d in directives
        ], "count": len(directives)}
    except Exception as e:
        return {"directives": [], "error": str(e)}

@app.get("/mythos/dashboard")
async def mythos_dashboard():
    """Executive dashboard — stats ทั้งหมดสำหรับ Mythos"""
    try:
        from db import AsyncSessionLocal, MythosDirective, ExecutiveTask
        from sqlalchemy import select, func, desc
        from mythos_command import ORG

        async with AsyncSessionLocal() as db:
            # Directive counts by urgency + status
            dr = await db.execute(
                select(MythosDirective.urgency, MythosDirective.status, func.count().label("c"))
                .group_by(MythosDirective.urgency, MythosDirective.status)
            )
            dir_stats: dict = {}
            for urgency, status, cnt in dr.all():
                dir_stats.setdefault(urgency, {})[status] = cnt

            # Task stats by assignee
            tr = await db.execute(
                select(ExecutiveTask.assignee, ExecutiveTask.status, func.count().label("c"))
                .group_by(ExecutiveTask.assignee, ExecutiveTask.status)
            )
            exec_stats: dict = {}
            for assignee, status, cnt in tr.all():
                exec_stats.setdefault(assignee, {})[status] = cnt

            # Overdue
            odr = await db.execute(
                select(func.count()).where(
                    ExecutiveTask.deadline < datetime.utcnow(),
                    ExecutiveTask.status.notin_(["done", "cancelled"])
                )
            )
            overdue_count = odr.scalar() or 0

            # Recent directives
            recent = await db.execute(
                select(MythosDirective).order_by(desc(MythosDirective.created_at)).limit(5)
            )
            recent_list = [
                {"directive_id": d.directive_id, "summary": d.summary,
                 "urgency": d.urgency, "status": d.status,
                 "created_at": d.created_at.isoformat()}
                for d in recent.scalars().all()
            ]

        # Build exec roster with task counts
        exec_roster = {}
        for exec_id, info in ORG.items():
            stats = exec_stats.get(exec_id, {})
            total = sum(stats.values())
            done = stats.get("done", 0)
            exec_roster[exec_id] = {
                "title": info["title"], "emoji": info["emoji"],
                "tier": info["tier"], "name_th": info.get("name_th", ""),
                "tasks_total": total, "tasks_done": done,
                "tasks_overdue": 0,
                "completion_pct": int(done / total * 100) if total else 0,
            }

        return {
            "org": exec_roster,
            "directive_stats": dir_stats,
            "overdue_tasks": overdue_count,
            "recent_directives": recent_list,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        from mythos_command import ORG
        return {
            "org": {k: {"title": v["title"], "emoji": v["emoji"], "tier": v["tier"],
                        "tasks_total": 0, "tasks_done": 0, "completion_pct": 0}
                    for k, v in ORG.items()},
            "directive_stats": {}, "overdue_tasks": 0,
            "recent_directives": [], "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }

@app.patch("/mythos/task/{task_id}")
async def mythos_update_task(task_id: int, req: ExecutiveTaskUpdate):
    """Executive อัปเดตสถานะงาน"""
    valid = {"assigned", "in_progress", "done", "blocked", "cancelled"}
    if req.status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid}")
    try:
        from db import AsyncSessionLocal, ExecutiveTask
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(ExecutiveTask).where(ExecutiveTask.id == task_id))
            task = res.scalar_one_or_none()
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            task.status = req.status
            task.updated_at = datetime.utcnow()
            if req.progress_note:
                task.progress_note = req.progress_note
            await db.commit()
        return {"id": task_id, "status": req.status, "updated": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mythos/brief")
async def mythos_trigger_brief():
    """Trigger Daily Brief ด้วยตนเอง (ปกติรันอัตโนมัติ 08:00 BKK)"""
    from mythos_command import generate_daily_brief
    result = await generate_daily_brief()
    return result

@app.get("/mythos/org")
async def mythos_get_org():
    """ดูโครงสร้างองค์กรทั้งหมด"""
    from mythos_command import ORG, TIERS
    return {"org": ORG, "tiers": TIERS}

# ================== MYTHOS GOAL TRACKER ENDPOINTS ==================

class GoalCreateRequest(BaseModel):
    objective: str
    description: Optional[str] = ""
    owner: str                           # cto, cmo, th_director …
    period: Optional[str] = None         # 2026-Q2  (auto-detect if omitted)
    category: Optional[str] = "growth"  # growth, ops, product, people, financial
    priority: Optional[str] = "high"

class KeyResultRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    metric_type: Optional[str] = "number"  # number, percentage, boolean, currency
    start_value: Optional[float] = 0.0
    target_value: float
    unit: Optional[str] = ""

class CheckInRequest(BaseModel):
    value: float
    note: Optional[str] = ""
    checked_by: Optional[str] = "Mythos"

@app.post("/mythos/goals")
async def create_goal(req: GoalCreateRequest):
    """Mythos สร้าง Objective ใหม่"""
    from db import AsyncSessionLocal, MythosGoal
    from mythos_command import ORG
    from mythos_goals import current_quarter
    exec_info = ORG.get(req.owner, {})
    period = req.period or current_quarter()
    async with AsyncSessionLocal() as db:
        goal = MythosGoal(
            objective=req.objective, description=req.description or "",
            owner=req.owner, owner_title=exec_info.get("title", req.owner),
            period=period, category=req.category or "growth",
            priority=req.priority or "high", status="active", health="not_started",
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
    return {"id": goal.id, "objective": goal.objective, "owner": goal.owner,
            "owner_title": goal.owner_title, "period": period, "status": "active"}

@app.post("/mythos/goals/{goal_id}/kr")
async def add_key_result(goal_id: int, req: KeyResultRequest):
    """เพิ่ม Key Result เข้า Objective"""
    from db import AsyncSessionLocal, MythosKeyResult, MythosGoal
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MythosGoal).where(MythosGoal.id == goal_id))
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Goal not found")
        kr = MythosKeyResult(
            goal_id=goal_id, title=req.title, description=req.description or "",
            metric_type=req.metric_type or "number",
            start_value=req.start_value or 0.0, current_value=req.start_value or 0.0,
            target_value=req.target_value, unit=req.unit or "",
        )
        db.add(kr)
        await db.commit()
        await db.refresh(kr)
    return {"id": kr.id, "goal_id": goal_id, "title": kr.title,
            "target_value": kr.target_value, "unit": kr.unit}

@app.post("/mythos/goals/{goal_id}/kr/{kr_id}/checkin")
async def checkin_kr(goal_id: int, kr_id: int, req: CheckInRequest):
    """อัปเดตค่า Key Result (check-in)"""
    from db import AsyncSessionLocal, MythosKeyResult, MythosCheckIn
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MythosKeyResult).where(MythosKeyResult.id == kr_id, MythosKeyResult.goal_id == goal_id))
        kr = res.scalar_one_or_none()
        if not kr:
            raise HTTPException(status_code=404, detail="Key Result not found")
        kr.current_value = req.value
        kr.last_updated = datetime.utcnow()
        kr.updated_by = req.checked_by or "Mythos"
        checkin = MythosCheckIn(
            goal_id=goal_id, kr_id=kr_id, value=req.value,
            note=req.note or "", checked_by=req.checked_by or "Mythos",
        )
        db.add(checkin)
        await db.commit()
    pct = min(100.0, req.value / kr.target_value * 100) if kr.target_value else 0
    return {"kr_id": kr_id, "value": req.value, "target": kr.target_value,
            "progress_pct": round(pct, 1), "unit": kr.unit}

@app.get("/mythos/goals")
async def list_goals(
    period: Optional[str] = None,
    owner: Optional[str] = None,
    health: Optional[str] = None,
    status: Optional[str] = "active",
):
    """รายการ Objectives ทั้งหมด พร้อม Key Results"""
    try:
        from db import AsyncSessionLocal, MythosGoal, MythosKeyResult
        from sqlalchemy import select, desc
        import json as _json
        async with AsyncSessionLocal() as db:
            q = select(MythosGoal).order_by(desc(MythosGoal.created_at))
            if status:
                q = q.where(MythosGoal.status == status)
            if period:
                q = q.where(MythosGoal.period == period)
            if owner:
                q = q.where(MythosGoal.owner == owner)
            if health:
                q = q.where(MythosGoal.health == health)
            res = await db.execute(q)
            goals = res.scalars().all()

            result = []
            for g in goals:
                kr_res = await db.execute(
                    select(MythosKeyResult).where(MythosKeyResult.goal_id == g.id)
                )
                krs = kr_res.scalars().all()
                result.append({
                    "id": g.id, "objective": g.objective, "description": g.description,
                    "owner": g.owner, "owner_title": g.owner_title,
                    "period": g.period, "category": g.category, "priority": g.priority,
                    "status": g.status, "health": g.health, "health_reason": g.health_reason,
                    "progress_pct": round(g.progress_pct, 1),
                    "last_checked": g.last_checked.isoformat() if g.last_checked else None,
                    "created_at": g.created_at.isoformat(),
                    "key_results": [
                        {
                            "id": kr.id, "title": kr.title, "metric_type": kr.metric_type,
                            "current_value": kr.current_value, "target_value": kr.target_value,
                            "unit": kr.unit,
                            "progress_pct": round(
                                min(100.0, kr.current_value / kr.target_value * 100)
                                if kr.target_value else 0, 1
                            ),
                            "last_updated": kr.last_updated.isoformat(),
                        }
                        for kr in krs
                    ],
                })
        return {"goals": result, "count": len(result)}
    except Exception as e:
        return {"goals": [], "error": str(e)}

@app.get("/mythos/goals/{goal_id}/analysis")
async def get_goal_analysis(goal_id: int):
    """ขอ AI วิเคราะห์สุขภาพเป้าหมายล่าสุด"""
    from db import AsyncSessionLocal, MythosGoal, MythosKeyResult
    from sqlalchemy import select
    from mythos_goals import analyze_goal_health, pace_expected, quarter_dates
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MythosGoal).where(MythosGoal.id == goal_id))
        goal = res.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        kr_res = await db.execute(select(MythosKeyResult).where(MythosKeyResult.goal_id == goal_id))
        krs = kr_res.scalars().all()
    start, end = quarter_dates(goal.period)
    pace = pace_expected(start, end)
    kr_dicts = [
        {"title": kr.title, "current_value": kr.current_value,
         "target_value": kr.target_value, "unit": kr.unit,
         "progress_pct": min(100.0, kr.current_value / kr.target_value * 100) if kr.target_value else 0}
        for kr in krs
    ]
    analysis = await analyze_goal_health(goal.objective, kr_dicts, goal.owner, pace)
    return {"goal_id": goal_id, "objective": goal.objective, "pace_pct": round(pace * 100, 1),
            "analysis": analysis}

@app.post("/mythos/goals/track")
async def trigger_goal_tracker():
    """Trigger goal tracker ด้วยตนเอง"""
    from mythos_goals import run_goal_tracker
    result = await run_goal_tracker()
    return result

@app.post("/mythos/goals/weekly-report")
async def trigger_weekly_report():
    """Trigger weekly OKR report ด้วยตนเอง"""
    from mythos_goals import generate_weekly_goal_report
    result = await generate_weekly_goal_report()
    return result

@app.delete("/mythos/goals/{goal_id}")
async def delete_goal(goal_id: int):
    """ยกเลิก / ลบ Objective"""
    from db import AsyncSessionLocal, MythosGoal
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MythosGoal).where(MythosGoal.id == goal_id))
        goal = res.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal.status = "cancelled"
        goal.updated_at = datetime.utcnow()
        await db.commit()
    return {"id": goal_id, "status": "cancelled"}

# ================== LIMIT CONTROL — Admin endpoints ==================

from auth import require_admin as _require_admin

@app.get("/admin/limits")
async def get_limits(key: str = Depends(_require_admin)):
    """ดู limits ทั้งหมดพร้อม source (default/env/override)"""
    return _limits.all_limits()

class LimitUpdateRequest(BaseModel):
    value: int   # -1 = unlimited

@app.patch("/admin/limits/{name}")
async def update_limit(name: str, req: LimitUpdateRequest, key: str = Depends(_require_admin)):
    """อัปเดต limit แบบ real-time — persist ข้าม restart ผ่าน DB"""
    _limits.set_override(name, req.value)
    await _limits.save_db_override(name, req.value)
    return {"name": name, "value": req.value, "status": "updated"}

@app.delete("/admin/limits/{name}")
async def reset_limit(name: str, key: str = Depends(_require_admin)):
    """รีเซต limit กลับค่า default"""
    _limits.remove_override(name)
    try:
        from db import AsyncSessionLocal, SystemConfig
        from sqlalchemy import select, delete
        async with AsyncSessionLocal() as db:
            await db.execute(delete(SystemConfig).where(SystemConfig.key == f"limit.{name}"))
            await db.commit()
    except Exception:
        pass
    return {"name": name, "status": "reset_to_default", "default": _limits.get(name)}

@app.post("/admin/limits/unlock-all")
async def unlock_all_limits(key: str = Depends(_require_admin)):
    """ปลดลิมิตทุกอย่าง — สิทธิ์เต็ม 100%"""
    unlocks = {
        "free_ip_daily":         -1,
        "plan_free_daily":       -1,
        "plan_pro_daily":        -1,
        "plan_business_daily":   -1,
        "plan_enterprise_daily": -1,
        "bulk_max_products":     200,
        "bulk_max_parallel":     20,
        "claude_max_tokens":     8096,
        "claude_max_tokens_critic":    2000,
        "claude_max_tokens_mythos":    8096,
        "claude_max_tokens_goal":      2000,
        "claude_max_iterations":       5,
        "timeout_news_feed":     60,
        "timeout_line_notify":   30,
        "timeout_claude":        180,
        "timeout_payment":       30,
    }
    for name, value in unlocks.items():
        _limits.set_override(name, value)
        await _limits.save_db_override(name, value)
    return {"status": "all_limits_unlocked", "applied": unlocks}

# ================== TOKEN COUNTER ==================

@app.get("/tokens/today")
async def tokens_today():
    """สรุป token usage + cost วันนี้"""
    from token_counter import get_daily_summary
    return await get_daily_summary()

@app.get("/tokens/daily/{date_str}")
async def tokens_by_date(date_str: str):
    """สรุป token usage วันที่ระบุ (YYYY-MM-DD)"""
    from token_counter import get_daily_summary
    return await get_daily_summary(date_str)

@app.get("/tokens/monthly/{year}/{month}")
async def tokens_monthly(year: int, month: int):
    """สรุป token usage รายเดือน"""
    from token_counter import get_monthly_summary
    return await get_monthly_summary(year, month)

@app.get("/tokens/history")
async def tokens_history(limit: int = 50):
    """ประวัติ token usage ล่าสุด"""
    from db import AsyncSessionLocal, TokenUsage
    from sqlalchemy import select, desc
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(TokenUsage).order_by(desc(TokenUsage.created_at)).limit(limit)
        )
        rows = res.scalars().all()
    return [
        {
            "id": r.id,
            "call_type": r.call_type,
            "model": r.model,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "total_tokens": r.total_tokens,
            "cost_usd": round(r.cost_usd, 6),
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]

# ================== MASTER ORCHESTRATOR (autorun) ==================

@app.post("/system/run-all")
async def system_run_all(background_tasks: BackgroundTasks, request: Request):
    """เริ่มทุกระบบพร้อมกัน — DB, News, Goals, Tests"""
    from autorun import run_all_systems
    base_url = str(request.base_url).rstrip("/")
    background_tasks.add_task(run_all_systems, base_url)
    return {"status": "started", "message": "Autorun initiated. Check /system/status or /system/logs for results."}

@app.get("/system/status")
async def system_status():
    """สถานะ real-time ทุกโปรแกรม"""
    from autorun import get_system_status
    return get_system_status()

@app.post("/system/test-all")
async def system_test_all(request: Request):
    """รัน endpoint test suite ทั้งหมด"""
    from autorun import run_endpoint_tests, run_generate_test
    base_url = str(request.base_url).rstrip("/")
    ep = await run_endpoint_tests(base_url)
    gen = await run_generate_test(base_url)
    return {"endpoint_tests": ep, "generate_test": gen}

@app.post("/system/restart/{job_id}")
async def system_restart_job(job_id: str, request: Request):
    """Restart job เฉพาะตัว — news_monitor, goal_tracker, mythos_daily_brief, db_init"""
    from autorun import restart_job
    base_url = str(request.base_url).rstrip("/")
    return await restart_job(job_id, base_url)

@app.get("/system/logs")
async def system_logs(limit: int = 100):
    """ดู orchestrator logs ล่าสุด"""
    from autorun import get_logs
    return {"logs": get_logs(limit)}

# ================== PRODUCER ONBOARDING ==================

class ProducerRegistration(BaseModel):
    company_name: str
    company_name_en: Optional[str] = ""
    company_name_zh: Optional[str] = ""
    contact_name: str
    contact_phone: str
    contact_email: str
    province: Optional[str] = ""
    website: Optional[str] = ""
    line_id: Optional[str] = ""
    category: str
    product_count: Optional[str] = ""
    flagship_product: str
    description_th: str
    description_en: Optional[str] = ""
    description_zh: Optional[str] = ""
    min_order: Optional[str] = ""
    price_range: Optional[str] = ""
    has_certificate: bool = False
    sell_online: bool = False
    sell_offline: bool = False
    export_ready: bool = False
    target_market: List[str] = []
    social_channels: Optional[str] = ""

@app.post("/producers/register")
async def register_producer(data: ProducerRegistration, background_tasks: BackgroundTasks):
    """ลงทะเบียนผู้ผลิต / Producer Onboarding"""
    import json as _json
    registered_at = datetime.now().strftime("%d/%m/%Y %H:%M")

    # บันทึกลง DB
    from db import AsyncSessionLocal, Producer
    async with AsyncSessionLocal() as db:
        producer = Producer(
            company_name=data.company_name,
            company_name_en=data.company_name_en or "",
            company_name_zh=data.company_name_zh or "",
            contact_name=data.contact_name,
            contact_phone=data.contact_phone,
            contact_email=data.contact_email,
            province=data.province or "",
            website=data.website or "",
            line_id=data.line_id or "",
            category=data.category,
            product_count=data.product_count or "",
            flagship_product=data.flagship_product,
            description_th=data.description_th,
            description_en=data.description_en or "",
            description_zh=data.description_zh or "",
            min_order=data.min_order or "",
            price_range=data.price_range or "",
            has_certificate=data.has_certificate,
            sell_online=data.sell_online,
            sell_offline=data.sell_offline,
            export_ready=data.export_ready,
            target_market=_json.dumps(data.target_market, ensure_ascii=False),
            social_channels=data.social_channels or "",
            status="pending",
        )
        db.add(producer)
        await db.commit()
        await db.refresh(producer)
        producer_id = producer.id

    # แจ้ง Slack
    slack_webhook = os.getenv("STARTUP_SLACK_WEBHOOK") or os.getenv("SLACK_WEBHOOK_URL")
    if slack_webhook:
        async def notify_slack():
            msg = (
                f"🏭 *ผู้ผลิตใหม่ลงทะเบียน! #{producer_id}*\n"
                f"🏢 บริษัท: *{data.company_name}*"
                + (f" / {data.company_name_en}" if data.company_name_en else "") + "\n"
                f"👤 ติดต่อ: {data.contact_name} | {data.contact_phone}\n"
                f"📧 Email: {data.contact_email}\n"
                f"📦 หมวด: {data.category} | สินค้าเด่น: {data.flagship_product}\n"
                f"🌍 ตลาด: {', '.join(data.target_market) or '-'} | ส่งออก: {'✅' if data.export_ready else '❌'}\n"
                f"🕐 {registered_at}"
            )
            async with httpx.AsyncClient() as client:
                await client.post(slack_webhook, json={"text": msg}, timeout=5)
        background_tasks.add_task(notify_slack)

    # แจ้ง LINE
    line_token = os.getenv("STARTUP_LINE_TOKEN")
    line_user_id = os.getenv("STARTUP_LINE_USER_ID")
    if line_token and line_user_id:
        async def notify_line():
            msg = (
                f"🏭 ผู้ผลิตใหม่ #{producer_id}\n"
                f"บริษัท: {data.company_name}\n"
                f"ติดต่อ: {data.contact_name} {data.contact_phone}\n"
                f"หมวด: {data.category}\n"
                f"สินค้าเด่น: {data.flagship_product}\n"
                f"เวลา: {registered_at}"
            )
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.line.me/v2/bot/message/push",
                    headers={"Authorization": f"Bearer {line_token}", "Content-Type": "application/json"},
                    json={"to": line_user_id, "messages": [{"type": "text", "text": msg}]},
                    timeout=5
                )
        background_tasks.add_task(notify_line)

    logger.info(f"Producer registered #{producer_id}: {data.company_name} | {data.contact_email}")
    return {"status": "ok", "message": "ลงทะเบียนสำเร็จ", "producer_id": producer_id, "registered_at": registered_at}


@app.get("/producers/list")
async def list_producers(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """ดูรายการผู้ผลิตทั้งหมด (Admin)"""
    import json as _json
    from db import AsyncSessionLocal, Producer
    from sqlalchemy import select, func
    async with AsyncSessionLocal() as db:
        q = select(Producer).order_by(Producer.created_at.desc()).limit(limit).offset(offset)
        if status:
            q = q.where(Producer.status == status)
        result = await db.execute(q)
        producers = result.scalars().all()
        count_q = select(func.count(Producer.id))
        if status:
            count_q = count_q.where(Producer.status == status)
        total = (await db.execute(count_q)).scalar()
    return {
        "total": total,
        "producers": [{
            "id": p.id,
            "company_name": p.company_name,
            "company_name_en": p.company_name_en,
            "contact_name": p.contact_name,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "category": p.category,
            "flagship_product": p.flagship_product,
            "province": p.province,
            "export_ready": p.export_ready,
            "has_certificate": p.has_certificate,
            "target_market": _json.loads(p.target_market) if p.target_market else [],
            "status": p.status,
            "created_at": p.created_at.isoformat(),
        } for p in producers]
    }


@app.patch("/producers/{producer_id}/status")
async def update_producer_status(producer_id: int, body: dict):
    """อัปเดตสถานะผู้ผลิต: pending → contacted → onboarded"""
    from db import AsyncSessionLocal, Producer
    from sqlalchemy import select
    status = body.get("status")
    notes = body.get("notes", "")
    if status not in ("pending", "contacted", "onboarded"):
        raise HTTPException(400, "status must be pending/contacted/onboarded")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Producer).where(Producer.id == producer_id))
        producer = result.scalar_one_or_none()
        if not producer:
            raise HTTPException(404, "Producer not found")
        producer.status = status
        if notes:
            producer.notes = notes
        await db.commit()
    return {"status": "ok", "producer_id": producer_id, "new_status": status}

# ================== ERROR HUNTER ==================

@app.post("/system/error-hunt")
async def trigger_error_hunt(background_tasks: BackgroundTasks):
    """Trigger Error Hunter ทันที (Admin)"""
    from error_hunter import run_error_hunt
    background_tasks.add_task(run_error_hunt, False)
    return {"status": "started", "message": "Error Hunt กำลังรัน — ผลจะส่งไปที่ Slack + LINE"}

@app.get("/system/error-hunt")
async def run_error_hunt_sync():
    """รัน Error Hunt และรอผล (synchronous)"""
    from error_hunter import run_error_hunt
    result = await run_error_hunt(silent_if_clean=False)
    return result

# ================== PAYMENT CREATE / STATUS (Frontend endpoints) ==================

class PaymentCreateRequest(BaseModel):
    plan: str = "starter"
    method: str = "promptpay"   # promptpay | credit_card | bank_transfer
    email: Optional[str] = None
    name: Optional[str] = None

@app.post("/payment/create")
async def payment_create(req: PaymentCreateRequest):
    """Frontend calls this to initiate payment — returns QR or redirect URL"""
    from payment import generate_qr_base64, build_promptpay_payload, PROMPTPAY_ID

    prices = {"starter": 299, "pro": 799, "enterprise": 2499}
    amount = prices.get(req.plan, 299)

    import secrets as _sec
    charge_id = "OT" + __import__("datetime").datetime.now().strftime("%y%m%d%H%M%S") + _sec.token_hex(3).upper()

    if req.method == "promptpay":
        qr_b64   = generate_qr_base64(float(amount))
        payload  = build_promptpay_payload(float(amount))
        if not qr_b64:
            raise HTTPException(422, detail="PROMPTPAY_ID ยังไม่ได้ตั้งค่า — กรุณาติดต่อ admin")
        return {
            "charge_id":    charge_id,
            "status":       "pending",
            "method":       "promptpay",
            "amount":       amount,
            "currency":     "thb",
            "plan":         req.plan,
            "qr_base64":    qr_b64,
            "payload":      payload,
            "promptpay_id": PROMPTPAY_ID,
            "expires_in":   900,
        }

    # Bank transfer fallback
    return {
        "charge_id": charge_id,
        "status":    "pending",
        "method":    "bank_transfer",
        "amount":    amount,
        "currency":  "thb",
        "plan":      req.plan,
        "note":      f"โอน {amount} บาท แล้วแนบสลิปที่ /order/{charge_id}/slip",
    }

@app.get("/payment/status/{charge_id}")
async def payment_status(charge_id: str):
    """Poll payment status — manual confirm for PromptPay"""
    try:
        from db import AsyncSessionLocal, Order as OrderModel
        from sqlalchemy import select as sa_select
        async with AsyncSessionLocal() as db:
            result = await db.execute(sa_select(OrderModel).where(OrderModel.order_id == charge_id))
            order = result.scalar_one_or_none()
            if order:
                return {"charge_id": charge_id, "status": order.status, "amount": order.price}
    except Exception:
        pass
    return {"charge_id": charge_id, "status": "pending", "amount": None}

@app.post("/payment/confirm/{charge_id}")
async def payment_confirm(charge_id: str):
    """Admin manually confirms payment — triggers success"""
    try:
        from db import AsyncSessionLocal, Order as OrderModel
        from sqlalchemy import select as sa_select
        async with AsyncSessionLocal() as db:
            result = await db.execute(sa_select(OrderModel).where(OrderModel.order_id == charge_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = "successful"
                await db.commit()
                # Notify Slack
                webhook = os.getenv("SLACK_WEBHOOK_URL", "")
                if webhook:
                    import httpx as _hx
                    async with _hx.AsyncClient() as c:
                        await c.post(webhook, json={"text": f"💰 *Payment Confirmed!* charge_id={charge_id} amount={order.price} THB plan={order.package} 🎉"})
                return {"status": "successful", "charge_id": charge_id}
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"status": "not_found"}


# ================== OT-AUTOPILOT SLASH COMMAND ==================

@app.post("/slack/autopilot")
async def ot_autopilot(request: Request, background_tasks: BackgroundTasks):
    """Slack Slash Command: /ot-autopilot — เปิดโหมด AI Autopilot เต็มรูปแบบ"""
    form = await request.form()
    user_name = form.get("user_name", "unknown")
    user_id   = form.get("user_id", "")
    text      = form.get("text", "").strip()
    channel   = form.get("channel_id", "")

    async def run_autopilot():
        slack_webhook = os.getenv("SLACK_WEBHOOK_URL", "")
        if not slack_webhook:
            return

        # 1. System health check
        checks = []
        async with httpx.AsyncClient(timeout=10) as client:
            for path, label in [("/", "Frontend"), ("/producer", "Producer"), ("/payment", "Payment")]:
                try:
                    r = await client.get(f"https://openthai-ai.com{path}", follow_redirects=True)
                    checks.append(f"{'✅' if r.status_code == 200 else '❌'} {label}: {r.status_code}")
                except Exception:
                    checks.append(f"❌ {label}: timeout")

        # 2. Build report
        now_bkk = datetime.now().strftime("%d/%m/%Y %H:%M น.")
        system_lines = "\n".join(checks)

        # 3. Mission status
        mission = f"🎯 Mission วันนี้: รายได้ 100 บาทแรก ภายใน 19:00 น." if datetime.now().hour < 19 else "🏆 Mission ปิดแล้ว — รอสรุปผล"

        msg = (
            f"🤖 *OT-Autopilot เปิดใช้งานโดย @{user_name}*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"⏰ *{now_bkk}*\n\n"
            f"*🔍 System Status:*\n{system_lines}\n\n"
            f"{mission}\n\n"
            f"*📋 Guild Status Checklist:*\n"
            f"📈 Growth — หา producer + โพสต์ content ทุก channel\n"
            f"⚙️ Backend — ยืนยัน payment API พร้อม\n"
            f"💰 Finance — ตรวจ Omise keys บน Railway\n"
            f"🖥️ DevOps — monitor uptime ทุก 5 นาที\n"
            f"🎧 Support — ตอบ inquiry ทันที\n"
            f"📝 Content — โพสต์ TH/ZH/EN ทุก 2 ชั่วโมง\n\n"
            f"_พิมพ์ `/ot-autopilot status` เพื่อดูสถานะ หรือ `/ot-autopilot mission` เพื่อดู mission ปัจจุบัน_"
        )

        if text == "status":
            msg = f"📊 *OT-Autopilot Status — {now_bkk}*\n\n{system_lines}\n\n{mission}"
        elif text == "mission":
            msg = (
                f"🎯 *Mission ปัจจุบัน — {now_bkk}*\n\n"
                f"{mission}\n\n"
                f"*ช่องทางรับเงิน:*\n"
                f"💳 openthai-ai.com/payment\n"
                f"🏭 openthai-ai.com/producer\n\n"
                f"ทุกทีมลุยเลยครับ! 💪"
            )

        await client.post(slack_webhook, json={"text": msg})

    background_tasks.add_task(run_autopilot)

    return {
        "response_type": "in_channel",
        "text": f"🤖 *OT-Autopilot เปิดใช้งานแล้ว!* กำลังตรวจสอบระบบทั้งหมด... รอสักครู่นะครับ @{user_name} 🚀"
    }


# ================== CREATIVE GUILD APPLICATION ==================

class CreativeApplyRequest(BaseModel):
    name: str
    role: str
    portfolio: Optional[str] = None
    line_id: Optional[str] = None
    motivation: Optional[str] = None
    email: Optional[str] = None

@app.post("/creative/apply")
async def creative_apply(req: CreativeApplyRequest):
    """Receive Creative Guild applications and notify Slack"""
    webhook = os.getenv("SLACK_WEBHOOK_URL", "")
    if webhook:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(webhook, json={"text": (
                    f"🎨 *Creative Guild Application ใหม่!*\n"
                    f"*ตำแหน่ง:* {req.role}\n"
                    f"*ชื่อ:* {req.name}\n"
                    f"*Portfolio:* {req.portfolio or '-'}\n"
                    f"*LINE:* {req.line_id or '-'}\n"
                    f"*Email:* {req.email or '-'}\n"
                    f"*แรงบันดาลใจ:* {req.motivation or '-'}"
                )})
        except Exception:
            pass
    return {"status": "received", "message": "ได้รับใบสมัครแล้วครับ! ทีมจะติดต่อกลับภายใน 24 ชั่วโมง"}


# ================== WORKFLOW MONITOR ==================

@app.get("/workflow/status")
async def workflow_status():
    """Unified workflow monitor — ตรวจทุกระบบพร้อมกัน"""
    import time as _time

    async def check(name: str, coro):
        t0 = _time.monotonic()
        try:
            result = await coro
            ms = int((_time.monotonic() - t0) * 1000)
            return {"name": name, "status": "ok", "ms": ms, "detail": result}
        except Exception as e:
            ms = int((_time.monotonic() - t0) * 1000)
            return {"name": name, "status": "error", "ms": ms, "detail": str(e)}

    async def check_db():
        from db import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return "connected"

    async def check_payment():
        from payment import PROMPTPAY_ID, build_promptpay_payload
        if not PROMPTPAY_ID:
            raise Exception("PROMPTPAY_ID not set")
        payload = build_promptpay_payload(1.0)
        if not payload:
            raise Exception("QR payload empty")
        return f"PromptPay {PROMPTPAY_ID[:4]}****"

    async def check_slack():
        webhook = os.getenv("SLACK_WEBHOOK_URL", "")
        if not webhook:
            raise Exception("SLACK_WEBHOOK_URL not set")
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.post(webhook, json={"text": "🔍 workflow ping"})
            if r.status_code != 200:
                raise Exception(f"Slack returned {r.status_code}")
        return "webhook ok"

    async def check_anthropic():
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise Exception("ANTHROPIC_API_KEY not set")
        return f"key present ({len(key)} chars)"

    async def check_env():
        missing = [k for k in ["JWT_SECRET", "ANTHROPIC_API_KEY"] if not os.getenv(k)]
        if missing:
            raise Exception(f"missing: {missing}")
        return "all required vars present"

    results = await asyncio.gather(
        check("database",    check_db()),
        check("payment_qr",  check_payment()),
        check("slack",       check_slack()),
        check("anthropic",   check_anthropic()),
        check("env_vars",    check_env()),
    )

    overall = "ok" if all(r["status"] == "ok" for r in results) else "degraded"
    errors  = [r for r in results if r["status"] == "error"]

    return {
        "overall":    overall,
        "timestamp":  datetime.utcnow().isoformat() + "Z",
        "checks":     list(results),
        "errors":     len(errors),
        "env":        "production" if IS_PRODUCTION else "development",
        "version":    "2.2.0",
    }

@app.get("/workflow/logs")
async def workflow_logs(limit: int = 50):
    """ดู error logs ล่าสุดจาก DB"""
    try:
        from db import AsyncSessionLocal, ErrorLog
        from sqlalchemy import select, desc
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(ErrorLog).order_by(desc(ErrorLog.created_at)).limit(limit)
            )
            logs = res.scalars().all()
            return {"logs": [
                {"id": l.id, "level": l.level, "source": l.source,
                 "message": l.message, "created_at": str(l.created_at)}
                for l in logs
            ]}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.post("/workflow/ping")
async def workflow_ping():
    """Keep-alive ping — เรียกทุก 10 นาที เพื่อป้องกัน Render sleep"""
    return {"pong": True, "ts": datetime.utcnow().isoformat() + "Z"}


# ================== PROGRAM 1: TREND PRODUCT HUNTER ==================

TREND_PROMPT = """คุณคือ AI ผู้เชี่ยวชาญวิเคราะห์ตลาดสินค้า Trending ในประเทศไทยและทั่วโลก

วิเคราะห์และส่งออกข้อมูลสินค้าที่กำลัง Trending ขณะนี้ โดยครอบคลุม:
- TikTok Shop Thailand
- Shopee Thailand
- Lazada Thailand
- ตลาดโลก (Amazon, Alibaba)
- Google Trends Thailand

ตอบเป็น JSON เท่านั้น รูปแบบดังนี้:
{
  "updated_at": "ISO timestamp",
  "market": "TH",
  "trending_products": [
    {
      "rank": 1,
      "name_th": "ชื่อสินค้าภาษาไทย",
      "name_en": "Product name in English",
      "category": "หมวดหมู่",
      "trend_score": 95,
      "trend_direction": "rising|peak|stable",
      "avg_price_thb": 0,
      "demand_level": "very_high|high|medium",
      "platforms": ["TikTok", "Shopee", "Lazada"],
      "target_audience": "กลุ่มเป้าหมาย",
      "why_trending": "เหตุผลที่กำลังฮิต",
      "opportunity": "โอกาสทางธุรกิจ",
      "hashtags": ["#tag1", "#tag2"],
      "season": "ตลอดปี|Q1|Q2|Q3|Q4"
    }
  ],
  "hot_categories": ["หมวดที่ฮิตสุด"],
  "market_insight": "สรุปภาพรวมตลาด",
  "best_opportunity": "สินค้าที่ควรลงทุนเดี๋ยวนี้"
}"""

_trend_cache: dict = {"data": None, "ts": 0}

async def _fetch_trends_from_ai() -> dict:
    """ดึงข้อมูล trend จาก Claude AI"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    now = datetime.utcnow()
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"{TREND_PROMPT}\n\nวันที่วันนี้: {now.strftime('%Y-%m-%d')} (ไทย: เดือน{now.month} ปี{now.year+543})\nวิเคราะห์ 10 สินค้า Trending ที่น่าสนใจที่สุดตอนนี้"
        }]
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)

@app.get("/api/trending")
async def get_trending(bust: str = ""):
    """โปรแกรม 1: Trend Product Hunter — สินค้ากำลัง Trending อัตโนมัติ"""
    global _trend_cache
    now = time.time()
    # Cache 1 ชั่วโมง (3600 วินาที)
    if not bust and _trend_cache["data"] and (now - _trend_cache["ts"]) < 3600:
        return _trend_cache["data"]
    try:
        data = await asyncio.to_thread(_fetch_trends_from_ai)
        data["source"] = "claude_ai"
        data["ts"] = datetime.utcnow().isoformat() + "Z"
        data["cache_expires_in"] = 3600
        _trend_cache = {"data": data, "ts": now}
        # บันทึก log
        await _log_error_to_db("info", "trend_hunter", f"Fetched {len(data.get('trending_products', []))} trending products")
        return data
    except Exception as e:
        logger.error(f"[TrendHunter] {e}")
        # Fallback data เมื่อ AI ไม่พร้อม
        return {
            "ts": datetime.utcnow().isoformat() + "Z",
            "source": "fallback",
            "market": "TH",
            "trending_products": [
                {"rank": 1, "name_th": "แผ่นฟิล์มกระจกมือถือ", "name_en": "Screen Protector", "category": "อุปกรณ์มือถือ", "trend_score": 92, "trend_direction": "rising", "avg_price_thb": 99, "demand_level": "very_high", "platforms": ["TikTok", "Shopee"], "target_audience": "คนใช้สมาร์ทโฟน", "why_trending": "คนเปลี่ยนมือถือบ่อยขึ้น", "opportunity": "ขายเป็น bundle กับเคส", "hashtags": ["#ฟิล์มกระจก", "#มือถือ"], "season": "ตลอดปี"},
                {"rank": 2, "name_th": "ครีมกันแดด SPF50+", "name_en": "Sunscreen SPF50+", "category": "สกินแคร์", "trend_score": 89, "trend_direction": "peak", "avg_price_thb": 350, "demand_level": "very_high", "platforms": ["TikTok", "Shopee", "Lazada"], "target_audience": "ผู้หญิง 18-35", "why_trending": "เทรนด์ skincare ยังแรง", "opportunity": "bundle กับมอยเจอร์ไรเซอร์", "hashtags": ["#กันแดด", "#skincare"], "season": "Q2|Q3"},
            ],
            "hot_categories": ["สกินแคร์", "อุปกรณ์มือถือ", "ของใช้ในบ้าน"],
            "market_insight": "ตลาด e-commerce ไทยเติบโต 20% YoY",
            "best_opportunity": "สินค้า health & beauty ยังมาแรงมาก",
            "error": str(e)
        }

@app.get("/api/trending/categories")
async def get_trending_categories():
    """ดึงหมวดหมู่สินค้า trending แยกตามแพลตฟอร์ม"""
    return {
        "categories": [
            {"name": "สกินแคร์ & ความงาม", "icon": "💄", "growth": "+34%", "platforms": ["TikTok", "Shopee"]},
            {"name": "อาหารเสริม & สุขภาพ", "icon": "💊", "growth": "+28%", "platforms": ["Shopee", "Lazada"]},
            {"name": "อุปกรณ์มือถือ", "icon": "📱", "growth": "+22%", "platforms": ["TikTok", "Shopee", "Lazada"]},
            {"name": "เสื้อผ้าแฟชั่น", "icon": "👗", "growth": "+18%", "platforms": ["TikTok", "Shopee"]},
            {"name": "ของใช้ในบ้าน", "icon": "🏠", "growth": "+15%", "platforms": ["Shopee", "Lazada"]},
            {"name": "อาหารและขนม", "icon": "🍜", "growth": "+12%", "platforms": ["TikTok", "Shopee"]},
            {"name": "สินค้าเด็ก", "icon": "🧸", "growth": "+10%", "platforms": ["Shopee", "Lazada"]},
            {"name": "กีฬาและออกกำลังกาย", "icon": "⚽", "growth": "+9%", "platforms": ["TikTok", "Lazada"]},
        ],
        "ts": datetime.utcnow().isoformat() + "Z"
    }

# ================== PROGRAM 2: CUSTOMER FINDER ==================

class CustomerFinderRequest(BaseModel):
    product: str

CUSTOMER_FINDER_PROMPT = """คุณคือ AI ผู้เชี่ยวชาญวิเคราะห์กลุ่มลูกค้าสำหรับตลาดไทย

วิเคราะห์กลุ่มลูกค้าที่ต้องการสินค้า: {product}

ตอบเป็น JSON เท่านั้น:
{{
  "product": "{product}",
  "summary": "สรุปภาพรวมกลุ่มลูกค้า",
  "top_strategy": "กลยุทธ์หลักที่แนะนำ",
  "segments": [
    {{
      "segment_name": "ชื่อกลุ่ม",
      "description": "รายละเอียดกลุ่ม 1-2 ประโยค",
      "match_score": 95,
      "estimated_size": "500,000 คน",
      "avg_spend_thb": "฿200-500/ครั้ง",
      "platforms": ["TikTok", "Facebook", "LINE"],
      "pain_points": ["ปัญหา 1", "ปัญหา 2"],
      "buying_behavior": "พฤติกรรมการซื้อ",
      "how_to_reach": "วิธีเข้าถึงที่ได้ผล",
      "best_message": "ข้อความที่โดนใจ"
    }}
  ],
  "quick_actions": [
    "Action 1 ที่ทำได้เลยวันนี้",
    "Action 2",
    "Action 3"
  ]
}}

วิเคราะห์ 4-5 กลุ่มลูกค้าที่แตกต่างกัน"""

@app.post("/api/customer-finder")
async def find_customers(req: CustomerFinderRequest):
    """โปรแกรม 2: Customer Finder — หาลูกค้าที่ต้องการสินค้า"""
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        prompt = CUSTOMER_FINDER_PROMPT.format(product=req.product)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        result["analyzed_at"] = datetime.utcnow().isoformat() + "Z"
        return result
    except Exception as e:
        logger.error(f"[CustomerFinder] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== PROGRAM 5: HOPE — คนตกงาน ==================

class HopeRequest(BaseModel):
    situation: str
    skills: str = ""
    budget: int = 0

@app.post("/api/hope")
async def hope_guide(req: HopeRequest):
    """โปรแกรม 5: Hope — แนะนำเส้นทางสร้างรายได้จาก 0"""
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": f"""คุณคือที่ปรึกษาที่เห็นใจและช่วยคนตกงานหรือไม่มีรายได้ให้เริ่มต้นใหม่ผ่าน OpenThai.ai

สถานการณ์ผู้ใช้: {req.situation}
ทักษะที่มี: {req.skills or "ยังไม่แน่ใจ"}
งบที่มี: {req.budget} บาท

ตอบเป็น JSON เท่านั้น:
{{
  "message": "ข้อความให้กำลังใจ อบอุ่น จริงใจ 2-3 ประโยค",
  "paths": [
    {{
      "path_name": "ชื่อเส้นทาง",
      "description": "รายละเอียด",
      "timeline": "เริ่มมีรายได้ใน X วัน/สัปดาห์",
      "required_budget": "0 บาท หรือจำนวน",
      "first_step": "ขั้นตอนแรกที่ทำได้เลยตอนนี้",
      "income_potential": "รายได้โดยประมาณ X-Y บาท/เดือน",
      "difficulty": "ง่าย|ปานกลาง|ท้าทาย",
      "tools": ["เครื่องมือที่ใช้"]
    }}
  ],
  "today_action": "สิ่งที่ทำได้วันนี้เลย ภายใน 1 ชั่วโมง",
  "encouragement": "คำให้กำลังใจสุดท้าย"
}}
แนะนำ 3 เส้นทางที่เหมาะสม เรียงจากง่ายไปยาก"""}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== PROGRAM 6: AFFILIATE FOR EVERYONE ==================

class AffiliateGuideRequest(BaseModel):
    occupation: str
    daily_time: int = 1
    platform: str = "LINE"

@app.post("/api/affiliate-guide")
async def affiliate_guide(req: AffiliateGuideRequest):
    """โปรแกรม 6: Affiliate สำหรับทุกคน"""
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": f"""คุณคือผู้เชี่ยวชาญ Affiliate Marketing สำหรับคนไทย

อาชีพ: {req.occupation}
เวลาว่างต่อวัน: {req.daily_time} ชั่วโมง
แพลตฟอร์มหลัก: {req.platform}

ตอบเป็น JSON เท่านั้น:
{{
  "income_estimate": "รายได้ประมาณการต่อเดือน",
  "strategy": "กลยุทธ์ที่เหมาะกับอาชีพนี้",
  "daily_routine": ["กิจกรรม 1 (XX นาที)", "กิจกรรม 2"],
  "best_products": ["สินค้าที่เหมาะโปรโมท"],
  "content_ideas": ["ไอเดียคอนเทนต์ 1", "ไอเดีย 2", "ไอเดีย 3"],
  "first_week_plan": ["วันที่ 1: ...", "วันที่ 2-3: ...", "วันที่ 4-7: ..."],
  "tips": ["เคล็ดลับสำหรับ{occupation}"]
}}"""}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== PROGRAM 7: SMART INVESTOR GUIDE ==================

class InvestorRequest(BaseModel):
    budget: int
    risk_level: str = "medium"
    goal: str = "passive_income"

@app.post("/api/investor-guide")
async def investor_guide(req: InvestorRequest):
    """โปรแกรม 7: Smart Investor — แนะนำการลงทุนใน OpenThai.ai"""
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": f"""คุณคือที่ปรึกษาการลงทุนใน OpenThai.ai Platform

งบลงทุน: {req.budget:,} บาท
ความเสี่ยงที่รับได้: {req.risk_level}
เป้าหมาย: {req.goal}

ตอบเป็น JSON เท่านั้น:
{{
  "summary": "สรุปแผนการลงทุนที่เหมาะสม",
  "plans": [
    {{
      "plan_name": "ชื่อแผน",
      "description": "รายละเอียด",
      "investment": "จำนวนเงิน",
      "expected_return": "ผลตอบแทนที่คาดหวัง",
      "timeline": "ระยะเวลาเห็นผล",
      "risk": "ต่ำ|กลาง|สูง",
      "steps": ["ขั้นตอน 1", "ขั้นตอน 2"]
    }}
  ],
  "warning": "ข้อควรระวัง",
  "start_today": "เริ่มต้นวันนี้ทำอะไรก่อน"
}}
แนะนำ 3 แผนที่เหมาะสมกับงบนี้"""}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== PROGRAM 8: GLOBAL SAFE CONNECT ==================

@app.get("/api/global-connect/countries")
async def global_connect_countries():
    """โปรแกรม 8: รายชื่อประเทศที่รองรับ + ข้อมูลตลาด"""
    return {
        "supported_countries": [
            {"code": "TH", "name": "ไทย", "flag": "🇹🇭", "language": "th", "status": "active", "traders": "12,500+"},
            {"code": "CN", "name": "จีน", "flag": "🇨🇳", "language": "zh", "status": "active", "traders": "8,200+"},
            {"code": "JP", "name": "ญี่ปุ่น", "flag": "🇯🇵", "language": "ja", "status": "active", "traders": "3,100+"},
            {"code": "SG", "name": "สิงคโปร์", "flag": "🇸🇬", "language": "en", "status": "active", "traders": "2,800+"},
            {"code": "MY", "name": "มาเลเซีย", "flag": "🇲🇾", "language": "ms", "status": "active", "traders": "2,400+"},
            {"code": "VN", "name": "เวียดนาม", "flag": "🇻🇳", "language": "vi", "status": "active", "traders": "1,900+"},
            {"code": "KR", "name": "เกาหลีใต้", "flag": "🇰🇷", "language": "ko", "status": "coming", "traders": "—"},
            {"code": "US", "name": "สหรัฐฯ", "flag": "🇺🇸", "language": "en", "status": "coming", "traders": "—"},
            {"code": "GB", "name": "อังกฤษ", "flag": "🇬🇧", "language": "en", "status": "coming", "traders": "—"},
            {"code": "DE", "name": "เยอรมนี", "flag": "🇩🇪", "language": "de", "status": "coming", "traders": "—"},
            {"code": "AU", "name": "ออสเตรเลีย", "flag": "🇦🇺", "language": "en", "status": "coming", "traders": "—"},
            {"code": "IN", "name": "อินเดีย", "flag": "🇮🇳", "language": "hi", "status": "coming", "traders": "—"},
        ],
        "active_count": 6,
        "coming_soon": 6,
        "kyc_required": True,
        "supported_currencies": ["THB", "CNY", "USD", "EUR", "JPY", "SGD"],
        "ts": datetime.utcnow().isoformat() + "Z"
    }

# ================== PROGRAM 9: GLOBAL TAX & CUSTOMS ==================

class TaxRequest(BaseModel):
    product: str
    from_country: str
    to_country: str
    value_thb: float
    quantity: int = 1

@app.post("/api/tax-calculator")
async def tax_calculator(req: TaxRequest):
    """โปรแกรม 9: คำนวณภาษีศุลกากรอัตโนมัติ"""
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": f"""คุณคือผู้เชี่ยวชาญกฎหมายศุลกากรและภาษีนำเข้า-ส่งออกระหว่างประเทศ

สินค้า: {req.product}
จากประเทศ: {req.from_country}
ไปประเทศ: {req.to_country}
มูลค่า: {req.value_thb:,.2f} บาท
จำนวน: {req.quantity} ชิ้น

ตอบเป็น JSON เท่านั้น:
{{
  "summary": "สรุปภาษีที่ต้องชำระ",
  "hs_code": "HS Code โดยประมาณ",
  "taxes": [
    {{
      "name": "ชื่อภาษี/อากร",
      "rate": "X%",
      "amount_thb": 0,
      "description": "รายละเอียด"
    }}
  ],
  "total_tax_thb": 0,
  "total_cost_thb": 0,
  "documents_required": ["เอกสารที่ต้องใช้"],
  "estimated_clearance_days": 3,
  "tips": "เคล็ดลับประหยัดภาษีอย่างถูกกฎหมาย",
  "warning": "ข้อควรระวัง",
  "disclaimer": "ข้อมูลนี้เป็นการประมาณการเบื้องต้น ควรตรวจสอบกับผู้เชี่ยวชาญก่อนดำเนินการจริง"
}}"""}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        result = json.loads(raw)
        result["calculated_at"] = datetime.utcnow().isoformat() + "Z"
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================== AUTO BUG HUNTER ==================

async def _notify_slack_error(title: str, details: str):
    """ส่งแจ้งเตือน error ไป Slack"""
    webhook = os.getenv("SLACK_WEBHOOK_URL", "")
    if not webhook:
        return
    payload = {
        "text": f"🐛 *Auto Bug Hunter — {title}*\n```{details[:1000]}```\n_เวลา: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC_"
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(webhook, json=payload)
    except Exception:
        pass

async def _log_error_to_db(level: str, source: str, message: str):
    """บันทึก error ลง DB"""
    try:
        from db import AsyncSessionLocal, ErrorLog
        async with AsyncSessionLocal() as db:
            db.add(ErrorLog(level=level, source=source, message=message))
            await db.commit()
    except Exception:
        pass

async def _auto_scan_errors():
    """สแกนหา error อัตโนมัติ — รันทุก 5 นาที"""
    checks = []

    # 1. DB connectivity
    try:
        from db import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(select(1))  # type: ignore[arg-type]
    except Exception as e:
        checks.append(("error", "database", f"DB unreachable: {e}"))

    # 2. PromptPay QR
    try:
        from payment import generate_qr_base64
        qr = generate_qr_base64(100)
        if not qr:
            checks.append(("warning", "payment_qr", "QR returned empty — PROMPTPAY_ID missing?"))
    except Exception as e:
        checks.append(("error", "payment_qr", f"QR generation failed: {e}"))

    # 3. Anthropic API key present
    if not os.getenv("ANTHROPIC_API_KEY"):
        checks.append(("warning", "anthropic", "ANTHROPIC_API_KEY not set"))

    # 4. Required env vars
    required = ["PROMPTPAY_ID", "SLACK_WEBHOOK_URL"]
    for var in required:
        if not os.getenv(var):
            checks.append(("warning", "env_vars", f"{var} not set"))

    # 5. Log and notify all findings
    for level, source, message in checks:
        await _log_error_to_db(level, source, message)
        await _notify_slack_error(f"{source.upper()} [{level.upper()}]", message)

    return checks

async def _auto_bug_hunter_loop():
    """Background loop — สแกน error ทุก 5 นาที + keep-alive ping"""
    await asyncio.sleep(10)  # รอ app startup เสร็จก่อน
    ping_counter = 0
    while True:
        try:
            findings = await _auto_scan_errors()
            if findings:
                logger.warning(f"[BugHunter] พบ {len(findings)} issues")
            else:
                logger.info("[BugHunter] ✅ ทุกระบบปกติ")
        except Exception as e:
            logger.error(f"[BugHunter] scan failed: {e}")

        ping_counter += 1
        if ping_counter % 2 == 0:  # ทุก 10 นาที — keep Render alive
            try:
                async with httpx.AsyncClient(timeout=5) as c:
                    await c.post("http://localhost:8000/workflow/ping")
            except Exception:
                pass

        await asyncio.sleep(300)  # สแกนทุก 5 นาที

@app.on_event("startup")
async def start_auto_bug_hunter():
    asyncio.create_task(_auto_bug_hunter_loop())
    logger.info("[BugHunter] 🐛 Auto Bug Hunter started — scanning every 5 minutes")

@app.get("/bug-hunter/scan")
async def bug_hunter_scan_now():
    """Manual trigger — สแกนหา bug ทันที"""
    findings = await _auto_scan_errors()
    return {
        "scanned_at": datetime.utcnow().isoformat() + "Z",
        "issues_found": len(findings),
        "findings": [{"level": l, "source": s, "message": m} for l, s, m in findings],
        "status": "ok" if not findings else "issues_found",
    }

@app.get("/bug-hunter/history")
async def bug_hunter_history(limit: int = 50):
    """ดูประวัติ bug ที่พบจาก Auto Hunter"""
    try:
        from db import AsyncSessionLocal, ErrorLog
        from sqlalchemy import desc
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(ErrorLog)
                .where(ErrorLog.source.in_(["database", "payment_qr", "anthropic", "env_vars", "bug_hunter"]))
                .order_by(desc(ErrorLog.created_at))
                .limit(limit)
            )
            logs = res.scalars().all()
            return {
                "total": len(logs),
                "logs": [
                    {"id": l.id, "level": l.level, "source": l.source,
                     "message": l.message, "created_at": str(l.created_at)}
                    for l in logs
                ]
            }
    except Exception as e:
        return {"total": 0, "logs": [], "error": str(e)}


# ================== RUN SERVER ==================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
