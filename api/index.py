"""
OpenThai AI Backend — FastAPI + Claude API (Vercel Serverless)
สร้างคอนเทนต์ TikTok อัตโนมัติสำหรับสินค้าไทยและสินค้าทั่วโลก
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import os
import json
import hmac
import httpx
import asyncio
from datetime import datetime

app = FastAPI(
    title="OpenThai AI API",
    description="AI-powered TikTok content generator for Thai and global products",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== DATA MODELS ==================

class ProductInput(BaseModel):
    product_name: str
    product_category: str
    product_description: Optional[str] = ""
    target_audience: Optional[str] = "คนไทยทั่วไป"
    hook_type: Optional[str] = "auto"
    customer_pain_point: Optional[str] = ""
    seller_story: Optional[str] = ""
    unique_value: Optional[str] = ""
    common_ground: Optional[str] = ""

class PartnerRegister(BaseModel):
    name: str
    business_name: str
    phone: str
    email: str
    role: str
    province: Optional[str] = ""
    product_types: Optional[List[str]] = []
    monthly_volume: Optional[str] = ""
    social_url: Optional[str] = ""

class ContentOutput(BaseModel):
    script: dict
    caption: str
    hashtags: List[str]
    quality: dict
    learning: dict

# ================== PROMPTS ==================

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

EMPATHY_QUESTIONS = {
    "otop": {
        "customer_pain_point": "ลูกค้ามีปัญหาอะไรที่สินค้า OTOP ของคุณช่วยแก้ได้? (เช่น: หาของแท้ไม่ได้, ของถูกแต่ไม่มีคุณภาพ)",
        "seller_story": "ชุมชนหรือครอบครัวของคุณทำสินค้านี้มานานแค่ไหน? มีเรื่องราวอะไรที่น่าประทับใจ?",
        "unique_value": "สินค้า OTOP ของคุณแตกต่างจากของในห้างยังไง? วัตถุดิบ? สูตร? กรรมวิธี?",
        "common_ground": "ลูกค้าที่ซื้อสินค้าของคุณมักสนใจเรื่องอะไร? (เช่น: สนับสนุนของไทย, ชอบของ handmade, ใส่ใจสุขภาพ)"
    },
    "food": {
        "customer_pain_point": "คนที่ซื้ออาหารคุณมักบ่นเรื่องอะไรกับอาหารยี่ห้ออื่น? (รสชาติ? ราคา? หาซื้อยาก?)",
        "seller_story": "สูตรนี้มาจากไหน? ใครเป็นคนสอน? มีความทรงจำอะไรกับสูตรนี้?",
        "unique_value": "รสชาติหรือวัตถุดิบอะไรที่ทำให้อาหารของคุณแตกต่าง?",
        "common_ground": "ลูกค้าของคุณมักเป็นคนประเภทไหน? (คนรักสุขภาพ, คนคิดถึงบ้าน, คนชอบทดลอง)"
    },
    "herb": {
        "customer_pain_point": "ปัญหาสุขภาพหรือความงามอะไรที่สมุนไพรของคุณแก้ได้? คนมักมาถามเรื่องอะไร?",
        "seller_story": "ความรู้สมุนไพรนี้ได้มาจากไหน? ปราชญ์ชาวบ้าน? ตำราโบราณ? ประสบการณ์ตรง?",
        "unique_value": "กระบวนการผลิตหรือส่วนผสมอะไรที่ทำให้สมุนไพรคุณแตกต่าง?",
        "common_ground": "ลูกค้าของคุณกังวลเรื่องอะไรมากที่สุด? (สารเคมี? ราคา? ประสิทธิผล?)"
    },
    "craft": {
        "customer_pain_point": "ลูกค้ามักมองหาอะไรที่ไม่เจอในของ mass-produce? คุณค่าอะไรที่พวกเขาต้องการ?",
        "seller_story": "ช่างฝีมือที่ทำสินค้านี้คือใคร? เรียนมาจากไหน? ใช้เวลาทำชิ้นนึงนานแค่ไหน?",
        "unique_value": "เทคนิคหรือวัตถุดิบอะไรที่ทำให้งานหัตถกรรมของคุณพิเศษ?",
        "common_ground": "ลูกค้าของคุณให้ความสำคัญกับอะไร? (ความยั่งยืน? สนับสนุนชุมชน? ความสวยงาม?)"
    },
    "global": {
        "customer_pain_point": "สินค้านี้แก้ปัญหาอะไรในชีวิตประจำวันของลูกค้า? ทำให้ชีวิตดีขึ้นยังไง?",
        "seller_story": "ทำไมคุณถึงเลือกนำเข้าสินค้านี้? เจอมาได้ยังไง? ทดลองใช้เองแล้วรู้สึกยังไง?",
        "unique_value": "ทำไมต้องซื้อจากคุณ? ราคา? ของแท้? บริการ? ส่งเร็ว?",
        "common_ground": "กลุ่มลูกค้าของคุณชอบ lifestyle แบบไหน? มีงานอดิเรกหรือความสนใจอะไร?"
    }
}

# ================== HELPERS ==================

def get_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    return anthropic.Anthropic(api_key=api_key)

def get_system_prompt(category: str) -> str:
    category_map = {
        "otop": "craft", "food": "food", "beverage": "food",
        "textile": "textile", "craft": "craft", "herb": "herb",
        "beauty": "herb", "thai": "craft", "china": "global", "global": "global"
    }
    key = category_map.get(category.lower(), "global")
    return SYSTEM_PROMPTS.get(key, SYSTEM_PROMPTS["global"])

def parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

async def call_generate(product: ProductInput) -> dict:
    client = get_client()
    hook_instruction = (
        "เลือกรูปแบบ Hook ที่เหมาะสมที่สุดกับสินค้านี้"
        if product.hook_type == "auto"
        else f"ใช้รูปแบบ Hook แบบ {product.hook_type}: {HOOK_TYPES.get(product.hook_type, '')}"
    )

    empathy_block = ""
    if any([product.customer_pain_point, product.seller_story, product.unique_value, product.common_ground]):
        empathy_block = "\n【Empathy Context — ใช้ข้อมูลนี้สร้าง content ที่จริงใจ authentic】"
        if product.customer_pain_point:
            empathy_block += f"\n- ปัญหาของลูกค้า: {product.customer_pain_point}"
        if product.seller_story:
            empathy_block += f"\n- เรื่องราวผู้ขาย: {product.seller_story}"
        if product.unique_value:
            empathy_block += f"\n- สิ่งที่แตกต่าง: {product.unique_value}"
        if product.common_ground:
            empathy_block += f"\n- จุดร่วมกับผู้ชม: {product.common_ground}"

    user_prompt = f"""สร้างคอนเทนต์ TikTok สำหรับสินค้านี้:

【ข้อมูลสินค้า】
- ชื่อ: {product.product_name}
- หมวดหมู่: {product.product_category}
- รายละเอียด: {product.product_description or 'ไม่ระบุ'}
- กลุ่มเป้าหมาย: {product.target_audience}
{empathy_block}

【รูปแบบ Hook】
{hook_instruction}

{MASTER_PROMPT}"""

    response = client.messages.create(
        model="claude-sonnet-4-5",  # ✅ Fixed: was claude-sonnet-4-6 (invalid model)
        max_tokens=2000,
        system=[{
            "type": "text",
            "text": get_system_prompt(product.product_category),
            "cache_control": {"type": "ephemeral"}  # ✅ Prompt caching
        }],
        messages=[{"role": "user", "content": user_prompt}]
    )
    return parse_json_response(response.content[0].text)

async def call_critic(content: dict) -> dict:
    try:
        client = get_client()
        response = client.messages.create(
            model="claude-sonnet-4-5",  # ✅ Fixed: was claude-sonnet-4-6 (invalid model)
            max_tokens=600,
            system=[{
                "type": "text",
                "text": AI_CRITIC_PROMPT,
                "cache_control": {"type": "ephemeral"}  # ✅ Prompt caching
            }],
            messages=[{
                "role": "user",
                "content": f"ประเมินคอนเทนต์นี้:\n\n{json.dumps(content, ensure_ascii=False, indent=2)[:600]}"
            }]
        )
        return parse_json_response(response.content[0].text)
    except Exception:
        return {"total_score": 7, "feedback": "Critique unavailable", "improvement_suggestions": []}

# ================== ENDPOINTS ==================

@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "version": "1.0.0"}

@app.post("/api/generate")
@app.post("/generate")
async def generate_tiktok_content(
    product: ProductInput,
    authorization: Optional[str] = Header(default=None)
):
    # ───── ① ตรวจสอบ Free Tier Limit ─────
    user_id = await get_supabase_user(authorization) if authorization else None

    if user_id:
        quota = await check_free_quota(user_id)
        if not quota.get("allowed", True):
            remaining = quota.get("remaining", 0)
            raise HTTPException(
                status_code=402,
                detail={
                    "error":     "free_limit_reached",
                    "message":   f"ใช้ครบ {quota.get('limit', 3)} ครั้ง/เดือนแล้ว — อัปเกรด Pro เพื่อใช้งานไม่จำกัด",
                    "plan":      "free",
                    "used":      quota.get("count", 3),
                    "limit":     quota.get("limit", 3),
                    "remaining": remaining,
                    "upgrade":   "https://openthai-ai.com/payment.html"
                }
            )

    # ───── ② Generate Content ─────
    try:
        content = await call_generate(product)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    critique = await call_critic(content)
    score    = critique.get("total_score", 7)

    result = ContentOutput(
        script={
            "hook":  content.get("script", {}).get("hook", ""),
            "story": content.get("script", {}).get("story", ""),
            "cta":   content.get("script", {}).get("cta", "")
        },
        caption=content.get("caption", ""),
        hashtags=content.get("hashtags", []),
        quality={
            "critic_score": score,
            "taste_score":  8,
            "iterations":   1
        },
        learning={
            "hook_type":    content.get("hook_type", "auto"),
            "why_it_works": content.get("why_it_works", ""),
            "next_try":     content.get("next_try", "")
        }
    )

    # ───── ③ บันทึก content history → Supabase (fire-and-forget) ─────
    if user_id:
        asyncio.create_task(save_content_history(user_id, product, content, score))

    return result

@app.get("/api/empathy-questions/{category}")
@app.get("/empathy-questions/{category}")
async def get_empathy_questions(category: str):
    key = category.lower()
    if key in ("otop", "thai"):
        key = "otop"
    elif key == "china":
        key = "global"
    return EMPATHY_QUESTIONS.get(key, EMPATHY_QUESTIONS["global"])

@app.post("/api/partner/register")
@app.post("/partner/register")
async def register_partner(partner: PartnerRegister):
    partner_id = f"OTP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return {
        "success": True,
        "partner_id": partner_id,
        "message": f"ยินดีต้อนรับ {partner.name}! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง",
        "next_step": "รอ email ยืนยันจาก team@openthai-ai.com"
    }

@app.get("/api/subscription")
async def get_subscription(authorization: Optional[str] = Header(default=None)):
    """ตรวจสอบ plan ของ user จาก Supabase JWT"""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")  # service role key (server-side only)

    if not supabase_url or not supabase_key:
        return {"plan": "free", "status": "active", "note": "supabase_not_configured"}

    if not authorization or not authorization.startswith("Bearer "):
        return {"plan": "free", "status": "active"}

    token = authorization.split(" ", 1)[1]

    try:
        # ใช้ Supabase REST API ตรวจสอบ user และ subscription
        async with httpx.AsyncClient() as client:
            # 1. ดึงข้อมูล user จาก token
            user_res = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": supabase_key
                },
                timeout=5.0
            )
            if user_res.status_code != 200:
                return {"plan": "free", "status": "active"}

            user_id = user_res.json().get("id")
            if not user_id:
                return {"plan": "free", "status": "active"}

            # 2. ดึง subscription ของ user
            sub_res = await client.get(
                f"{supabase_url}/rest/v1/subscriptions",
                headers={
                    "Authorization": f"Bearer {supabase_key}",
                    "apikey": supabase_key
                },
                params={
                    "user_id": f"eq.{user_id}",
                    "status": "eq.active",
                    "select": "plan,status,expires_at"
                },
                timeout=5.0
            )
            if sub_res.status_code != 200:
                return {"plan": "free", "status": "active"}

            subs = sub_res.json()
            if not subs:
                return {"plan": "free", "status": "active"}

            sub = subs[0]

            # เช็ค expiry
            if sub.get("expires_at"):
                from datetime import timezone
                expires = datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
                if expires < datetime.now(timezone.utc):
                    return {"plan": "free", "status": "expired"}

            return {"plan": sub.get("plan", "free"), "status": sub.get("status", "active")}

    except Exception as e:
        return {"plan": "free", "status": "active", "error": str(e)}

# ================== CONTENT & QUOTA HELPERS ==================

async def check_free_quota(user_id: str) -> dict:
    """
    ตรวจสอบว่า free-tier user ใช้ครบ 3 ครั้ง/เดือนหรือยัง
    เรียก RPC check_free_limit ใน Supabase
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return {"allowed": True}  # ถ้าไม่มี Supabase → ไม่ enforce
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{url}/rest/v1/rpc/check_free_limit",
                headers={"Authorization": f"Bearer {key}", "apikey": key,
                         "Content-Type": "application/json"},
                json={"p_user_id": user_id},
                timeout=4.0
            )
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass
    return {"allowed": True}  # fail-open: ถ้า Supabase ล่มไม่บล็อก user


async def save_content_history(
    user_id: str,
    product: "ProductInput",
    content: dict,
    score: float
) -> None:
    """
    บันทึก content ที่ generate ลง Supabase content_history
    Fire-and-forget — ไม่ block response
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return

    script  = content.get("script", {})
    tags    = content.get("hashtags", [])

    row = {
        "user_id":          user_id,
        "product_name":     product.product_name,
        "product_category": product.product_category,
        "platform":         getattr(product, "platform", "tiktok") or "tiktok",
        "language":         getattr(product, "language",  "th")    or "th",
        "hook_type":        content.get("hook_type", "auto"),
        "result_hook":      script.get("hook",  ""),
        "result_script":    script.get("story", ""),
        "result_hashtags":  tags[:10] if isinstance(tags, list) else [],
        "result_cta":       script.get("cta",   ""),
        "critic_score":     score,
        "ota_earned":       5,
    }

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{url}/rest/v1/content_history",
                headers={"Authorization": f"Bearer {key}", "apikey": key,
                         "Content-Type": "application/json",
                         "Prefer": "return=minimal"},
                json=row,
                timeout=5.0
            )
    except Exception:
        pass  # ไม่ต้อง raise — saving history ล้มเหลวไม่กระทบ user


# ================== ADMIN HELPERS ==================

async def get_supabase_user(authorization: Optional[str]) -> Optional[str]:
    """Extract user_id from Supabase JWT. Returns user_id or None."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not supabase_key or not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": supabase_key},
                timeout=5.0
            )
            if res.status_code == 200:
                return res.json().get("id")
    except Exception:
        pass
    return None

async def is_admin(authorization: Optional[str]) -> bool:
    """Check if the user is admin via ADMIN_EMAILS env var."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    admin_emails = os.environ.get("ADMIN_EMAILS", "occylthailand@gmail.com")
    if not supabase_url or not supabase_key or not authorization:
        return False
    if not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ", 1)[1]
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": supabase_key},
                timeout=5.0
            )
            if res.status_code == 200:
                email = res.json().get("email", "")
                return email in [e.strip() for e in admin_emails.split(",")]
    except Exception:
        pass
    return False

async def supabase_query(path: str, params: dict = None) -> Optional[list]:
    """Query Supabase REST API with service key."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{url}/rest/v1/{path}",
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                params=params,
                timeout=8.0
            )
            return res.json() if res.status_code == 200 else None
    except Exception:
        return None

async def supabase_rpc(func: str, params: dict) -> Optional[dict]:
    """Call a Supabase RPC function."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{url}/rest/v1/rpc/{func}",
                headers={"Authorization": f"Bearer {key}", "apikey": key,
                         "Content-Type": "application/json"},
                json=params,
                timeout=8.0
            )
            return {"result": res.text, "status": res.status_code}
    except Exception as e:
        return {"error": str(e)}

async def supabase_patch(table: str, filters: dict, data: dict) -> bool:
    """PATCH rows in a Supabase table."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return False
    try:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        async with httpx.AsyncClient() as client:
            res = await client.patch(
                f"{url}/rest/v1/{table}",
                headers={"Authorization": f"Bearer {key}", "apikey": key,
                         "Content-Type": "application/json",
                         "Prefer": "return=minimal"},
                params=params,
                json=data,
                timeout=8.0
            )
            return res.status_code in (200, 204)
    except Exception:
        return False

# ================== ADMIN ENDPOINTS ==================

@app.get("/api/admin/check")
async def admin_check(authorization: Optional[str] = Header(default=None)):
    return {"is_admin": await is_admin(authorization)}

@app.get("/api/admin/stats")
async def admin_stats(authorization: Optional[str] = Header(default=None)):
    if not await is_admin(authorization):
        raise HTTPException(status_code=403, detail="Forbidden")

    payments = await supabase_query("payment_notifications", {"select": "status,amount"}) or []
    subs      = await supabase_query("subscriptions",
                                     {"select": "plan,status",
                                      "plan": "neq.free"}) or []
    profiles  = await supabase_query("profiles", {"select": "id"}) or []

    pending  = sum(1 for p in payments if p.get("status") == "pending")
    paid     = sum(1 for p in payments if p.get("status") == "approved")
    revenue  = sum(p.get("amount", 0) or 0 for p in payments
                   if p.get("status") == "approved")

    return {
        "total_users":   len(profiles),
        "paid_users":    len([s for s in subs if s.get("plan") != "free"]),
        "pending_count": pending,
        "total_revenue": revenue
    }

@app.get("/api/admin/payments")
async def admin_payments(
    status: Optional[str] = "pending",
    authorization: Optional[str] = Header(default=None)
):
    if not await is_admin(authorization):
        raise HTTPException(status_code=403, detail="Forbidden")

    params = {"select": "id,ref_number,plan,amount,name,phone,email,status,created_at",
              "order": "created_at.desc", "limit": "100"}
    if status and status != "all":
        params["status"] = f"eq.{status}"

    rows = await supabase_query("payment_notifications", params)
    return rows or []

class ActivateRequest(BaseModel):
    ref_number: str
    plan: str = "pro"
    months: int = 1

@app.post("/api/admin/activate")
async def admin_activate(
    req: ActivateRequest,
    authorization: Optional[str] = Header(default=None)
):
    if not await is_admin(authorization):
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await supabase_rpc("activate_subscription", {
        "p_ref_number": req.ref_number,
        "p_plan":       req.plan,
        "p_months":     req.months
    })
    if not result or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("error", "RPC failed"))
    if "ERROR" in str(result.get("result", "")):
        raise HTTPException(status_code=400, detail=result["result"])

    return {"ok": True, "result": result.get("result")}

class RejectRequest(BaseModel):
    ref_number: str

@app.post("/api/admin/reject")
async def admin_reject(
    req: RejectRequest,
    authorization: Optional[str] = Header(default=None)
):
    if not await is_admin(authorization):
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = await supabase_patch(
        "payment_notifications",
        {"ref_number": req.ref_number},
        {"status": "rejected", "reviewed_at": datetime.now().isoformat()}
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Update failed")
    return {"ok": True}

@app.get("/api/admin/users")
async def admin_users(authorization: Optional[str] = Header(default=None)):
    if not await is_admin(authorization):
        raise HTTPException(status_code=403, detail="Forbidden")

    profiles = await supabase_query(
        "profiles",
        {"select": "id,name,created_at", "order": "created_at.desc", "limit": "200"}
    ) or []
    subs = await supabase_query(
        "subscriptions",
        {"select": "user_id,plan,status,expires_at"}
    ) or []

    sub_map = {s["user_id"]: s for s in subs}

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    email_map = {}
    if url and key:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{url}/auth/v1/admin/users",
                    headers={"Authorization": f"Bearer {key}", "apikey": key},
                    params={"per_page": 200},
                    timeout=8.0
                )
                if res.status_code == 200:
                    for u in res.json().get("users", []):
                        email_map[u["id"]] = u.get("email", "")
        except Exception:
            pass

    result = []
    for p in profiles:
        uid = p["id"]
        sub = sub_map.get(uid, {})
        result.append({
            "id":         uid,
            "name":       p.get("name") or "",
            "email":      email_map.get(uid, ""),
            "plan":       sub.get("plan", "free"),
            "status":     sub.get("status", "active"),
            "expires_at": sub.get("expires_at"),
            "created_at": p.get("created_at")
        })
    return result

class PaymentNotify(BaseModel):
    ref_number: str
    plan: str
    amount: int
    name: str
    phone: str
    email: str

@app.post("/api/payment/notify")
async def payment_notify(
    body: PaymentNotify,
    authorization: Optional[str] = Header(default=None)
):
    """บันทึกการแจ้งชำระเงินลง Supabase payment_notifications"""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return {"ok": True, "note": "supabase_not_configured"}

    # ดึง user_id จาก JWT (optional — ถ้าไม่มี session ก็ยังบันทึกได้)
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        user_id = await get_supabase_user(authorization)

    row = {
        "ref_number": body.ref_number,
        "plan":       body.plan,
        "amount":     body.amount,
        "name":       body.name,
        "phone":      body.phone,
        "email":      body.email,
        "status":     "pending",
    }
    if user_id:
        row["user_id"] = user_id

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{url}/rest/v1/payment_notifications",
                headers={
                    "Authorization": f"Bearer {key}",
                    "apikey": key,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json=row,
                timeout=8.0
            )
            if res.status_code not in (200, 201, 204):
                raise HTTPException(status_code=500, detail=f"DB error: {res.text}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "ref_number": body.ref_number}

@app.get("/api/hook-types")
@app.get("/hook-types")
async def get_hook_types():
    return HOOK_TYPES

@app.get("/api/categories")
@app.get("/categories")
async def get_categories():
    return {
        "otop": "สินค้า OTOP (หนึ่งตำบลหนึ่งผลิตภัณฑ์)",
        "food": "อาหารและเครื่องดื่มไทย",
        "herb": "สมุนไพร & ความงาม",
        "craft": "หัตถกรรม & ของใช้",
        "textile": "ผ้าและสิ่งทอ",
        "global": "สินค้านำเข้า (จีน, Global)"
    }
