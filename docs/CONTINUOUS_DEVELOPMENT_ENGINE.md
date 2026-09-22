# Continuous Development Engine

เครื่องมือ control plane สำหรับรับ จัดลำดับ วางแผน ตรวจ และติดตาม improvement
proposal ของ OpenThaiAi อย่างต่อเนื่อง โดยตั้งค่าเริ่มต้นเป็น **dry-run** และไม่
push, merge, deploy, อ่าน secret หรืออนุมัติงานความเสี่ยงสูงเอง

> Canonical truth ไม่ได้มาจาก dashboard, report หรือ model output เครื่องมือนี้
> ยอมรับ canonical reference ใน critical path เฉพาะรายการ `BOUND` ที่มี source
> path, version, owner, SHA-256 และ human approval ครบ และ hash ตรงกับไฟล์จริง

## เริ่มต้น

ต้องใช้ Node.js 20 ขึ้นไป โดยไม่ต้องติดตั้ง dependency เพิ่ม:

```bash
# รัน sample แบบ dry-run; action จำลอง แต่ critic quality gates รันจริงแบบ read-only
npm run cde:sample

# ตรวจสถานะและความสมบูรณ์ของ audit chain
npm run cde -- status
npm run cde -- audit-verify

# รันทดสอบ guardrails
npm run test:cde
```

ไฟล์ runtime อยู่ใน `.openthai-cde/` และถูก ignore จาก Git โดยมี:

- `proposals/<stable-id>.json` — state + plan + results เพื่อ resume/idempotency
- `audit.jsonl` — append-only JSON Lines hash chain
- `locks/` — exclusive file locks ป้องกัน proposal/scheduler รันซ้อน

อย่าลบหรือแก้ runtime files ระหว่างงานที่กำลังดำเนิน หากต้อง archive ให้คัดลอก
ทั้ง directory พร้อม audit chain และจำกัดสิทธิ์ filesystem ให้เฉพาะ operator

## Intake และ stable ID

proposal ใช้ schema version 1 ตาม
`examples/continuous-development/proposal.sample.json`:

```bash
npm run cde -- intake examples/continuous-development/proposal.sample.json \
  --actor human:operator-name
```

engine ปฏิเสธ unknown fields, secret-like keys, metric นอกช่วง 0–5, action/quality
gate ที่ไม่อยู่ใน allowlist และ canonical reference ที่ยังไม่ bind จากนั้นสร้าง ID
แบบ content-addressed (`cdp-` + 20 hex จาก SHA-256 ของ normalized proposal)
จึงรับไฟล์เดิมซ้ำได้โดยไม่สร้างงานซ้ำ

คะแนน deterministic เต็ม 100:

```text
publicImpact*7 + evidenceQuality*4 + (5-risk)*4
  + (5-opportunityCost)*3 + (5-effort)*2
```

ทุก component ถูกเก็บใน state และแสดงใน `report`:

```bash
npm run cde -- report cdp-...
```

## State machine และบทบาท

```text
proposal -> validated -> planned -> executing -> reviewing
  -> awaiting_approval -> approved/rejected -> completed
                                \-> rolled_back
```

- **Planner** สร้าง steps, dependencies, owner, acceptance criteria และ canonical
  references แบบ deterministic
- **Worker** ใช้ actor `worker:*` ทำ action ที่ allowlist เท่านั้น
- **Critic** ใช้ actor คนละตัว `critic:*` รัน quality gates และเก็บ stdout,
  stderr, exit code, signal, timeout, duration โดยไม่กลืน error
- **Policy engine** อนุมัติ R0/R1 ได้หลัง critic ผ่าน; R2/R3 หยุดที่
  `awaiting_approval`
- Worker/Critic ไม่สามารถใช้ CLI approval เพราะ actor ต้องเป็น `human:<identity>`

## Approve, reject และ recovery

```bash
npm run cde -- approve cdp-... \
  --actor human:release-manager \
  --reason "ตรวจหลักฐานและผล quality gates แล้ว"

npm run cde -- reject cdp-... \
  --actor human:release-manager \
  --reason "acceptance criteria ยังไม่ครบ"
```

หาก process หยุดหลัง action เริ่มแต่ก่อนบันทึกผล ระบบไม่เดาว่าสำเร็จและไม่ retry
อัตโนมัติ แต่หยุดรอ human recovery:

```bash
# ใช้เมื่อยืนยันแล้วว่า action ยังไม่เกิดผลหรือทำซ้ำได้อย่างปลอดภัย
npm run cde -- recover cdp-... --decision retry \
  --actor human:operator --reason "ตรวจ external effect แล้ว ไม่พบผลข้างเคียง"

# ใช้เมื่อมนุษย์ตรวจยืนยันว่าผลเดิมสำเร็จแล้ว ให้ critic ตรวจต่อ
npm run cde -- recover cdp-... --decision accept-result \
  --actor human:operator --reason "ตรวจผลจริงและ idempotency key แล้ว"

# ใช้กับ dry-run/read-only ที่ยืนยัน rollback ได้
npm run cde -- recover cdp-... --decision rollback \
  --actor human:operator --reason "ยืนยันว่าไม่มีผลภายนอก"
```

live mutating action จะ mark `rolled_back` ได้ต่อเมื่อ compensation command ที่
กำหนดไว้สำเร็จ การรับรอง rollback ด้วยคำพูดถูกปิดกั้นสำหรับ mutation จริง
การ reject live mutation จะเรียก compensation เช่นกัน และคงสถานะรอมนุษย์หาก
compensation ล้มเหลว

## Continuous mode และการหยุด

```bash
# ประมวลผลหนึ่งรอบแล้วจบ เหมาะกับ cron/CI ที่ควบคุมโดยมนุษย์
npm run cde -- continuous --once

# ทำงานเป็นรอบ; หยุดอย่าง graceful ด้วย Ctrl+C หรือ SIGTERM
npm run cde -- continuous
```

scheduler ใช้ global lock ไม่รันซ้อน, รอ `intervalMs`, exponential backoff เมื่อ
proposal ล้มเหลว และจำกัดด้วย `maximumBackoffMs` จึงไม่มี busy loop การ restart
จะ resume จาก persisted state; outcome ที่ไม่แน่นอนจะหยุดรอ recovery

## Config และ quality gates

แก้ `config/continuous-development.json` ผ่าน code review:

- `execution.enabled` เริ่มเป็น `false`
- `execution.allowWorkspaceMutation` เริ่มเป็น `false`
- `actions` ต้องอ้างถึง command IDs ที่กำหนดไว้
- `allowedExecutables` เป็น allowlist; command ใช้ argv array และ `shell:false`
- `workspaceRoots` จำกัด working directory
- `timeoutMs`, `expectedExitCodes`, `maximumOutputBytes` บังคับใช้ทุก command
- quality gate ต้อง `readOnly: true`

repo นี้เตรียม gates สำหรับ engine syntax, `git diff --check`, backend typecheck,
frontend tests, backend smoke test และ hardcoded-secret scan แบบไม่พิมพ์ค่าลับ
แต่ proposal เลือกเฉพาะ gate ที่สัมพันธ์กับ scope เพื่อลดเวลาและยัง fail loudly
คำสั่ง shell, dynamic `node -e`, Git ที่เขียน state, npm install/publish/deploy
และเครื่องมือ remote/deployment ถูก hard-block แม้ใส่ใน allowlist

state transition และ action boundary ใช้ write-ahead audit: hash ของ audit record
ถูกเขียนก่อน state และ state อ้างกลับด้วย `auditHash` ดังนั้น process crash อาจ
เหลือ audit intent ที่ยังไม่ commit แต่จะไม่เกิด state advancement ที่ไร้หลักฐาน

การเปิด live execution ต้องผ่าน human code review ของ config และ command ก่อน:

1. เพิ่ม command ที่ใช้ executable + argv คงที่และกำหนด `readOnly` ถูกต้อง
2. เพิ่ม ID ใน `actions`
3. เปิด `execution.enabled`
4. หาก action เขียน workspace ให้เปิด `allowWorkspaceMutation` และกำหนด
   compensation command
5. เรียก `run <id> --live` โดย operator เท่านั้น

engine ไม่มี code สำหรับ push, merge หรือ deploy และไม่มี network credential ใน
environment ของ subprocess (ส่งผ่านเฉพาะ environment keys ที่ไม่ใช่ secret)

## Canonical source binding

เพิ่มรายการใน `config/canonical-specs-ledger.json` ด้วย workflow review:

1. ระบุ `sourcePath`, `sourceVersion`, `owner`
2. คำนวณ SHA-256 จากไฟล์จริง
3. บันทึก explicit approval actor/time/reason
4. เปลี่ยน `status` จาก `READY_FOR_SOURCE_BINDING` เป็น `BOUND`

รายการ `UNBOUND`, `PENDING`, `READY_FOR_SOURCE_BINDING`, hash ไม่ตรง หรือ approval
ไม่ครบจะทำให้ proposal หยุดที่ `proposal` และ exit non-zero ห้ามใช้ report/status
แทน source file

## Fault injection

ใช้เฉพาะ dry-run:

```bash
npm run cde -- run cdp-... --dry-run --fault S1
```

| Scenario | จุดผิดพลาด | ผลที่คาดหวัง |
|---|---|---|
| S0 | ไม่มี | workflow ปกติ |
| S1 | worker action | rollback/compensation path |
| S2 | critic quality gate | rollback/compensation path |
| S3 | approval channel | หยุด `awaiting_approval` พร้อม recovery guidance |

## Threat model และ operational boundaries

**ป้องกัน:** proposal malformed/มี secret, path traversal, shell interpolation,
command นอก allowlist, dangerous Git/npm/deploy tools, overlapping runs,
self-approval, canonical drift, tampered audit records, duplicate intake,
unbounded output, hung command และ uncertain restart

**ไม่อ้างว่าป้องกัน:** operator ที่เขียน config/source/runtime ได้อยู่แล้ว, OS/root
compromise, malicious executable ที่ถูก replace ใน `PATH`, external side effect ที่
command allowlisted ทำโดยไม่เปิดเผย และการลบ runtime directory ทั้งชุด ควรเสริม
filesystem ACL, signed commits, protected branch และ backup/WORM storage สำหรับ
production audit

engine เป็น local control plane ไม่ใช่ deployment service: ไม่มีการอ่าน `.env`,
ไม่มี API key, ไม่มี webhook ออกภายนอก, ไม่ train/modify ตัวเอง และไม่แก้ source
ของตัวเองระหว่าง run ทุก code/config/spec/release change ยังต้องผ่าน human review
และระบบ branch/PR/CI ภายนอกตามปกติ
