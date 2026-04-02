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

# ================== RUN SERVER ==================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
