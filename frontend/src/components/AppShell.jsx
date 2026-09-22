/**
 * AppShell — Shared Navigation + Layout (Phase 1: no auth)
 * Wave 9, Task 9.1
 *
 * ครอบทุก Portal ด้วย TopNav ร่วมกัน
 * Phase 1: Portal switcher + Language switcher (ไม่มี auth)
 * Phase 2: JWT auth + UserMenu (Wave 10)
 *
 * เสิร์ฟกลุ่มผู้ใช้: ทุกกลุ่ม
 */

import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// ── Portal registry ──────────────────────────────────────────────────────────

const PORTALS = [
  { id: 'producer',      name: 'ผู้ผลิต',        path: '/producer',      icon: '🌾', group: 1 },
  { id: 'intermediary',  name: 'คนกลาง',         path: '/intermediary',  icon: '🤝', group: 2 },
  { id: 'consumer',      name: 'ผู้บริโภค',      path: '/consumer',      icon: '🛒', group: 4 },
  { id: 'professional',  name: 'วิชาชีพ',         path: '/professional',  icon: '💼', group: 6 },
  { id: 'gov',           name: 'หน่วยงานรัฐ',    path: '/gov',           icon: '🏛️', group: 5 },
  { id: 'affiliate',     name: 'Affiliate',       path: '/affiliate',     icon: '📊', group: 3 },
  { id: 'creator',       name: 'Creator',         path: '/creative-guild',icon: '✍️', group: 3 },
]

const LANGUAGES = [
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'EN',   flag: '🇺🇸' },
]

// ── Hooks ────────────────────────────────────────────────────────────────────

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      handler(e)
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

// ── PortalSwitcher ────────────────────────────────────────────────────────────

function PortalSwitcher({ currentPortalId }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  const current = PORTALS.find(p => p.id === currentPortalId) || PORTALS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm
                   bg-white/10 hover:bg-white/20 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <span className="ml-1 opacity-70">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 mt-1 w-44 bg-white shadow-lg rounded-lg
                     border border-gray-200 py-1 z-50 text-gray-800"
        >
          {PORTALS.map(portal => (
            <li key={portal.id} role="option" aria-selected={portal.id === currentPortalId}>
              <Link
                to={portal.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50
                            ${portal.id === currentPortalId ? 'font-semibold text-blue-700 bg-blue-50' : ''}`}
              >
                <span>{portal.icon}</span>
                <span>{portal.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── LangSwitcher ─────────────────────────────────────────────────────────────

function LangSwitcher({ lang, onLangChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => onLangChange(l.code)}
          title={l.label}
          className={`px-2 py-1 text-xs rounded transition-colors
                      ${lang === l.code
                        ? 'bg-white/25 font-bold'
                        : 'hover:bg-white/10 opacity-70'}`}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ── TopNav ────────────────────────────────────────────────────────────────────

function TopNav({ portalId, lang, onLangChange, onMobileMenuToggle }) {
  const current = PORTALS.find(p => p.id === portalId)
  const navigate = useNavigate()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3
                 bg-[#1a1a2e] text-white shadow-md"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-1 font-bold text-base shrink-0 hover:opacity-90"
      >
        <span className="text-[#e63946]">Open</span>
        <span>Thai.ai</span>
        {current && (
          <span className="hidden sm:inline ml-1 text-xs font-normal opacity-60">
            — {current.name}
          </span>
        )}
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Portal Switcher */}
      <PortalSwitcher currentPortalId={portalId} />

      {/* Lang Switcher */}
      <LangSwitcher lang={lang} onLangChange={onLangChange} />

      {/* Auth button (Phase 1: placeholder) */}
      <button
        className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm rounded-md
                   bg-[#e63946] hover:bg-[#c1121f] transition-colors"
        onClick={() => navigate('/login')}
        title="Phase 2: JWT auth"
      >
        เข้าสู่ระบบ
      </button>

      {/* Mobile hamburger */}
      <button
        className="sm:hidden p-1.5 rounded hover:bg-white/10"
        onClick={onMobileMenuToggle}
        aria-label="เมนู"
      >
        ☰
      </button>
    </nav>
  )
}

// ── MobileMenu ────────────────────────────────────────────────────────────────

function MobileMenu({ open, onClose }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-30 bg-black/50"
      onClick={onClose}
    >
      <div
        className="absolute top-14 left-0 right-0 bg-[#16213e] text-white p-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs opacity-50 mb-2">เลือก Portal</p>
        <div className="grid grid-cols-2 gap-2">
          {PORTALS.map(portal => (
            <Link
              key={portal.id}
              to={portal.path}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
            >
              <span>{portal.icon}</span>
              <span>{portal.name}</span>
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <Link
            to="/login"
            onClick={onClose}
            className="block w-full text-center py-2 bg-[#e63946] rounded text-sm"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── AppShell (main export) ────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string} props.portalId  — 'producer'|'intermediary'|'consumer'|'professional'|'gov'|'affiliate'|'creator'
 * @param {string} [props.lang]    — 'th'|'zh'|'en' (default: 'th')
 * @param {React.ReactNode} props.children
 */
export default function AppShell({ portalId, lang: initialLang = 'th', children }) {
  const [lang, setLang] = useState(initialLang)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav
        portalId={portalId}
        lang={lang}
        onLangChange={setLang}
        onMobileMenuToggle={() => setMobileOpen(o => !o)}
      />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Push content below fixed nav */}
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
