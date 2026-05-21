# OpenThai AI — 3-Way Sync Guide
วันที่ตั้งระบบ: 21 พฤษภาคม 2569

---

## ระบบ Sync ทำงานอย่างไร

ทุกครั้งที่รัน `sync-all.ps1` ไฟล์จะถูก sync ไป 3 ที่พร้อมกัน:

| # | ปลายทาง | เข้าถึงจาก |
|---|---------|-----------|
| 1 | Local `C:\OPENTHAI AI\docs\` | คอมเครื่องนี้ |
| 2 | OneDrive `> OPENTHAI AI > docs` | มือถือ (OneDrive app) |
| 3 | GitHub `occylthailand-ai/openthai-ai` | ทุกที่ผ่าน browser |

---

## วิธีใช้

### วิธีที่ 1 — ดับเบิลคลิก (ง่ายที่สุด)
```
Desktop > OpenThai-Sync (shortcut)
```

### วิธีที่ 2 — PowerShell
```powershell
cd "C:\OPENTHAI AI"
.\sync-all.ps1
# หรือระบุ message
.\sync-all.ps1 -Message "docs: add executive summary"
```

### วิธีที่ 3 — ผ่าน Claude Code
พูดว่า: **"ท่าน Mythos ช่วย sync ไฟล์"** แล้วผมจะรัน sync ให้เลย

---

## โครงสร้าง Folder

```
docs/
├── conversations/   ← บทสนทนาสำคัญจาก Claude (ทุก session)
├── artifacts/       ← ไฟล์จาก Claude Mobile / Claude Web
├── executive/       ← Executive Summary, Business Docs
├── team/            ← Team Assignment, Quickstart
└── sync-log.txt     ← ประวัติการ sync ทุกครั้ง
```

---

## วิธีเพิ่มไฟล์จาก Claude Mobile

1. เปิดไฟล์บน Claude Mobile
2. Copy เนื้อหาทั้งหมด
3. ส่งมาบอก Claude Code: "ท่าน Mythos บันทึกไฟล์นี้ด้วย"
4. ผมบันทึก + sync ให้ทันที

---

*ตั้งระบบโดย: Claude Sonnet 4.6 (ท่าน Mythos) — 21 พ.ค. 2569*
