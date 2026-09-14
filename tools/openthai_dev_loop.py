#!/usr/bin/env python3
"""
OpenThai.ai Autonomous Development Loop v3
ระบบพัฒนาต่อยอดอัตโนมัติ — รัน Task Catalog + sync กับ TEAM-BACKLOG.md

การใช้งาน:
  python tools/openthai_dev_loop.py --list              # แสดงงานทั้งหมด
  python tools/openthai_dev_loop.py --list --wave 7     # แสดงเฉพาะ wave 7
  python tools/openthai_dev_loop.py --run 7.1           # รันงานเดียว
  python tools/openthai_dev_loop.py --wave 7            # รันทุกงานใน wave 7
  python tools/openthai_dev_loop.py --auto              # รันทุกงานที่พร้อม (ผ่านครั้งเดียว)
  python tools/openthai_dev_loop.py --loop              # รันต่อเนื่อง ไม่หยุด (Ctrl+C เพื่อหยุด)
  python tools/openthai_dev_loop.py --loop --interval 600  # loop ทุก 10 นาที
  python tools/openthai_dev_loop.py --report            # สรุปสถานะ
  python tools/openthai_dev_loop.py --status            # สถานะสั้น
  python tools/openthai_dev_loop.py --next              # แนะนำงานถัดไป
  python tools/openthai_dev_loop.py --dry-run --loop    # dry-run ต่อเนื่อง

ต้องการ: ANTHROPIC_API_KEY ใน environment (สำหรับ --run/--wave/--auto/--loop)
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

# ---- dependencies ----
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
STATE_PATH   = PROJECT_ROOT / "tools" / "dev-loop-state.json"

DEFAULT_MODEL    = "claude-opus-5"
MAX_TOKENS       = 8192
DEFAULT_INTERVAL = 300   # วินาที ระหว่าง loop pass

# งานที่ต้องรอ Mythos — ข้ามโดยอัตโนมัติ
MYTHOS_GATE_KEYWORDS = [
    "git push", "deploy production", "ส่งอีเมล", "โพสต์สาธารณะ",
    "ลงนาม", "จ้าง", "ติดต่อหน่วยงาน", "รอ Mythos", "รอมติ Board",
    "รอ Board", "รอ legal ภายนอก",
]

# ---- System Prompt ----
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
# Task Catalog — เพิ่มงานใหม่ที่นี่ (ชัดเจนกว่า parse backlog)
# ================================================================
TASK_CATALOG: dict[str, dict] = {

    # ==================== Wave 4 (ค้าง) ====================
    "4.8": {
        "wave": 4,
        "desc": "Flash Brief: Partnership Strategy — มหาวิทยาลัย + Cloud Provider ไหนเข้าหาก่อน",
        "agent": "tech-scout",
        "output": "docs/flash-brief-partnerships.md",
        "prompt": """\
สร้าง Flash Brief เรื่อง Partnership Strategy สำหรับ OpenThai.ai

เนื้อหาที่ต้องมี:
1. **บริบท** — ทำไม OpenThai.ai ต้องมี partner ตอนนี้ (ก่อนมีโมเดลจริง)
2. **มหาวิทยาลัยไทย** — ระบุ 5 สถาบันที่ควรเข้าหาก่อน พร้อมเหตุผล (corpus, compute, talent)
   - วิธีเข้าหา, offer ที่เสนอได้, ผลที่คาดหวัง
3. **Cloud Provider** — เปรียบเทียบ AWS/GCP/Azure/NIPA.Cloud/ETDA Sovereignty Cloud
   - เกณฑ์: Data sovereignty, ราคา GPU, Thailand presence, On-Prem hybrid
4. **Open Source Community** — Hugging Face, Meta AI Research, EleutherAI, WangchanBERTa team
5. **ลำดับการเข้าหา** — เดือน 1-3 ทำอะไรก่อน
6. **คำถามสำหรับ Innovation Board** — 3 คำถามเพื่อตัดสินใจ

ห้ามอ้างตัวเลขที่แต่งขึ้นเอง ถ้าไม่รู้ให้เขียนว่า "ต้องสำรวจเพิ่ม"
""",
    },

    # ==================== Wave 5 ====================
    "5.1": {
        "wave": 5,
        "desc": "Professional Portal MVP Spec — สเปกและ UX Flow สำหรับ 3 สายวิชาชีพ",
        "agent": "professional-agent + frontend-engineer",
        "output": "docs/professional-portal-spec.md",
        "prompt": """\
สร้างสเปก Professional Portal MVP สำหรับ OpenThai.ai
กลุ่มเป้าหมาย 3 สายแรก: ทนายความ, แพทย์/พยาบาล, นักบัญชี/ผู้สอบบัญชี

เนื้อหาสเปก:
1. Use Cases ต่อสายวิชาชีพ (ทำได้จริงด้วย AI ปัจจุบัน)
   - ทนาย: ค้นหา precedent, ร่างหนังสือ, สรุปเอกสาร (ห้าม: ให้คำแนะนำทางกฎหมายแทนคน)
   - แพทย์: สรุปงานวิจัย, ค้นข้อมูลยา, เอกสาร (ห้าม: วินิจฉัยโรค)
   - นักบัญชี: ตรวจสอบรายการ, คำนวณภาษี, สรุปงบ (ห้าม: ลงนามรับรองแทน)
2. Guardrails ต่อสาย — เส้นแบ่งชัดเจน AI ทำได้ vs ต้องมีคนวิชาชีพรับรอง
3. สถาปัตยกรรม On-Premise — ข้อมูลวิชาชีพต้องอยู่ในองค์กร
4. UX Flow — 3 หน้าหลัก
5. Legal Disclaimer ตามสภาวิชาชีพ
6. Definition of Done สำหรับ MVP
""",
    },

    "5.2": {
        "wave": 5,
        "desc": "API Stub Spec — endpoints สำหรับ Intermediary และ Consumer Portal",
        "agent": "backend-engineer",
        "output": "docs/api-stub-spec.md",
        "prompt": """\
สร้าง API Spec สำหรับ OpenThai.ai backend ที่ยังไม่ได้ implement

A. Intermediary Portal APIs (/api/intermediary/)
- POST /register — ลงทะเบียนคนกลาง
- GET /hs-code?query=<text> — ค้นหา HS Code + AI semantic search
- POST /trade-doc/summarize — สรุปเอกสารการค้า (Invoice, B/L, L/C)
- GET /incoterms/{term} — ข้อมูล Incoterms 2020 พร้อมตัวอย่างไทย

B. Consumer Portal APIs (/api/consumer/)
- POST /welfare/check — ตรวจสิทธิสวัสดิการ
- POST /product/compare — เปรียบเทียบสินค้า AI-assisted
- POST /contract/summarize — ย่อสัญญา/TOS เป็นภาษาไทย
- GET /rights/{category} — สิทธิผู้บริโภคตามหมวด

สำหรับแต่ละ endpoint: Method, Path, Auth, Request/Response schema, PDPA consideration, ตัวอย่าง cURL
""",
    },

    "5.3": {
        "wave": 5,
        "desc": "Wave 5 Progress Report — สรุปสถานะโครงการ ณ ก.ย. 2569",
        "agent": "chief-of-staff",
        "output": "docs/wave5-progress-report.md",
        "prompt": """\
สร้าง Progress Report Wave 5 สำหรับ OpenThai.ai (กันยายน 2569)

เนื้อหา:
1. Executive Summary (3 ย่อหน้า) สำหรับ Mythos + ผู้ลงทุน
2. สถานะ 6 กลุ่มผู้ใช้ — ตารางว่าแต่ละกลุ่มมี Portal/Module พร้อมแค่ไหน
3. งานที่เสร็จ Wave 1-5 — รายการสั้น
4. Blockers ที่รอ Mythos — รายการชัดเจน + เหตุผล + ผลกระทบถ้ารอนาน
5. Next Actions 30 วัน — งานที่ทีม AI ทำได้เอง vs งานที่ต้องมีคน
6. ความเสี่ยงหลัก 3 ข้อ + mitigation
7. KPI Dashboard (ประมาณการ) — ระบุว่าอะไร "ยังไม่ได้วัด"

ห้ามใส่ตัวเลขที่ไม่มีที่มา
""",
    },

    "5.4": {
        "wave": 5,
        "desc": "Thai Model Development Roadmap — M0 ถึง M3",
        "agent": "ai-ml-engineer",
        "output": "docs/thai-model-dev-roadmap.md",
        "prompt": """\
สร้าง Thai Language Model Development Roadmap สำหรับ OpenThaiAi

Milestone:
- M0 (ปัจจุบัน–ต.ค. 69): เลือก base model + ทดสอบ Thai tokenizer
- M1 (พ.ย.–ธ.ค. 69): Thai corpus 1B tokens, eval baseline
- M2 (ม.ค.–มี.ค. 70): Fine-tune QLoRA บน Thai data, eval ด้วย Thai-bench
- M3 (เม.ย.–ส.ค. 70): RLHF สำหรับ safety + PDPA awareness, public alpha

ครอบคลุม: Base model candidates, Thai corpus strategy (แหล่งที่มาถูกกฎหมาย),
Thai Eval Suite 5 มิติ, Compute Budget (ประมาณการ), Open Source license

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

ครอบคลุม:
1. Database Schema (affiliate_users, commissions, transactions)
2. Business Logic TypeScript — คำนวณ commission 2 ชั้น
3. Legal Checklist 6 ข้อตาม Non-MLM rule ของ CLAUDE.md
4. Anti-fraud Rules — ตรวจจับการสร้าง account ปลอม, self-referral
5. Smart Contract outline (ถ้าใช้ on-chain settlement)
6. ตัวอย่าง payment flow: sale → verify → split → payout
""",
    },

    # ==================== Wave 6 ====================
    "6.1": {
        "wave": 6,
        "desc": "Professional Portal React Component — 3 สายวิชาชีพ (ทนาย/แพทย์/บัญชี)",
        "agent": "frontend-engineer",
        "output": "frontend/src/pages/ProfessionalPortalPage.jsx",
        "prompt": """\
สร้าง React JSX component สำหรับ Professional Portal ของ OpenThai.ai
ใช้สไตล์เดียวกับ ConsumerPortalPage.jsx และ IntermediaryPortalPage.jsx
ภาษาไทยเป็นหลัก, Tailwind CSS, mobile-first

หน้าประกอบด้วย:
1. เลือกสายวิชาชีพ: กฎหมาย | การแพทย์ | การบัญชี (card grid)
2. เครื่องมือต่อสาย (แสดงเมื่อเลือกแล้ว) — 4 เครื่องมือต่อสาย
3. Disclaimer modal — ต้องยืนยันก่อนใช้งานครั้งแรก

State: useState (เลือกสาย, disclaimer accepted)
""",
    },

    "6.2": {
        "wave": 6,
        "desc": "Thai Eval Suite — 50 test cases วัด 5 มิติของ Thai LLM",
        "agent": "ai-ml-engineer",
        "output": "docs/thai-eval-suite-v1.json",
        "prompt": """\
สร้าง Thai LLM Eval Suite เป็น JSON สำหรับ OpenThaiAi
รูปแบบ: {"version":"1.0","cases":[{"id":"thai-001","dimension":"proficiency|domain|safety|pdpa|latency","input":"...","expected_behavior":"...","pass_criteria":"...","tags":[...]}]}

50 cases:
- Thai Proficiency: 10 (ไวยากรณ์, สำนวน, วรรณคดี)
- Domain Knowledge: 15 (กฎหมาย 5, สุขภาพ 5, ภาษี 5)
- Safety: 10 (ปฏิเสธ harmful request เป็นภาษาไทย)
- PDPA Awareness: 10 (ไม่เปิดเผย PII)
- Hallucination Check: 5 (ข้อเท็จจริงที่ต้องไม่แต่งขึ้น)

ทุก case ต้องมี pass_criteria ที่ human evaluator ตัดสินได้
""",
    },

    "6.3": {
        "wave": 6,
        "desc": "Dev Glossary — พจนานุกรมคำวัดดิจิทัลของ OpenThai.ai (50 คำ)",
        "agent": "content-localization",
        "output": "docs/dev-glossary.md",
        "prompt": """\
สร้างพจนานุกรมศัพท์เฉพาะของ OpenThai.ai สำหรับ onboarding ทีมใหม่

รูปแบบแต่ละคำ:
## [คำ]
**ประเภท:** [เทคนิค/กระบวนการ/หลักการ/องค์กร]
**ความหมายในระบบ:** [2-3 ประโยค]
**ตัวอย่างการใช้:** [ประโยคตัวอย่างจริงจากโครงการ]
**เกี่ยวข้องกับ:** [คำอื่น ๆ]

50 คำใน 5 หมวด: หลักการ, สถาปัตยกรรม, ทีมและกระบวนการ, ผู้ใช้และสินค้า, การวัดผล
เขียนภาษาไทยที่เข้าใจง่าย
""",
    },

    "6.4": {
        "wave": 6,
        "desc": "Civic Canon Infographic Spec — สเปก infographic พระรัตนตรัยของระบบ",
        "agent": "content-localization + frontend-engineer",
        "output": "docs/civic-canon-infographic-spec.md",
        "prompt": """\
สร้างสเปก Infographic "Sovereign Civic Canon" สำหรับ OpenThai.ai

สเปกต้องระบุ:
1. Layout: แผนผัง 3 คอลัมน์ (พุทธ | คริสต์ | อิสลาม) + OpenThai.ai ตรงกลาง
2. สี: brand OpenThai.ai + สีแทนแต่ละศาสนา (ให้เกียรติ)
3. เนื้อหาต่อ section: keyword mapping เชิงโครงสร้าง
4. Disclaimer: "การเปรียบเทียบเชิงโครงสร้างเท่านั้น ไม่ใช่การยก OpenThai.ai เป็นศาสนา"
5. SVG spec ที่ designer นำไปทำต่อได้

ห้ามสร้างเนื้อหาที่ลดทอนคุณค่าของศาสนาใด
""",
    },

    # ==================== Wave 7 — Infrastructure & Real Work ====================

    "7.1": {
        "wave": 7,
        "desc": "Secret Hygiene Guide — ขั้นตอน rotate credentials อย่างปลอดภัย",
        "agent": "security-guard",
        "output": "docs/secret-rotation-guide.md",
        "prompt": """\
สร้างคู่มือ Secret Hygiene สำหรับโครงการ OpenThai.ai

บริบท: พบ GitHub OAuth token (gho_1NZ...USG7) ปรากฏใน backlog — ต้อง revoke ด่วน
รวมถึง: ANTHROPIC_API_KEY, OpenAI keys, JWT secrets ที่อาจมีใน codebase

เนื้อหา:
1. **ขั้นตอน Rotate แต่ละ Secret ประเภท**
   - GitHub OAuth token: วิธี revoke ที่ Settings → Developer settings → OAuth Apps
   - API Keys (Anthropic, OpenAI): revoke + rotate ผ่าน dashboard ของแต่ละเจ้า
   - JWT secret: generate ใหม่ + invalidate sessions ที่ active อยู่
   - Database credentials: rotate + update ทุก connection string
2. **Checklist ตรวจ Secret ใน Repository** (grep pattern ที่ใช้ได้จริง)
   - rg "ghp_|gho_|sk-|AKIA|AIza" ทั้ง repo
   - ตรวจ git log --all -S "ข้อความลับ"
3. **กระบวนการป้องกันอนาคต**
   - pre-commit hook ด้วย detect-secrets หรือ gitleaks
   - ตั้ง GitHub Secret Scanning alert
   - วาระ rotation ทุก 90 วัน
4. **Rotation Runbook** — checklist รายงาน Mythos หลังทำเสร็จ

เน้นที่ทำได้จริงทันที ไม่ใช่แค่ทฤษฎี
เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 3 แพลตฟอร์ม (ป้องกัน infra)
""",
    },

    "7.2": {
        "wave": 7,
        "desc": "FastAPI Backend Stubs — implement Intermediary + Consumer API endpoints",
        "agent": "backend-engineer",
        "output": "backend/api/routes_wave7.py",
        "prompt": """\
สร้าง FastAPI router stubs สำหรับ OpenThai.ai backend
อ้างอิง spec จาก docs/api-stub-spec.md (ถ้ามี) หรือสร้างตาม design ด้านล่าง

**ไฟล์: backend/api/routes_wave7.py**

Endpoints ที่ต้องสร้าง (stub — return mock data ก่อน, TODO comment สำหรับ real impl):

```python
# Intermediary Portal
POST /api/intermediary/register
GET  /api/intermediary/hs-code
POST /api/intermediary/trade-doc/summarize
GET  /api/intermediary/incoterms/{term}

# Consumer Portal
POST /api/consumer/welfare/check
POST /api/consumer/product/compare
POST /api/consumer/contract/summarize
GET  /api/consumer/rights/{category}
```

สำหรับแต่ละ endpoint:
- Pydantic request/response models (ชัดเจน พร้อม field validation)
- PDPA check: ห้าม log ข้อมูลส่วนบุคคลโดยตรง
- Rate limiting decorator stub
- ตัวอย่าง mock response ที่สมจริง (ภาษาไทย)
- HTTPException สำหรับ error cases

ใช้ FastAPI, Pydantic v2, Python 3.11+
เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 2 คนกลาง + กลุ่ม 4 ผู้บริโภค
""",
    },

    "7.3": {
        "wave": 7,
        "desc": "PDPA Audit Report — ตรวจ data flow ทุก Portal สร้าง pass/fail checklist",
        "agent": "legal-compliance",
        "output": "docs/pdpa-audit-wave7.md",
        "prompt": """\
สร้าง PDPA Audit Report สำหรับ OpenThai.ai Portal ทั้งหมด (Wave 7)

Portals ที่ต้องตรวจ:
1. Producer Portal (/producer)
2. Intermediary Portal (/intermediary) — MVP ใหม่ล่าสุด
3. Consumer Portal (/consumer) — MVP ใหม่
4. Professional Portal (/professional) — MVP ใหม่
5. Gov Portal (/gov)

สำหรับแต่ละ Portal ให้ตรวจ:
**A. Data Collection**
- [ ] ระบุข้อมูลส่วนบุคคลที่เก็บ (ชนิด, ปริมาณ, ระยะเวลาเก็บ)
- [ ] มีฐานทางกฎหมายสำหรับการเก็บ (consent / contract / legal obligation)
- [ ] มี consent flow ที่ชัดเจนก่อนเก็บข้อมูล

**B. Data Processing**
- [ ] ข้อมูลประมวลผลที่ไหน (local/cloud/on-prem)
- [ ] ส่งต่อให้ third-party ไหมบ้าง (AI API call ที่มี user data)
- [ ] มี data minimization (เก็บเท่าที่จำเป็น)

**C. Data Subject Rights**
- [ ] มีช่องทางขอเข้าถึง/แก้ไข/ลบข้อมูล
- [ ] Response time ตาม PDPA (30 วัน)

**สรุปผล:** ตาราง pass/fail/gap พร้อม priority ของการแก้ไข
**ข้อแนะนำเร่งด่วน:** เรียงตามความเสี่ยง

เสิร์ฟกลุ่มผู้ใช้: ทุกกลุ่ม (PDPA ป้องกันทุกคน)
""",
    },

    "7.4": {
        "wave": 7,
        "desc": "Thai Eval Runner Script — Python script รัน Thai-eval-suite กับ LLM endpoint",
        "agent": "ai-ml-engineer",
        "output": "tools/thai_eval_runner.py",
        "prompt": """\
สร้าง Python script สำหรับรัน Thai Eval Suite กับ LLM endpoint ใดก็ได้

**tools/thai_eval_runner.py**

Features:
1. โหลด docs/thai-eval-suite-v1.json
2. ส่งแต่ละ test case ไปยัง LLM endpoint ที่กำหนด
3. บันทึก response + ประเมิน pass/fail ตาม pass_criteria
4. สร้างรายงาน Markdown + JSON ผลลัพธ์

CLI:
```
python tools/thai_eval_runner.py --endpoint http://localhost:8000/chat
python tools/thai_eval_runner.py --model claude-haiku-4-5-20251001 --anthropic
python tools/thai_eval_runner.py --model gpt-4o --openai
python tools/thai_eval_runner.py --dimension safety  # รันเฉพาะ safety cases
python tools/thai_eval_runner.py --limit 10          # รันแค่ 10 cases ก่อน
```

เนื้อหาที่ต้องมี:
- EvalRunner class พร้อม async batch execution
- Auto-judge สำหรับ objective cases (exact match, contains, regex)
- สำหรับ subjective cases: แสดง response + ให้ human judge (interactive mode)
- Progress bar (tqdm ถ้ามี)
- Output: eval-results-{timestamp}.json + eval-report-{timestamp}.md
- Rate limiting (max 5 req/s default)
- Retry logic (3 retries, exponential backoff)

ใช้ python 3.11+, requests, dataclasses
ไม่ต้องใช้ library ที่ต้อง install เยอะ — เน้น portable

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา (ใช้วัด model quality)
""",
    },

    "7.5": {
        "wave": 7,
        "desc": "Monitoring & Health Check Spec — status page + alert สำหรับทุก Portal",
        "agent": "devops-sre",
        "output": "docs/monitoring-spec.md",
        "prompt": """\
สร้าง Monitoring Specification สำหรับ OpenThai.ai Platform

บริบท: ยังไม่มี monitoring จริง ต้องออกแบบ spec ก่อน implement

เนื้อหา:
1. **Health Check Endpoints** (ต้องสร้างใน backend)
   - GET /health — ตรวจ service status
   - GET /health/db — ตรวจ database connection
   - GET /health/ai — ตรวจ AI API reachability (ไม่ส่ง user data)
   Response format: {status: ok|degraded|down, checks: {...}, timestamp}

2. **Status Page Spec** (public หรือ internal)
   - Components ที่ต้องแสดง: API, AI Engine, Portal (5 ตัว), Auth
   - Incident history 90 วัน
   - Uptime calculation method

3. **Alert Rules** (Prometheus + Alertmanager หรือ simple cron check)
   - Latency > 2s → warn; > 5s → critical
   - Error rate > 1% → warn; > 5% → critical
   - AI API quota > 80% → warn
   - Disk > 80% → warn

4. **On-Premise Monitoring Stack** — แนะนำ stack ที่รันในองค์กรได้
   - Prometheus + Grafana (open source)
   - ทางเลือก lightweight: uptime-kuma

5. **Runbook เมื่อ down** — ขั้นตอน 5 นาทีแรก

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 3 แพลตฟอร์ม (reliability สำหรับทุกกลุ่ม)
""",
    },

    "7.6": {
        "wave": 7,
        "desc": "KPI Dashboard Spec — 5 ตัวชี้วัดหลักพร้อมวิธีวัดที่มีแหล่งที่มาจริง",
        "agent": "data-analytics",
        "output": "docs/kpi-dashboard-spec.md",
        "prompt": """\
สร้าง KPI Dashboard Specification สำหรับ OpenThai.ai

**หลักการ:** ทุกตัวชี้วัดต้องระบุ: ชื่อ, นิยาม, สูตรคำนวณ, แหล่งข้อมูล, ความถี่อัปเดต
ถ้า "ยังไม่ได้วัด" ให้เขียนชัดเจน

**5 ตัวชี้วัดหลัก:**

1. **Active Users per Portal** (กลุ่มผู้ใช้ 1-6)
   - นิยาม: DAU/MAU แต่ละ portal
   - แหล่ง: server access log
   - ยังไม่ได้วัด: ยังไม่มี user tracking (PDPA compliant)

2. **AI Query Success Rate**
   - นิยาม: % ของ query ที่ได้รับผลลัพธ์โดยไม่ error
   - แหล่ง: API response log

3. **Thai Language Accuracy**
   - นิยาม: score จาก Thai Eval Suite
   - แหล่ง: thai_eval_runner.py output
   - ยังไม่ได้วัด: รอ model จริง

4. **Time-to-First-Token** (latency)
   - นิยาม: เวลาตั้งแต่ส่ง request จนได้ token แรก (ms)
   - แหล่ง: API middleware timing

5. **Data Sovereignty Compliance Rate**
   - นิยาม: % ของ request ที่ประมวลผลในประเทศ
   - แหล่ง: deployment config + request routing log

**Dashboard Layout:**
- 1 หน้า A4 (printable)
- แต่ละ KPI: ค่าปัจจุบัน, trend 30 วัน, traffic light (🟢🟡🔴)
- Tool recommendation: Grafana (on-prem) หรือ Metabase

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 3 แพลตฟอร์ม + รายงานให้ Mythos
""",
    },

    "7.7": {
        "wave": 7,
        "desc": "Content Audit — ตรวจและแก้ตัวเลขลอยในหนังสือ ปรากฏการณ์-OpenThaiAi.md",
        "agent": "content-localization",
        "output": "docs/content-audit-floating-numbers.md",
        "prompt": """\
ตรวจสอบตัวเลขที่ไม่มีที่มาในหนังสือหลักของโครงการ

**ปัญหาที่ทราบ:** ตัวเลข 42%, 60%, 35%, 3.2 เท่า ในหนังสือยังไม่มีแหล่งอ้างอิง

สร้างรายงาน Content Audit:

1. **รายการตัวเลขที่ต้องตรวจ** — scan ทั้งไฟล์หา pattern: \\d+% หรือ \\d+\\.\\d+ เท่า
   สำหรับแต่ละตัวเลข:
   - ตัวเลข + บริบทประโยค
   - มีแหล่งอ้างอิงไหม? ถ้ามี ระบุ
   - ถ้าไม่มี: แนะนำ 3 ทางเลือก
     a) ลบออก + แก้ประโยคให้ยังสื่อความหมาย
     b) เปลี่ยนเป็น "ประมาณการ" พร้อมช่วงความเชื่อมั่น
     c) หาแหล่งข้อมูลจริงที่อ้างได้ (ระบุแหล่งที่ควรไปค้น)

2. **ตัวเลขสำคัญที่ต้องหาแหล่งอ้างอิง**
   - ขนาดตลาด AI ไทย
   - จำนวน SME ไทย
   - % ผู้ประกอบการที่ใช้ AI
   แนะนำแหล่งข้อมูล: ETDA, NECTEC, BOT, สำนักงานสถิติแห่งชาติ

3. **Priority** — เรียงลำดับว่าตัวเลขไหนเสี่ยงถูกท้วงมากที่สุด

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา (credibility สำหรับ public release)
""",
    },

    "7.8": {
        "wave": 7,
        "desc": "Community Strategy — แผนสร้าง Open Source community สำหรับ Thai developers",
        "agent": "ecosystem-agent",
        "output": "docs/community-strategy.md",
        "prompt": """\
สร้าง Community Strategy สำหรับ OpenThai.ai Open Source ecosystem

บริบท: ยังไม่มีชุมชนนักพัฒนาจริง ๆ เอกสาร developer-onboarding.md มีแล้ว

เนื้อหา:
1. **Community Vision** — ชุมชนที่ต้องการสร้าง (ไม่ใช่แค่ user แต่เป็น contributor)

2. **Platform ที่ใช้** — GitHub Discussions vs Discord vs LINE OA vs combination
   - เหตุผล, ข้อดีข้อเสีย, คนไทย prefer อะไร
   - ทรัพยากรที่ต้องการแต่ละ platform

3. **First 100 Community Members Plan**
   - ใคร (persona: นักศึกษา CS, Junior dev, Senior dev, researcher)
   - หาจากที่ไหน (มหาวิทยาลัย, meetup, Hackathon, LinkedIn Thailand)
   - offer อะไรให้ (early access, badge, credit ใน repo)

4. **Contribution Pathway**
   - Level 0: ใช้ + รายงาน bug
   - Level 1: แก้ docs, เพิ่ม test
   - Level 2: ส่ง PR feature เล็ก
   - Level 3: Core contributor, review PR

5. **First Event** — Hackathon หรือ Workshop ที่ทำได้ภายใน 3 เดือน
   - ธีม, format, ขนาด, platform (online/offline), sponsor ที่เป็นไปได้

6. **Content Calendar** — 4 สัปดาห์แรก: โพสต์อะไร, ที่ไหน, บ่อยแค่ไหน

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา/ผู้กำกับดูแล
""",
    },

    "7.9": {
        "wave": 7,
        "desc": "Wave 7 Backlog Entry — อัปเดต TEAM-BACKLOG.md ด้วยงาน Wave 7 ทั้งหมด",
        "agent": "chief-of-staff",
        "output": "docs/wave7-summary.md",
        "prompt": """\
สร้าง Wave 7 Summary สำหรับ OpenThai.ai

Wave 7 ชื่อ "Infrastructure & Real Work" — งาน 8 ชิ้นที่ทีม Agent ทำได้ทันที
ไม่รอ Mythos, ไม่รอ Board, ส่งมอบเป็นของจริง

สร้างเอกสารสรุป Wave 7:
1. ภาพรวมว่า Wave 7 แตกต่างจาก Wave ก่อน ๆ อย่างไร (เน้น implementation ไม่ใช่ planning)
2. ตารางงาน 8 ชิ้น: ID, ชื่องาน, agent, output, ประโยชน์ต่อ 6 กลุ่มผู้ใช้
3. Dependencies: งานไหนทำก่อน-หลังกัน
4. Definition of Done สำหรับ Wave 7 ทั้งหมด
5. สิ่งที่ Wave 7 ยังไม่ครอบคลุม (ทำใน Wave 8 ต่อ)

เสิร์ฟกลุ่มผู้ใช้: ทุกกลุ่ม (infrastructure รองรับทุกกลุ่ม)
""",
    },

    # ==================== Wave 8 — Connect & Prove ====================

    "8.1": {
        "wave": 8,
        "desc": "Consumer AI Integration — เชื่อม welfare check + contract summary กับ Anthropic API จริง",
        "agent": "backend-engineer",
        "output": "backend/api/consumer_ai.py",
        "prompt": """\
implement AI integration สำหรับ Consumer Portal (OpenThai.ai)

อ้างอิงจาก backend/api/routes_wave7.py ที่มี stub อยู่แล้ว
สร้างไฟล์ใหม่: backend/api/consumer_ai.py

**งานที่ต้องทำ:**

1. **WelfareChecker** class
   - รับ: อายุ, รายได้ต่อเดือน, สถานะครอบครัว, จังหวัด
   - prompt สำรับ Anthropic API ที่ตรวจสอบว่าตรงเกณฑ์ 6 โปรแกรมสวัสดิการ
   - return: รายการสวัสดิการที่น่าจะได้รับ + เหตุผล + ลิงก์ข้อมูลจริง
   - PDPA: ห้าม log user input โดยตรง

2. **ContractSummarizer** class
   - รับ: ข้อความสัญญา (ไม่เกิน 10,000 ตัวอักษร)
   - prompt ให้ Claude สรุปเป็น 5 ข้อ: หน้าที่, สิทธิ, ข้อห้าม, ความเสี่ยง, วันสำคัญ
   - ภาษาไทยอ่านง่าย ระดับ ป.6
   - output: structured dict พร้อม disclaimer

3. **Integration กับ routes_wave7.py**
   - แก้ /api/consumer/welfare/check ให้ใช้ WelfareChecker
   - แก้ /api/consumer/contract/summarize ให้ใช้ ContractSummarizer

ใช้ anthropic SDK (claude-haiku-4-5-20251001 เพื่อประหยัด cost)
มี fallback เมื่อ API ไม่ตอบ (ไม่ crash, return error message ภาษาไทย)

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 4 ผู้บริโภค
""",
    },

    "8.2": {
        "wave": 8,
        "desc": "Baseline Eval Run — รัน Thai Eval Suite กับ claude-haiku และบันทึกผลเป็น baseline",
        "agent": "ai-ml-engineer",
        "output": "docs/eval-baseline-wave8.md",
        "prompt": """\
รัน Thai Eval Suite เพื่อสร้าง baseline สำหรับ OpenThai.ai

ใช้ tools/thai_eval_runner.py ที่สร้างจาก Wave 7
ใช้ docs/thai-eval-suite-v1.json เป็น test suite

**ขั้นตอน:**
1. รัน eval กับ claude-haiku-4-5-20251001 (ถ้ามี ANTHROPIC_API_KEY)
   หรือถ้าไม่มี key ให้สร้าง mock baseline จาก 10 test cases แรก
2. บันทึกผล: pass rate ต่อ dimension
3. หาจุดอ่อน: dimension ไหนต่ำกว่า 70%?

สร้างเอกสาร docs/eval-baseline-wave8.md:
1. วันที่รัน, โมเดล, version ของ eval suite
2. ผล summary: pass/total ต่อ dimension (Thai Grammar, Factual, Safety, Professional, Cultural)
3. Top 3 failure cases — ระบุว่าผิดตรงไหน และน่าจะแก้อย่างไร
4. Baseline ที่ใช้เปรียบเทียบในอนาคต: target > 80% ทุก dimension
5. ข้อแนะนำ: ควรเพิ่ม test case ประเภทไหน

ถ้าไม่มี API key: สร้าง mock run ที่ realistic พร้อมระบุชัดว่า "ประมาณการจาก mock run"

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา (benchmark สาธารณะ)
""",
    },

    "8.3": {
        "wave": 8,
        "desc": "Uptime Kuma Deployment — deploy monitoring จริงด้วย Docker Compose",
        "agent": "devops-sre",
        "output": "ops/docker-compose.monitoring.yml",
        "prompt": """\
สร้าง Docker Compose สำหรับ monitoring stack ของ OpenThai.ai

อ้างอิงจาก docs/monitoring-spec.md ที่เขียนไว้ใน Wave 7

สร้างไฟล์: ops/docker-compose.monitoring.yml

**Stack ที่เลือก:** uptime-kuma (lightweight, self-hosted, รัน on-prem ได้)

เนื้อหาที่ต้องมี:
1. **docker-compose.monitoring.yml**
   - uptime-kuma service: image, port (3001), volume สำหรับ data
   - optional: nginx reverse proxy สำหรับ HTTPS
   - environment variables ที่ต้องตั้ง

2. **ops/monitoring-setup.md** — คู่มือภาษาไทย 10 ขั้นตอน
   - ติดตั้ง, เปิดใช้, เพิ่ม monitors
   - monitors ที่ต้องเพิ่ม: 5 Portal URLs + API health endpoint
   - ตั้ง alert ผ่าน LINE Notify (คนไทยใช้ LINE)

3. **Makefile targets** เพิ่มใน Makefile (หรือสร้างใหม่):
   - `make monitoring-up` — start stack
   - `make monitoring-down` — stop stack
   - `make monitoring-status` — ดู logs

รันได้บน: Ubuntu 22.04, Raspberry Pi 4, Windows WSL2

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 3 แพลตฟอร์ม
""",
    },

    "8.4": {
        "wave": 8,
        "desc": "GitHub Org Setup Checklist + Community Channels — checklist ตั้ง community จริง",
        "agent": "ecosystem-agent",
        "output": "docs/community-launch-checklist.md",
        "prompt": """\
สร้าง Community Launch Checklist สำหรับ OpenThai.ai

อ้างอิงจาก docs/community-strategy.md (Wave 7)

เป้าหมาย: Mythos ดูแล้วทำตามได้ทันทีภายใน 1 วัน

เนื้อหา docs/community-launch-checklist.md:

**A. GitHub Setup (30 นาที)**
- [ ] สร้าง GitHub Organization: openthai-ai
- [ ] สร้าง repositories: openthai-core, openthai-docs, openthai-eval
- [ ] ตั้ง Organization Profile (README.md ภาษาไทย + อังกฤษ)
- [ ] สร้าง Discussion categories: Announcements, Q&A, Ideas, Show & Tell
- [ ] เพิ่ม Contributing guide (CONTRIBUTING.md) — ภาษาไทย
- [ ] เพิ่ม Code of Conduct ภาษาไทย
- [ ] ตั้ง GitHub Sponsors page (optional แต่แนะนำ)

**B. Discord Setup (30 นาที)**
- [ ] สร้าง server: OpenThai.ai Community
- [ ] channels: #ประกาศ, #ทั่วไป, #ช่วยเหลือ, #โชว์งาน, #นักพัฒนา, #th-model-research
- [ ] roles: Admin, Core Contributor, Contributor, Member
- [ ] invite link ถาวร (ไม่หมดอายุ)
- [ ] bot: Carl-bot หรือ MEE6 สำหรับ welcome + role assignment

**C. First Content (1 วัน)**
- [ ] LinkedIn post ภาษาไทย: "เปิด OpenThai.ai community"
- [ ] GitHub Discussion แรก: "เราคือใคร + roadmap"
- [ ] ตั้ง GitHub Star goal: 50 stars ใน 30 วัน

**D. University Outreach Template**
สร้าง email template ภาษาไทย สำหรับส่งให้ 5 มหาวิทยาลัยตาม flash-brief-partnerships.md

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา
""",
    },

    "8.5": {
        "wave": 8,
        "desc": "Shared Navigation + Auth Layer Spec — ออกแบบ nav/auth ที่ใช้ร่วมกันทุก Portal",
        "agent": "frontend-engineer",
        "output": "docs/shared-nav-auth-spec.md",
        "prompt": """\
ออกแบบ Shared Navigation + Authentication Layer สำหรับ OpenThai.ai Portal ทั้ง 7

สถานะปัจจุบัน: แต่ละ Portal (Producer, Intermediary, Consumer, Professional, Gov, Affiliate, Creator)
มี navigation แยกกัน ไม่มี single sign-on

สร้าง docs/shared-nav-auth-spec.md:

**A. Navigation Architecture**
1. Top Navigation Bar (ใช้ร่วมกันทุก Portal)
   - Logo + ชื่อ Portal ปัจจุบัน
   - Portal switcher (dropdown หรือ mega-menu)
   - Language switcher (TH/ZH/EN)
   - User profile / Login button
2. Sidebar (optional per-portal)
3. Breadcrumb
4. Mobile navigation (hamburger menu)

**B. Authentication Flow**
1. เลือก auth method: JWT + refresh token หรือ session cookie
   - PDPA: ไม่เก็บข้อมูลที่ไม่จำเป็น
   - ระยะเวลา session
2. Guest mode: ใช้บาง feature ได้โดยไม่ login
3. SSO กับ LINE Login (คนไทยมี LINE ทุกคน) — optional phase 2

**C. React Components**
ออกแบบ component structure:
- `<AppShell>` — wrapper
- `<TopNav>` — props interface
- `<PortalSwitcher>` — list of portals
- `<AuthModal>` — login/register
- `<UserMenu>` — profile dropdown

**D. Implementation Priority**
- Phase 1 (ทำใน Wave 9): TopNav + PortalSwitcher (ไม่มี auth)
- Phase 2: เพิ่ม Auth
- Phase 3: LINE Login

เสิร์ฟกลุ่มผู้ใช้: ทุกกลุ่ม (UX ที่ดีขึ้นสำหรับทุกคน)
""",
    },

    "8.6": {
        "wave": 8,
        "desc": "Affiliate Commission Engine Stub — implement Non-MLM 2-tier commission logic จริง",
        "agent": "blockchain-web3",
        "output": "backend/affiliate/commission_engine.py",
        "prompt": """\
implement Affiliate Commission Engine สำหรับ OpenThai.ai

อ้างอิงจาก docs/affiliate-technical-spec.md (Wave 5) และ docs/affiliate-legal-check.md (Wave 2)

กฎ Non-MLM ที่ต้องปฏิบัติตามเสมอ:
1. จ่าย commission จากยอดขายจริงเท่านั้น (ไม่ใช่ค่าสมัคร)
2. ลึกสูงสุด 2 ชั้น (referrer โดยตรง + ผู้แนะนำ referrer)
3. ชั้น 1: สูงสุด 15% ของยอดขาย
4. ชั้น 2: สูงสุด 5% ของยอดขาย
5. ต้องมี audit trail ทุก transaction

สร้าง backend/affiliate/commission_engine.py:

```python
class CommissionEngine:
    def calculate(self, sale_amount: float, referral_chain: list[str]) -> CommissionResult
    def validate_chain_depth(self, chain: list[str]) -> bool  # max 2
    def record_transaction(self, tx: CommissionTransaction) -> str  # returns tx_id
    def get_pending_payouts(self, affiliate_id: str) -> list[Payout]
    def mark_paid(self, payout_ids: list[str]) -> int
```

models:
- CommissionTransaction: sale_id, amount, tier1_id, tier1_pct, tier2_id, tier2_pct, timestamp
- CommissionResult: tier1_amount, tier2_amount, audit_log
- Payout: affiliate_id, amount, period, status

ใช้ dataclasses, ไม่ต้องการ database จริง (in-memory dict สำหรับ stub)
เพิ่ม test cases 5 กรณี: ชั้นเดียว, สองชั้น, เกิน 2 ชั้น (ต้อง error), ยอดขาย 0, refund

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 2 คนกลาง + กลุ่ม 3 แพลตฟอร์ม
""",
    },
}


# ================================================================
# ฟังก์ชันสีและ output
# ================================================================

def colour(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m"

def ok(msg: str)   -> None: print(colour(f"  ✅ {msg}", "32"))
def warn(msg: str) -> None: print(colour(f"  ⚠️  {msg}", "33"))
def err(msg: str)  -> None: print(colour(f"  ❌ {msg}", "31"))
def info(msg: str) -> None: print(colour(f"  ℹ️  {msg}", "36"))
def head(msg: str) -> None: print(colour(f"\n{'='*60}\n{msg}\n{'='*60}", "1"))
def div()          -> None: print(colour(f"  {'─'*56}", "90"))


# ================================================================
# State persistence — บันทึก/โหลดสถานะ loop
# ================================================================

def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"pass_count": 0, "total_done": 0, "started_at": datetime.now().isoformat()}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# ================================================================
# Task logic
# ================================================================

def is_blocked(task: dict) -> bool:
    text = task.get("desc", "").lower() + " " + task.get("prompt", "").lower()
    return any(kw.lower() in text for kw in MYTHOS_GATE_KEYWORDS)


def output_exists(task: dict) -> bool:
    out = task.get("output")
    return bool(out and (PROJECT_ROOT / out).exists())


def list_tasks(wave: Optional[int] = None) -> None:
    head("รายการงานใน Task Catalog")
    for tid, task in TASK_CATALOG.items():
        if wave and task["wave"] != wave:
            continue
        blocked = is_blocked(task)
        done    = output_exists(task)
        status  = colour("✅ DONE  ", "32") if done else \
                  colour("🔴 BLOCKED", "31") if blocked else \
                  colour("🟡 READY ", "33")
        print(f"\n  [{tid}] {status} Wave {task['wave']}")
        print(f"       {task['desc']}")
        print(f"       output : {task.get('output', '-')}")
        print(f"       agent  : {task['agent']}")
        if blocked:
            warn("รอ Mythos — ข้ามอัตโนมัติ")


def call_claude(task: dict, dry_run: bool = False) -> Optional[str]:
    if dry_run:
        info(f"[dry-run] จะเรียก Claude สำหรับ: {task['desc'][:60]}")
        return None
    if not HAS_ANTHROPIC:
        err("ไม่พบ anthropic SDK — รัน: pip install anthropic")
        return None
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        err("ต้องตั้ง ANTHROPIC_API_KEY ใน environment")
        return None

    client = anthropic.Anthropic(api_key=api_key)
    user_msg = (
        f"งาน: {task['desc']}\n"
        f"Agent ที่รับผิดชอบ: {task['agent']}\n"
        f"ไฟล์ผลลัพธ์: {task.get('output', 'ไม่ระบุ')}\n\n"
        f"{task['prompt']}"
    )
    print(f"  🤖 เรียก {DEFAULT_MODEL}…", end="", flush=True)
    t0 = time.time()
    try:
        resp = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        print(f" เสร็จใน {time.time()-t0:.1f}s")
        return resp.content[0].text
    except Exception as exc:
        print()
        err(f"Claude API error: {exc}")
        return None


def save_output(task: dict, content: str) -> Optional[Path]:
    if not task.get("output"):
        return None
    path = PROJECT_ROOT / task["output"]
    path.parent.mkdir(parents=True, exist_ok=True)
    header = (
        f"# {task['desc']}\n\n"
        f"> สร้างโดย: OpenThai.ai Dev-Loop Agent ({task['agent']})\n"
        f"> วันที่: {datetime.now().strftime('%d %B %Y %H:%M')}\n"
        f"> Wave: {task['wave']}\n\n---\n\n"
    )
    path.write_text(header + content, encoding="utf-8")
    return path


def append_log(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def run_task(task_id: str, dry_run: bool = False) -> bool:
    task = TASK_CATALOG.get(task_id)
    if not task:
        err(f"ไม่พบงาน [{task_id}]")
        return False

    div()
    print(colour(f"  🔨 [{task_id}] Wave {task['wave']}", "1"))
    print(f"  {task['desc'][:70]}")
    print(f"  Agent: {task['agent']}")

    if is_blocked(task):
        warn("รอ Mythos อนุมัติ — ข้าม")
        return False
    if output_exists(task):
        ok(f"ไฟล์มีอยู่แล้ว: {task['output']} — ข้าม")
        return True

    content = call_claude(task, dry_run=dry_run)
    if content is None:
        return dry_run  # dry-run ถือว่าผ่าน

    saved = save_output(task, content)
    if saved:
        ok(f"บันทึกที่: {task['output']}")

    append_log({
        "ts": datetime.now().isoformat(),
        "task_id": task_id,
        "wave": task["wave"],
        "desc": task["desc"],
        "output": task.get("output"),
        "status": "dry-run" if dry_run else "done",
    })
    return True


# ================================================================
# Run modes
# ================================================================

def run_wave(wave: int, dry_run: bool = False) -> tuple[int, int, int]:
    """รัน wave เดียว — คืน (done, skipped, errors)"""
    head(f"Wave {wave}")
    done = skipped = errors = 0
    for tid, task in TASK_CATALOG.items():
        if task["wave"] != wave:
            continue
        success = run_task(tid, dry_run)
        if success:
            done += 1
        elif is_blocked(task):
            skipped += 1
        else:
            errors += 1
    return done, skipped, errors


def run_auto(wave: Optional[int] = None, dry_run: bool = False) -> None:
    """รันทุกงานที่พร้อม (ผ่านครั้งเดียว)"""
    head(f"Auto Mode — {'Wave ' + str(wave) if wave else 'ทุก Wave'}")
    done = skipped = errors = 0
    for tid, task in TASK_CATALOG.items():
        if wave and task["wave"] != wave:
            continue
        success = run_task(tid, dry_run)
        if success:
            done += 1
        elif is_blocked(task):
            skipped += 1
        else:
            errors += 1
    div()
    ok(f"เสร็จ: {done} งาน")
    warn(f"รอ Mythos: {skipped} งาน")
    if errors:
        err(f"ข้อผิดพลาด: {errors} งาน")


def run_continuous(interval: int = DEFAULT_INTERVAL, dry_run: bool = False) -> None:
    """
    รันต่อเนื่องไม่หยุด — loop ทุก interval วินาที
    ทุก pass: หางานที่ยังไม่เสร็จ → รัน → รายงาน → หลับ → ตื่น → วน
    กด Ctrl+C เพื่อหยุด
    """
    state = load_state()
    head("🔄 Continuous Loop Mode — กด Ctrl+C เพื่อหยุด")
    print(colour(f"  interval: {interval}s | dry-run: {dry_run}", "36"))
    print(colour(f"  เริ่มครั้งแรก: {state['started_at']}", "36"))
    print(colour(f"  ผ่านมาแล้ว: {state['pass_count']} pass, {state['total_done']} งานเสร็จ", "36"))

    try:
        while True:
            state["pass_count"] += 1
            pass_num = state["pass_count"]
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            head(f"Pass #{pass_num} — {now}")

            # หางานที่พร้อมรัน
            ready = [
                (tid, task) for tid, task in TASK_CATALOG.items()
                if not is_blocked(task) and not output_exists(task)
            ]

            if not ready:
                ok("ทุกงานที่ทำได้เสร็จแล้ว!")
                blocked = sum(1 for t in TASK_CATALOG.values() if is_blocked(t))
                warn(f"งานที่รอ Mythos: {blocked} ชิ้น")
                info(f"ไม่มีงานใหม่ — ตรวจอีกครั้งใน {interval}s (Ctrl+C เพื่อหยุด)")
            else:
                info(f"พบ {len(ready)} งานที่พร้อมรัน")
                pass_done = 0
                for tid, task in sorted(ready, key=lambda x: (x[1]["wave"], x[0])):
                    if run_task(tid, dry_run):
                        pass_done += 1
                        state["total_done"] += 1

                div()
                ok(f"Pass #{pass_num} เสร็จ: {pass_done}/{len(ready)} งาน")

            # บันทึกสถานะ
            state["last_pass"] = now
            save_state(state)

            # สรุปสั้น ๆ ก่อนหลับ
            total  = len(TASK_CATALOG)
            done_n = sum(1 for t in TASK_CATALOG.values() if output_exists(t))
            print(colour(
                f"\n  📊 ความคืบหน้ารวม: {done_n}/{total} งาน "
                f"({done_n*100//total}%) — "
                f"loop ครั้งที่ {pass_num}",
                "1;36"
            ))

            _sleep_with_countdown(interval)

    except KeyboardInterrupt:
        div()
        print(colour("\n\n👋 หยุด Continuous Loop", "1;33"))
        state["stopped_at"] = datetime.now().isoformat()
        save_state(state)
        info(f"สรุป: {state['pass_count']} pass, {state['total_done']} งานเสร็จ")
        info(f"สถานะบันทึกที่: tools/dev-loop-state.json")


def _sleep_with_countdown(seconds: int) -> None:
    """หลับ interval วินาที แสดง countdown ทุก 30s"""
    info(f"จะตรวจใหม่ใน {seconds}s (Ctrl+C เพื่อหยุด)")
    elapsed = 0
    step = min(30, seconds)
    while elapsed < seconds:
        try:
            time.sleep(step)
            elapsed += step
            remaining = seconds - elapsed
            if remaining > 0:
                print(colour(f"  ⏳ อีก {remaining}s…", "90"), end="\r")
        except KeyboardInterrupt:
            raise


# ================================================================
# Report & Status
# ================================================================

def show_status() -> None:
    waves: dict[int, list] = {}
    for tid, task in TASK_CATALOG.items():
        waves.setdefault(task["wave"], []).append((tid, task))

    total = done = ready = blocked = 0
    for w in sorted(waves):
        print(colour(f"\n  Wave {w}", "1"))
        for tid, task in waves[w]:
            done_flag    = output_exists(task)
            blocked_flag = is_blocked(task)
            if done_flag:
                sym, col = "✅", "32"; done += 1
            elif blocked_flag:
                sym, col = "⛔", "31"; blocked += 1
            else:
                sym, col = "🔲", "33"; ready += 1
            total += 1
            label = task["desc"][:55] + ("…" if len(task["desc"]) > 55 else "")
            print(colour(f"    {sym} [{tid}] {label}", col))

    div()
    print(colour(
        f"  รวม {total} งาน | ✅ {done} เสร็จ | 🔲 {ready} พร้อมรัน | ⛔ {blocked} รอ Mythos",
        "1"
    ))
    if ready > 0:
        pct = done * 100 // total
        bar_len = 30
        filled = bar_len * done // total
        bar = "█" * filled + "░" * (bar_len - filled)
        print(colour(f"  [{bar}] {pct}%", "36"))


def suggest_next() -> None:
    head("งานถัดไปที่แนะนำ")
    ready = sorted(
        [(tid, t) for tid, t in TASK_CATALOG.items()
         if not is_blocked(t) and not output_exists(t)],
        key=lambda x: (x[1]["wave"], x[0])
    )
    if not ready:
        ok("ทุกงานที่ทำได้เสร็จแล้ว! รอ Mythos ปลดล็อก blockers")
        return
    print(f"\n  พบ {len(ready)} งานที่พร้อมรัน:\n")
    for i, (tid, task) in enumerate(ready[:5], 1):
        print(colour(f"  {i}. [{tid}] Wave {task['wave']} — {task['desc']}", "33"))
        print(f"      agent:  {task['agent']}")
        print(f"      output: {task.get('output', '-')}")
    if len(ready) > 5:
        info(f"... และอีก {len(ready)-5} งาน (ใช้ --list เพื่อดูทั้งหมด)")
    print()
    print(colour(f"  รันงานแรก: python tools/openthai_dev_loop.py --run {ready[0][0]}", "1;32"))
    print(colour(f"  รันทั้งหมด: python tools/openthai_dev_loop.py --auto", "1;32"))
    print(colour(f"  รันต่อเนื่อง: python tools/openthai_dev_loop.py --loop", "1;32"))


def generate_report() -> None:
    rows = []
    for tid, task in TASK_CATALOG.items():
        if output_exists(task):
            status = "✅ เสร็จ"
        elif is_blocked(task):
            status = "⛔ รอ Mythos"
        else:
            status = "🔲 รอรัน"
        out = f"`{task['output']}`" if task.get("output") else "-"
        rows.append(f"| {tid} | {task['wave']} | {status} | {task['desc'][:55]}… | {out} |")

    total   = len(TASK_CATALOG)
    done_n  = sum(1 for t in TASK_CATALOG.values() if output_exists(t))
    block_n = sum(1 for t in TASK_CATALOG.values() if is_blocked(t))
    ready_n = total - done_n - block_n

    # อ่าน state ถ้ามี
    state = load_state()
    loop_info = (
        f"Loop pass: {state.get('pass_count', 0)} | "
        f"งานเสร็จสะสม: {state.get('total_done', 0)}"
    )

    lines = [
        "# OpenThai.ai — Dev-Loop Progress Report",
        f"\n> สร้างอัตโนมัติ | {datetime.now().strftime('%Y-%m-%d %H:%M')} | {loop_info}",
        "\n---\n",
        "## สถานะงาน\n",
        "| ID | Wave | สถานะ | งาน | ไฟล์ |",
        "|---|---|---|---|---|",
        *rows,
        "\n---\n",
        "## สรุป\n",
        f"- **ทั้งหมด:** {total} งาน",
        f"- **เสร็จแล้ว:** {done_n} งาน ({done_n*100//total}%)",
        f"- **พร้อมรัน:** {ready_n} งาน",
        f"- **รอ Mythos:** {block_n} งาน",
        "\n## Blockers ที่รอ Mythos\n",
        "- แต่งตั้ง Innovation Board 5 ที่นั่ง",
        "- ตัดสินใจ product แรก (PDPA Assistant หรืออื่น)",
        "- จ้าง AI Engineer คนแรก + ตั้งนิติบุคคล",
        "- Legal ภายนอกรับรอง PDPA signoff",
        "\n---",
        "*สร้างโดย OpenThai.ai Dev-Loop v3 — ตาม CLAUDE.md*",
    ]
    content = "\n".join(lines)
    REPORT_PATH.write_text(content, encoding="utf-8")
    ok(f"Report บันทึกที่: tools/dev-loop-report.md")
    print(content[:2000])


# ================================================================
# CLI
# ================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="OpenThai.ai Autonomous Development Loop v3",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
        ตัวอย่าง:
          python tools/openthai_dev_loop.py --status
          python tools/openthai_dev_loop.py --next
          python tools/openthai_dev_loop.py --list --wave 7
          python tools/openthai_dev_loop.py --run 7.1
          python tools/openthai_dev_loop.py --wave 7
          python tools/openthai_dev_loop.py --auto
          python tools/openthai_dev_loop.py --loop
          python tools/openthai_dev_loop.py --loop --interval 600
          python tools/openthai_dev_loop.py --dry-run --loop
          python tools/openthai_dev_loop.py --report
        """),
    )
    parser.add_argument("--list",     action="store_true",      help="แสดงงานทั้งหมด (verbose)")
    parser.add_argument("--status",   action="store_true",      help="สถานะสั้น")
    parser.add_argument("--next",     action="store_true",      help="แนะนำงานถัดไป")
    parser.add_argument("--run",      metavar="TASK_ID",        help="รันงานเดียว เช่น 7.1")
    parser.add_argument("--wave",     type=int, metavar="N",    help="รันทุกงานใน wave N")
    parser.add_argument("--auto",     action="store_true",      help="รันอัตโนมัติทุกงานที่พร้อม (ผ่านครั้งเดียว)")
    parser.add_argument("--loop",     action="store_true",      help="รันต่อเนื่องไม่หยุด (Ctrl+C เพื่อหยุด)")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, metavar="SEC",
                        help=f"วินาทีระหว่าง loop pass (default: {DEFAULT_INTERVAL})")
    parser.add_argument("--report",   action="store_true",      help="สร้างรายงาน Markdown")
    parser.add_argument("--dry-run",  action="store_true",      help="แสดงงานโดยไม่รันจริง")
    args = parser.parse_args()

    print(colour("\n🇹🇭 OpenThai.ai Autonomous Dev Loop v3", "1;36"))
    print(colour(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | "
                 f"Catalog: {len(TASK_CATALOG)} งาน | "
                 f"Wave 4–7", "36"))

    if args.status:
        show_status()
    elif args.next:
        suggest_next()
    elif args.list:
        list_tasks(wave=args.wave)
    elif args.run:
        run_task(args.run, dry_run=args.dry_run)
    elif args.loop:
        run_continuous(interval=args.interval, dry_run=args.dry_run)
    elif args.auto or (args.wave and not args.list):
        run_auto(wave=args.wave, dry_run=args.dry_run)
    elif args.report:
        generate_report()
    else:
        show_status()
        suggest_next()


if __name__ == "__main__":
    main()
