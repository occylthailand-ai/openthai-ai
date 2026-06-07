// ── Growth hooks: strings (th/en/zh) + helpers ────────────────────────────────
// FOMO + habit loop + gamification — frontend + localStorage only (no backend)

export const GROWTH = {
  th: {
    social: {
      names: ['คุณแพร', 'คุณมิน', 'คุณโจ', 'คุณนก', 'คุณต้น', 'คุณฟ้า', 'คุณบีม', 'คุณแอน', 'คุณกานต์', 'คุณอ้อม'],
      cities: ['กรุงเทพฯ', 'เชียงใหม่', 'ขอนแก่น', 'ภูเก็ต', 'อุบลฯ', 'โคราช', 'หาดใหญ่', 'ชลบุรี'],
      products: ['ผ้าไหมอุบล', 'น้ำพริกป้าแดง', 'เซรั่มข้าวหอม', 'กาแฟดอยช้าง', 'สบู่มะขาม', 'ทุเรียนทอด', 'ครีมสมุนไพร', 'ขนมไทย'],
      template: '{name} จาก {city} เพิ่งสร้างคอนเทนต์ "{product}"',
      ago: '{mins} นาทีที่แล้ว',
      live: 'กำลังใช้งานสด',
    },
    streak: {
      day1: 'เริ่ม Streak วันแรก! 🔥 กลับมาพรุ่งนี้รับโบนัสเพิ่ม',
      title: '🔥 ใช้ต่อเนื่อง {days} วันแล้ว!',
      reward: '+{credits} เครดิตฟรีวันนี้ 🎁',
      keepgoing: 'อย่าให้ Streak ขาดนะ! กลับมาทุกวันรับเครดิตเพิ่มเรื่อยๆ',
    },
    exit: {
      tag: 'ข้อเสนอพิเศษ',
      title: 'เดี๋ยวก่อน! 🎁',
      headline: 'รับส่วนลด 50% เดือนแรก',
      desc: 'เฉพาะตอนนี้เท่านั้น — สมัคร Pro ก่อนหมดเวลา ลดทันทีครึ่งราคา',
      expires: 'ข้อเสนอหมดอายุใน',
      cta: 'รับส่วนลด 50% →',
      dismiss: 'ไม่ล่ะ ขอบคุณ',
    },
    spin: {
      title: '🎡 หมุนรับของขวัญต้อนรับ!',
      desc: 'ผู้ใช้ใหม่หมุนได้ 1 ครั้ง รับรางวัลฟรีทันที',
      button: 'หมุนเลย!',
      spinning: 'กำลังหมุน...',
      won: '🎉 ยินดีด้วย! คุณได้รับ',
      claim: 'รับรางวัล & เริ่มใช้ฟรี →',
      prizes: ['เครดิตฟรี 5 ครั้ง', 'ส่วนลด 30%', 'เครดิตฟรี 3 ครั้ง', 'ส่วนลด 50%', 'Pro ฟรี 3 วัน', 'เครดิตฟรี 10 ครั้ง'],
    },
  },

  en: {
    social: {
      names: ['Prae', 'Min', 'Joe', 'Nok', 'Ton', 'Fah', 'Beam', 'Ann', 'Kan', 'Aom'],
      cities: ['Bangkok', 'Chiang Mai', 'Khon Kaen', 'Phuket', 'Ubon', 'Korat', 'Hat Yai', 'Chonburi'],
      products: ['Ubon silk', 'chili paste', 'rice serum', 'Doi Chang coffee', 'tamarind soap', 'crispy durian', 'herbal cream', 'Thai desserts'],
      template: '{name} from {city} just created content for "{product}"',
      ago: '{mins} min ago',
      live: 'Live now',
    },
    streak: {
      day1: 'Day 1 streak started! 🔥 Come back tomorrow for a bonus',
      title: '🔥 {days}-day streak!',
      reward: '+{credits} free credits today 🎁',
      keepgoing: "Don't break your streak! Come back daily for more credits",
    },
    exit: {
      tag: 'Special offer',
      title: 'Wait! 🎁',
      headline: 'Get 50% off your first month',
      desc: 'Right now only — subscribe to Pro before time runs out and save half',
      expires: 'Offer expires in',
      cta: 'Claim 50% off →',
      dismiss: 'No thanks',
    },
    spin: {
      title: '🎡 Spin your welcome gift!',
      desc: 'New users get 1 spin — win a free reward instantly',
      button: 'Spin now!',
      spinning: 'Spinning...',
      won: '🎉 Congrats! You won',
      claim: 'Claim & start free →',
      prizes: ['5 free credits', '30% off', '3 free credits', '50% off', '3 days Pro free', '10 free credits'],
    },
  },

  zh: {
    social: {
      names: ['小芮', '小敏', '小乔', '小鸟', '阿天', '小霏', '小冰', '小安', '阿坎', '小翁'],
      cities: ['曼谷', '清迈', '孔敬', '普吉', '乌汶', '呵叻', '合艾', '春武里'],
      products: ['乌汶丝绸', '辣椒酱', '大米精华液', '象山咖啡', '罗望子香皂', '榴莲脆片', '草本面霜', '泰式甜点'],
      template: '{city}的{name} 刚刚生成了"{product}"的内容',
      ago: '{mins} 分钟前',
      live: '实时在线',
    },
    streak: {
      day1: '连续打卡第 1 天开始！🔥 明天回来领奖励',
      title: '🔥 已连续使用 {days} 天！',
      reward: '今天 +{credits} 免费额度 🎁',
      keepgoing: '别让连续记录中断！每天回来领更多额度',
    },
    exit: {
      tag: '专属优惠',
      title: '等一下！🎁',
      headline: '首月立享 5 折',
      desc: '仅限现在 — 在倒计时结束前开通 Pro，立省一半',
      expires: '优惠倒计时',
      cta: '领取 5 折 →',
      dismiss: '不用了，谢谢',
    },
    spin: {
      title: '🎡 转动你的欢迎礼物！',
      desc: '新用户可转 1 次 — 立即赢取免费奖励',
      button: '立即转动！',
      spinning: '转动中...',
      won: '🎉 恭喜！你赢得了',
      claim: '领取并免费开始 →',
      prizes: ['5 次免费额度', '30% 折扣', '3 次免费额度', '50% 折扣', 'Pro 免费 3 天', '10 次免费额度'],
    },
  },
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const KEY = 'otai_growth';

export function loadGrowth() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function saveGrowth(patch) {
  try {
    const cur = loadGrowth();
    localStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
  } catch { /* ignore */ }
}

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const strings = (lang) => GROWTH[lang] || GROWTH.th;
