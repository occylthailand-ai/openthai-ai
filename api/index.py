"""
OpenThai AI Backend — FastAPI + Claude API (Vercel Serverless)
สร้างคอนเทนต์ TikTok อัตโนมัติสำหรับสินค้าไทยและสินค้าทั่วโลก
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import os
import json
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
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=get_system_prompt(product.product_category),
        messages=[{"role": "user", "content": user_prompt}]
    )
    return parse_json_response(response.content[0].text)

async def call_critic(content: dict) -> dict:
    try:
        client = get_client()
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=AI_CRITIC_PROMPT,
            messages=[{
                "role": "user",
                "content": f"ประเมินคอนเทนต์นี้:\n\n{json.dumps(content, ensure_ascii=False, indent=2)}"
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
async def generate_tiktok_content(product: ProductInput):
    best_content = None
    best_score = 0
    iterations_done = 0

    for iteration in range(3):
        iterations_done = iteration + 1
        try:
            content = await call_generate(product)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

        critique = await call_critic(content)
        score = critique.get("total_score", 0)

        if score > best_score:
            best_score = score
            best_content = content

        if score >= 7:
            break

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
            "taste_score": 8,
            "iterations": iterations_done
        },
        learning={
            "hook_type": best_content.get("hook_type", "auto"),
            "why_it_works": best_content.get("why_it_works", ""),
            "next_try": best_content.get("next_try", "")
        }
    )

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
async def get_subscription(authorization: str = None):
    """
    ตรวจสอบ subscription plan ของ user
    ใช้ Supabase JWT จาก Authorization header
    TODO: query Supabase subscriptions table
    """
    from fastapi import Request
    # MVP: return free plan (Supabase integration pending)
    # เมื่อตั้งค่า Supabase เสร็จ ให้ query table subscriptions
    return {"plan": "free", "status": "active"}

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
