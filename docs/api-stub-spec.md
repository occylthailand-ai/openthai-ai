# API Stub Spec — Intermediary & Consumer Portal

> สร้างโดย: backend-engineer | วันที่: 8 กันยายน 2569 | Wave 5 งาน 5.2

---

## A. Intermediary Portal APIs (`/api/intermediary/`)

### POST `/api/intermediary/register`
**Auth:** JWT (ต้อง login ก่อน)  
**Rate limit:** 5 req/min per IP

**Request body:**
```json
{
  "business_type": "enum: trader|broker|logistics|warehouse|distributor|coordinator|supply_chain",
  "company_name": "string (required, max 200)",
  "tax_id": "string (13 digits, Thai format)",
  "contact_email": "string (email format)",
  "contact_phone": "string (Thai mobile format)",
  "documents": ["string (file ID from upload API)"]
}
```

**Response 201:**
```json
{
  "registration_id": "uuid",
  "status": "pending_review",
  "estimated_review_days": 3,
  "message": "ได้รับการลงทะเบียนแล้ว ทีมงานจะตรวจสอบและติดต่อกลับ"
}
```

**Response 400:** `{ "error": "INVALID_TAX_ID", "field": "tax_id" }`  
**PDPA:** เก็บ tax_id เข้ารหัส AES-256 | contact_email ใช้ส่ง confirmation เท่านั้น

---

### GET `/api/intermediary/hs-code`
**Auth:** Public (rate limit: 20 req/min)

**Query params:**
```
?query=<text>        Thai/English product description (required, max 200 chars)
&lang=th|en          (optional, default: th)
&top=1..10           (optional, default: 5)
```

**Response 200:**
```json
{
  "results": [
    {
      "hs_code": "0901.11.00",
      "description_th": "กาแฟ ยังไม่ผ่านกระบวนการสกัดคาเฟอีน ยังไม่คั่ว",
      "description_en": "Coffee, not roasted, not decaffeinated",
      "duty_rate": "ต้องสอบถามกรมศุลกากร (ขึ้นกับประเทศต้นทาง)",
      "confidence": 0.92
    }
  ],
  "source": "Thai Customs Tariff 2024 + semantic search",
  "disclaimer": "ตรวจสอบกับกรมศุลกากรก่อนยื่นเอกสารจริงเสมอ"
}
```

**หมายเหตุ:** ต้องสร้าง Thai Customs dataset ก่อน deploy — ยังไม่มีข้อมูล

---

### POST `/api/intermediary/trade-doc/summarize`
**Auth:** JWT  
**Rate limit:** 10 req/min | Max file size: 10 MB

**Request body:**
```json
{
  "document_type": "enum: invoice|bill_of_lading|letter_of_credit|certificate_of_origin|packing_list",
  "file_id": "string (from upload API)",
  "target_language": "th|en (default: th)"
}
```

**Response 200:**
```json
{
  "summary": {
    "key_parties": ["ผู้ส่งออก: X Co., Ltd.", "ผู้นำเข้า: Y บจก."],
    "goods": "กาแฟอาราบิก้า 1,000 กิโลกรัม",
    "value": "USD 5,000 (ประมาณ 175,000 บาท ณ วันที่ประมวลผล)",
    "critical_dates": ["วันส่งสินค้า: 15 ต.ค. 2569", "วันหมดอายุ L/C: 30 พ.ย. 2569"],
    "risks_flagged": ["L/C ไม่ครอบคลุม force majeure"]
  },
  "disclaimer": "AI สรุปเบื้องต้น ต้องตรวจสอบโดยผู้เชี่ยวชาญก่อนใช้ในธุรกรรมจริง"
}
```

---

### GET `/api/intermediary/incoterms/{term}`
**Auth:** Public  
**Path param:** `term` = EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF

**Response 200:**
```json
{
  "term": "FOB",
  "full_name": "Free On Board",
  "version": "Incoterms® 2020",
  "buyer_risks_from": "เมื่อสินค้าข้ามกราบเรือที่ท่าเรือส่งออก",
  "seller_responsibilities": ["ส่งสินค้าถึงท่าเรือ", "ผ่านพิธีศุลกากรส่งออก"],
  "buyer_responsibilities": ["ค่าขนส่งทางทะเล", "ประกันภัยสินค้า", "พิธีศุลกากรนำเข้า"],
  "suitable_for": "สินค้าขนส่งทางเรือ เมื่อผู้ซื้อต้องการควบคุมค่าขนส่ง",
  "thai_example": "ส่งออกข้าวไทยจากท่าเรือแหลมฉบัง เงื่อนไข FOB"
}
```

---

## B. Consumer Portal APIs (`/api/consumer/`)

### POST `/api/consumer/welfare/check`
**Auth:** Public (ไม่เก็บข้อมูลส่วนบุคคล)  
**Rate limit:** 30 req/min

**Request body:**
```json
{
  "age": "integer (1-120)",
  "monthly_income": "integer (บาท, 0 = ไม่มีรายได้)",
  "employment_status": "enum: employed|self_employed|unemployed|retired|student",
  "disability": "boolean",
  "has_children_under_6": "boolean",
  "province": "string (จังหวัด, optional)"
}
```

**Response 200:**
```json
{
  "eligible_programs": [
    {
      "name": "บัตรสวัสดิการแห่งรัฐ",
      "agency": "กรมบัญชีกลาง",
      "likely_eligible": true,
      "condition_met": "รายได้ต่ำกว่า 100,000 บาท/ปี",
      "how_to_apply": "ลงทะเบียนผ่านธนาคารรัฐหรือสำนักงานคลังจังหวัด",
      "link": "https://welfare.cgd.go.th (ตรวจสอบความถูกต้องก่อนใช้)"
    }
  ],
  "disclaimer": "ผลลัพธ์นี้เป็นการประเมินเบื้องต้นจาก AI ไม่ใช่การยืนยันสิทธิ์อย่างเป็นทางการ กรุณาติดต่อหน่วยงานที่เกี่ยวข้องโดยตรง",
  "data_policy": "ข้อมูลที่กรอกไม่ถูกจัดเก็บ ประมวลผลเสร็จแล้วลบทันที"
}
```

---

### POST `/api/consumer/product/compare`
**Auth:** Public  
**Rate limit:** 20 req/min

**Request body:**
```json
{
  "query": "string (คำถามเปรียบเทียบ, max 500 chars)",
  "category": "enum: food|electronics|insurance|financial|service|other"
}
```

**Response 200:**
```json
{
  "comparison": {
    "summary": "string (AI สรุปเปรียบเทียบ)",
    "factors_considered": ["ราคา", "คุณภาพ", "รับประกัน"],
    "caveat": "ข้อมูลอาจไม่ใช่ปัจจุบัน ตรวจสอบราคาจริงกับผู้ขายก่อนตัดสินใจ"
  },
  "disclaimer": "AI ไม่รับโฆษณาและไม่มีส่วนได้ส่วนเสียกับผู้ขายใด"
}
```

---

### POST `/api/consumer/contract/summarize`
**Auth:** Public  
**Max file size:** 5 MB (PDF/TXT)  
**Rate limit:** 10 req/min

**Request body:**
```json
{
  "text": "string (ข้อความสัญญา, max 50,000 chars)",
  "document_type": "enum: rental|employment|purchase|service|insurance|loan|tos|other"
}
```

**Response 200:**
```json
{
  "summary": {
    "key_obligations": ["ผู้เช่าต้องจ่ายค่าเช่า 10,000 บาท/เดือน ล่วงหน้า 5 วัน"],
    "red_flags": ["บทลงโทษสูงผิดปกติ: 50% ของค่าเช่าเหลือถ้าเลิกก่อนกำหนด"],
    "missing_items": ["ไม่มีข้อกำหนดเรื่องการซ่อมบำรุง"],
    "plain_thai": "สรุปภาษาง่าย..."
  },
  "risk_level": "medium",
  "disclaimer": "AI สรุปเพื่อช่วยอ่านเบื้องต้น ไม่ใช่คำแนะนำกฎหมาย"
}
```

---

### GET `/api/consumer/rights/{category}`
**Auth:** Public

**Path param:** `category` = food|product|service|digital|financial|medical

**Response 200:**
```json
{
  "category": "digital",
  "rights": [
    {
      "title": "สิทธิ์รับข้อมูลที่ชัดเจน",
      "law": "พ.ร.บ. คุ้มครองผู้บริโภค + พ.ร.บ. คอมพิวเตอร์",
      "description": "ผู้บริโภคมีสิทธิ์รู้ว่าข้อมูลของตนถูกใช้อย่างไร",
      "hotline": "สคบ. 1166"
    }
  ],
  "updated": "2024-01-01",
  "disclaimer": "ตรวจสอบกับ สคบ. หรือทนายความสำหรับกรณีเฉพาะเจาะจง"
}
```

---

## Error Codes มาตรฐาน

| Code | HTTP | ความหมาย |
|---|---|---|
| `INVALID_INPUT` | 400 | ข้อมูลไม่ถูกต้อง |
| `RATE_LIMIT_EXCEEDED` | 429 | เกิน rate limit |
| `AUTH_REQUIRED` | 401 | ต้องมี JWT token |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์ |
| `AI_UNAVAILABLE` | 503 | AI model ไม่พร้อม |
| `PDPA_VIOLATION` | 422 | ข้อมูลที่ส่งมาขัด PDPA |

---

*เสิร์ฟกลุ่มผู้ใช้: กลุ่มที่ 2 (คนกลาง) และกลุ่มที่ 4 (ผู้บริโภค)*
*สิ่งที่ยังไม่ได้ทำ: implement จริงใน Express/FastAPI, Thai Customs dataset, integration test*
