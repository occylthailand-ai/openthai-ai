# Shared Navigation + Auth Layer Spec — OpenThai.ai

**Wave 8, Task 8.5 | สร้าง: 14 ก.ย. 2569**  
เสิร์ฟกลุ่มผู้ใช้: ทุกกลุ่ม (UX ที่ดีขึ้นสำหรับทุกคน)  
เจ้าของ: frontend-engineer

---

## สถานะปัจจุบัน (ก่อน Wave 8)

แต่ละ Portal มี navigation แยกกัน:
- Producer, Intermediary, Consumer, Professional, Gov, Affiliate, Creator
- ไม่มี Single Sign-On — user ต้อง login แต่ละ portal แยก
- ไม่มี Portal Switcher — ต้องเปลี่ยน URL เอง

---

## A. Navigation Architecture

### Top Navigation Bar (ใช้ร่วมกันทุก 7 Portal)

```
┌────────────────────────────────────────────────────────────┐
│  [🏠 OpenThai.ai]  [▼ เลือก Portal]  TH ZH EN  [👤 Login] │
└────────────────────────────────────────────────────────────┘
        ^                    ^              ^          ^
     Logo + home       Portal Switcher  Lang Switch  Auth
```

**สิ่งที่แสดงในทุก Portal:**
- Logo: `OpenThai.ai` + ชื่อ Portal ปัจจุบัน (เช่น `— ผู้บริโภค`)
- Portal Switcher: dropdown รายชื่อ 7 Portal
- Language: TH (default) / ZH / EN
- Auth: แสดงชื่อผู้ใช้ถ้า login แล้ว / ปุ่ม "เข้าสู่ระบบ" ถ้ายังไม่ login

### Portal Switcher — รายการ 7 Portal

| Portal | Path | กลุ่มผู้ใช้ | ไอคอน |
|--------|------|-----------|-------|
| ผู้ผลิต | `/producer` | กลุ่ม 1 | 🌾 |
| คนกลาง | `/intermediary` | กลุ่ม 2 | 🤝 |
| ผู้บริโภค | `/consumer` | กลุ่ม 4 | 🛒 |
| วิชาชีพ | `/professional` | กลุ่ม 6 | 💼 |
| หน่วยงานรัฐ | `/gov` | กลุ่ม 5 | 🏛️ |
| Affiliate | `/affiliate` | กลุ่ม 3 | 📊 |
| Creator | `/creator` | กลุ่ม 3 | ✍️ |

---

## B. Authentication Flow

### ตัวเลือก: JWT + Refresh Token

เหตุผลที่เลือก JWT:
- stateless — รองรับ On-Premise ง่าย
- ไม่ต้อง session store กลาง
- compatible กับ mobile/API access

**Token config:**
- Access token: 15 นาที
- Refresh token: 7 วัน (stored in `httpOnly cookie`)
- PDPA: ไม่เก็บ sensitive data ใน token payload นอกจาก `user_id` + `roles`

**Guest Mode:**
- ใช้ได้: ค้นหา, อ่านข้อมูลทั่วไป, ใช้ AI tools บางส่วน (ไม่เกิน 5 requests/วัน)
- ต้อง login: บันทึกประวัติ, ใช้ API quota เต็ม, Affiliate dashboard

### Phase 2 — LINE Login (ภายหลัง)
- LINE OAuth 2.0 — คนไทยมี LINE ทุกคน
- ลด friction ในการสมัคร
- ต้องใช้ LINE Login channel ที่ขอ verify กับ LINE

---

## C. React Components

### Component Tree

```
<AppShell portalId="consumer" lang="th">
  <TopNav />
    <Logo />
    <PortalSwitcher currentPortal="consumer" />
    <LangSwitcher current="th" />
    <AuthSection />
      <UserMenu />         ← ถ้า login แล้ว
      <LoginButton />      ← ถ้ายังไม่ login
  <AuthModal />            ← modal สำหรับ login/register
  <main>
    {children}             ← content ของแต่ละ portal
  </main>
</AppShell>
```

### Props Interface

```typescript
// AppShell
interface AppShellProps {
  portalId: 'producer' | 'intermediary' | 'consumer' | 'professional'
            | 'gov' | 'affiliate' | 'creator'
  lang?: 'th' | 'zh' | 'en'
  children: React.ReactNode
}

// TopNav
interface TopNavProps {
  currentPortal: string
  currentLang: string
  user?: { name: string; avatar?: string } | null
  onLangChange: (lang: string) => void
  onLoginClick: () => void
  onLogout: () => void
}

// PortalSwitcher
interface PortalSwitcherProps {
  current: string
  portals: Array<{ id: string; name: string; path: string; icon: string }>
  onSwitch: (portalId: string) => void
}

// AuthModal
interface AuthModalProps {
  isOpen: boolean
  mode: 'login' | 'register' | 'forgot-password'
  onSuccess: (user: User) => void
  onClose: () => void
}

// UserMenu
interface UserMenuProps {
  user: { name: string; avatar?: string; roles: string[] }
  onLogout: () => void
  onProfileClick: () => void
}
```

---

## D. Implementation Priority

### Phase 1 — Wave 9 (ทำได้ทันที ไม่ต้องรอ auth)
- `<AppShell>` wrapper
- `<TopNav>` + `<PortalSwitcher>`
- `<LangSwitcher>` (สลับ i18n ที่มีอยู่แล้ว)
- Guest mode (ไม่มี auth)
- ลิงก์ portal ต่าง ๆ ทำงานได้

### Phase 2 — Wave 10
- `<AuthModal>` (login/register)
- JWT auth flow
- `<UserMenu>` (profile dropdown)
- Protected routes

### Phase 3 — Wave 11
- LINE Login OAuth
- Social sharing (แชร์ผลลัพธ์ผ่าน LINE)
- Notification (LINE Notify)

---

## E. Design Tokens (Tailwind CSS)

```css
/* ใน globals.css หรือ tailwind.config.js */
:root {
  --nav-height: 56px;
  --nav-bg: #1a1a2e;           /* dark navy — Thai flag inspired */
  --nav-text: #ffffff;
  --nav-accent: #e63946;       /* Thai red */
  --portal-switcher-bg: #16213e;
}
```

---

## F. ตัวอย่าง usage ในหน้า ConsumerPortalPage.jsx

```jsx
// frontend/src/pages/ConsumerPortalPage.jsx
import AppShell from '@/components/AppShell'

export default function ConsumerPortalPage() {
  return (
    <AppShell portalId="consumer" lang="th">
      {/* content เดิม */}
    </AppShell>
  )
}
```

---

**สิ่งที่ยังไม่ได้ทำ:** implement Phase 1 components จริง (Wave 9), unit tests, Storybook stories
