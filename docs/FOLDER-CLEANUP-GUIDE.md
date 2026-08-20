# คู่มือจัดระเบียบโฟลเดอร์ E:\OPENTHAI AI

**วันที่:** 14 สิงหาคม 2569

โฟลเดอร์ root มีไฟล์หลายพันไฟล์ ส่วนใหญ่ **ไม่ใช่ส่วนของโปรเจกต์ OpenThaiAi** แต่ถูกคัดลอกมาจาก Python, Vim, npm, Windows logs ฯลฯ

---

## ไฟล์/โฟลเดอร์ที่ **ใช้งานจริง** (อย่าลบ)

```
openthai-ai/          โค้ดและ docs หลัก
openthai-ai-repo/     corpus + mirror
apps/                 MVP apps
docs/                 สเปกโม듹
.claude/              agents
backend/ frontend/ landing/ api/  (ตรวจก่อนลบ — อาจซ้ำกับ openthai-ai/)
n8n-workflows/
xades-engine/
00-OPENTHAI-AI-INDEX.md
00-openthaiai-master-blueprint.md
OpenThaiAI_Master_Dossier.md
OpenThaiAI_Master_Dossier.pdf
ปรากฏการณ์-OpenThaiAi.md
CLAUDE.md
README.md
MVP-AI-Income-Starter.md
*.json (n8n, funnel, content engine)
```

---

## ไฟล์ที่ **ควรย้ายออก / ลบ** (ไม่เกี่ยวกับโปรเจกต์)

### กลุ่ม A — เอกสาร Python/Vim/npm (ขยะ)
- `*.rst.txt` (asyncio, tkinter, xml ฯลฯ)
- `8859-*.txt`, `cp*.txt`, `help.*.txt`
- `*.LICENSE.txt`, `ThirdPartyNotices.txt`
- `usr_*.txt`, `vi_diff.txt`

### กลุ่ม B — Log / Scan / Setup
- `ScanLog_*.txt`, `gcc_log_*.txt`, `Setup Log *.txt`
- `360safeScanLog.txt`, `LogFile_*.txt`
- `202606*.txt`, `202607*.txt` (chat logs)

### กลุ่ม C — ไฟล์ระบบอื่น
- `oracleJdk-25/` (JDK ไม่เกี่ยวกับโปรเจกต์)
- `.history/`, `.snapshots/` (ถ้าไม่ใช้)

---

## ไฟล์ที่ **อันตราย — ต้องจัดการทันที**

ย้ายไป `C:\SECRETS` หรือ password manager แล้ว **ลบจากโฟลเดอร์นี้**:

- `ANTHROPIC_API_KEY.txt`
- `gemini api key.txt`
- `GROK ALL API KEY.txt`
- `Google Passwords.csv`
- `passwords.txt`
- `recovery-codes.txt`

จากนั้น **rotate API keys ทั้งหมด** เพราะอาจถูก expose แล้ว

---

## ขั้นตอนแนะนำ

1. สร้าง `E:\OPENTHAI AI\_archive_junk\`
2. ย้ายกลุ่ม A + B ไป `_archive_junk\` (ไม่ลบทันที)
3. จัดการกลุ่ม C (secrets) ตามด้านบน
4. ใช้ `00-OPENTHAI-AI-INDEX.md` เป็น entry point
5. ทำงานใน `openthai-ai/` เป็นหลัก

---

## .gitignore ที่แนะนำ (ถ้ายังไม่มี)

```gitignore
# Secrets
*API*KEY*
*password*
*Password*
recovery-codes.txt
.env
.env.*

# Junk patterns
*.rst.txt
8859-*.txt
help.*.txt
ScanLog_*.txt
gcc_log_*.txt
_archive_junk/

# Large / local
oracleJdk-25/
.history/
.snapshots/
node_modules/
```
