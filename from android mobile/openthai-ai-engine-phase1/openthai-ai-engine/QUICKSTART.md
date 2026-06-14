# 🚀 Quick Start Guide | คู่มือเริ่มต้นอย่างรวดเร็ว
## OpenThai.ai AI Engine - Phase 1 | เครื่องมือ AI OpenThai.ai - ระยะที่ 1

**Date:** May 21, 2026  
**Status:** ✅ Active Development | กำลังพัฒนา  
**CEO:** Mythos (mythos@openthai.ai)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📋 Table of Contents | สารบัญ

1. [Prerequisites | สิ่งที่ต้องมีก่อน](#prerequisites)
2. [Installation | การติดตั้ง](#installation)
3. [Configuration | การตั้งค่า](#configuration)
4. [Running the System | การรันระบบ](#running)
5. [Testing | การทดสอบ](#testing)
6. [Development Workflow | ขั้นตอนการพัฒนา](#workflow)
7. [Troubleshooting | แก้ไขปัญหา](#troubleshooting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Prerequisites | สิ่งที่ต้องมีก่อน

### Required | จำเป็น

- **Docker Desktop** 4.0+ [Download | ดาวน์โหลด](https://docker.com)
- **Python** 3.11+ [Download | ดาวน์โหลด](https://python.org)
- **Node.js** 20+ (for frontend) [Download | ดาวน์โหลด](https://nodejs.org)
- **Git** [Download | ดาวน์โหลด](https://git-scm.com)

### API Keys | คีย์ API

- **Anthropic API Key** - Get from [console.anthropic.com](https://console.anthropic.com)
  - Required for Claude API integration
  - ต้องใช้สำหรับเชื่อม Claude API

### Recommended | แนะนำ

- **VS Code** with Python and Docker extensions
  - VS Code พร้อม extension Python และ Docker
- **Postman** or **Thunder Client** for API testing
  - สำหรับทดสอบ API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Installation | การติดตั้ง

### Step 1: Clone Repository | ดาวน์โหลดโปรเจกต์

```bash
# Clone the project
git clone https://github.com/openthai-ai/ai-engine.git
cd ai-engine

# OR if using local development
# หรือถ้าใช้สำหรับพัฒนาในเครื่อง
cd /path/to/openthai-ai-engine
```

### Step 2: Environment Setup | ตั้งค่า Environment

```bash
# Copy environment template
# คัดลอก template สำหรับ environment
cp .env.example .env

# Edit .env file with your settings
# แก้ไขไฟล์ .env ตามการตั้งค่าของคุณ
nano .env  # or use your preferred editor
```

**Required Environment Variables | ตัวแปรที่จำเป็น:**

```bash
# .env file content

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI & API Keys | AI และ API Keys
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database | ฐานข้อมูล
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSTGRES_PASSWORD=openthai_secure_2026_change_me
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=openthai_ai
POSTGRES_USER=openthai_admin

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Vector Database (Qdrant) | ฐานข้อมูลเวกเตอร์
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QDRANT_HOST=localhost
QDRANT_PORT=6333

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Redis (Caching) | Redis (แคช)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDIS_HOST=localhost
REDIS_PORT=6379

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Application Settings | การตั้งค่าแอปพลิเคชัน
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# API Ports | พอร์ต API
RAG_SERVICE_PORT=8001
MCP_SERVICE_PORT=8002
API_GATEWAY_PORT=8000
```

### Step 3: Install Dependencies | ติดตั้ง Dependencies

#### Option A: Using Docker (Recommended) | ใช้ Docker (แนะนำ)

```bash
# Build and start all services
# สร้างและเริ่มบริการทั้งหมด
docker-compose up --build

# Run in background (detached mode)
# รันในพื้นหลัง
docker-compose up -d
```

#### Option B: Local Development | พัฒนาในเครื่อง

```bash
# Install Python dependencies
# ติดตั้ง dependencies สำหรับ Python
cd backend/rag-service
pip install -r requirements.txt

cd ../mcp-servers
pip install -r requirements.txt

# Start databases separately
# เริ่มฐานข้อมูลแยก
docker-compose up postgres qdrant redis -d
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Configuration | การตั้งค่า

### Database Schema Setup | ติดตั้ง Schema ฐานข้อมูล

```bash
# Initialize database
# เริ่มต้นฐานข้อมูล
docker-compose exec postgres psql -U openthai_admin -d openthai_ai -f /docker-entrypoint-initdb.d/init.sql

# Or run migrations
# หรือรัน migrations
python backend/database/run_migrations.py
```

### Vector Database Setup | ติดตั้งฐานข้อมูลเวกเตอร์

```bash
# Create collection in Qdrant
# สร้าง collection ใน Qdrant
python backend/rag-service/setup_vector_db.py

# This will create:
# สิ่งที่จะถูกสร้าง:
# - openthai-products (1536 dimensions)
# - openthai-transactions (1536 dimensions)
# - openthai-knowledge (1536 dimensions)
```

### Load Initial Data | โหลดข้อมูลเริ่มต้น

```bash
# Load sample products
# โหลดสินค้าตัวอย่าง
python backend/scripts/load_sample_data.py --products

# Load Thai/Chinese commerce patterns
# โหลดรูปแบบการค้าไทย/จีน
python backend/scripts/load_sample_data.py --patterns
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Running the System | การรันระบบ

### Start All Services | เริ่มบริการทั้งหมด

```bash
# Start everything
# เริ่มทุกอย่าง
docker-compose up

# Watch logs
# ดู logs
docker-compose logs -f

# Check service health
# ตรวจสอบสถานะบริการ
docker-compose ps
```

### Service URLs | URL บริการ

```
API Gateway:    http://localhost:8000
                Swagger Docs: http://localhost:8000/docs

RAG Service:    http://localhost:8001
                API Docs: http://localhost:8001/docs

MCP Server:     http://localhost:8002

PostgreSQL:     localhost:5432
Qdrant:         http://localhost:6333
Redis:          localhost:6379
```

### Test the System | ทดสอบระบบ

```bash
# Test RAG Service
# ทดสอบ RAG Service
curl http://localhost:8001/health

# Test query with context
# ทดสอบ query พร้อมบริบท
curl -X POST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "แนะนำสินค้าสำหรับตลาดจีน",
    "market": "chinese"
  }'

# Test MCP Server
# ทดสอบ MCP Server
curl http://localhost:8002/health

# Search products
# ค้นหาสินค้า
curl -X POST http://localhost:8002/search_products \
  -H "Content-Type: application/json" \
  -d '{
    "query": "platform",
    "market": "chinese"
  }'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Testing | การทดสอบ

### Unit Tests | ทดสอบหน่วยย่อย

```bash
# Run all tests
# รันการทดสอบทั้งหมด
pytest tests/

# Run specific test file
# รันไฟล์ทดสอบเฉพาะ
pytest tests/test_rag_engine.py

# With coverage
# พร้อมตรวจสอบ coverage
pytest --cov=backend tests/
```

### Integration Tests | ทดสอบการเชื่อมต่อ

```bash
# Test RAG + Claude API integration
# ทดสอบการเชื่อม RAG + Claude API
pytest tests/integration/test_rag_claude.py

# Test MCP Server integration
# ทดสอบการเชื่อม MCP Server
pytest tests/integration/test_mcp_integration.py
```

### Performance Tests | ทดสอบประสิทธิภาพ

```bash
# Load testing with locust
# ทดสอบ load ด้วย locust
locust -f tests/performance/load_test.py

# Open browser: http://localhost:8089
# เปิดเบราว์เซอร์: http://localhost:8089
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Development Workflow | ขั้นตอนการพัฒนา

### Daily Development | การพัฒนาประจำวัน

```bash
# 1. Pull latest changes
# ดึงการเปลี่ยนแปลงล่าสุด
git pull origin main

# 2. Create feature branch
# สร้าง branch สำหรับ feature ใหม่
git checkout -b feature/your-feature-name

# 3. Make changes & test
# แก้ไขและทดสอบ
# ... edit files ...
pytest tests/

# 4. Commit changes
# บันทึกการเปลี่ยนแปลง
git add .
git commit -m "Add: brief description"

# 5. Push & create PR
# Push และสร้าง Pull Request
git push origin feature/your-feature-name
```

### Code Quality | คุณภาพโค้ด

```bash
# Format code
# จัดรูปแบบโค้ด
black backend/
isort backend/

# Lint code
# ตรวจสอบโค้ด
pylint backend/
mypy backend/

# Pre-commit hooks (auto-run)
# ติดตั้ง pre-commit hooks (จะรันอัตโนมัติ)
pre-commit install
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Troubleshooting | แก้ไขปัญหา

### Common Issues | ปัญหาที่พบบ่อย

#### ❌ Docker containers won't start | คอนเทนเนอร์ Docker ไม่ขึ้น

```bash
# Check Docker daemon
# ตรวจสอบ Docker daemon
docker info

# Clean up and restart
# ทำความสะอาดและเริ่มใหม่
docker-compose down -v
docker-compose up --build
```

#### ❌ Database connection failed | เชื่อมต่อฐานข้อมูลไม่ได้

```bash
# Check if PostgreSQL is running
# ตรวจสอบว่า PostgreSQL ทำงานอยู่ไหม
docker-compose ps postgres

# View logs
# ดู logs
docker-compose logs postgres

# Test connection
# ทดสอบการเชื่อมต่อ
docker-compose exec postgres psql -U openthai_admin -d openthai_ai -c "SELECT 1;"
```

#### ❌ Qdrant vector search slow | ค้นหาเวกเตอร์ช้า

```bash
# Check Qdrant status
# ตรวจสอบสถานะ Qdrant
curl http://localhost:6333/collections

# Rebuild index
# สร้าง index ใหม่
python backend/rag-service/rebuild_index.py
```

#### ❌ Claude API errors | Claude API มีปัญหา

```bash
# Verify API key
# ตรวจสอบ API key
echo $ANTHROPIC_API_KEY

# Test API directly
# ทดสอบ API โดยตรง
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📞 Support | การสนับสนุน

**Technical Questions | คำถามทางเทคนิค:**
- Slack: #openthai-ai-dev
- Email: dev-team@openthai.ai

**Product Questions | คำถามเกี่ยวกับผลิตภัณฑ์:**
- CEO Mythos: mythos@openthai.ai

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📚 Next Steps | ขั้นตอนถัดไป

1. ✅ **Complete setup** following this guide
   ติดตั้งให้เสร็จตามคู่มือนี้

2. ✅ **Review architecture docs** in `/docs/technical/`
   ทบทวนเอกสารสถาปัตยกรรมใน `/docs/technical/`

3. ✅ **Run sample queries** in `/examples/`
   ลอง run ตัวอย่าง queries ใน `/examples/`

4. ✅ **Join team standup** (Daily 10:00 AM)
   เข้าร่วม standup ของทีม (ทุกวัน 10:00 น.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Last Updated:** May 21, 2026  
**Version:** 1.0.0  
**Status:** ✅ Active | ใช้งานได้
