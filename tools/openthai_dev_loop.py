#!/usr/bin/env python3
"""
OpenThai.ai Autonomous Development Loop v2
ระบบพัฒนาต่อยอดอัตโนมัติ — รัน Task Catalog + sync กับ TEAM-BACKLOG.md

การใช้งาน:
  python tools/openthai_dev_loop.py --list              # แสดงงานทั้งหมด
  python tools/openthai_dev_loop.py --list --wave 5     # แสดงเฉพาะ wave 5
  python tools/openthai_dev_loop.py --run 4.8           # รันงานเดียว
  python tools/openthai_dev_loop.py --wave 5            # รันทุกงานใน wave 5
  python tools/openthai_dev_loop.py --auto              # รันทุกงานที่พร้อม
  python tools/openthai_dev_loop.py --report            # สรุปสถานะ
  python tools/openthai_dev_loop.py --status            # สถานะสั้น (1 บรรทัด/งาน)
  python tools/openthai_dev_loop.py --dry-run --auto    # dry-run ทุกงาน
  python tools/openthai_dev_loop.py --next              # แนะนำงานถัดไปที่ควรทำ

ต้องการ: ANTHROPIC_API_KEY ใน environment (สำหรับ --run/--wave/--auto)
"""

import os
import sys
import re
import json
import time
import argparse
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Optional

# ---- กำหนดค่าคงที่ ----
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

PROJECT_ROOT = Path(__file__).parent.parent
BACKLOG_PATH = PROJECT_ROOT / "docs" / "TEAM-BACKLOG.md"
DOCS_PATH    = PROJECT_ROOT / "docs"
LOG_PATH     = PROJECT_ROOT / "tools" / "dev-loop-log.jsonl"
REPORT_PATH  = PROJECT_ROOT / "tools" / "dev-loop-report.md"

DEFAULT_MODEL = "claude-opus-5"
MAX_TOKENS    = 8192

# งานที่ต้องรอ Mythos — ข้ามไปก่อน
MYTHOS_GATE_KEYWORDS = [
    "git push", "deploy production", "ส่งอีเมล", "โพสต์สาธารณะ",
    "ลงนาม", "จ้าง", "ติดต่อหน่วยงาน", "รอ Mythos", "รอมติ Board",
    "รอ Board", "รอ legal ภายนอก",
]

# ---- Prompt ระบบ (ใช้ทุก call) ----
SYSTEM_PROMPT = """\
คุณคือ OpenThai.ai Dev-Loop Agent — ทำงานในระบบ autonomous loop ตาม CLAUDE.md

กฎที่ต้องยึดถือเสมอ:
1. Thai-First — ออกแบบจากภาษาและบริบทไทยเป็นศูนย์กลาง
2. Sovereign by Default — ข้อมูลอ่อนไหวต้องประมวลผลในประเทศ รองรับ On-Premise
3. ไม่มีตัวเลขลอย — ทุกสถิติต้องมีที่มา วันที่ วิธีวัด ถ้าไม่มีเขียนว่า "ประมาณการ"
4. PDPA ก่อนเสมอ — ห้ามเก็บ/ส่งข้อมูลส่วนบุคคลโดยไม่มีฐานทางกฎหมาย
5. Non-MLM — Affiliate ≤ 2 ชั้น จ่ายจากยอดขายจริงเท่านั้น
6. ส่งมอบของจริง — ตอบเป็นเอกสาร/โค้ดที่ใช้งานได้จริง ไม่ใช่แผนลอย ๆ

รายงานเป็นภาษาไทยเสมอ (ยกเว้นโค้ดและศัพท์เทคนิค)
ท้ายเอกสารทุกฉบับต้องระบุ:
- เสิร์ฟกลุ่มผู้ใช้: [ระบุชัดว่ากลุ่มไหนใน 6 กลุ่ม]
- สิ่งที่ยังไม่ได้ทำ: [รายการสั้น]
"""

# ================================================================
# Task Catalog — งานที่สามารถ execute ได้อัตโนมัติ
# เพิ่มงานใหม่ที่นี่แทนการ parse backlog (ชัดเจนกว่า)
# ================================================================
TASK_CATALOG: dict[str, dict] = {
    # ---------- Wave 4 ที่ยังค้าง ----------
    "4.8": {
        "wave": 4,
        "desc": "Flash Brief: Partnership Strategy — มหาวิทยาลัย + Cloud Provider ไหนเข้าหาก่อน",
        "agent": "tech-scout",
        "output": "docs/flash-brief-partnerships.md",
        "prompt": """\
สร้าง Flash Brief เรื่อง Partnership Strategy สำหรับ OpenThai.ai

เนื้อหาที่ต้องมี:
1. **บริบท** — ทำไม OpenThai.ai ต้องมี partner ตอนนี้ (ก่อนมีโมเดลจริง)
2. **มหาวิทยาลัยไทย** — ระบุ 5 สถาบันที่ควรเข้าหาก่อน พร้อมเหตุผล (เช่น corpus, compute, talent)
   - วิธีเข้าหา, offer ที่เสนอได้, ผลที่คาดหวัง
3. **Cloud Provider** — เปรียบเทียบ AWS/GCP/Azure/NIPA.Cloud/ETDA Sovereignty Cloud
   - เกณฑ์: Data sovereignty, ราคา GPU, Thailand presence, On-Prem hybrid
4. **Open Source Community** — Hugging Face, Meta AI Research, EleutherAI, WangchanBERTa team
5. **ลำดับการเข้าหา** — เดือน 1-3 ทำอะไรก่อน
6. **คำถามสำหรับ Innovation Board** — 3 คำถามเพื่อตัดสินใจ

ห้ามอ้างตัวเลขที่แต่งขึ้นเอง ถ้าไม่รู้ให้เขียนว่า "ต้องสำรวจเพิ่ม"
""",
    },

    # ---------- Wave 5 ใหม่ ----------
    "5.1": {
        "wave": 5,
        "desc": "Professional Portal MVP — เอกสารสเปกและ React Component สำหรับกลุ่มวิชาชีพ 3 สาย",
        "agent": "professional-agent + frontend-engineer",
        "output": "docs/professional-portal-spec.md",
        "prompt": """\
สร้างสเปก Professional Portal MVP สำหรับ OpenThai.ai

กลุ่มเป้าหมาย 3 สายแรก: **ทนายความ, แพทย์/พยาบาล, นักบัญชี/ผู้สอบบัญชี**

เนื้อหาสเปกต้องครอบคลุม:
1. **Use Cases ต่อสายวิชาชีพ** (ทำได้จริงด้วย AI ปัจจุบัน)
   - ทนาย: ค้นหา precedent, ร่างหนังสือ, สรุปเอกสาร (ห้าม: ให้คำแนะนำทางกฎหมายแทนคน)
   - แพทย์: สรุปงานวิจัย, ค้นข้อมูลยา, เอกสาร (ห้าม: วินิจฉัยโรค)
   - นักบัญชี: ตรวจสอบรายการ, คำนวณภาษี, สรุปงบ (ห้าม: ลงนามรับรองแทน)
2. **Guardrails ต่อสาย** — เส้นแบ่งชัดเจนที่ AI ทำได้ vs ต้องมีคนวิชาชีพรับรอง
3. **สถาปัตยกรรม On-Premise** — เหตุผลที่ข้อมูลวิชาชีพต้องอยู่ในองค์กร
4. **UX Flow** — 3 หน้าหลัก (เลือกสาย → เครื่องมือ → ผลลัพธ์ + Disclaimer)
5. **Legal Disclaimer** — ที่ต้องแสดงตามสภาวิชาชีพ
6. **Definition of Done** — เกณฑ์ MVP pass ก่อน launch

เขียนในรูปแบบ Product Spec ที่ developer สามารถ implement ได้ทันที
""",
    },

    "5.2": {
        "wave": 5,
        "desc": "API Stub Spec — endpoints สำหรับ Intermediary และ Consumer Portal ที่ยังไม่ได้เชื่อม",
        "agent": "backend-engineer",
        "output": "docs/api-stub-spec.md",
        "prompt": """\
สร้าง API Spec สำหรับ OpenThai.ai backend ที่ยังไม่ได้ implement

ส่วนที่ต้องสร้าง:

**A. Intermediary Portal APIs** (`/api/intermediary/`)
- POST `/register` — ลงทะเบียนคนกลาง (ประเภท, บริษัท, เอกสาร)
- GET `/hs-code?query=<text>` — ค้นหา HS Code (Thai Customs + AI semantic search)
- POST `/trade-doc/summarize` — สรุปเอกสารการค้า (Invoice, B/L, L/C)
- GET `/incoterms/{term}` — ข้อมูล Incoterms 2020 พร้อมตัวอย่างไทย

**B. Consumer Portal APIs** (`/api/consumer/`)
- POST `/welfare/check` — ตรวจสิทธิสวัสดิการ (รับ: อายุ, รายได้, สถานะ → คืน: สิทธิ์ที่ได้)
- POST `/product/compare` — เปรียบเทียบสินค้า (AI-assisted, พร้อม disclaimer)
- POST `/contract/summarize` — ย่อสัญญา/TOS เป็นภาษาไทยเข้าใจง่าย
- GET `/rights/{category}` — สิทธิผู้บริโภคตามหมวด (อาหาร, สินค้า, บริการ, ดิจิทัล)

สำหรับแต่ละ endpoint ระบุ:
- Method, Path, Auth required (JWT/API Key/Public)
- Request body (JSON schema พร้อม validation rules)
- Response schema (success + error)
- Rate limit ที่เหมาะสม
- PDPA consideration — ข้อมูลใดที่เก็บได้/ไม่ได้
- ตัวอย่าง cURL

เขียนใน Markdown format ที่อ่านง่ายสำหรับทีม frontend และ QA
""",
    },

    "5.3": {
        "wave": 5,
        "desc": "Wave 5 Progress Report — สรุปสถานะโครงการ ณ ก.ย. 2569",
        "agent": "chief-of-staff",
        "output": "docs/wave5-progress-report.md",
        "prompt": """\
สร้าง Progress Report Wave 5 สำหรับ OpenThai.ai

บริบท: โครงการอยู่ในช่วง Pre-product phase ทีม 19 Agent ทำงานร่วมกัน
วันที่รายงาน: กันยายน 2569

เนื้อหารายงาน:
1. **Executive Summary** (3 ย่อหน้า) — สำหรับ Mythos + ผู้ลงทุน
2. **สถานะ 6 กลุ่มผู้ใช้** — ตารางระบุว่าแต่ละกลุ่มมี Portal/Module พร้อมแค่ไหน
3. **งานที่เสร็จ Wave 1-5** — รายการสั้น ๆ ไม่ต้องละเอียด
4. **Blockers ที่รอ Mythos** — รายการชัดเจน + เหตุผลที่รอ + ผลกระทบถ้ารอนาน
5. **Next Actions สำหรับ 30 วันข้างหน้า** — งานที่ทีม AI ทำได้เอง vs งานที่ต้องมีคน
6. **ความเสี่ยงหลัก 3 ข้อ** — พร้อม mitigation plan
7. **KPI Dashboard (ประมาณการ)** — ระบุว่าอะไร "ยังไม่ได้วัด" ชัดเจน

ห้ามใส่ตัวเลขที่ไม่มีที่มา เขียน "ประมาณการ" หรือ "ยังไม่ได้วัด" แทน
""",
    },

    "5.4": {
        "wave": 5,
        "desc": "Thai Model Development Roadmap — แผนพัฒนาโมเดลภาษาไทยจาก 0 ถึง v1.0",
        "agent": "ai-ml-engineer",
        "output": "docs/thai-model-dev-roadmap.md",
        "prompt": """\
สร้าง Thai Language Model Development Roadmap สำหรับ OpenThaiAi

โจทย์: เราจะสร้าง Thai LLM แบบ Open Source ที่คนไทยเป็นเจ้าของ
ข้อจำกัด: ยังไม่มีทีม ML, ยังไม่มี compute budget ชัดเจน, ต้องรองรับ On-Premise

เนื้อหา Roadmap:
1. **Milestone ต่อ Phase**
   - M0 (ปัจจุบัน–ต.ค. 69): เลือก base model + ทดสอบ Thai tokenizer
   - M1 (พ.ย.–ธ.ค. 69): Thai corpus รวบรวม 1B tokens, eval baseline
   - M2 (ม.ค.–มี.ค. 70): Fine-tune QLoRA บน Thai data, eval ด้วย Thai-bench
   - M3 (เม.ย.–ส.ค. 70): RLHF สำหรับ safety + PDPA awareness, public alpha

2. **Base Model Candidates** — เปรียบเทียบ: Llama 3.1, Qwen2.5, SeaLLM, WangchanGPT, Typhoon
   เกณฑ์: License (commercial-friendly?), Thai language base, model size vs cost, community support

3. **Thai Corpus แผน** — แหล่งที่มาที่ถูกกฎหมาย:
   - Wikipedia ไทย, CommonCrawl (ภาษาไทย), หนังสือพิมพ์ที่ขออนุญาต
   - NECTEC BEST Corpus (ถ้าได้รับอนุญาต), ข้อความราชการ open data
   - ห้าม: scrape โดยไม่มีสิทธิ์, ข้อมูลส่วนบุคคล

4. **Thai Eval Suite** — 5 มิติที่ต้องวัด:
   - Thai language proficiency (grammar, tones, particles)
   - Domain knowledge (law, medicine, accounting — ตรวจ hallucination)
   - Safety (ปฏิเสธ request อันตรายเป็นภาษาไทย)
   - PDPA awareness (ไม่เก็บ/ไม่เผย PII โดยไม่ได้รับอนุญาต)
   - Latency/Cost (รองรับ On-Premise hardware ระดับ SME)

5. **Compute Budget (ประมาณการ)** — ระบุว่าเป็นประมาณการชัดเจน
   - Fine-tune 7B model: ? GPU-hours (ต้องสำรวจ)
   - Inference On-Premise: spec ขั้นต่ำที่แนะนำ

6. **Open Source Strategy** — License ที่เลือก + วิธี contribute กลับชุมชน

ระบุ "ยังไม่ได้วัด/ยังไม่ได้สำรวจ" ทุกที่ที่ไม่มีข้อมูลจริง
""",
    },

    "5.5": {
        "wave": 5,
        "desc": "Affiliate Non-MLM Technical Spec — สเปกระบบ Affiliate ที่ผ่าน legal check",
        "agent": "blockchain-web3 + legal-compliance",
        "output": "docs/affiliate-technical-spec.md",
        "prompt": """\
สร้าง Technical Specification สำหรับระบบ Affiliate ของ OpenThai.ai
Non-MLM: จ่ายจากยอดขายจริงเท่านั้น, ลึกไม่เกิน 2 ชั้น
รวม: Database Schema, Business Logic TypeScript, Legal Checklist, Anti-fraud Rules
""",
    },

    # ---------- Wave 6 — Code & Implementation ----------
    "6.1": {
        "wave": 6,
        "desc": "Professional Portal React Component — 3 สายวิชาชีพ (ทนาย/แพทย์/บัญชี)",
        "agent": "frontend-engineer",
        "output": "frontend/src/pages/ProfessionalPortalPage.jsx",
        "prompt": """\
สร้าง React JSX component สำหรับ Professional Portal ของ OpenThai.ai

ใช้สไตล์เดียวกับ ConsumerPortalPage.jsx และ IntermediaryPortalPage.jsx ที่มีอยู่แล้ว
ภาษาไทยเป็นหลัก, Tailwind CSS, mobile-first

หน้าประกอบด้วย 3 section:
1. เลือกสายวิชาชีพ: กฎหมาย | การแพทย์ | การบัญชี (card grid)
2. เครื่องมือต่อสาย (แสดงเมื่อเลือกแล้ว) — 4 เครื่องมือต่อสาย
3. Disclaimer modal — ต้องยืนยันก่อนใช้งานครั้งแรก

State management: useState (เลือกสาย, disclaimer accepted)
ใส่ comment สั้น ๆ เฉพาะจุดที่ logic ซับซ้อน
""",
    },

    "6.2": {
        "wave": 6,
        "desc": "Thai Eval Suite — 50 test cases วัด 5 มิติของ Thai LLM",
        "agent": "ai-ml-engineer",
        "output": "docs/thai-eval-suite-v1.json",
        "prompt": """\
สร้าง Thai LLM Eval Suite เป็น JSON format สำหรับ OpenThaiAi

รูปแบบ:
{
  "version": "1.0",
  "cases": [
    {
      "id": "thai-001",
      "dimension": "proficiency|domain|safety|pdpa|latency",
      "input": "คำถามหรือ prompt ภาษาไทย",
      "expected_behavior": "คำอธิบายว่า model ดีควรตอบอย่างไร",
      "pass_criteria": "เกณฑ์ที่วัดได้ชัดเจน",
      "tags": ["law"|"medical"|"tax"|"safety"|...]
    }
  ]
}

สร้าง 50 cases แบ่งเป็น:
- Thai Proficiency: 10 cases (ไวยากรณ์, สำนวน, วรรณคดี)
- Domain Knowledge: 15 cases (กฎหมาย 5, สุขภาพ 5, ภาษี 5)
- Safety: 10 cases (ปฏิเสธ harmful request เป็นภาษาไทย)
- PDPA Awareness: 10 cases (ไม่เปิดเผย PII, ไม่แนะนำเก็บข้อมูลผิดกฎ)
- Hallucination Check: 5 cases (ถามข้อเท็จจริงที่ต้องไม่แต่งขึ้น)

ทุก case ต้องมี expected_behavior ที่ชัดเจนพอให้ human evaluator ตัดสินได้
""",
    },

    "6.3": {
        "wave": 6,
        "desc": "Dev Glossary — พจนานุกรมคำวัดดิจิทัลของ OpenThai.ai (50 คำ)",
        "agent": "content-localization",
        "output": "docs/dev-glossary.md",
        "prompt": """\
สร้างพจนานุกรมศัพท์เฉพาะของ OpenThai.ai สำหรับ onboarding ทีมใหม่

แรงบันดาลใจ: "คำวัด" ของพระธรรมกิตติวงศ์ — รวบรวมคำเฉพาะทางอธิบายให้คนทั่วไปเข้าใจ

รูปแบบแต่ละคำ:
## [คำ]
**ประเภท:** [เทคนิค/กระบวนการ/หลักการ/องค์กร]
**ความหมายในระบบ:** [อธิบาย 2-3 ประโยค]
**ตัวอย่างการใช้:** [ประโยคตัวอย่างจริงจากโครงการ]
**เกี่ยวข้องกับ:** [คำอื่น ๆ ที่ควรรู้ด้วย]

ครอบคลุม 50 คำใน 5 หมวด:
1. หลักการ (10 คำ): Thai-First, Sovereign, PDPA-first, Non-MLM, Loop Engineering ฯลฯ
2. สถาปัตยกรรม (10 คำ): On-Premise, Zero Trust, RAG, Guardrails, XAdES-LTA ฯลฯ
3. ทีมและกระบวนการ (10 คำ): Wave, Agent Guild, Innovation Board, Night Session ฯลฯ
4. ผู้ใช้และสินค้า (10 คำ): 6 กลุ่มผู้ใช้, Portal, Affiliate, OPT-C Token ฯลฯ
5. การวัดผล (10 คำ): Thai-bench, Definition of Done, KPI, Eval Suite ฯลฯ

เขียนภาษาไทยที่เข้าใจง่าย — ไม่ใช่แปลจากอังกฤษ
""",
    },

    "6.4": {
        "wave": 6,
        "desc": "Civic Canon Infographic Spec — สเปก infographic พระรัตนตรัยของระบบ",
        "agent": "content-localization + frontend-engineer",
        "output": "docs/civic-canon-infographic-spec.md",
        "prompt": """\
สร้างสเปก Infographic "Sovereign Civic Canon" สำหรับ OpenThai.ai

ข้อมูลอ้างอิง: docs/platform-philosophy.md

สเปกต้องระบุ:
1. **Layout:** แผนผัง 3 คอลัมน์ (พุทธ | คริสต์ | อิสลาม) ด้านบน, OpenThai.ai ตรงกลาง
2. **สี:** ตาม brand OpenThai.ai + สีแทนแต่ละศาสนา (เลือกให้เหมาะสมและให้เกียรติ)
3. **เนื้อหาต่อ section:** keyword mapping สั้น ๆ ที่ให้เห็นการเปรียบเทียบ
4. **ข้อความ disclaimer:** "การเปรียบเทียบเชิงโครงสร้างเท่านั้น ไม่ใช่การยก OpenThai.ai เป็นศาสนา"
5. **Format ผลลัพธ์:** SVG spec (ขนาด, element, text) ที่ designer นำไปทำต่อได้

ห้ามสร้าง infographic ที่ดูเป็นการล้อเลียนหรือลดทอนคุณค่าของศาสนาใด
""",
    },
}

# ================================================================
# ฟังก์ชันหลัก
# ================================================================

def colour(text: str, code: str) -> str:
    """ANSI colour helper"""
    return f"\033[{code}m{text}\033[0m"

def ok(msg: str)    -> None: print(colour(f"  ✅ {msg}", "32"))
def warn(msg: str)  -> None: print(colour(f"  ⚠️  {msg}", "33"))
def err(msg: str)   -> None: print(colour(f"  ❌ {msg}", "31"))
def info(msg: str)  -> None: print(colour(f"  ℹ️  {msg}", "36"))
def head(msg: str)  -> None: print(colour(f"\n{'='*60}\n{msg}\n{'='*60}", "1"))


def is_blocked(task: dict) -> bool:
    """ตรวจว่างานต้องรอ Mythos ก่อน — ตรวจแค่ desc ไม่ใช่ prompt เนื้อหา"""
    text = task.get("desc", "").lower()
    return any(kw.lower() in text for kw in MYTHOS_GATE_KEYWORDS)


def list_tasks(wave: Optional[int] = None, show_all: bool = False) -> None:
    """แสดงรายการงาน"""
    head("รายการงานใน Task Catalog")
    for tid, task in TASK_CATALOG.items():
        if wave and task["wave"] != wave:
            continue
        blocked = is_blocked(task)
        output_exists = task.get("output") and (PROJECT_ROOT / task["output"]).exists()

        status = colour("✅ DONE  ", "32") if output_exists else \
                 colour("🔴 BLOCKED", "31") if blocked else \
                 colour("🟡 READY ", "33")

        print(f"\n  [{tid}] {status} Wave {task['wave']}")
        print(f"       {task['desc']}")
        print(f"       output: {task.get('output', '-')}")
        print(f"       agent:  {task['agent']}")
        if blocked:
            warn("รอ Mythos — ข้ามอัตโนมัติ")


def call_claude(task: dict, dry_run: bool = False) -> Optional[str]:
    """เรียก Claude API เพื่อ execute งาน"""
    if dry_run:
        info(f"[dry-run] จะเรียก Claude สำหรับงาน: {task['desc']}")
        return None

    if not HAS_ANTHROPIC:
        err("ไม่พบ anthropic SDK — รัน: pip install anthropic")
        return None

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        err("ต้องตั้ง ANTHROPIC_API_KEY ใน environment")
        return None

    client = anthropic.Anthropic(api_key=api_key)

    user_msg = f"""\
งาน: {task['desc']}
Agent ที่รับผิดชอบ: {task['agent']}
ไฟล์ผลลัพธ์: {task.get('output', 'ไม่ระบุ')}

{task['prompt']}
"""

    print(f"  🤖 เรียก Claude ({DEFAULT_MODEL})…", end="", flush=True)
    start = time.time()

    try:
        resp = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        elapsed = time.time() - start
        print(f" เสร็จใน {elapsed:.1f}s")
        return resp.content[0].text

    except Exception as exc:
        print()
        err(f"Claude API error: {exc}")
        return None


def save_output(task: dict, content: str) -> Optional[Path]:
    """บันทึกผลลัพธ์ลงไฟล์"""
    if not task.get("output"):
        return None
    path = PROJECT_ROOT / task["output"]
    path.parent.mkdir(parents=True, exist_ok=True)

    header = f"""\
# {task['desc']}

> สร้างโดย: OpenThai.ai Dev-Loop Agent ({task['agent']})
> วันที่: {datetime.now().strftime('%d %B %Y')}
> Wave: {task['wave']}

---

"""
    path.write_text(header + content, encoding="utf-8")
    return path


def update_backlog_status(task_id: str, output_file: str) -> None:
    """อัปเดตสถานะใน TEAM-BACKLOG.md"""
    if not BACKLOG_PATH.exists():
        return
    text = BACKLOG_PATH.read_text(encoding="utf-8")
    today = datetime.now().strftime('%d %b %y')

    # แทนที่ 🔴 ถัดไป → ✅ เสร็จ + วันที่ + ลิงก์ไฟล์
    new_text = re.sub(
        rf"(\|\s*{re.escape(task_id)}\s*\|.*?)\🔴 ถัดไป",
        rf"\1✅ เสร็จ {today}",
        text,
    )
    if new_text != text:
        BACKLOG_PATH.write_text(new_text, encoding="utf-8")
        ok(f"อัปเดต TEAM-BACKLOG.md: [{task_id}] → ✅")


def append_log(entry: dict) -> None:
    """บันทึก log แบบ JSONL"""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def run_task(task_id: str, dry_run: bool = False) -> bool:
    """รันงานเดียว — คืน True ถ้าสำเร็จ"""
    task = TASK_CATALOG.get(task_id)
    if not task:
        err(f"ไม่พบงาน [{task_id}] ใน catalog")
        return False

    print(f"\n{'─'*60}")
    print(colour(f"  🔨 [{task_id}] Wave {task['wave']}", "1"))
    print(f"  {task['desc']}")
    print(f"  Agent: {task['agent']}")

    if is_blocked(task):
        warn("งานนี้ต้องรอ Mythos อนุมัติ — ข้าม")
        return False

    output_path = task.get("output") and PROJECT_ROOT / task["output"]
    if output_path and output_path.exists():
        ok(f"ไฟล์มีอยู่แล้ว: {task['output']} — ข้าม")
        return True

    content = call_claude(task, dry_run=dry_run)
    if content is None:
        return False

    saved = save_output(task, content)
    if saved:
        ok(f"บันทึกที่: {task['output']}")
        update_backlog_status(task_id, task["output"])

    append_log({
        "ts": datetime.now().isoformat(),
        "task_id": task_id,
        "wave": task["wave"],
        "desc": task["desc"],
        "output": task.get("output"),
        "status": "done" if not dry_run else "dry-run",
    })
    return True


def run_auto(wave: Optional[int] = None, dry_run: bool = False) -> None:
    """รันทุกงานที่ทำได้อัตโนมัติ"""
    head(f"Auto Mode — {'Wave ' + str(wave) if wave else 'ทุก Wave'}")
    done = skipped = errors = 0

    for tid, task in TASK_CATALOG.items():
        if wave and task["wave"] != wave:
            continue
        success = run_task(tid, dry_run=dry_run)
        if success:
            done += 1
        else:
            if is_blocked(task):
                skipped += 1
            else:
                errors += 1

    head("สรุปผล")
    ok(f"เสร็จ:  {done} งาน")
    warn(f"รอ Mythos: {skipped} งาน")
    if errors:
        err(f"ข้อผิดพลาด: {errors} งาน")


def generate_report() -> None:
    """สร้าง Markdown report"""
    lines = [
        "# OpenThai.ai — Dev-Loop Progress Report",
        f"\n> สร้างอัตโนมัติโดย dev-loop | {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "\n---\n",
        "## สถานะงานแต่ละ Task\n",
        "| ID | Wave | สถานะ | งาน | ไฟล์ |",
        "|---|---|---|---|---|",
    ]

    for tid, task in TASK_CATALOG.items():
        output_path = task.get("output") and PROJECT_ROOT / task["output"]
        if output_path and output_path.exists():
            status = "✅ เสร็จ"
        elif is_blocked(task):
            status = "🔴 รอ Mythos"
        else:
            status = "🟡 รอรัน"
        out = f"`{task['output']}`" if task.get("output") else "-"
        lines.append(f"| {tid} | {task['wave']} | {status} | {task['desc'][:60]}… | {out} |")

    # นับสรุป
    total  = len(TASK_CATALOG)
    done_n = sum(1 for t in TASK_CATALOG.values()
                 if t.get("output") and (PROJECT_ROOT / t["output"]).exists())
    blocked_n = sum(1 for t in TASK_CATALOG.values() if is_blocked(t))
    ready_n = total - done_n - blocked_n

    lines += [
        "\n---\n",
        "## สรุป\n",
        f"- **ทั้งหมด:** {total} งาน",
        f"- **เสร็จแล้ว:** {done_n} งาน",
        f"- **พร้อมรัน:** {ready_n} งาน",
        f"- **รอ Mythos:** {blocked_n} งาน",
        "\n---\n",
        "## Blockers ที่รอ Mythos\n",
        "- แต่งตั้ง Innovation Board 5 ที่นั่ง (ลงนาม `docs/innovation-board-appointment.md`)",
        "- ตัดสินใจ product แรก: PDPA Assistant หรืออื่น",
        "- จ้าง AI Engineer คนแรก + ตั้งนิติบุคคล",
        "- Legal ภายนอกรับรอง PDPA signoff",
        "\n*สร้างโดย OpenThai.ai Dev-Loop Agent — ตาม CLAUDE.md Standing Orders*",
    ]

    report_content = "\n".join(lines)
    REPORT_PATH.write_text(report_content, encoding="utf-8")
    ok(f"Report บันทึกที่: tools/dev-loop-report.md")
    print(report_content[:1500])  # preview


def show_status() -> None:
    """แสดงสถานะสั้น 1 บรรทัดต่องาน"""
    waves: dict[int, list] = {}
    for tid, task in TASK_CATALOG.items():
        w = task["wave"]
        waves.setdefault(w, []).append((tid, task))

    total = done = ready = blocked = 0
    for w in sorted(waves):
        print(colour(f"\n  Wave {w}", "1"))
        for tid, task in waves[w]:
            out = task.get("output") and PROJECT_ROOT / task["output"]
            if out and out.exists():
                sym, col = "✅", "32"; done += 1
            elif is_blocked(task):
                sym, col = "⛔", "31"; blocked += 1
            else:
                sym, col = "🔲", "33"; ready += 1
            total += 1
            label = task["desc"][:55] + ("…" if len(task["desc"]) > 55 else "")
            print(colour(f"    {sym} [{tid}] {label}", col))

    print(colour(f"\n  รวม {total} งาน | ✅ {done} | 🔲 {ready} รอรัน | ⛔ {blocked} รอ Mythos", "1"))


def suggest_next() -> None:
    """แนะนำงานถัดไปที่ควรทำ"""
    head("งานถัดไปที่แนะนำ")
    ready_tasks = [
        (tid, task) for tid, task in TASK_CATALOG.items()
        if not is_blocked(task)
        and not (task.get("output") and (PROJECT_ROOT / task["output"]).exists())
    ]
    if not ready_tasks:
        ok("ทุกงานที่ทำได้เสร็จแล้ว! รอ Mythos ปลดล็อก blockers")
        return
    # เรียงตาม wave แล้ว task id
    ready_tasks.sort(key=lambda x: (x[1]["wave"], x[0]))
    print(f"\n  พบ {len(ready_tasks)} งานที่พร้อมรัน:\n")
    for i, (tid, task) in enumerate(ready_tasks[:5], 1):
        print(colour(f"  {i}. [{tid}] Wave {task['wave']} — {task['desc']}", "33"))
        print(f"      agent: {task['agent']}")
        print(f"      output: {task.get('output', '-')}")
    if len(ready_tasks) > 5:
        print(colour(f"\n  ... และอีก {len(ready_tasks)-5} งาน (ใช้ --list เพื่อดูทั้งหมด)", "36"))
    print(colour(f"\n  คำสั่งรัน: python tools/openthai_dev_loop.py --run {ready_tasks[0][0]}", "1;32"))
    print(colour(f"  หรือรันทั้งหมด: python tools/openthai_dev_loop.py --auto", "1;32"))


# ================================================================
# CLI Entry Point
# ================================================================
def main() -> None:
    parser = argparse.ArgumentParser(
        description="OpenThai.ai Autonomous Development Loop v2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
        ตัวอย่าง:
          python tools/openthai_dev_loop.py --status
          python tools/openthai_dev_loop.py --next
          python tools/openthai_dev_loop.py --list --wave 6
          python tools/openthai_dev_loop.py --run 6.1
          python tools/openthai_dev_loop.py --wave 6
          python tools/openthai_dev_loop.py --auto
          python tools/openthai_dev_loop.py --report
        """),
    )
    parser.add_argument("--list",    action="store_true",     help="แสดงงานทั้งหมด (verbose)")
    parser.add_argument("--status",  action="store_true",     help="สถานะสั้น 1 บรรทัดต่องาน")
    parser.add_argument("--next",    action="store_true",     help="แนะนำงานถัดไปที่ควรทำ")
    parser.add_argument("--run",     metavar="TASK_ID",       help="รันงานเดียว เช่น 6.1")
    parser.add_argument("--wave",    type=int, metavar="N",   help="รันทุกงานใน wave N")
    parser.add_argument("--auto",    action="store_true",     help="รันอัตโนมัติทุกงานที่ทำได้")
    parser.add_argument("--report",  action="store_true",     help="สร้างรายงานสถานะ Markdown")
    parser.add_argument("--dry-run", action="store_true",     help="แสดงงานโดยไม่รันจริง")
    args = parser.parse_args()

    print(colour("\n🇹🇭 OpenThai.ai Autonomous Dev Loop v2", "1;36"))
    print(colour(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "36"))

    if args.status:
        show_status()
    elif args.next:
        suggest_next()
    elif args.list:
        list_tasks(wave=args.wave)
    elif args.run:
        run_task(args.run, dry_run=args.dry_run)
    elif args.auto or (args.wave and not args.list):
        run_auto(wave=args.wave, dry_run=args.dry_run)
    elif args.report:
        generate_report()
    else:
        show_status()
        suggest_next()


if __name__ == "__main__":
    main()
