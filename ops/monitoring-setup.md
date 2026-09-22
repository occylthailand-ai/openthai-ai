# คู่มือติดตั้ง Monitoring Stack — OpenThai.ai

**Stack:** uptime-kuma (self-hosted, ไม่ส่งข้อมูลออกนอก)  
**รองรับ:** Ubuntu 22.04, Raspberry Pi 4, Windows WSL2  
**Wave 8, Task 8.3 | สร้าง: 14 ก.ย. 2569**

---

## ขั้นตอนติดตั้ง (10 ขั้น)

### ขั้น 1 — ติดตั้ง Docker
```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# logout แล้ว login ใหม่
```

### ขั้น 2 — Clone หรือ copy ไฟล์
```bash
# ถ้าอยู่ใน repo แล้ว
ls ops/docker-compose.monitoring.yml  # ✅ มีแล้ว
```

### ขั้น 3 — เริ่มต้น stack
```bash
docker compose -f ops/docker-compose.monitoring.yml up -d
```

### ขั้น 4 — เปิดหน้าเว็บ
เปิด browser ไปที่ `http://localhost:3001`  
ครั้งแรก: สร้าง admin account (username + password)

### ขั้น 5 — เพิ่ม Monitors ทั้ง 7 รายการ

คลิก **+ Add New Monitor** สำหรับแต่ละรายการ:

| ชื่อ | URL | Type | Interval |
|------|-----|------|----------|
| API Health | `http://localhost:8000/health` | HTTP | 60s |
| Producer Portal | `http://localhost:3000/producer` | HTTP | 120s |
| Intermediary Portal | `http://localhost:3000/intermediary` | HTTP | 120s |
| Consumer Portal | `http://localhost:3000/consumer` | HTTP | 120s |
| Professional Portal | `http://localhost:3000/professional` | HTTP | 120s |
| Gov Portal | `http://localhost:3000/gov` | HTTP | 120s |
| AI Endpoint | `http://localhost:8000/health/ai` | HTTP | 300s |

> แก้ host/port ตาม deployment จริง

### ขั้น 6 — ตั้ง Alert ผ่าน LINE Notify

1. ไปที่ https://notify-bot.line.me/th/ → สร้าง token
2. ใน uptime-kuma: **Settings → Notifications → + Add Notification**
   - Type: **LINE Notify**
   - Token: วาง token ที่ได้
3. ทดสอบส่ง notification

### ขั้น 7 — ตั้ง Alert Thresholds

ใน Monitor แต่ละตัว → **Heartbeat Interval** + **Retries**:
- Retry: 3 ครั้งก่อน alert
- Timeout: 10 วินาที (warn ถ้าช้ากว่า 2 วินาที ต้องตั้งใน app layer)

### ขั้น 8 — ตรวจสอบ Status Page

Settings → **Status Page** → สร้างหน้าสาธารณะ (หรือ internal)  
ชื่อ: "OpenThai.ai System Status"

### ขั้น 9 — Backup ข้อมูล

```bash
# backup volume ทุกสัปดาห์
docker run --rm -v openthai-monitoring-data:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/uptime-kuma-$(date +%Y%m%d).tar.gz /data
```

### ขั้น 10 — รายงาน Mythos

หลังติดตั้ง ส่งรายงานสั้น:
- URL ของ status page
- monitors ที่เพิ่มแล้ว (ครบ 7 ไหม)
- channel alert ที่ตั้ง

---

## Makefile targets

เพิ่มใน `Makefile` ที่ root:

```makefile
monitoring-up:
	docker compose -f ops/docker-compose.monitoring.yml up -d

monitoring-down:
	docker compose -f ops/docker-compose.monitoring.yml down

monitoring-status:
	docker compose -f ops/docker-compose.monitoring.yml ps
	docker compose -f ops/docker-compose.monitoring.yml logs --tail=20 uptime-kuma

monitoring-backup:
	docker run --rm -v openthai-monitoring-data:/data -v $(shell pwd)/backup:/backup \
		alpine tar czf /backup/uptime-kuma-$(shell date +%Y%m%d).tar.gz /data
```

---

## Runbook เมื่อ Portal down

**5 นาทีแรก:**
1. `make monitoring-status` — ดู logs
2. `curl -I http://localhost:8000/health` — ตรวจ API
3. `docker ps` — ดูว่า container ยังรันอยู่ไหม
4. `docker compose logs --tail=50 <service>` — ดู error
5. ถ้าแก้ไม่ได้ใน 5 นาที → แจ้ง Mythos + บันทึก incident

---

**เสิร์ฟกลุ่มผู้ใช้:** กลุ่ม 3 แพลตฟอร์ม (reliability สำหรับทุกกลุ่ม)  
**สิ่งที่ยังไม่ได้ทำ:** Prometheus + Grafana สำหรับ latency metrics (Wave 9)
