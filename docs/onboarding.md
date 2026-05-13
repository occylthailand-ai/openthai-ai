# OpenThai AI — Developer Onboarding

## ระบบนี้คืออะไร?
เครื่องมือ AI สร้างคอนเทนต์ TikTok/Facebook สำหรับสินค้าไทย OTOP และ SME
- **Frontend**: React + Vite → deploy บน Vercel
- **Backend**: Node.js Express → Vercel Serverless Functions
- **AI**: Claude (primary) → Gemini (fallback) → Mock
- **DB**: Supabase (PostgreSQL + Auth)
- **Payment**: Manual (PromptPay) → Omise/Stripe (planned)

## เริ่มต้น local development

```bash
# 1. Clone
git clone https://github.com/occylthailand-ai/openthai-ai.git
cd openthai-ai

# 2. ตั้งค่า env
cp environments/dev.env.example backend/.env
# แก้ไขค่าใน backend/.env

# 3. ติดตั้ง dependencies
cd frontend && npm install && cd ..
cd backend  && npm install && cd ..

# 4. รัน
cd backend  && node server.js &    # port 8000
cd frontend && npm run dev          # port 3000
```

## โครงสร้างโปรเจกต์

```
openthai-ai/
├── frontend/          React App
│   ├── src/pages/     หน้าต่างๆ (LandingPage, PricingPage, etc.)
│   ├── src/components/  UI components
│   └── src/data/      Static data (payment methods, etc.)
├── backend/           Express API
│   ├── server.js      Main server + routes
│   ├── auth.js        JWT + password
│   ├── middleware/    auditLog, monitor
│   └── data/
│       ├── migrations/  SQL migration files
│       └── schema/      DB schema docs
├── security/          Security configs + policies
├── docs/              Documentation
│   ├── ADR/           Architecture Decisions
│   ├── runbooks/      Incident response
│   └── api-spec/      OpenAPI spec
├── .github/workflows/ CI/CD (GitHub Actions)
├── environments/      .env examples
└── docker-compose.yml Local dev stack
```

## URL สำคัญ
| สิ่งที่ | URL |
|--------|-----|
| Production | https://www.openthai-ai.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase | https://supabase.com/dashboard/project/tpeskbbhuuqztwyllnli |
| Health Check | https://www.openthai-ai.com/api/health |
| Admin Panel | https://www.openthai-ai.com/admin |

## Roles
| Role | คำอธิบาย |
|------|---------|
| free | 3 generate/วัน, TikTok+FB only |
| pro | ไม่จำกัด, ฿149/เดือน |
| business | ทีม 5 คน + API, ฿299/เดือน |
| admin | ทุกอย่าง |

## การ deploy
```bash
# Auto deploy ผ่าน GitHub Actions เมื่อ push main
git push origin main

# หรือ manual ผ่าน Vercel CLI
vercel --prod
```

## ถ้าระบบมีปัญหา
→ ดู `docs/runbooks/incident-response.md`
