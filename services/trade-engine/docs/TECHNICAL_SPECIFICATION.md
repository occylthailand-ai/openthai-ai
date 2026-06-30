# OpenThai AI v14 — Trade Intelligence Engine · Technical Specification

> สถานะ: scaffold พร้อมพัฒนาต่อ (local-dev microservice แยกจาก production Node app)

## 1. Architecture Overview
- **Unified JSON Schema** (`app/schemas.py`) — normalize ข้อมูลจาก 6 แพลตฟอร์ม
  (TradeInt · Volza · Tendata · RocketReach · ImportGenius + manual) เข้าสู่ `TradeRecord` เดียว
- **Entity Resolution** (`app/ingestion/entity_resolution.py`) — รวมบริษัทเดียวกันที่สะกดต่างกัน
  ด้วย normalize + Jaccard + tax_id exact-match + country blocking (deterministic, ทดสอบได้)
- **Ingestion Pipeline** (`app/ingestion/v14_advanced_pipeline.py`) —
  normalize → resolve → (LLM clean ทางเลือก) → เขียน knowledge graph
- **Knowledge Graph** (`app/core/neo4j_client.py`) — โมเดล Company/Product/SHIPS/TRADES
  พร้อมคิวรีวิเคราะห์การกระจายสินค้าของคู่แข่ง
- **Vector DB** (`app/core/vector_client.py`) — Qdrant semantic search (lazy)
- **LLM Data-Cleaning** (`app/core/llm_client.py`) — Claude คลีนคำอธิบายสินค้า

## 2. Tech Stack
| Layer | Tech |
|-------|------|
| API | FastAPI + Uvicorn |
| Datastores | PostgreSQL · Neo4j · Qdrant · Redis (docker-compose) |
| LLM | Anthropic Claude (`claude-haiku-4-5-20251001` default) |
| Local Dev | Docker Compose |

## 3. Security
- **API-Key auth** — header `X-API-Key` (ตรวจใน `require_api_key`); ปิด auth อัตโนมัติเมื่อ dev ไม่ตั้งคีย์
- **Rate limiting** — sliding-window ต่อ IP (dev 10/min · prod 100/min)
- **Structured JSON logging** — ทุก request log เป็น JSON (level/logger/latency)
- **CORS** — prod จำกัดเฉพาะ `https://www.openthai-ai.com`
- PDPA/GDPR-aware: เก็บ payload ดิบไว้ field `raw` เพื่อ audit/ลบย้อนหลังได้

## 4. Key Endpoints
| Method | Path | Auth | คำอธิบาย |
|--------|------|------|----------|
| GET  | `/health` | ไม่ | health probe (ยกเว้น rate limit) |
| POST | `/api/v1/trade/ingest` | X-API-Key | รับ trade records → resolve → เขียนกราฟ |

## 5. Competitor Distribution Analytics (Cypher)
อยู่ใน `app/core/neo4j_client.py`:
- `COMPETITOR_DISTRIBUTORS` — ผู้รับสินค้า/distributor ของคู่แข่ง เรียงตามมูลค่า
- `COMPETITOR_COUNTRY_SHARE` — ส่วนแบ่งตลาดตามประเทศปลายทาง (% share)
- `SHARED_BUYERS` — ผู้ซื้อที่ทับซ้อนระหว่างเรากับคู่แข่ง (กลุ่มที่ต้องชิง)

## 6. Testing
```bash
cd services/trade-engine
pip install -r requirements.txt   # หรือแค่ pytest สำหรับเทสต์ entity resolution
pytest -q
```
Entity-resolution tests ครอบคลุม edge case: legal-suffix stripping, unicode full-width,
tax_id override, country blocking, empty-name handling, threshold tuning.

## 7. Deployment
- **Local / Sandbox**: `docker compose up -d` + `uvicorn app.main:app`
- **Production**: container platform (Railway / Fly.io) + managed Neo4j/Qdrant/Postgres
- หมายเหตุ: service นี้ **แยกจาก** production Vercel Node app (`backend/server.js`) โดยตั้งใจ
  และถูก exclude จาก Vercel build ผ่าน `.vercelignore`
