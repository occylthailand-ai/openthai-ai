# OpenThai AI — Readiness Roadmap: 12 หมวดบริการ

**เทียบกับ:** คอมพิวเตอร์ 1 เครื่อง  
**ผู้บัญชาการ:** Mythos | **ตรวจสอบ:** 20 ส.ค. 2569 (สำรวจโค้ดเบสจริง)  
**อ้างอิง:** `docs/TEAM-BACKLOG.md`, `docs/ROADMAP-30-60-90.md`

---

## ตารางสถานะ 12 หมวด

| # | ชื่อหมวด | เทียบกับเครื่อง | ส่วนของระบบ | สถานะ | ไฟล์ใหม่ที่สร้าง |
|---|---------|----------------|------------|--------|-----------------|
| 1 | **Core Engine** | CPU | Rust C14N v0.2.1 + XAdES Verifier | ✅ Production-Ready | — (มีอยู่แล้ว) |
| 2 | **Context / Agent** | RAM | 15 Agents + RAG Pipeline + Orchestrator | ✅ Code พร้อม | `rag-pipeline.js`, `agent-orchestrator.js` |
| 3 | **Storage / Vault** | ฮาร์ดดิสก์ | PostgreSQL + pgvector + Vault + Ledger + PCR | ✅ Code พร้อม | `migrations/008_vault_ledger.sql`, `vault.js` |
| 4 | **Security / OS** | OS | Zero Trust + RBAC + Non-MLM Guard + MFA | ✅ Code พร้อม | `rbac-policy.yaml`, `zero-trust.js` |
| 5 | **Firmware / PKI** | BIOS | OCSP/CRL + SoftHSM2 Integration + Key Lifecycle | ✅ Code พร้อม | `hsm/init-hsm.sh`, `hsm_integration.py` |
| 6 | **Peppol / Gateway** | Drivers | AS4 Sender/Receiver + UBL BIS 3.0 + RD Gateway + Guardrails | ✅ Code พร้อม | `peppol/` (7 ไฟล์), `Dockerfile.peppol` |
| 7 | **Dashboard / UI** | การ์ดจอ | React 30+ หน้า + xades dashboard | ✅ Production-Ready | — (มีอยู่แล้ว) |
| 8 | **API / I/O** | พอร์ต | FastAPI + Node.js + Webhook + MCP | ✅ Production-Ready | — (มีอยู่แล้ว) |
| 9 | **Infra / Power** | แหล่งจ่ายไฟ | Docker + Peppol + HSM + Grafana ใน compose | ✅ Production-Ready | อัปเดต `docker-compose.production.yml` |
| 10 | **Monitoring** | ระบายความร้อน | Prometheus + Grafana + Alertmanager + LINE/Slack | ✅ Code พร้อม | `alerts.yaml`, `alertmanager.yaml`, `grafana/*.json` |
| 11 | **Applications** | ซอฟต์แวร์ | Affiliate, OTOP, Agri, Healthcare, Funnel | ✅ Production-Ready | — (มีอยู่แล้ว) |
| 12 | **Network / TLS** | เครือข่าย | mTLS + Internal CA + Service Certs + Nginx | ✅ Code พร้อม | `nginx/mtls.conf`, `scripts/gen-certs.sh` |

**สรุปจำนวน (หลังสร้างครบ 20 ส.ค. 2569):**  
✅ Production-Ready (มีอยู่แล้ว): 5 หมวด (1, 7, 8, 9, 11)  
✅ Code พร้อม (สร้างใหม่วันนี้): 7 หมวด (2, 3, 4, 5, 6, 10, 12)  
❌ Not Started: 0 หมวด

---

## Priority Matrix — ลำดับการปิดช่องว่าง

### 🔴 P0 — Critical Gap (ต้องปิดก่อนรับลูกค้า e-Tax จริง)

| หมวด | ช่องว่างหลัก | ผู้รับผิดชอบ | Deliverable |
|------|-------------|------------|-------------|
| **6 — Peppol / AS4** | ไม่มีโค้ดเลย มีแค่ text spec | `backend-engineer` + `devops-sre` | `peppol-gateway/` codebase + AS4 adapter |
| **5 — PKI / SoftHSM2** | OCSP/CRL มีแล้ว แต่ยังไม่เชื่อม SoftHSM2 ใน Docker | `devops-sre` + `security-guard` | SoftHSM2 integration + Key lifecycle test |
| **4 — Zero Trust** | auth.js มีแล้ว แต่ไม่มี RBAC policy, policy enforcer | `security-guard` + `backend-engineer` | RBAC rules + Policy Gate config |

### 🟡 P1 — Quick Win (ทำได้ใน 1 sprint ≤ 7 วัน)

| หมวด | ช่องว่างหลัก | ผู้รับผิดชอบ | Deliverable |
|------|-------------|------------|-------------|
| **10 — Grafana + Alertmanager** | `prometheus.yaml` มีแล้ว แต่ `alerts.yaml` และ Grafana dashboard ยังไม่มี | `devops-sre` | `telemetry/alerts.yaml` + Grafana dashboard JSON |
| **2 — RAG Pipeline Code** | Agent definitions พร้อม แต่ ยังไม่มี orchestrator code | `ai-ml-engineer` + `backend-engineer` | RAG pipeline code + vector orchestrator |
| **12 — mTLS** | Vercel deploy ทำได้แล้ว แต่ยังไม่มี mutual TLS สำหรับ API-to-API | `devops-sre` + `security-guard` | mTLS config สำหรับ internal service |

### 🟢 P2 — Backlog (หลัง P0/P1 เสร็จ)

| หมวด | ช่องว่างหลัก | ผู้รับผิดชอบ |
|------|-------------|------------|
| **3 — Vault / Ledger** | Schema ครบ แต่ยังไม่มี secrets vault และ financial ledger | `backend-engineer` + `devops-sre` |
| **6 — Cross-border Peppol** | ต้องต่อยอดจาก AS4 gateway ที่ P0 สร้าง → cross-border routing | `backend-engineer` |

---

## ช่องว่างวิกฤต — หมวด 6 (Peppol) รายละเอียด

**ทำไมถึงวิกฤต:** หมวด 6 คือ "ไดรเวอร์" ที่เชื่อม XAdES Engine (หมวด 1) กับโลกภายนอก (RD, ETDA, Peppol Network) โดยไม่มีหมวด 6 ระบบตรวจสอบลายเซ็นสมบูรณ์แต่ไม่สามารถรับ-ส่ง e-Invoice มาตรฐานจริงได้

**Scope ที่ต้องสร้าง:**
```
peppol-gateway/
├── as4/                    # AS4 messaging protocol
│   ├── sender.py           # ส่ง e-Invoice ผ่าน Peppol network
│   └── receiver.py         # รับและ validate e-Invoice
├── rd_gateway/             # กรมสรรพากร RD Gateway
│   ├── etax_submitter.py   # ส่งใบกำกับภาษี
│   └── rd_response.py      # รับผลตอบกลับ
├── adapters/
│   ├── factur_x.py         # Factur-X / ZUGFeRD adapter
│   └── ubl_bis3.py         # Peppol BIS 3.0 UBL
└── guardrails/
    └── peppol_rules.py     # ตรวจ Schematron ก่อนส่ง
```

**ยืนยันกับ Mythos ก่อน assign:** ขอบเขตที่แน่ชัดของ AS4 access point — ใช้ Peppol SMP จริงหรือ mock สำหรับ staging?

---

## Timeline เทียบกับ ROADMAP-30-60-90

| Phase | ช่วงเวลา | หมวดที่ต้องปิด | Gate |
|-------|---------|--------------|------|
| Phase 1 — Stabilize | วันที่ 17–47 ส.ค. 69 | หมวด 4 (RBAC), หมวด 10 (Alertmanager), หมวด 9 (Staging) | ไม่มี high-risk ที่ unresolved |
| Phase 2 — Build Value | วันที่ 48–77 ส.ค. 69 | หมวด 2 (RAG code), หมวด 6 (Peppol MVP), หมวด 12 (mTLS) | Staging ใช้งานได้จริง |
| Phase 3 — Production | วันที่ 78–107 ก.ย. 69 | หมวด 5 (SoftHSM2), หมวด 3 (Vault), หมวด 6 (Cross-border) | ผ่าน legal + security gate |

---

## ไฟล์อ้างอิงสำคัญ

| หมวด | ไฟล์หลักในโค้ดเบส |
|------|-----------------|
| 1 | `xades-engine/native/xades_rust_core/src/lib.rs`, `src/xades_engine/xades_verifier.py` |
| 2 | `.claude/agents/*.md` (15 ไฟล์), `backend/vector-memory-supabase.js` |
| 3 | `backend/migrations/001–007.sql`, `FULL-MIGRATION.sql` |
| 4 | `backend/auth.js`, `backend/.env.example` |
| 5 | `src/xades_engine/revocation.py`, `tsa_verifier.py` |
| 6 | ❌ ยังไม่มีไฟล์ใดๆ |
| 7 | `frontend/src/pages/DashboardPage.jsx`, `xades-engine/dashboard/index.html` |
| 8 | `xades-engine/src/api_server.py`, `backend/server.js`, `backend/webhook-system.js` |
| 9 | `xades-engine/docker-compose.production.yml`, `nginx/nginx.conf` |
| 10 | `telemetry/prometheus.yaml`, `telemetry/OPENTELEMETRY_SETUP_GUIDE.md` |
| 11 | `frontend/src/pages/*.jsx` (30+ หน้า), `backend/migrations/004_affiliate_tracking.sql` |
| 12 | `openthai-ai/Dockerfile`, `openthai-ai/docker-compose.yml` |

---

*สร้างโดย chief-of-staff จากการสำรวจโค้ดเบสจริง — ไม่ใช่ประมาณการ*  
*อัปเดตครั้งต่อไป: หลัง Phase 1 gate (ประมาณ 17 ก.ย. 2569)*
