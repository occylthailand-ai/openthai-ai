// tier-system.js — Creator Tier + Token Economy + Affect Network
//
// Tier ladder based on verified monthly earnings (บาท/เดือน):
//   ลูกค้าระดับ Starter → Creator → Pro → Elite → Champion → Legend
//
// Token = daily posting budget per platform (prevents spam, stays within platform rules)
// Affect = Elite+ can amplify other customers' feed (expanding circle of influence)
// Retention flywheel: earn more → tier up → more reach → earn more → stay forever

// ── Tier Definitions ──────────────────────────────────────────────────────────
export const TIERS = [
  {
    name: 'starter', label: 'ลูกค้าระดับ 🌱 Starter', minMonthly: 0,
    color: '#64748b', bgColor: '#1e293b',
    tokensPerDay: { tiktok: 3, facebook: 5, instagram: 2, line: 8 },
    affectQuota: 0,       // cannot affect others yet
    commissionBoost: 0,   // no boost on top of base rate
    badge: '🌱',
    perks: ['สร้างคอนเทนต์ AI ไม่จำกัด', 'Affiliate link อัตโนมัติ', 'โพสต์อัตโนมัติ 3 platform'],
  },
  {
    name: 'creator', label: 'ลูกค้าระดับ ✨ Creator', minMonthly: 1_000,
    color: '#10b981', bgColor: '#022c22',
    tokensPerDay: { tiktok: 6, facebook: 10, instagram: 5, line: 15 },
    affectQuota: 0,
    commissionBoost: 0.02, // +2% on top of base
    badge: '✨',
    perks: ['ทุกอย่างใน ลูกค้าระดับ 🌱 Starter', '+2% commission พิเศษ', 'ตั้งเวลาโพสต์ล่วงหน้า 7 วัน', 'Priority AI response'],
  },
  {
    name: 'pro', label: 'ลูกค้าระดับ 🔥 Pro', minMonthly: 5_000,
    color: '#3b82f6', bgColor: '#0c1a3d',
    tokensPerDay: { tiktok: 12, facebook: 20, instagram: 10, line: 30 },
    affectQuota: 0,
    commissionBoost: 0.05, // +5%
    badge: '🔥',
    perks: ['ทุกอย่างใน ลูกค้าระดับ ✨ Creator', '+5% commission', 'Content Recycler อัตโนมัติ', 'Analytics ขั้นสูง', 'Trending Alert แบบ realtime'],
  },
  {
    name: 'elite', label: 'ลูกค้าระดับ 💜 Elite', minMonthly: 10_000,
    color: '#8b5cf6', bgColor: '#1e0a3c',
    tokensPerDay: { tiktok: 20, facebook: 35, instagram: 18, line: 60 },
    affectQuota: 10,       // can affect 10 customers/day
    commissionBoost: 0.08, // +8%
    badge: '💜',
    perks: [
      'ทุกอย่างใน ลูกค้าระดับ 🔥 Pro',
      '+8% commission',
      '⭐ Affect Network: ช่วย boost ลูกค้าคนอื่น 10 คน/วัน',
      'รับ 3% bonus จากยอดที่ลูกค้าระดับอื่นขายได้',
      'Elite badge บน leaderboard',
      'ช่องทาง LINE support ตรง',
    ],
  },
  {
    name: 'champion', label: 'ลูกค้าระดับ 🏆 Champion', minMonthly: 30_000,
    color: '#f59e0b', bgColor: '#2d1a00',
    tokensPerDay: { tiktok: 35, facebook: 60, instagram: 30, line: 120 },
    affectQuota: 30,       // can affect 30 customers/day
    commissionBoost: 0.12, // +12%
    badge: '🏆',
    perks: [
      'ทุกอย่างใน ลูกค้าระดับ 💜 Elite',
      '+12% commission',
      '⭐ Affect Network: boost ลูกค้าคนอื่น 30 คน/วัน',
      'Radius ขยาย: รับ 5% จาก affected + 2% จาก sub-affected',
      'Champion badge + featured บน platform',
      'Priority listing ใน amplifier network',
    ],
  },
  {
    name: 'legend', label: 'ลูกค้าระดับ 👑 Legend', minMonthly: 100_000,
    color: '#fe2c55', bgColor: '#1a0010',
    tokensPerDay: { tiktok: 80, facebook: 150, instagram: 70, line: 300 },
    affectQuota: 100,      // can affect 100 customers/day
    commissionBoost: 0.20, // +20%
    badge: '👑',
    perks: [
      'ทุกอย่างใน ลูกค้าระดับ 🏆 Champion',
      '+20% commission (สูงสุด)',
      '👑 Affect Network: boost ไม่จำกัด (100 คน/วัน)',
      '3-layer radius: direct 5% + indirect 2% + extended 1%',
      'Legend badge + homepage feature',
      'Co-create content กับ Openthai.ai team',
      'Revenue share จาก platform growth',
    ],
  },
];

// ── Token Rate = Platform posts/day limit per tier ────────────────────────────
// These match platform-safe limits (won't trigger spam detection)
export const PLATFORM_RATE_LIMITS = {
  tiktok:    { maxPerDay: 80,  minGapMin: 45,  description: 'TikTok Studio auto-post' },
  facebook:  { maxPerDay: 150, minGapMin: 20,  description: 'Facebook Page + Group posts' },
  instagram: { maxPerDay: 70,  minGapMin: 60,  description: 'Instagram Feed + Stories' },
  line:      { maxPerDay: 300, minGapMin: 10,  description: 'LINE OA Broadcast + Notify' },
};

// ── Tier Calculator ───────────────────────────────────────────────────────────
export function getTierForEarnings(monthlyEarned) {
  return [...TIERS].reverse().find(t => monthlyEarned >= t.minMonthly) || TIERS[0];
}

export function getNextTier(currentTierName) {
  const idx = TIERS.findIndex(t => t.name === currentTierName);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function calcProgress(monthlyEarned, currentTierName) {
  const tier = TIERS.find(t => t.name === currentTierName) || TIERS[0];
  const next = getNextTier(currentTierName);
  if (!next) return { percent: 100, remaining: 0, label: '👑 สูงสุดแล้ว!' };
  const range   = next.minMonthly - tier.minMonthly;
  const gained  = monthlyEarned - tier.minMonthly;
  const percent = Math.min(Math.round((gained / range) * 100), 100);
  const remaining = next.minMonthly - monthlyEarned;
  return {
    percent,
    remaining,
    label: `อีก ฿${remaining.toLocaleString()} → ${next.label}`,
    nextTier: next,
  };
}

// ── Token Manager ─────────────────────────────────────────────────────────────
// Tracks daily token usage per member per platform
// Resets at midnight Bangkok time (UTC+7)

function bkkDateString() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

export class TokenManager {
  constructor(storage) {
    this.usage = storage.usage || {}; // { memberId: { date: 'YYYY-MM-DD', platforms: { tiktok: 2, ... } } }
    this.save  = storage.save;
  }

  _resetIfNewDay(memberId) {
    const today = bkkDateString();
    if (!this.usage[memberId] || this.usage[memberId].date !== today) {
      this.usage[memberId] = { date: today, platforms: {}, affectUsed: 0 };
    }
  }

  // How many tokens remain for this platform today
  remaining(memberId, platform, tierName) {
    this._resetIfNewDay(memberId);
    const tier  = TIERS.find(t => t.name === tierName) || TIERS[0];
    const quota = tier.tokensPerDay[platform] || 0;
    const used  = this.usage[memberId].platforms[platform] || 0;
    return Math.max(0, quota - used);
  }

  // Use a token — returns { ok, remaining, reason }
  useToken(memberId, platform, tierName) {
    const rem = this.remaining(memberId, platform, tierName);
    if (rem <= 0) {
      const tier = TIERS.find(t => t.name === tierName) || TIERS[0];
      return { ok: false, reason: `daily_limit_reached`, limit: tier.tokensPerDay[platform], platform };
    }
    this.usage[memberId].platforms[platform] = (this.usage[memberId].platforms[platform] || 0) + 1;
    this.save();
    return { ok: true, remaining: rem - 1, used: this.usage[memberId].platforms[platform] };
  }

  // Check + use affect quota (Elite+)
  useAffect(memberId, tierName) {
    this._resetIfNewDay(memberId);
    const tier  = TIERS.find(t => t.name === tierName) || TIERS[0];
    const quota = tier.affectQuota || 0;
    const used  = this.usage[memberId].affectUsed || 0;
    if (quota === 0) return { ok: false, reason: 'tier_too_low', minTier: 'elite' };
    if (used >= quota) return { ok: false, reason: 'affect_quota_reached', quota };
    this.usage[memberId].affectUsed = used + 1;
    this.save();
    return { ok: true, affectRemaining: quota - used - 1 };
  }

  summary(memberId, tierName) {
    this._resetIfNewDay(memberId);
    const tier    = TIERS.find(t => t.name === tierName) || TIERS[0];
    const usage   = this.usage[memberId] || { platforms: {}, affectUsed: 0 };
    const summary = {};
    for (const [p, quota] of Object.entries(tier.tokensPerDay)) {
      summary[p] = { quota, used: usage.platforms[p] || 0, remaining: Math.max(0, quota - (usage.platforms[p] || 0)) };
    }
    return {
      date: bkkDateString(),
      tier: tier.label,
      platforms: summary,
      affect: { quota: tier.affectQuota, used: usage.affectUsed || 0, remaining: Math.max(0, tier.affectQuota - (usage.affectUsed || 0)) },
    };
  }
}

// ── Affect Ledger ─────────────────────────────────────────────────────────────
// Tracks Elite+ affect actions and commission bonuses earned
export class AffectLedger {
  constructor(storage) {
    this.records = storage.records || []; // { affectorRef, targetRef, postId, affectedAt, bonusEarned }
    this.save    = storage.save;
  }

  record(affectorRef, targetRef, postId) {
    this.records.push({ affectorRef, targetRef, postId, affectedAt: new Date().toISOString(), bonusEarned: 0 });
    this.records = this.records.slice(-5000);
    this.save();
  }

  // When target member makes a sale, calculate bonus for each affector in their chain
  // Layer 1 (direct affect): 3-5% bonus (based on affector's tier)
  // Layer 2 (Champion sub-affect): 2% bonus
  // Layer 3 (Legend extended): 1% bonus
  calcAffectBonus(targetRef, saleAmount, affiliates) {
    const bonuses = [];

    // Layer 1: direct affectors
    const directAffectors = [...new Set(
      this.records
        .filter(r => r.targetRef === targetRef)
        .sort((a, b) => new Date(b.affectedAt) - new Date(a.affectedAt))
        .slice(0, 5) // max 5 recent affectors
        .map(r => r.affectorRef)
    )];

    for (const affRef of directAffectors) {
      const aff   = affiliates.find(a => a.ref_code === affRef);
      const tier  = TIERS.find(t => t.name === aff?.tier) || TIERS[0];
      const pct   = tier.name === 'legend' ? 0.05 : tier.name === 'champion' ? 0.05 : tier.name === 'elite' ? 0.03 : 0;
      if (pct > 0) bonuses.push({ ref: affRef, layer: 1, amount: saleAmount * pct, percent: pct });
    }

    // Layer 2: sub-affectors (Champion+ who affected the direct affectors)
    for (const direct of directAffectors) {
      const subAffectors = this.records
        .filter(r => r.targetRef === direct)
        .slice(-3)
        .map(r => r.affectorRef);
      for (const subRef of subAffectors) {
        const aff  = affiliates.find(a => a.ref_code === subRef);
        const tier = TIERS.find(t => t.name === aff?.tier) || TIERS[0];
        if (['champion', 'legend'].includes(tier.name)) {
          bonuses.push({ ref: subRef, layer: 2, amount: saleAmount * 0.02, percent: 0.02 });
        }
      }
    }

    return bonuses;
  }

  stats(refCode) {
    const given    = this.records.filter(r => r.affectorRef === refCode).length;
    const received = this.records.filter(r => r.targetRef   === refCode).length;
    const bonus    = this.records.filter(r => r.affectorRef === refCode).reduce((s, r) => s + (r.bonusEarned || 0), 0);
    return { given, received, bonus };
  }
}
