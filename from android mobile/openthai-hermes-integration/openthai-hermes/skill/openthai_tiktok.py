"""
OpenThai AI — Hermes Agent Custom Skill
สร้าง TikTok Script ภาษาไทยจากชื่อสินค้า

Install: hermes skills install ./skill/openthai_tiktok.py
"""

# skill_metadata = {
#     "name": "openthai-tiktok",
#     "description": "สร้าง TikTok script ภาษาไทยสำหรับสินค้า OTOP / ไทย-จีน / ออนไลน์",
#     "version": "1.0.0",
#     "author": "OpenThai AI",
#     "triggers": ["สร้าง script", "tiktok", "สินค้า", "โพสต์", "คอนเทนต์"],
# }

import json
import re
from datetime import datetime

SYSTEM_PROMPT = """คุณคือ OpenThai AI — ผู้เชี่ยวชาญสร้าง TikTok Script สำหรับสินค้าไทย
เชี่ยวชาญ: สินค้า OTOP, สินค้าไทย-จีน, ของใช้ในบ้าน, แฟชั่น, อาหาร, เครื่องสำอาง

กฎการสร้าง Script:
1. HOOK (3 วิ): ดึงดูดทันที ใช้ pain point หรือ curiosity
2. CONTENT (20 วิ): จุดเด่น 3 ข้อ กระชับ เข้าใจง่าย
3. CTA (7 วิ): กระตุ้นให้ซื้อ/สอบถาม/กดติดตาม
4. HASHTAG: 10 ตัวที่แม่นยำ (5 ทั่วไป + 5 เฉพาะสินค้า)

ตอบเป็น JSON เสมอ ตามโครงสร้างนี้:
{
  "hook": "...",
  "content": "...",
  "cta": "...",
  "hashtags": ["#...", ...],
  "score": 0-100,
  "tips": "คำแนะนำปรับปรุง"
}"""


def generate_script(product_name: str, product_type: str = "ทั่วไป",
                    price: str = "", target: str = "คนไทยทั่วไป") -> dict:
    """
    สร้าง TikTok script จากข้อมูลสินค้า
    ใช้กับ Hermes Agent โดย import หรือ call โดยตรง
    """
    prompt = f"""สร้าง TikTok Script สำหรับ:
สินค้า: {product_name}
ประเภท: {product_type}
ราคา: {price if price else 'ไม่ระบุ'}
กลุ่มเป้าหมาย: {target}

สร้าง script ที่น่าสนใจ ภาษาไทยเป็นธรรมชาติ ตอบเป็น JSON ตามโครงสร้างที่กำหนด"""
    return {"prompt": prompt, "system": SYSTEM_PROMPT}


def format_script_output(raw_json: dict) -> str:
    """แปลง JSON output เป็น text สวยงามสำหรับแสดงใน chat"""
    try:
        hook = raw_json.get("hook", "")
        content = raw_json.get("content", "")
        cta = raw_json.get("cta", "")
        hashtags = " ".join(raw_json.get("hashtags", []))
        score = raw_json.get("score", 0)
        tips = raw_json.get("tips", "")

        return f"""🎬 **TikTok Script**
━━━━━━━━━━━━━━━━━━━━
⚡ **Hook (3 วิ)**
{hook}

📖 **เนื้อหา (20 วิ)**
{content}

📣 **CTA (7 วิ)**
{cta}

#️⃣ **Hashtag**
{hashtags}

📊 **คะแนน: {score}/100**
💡 {tips}
━━━━━━━━━━━━━━━━━━━━"""
    except Exception as e:
        return f"Error formatting script: {e}"


# ===== Hermes Skill Entry Point =====
# Hermes จะเรียกฟังก์ชันนี้เมื่อ detect trigger keywords

def run(context: dict) -> str:
    """
    Entry point สำหรับ Hermes Agent
    context = {"message": "สร้าง script สบู่มะขาม", "history": [...], "memory": {...}}
    """
    message = context.get("message", "")

    # Parse product info from message
    product_name = message
    product_type = "ทั่วไป"
    price = ""
    target = "คนไทยทั่วไป"

    # Simple extraction patterns
    patterns = {
        "price": r"ราคา\s*([\d,]+)\s*บาท?",
        "target": r"กลุ่ม(?:เป้าหมาย)?\s*:?\s*([^\n,]+)",
        "type": r"ประเภท\s*:?\s*([^\n,]+)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, message)
        if match:
            if key == "price":
                price = match.group(1) + " บาท"
            elif key == "target":
                target = match.group(1).strip()
            elif key == "type":
                product_type = match.group(1).strip()

    # Remove keywords to get clean product name
    clean = re.sub(r"(สร้าง\s*script|tiktok|สินค้า\s*:|ราคา.*|ประเภท.*)", "", message, flags=re.IGNORECASE)
    product_name = clean.strip() or product_name

    result = generate_script(product_name, product_type, price, target)
    return json.dumps(result, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    # Test the skill locally
    test_context = {"message": "สร้าง script สบู่มะขามสด ราคา 150 บาท กลุ่มผู้หญิง 25-45 ปี"}
    print(run(test_context))
