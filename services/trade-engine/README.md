# OpenThai AI v14 — Trade Intelligence Engine

Microservice แยก (Python/FastAPI) สำหรับ ingest ข้อมูลการค้าจาก 6 แพลตฟอร์ม →
ทำ entity resolution → สร้าง knowledge graph (Neo4j) + vector search (Qdrant).

> ⚠️ service นี้เป็น **local-dev / sandbox** แยกจาก production app (Vercel Node ที่ `backend/`)
> และถูก exclude จาก Vercel build ผ่าน `.vercelignore` — ไม่กระทบ deploy ของเว็บหลัก

## โครงสร้าง
```
services/trade-engine/
├── app/
│   ├── main.py                      # FastAPI (auth + rate limit + JSON logging)
│   ├── schemas.py                   # Unified JSON Schema (6 แพลตฟอร์ม)
│   ├── core/
│   │   ├── config.py                # settings จาก env
│   │   ├── llm_client.py            # Claude data-cleaning (lazy)
│   │   ├── neo4j_client.py          # graph + Cypher analytics คู่แข่ง
│   │   └── vector_client.py         # Qdrant (lazy)
│   └── ingestion/
│       ├── entity_resolution.py     # อัลกอริทึม resolve (deterministic)
│       └── v14_advanced_pipeline.py # normalize → resolve → graph write
├── tests/test_entity_resolution.py  # unit tests (edge cases)
├── docker/{docker-compose.yml,.env.example}
├── docs/TECHNICAL_SPECIFICATION.md
├── requirements.txt
└── pytest.ini
```

## Quickstart (local)
```bash
cd services/trade-engine

# 1) datastores
cd docker && cp .env.example .env   # แก้รหัสผ่าน/คีย์ก่อน
docker compose up -d && cd ..

# 2) service
pip install -r requirements.txt
export $(grep -v '^#' docker/.env | xargs)   # โหลด env
uvicorn app.main:app --reload --port 8000

# 3) health
curl localhost:8000/health
```

## ทดสอบ entity resolution (ไม่ต้องมี DB)
```bash
pip install pytest pydantic
pytest -q
```

## ตัวอย่างเรียก ingest
```bash
curl -X POST localhost:8000/api/v1/trade/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: otai_v14_change_me" \
  -d '{
    "records": [{
      "source": "volza",
      "direction": "export",
      "shipper":   {"name": "Siam Trading Co., Ltd.", "country": "TH"},
      "consignee": {"name": "Acme Imports LLC", "country": "US"},
      "hs_code": "100630",
      "product_description": "THAI HOM MALI RICE 5% BROKEN",
      "value_usd": 48000
    }]
  }'
```
ถ้าไม่ตั้ง `NEO4J_PASSWORD` จะรันแบบ **dry-run** (resolve อย่างเดียว ไม่เขียนกราฟ).
