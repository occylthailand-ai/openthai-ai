# Checklist: อัปเกรดฮาร์ดแวร์ + ลงวินโดว์ใหม่
**สำหรับทีม OpenThai AI | งานหลัก: AI/Data**

---

## ขั้นตอนที่ 1: เตรียมตัวก่อนลงมือ (1-2 วันก่อน)

### 1.1 สำรองข้อมูลสำคัญ
- [ ] รัน `backup-data.ps1` เพื่อสำรองข้อมูลอัตโนมัติ
- [ ] ตรวจสอบ backup ไปยัง External Drive หรือ Cloud (Google Drive / OneDrive)
- [ ] สำรองโฟลเดอร์เหล่านี้ด้วยตนเอง:
  - [ ] `C:\Users\<username>\Documents`
  - [ ] `C:\Users\<username>\Desktop`
  - [ ] `C:\Users\<username>\.ssh` (SSH keys)
  - [ ] `C:\Users\<username>\.env` files และ API keys
  - [ ] โปรเจกต์ใน `C:\dev` หรือตำแหน่งที่ใช้งาน
  - [ ] Database exports (PostgreSQL, MySQL, MongoDB)
  - [ ] Docker volumes ที่สำคัญ

### 1.2 จดบันทึกข้อมูลที่ต้องใช้ใหม่
- [ ] License Keys ของซอฟต์แวร์ที่ซื้อ
- [ ] API Keys ทั้งหมด (OpenAI, Google, Anthropic, ฯลฯ)
- [ ] รหัสผ่าน Wi-Fi
- [ ] ข้อมูล VPN / Network configuration
- [ ] รายชื่อซอฟต์แวร์ที่ใช้งานอยู่ทั้งหมด

### 1.3 เตรียมสื่อติดตั้ง
- [ ] ดาวน์โหลด Windows 11 Pro ISO จาก Microsoft (official)
- [ ] สร้าง Bootable USB (8GB+) ด้วย Rufus
- [ ] เตรียม Driver Pack ของ Motherboard/GPU ไว้ใน USB แยก

---

## ขั้นตอนที่ 2: อัปเกรดฮาร์ดแวร์

### 2.1 เพิ่ม RAM
- [ ] ปิดเครื่องและถอดปลั๊กไฟ
- [ ] ใส่ RAM ใหม่ให้ถูก slot (ดูจาก Manual ของ Motherboard)
- [ ] ติดตั้ง RAM แบบ Dual-Channel (ใส่ slot 1+3 หรือ 2+4 ตามแต่ board)
- [ ] เปิดเครื่องเข้า BIOS ตรวจสอบว่าเห็น RAM ครบ

### 2.2 เพิ่มการ์ดจอ
- [ ] ติดตั้ง GPU ใน PCIe x16 slot
- [ ] ต่อสาย Power (6-pin / 8-pin / 16-pin ตามรุ่น GPU)
- [ ] ตรวจสอบว่า PSU มีพลังงานเพียงพอ
- [ ] เข้า BIOS ตั้งค่า Primary Display เป็น PCIe

---

## ขั้นตอนที่ 3: ลงวินโดว์ใหม่

### 3.1 Boot จาก USB
- [ ] เข้า BIOS (กด F2/Del/F12 ตามยี่ห้อ)
- [ ] ตั้ง Boot Order ให้ USB เป็นอันดับแรก
- [ ] บูตเข้า Windows Setup

### 3.2 ติดตั้ง Windows 11 Pro
- [ ] เลือก Custom Install (ไม่ใช่ Upgrade)
- [ ] ลบ Partition เก่าและสร้างใหม่ (หรือ Format)
- [ ] ติดตั้งลงบน SSD/NVMe (ไม่ใช่ HDD)
- [ ] เลือก Region: Thailand / Keyboard: Thai Kedmanee + US

### 3.3 ตั้งค่าหลังลงวินโดว์
- [ ] อัปเดต Windows Update ให้ครบ
- [ ] ติดตั้ง Driver จาก USB ที่เตรียมไว้ (GPU, Network, Audio)
- [ ] ติดตั้ง NVIDIA/AMD Driver ล่าสุดจากเว็บผู้ผลิต
- [ ] รัน `install-software.ps1` เพื่อติดตั้งซอฟต์แวร์อัตโนมัติ

---

## ขั้นตอนที่ 4: ตรวจสอบหลังติดตั้ง

- [ ] RAM ที่แสดงใน Task Manager ตรงกับที่ติดตั้ง
- [ ] GPU ปรากฏใน Device Manager ไม่มี ! สีเหลือง
- [ ] รัน benchmark เบื้องต้น (GPU-Z, CPU-Z, CrystalDiskMark)
- [ ] ทดสอบรัน Python + CUDA ว่า GPU ถูก detect
- [ ] Restore ข้อมูลจาก backup
- [ ] ทดสอบ API Keys ว่ายังใช้งานได้

---

## ผู้รับผิดชอบ

| งาน | ผู้รับผิดชอบ | วันที่แล้วเสร็จ |
|-----|-------------|----------------|
| สำรองข้อมูล | IT Admin | |
| อัปเกรดฮาร์ดแวร์ | IT Admin | |
| ลงวินโดว์ | IT Admin | |
| ติดตั้งซอฟต์แวร์ | IT Admin | |
| ทดสอบระบบ | ทีม AI/Data | |
