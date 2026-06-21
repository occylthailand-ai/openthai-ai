"""
OpenThai AI Backend — FastAPI + Claude API
สร้างคอนเทนต์ TikTok อัตโนมัติสำหรับสินค้าไทยและสินค้าทั่วโลก

วิธีรัน:
1. pip install fastapi uvicorn anthropic python-dotenv
2. สร้างไฟล์ .env และใส่ ANTHROPIC_API_KEY=your_key
3. uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import os
from dotenv import load_dotenv
import json
from datetime import datetime
import pathlib
import secrets
import hashlib

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="OpenThai AI API",
    description="AI-powered TikTok content generator for Thai and global products",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def generate_tiktok_content(product: ProductInput):
    """
    Generate TikTok content for a product
    
    - **product_name**: ชื่อสินค้า
    - **product_category**: หมวดหมู่ (otop, thai, china, global)
    - **product_description**: รายละเอียดสินค้า (optional)
    - **target_audience**: กลุ่มเป้าหมาย (optional)
    - **hook_type**: รูปแบบ Hook (story, process, contrast, question, transformation, auto)
    """
    
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

# ================== EARLY ACCESS + AFFILIATE ==================

EARLY_ACCESS_FILE = pathlib.Path("data/early_access.json")
AFFILIATE_REFERRALS_FILE = pathlib.Path("data/affiliate_referrals.json")
AFFILIATE_SALES_FILE = pathlib.Path("data/affiliate_sales.json")
EARLY_ACCESS_FILE.parent.mkdir(exist_ok=True)

# Commission rate (%) per platform
PLATFORM_COMMISSION = {
    "tiktok": 10,
    "shopee": 10,
    "lazada": 10,
    "facebook": 8,
    "instagram": 8,
    "line": 8,
    "other": 5,
}

def _read_json(path: pathlib.Path) -> list:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []

def _write_json(path: pathlib.Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def _generate_affiliate_code(email: str) -> str:
    """สร้าง affiliate code ที่ unique จาก email + random token"""
    token = secrets.token_hex(4).upper()
    prefix = hashlib.md5(email.encode()).hexdigest()[:4].upper()
    return f"OT-{prefix}{token}"


class EarlyAccessRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    line_id: Optional[str] = ""
    role: str
    referred_by: Optional[str] = ""  # affiliate code ของคนที่แนะนำ


class SaleNotification(BaseModel):
    affiliate_code: str          # code ของ affiliate ที่แชร์
    platform: str                # tiktok | shopee | lazada | facebook | instagram | line | other
    platform_order_id: str       # order ID จาก platform
    sale_amount: float           # ยอดขาย (บาท)
    buyer_platform_id: str       # ID ของผู้ซื้อบน platform
    seller_platform_id: str      # ID ของผู้ขายบน platform


class PayoutRequest(BaseModel):
    affiliate_code: str


@app.post("/api/early-access/register")
async def register_early_access(req: EarlyAccessRequest):
    """ลงทะเบียน Early Access + สร้าง affiliate link"""
    records = _read_json(EARLY_ACCESS_FILE)

    if any(r.get("email") == req.email for r in records):
        raise HTTPException(status_code=409, detail="อีเมลนี้ลงทะเบียนไว้แล้ว")

    affiliate_code = _generate_affiliate_code(req.email)
    entry = {
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "line_id": req.line_id,
        "role": req.role,
        "affiliate_code": affiliate_code,
        "referred_by": req.referred_by or "",
        "registered_at": datetime.utcnow().isoformat(),
    }
    records.append(entry)
    _write_json(EARLY_ACCESS_FILE, records)

    # บันทึก referral ถ้ามีคนแนะนำ
    if req.referred_by:
        referrals = _read_json(AFFILIATE_REFERRALS_FILE)
        referrals.append({
            "referrer_code": req.referred_by,
            "new_member_email": req.email,
            "new_member_affiliate_code": affiliate_code,
            "referred_at": datetime.utcnow().isoformat(),
        })
        _write_json(AFFILIATE_REFERRALS_FILE, referrals)

    affiliate_link = f"https://openthai.ai/early-access?ref={affiliate_code}"
    return {
        "ok": True,
        "message": f"ยินดีต้อนรับ {req.name}!",
        "total": len(records),
        "affiliate_code": affiliate_code,
        "affiliate_link": affiliate_link,
    }


@app.get("/api/early-access/count")
async def early_access_count():
    """จำนวนผู้ลงทะเบียน Early Access"""
    records = _read_json(EARLY_ACCESS_FILE)
    return {"count": len(records)}


@app.post("/api/affiliate/sale")
async def record_sale(sale: SaleNotification):
    """บันทึกยอดขายที่เกิดจาก affiliate link และคำนวณ commission"""
    records = _read_json(EARLY_ACCESS_FILE)
    affiliate = next((r for r in records if r.get("affiliate_code") == sale.affiliate_code), None)
    if not affiliate:
        raise HTTPException(status_code=404, detail="ไม่พบ affiliate code นี้")

    platform_key = sale.platform.lower()
    commission_rate = PLATFORM_COMMISSION.get(platform_key, PLATFORM_COMMISSION["other"])
    commission_amount = round(sale.sale_amount * commission_rate / 100, 2)

    sales = _read_json(AFFILIATE_SALES_FILE)
    entry = {
        "affiliate_code": sale.affiliate_code,
        "affiliate_email": affiliate["email"],
        "platform": platform_key,
        "platform_order_id": sale.platform_order_id,
        "buyer_platform_id": sale.buyer_platform_id,
        "seller_platform_id": sale.seller_platform_id,
        "sale_amount": sale.sale_amount,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "status": "pending",  # pending → paid
        "recorded_at": datetime.utcnow().isoformat(),
        "paid_at": None,
    }
    sales.append(entry)
    _write_json(AFFILIATE_SALES_FILE, sales)

    return {
        "ok": True,
        "commission_amount": commission_amount,
        "commission_rate": commission_rate,
        "status": "pending",
        "message": f"บันทึกยอดขายแล้ว commission {commission_rate}% = ฿{commission_amount:,.2f}",
    }


@app.post("/api/affiliate/payout")
async def process_payout(req: PayoutRequest):
    """โอน commission ที่ pending ทั้งหมดให้ affiliate ในทันทีที่เงินเข้า OpenThai.ai"""
    sales = _read_json(AFFILIATE_SALES_FILE)

    pending = [s for s in sales if s.get("affiliate_code") == req.affiliate_code and s.get("status") == "pending"]
    if not pending:
        return {"ok": True, "message": "ไม่มียอด commission ที่รอโอน", "paid_amount": 0}

    total = sum(s["commission_amount"] for s in pending)
    paid_at = datetime.utcnow().isoformat()

    for s in sales:
        if s.get("affiliate_code") == req.affiliate_code and s.get("status") == "pending":
            s["status"] = "paid"
            s["paid_at"] = paid_at

    _write_json(AFFILIATE_SALES_FILE, sales)

    return {
        "ok": True,
        "paid_amount": round(total, 2),
        "paid_count": len(pending),
        "paid_at": paid_at,
        "message": f"โอน commission ฿{total:,.2f} จาก {len(pending)} รายการเรียบร้อย",
    }


@app.get("/api/affiliate/summary/{affiliate_code}")
async def affiliate_summary(affiliate_code: str):
    """สรุปยอด commission ของ affiliate แยกตาม platform"""
    records = _read_json(EARLY_ACCESS_FILE)
    affiliate = next((r for r in records if r.get("affiliate_code") == affiliate_code), None)
    if not affiliate:
        raise HTTPException(status_code=404, detail="ไม่พบ affiliate code นี้")

    sales = _read_json(AFFILIATE_SALES_FILE)
    my_sales = [s for s in sales if s.get("affiliate_code") == affiliate_code]

    by_platform = {}
    for s in my_sales:
        p = s["platform"]
        if p not in by_platform:
            by_platform[p] = {"sales": 0, "commission": 0, "count": 0}
        by_platform[p]["sales"] += s["sale_amount"]
        by_platform[p]["commission"] += s["commission_amount"]
        by_platform[p]["count"] += 1

    referrals = _read_json(AFFILIATE_REFERRALS_FILE)
    my_referrals = [r for r in referrals if r.get("referrer_code") == affiliate_code]

    return {
        "affiliate_code": affiliate_code,
        "name": affiliate["name"],
        "affiliate_link": f"https://openthai.ai/early-access?ref={affiliate_code}",
        "total_sales": round(sum(s["sale_amount"] for s in my_sales), 2),
        "total_commission_pending": round(sum(s["commission_amount"] for s in my_sales if s["status"] == "pending"), 2),
        "total_commission_paid": round(sum(s["commission_amount"] for s in my_sales if s["status"] == "paid"), 2),
        "by_platform": by_platform,
        "referral_count": len(my_referrals),
    }


# ================== TREND PRODUCT HUNTER ==================

class TrendRequest(BaseModel):
    category: Optional[str] = "all"   # all | food | fashion | beauty | tech | home
    platform: Optional[str] = "all"   # all | tiktok | shopee | lazada
    market: Optional[str] = "TH"      # TH | CN | INTL

@app.post("/api/trend-hunter/search")
async def trend_hunter_search(req: TrendRequest):
    """AI จะค้นให้ว่าตอนนี้ควรขายอะไร"""
    prompt = f"""คุณเป็น AI ผู้เชี่ยวชาญด้านการค้าออนไลน์ไทย
วันนี้คือ {datetime.utcnow().strftime('%Y-%m-%d')} ตลาด: {req.market} แพลตฟอร์ม: {req.platform} หมวด: {req.category}

วิเคราะห์และแนะนำ 5 สินค้าที่น่าขายที่สุดตอนนี้ ตอบเป็น JSON:
{{
  "trending_products": [
    {{
      "rank": 1,
      "name": "ชื่อสินค้า",
      "category": "หมวดหมู่",
      "why_now": "เหตุผลที่ควรขายตอนนี้",
      "target_platform": "แพลตฟอร์มที่เหมาะ",
      "estimated_margin": "กำไรโดยประมาณ %",
      "competition_level": "low|medium|high",
      "quick_tip": "เคล็ดลับการขาย"
    }}
  ],
  "market_insight": "ภาพรวมตลาดตอนนี้",
  "best_timing": "ช่วงเวลาที่ควรโพสต์"
}}"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================== CUSTOMER FINDER ==================

class CustomerFinderRequest(BaseModel):
    product_name: str
    product_category: Optional[str] = ""
    platform: Optional[str] = "all"
    market: Optional[str] = "TH"

@app.post("/api/customer-finder/analyze")
async def customer_finder_analyze(req: CustomerFinderRequest):
    """AI จะค้นหากลุ่มลูกค้าที่ใช่ให้ทันที"""
    prompt = f"""คุณเป็น AI ผู้เชี่ยวชาญด้าน Customer Segmentation สำหรับตลาดออนไลน์ไทย
สินค้า: {req.product_name} | หมวด: {req.product_category} | แพลตฟอร์ม: {req.platform} | ตลาด: {req.market}

วิเคราะห์กลุ่มลูกค้าที่ใช่ ตอบเป็น JSON:
{{
  "primary_segments": [
    {{
      "segment_name": "ชื่อกลุ่ม",
      "age_range": "ช่วงอายุ",
      "gender": "เพศ",
      "income_level": "ระดับรายได้",
      "interests": ["ความสนใจ"],
      "pain_points": ["ปัญหาที่เขาเจอ"],
      "where_to_find": ["ช่องทางหาลูกค้า"],
      "best_message": "ข้อความที่โดนใจเขา",
      "conversion_rate": "โอกาสซื้อสูง|ปานกลาง|ต่ำ"
    }}
  ],
  "total_market_size": "ขนาดตลาดโดยประมาณ",
  "best_platform": "แพลตฟอร์มที่เข้าถึงลูกค้าได้ดีสุด",
  "content_style": "สไตล์คอนเทนต์ที่เหมาะ"
}}"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================== GLOBAL SAFE CONNECT ==================

class GlobalConnectRequest(BaseModel):
    business_type: str              # ประเภทธุรกิจ
    product_category: Optional[str] = ""
    current_platforms: Optional[List[str]] = []  # platform ที่ใช้อยู่แล้ว
    target_market: Optional[str] = ""  # ตลาดที่ต้องการ

@app.post("/api/global-connect/recommend")
async def global_connect_recommend(req: GlobalConnectRequest):
    """AI แนะนำช่องทางการเชื่อมต่อที่เหมาะกับคุณ"""
    prompt = f"""คุณเป็น AI ผู้เชี่ยวชาญด้าน Global E-Commerce และการขยายธุรกิจต่างประเทศ
ธุรกิจ: {req.business_type} | สินค้า: {req.product_category}
Platform ปัจจุบัน: {', '.join(req.current_platforms) or 'ยังไม่มี'} | เป้าหมาย: {req.target_market or 'ทั่วโลก'}

แนะนำช่องทางการเชื่อมต่อที่เหมาะที่สุด ตอบเป็น JSON:
{{
  "recommended_channels": [
    {{
      "rank": 1,
      "channel_name": "ชื่อช่องทาง",
      "channel_type": "marketplace|social|b2b|wholesale",
      "target_country": ["ประเทศเป้าหมาย"],
      "setup_difficulty": "ง่าย|ปานกลาง|ยาก",
      "cost_estimate": "ค่าใช้จ่ายโดยประมาณ",
      "time_to_first_sale": "ระยะเวลาถึงยอดขายแรก",
      "why_suitable": "เหตุผลที่เหมาะ",
      "first_step": "ขั้นตอนแรกที่ต้องทำ",
      "safety_tips": ["เคล็ดลับความปลอดภัย"]
    }}
  ],
  "legal_note": "ข้อควรระวังทางกฎหมาย",
  "payment_recommendation": "ช่องทางรับเงินที่แนะนำ",
  "logistics_tip": "คำแนะนำการขนส่ง"
}}"""
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================== RUN SERVER ==================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
