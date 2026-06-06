# 🔔 Boot Alert — แจ้งเตือน SMS เมื่อเครื่องถูกเปิด

เปิดคอมพิวเตอร์เครื่องนี้เมื่อไหร่ → ส่ง **SMS เข้ามือถือทันที** (เวลา + ชื่อเครื่อง + ผู้ใช้ + IP)
ทำงานเองทุกครั้งที่บูต, ถ้าถูกปิด service จะรีสตาร์ตกลับมาเอง — **24/7**

> 📱 ค่าเริ่มต้นส่งเข้า: `0972560801`, `0658714008` (แก้ได้ใน `.env`)

---

## ⚠️ เรื่องที่ต้องเข้าใจก่อน (เพื่อความปลอดภัยของตัวคุณเอง)

- โปรแกรมนี้ **ทนทาน**: เริ่มเองทุกบูต + เด้งกลับเมื่อถูก kill
- แต่ **ผู้ดูแลเครื่อง (admin/root) ถอนได้เสมอ** ตามคำสั่ง uninstall ด้านล่าง
- ผมจงใจ **ไม่ทำให้ "ลบไม่ได้แม้เจ้าของ"** เพราะนั่นคือเทคนิคของ malware และถ้าวันหนึ่งมันรวน/ส่งซ้ำ/ค่า SMS บานปลาย คุณต้องมีทางหยุดมันได้ การคุมเครื่องของตัวเองต้องอยู่ในมือคุณเสมอ

---

## ติดตั้ง

### 1) เตรียมค่า
```bash
cd boot-alert
cp .env.example .env
# แก้ .env: ใส่ THSMS_API_KEY (หรือ SMSMKT) + SMS_SENDER + เบอร์ที่ต้องการ
```

### 2) ทดสอบส่งก่อน
```bash
node notify.js --test     # ส่ง SMS ทดสอบหาทุกเบอร์ทันที
```
ได้รับ SMS ครบทุกเบอร์ค่อยติดตั้งจริง

### 3) ติดตั้งให้เริ่มทุกบูต

| OS | คำสั่ง |
|----|--------|
| **Linux** (systemd) | `sudo ./install-linux.sh` |
| **macOS** (launchd) | `sudo ./install-macos.sh` |
| **Windows** (Task Scheduler) | เปิด PowerShell แบบ Administrator → `.\install-windows.ps1` |

---

## ถอนการติดตั้ง (admin/เจ้าของเครื่อง)

| OS | คำสั่ง |
|----|--------|
| Linux | `sudo ./uninstall-linux.sh` |
| macOS | `sudo launchctl unload -w /Library/LaunchDaemons/com.openthai.bootalert.plist && sudo rm /Library/LaunchDaemons/com.openthai.bootalert.plist` |
| Windows | `Unregister-ScheduledTask -TaskName OpenthaiBootAlert -Confirm:$false` |

---

## ผู้ให้บริการ SMS

ตั้งใน `.env` ที่ `SMS_PROVIDER`:

- `thsms` — [thsms.com](https://thsms.com) → ใส่ `THSMS_API_KEY`
- `smsmkt` — [smsmkt.com](https://www.smsmkt.com) → ใส่ `SMSMKT_API_KEY`, `SMSMKT_SECRET_KEY`
- `custom` — gateway อื่นๆ ตั้ง `SMS_URL` / `SMS_HEADERS` / `SMS_BODY` เองได้ทั้งหมด

> endpoint ของแต่ละเจ้าอาจปรับเปลี่ยน — ถ้าส่งไม่ผ่าน ให้เทียบกับเอกสาร API ล่าสุดของผู้ให้บริการแล้วแก้ใน `notify.js` (ฟังก์ชัน `sendOne`) หรือใช้ `provider=custom`

---

## กลไกกันสแปม

จำ "ลายเซ็นการบูต" (เวลาบูตเครื่อง) ไว้ใน `.boot-state.json`
→ ส่ง SMS **เฉพาะตอนบูตใหม่จริงๆ** ไม่ส่งซ้ำเมื่อ service แค่รีสตาร์ตในบูตเดิม

ตั้ง `HEARTBEAT_HOURS` > 0 ถ้าอยากให้ส่ง "ยังออนไลน์" เป็นระยะด้วย
