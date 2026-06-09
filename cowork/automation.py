"""
OpenThai AI — Cowork Desktop Automation (Unified Engine)
ใช้กับ Claude Cowork สำหรับ batch content generation

🔗 รวมเป็นหนึ่งเดียวกับ OpenThai.ai:
   Cowork ไม่ได้สร้างคอนเทนต์ด้วย prompt ของตัวเองแยกอีกต่อไป —
   แต่เรียก "engine กลาง" ตัวเดียวกับเว็บ/แอป ผ่าน POST {OPENTHAI_API_URL}/api/generate
   => คอนเทนต์จาก Cowork = คอนเทนต์จากแพลตฟอร์ม (สูตร Hook/Story/CTA + AI Critic + Learning เดียวกัน)
   ถ้าต่อ backend ไม่ได้ จะ fallback ให้ Claude Cowork สร้างเองตาม COWORK_SYSTEM_PROMPT

วิธีใช้งาน:
1. รัน backend ของ OpenThai.ai (หรือชี้ OPENTHAI_API_URL ไป production)
2. เปิด Claude Cowork แล้ว Drop products.csv ลงใน input/ folder
3. สคริปต์นี้จะเรียก engine กลางให้ทุกสินค้า แล้วบันทึกผลใน output/
"""

import os
import json
import csv
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ================== CONFIGURATION ==================

INPUT_FOLDER = Path("./input")
OUTPUT_FOLDER = Path("./output")
LOG_FOLDER = Path("./logs")

# Create folders if not exist
for folder in [INPUT_FOLDER, OUTPUT_FOLDER, LOG_FOLDER]:
    folder.mkdir(exist_ok=True)

# 🔗 Unified engine — เรียก backend เดียวกับเว็บ/แอป (ตั้ง OPENTHAI_API_URL ชี้ production ได้)
OPENTHAI_API_URL = os.environ.get("OPENTHAI_API_URL", "http://localhost:8000").rstrip("/")
GENERATE_ENDPOINT = f"{OPENTHAI_API_URL}/api/generate"
API_TIMEOUT = int(os.environ.get("OPENTHAI_API_TIMEOUT", "30"))

# ================== COWORK TRIGGERS ==================

def on_file_drop(file_path: str) -> dict:
    """
    Trigger เมื่อมีไฟล์ถูก drop ลงใน Cowork
    รองรับ: .csv, .json, .txt
    """
    file_path = Path(file_path)
    
    if file_path.suffix == '.csv':
        return process_csv_batch(file_path)
    elif file_path.suffix == '.json':
        return process_json_batch(file_path)
    elif file_path.suffix == '.txt':
        return process_single_product(file_path.read_text())
    else:
        return {"error": f"Unsupported file type: {file_path.suffix}"}

def process_csv_batch(file_path: Path) -> dict:
    """Process batch products from CSV file"""
    results = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            product = {
                "product_name": row.get("name", row.get("product_name", "")),
                "category": row.get("category", "otop"),
                "description": row.get("description", ""),
                "audience": row.get("audience", "คนไทยทั่วไป"),
                "hook_type": row.get("hook_type", "auto")
            }
            results.append(product)
    
    return {
        "type": "batch",
        "count": len(results),
        "products": results
    }

def process_json_batch(file_path: Path) -> dict:
    """Process batch products from JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if isinstance(data, list):
        return {"type": "batch", "count": len(data), "products": data}
    else:
        return {"type": "single", "count": 1, "products": [data]}

def process_single_product(text: str) -> dict:
    """Process single product from text"""
    return {
        "type": "single",
        "count": 1,
        "products": [{
            "product_name": text.strip(),
            "category": "auto",
            "hook_type": "auto"
        }]
    }

# ================== UNIFIED ENGINE (shared with web/app) ==================

def generate_via_backend(product: dict) -> dict | None:
    """เรียก engine กลางของ OpenThai.ai (POST /api/generate) — สูตรเดียวกับเว็บ/แอป
    คืน None ถ้าต่อ backend ไม่ได้ (ให้ caller fallback ไป Cowork-local)"""
    form = {
        "product":  product.get("product_name", ""),
        "category": product.get("category", "otop"),
        "platform": product.get("platform", "TikTok"),
        "style":    product.get("style", "sales"),
        "lang":     product.get("lang", "ภาษาไทย"),
        "price":    product.get("price", ""),
        "audience": product.get("audience", "คนไทยทั่วไป"),
    }
    data = json.dumps(form).encode("utf-8")
    req = urllib.request.Request(
        GENERATE_ENDPOINT, data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            r = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"   ⚠️  backend ไม่ตอบ ({e}) — fallback ให้ Cowork สร้างเอง")
        return None

    # map response ของ engine กลาง → schema ของ Cowork (สูตรเดียวกัน)
    steps = r.get("script", []) or []
    return {
        "product_name": form["product"],
        "content": {
            "script": {
                "hook":  r.get("hook", ""),
                "story": "\n".join(steps[:-1]) if len(steps) > 1 else "\n".join(steps),
                "cta":   steps[-1] if steps else "",
            },
            "caption":  r.get("caption", ""),
            "hashtags": r.get("hashtags", []),
        },
        "quality": {"critic_score": r.get("criticScore", ""), "taste_score": ""},
        "learning": {"hook_type": product.get("hook_type", "auto"), "why_it_works": ""},
        "source": r.get("source", "openthai-backend"),
    }


def generate_content(product: dict) -> dict:
    """สร้างคอนเทนต์ 1 สินค้า ผ่าน engine กลางก่อน ถ้าไม่ได้จึงคืน stub ให้ Cowork เติม"""
    result = generate_via_backend(product)
    if result is not None:
        return result
    # fallback — ให้ Claude Cowork เติมตาม COWORK_SYSTEM_PROMPT
    return {
        "product_name": product.get("product_name", ""),
        "content": {"script": {"hook": "", "story": "", "cta": ""}, "caption": "", "hashtags": []},
        "quality": {"critic_score": "", "taste_score": ""},
        "learning": {"hook_type": product.get("hook_type", "auto"), "why_it_works": ""},
        "source": "cowork-local",
        "_needs_cowork_fill": True,
    }


# ================== OUTPUT HANDLERS ==================

def save_results(results: list, batch_name: str = None) -> str:
    """Save generated content to output folder"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    batch_name = batch_name or f"batch_{timestamp}"
    
    output_file = OUTPUT_FOLDER / f"{batch_name}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # Also create CSV for easy viewing
    csv_file = OUTPUT_FOLDER / f"{batch_name}.csv"
    if results:
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "product_name", "hook", "story", "cta", 
                "caption", "hashtags", "critic_score", "hook_type"
            ])
            for r in results:
                content = r.get("content", {})
                script = content.get("script", {})
                quality = r.get("quality", {})
                learning = r.get("learning", {})
                
                writer.writerow([
                    r.get("product_name", ""),
                    script.get("hook", ""),
                    script.get("story", ""),
                    script.get("cta", ""),
                    content.get("caption", ""),
                    ", ".join(content.get("hashtags", [])),
                    quality.get("critic_score", ""),
                    learning.get("hook_type", "")
                ])
    
    return str(output_file)

def log_activity(action: str, details: dict):
    """Log activity for tracking"""
    timestamp = datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "action": action,
        **details
    }
    
    log_file = LOG_FOLDER / f"activity_{datetime.now().strftime('%Y%m%d')}.jsonl"
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

# ================== COWORK PROMPT TEMPLATES ==================

COWORK_SYSTEM_PROMPT = """
คุณคือ OpenThai AI Content Generator ที่ทำงานผ่าน Claude Cowork

เมื่อได้รับไฟล์สินค้า ให้:
1. อ่านและ parse ข้อมูลสินค้า
2. สร้างคอนเทนต์ TikTok สำหรับแต่ละสินค้า
3. บันทึกผลลัพธ์ลง output folder
4. รายงานสรุปผลการทำงาน

【Output Format per Product】
{
  "product_name": "...",
  "content": {
    "script": {"hook": "...", "story": "...", "cta": "..."},
    "caption": "...",
    "hashtags": ["...", "..."]
  },
  "quality": {"critic_score": 0, "taste_score": 0},
  "learning": {"hook_type": "...", "why_it_works": "..."}
}
"""

BATCH_INSTRUCTION = """
【Batch Processing Mode】
มีสินค้า {count} รายการที่ต้องสร้างคอนเทนต์:

{product_list}

กรุณาสร้างคอนเทนต์สำหรับแต่ละสินค้า โดย:
- ใช้ Hook ที่เหมาะสมกับแต่ละสินค้า
- ให้คะแนน critic_score ตนเอง
- บันทึกผลลัพธ์แยกเป็นแต่ละ product

เริ่มทำงานเลย!
"""

# ================== MAIN EXECUTION ==================

def main():
    """Main execution for Cowork automation"""
    print("🇹🇭 OpenThai AI Cowork Automation Ready")
    print("=" * 50)
    print("Drop files into input/ folder to start processing")
    print("Supported formats: .csv, .json, .txt")
    print("=" * 50)
    
    # Watch for files in input folder
    import time
    processed_files = set()
    
    while True:
        for file_path in INPUT_FOLDER.iterdir():
            if file_path.is_file() and file_path.name not in processed_files:
                print(f"\n📥 Processing: {file_path.name}")
                
                result = on_file_drop(str(file_path))

                if "error" not in result:
                    print(f"✅ Found {result['count']} products — generating via unified engine…")
                    # สร้างคอนเทนต์ทุกสินค้าผ่าน engine กลาง (เดียวกับเว็บ/แอป)
                    generated = [generate_content(p) for p in result["products"]]
                    out_path = save_results(generated, batch_name=file_path.stem)
                    n_engine = sum(1 for g in generated if not g.get("_needs_cowork_fill"))

                    log_activity("file_processed", {
                        "file": file_path.name,
                        "type": result["type"],
                        "count": result["count"],
                        "via_backend": n_engine,
                        "via_cowork_fallback": result["count"] - n_engine,
                        "output": out_path,
                    })
                    print(f"   💾 saved → {out_path}  ({n_engine}/{result['count']} ผ่าน engine กลาง)")

                    # Move file to processed
                    processed_files.add(file_path.name)
                else:
                    print(f"❌ Error: {result['error']}")
        
        time.sleep(2)  # Check every 2 seconds

if __name__ == "__main__":
    main()
