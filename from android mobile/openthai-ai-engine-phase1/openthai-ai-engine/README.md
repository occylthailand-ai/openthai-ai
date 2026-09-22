# OpenThai.ai AI Engine | เครื่องมือ AI OpenThai.ai
## Phase 1: Foundation Setup | ระยะที่ 1: การติดตั้งฐานราก

**Project Start Date:** May 21, 2026  
**CEO:** Mythos (mythos@openthai.ai)  
**Owner:** นาย ซื่อใจ แซ่หย่าง (MR. ZUEJAI SAEYANG / 杨世再)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 Vision | วิสัยทัศน์

Build the **smartest AI engine for Thai/Chinese commerce** that learns from every interaction.

สร้าง**เครื่องมือ AI ที่ฉลาดที่สุดสำหรับการค้าไทย/จีน**ที่เรียนรู้จากทุก interaction

## 📋 Architecture | สถาปัตยกรรม

```
┌─────────────────────────────────────────────┐
│         OpenThai.ai AI Engine               │
├─────────────────────────────────────────────┤
│                                             │
│  Intelligence Layer (Proprietary IP)        │
│  ↕                                          │
│  Knowledge Layer (RAG - Vector DB)          │
│  ↕                                          │
│  Data Layer (MCP Servers)                   │
│  ↕                                          │
│  AI Layer (Claude API)                      │
│                                             │
└─────────────────────────────────────────────┘
```

## 📂 Project Structure | โครงสร้างโปรเจกต์

```
openthai-ai-engine/
├── backend/                    # Backend services | บริการ backend
│   ├── rag-service/           # RAG implementation | RAG
│   ├── mcp-servers/           # Custom MCP servers | MCP servers
│   ├── business-logic/        # Business rules | กฎธุรกิจ
│   └── api-gateway/           # API gateway | Gateway
│
├── database/                   # Database schemas | โครงสร้างฐานข้อมูล
│   ├── vector-db/             # Vector database setup
│   ├── postgres/              # PostgreSQL
│   └── migrations/            # Database migrations
│
├── frontend/                   # Frontend dashboard | Dashboard
│   ├── admin-dashboard/       # Admin interface
│   └── analytics/             # Analytics UI
│
├── infrastructure/             # Infrastructure as code
│   ├── docker/                # Docker configs
│   ├── kubernetes/            # K8s configs
│   └── terraform/             # Cloud infrastructure
│
├── docs/                       # Documentation | เอกสาร
│   ├── technical/             # Technical specs
│   ├── api/                   # API documentation
│   └── bilingual/             # Thai/English docs
│
└── tests/                      # Testing | การทดสอบ
    ├── unit/
    ├── integration/
    └── performance/
```

## 🚀 Quick Start | เริ่มต้นอย่างรวดเร็ว

See detailed setup in each service directory.  
ดูรายละเอียดการติดตั้งในแต่ละโฟลเดอร์

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📅 Timeline | กำหนดเวลา

- **Week 1-2:** Vector DB + Data Pipeline  
- **Week 3-4:** RAG Service + Claude Integration  
- **Week 5-6:** MCP Servers  
- **Week 7-8:** Testing + Optimization  

## 💰 Budget Approved | งบประมาณที่อนุมัติ

- Initial: 400,000 THB (~$11,300 USD)
- Monthly: 80,000 THB (~$2,250 USD)

## 👥 Team | ทีม

- 2 Backend Developers
- 1 AI Engineer
- CEO Mythos (Product Vision)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Started:** May 21, 2026  
**Status:** ✅ Phase 1 - Active | ระยะที่ 1 - กำลังดำเนินการ
