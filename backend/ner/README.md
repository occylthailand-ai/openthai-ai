# Thai Commercial NER Service

สกัด **จำนวนสินค้า (QTY)**, **หน่วยนับ (UNIT)**, **งบประมาณ (BUDGET)** จากข้อความภาษาไทยที่รับมาจาก LINE OA / Facebook webhook

---

## โครงสร้าง

```
ner/
├── ner_service.py          ← FastAPI inference service
├── Dockerfile              ← container image
├── dataset/
│   ├── label_schema.json   ← BIO label definitions
│   └── samples.json        ← annotated training samples
└── train/
    └── train_ner.py        ← fine-tune WangchanBERTa script
```

---

## รัน Service ในเครื่อง

```bash
cd backend/ner

# Mock mode (ไม่ต้องโหลดโมเดล)
uvicorn ner_service:app --port 8080

# Real mode (ต้องมีโมเดลที่ fine-tune แล้ว)
NER_MODEL_PATH=./train/openthaiai-ner-wangchanberta \
  uvicorn ner_service:app --port 8080
```

ทดสอบ:
```bash
curl -X POST http://localhost:8080/v1/ner/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"ต้องการบาล์มสมุนไพร 50 กระปุก งบรวม 2,000 บาท"}'
```

---

## Fine-Tune โมเดล

```bash
# ติดตั้ง dependencies
pip install transformers datasets seqeval torch accelerate

# รัน training
cd backend/ner/train
python train_ner.py \
  --data_path ../dataset/samples.json \
  --output_dir ./openthaiai-ner-wangchanberta \
  --epochs 3 \
  --batch_size 8
```

> **หมายเหตุ**: `samples.json` มีเพียง 10 ตัวอย่าง สำหรับ production ควรมีอย่างน้อย 2,000 ประโยค annotated  
> เครื่องมือ annotation ที่แนะนำ: [Label Studio](https://labelstud.io/) หรือ [Doccano](https://github.com/doccano/doccano)

---

## Label Schema

| ID | Label    | ความหมาย                                    |
|----|----------|---------------------------------------------|
| 0  | O        | ไม่ใช่ entity                                |
| 1  | B-QTY    | เริ่มต้นจำนวน (50, ร้อย, สองพัน)             |
| 2  | I-QTY    | ต่อเนื่องจำนวน                               |
| 3  | B-UNIT   | เริ่มต้นหน่วยนับ (กระปุก, ชิ้น, กล่อง)       |
| 4  | I-UNIT   | ต่อเนื่องหน่วยนับ                             |
| 5  | B-BUDGET | เริ่มต้นงบ/ราคา (2,000, สี่พัน)              |
| 6  | I-BUDGET | ต่อเนื่องงบ (บาท, THB ที่ตามหลังตัวเลข)       |

---

## Prometheus Metrics

| Metric | ประเภท | ความหมาย |
|--------|--------|----------|
| `openthaiai_ner_requests_total{status}` | Counter | จำนวน request (success/error) |
| `openthaiai_ner_duration_seconds` | Histogram | Inference latency |
| `openthaiai_ner_model_loaded` | Gauge | 1=transformer, 0=mock |
