# คำแนะนำ Spec ฮาร์ดแวร์สำหรับงาน AI/Data
**ทีม OpenThai AI | ปรับปรุง: มิถุนายน 2026**

---

## ระดับการใช้งาน 3 ระดับ

### ระดับ 1: เจ้าหน้าที่ทั่วไป (Data Entry / Admin / รายงาน)
> ใช้ Excel, Power BI, Google Sheets, รายงาน AI พื้นฐาน

| ชิ้นส่วน | ข้อกำหนดขั้นต่ำ | แนะนำ |
|----------|----------------|--------|
| CPU | Intel Core i5-12400 / Ryzen 5 5600 | Core i5-13400 / Ryzen 5 7600 |
| RAM | **16 GB DDR4** | **32 GB DDR5** |
| GPU | GTX 1060 6GB / RX 580 8GB | RTX 3060 12GB |
| Storage | 256 GB SSD NVMe | 512 GB NVMe + 1 TB HDD |
| OS | Windows 11 Pro | Windows 11 Pro |

---

### ระดับ 2: นักวิเคราะห์ข้อมูล / AI Developer
> รัน Python ML, Fine-tune AI model ขนาดเล็ก, Docker, Jupyter

| ชิ้นส่วน | ข้อกำหนดขั้นต่ำ | แนะนำ |
|----------|----------------|--------|
| CPU | Core i7-12700 / Ryzen 7 5700X | Core i7-13700K / Ryzen 7 7700X |
| RAM | **32 GB DDR4** | **64 GB DDR5** |
| GPU | **RTX 3060 12GB** | **RTX 4070 12GB** |
| Storage | 512 GB NVMe | 1 TB NVMe + 2 TB HDD |
| OS | Windows 11 Pro | Windows 11 Pro |

---

### ระดับ 3: AI Engineer / LLM Researcher
> Train/Fine-tune LLM, รัน Local AI Model (LLaMA, Mistral), Multi-GPU

| ชิ้นส่วน | ข้อกำหนดขั้นต่ำ | แนะนำ |
|----------|----------------|--------|
| CPU | Core i9-13900K / Ryzen 9 7900X | Threadripper / EPYC |
| RAM | **64 GB DDR5** | **128 GB DDR5 ECC** |
| GPU | **RTX 4090 24GB** | **2x RTX 4090 / A6000** |
| Storage | 2 TB NVMe | 4 TB NVMe + 8 TB HDD |
| PSU | 850W 80+ Gold | 1200W+ 80+ Platinum |
| OS | Windows 11 Pro | Ubuntu 22.04 LTS (หรือ Dual Boot) |

---

## GPU VRAM Guide สำหรับงาน AI

| VRAM | รองรับ Model ขนาด |
|------|-------------------|
| 8 GB | 7B parameters (quantized) |
| 12 GB | 13B parameters (quantized) |
| 16 GB | 20B parameters |
| 24 GB | 34B parameters (quantized) / 13B full |
| 48 GB+ | 70B+ parameters |

---

## คำแนะนำเพิ่มเติม

### RAM
- ซื้อ **Dual-Channel** เสมอ (2 แท่ง แทนที่จะเป็น 1 แท่งใหญ่)
- DDR5 เร็วกว่า DDR4 ~10-30% สำหรับงาน AI
- ตรวจสอบ compatibility กับ Motherboard ก่อนซื้อ

### GPU
- **NVIDIA RTX ซีรีส์** แนะนำที่สุดสำหรับงาน AI (CUDA ecosystem)
- AMD GPU รองรับ ROCm แต่ ecosystem ยังน้อยกว่า NVIDIA
- หากงบจำกัด: RTX 3060 12GB คุ้มค่าที่สุดสำหรับ AI

### Storage
- **NVMe SSD** สำหรับ OS และโปรเจกต์ (อย่าใช้ HDD)
- **HDD** สำหรับเก็บ Dataset ขนาดใหญ่
- แนะนำ Samsung 980 Pro / WD Black SN850X

---

## งบประมาณโดยประมาณ (ราคาไทย 2026)

| ระดับ | อัปเกรด RAM | อัปเกรด GPU | รวม |
|-------|-------------|-------------|-----|
| ระดับ 1 | 3,000-5,000 บาท | 8,000-15,000 บาท | ~20,000 บาท |
| ระดับ 2 | 6,000-12,000 บาท | 18,000-28,000 บาท | ~40,000 บาท |
| ระดับ 3 | 15,000-30,000 บาท | 60,000-120,000 บาท | ~150,000 บาท |
