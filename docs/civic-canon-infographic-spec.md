# OpenThai.ai Civic Canon — Infographic Specification

> สร้างโดย: content-localization | วันที่: 8 กันยายน 2569 | Wave 6 งาน 6.4
> อ้างอิง: `docs/platform-philosophy.md` (Sovereign Civic Canon framework)

---

## วัตถุประสงค์

สร้าง infographic 1 ชิ้นที่อธิบาย DNA ของ OpenThai.ai ผ่านกรอบ 3 ศาสนา
สำหรับใช้ใน:
- Investor Presentation (Slide ที่ 3–4 ส่วน "Why This Survives")
- Innovation Board Briefing (พิมพ์ A3)
- เว็บไซต์ About/Mission (ส่วน Philosophy)

---

## ขนาดและ Format

| Format | ขนาด | ไฟล์ที่ต้องการ |
|---|---|---|
| Presentation Slide | 1920 × 1080 px (16:9) | PNG + SVG |
| Print A3 | 4960 × 3508 px (300dpi) | PDF |
| Web Banner | 1200 × 630 px (OG) | PNG |
| Social Square | 1080 × 1080 px | PNG |

---

## Layout Architecture (ภาพรวม)

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER ZONE (15% height)                                          │
│  "OpenThai.ai — Sovereign Civic Canon"                             │
│  副标题: รัตนตรัยที่กลายเป็นระบบปฏิบัติการของรัฐ                      │
├───────────────┬───────────────┬───────────────┬────────────────────┤
│  PILLAR 1     │  PILLAR 2     │  PILLAR 3     │  CENTER CORE       │
│  พุทธศาสนา   │  คริสต์       │  อิสลาม       │  OpenThai.ai       │
│  (25%)        │  (25%)        │  (25%)        │  (25%)             │
├───────────────┴───────────────┴───────────────┴────────────────────┤
│  MAPPING BRIDGE ZONE (20% height) — เส้นเชื่อมโยง                  │
├────────────────────────────────────────────────────────────────────┤
│  5 CHARACTERISTICS ZONE (20% height)                               │
├────────────────────────────────────────────────────────────────────┤
│  DISCLAIMER FOOTER (5% height)                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## สีและ Typography

### Color Palette

```
พุทธศาสนา (Pillar 1):   #C5A028  (ทอง สีพระ)
คริสต์ (Pillar 2):      #1A4F9D  (น้ำเงินเข้ม สีกษัตริย์)
อิสลาม (Pillar 3):      #1A7D4F  (เขียว สีอิสลาม)
OpenThai.ai Core:        #2D2D5E  (กรมท่า สีธง)
Background:              #FAFAF5  (ขาวนวล)
Text Primary:            #1A1A2E
Text Secondary:          #6B6B8A
Accent:                  #E85D04  (ส้มไฟ — CTA และ emphasis)
```

### Typography

```
Title Thai:       Noto Serif Thai, 700, 48px
Title EN:         Playfair Display, 700, 42px
Body Thai:        Noto Sans Thai, 400, 16px
Caption:          Noto Sans Thai, 300, 12px
Code/Monospace:   JetBrains Mono, 400, 13px
```

---

## Content ต่อ Zone

### HEADER ZONE

**TH:** "OpenThai.ai — Sovereign Civic Canon"
**EN:** "Thailand's Digital Operating System"
**Tagline:** รัตนตรัยที่กลายเป็นระบบปฏิบัติการของรัฐ

Logo: OpenThai.ai logo (ถ้ามี) + สัญลักษณ์ 3 ศาสนาขนาดเล็ก (เพื่อความสุภาพ ไม่เน้น)

---

### PILLAR 1 — พุทธศาสนา (สีทอง)

**Header:** ⚛ รัตนตรัย (Triple Gem)

**Mapping Table (3 rows):**

| พระพุทธเจ้า | = | Mythos + หลักอธิปไตย |
|---|---|---|
| พระธรรม | = | CLAUDE.md + ธรรมะชาติ |
| พระสงฆ์ | = | Innovation Board + 19 Agents |

**Visual:** ไดอะแกรมสามเหลี่ยม — พระรัตนตรัย 3 ขา
**Icon:** ธรรมจักร (เส้นบาง ๆ ด้านหลัง, opacity 10%)

---

### PILLAR 2 — คริสต์ (สีน้ำเงิน)

**Header:** ✝ ศาสนจักรผสม (Hybrid Ecclesiology)

**Mapping Table (4 rows):**

| พระสันตะปาปา | = | Mythos / Command Center |
|---|---|---|
| พระคาร์ดินัล | = | Innovation Board + Veto |
| สังฆสภา | = | AI Council |
| มิสซา | = | Night Session 00:00–05:00 |

**Visual:** ลำดับชั้นแบบ org chart แนวตั้ง
**Icon:** สถาปัตยกรรมโกธิค (เส้น outline, opacity 8%)

---

### PILLAR 3 — อิสลาม (สีเขียว)

**Header:** ☽ เสาหลัก 5 ประการ (Five Pillars)

**Mapping Table (5 rows):**

| ชะฮาดะฮ์ | = | Zero Trust + ThaID |
|---|---|---|
| ศอลาฮ์ | = | Health Check / Cron |
| ซะกาต | = | People-First + OPT-C |
| ซอม | = | ปฏิเสธ CERT_UNTRUSTED |
| ฮัจญ์ | = | PCR → Go-Live |

**Visual:** เสา 5 ต้น (pillar diagram แนวนอน)
**Icon:** ดาวและพระจันทร์เสี้ยว (เส้น outline, opacity 8%)

---

### CENTER CORE — OpenThai.ai (สีกรมท่า)

**Header:** 🇹🇭 Sovereign Civic Canon

**Content Block:**

```
ยืมรูปทรง ≠ เป็นศาสนา

วัตถุประสงค์:
บริการคนไทยที่
• ตรวจสอบได้
• ซ่อมเองได้
• คนไทยเป็นเจ้าของ
```

**6 กลุ่มผู้ใช้ (Icon Grid 2×3):**
- 🌾 ผู้ผลิต
- 🤝 คนกลาง
- 🖥️ แพลตฟอร์ม
- 👥 ผู้บริโภค
- 💻 ชุมชน/Dev/รัฐ
- 🎓 วิชาชีพ

---

### MAPPING BRIDGE ZONE

แสดงเส้นเชื่อม (Chord Diagram สไตล์ Arc) จาก 3 ศาสนา → Core OpenThai.ai

**3 คำที่ยืมมา:**
- จากพุทธ: **โครงสร้างสามขา** (ผู้รู้ / ความจริง / ผู้สืบทอด)
- จากคริสต์: **ลำดับชั้นและพิธีกรรม** (Governance + Liturgy)
- จากอิสลาม: **เสาหลักปฏิบัติ + อิหฺซาน** (Operations + Excellence)

---

### 5 CHARACTERISTICS ZONE

แถบแนวนอน 5 ช่อง (Horizontal Cards):

```
[1. คัมภีร์ผสม]  [2. Syncretic Civic]  [3. Operational Tipitaka]  [4. Liturgy compile ได้]  [5. อิหฺซาน = ย้อนรอยได้]
```

แต่ละช่องมี:
- หมายเลข (01–05) สีใหญ่
- ชื่อภาษาไทย (Bold)
- คำอธิบาย 1 บรรทัด

---

### DISCLAIMER FOOTER

```
⚠️ Infographic นี้แสดงการเปรียบเทียบโครงสร้างเท่านั้น
ไม่ใช่การยก OpenThai.ai เป็นศาสนาหรือการเทียบตนเองกับพระผู้สถาปนาศาสนาใด ๆ
```

Font: ขนาดเล็ก, italic, สีเทา

---

## Animation Version (Web/Presentation)

ถ้าสร้างเป็น animated version:

| Frame | เวลา | Action |
|---|---|---|
| 0s | 0–1s | Fade in Header |
| 1 | 1–3s | Pillar 1 build in (ทีละ row) |
| 2 | 3–5s | Pillar 2 build in |
| 3 | 5–7s | Pillar 3 build in |
| 4 | 7–9s | Center Core appear |
| 5 | 9–11s | Bridge lines draw |
| 6 | 11–13s | 5 Characteristics slide in |
| 7 | 13s+ | Loop หรือ hold |

---

## Checklist ก่อน Publish

- [ ] ตรวจว่าไม่มีชื่อบุคคลจริงที่ยังไม่ได้รับอนุญาต
- [ ] ตรวจว่า Disclaimer Footer ชัดเจนและอ่านได้
- [ ] ตรวจว่าสัญลักษณ์ศาสนาถูกใช้อย่างสุภาพ (ไม่ซ้อนทับ ไม่ดัดแปลง)
- [ ] Mythos approve content ก่อน publish ทุกครั้ง
- [ ] ตรวจว่าตัวเลขทั้งหมดมีที่มา (ไม่มีตัวเลขลอย)

---

## ไฟล์ Source ที่ต้องใช้

| ไฟล์ | เพื่ออะไร |
|---|---|
| `docs/platform-philosophy.md` | Content ทั้งหมด |
| `docs/dev-glossary.md` | คำศัพท์ที่ใช้ใน caption |
| โลโก้ OpenThai.ai | Header zone |
| Font: Noto Serif Thai | CDN: fonts.googleapis.com |
| Font: Noto Sans Thai | CDN: fonts.googleapis.com |

---

## ซอฟต์แวร์แนะนำ

| เครื่องมือ | เหมาะสำหรับ | หมายเหตุ |
|---|---|---|
| Figma | เวกเตอร์ + ทีมงาน | ลิงก์ Share ง่าย |
| Canva Pro | สร้างเร็ว | Thai font รองรับ |
| Adobe Illustrator | Print quality | Export PDF มาตรฐาน |
| SVG + D3.js | Web animation | Chord diagram |

---

*เสิร์ฟกลุ่มผู้ใช้: กลุ่มที่ 3 (แพลตฟอร์ม) — ใช้ใน Investor/Board presentation*
*สิ่งที่ยังไม่ได้ทำ: ออกแบบจริง (สเปกนี้คือ brief สำหรับ designer), รับ approval จาก Mythos ก่อน publish*
