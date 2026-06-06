import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Supported languages ───────────────────────────────────────────────────────
export const LANGS = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'english' },
  { code: 'zh', label: '中文' },
];

// ── Translation dictionary ────────────────────────────────────────────────────
// เพิ่มคีย์ได้เรื่อยๆ — ถ้าภาษาไหนไม่มีคีย์ จะ fallback เป็นไทยแล้วเป็น key
const translations = {
  th: {
    'nav.affiliate': '💰 Affiliate',
    'nav.pricing': 'ราคา',
    'nav.login': 'Login',
    'nav.freeCta': 'ใช้ฟรีตอนนี้ →',
    'lang.label': 'ภาษา',
    'hero.badge': '🔥 คนไทยกว่า 1,200 คนใช้แล้ว — ทดลองฟรีวันนี้!',
    'hero.line1': 'สร้างคอนเทนต์ TikTok ปัง',
    'hero.line3': 'ใน 10 วินาที ด้วย AI ไทยแท้',
    'hero.sub1': 'ไม่ต้องคิดสคริปต์ ไม่ต้องเขียนแคปชั่น ไม่ต้องหาแฮชแท็ก',
    'hero.sub2': 'Openthai.ai สร้างครบเซ็ตพร้อมโพสต์ทันที ภาษาไทยธรรมชาติ',
    'hero.ctaFree': '🎁 ใช้ฟรี 3 ครั้ง — ไม่ต้องสมัคร!',
    'hero.ctaPricing': 'ดูราคา →',
    'typing': ['ผ้าไหมอุบล', 'น้ำพริกป้าแดง', 'เซรั่มข้าวหอม', 'กาแฟดอยช้าง', 'สบู่มะขาม'],
  },
  en: {
    'nav.affiliate': '💰 Affiliate',
    'nav.pricing': 'Pricing',
    'nav.login': 'Login',
    'nav.freeCta': 'Try Free Now →',
    'lang.label': 'Language',
    'hero.badge': '🔥 1,200+ Thai creators already onboard — try free today!',
    'hero.line1': 'Create viral TikTok content',
    'hero.line3': 'in 10 seconds with authentic Thai AI',
    'hero.sub1': 'No scripts, no captions, no hashtag hunting',
    'hero.sub2': 'Openthai.ai builds the whole set ready to post — in natural Thai',
    'hero.ctaFree': '🎁 3 free generations — no signup!',
    'hero.ctaPricing': 'See Pricing →',
    'typing': ['Ubon silk', "Aunt Daeng's chili paste", 'rice serum', 'Doi Chang coffee', 'tamarind soap'],
  },
  zh: {
    'nav.affiliate': '💰 联盟',
    'nav.pricing': '价格',
    'nav.login': '登录',
    'nav.freeCta': '立即免费试用 →',
    'lang.label': '语言',
    'hero.badge': '🔥 超过 1,200 位泰国创作者已在使用 — 今天免费试用！',
    'hero.line1': '打造爆款 TikTok 内容',
    'hero.line3': '用正宗泰国 AI，10 秒搞定',
    'hero.sub1': '无需脚本、无需文案、无需找标签',
    'hero.sub2': 'Openthai.ai 一键生成整套内容，立即发布 — 自然地道泰语',
    'hero.ctaFree': '🎁 免费生成 3 次 — 无需注册！',
    'hero.ctaPricing': '查看价格 →',
    'typing': ['乌汶丝绸', '阿姨辣椒酱', '大米精华液', '象山咖啡', '罗望子香皂'],
  },
};

const LanguageContext = createContext(null);

const read = (key, lang) => {
  const dict = translations[lang] || translations.th;
  if (key in dict) return dict[key];
  return key in translations.th ? translations.th[key] : key;
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('otai_lang') || 'th'; } catch { return 'th'; }
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('otai_lang', l); } catch { /* ignore */ }
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);

  const t = useCallback((key) => read(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langs: LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
}

// resilient: ใช้ได้แม้ไม่มี Provider (fallback ไทย) — กัน component แตกตอนเทสต์
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return { lang: 'th', setLang: () => {}, t: (key) => read(key, 'th'), langs: LANGS };
}
