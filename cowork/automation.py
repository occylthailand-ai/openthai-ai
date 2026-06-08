"""
OpenThaiAi — Cowork Desktop Automation
ใช้กับ Claude Cowork สำหรับ batch content generation

วิธีใช้งาน:
1. เปิด Claude Cowork
2. Drop file products.csv ลงใน Cowork
3. Cowork จะ trigger script นี้อัตโนมัติ
4. ผลลัพธ์จะถูกบันทึกใน output/ folder
"""

import os
import json
import csv
from datetime import datetime
from pathlib import Path

# ================== CONFIGURATION ==================

INPUT_FOLDER = Path("./input")
OUTPUT_FOLDER = Path("./output")
LOG_FOLDER = Path("./logs")

# Create folders if not exist
for folder in [INPUT_FOLDER, OUTPUT_FOLDER, LOG_FOLDER]:
    folder.mkdir(exist_ok=True)

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
คุณคือ OpenThaiAi Content Generator ที่ทำงานผ่าน Claude Cowork

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
    print("🇹🇭 OpenThaiAi Cowork Automation Ready")
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
                    log_activity("file_processed", {
                        "file": file_path.name,
                        "type": result["type"],
                        "count": result["count"]
                    })
                    print(f"✅ Found {result['count']} products")
                    
                    # Move file to processed
                    processed_files.add(file_path.name)
                else:
                    print(f"❌ Error: {result['error']}")
        
        time.sleep(2)  # Check every 2 seconds

if __name__ == "__main__":
    main()
