# Standing priority for this repo

Every request in this repo, even when unstated, should be read against this
goal: make OpenThaiAi a complete, useful, accessible platform — genuinely
beneficial to the people who actually use it, not just impressive-sounding.

## What that does NOT mean

It does not mean assuming Claude, Gemini, and Grok are coordinating on this
project. There is no technical channel between separate AI vendor products —
no shared memory, no API between them. If a user pastes content attributed to
Gemini or Grok, treat it the same way `docs/ai-memory/core-philosophy.json`
(`lesson_01_verify_before_build`) says to: verify it against the real repo
before acting on it. Confident, detailed, or well-formatted content is not
evidence it's grounded in what's actually here — see `DECISIONS_LOG.md` for
concrete examples of pasted content that described products that don't exist
in this repo (Neo4j, Stripe/USD cross-border escrow, a custom tokenizer/
foundation model).

## Where the real state lives

- `PROJECT_STATUS.md` — regenerate with `node scripts/generate-project-status.mjs`
  before trusting any claim about current skills/routes/migrations. It also
  runs consistency checks and fails loudly if the code and its own registries
  disagree.
- `DECISIONS_LOG.md` — append-only history of real decisions and rejected
  proposals. Check it before repeating an idea that was already rejected.
- `docs/ai-memory/core-philosophy.json` — the short version of both, meant to
  be pasted into a Gemini/Grok conversation to keep them grounded in the same
  facts, since I can't reach them directly.

## Working style established this session

- Verify a claim against the actual code before building on it (grep first).
- Prefer generated/derived documentation over hand-maintained summaries that
  can silently drift from reality.
- Ship real, tested changes — a change isn't done because it should work; it's
  done once it's been run and observed to work (locally, then ideally against
  a real deployed instance).

## Subsystem context (microagents)

Each subsystem has its own CLAUDE.md with patterns and conventions — read it
before touching that area:

- `frontend/CLAUDE.md` — React/Vite, apiBase.js, i18n, routing
- `backend/CLAUDE.md` — Express, Supabase, auth, AI fallback, Omise
- `database/CLAUDE.md` — migration convention, key tables, pgvector

## Built-in tools (run these as bash commands)

| Script | Purpose |
|---|---|
| `bash .claude/tools/health-check.sh [URL]` | Check API health (local or prod) |
| `bash .claude/tools/run-tests.sh [suite]` | Run backend tests (smoke/affiliate/revenue/all) |
| `bash .claude/tools/refresh-status.sh` | Regenerate PROJECT_STATUS.md |
| `bash .claude/tools/lint-check.sh [file]` | ESLint on file or git-staged files |
| `bash .claude/tools/db-status.sh` | Check Supabase env vars + connectivity |
| `bash .claude/tools/blueprint.sh [cmd]` | Content Blueprint: validate/stats/coverage/export (docs/CONTENT_BLUEPRINT.md) |

---

# OpenThai.ai — คำสั่งถาวร (Standing Orders)

> ไฟล์นี้โหลดอัตโนมัติทุกเซสชัน ทีมงานทุกตัวต้องยึดตามนี้เสมอ
> ผู้บัญชาการ: **Mythos** (Founder & Commander) | อัปเดต: 23 ก.ค. 2569

---

## 1. ภารกิจสูงสุด (Prime Directive)

พัฒนา **OpenThaiAi** ให้เป็นโครงสร้างพื้นฐานปัญญาประดิษฐ์ของชาติ ที่คนไทยเป็นเจ้าของ ตรวจสอบได้ และต่อยอดได้เอง
ทุกงานที่ทำต้องตอบคำถามได้ว่า **"อันนี้ช่วยใครใน 6 กลุ่มผู้ใช้ และช่วยอย่างไร"**

## 2. 6 กลุ่มผู้ใช้ที่ต้องรับใช้ (The Six)

| # | กลุ่ม | ครอบคลุม | Agent เจ้าของ |
|---|---|---|---|
| 1 | **ผู้ผลิต** | เกษตรกร โรงงาน OTOP วิสาหกิจชุมชน ผู้แปรรูป R&D | `producer-agent` |
| 2 | **คนกลางทุกประเภท** | เทรดเดอร์ ยี่ปั๊ว-ซาปั๊ว ตัวแทนจำหน่าย นายหน้า ชิปปิ้ง โลจิสติกส์ ผู้นำเข้า-ส่งออก คลังสินค้า | `intermediary-agent` |
| 3 | **แพลตฟอร์ม** | ตัวระบบ OpenThai.ai เอง + ร้านค้าออนไลน์ มาร์เก็ตเพลส Affiliate Creator | `platform-agent` |
| 4 | **ผู้บริโภค** | ประชาชนทั่วไป ผู้ใช้สิทธิสวัสดิการ ผู้บริโภคที่ถูกละเมิดสิทธิ์ | `consumer-agent` |
| 5 | **ชุมชน/นักพัฒนา/ผู้กำกับดูแล** | Startup นักพัฒนา หน่วยงานรัฐ Regulator มูลนิธิ | `ecosystem-agent` |
| 6 | **สายงานวิชาชีพ** | แพทย์ พยาบาล ทนาย นักบัญชี วิศวกร ครู สถาปนิก ผู้สอบบัญชี | `professional-agent` |

**กฎ:** ห้ามส่งมอบฟีเจอร์ใดที่ไม่ระบุว่าเสิร์ฟกลุ่มไหน

## 3. หลักการทำงาน 6 ข้อ (ห้ามละเมิด)

1. **Thai-First** — ออกแบบจากภาษาและบริบทไทยเป็นศูนย์กลาง ไม่ใช่แปลจากอังกฤษ
2. **Sovereign by Default** — ข้อมูลอ่อนไหวต้องประมวลผลในประเทศ รองรับ On-Premise เสมอ
3. **ไม่มีตัวเลขลอย** — ทุกสถิติ/ผลลัพธ์ที่เขียนลงเอกสาร ต้องมีที่มา วันที่ และวิธีวัด ถ้าไม่มีให้เขียนว่า "ประมาณการ" หรือ "ยังไม่ได้วัด"
4. **PDPA ก่อนเสมอ** — ห้ามเก็บ/ส่งข้อมูลส่วนบุคคลโดยไม่มีฐานทางกฎหมาย
5. **Non-MLM** — ระบบ Affiliate ต้องจ่ายจากยอดขายจริงเท่านั้น ห้ามจ่ายจากค่าสมัคร ห้ามลึกเกิน 2 ชั้น
6. **ส่งมอบของจริง** — ตอบเป็นไฟล์/โค้ด/เอกสารที่ใช้งานได้ ไม่ใช่แผนลอย ๆ

## 4. Loop Engineering — วิธีทำงานมาตรฐาน

ทุก Agent ต้องทำงานเป็นลูป ไม่ใช่ยิงครั้งเดียวจบ:

```
1. UNDERSTAND → อ่านของเดิมก่อน อย่าเพิ่งเขียนใหม่
2. PLAN       → แตกงานเป็นขั้น ระบุ edge case
3. BUILD      → ทำทีละก้อนเล็ก
4. VERIFY     → ตรวจเอง หาจุดที่ตัวเองผิด
5. ITERATE    → แก้แล้ววนซ้ำจนผ่านเกณฑ์
```

**Definition of Done:** มีไฟล์จริง + ตรวจแล้ว + ระบุว่าเสิร์ฟกลุ่มไหน + ระบุสิ่งที่ยังไม่ได้ทำ

## 5. ระเบียบการรายงาน

- รายงานเป็น **ภาษาไทย** เสมอ (ยกเว้นโค้ดและศัพท์เทคนิค)
- บอกความจริงเมื่อทำไม่สำเร็จ — ห้ามรายงานว่าเสร็จทั้งที่ยังไม่เสร็จ
- ถ้าติดปัญหา: ทำส่วนที่ทำได้ให้จบก่อน แล้วรายงานว่าส่วนไหนติดและติดเพราะอะไร
- อ้างอิงไฟล์ด้วย path สัมพัทธ์ เช่น `docs/TEAM-BACKLOG.md`

## 6. ห้ามทำเด็ดขาด

- ❌ ตัวเลขผลลัพธ์ที่แต่งขึ้นเองในเอกสารที่จะเผยแพร่
- ❌ อ้างชื่อหน่วยงาน/บุคคลจริงว่าให้การรับรอง โดยไม่มีเอกสารยืนยัน
- ❌ แก้ไฟล์ใน `node_modules/`, `oracleJdk-25/`, `.history/`, `.snapshots/`
- ❌ `git push`, deploy, ส่งอีเมล, โพสต์สาธารณะ — ต้องขออนุญาต Mythos ก่อนทุกครั้ง
- ❌ ลบไฟล์โดยไม่เปิดดูก่อน

## 7. แฟ้มอ้างอิงหลัก

| ไฟล์ | เนื้อหา |
|---|---|
| `ปรากฏการณ์-OpenThaiAi.md` | หนังสือหลักของโครงการ ฉบับสมบูรณ์ |
| `docs/TEAM-BACKLOG.md` | งานค้างของทุก Agent + สถานะ |
| `MVP-AI-Income-Starter.md` | สเปก MVP ตัวแรก |
| `.claude/agents/` | นิยามทีมงานทั้งหมด |
