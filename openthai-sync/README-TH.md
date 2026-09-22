# OpenThai.ai Sync Tool v1.0 — คู่มือติดตั้ง

ระบบซิงค์ข้อมูล 3 ส่วนให้เป็นอันหนึ่งอันเดียวกัน:

```
คอมพิวเตอร์ (C:\OPENTHAI AI)
        │  sync-openthai.ps1 (robocopy mirror)
        ▼
Google Drive (คลาวด์)
        │
        ├──▶ มือถือ (แอป Google Drive)
        └──▶ Claude (อ่านผ่าน Drive connector)
```

## สิ่งที่ต้องมีก่อน (ทำครั้งเดียว)

1. ติดตั้ง **Google Drive for Desktop** จาก https://www.google.com/drive/download/
2. ล็อกอินด้วยบัญชี **occylthailand@gmail.com**
3. รอจนเห็นไดรฟ์ `G:` (My Drive) ใน File Explorer

## วิธีใช้งาน

### แบบซิงค์ทันที (กดเอง)
1. แตกไฟล์ ZIP นี้ไว้ที่ไหนก็ได้ เช่น `C:\OPENTHAI AI\tools\`
2. ดับเบิลคลิก **`SYNC-NOW.bat`**
3. รอจนขึ้นข้อความ "[สำเร็จ] ซิงค์ข้อมูลเรียบร้อย!"

### แบบอัตโนมัติ (ทุก 30 นาที)
1. คลิกขวา **`install-autosync.ps1`** → **Run with PowerShell**
2. ติดตั้งครั้งเดียว เครื่องจะซิงค์เองตลอดเวลาที่เปิดคอม

## หลังซิงค์แล้ว แต่ละส่วนเข้าถึงอย่างไร

| ส่วน | วิธีเข้าถึง |
|------|------------|
| 1. คอมพิวเตอร์ | `C:\OPENTHAI AI` (ต้นฉบับ — แก้ไขที่นี่เสมอ) |
| 2. มือถือ | แอป Google Drive → โฟลเดอร์ `OPENTHAI AI` |
| 3. Claude | พิมพ์บอก Claude ว่า "อ่านโฟลเดอร์ OPENTHAI AI ใน Google Drive" |

## หมายเหตุสำคัญ

- สคริปต์ใช้โหมด **mirror**: ปลายทางบน Drive จะเหมือนต้นทางบนคอมทุกประการ
  (ลบไฟล์บนคอม → ไฟล์บน Drive จะถูกลบตามในการซิงค์ครั้งถัดไป)
- โฟลเดอร์ `node_modules`, `.git`, `.next` จะถูกข้าม เพื่อไม่ให้เปลือง Drive
- Log การซิงค์ทุกครั้งเก็บไว้ที่ `C:\OPENTHAI AI\_sync-logs\`
- Claude ไม่สามารถเข้าถึงคอมหรือมือถือโดยตรง — Google Drive คือสะพานกลางที่ทำให้ทั้งสามส่วนเห็นข้อมูลชุดเดียวกัน

---
OpenThai.ai · นาย ซื่อใจ แซ่หย่าง / MR. ZUEJAI SAEYANG / 杨世再
