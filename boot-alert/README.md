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
# เลือก CHANNELS แล้วเติมค่าของแต่ละช่องทาง (ดูด้านล่าง)
```

> 🔀 **ส่งหลายช่องทางพร้อมกันได้** — ตั้ง `CHANNELS=telegram,thsms` แล้วเปิดเครื่องที
> จะเด้งเข้า Telegram **และ** ส่ง SMS ไปพร้อมกัน

#### ตั้ง Telegram (ฟรี ใช้ได้ทันที — แนะนำเริ่มที่นี่)
```bash
# 1) ใน Telegram ทักบอท @BotFather → /newbot → ได้ TOKEN → ใส่ TELEGRAM_BOT_TOKEN
# 2) ทักบอทที่เพิ่งสร้าง พิมพ์ /start
# 3) หา chat_id:
node notify.js --tg-chatid     # พิมพ์ chat_id ออกมา → ใส่ TELEGRAM_CHAT_IDS
```

#### ตั้ง SMS (THSMS)
```
CHANNELS=thsms (หรือ telegram,thsms)
THSMS_API_KEY=<คีย์จาก dashboard>
SMS_SENDER=<ชื่อผู้ส่งที่อนุมัติแล้ว>
```

### 2) ทดสอบส่งก่อน
```bash
node notify.js --test     # ส่งทดสอบทุกช่องทาง/ทุกเบอร์ทันที
```
ได้รับครบทุกช่องทางค่อยติดตั้งจริง

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

## ช่องทางแจ้งเตือน (ตั้งใน `.env` ที่ `CHANNELS`)

| channel | ต้องตั้ง | หมายเหตุ |
|---------|---------|----------|
| `telegram` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` | ฟรี เด้งเข้าแอปทันที ไม่ต้องอนุมัติ |
| `thsms` | `THSMS_API_KEY`, `SMS_SENDER` | SMS จริงเข้าทุกมือถือ (เสียค่าส่ง + sender ต้องอนุมัติ) |
| `smsmkt` | `SMSMKT_API_KEY`, `SMSMKT_SECRET_KEY`, `SMS_SENDER` | SMS ทางเลือก |
| `custom` | `SMS_URL`/`SMS_HEADERS`/`SMS_BODY` | gateway อื่นๆ ตั้งเองได้หมด |

ใส่หลายช่องทางพร้อมกัน: `CHANNELS=telegram,thsms`

> endpoint ของผู้ให้บริการ SMS อาจปรับเปลี่ยน — ถ้าส่งไม่ผ่าน เทียบกับเอกสาร API ล่าสุดแล้วแก้ใน `notify.js` (ฟังก์ชัน `sendSms`) หรือใช้ `custom`

---

## กลไกกันสแปม

จำ "ลายเซ็นการบูต" (เวลาบูตเครื่อง) ไว้ใน `.boot-state.json`
→ ส่ง SMS **เฉพาะตอนบูตใหม่จริงๆ** ไม่ส่งซ้ำเมื่อ service แค่รีสตาร์ตในบูตเดิม

ตั้ง `HEARTBEAT_HOURS` > 0 ถ้าอยากให้ส่ง "ยังออนไลน์" เป็นระยะด้วย
