# RAG + Guardrails สำหรับโมดูลวิชาชีพ (On-Premise)

**เอกสาร:** `docs/rag-guardrails-professional.md`
**งาน Backlog:** 2.3 คลื่นงานที่ 2 (ขึ้นกับ 2.2 ✅)
**ผู้จัดทำ:** `ai-ml-engineer` + `security-guard`
**วันที่:** 6 สิงหาคม 2569
**เสิร์ฟกลุ่ม:** กลุ่มที่ 6 (สายงานวิชาชีพ)
**อ้างอิง:** `docs/module-professional.md`, `docs/legal-check-professional.md`, `CLAUDE.md` ข้อ 2

---

## 1. ข้อกำหนดพื้นฐานที่ไม่ต่อรอง

จาก `docs/module-professional.md` ข้อ 1.4:
> "On-Premise เท่านั้น — ไม่มีโหมด Cloud สำหรับข้อมูลลูกความ/คนไข้"

ดังนั้นสถาปัตยกรรมนี้ **ไม่มีองค์ประกอบที่ส่งข้อมูลออกนอกเครือข่ายองค์กร** ทุก component รัน Local

---

## 2. สถาปัตยกรรมภาพรวม

```
[ ผู้ใช้วิชาชีพ ]
       │
       ▼
[ Input Guardrail Layer ]
  ├─ ตรวจ PII / ข้อมูลอ่อนไหว
  ├─ ตรวจ Prompt Injection
  └─ ตรวจว่า query อยู่ในขอบเขตวิชาชีพ
       │ ผ่าน
       ▼
[ RAG Engine (On-Premise) ]
  ├─ Thai Tokenizer
  ├─ Embedding Model (Local)
  ├─ Vector DB (Qdrant — Local)
  └─ Document Store (ไฟล์ใน LAN)
       │
       ▼
[ LLM (vLLM — Local GPU) ]
       │
       ▼
[ Output Guardrail Layer ]
  ├─ ตรวจ Hallucination (ตัดถ้าไม่มีแหล่งอ้างอิง)
  ├─ ตรวจว่าตอบเกินขอบเขต (วินิจฉัยแทนผู้เชี่ยวชาญ)
  ├─ บังคับ DRAFT status
  └─ บันทึก Audit Log
       │
       ▼
[ ผู้ใช้รับ "ร่าง" + แหล่งอ้างอิง ]
       │
       ▼ (ขั้นตอน Human-in-the-Loop)
[ ผู้มีใบอนุญาตกดยืนยัน → APPROVED ]
```

---

## 3. Input Guardrail Layer

### 3.1 PII Detector

```python
import re
from typing import Tuple

# Pattern สำหรับข้อมูลที่ห้ามพิมพ์ลง LLM โดยไม่ pseudonymize
PII_PATTERNS = {
    "thai_id":      r"\b[1-9]\d{12}\b",
    "passport":     r"\b[A-Z]{1,2}\d{6,9}\b",
    "phone":        r"\b0[689]\d{8}\b",
    "email":        r"\b[\w.+-]+@[\w-]+\.\w+\b",
    "credit_card":  r"\b(?:\d[ -]?){13,16}\b",
    "bank_account": r"\b\d{10,12}\b",
    "hn_number":    r"\bHN[:\s]?\d{4,8}\b",    # Hospital Number
}

def detect_pii(text: str) -> Tuple[bool, list]:
    found = []
    for label, pattern in PII_PATTERNS.items():
        if re.search(pattern, text):
            found.append(label)
    return len(found) > 0, found

def pseudonymize(text: str) -> str:
    """แทนที่ PII ด้วย placeholder ก่อนส่งเข้า LLM"""
    result = text
    result = re.sub(PII_PATTERNS["thai_id"],     "[เลขบัตรปิด]", result)
    result = re.sub(PII_PATTERNS["phone"],        "[เบอร์โทรปิด]", result)
    result = re.sub(PII_PATTERNS["email"],        "[อีเมลปิด]", result)
    result = re.sub(PII_PATTERNS["bank_account"], "[บัญชีปิด]", result)
    result = re.sub(PII_PATTERNS["hn_number"],    "[HN ปิด]", result)
    return result
```

### 3.2 Prompt Injection Detector

```python
INJECTION_PATTERNS = [
    r"ignore (previous|all|above) instruction",
    r"forget (what|everything) (you|i) (told|said)",
    r"act as (if|though) (you are|you're)",
    r"jailbreak",
    r"ลืม(คำสั่ง|ทุกอย่าง|ที่|ว่า)",
    r"ทำเหมือน(ว่า|กับ).*ไม่มีกฎ",
    r"สมมติ(ว่า|ตัว).*ไม่ต้อง(ปฏิบัติ|ทำตาม)",
]

def detect_injection(text: str) -> bool:
    text_lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return True
    return False
```

### 3.3 Scope Checker (เฉพาะโมดูลวิชาชีพ)

```python
PROFESSIONAL_SCOPES = {
    "medical": ["วินิจฉัย", "อาการ", "ยา", "การรักษา", "ICD", "ผลตรวจ"],
    "legal":   ["สัญญา", "กฎหมาย", "มาตรา", "คดี", "สิทธิ", "พ.ร.บ."],
    "accounting": ["ภาษี", "งบการเงิน", "บัญชี", "TFRS", "สรรพากร"],
    "engineering": ["มาตรฐาน", "วิศวกรรม", "โครงสร้าง", "วสท.", "มอก."],
}

OUT_OF_SCOPE_SIGNALS = [
    "หุ้น", "เก็งกำไร", "พนัน", "ลามก", "อาวุธ"
]

def check_scope(query: str, module: str) -> Tuple[bool, str]:
    """
    returns (is_in_scope, rejection_reason)
    """
    # ตรวจ out-of-scope
    for signal in OUT_OF_SCOPE_SIGNALS:
        if signal in query:
            return False, f"คำถามนี้อยู่นอกขอบเขตโมดูล {module}"
    return True, ""
```

---

## 4. RAG Pipeline

### 4.1 Document Ingestion

```python
from pathlib import Path
import hashlib

SUPPORTED_FORMATS = [".pdf", ".docx", ".txt", ".md"]

def ingest_document(
    file_path: Path,
    profession: str,       # "medical" | "legal" | "accounting" | "engineering"
    version: str,          # เช่น "พ.ร.บ.PDPA-2562-v1"
    valid_until: str,      # วันหมดอายุ เช่น "2027-12-31"
    added_by: str,         # เลขใบอนุญาตผู้เพิ่มเอกสาร
) -> str:
    """
    แปลงเอกสารเป็น chunks + embeddings + metadata
    คืน document_id
    """
    content = extract_text(file_path)
    doc_hash = hashlib.sha256(content.encode()).hexdigest()[:16]

    chunks = chunk_thai_text(content, chunk_size=512, overlap=64)

    for i, chunk in enumerate(chunks):
        embedding = embed_local(chunk)   # ใช้ embedding model ที่รันในเครื่อง
        qdrant.upsert(
            collection_name=profession,
            points=[{
                "id": f"{doc_hash}_{i}",
                "vector": embedding,
                "payload": {
                    "text": chunk,
                    "source": file_path.name,
                    "version": version,
                    "valid_until": valid_until,
                    "added_by": added_by,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            }]
        )
    return doc_hash
```

### 4.2 Retrieval

```python
def retrieve(
    query: str,
    profession: str,
    top_k: int = 5,
    min_score: float = 0.72,    # ต่ำกว่านี้ = "ไม่พบข้อมูลในฐานอ้างอิง"
) -> list:
    query_embedding = embed_local(query)
    results = qdrant.search(
        collection_name=profession,
        query_vector=query_embedding,
        limit=top_k,
        score_threshold=min_score,
    )

    # กรองเอกสารที่หมดอายุออก
    today = date.today().isoformat()
    results = [r for r in results if r.payload.get("valid_until", "9999") >= today]

    return results

def build_prompt(query: str, docs: list, profession: str) -> str:
    if not docs:
        return f"""คุณเป็นผู้ช่วยสำหรับ {profession}
        ไม่พบข้อมูลในฐานอ้างอิงสำหรับคำถามนี้
        ห้ามตอบจากความรู้ทั่วไป — กรุณาแจ้งผู้ใช้ว่า "ไม่พบข้อมูลในฐานอ้างอิง"
        คำถาม: {query}"""

    context = "\n\n".join([
        f"[แหล่งที่ {i+1}: {d.payload['source']} เวอร์ชัน {d.payload['version']}]\n{d.payload['text']}"
        for i, d in enumerate(docs)
    ])

    return f"""คุณเป็นผู้ช่วยสำหรับ {profession} — ตอบได้เฉพาะจากเอกสารอ้างอิงต่อไปนี้เท่านั้น

กฎ:
- ทุกข้อความที่อ้างต้องระบุ [แหล่งที่ X]
- ถ้าเอกสารไม่ได้พูดถึง ให้ตอบว่า "ไม่พบในฐานอ้างอิง"
- ห้ามวินิจฉัย / ตัดสิน / ลงนามแทนผู้เชี่ยวชาญ
- ผลลัพธ์ทุกชิ้นเป็น "ร่าง" เสมอ รอผู้มีใบอนุญาตยืนยัน

เอกสารอ้างอิง:
{context}

คำถาม: {query}

ตอบ (ภาษาไทย):"""
```

---

## 5. Output Guardrail Layer

### 5.1 Citation Verifier

```python
import re

def verify_citations(response: str, retrieved_docs: list) -> Tuple[str, list]:
    """
    ตรวจว่าทุก [แหล่งที่ X] ใน response มีจริงใน retrieved_docs
    ถ้าไม่มี → ลบข้อความที่อ้างแหล่งนั้นออก
    """
    issues = []
    citation_refs = re.findall(r"\[แหล่งที่ (\d+)\]", response)
    max_valid = len(retrieved_docs)

    for ref in citation_refs:
        if int(ref) > max_valid:
            issues.append(f"อ้างแหล่งที่ {ref} แต่มีแค่ {max_valid} แหล่ง")
            response = response.replace(f"[แหล่งที่ {ref}]", "[แหล่งอ้างอิงไม่ถูกต้อง — ลบออก]")

    return response, issues
```

### 5.2 Professional Boundary Checker

```python
FORBIDDEN_OUTPUTS = {
    "medical": [
        r"คุณเป็นโรค", r"วินิจฉัยว่า", r"ควรกิน.*(ยา|mg)\b",
        r"ไม่ต้องไปหาหมอ",
    ],
    "legal": [
        r"คุณชนะคดี", r"ตัดสินว่า.*ผิด", r"ไม่ต้องจ้างทนาย",
        r"ลงนาม.*ได้เลย",
    ],
    "accounting": [
        r"ไม่ต้องเสียภาษี", r"ทำบัญชีแบบนี้ได้.*(ถูกกฎหมาย|ไม่ผิด)",
    ],
}

def check_professional_boundary(response: str, profession: str) -> Tuple[bool, str]:
    patterns = FORBIDDEN_OUTPUTS.get(profession, [])
    for pattern in patterns:
        if re.search(pattern, response):
            return False, f"ตอบเกินขอบเขต (พบ: pattern '{pattern}')"
    return True, ""
```

### 5.3 Audit Logger

```python
import json
from datetime import datetime

def log_interaction(
    user_license: str,
    query: str,
    docs_used: list,
    response: str,
    approver: str = None,
    approved_at: str = None,
    changes_made: str = None,
) -> None:
    """Append-only log — ไม่มีใครลบได้"""
    entry = {
        "ts":           datetime.utcnow().isoformat(),
        "user":         user_license,
        "query_hash":   hashlib.sha256(query.encode()).hexdigest()[:16],
        "docs_used":    [d.payload["source"] for d in docs_used],
        "response_len": len(response),
        "approved_by":  approver,
        "approved_at":  approved_at,
        "changes":      changes_made,
    }
    # เขียนแบบ append-only, ไม่มี update, ไม่มี delete
    with open("/var/log/openthai-professional/audit.jsonl", "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
```

---

## 6. การตั้งค่าแยกตามวิชาชีพ

```yaml
# config/professional-rag.yaml

professions:
  medical:
    collection:    "medical_th"
    min_score:     0.75         # เข้มกว่าปกติ
    max_tokens:    1024
    forbidden_outputs: ["วินิจฉัย", "สั่งยา", "คุณเป็นโรค"]
    document_expiry_check: true

  legal:
    collection:    "legal_th"
    min_score:     0.72
    max_tokens:    2048
    forbidden_outputs: ["คุณชนะ", "ตัดสินว่าผิด"]
    document_expiry_check: true

  accounting:
    collection:    "accounting_th"
    min_score:     0.70
    max_tokens:    1024
    forbidden_outputs: ["ไม่ต้องเสียภาษี"]
    document_expiry_check: false  # บัญชีใช้หลักการ ไม่ expire เร็ว
```

---

## 7. สิ่งที่ยังไม่ได้ทำ

| ประเด็น | หมายเหตุ |
|---|---|
| ชุดเอกสารอ้างอิงจริง (Document Store) | ต้องรวบรวมจากแหล่งทางการ — ไม่ใช่หน้าที่ ai-ml-engineer คนเดียว |
| Embedding Model ภาษาไทยที่เหมาะสม | ต้องทดสอบ: WangchanBERTa, mE5-large, หรือ custom |
| Qdrant setup script | ต้องเขียน docker-compose + collection init |
| การทดสอบจริงกับผู้เชี่ยวชาญ | ต้องให้แพทย์/ทนายทดสอบและให้ feedback |
| UI สำหรับผู้ใช้วิชาชีพ | ต้อง frontend-engineer รับช่วง |
