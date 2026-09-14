# Community Launch Checklist — OpenThai.ai

**ทำเสร็จได้ใน 1 วัน | Wave 8, Task 8.4**  
อ้างอิงจาก: `docs/community-strategy.md` (Wave 7)  
เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 5 ชุมชน/นักพัฒนา/ผู้กำกับดูแล

---

## A. GitHub Setup (ประมาณ 30 นาที)

- [ ] สร้าง GitHub Organization: **openthai-ai** (ที่ github.com/organizations/new)
- [ ] สร้าง repositories เริ่มต้น 3 ตัว:
  - [ ] `openthai-ai/openthai-core` — โค้ดหลัก (private ก่อน → public เมื่อพร้อม)
  - [ ] `openthai-ai/openthai-docs` — เอกสาร (public ได้เลย)
  - [ ] `openthai-ai/openthai-eval` — Thai Eval Suite (public ได้เลย)
- [ ] ตั้ง Organization Profile:
  - สร้าง repo `.github` → ไฟล์ `profile/README.md` (ภาษาไทย + อังกฤษ)
  - ใส่: mission statement, 6 กลุ่มผู้ใช้, ลิงก์ Discord, ลิงก์ docs
- [ ] เปิด GitHub Discussions ใน `openthai-docs`:
  - [ ] 📣 Announcements (admin only)
  - [ ] ❓ Q&A
  - [ ] 💡 Ideas & Feature Requests
  - [ ] 🎉 Show & Tell
- [ ] สร้าง `CONTRIBUTING.md` ภาษาไทยใน `openthai-docs`:
  - ขั้นตอน fork → branch → PR
  - Commit message format
  - Code review process
- [ ] สร้าง `CODE_OF_CONDUCT.md` ภาษาไทย (ใช้ Contributor Covenant แปลไทย)
- [ ] ตั้ง Issue Templates: Bug Report, Feature Request (ภาษาไทย)
- [ ] เปิด GitHub Sponsors (ถ้าพร้อม) — ช่วยให้ community ส่งการสนับสนุนได้

**เป้าหมาย 30 วัน:** ⭐ 50 GitHub Stars ใน `openthai-docs`

---

## B. Discord Setup (ประมาณ 30 นาที)

- [ ] สร้าง Discord Server: **OpenThai.ai Community**
- [ ] ตั้ง Channels:
  - [ ] **ℹ️ INFO** (read-only): `#ประกาศ`, `#กฎระเบียบ`, `#roadmap`
  - [ ] **💬 GENERAL**: `#ทั่วไป`, `#ภาษาไทย-AI`, `#off-topic`
  - [ ] **🔧 DEVELOPMENT**: `#ช่วยเหลือ`, `#โค้ด-review`, `#bug-report`
  - [ ] **🌟 COMMUNITY**: `#โชว์งาน`, `#hackathon`, `#งาน-part-time`
  - [ ] **🔬 RESEARCH**: `#th-model-research`, `#corpus`, `#eval-suite`
  - [ ] **🤝 PARTNERS**: `#มหาวิทยาลัย`, `#หน่วยงานรัฐ` (invite-only)
- [ ] ตั้ง Roles:
  - [ ] 🛡️ Admin (Mythos + core team)
  - [ ] ⭐ Core Contributor (ส่ง PR ≥ 3 ครั้ง)
  - [ ] 🔨 Contributor (ส่ง PR ≥ 1 ครั้ง)
  - [ ] 👋 Member (ทั่วไป)
- [ ] ติดตั้ง Bot: **Carl-bot** (หรือ MEE6)
  - Welcome message ภาษาไทย
  - Auto-assign role "Member" เมื่อ join
- [ ] สร้าง Invite Link ถาวร (ไม่หมดอายุ)
- [ ] เพิ่มลิงก์ Discord ใน GitHub Organization profile

---

## C. First Content — วันแรก (Day 1)

- [ ] **LinkedIn post** ภาษาไทย (โพสต์จาก account Mythos):
  ```
  🚀 เปิดตัว OpenThai.ai Community
  
  เราสร้าง AI โครงสร้างพื้นฐานของชาติ — คนไทยเป็นเจ้าของ ตรวจสอบได้ เปิด Source
  
  หาเรา:
  📦 GitHub: github.com/openthai-ai
  💬 Discord: [invite link]
  
  #OpenSourceAI #ThaiAI #OpenThaiAI
  ```
- [ ] **GitHub Discussion แรก** ใน `openthai-docs`:
  - หัวข้อ: "สวัสดีทุกคน — เราคือใครและกำลังสร้างอะไร"
  - เนื้อหา: mission, 6 กลุ่มผู้ใช้, สิ่งที่ทำแล้ว, สิ่งที่อยากให้ community ช่วย
- [ ] **ส่ง DM** หาคนรู้จัก 10 คนแรก — เชิญ join Discord
- [ ] บันทึกว่า First Discussion ได้ engagement กี่ reply ใน 48 ชั่วโมง

---

## D. University Outreach Email Templates

ใช้ส่งให้ 5 มหาวิทยาลัยตาม `docs/flash-brief-partnerships.md`

### Template ภาษาไทย (สั้น เป็นทางการ)

```
เรียน คณบดี/ผู้อำนวยการ [ชื่อหน่วยงาน]

ผม/ดิฉัน [ชื่อ Mythos] ผู้ก่อตั้งโครงการ OpenThai.ai 
ขอแนะนำตัวในฐานะทีมที่กำลังพัฒนา Large Language Model ภาษาไทยแบบ Open Source

เราเชื่อว่า [ชื่อสถาบัน] มีบทบาทสำคัญในการ:
1. ร่วมสร้าง Thai Corpus คุณภาพสูง (งานวิจัย + วิทยานิพนธ์ภาษาไทย)
2. ให้นักศึกษา CS ได้ทดลองกับโมเดล real-world
3. ร่วมประเมินผล (Thai Eval Suite) ที่เปิดสาธารณะ

ข้อเสนอความร่วมมือเบื้องต้น:
- Credit ชื่อสถาบันใน model card และเอกสาร
- นักศึกษาปริญญาโท/เอกที่สนใจเป็น collaborator
- Demo และ API access ฟรีสำหรับงานวิจัย

สนใจนัดหารือ 30 นาทีผ่าน Zoom ได้ไหมครับ/ค่ะ?

ขอแสดงความนับถือ
[ชื่อ Mythos]
openthai.ai | github.com/openthai-ai
```

### มหาวิทยาลัย 5 อันดับแรกที่ควรส่ง
(ตาม flash-brief-partnerships.md)
1. จุฬาลงกรณ์มหาวิทยาลัย — ภาควิชา CS + ภาษาศาสตร์
2. มหาวิทยาลัยมหิดล — AI/ML research
3. KMITL — Engineering + AI
4. มหาวิทยาลัยเชียงใหม่ — ภาคเหนือ + multilingual
5. NIDA — Data Science

---

## E. KPI วัดความสำเร็จ Community Launch

| ตัวชี้วัด | เป้า 30 วัน | เป้า 90 วัน | วิธีวัด |
|----------|------------|------------|---------|
| GitHub Stars | 50 | 200 | github.com/openthai-ai |
| Discord Members | 50 | 200 | Discord server insights |
| GitHub Discussions | 5 threads | 20 threads | manual count |
| Contributors (PR ≥ 1) | 3 | 15 | GitHub contributors page |
| University contacts | 2 | 5 | tracking spreadsheet |

---

**สิ่งที่ยังไม่ได้ทำ:** สร้าง GitHub Actions สำหรับ auto-welcome contributors, Event แรก (Hackathon/Workshop)
