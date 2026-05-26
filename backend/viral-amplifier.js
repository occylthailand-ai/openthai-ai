// viral-amplifier.js — Viral Auto-Boost Engine
// ✅ Compliant with TikTok, Facebook, LINE, Instagram platform rules
// ❌ No fake engagement, no bots, no coordinated inauthentic behavior
//
// Strategy: real members sharing real content to real audiences
//           at optimal times with optimal hashtags — 100% organic amplification

// ── Thai Peak Hours (Bangkok UTC+7) ──────────────────────────────────────────
// Source: Thai social media research — highest organic reach windows
const THAI_PEAK_WINDOWS = [
  { start: 7,  end: 9,  label: 'เช้า', multiplier: 1.4 },
  { start: 12, end: 13, label: 'เที่ยง', multiplier: 1.2 },
  { start: 19, end: 22, label: 'เย็น-ดึก', multiplier: 2.0 }, // highest
];

// Platform-specific rate limits (to avoid spam flags)
const PLATFORM_LIMITS = {
  tiktok:    { postsPerDay: 3,  minGapMinutes: 60  },
  facebook:  { postsPerDay: 5,  minGapMinutes: 30  },
  instagram: { postsPerDay: 3,  minGapMinutes: 120 },
  line:      { postsPerDay: 10, minGapMinutes: 15  },
};

export function getNextPeakTime(platform = 'tiktok', lastPostTime = null) {
  const now   = new Date();
  const bkkOffset = 7 * 60; // Bangkok UTC+7
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const bkkHour = Math.floor((utcMin + bkkOffset) / 60) % 24;

  const limit = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.tiktok;

  // Respect min gap
  if (lastPostTime) {
    const gapMs = Date.now() - new Date(lastPostTime).getTime();
    const gapMin = gapMs / 60000;
    if (gapMin < limit.minGapMinutes) {
      const waitMs = (limit.minGapMinutes - gapMin) * 60000;
      return { time: new Date(Date.now() + waitMs), reason: `rate_limit_gap`, waitMinutes: Math.ceil(limit.minGapMinutes - gapMin) };
    }
  }

  // Find next peak window
  for (const win of THAI_PEAK_WINDOWS) {
    if (bkkHour >= win.start && bkkHour < win.end) {
      // Currently in peak window — post now
      return { time: new Date(), reason: `in_peak_${win.label}`, multiplier: win.multiplier, postNow: true };
    }
  }

  // Find next peak window (could be today or tomorrow)
  let closestMs = Infinity;
  let chosenWin = null;
  for (const win of THAI_PEAK_WINDOWS) {
    let hoursUntil = win.start - bkkHour;
    if (hoursUntil <= 0) hoursUntil += 24;
    const ms = hoursUntil * 3600000;
    if (ms < closestMs) { closestMs = ms; chosenWin = win; }
  }

  return {
    time: new Date(Date.now() + closestMs),
    reason: `next_peak_${chosenWin?.label}`,
    multiplier: chosenWin?.multiplier || 1,
    waitMinutes: Math.round(closestMs / 60000),
    postNow: false,
  };
}

// ── Trending Hashtag Injector ─────────────────────────────────────────────────
// Injects today's trending hashtags while preserving existing ones
// Deduplicates, caps at maxHashtags to stay platform-safe
export async function injectTrendingHashtags(content, apiBase, maxHashtags = 12) {
  const existing = new Set((content.hashtags || []).map(h => h.toLowerCase()));

  let trending = [];
  try {
    const res = await fetch(`${apiBase}/api/trending`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      trending = (data.hashtags || [])
        .filter(h => h.hot !== false)
        .map(h => h.tag || h)
        .filter(t => !existing.has(t.toLowerCase()))
        .slice(0, 5);
    }
  } catch (_) { /* trending fetch non-critical */ }

  const combined = [...(content.hashtags || []), ...trending];
  return {
    ...content,
    hashtags: combined.slice(0, maxHashtags),
    _trending_injected: trending.length,
  };
}

// ── Viral Score Calculator ────────────────────────────────────────────────────
// Scores content quality 0–100 based on hook, hashtags, length
export function calcViralScore(content) {
  let score = 0;

  // Hook quality (strong openers = viral)
  const hook = content.hook || '';
  if (/^[😱🔥💥⚡🎯🚨]/.test(hook)) score += 15;   // emoji opener
  if (/\?$/.test(hook.trim()))          score += 10;   // question hook
  if (hook.length >= 20 && hook.length <= 80) score += 10; // right length
  if (/ราคา|ลด|ฟรี|โปร|แจก/.test(hook)) score += 15; // deal language

  // Hashtag quantity (8-12 is optimal for TikTok)
  const tagCount = (content.hashtags || []).length;
  if (tagCount >= 8 && tagCount <= 12) score += 20;
  else if (tagCount >= 5) score += 10;

  // Script/caption quality
  const caption = content.caption || '';
  if (caption.length >= 50) score += 10;
  if (/สั่ง|ซื้อ|ลิงก์|กด/.test(caption)) score += 10; // CTA

  // Platform-specific bonuses
  if (content.script && Array.isArray(content.script) && content.script.length >= 3) score += 10;

  return Math.min(score, 100);
}

// ── Network Amplification Pool ────────────────────────────────────────────────
// Members opt-in to amplify each other's content
// Each amplification uses the AMPLIFIER'S affiliate link (not original poster's)
// → completely legitimate: real people sharing content to real audiences

export class NetworkAmplifier {
  constructor(storage) {
    this.pool   = storage.pool   || [];  // { memberId, refCode, platforms, active, joinedAt }
    this.queue  = storage.queue  || [];  // { postId, content, product, originalRef, viralScore, createdAt, amplifiedBy[] }
    this.save   = storage.save;
  }

  // Member joins amplification network
  join(memberId, refCode, platforms = ['line', 'facebook']) {
    const existing = this.pool.find(m => m.memberId === memberId);
    if (existing) { existing.active = true; existing.platforms = platforms; }
    else this.pool.push({ memberId, refCode, platforms, active: true, joinedAt: new Date().toISOString() });
    this.save();
    return { ok: true, message: 'เข้าร่วม Amplification Network แล้ว' };
  }

  // Member leaves network
  leave(memberId) {
    const m = this.pool.find(m => m.memberId === memberId);
    if (m) m.active = false;
    this.save();
    return { ok: true };
  }

  // Submit a post for network amplification
  submitPost(content, product, originalRef, affLinkBuilder) {
    const score = calcViralScore(content);
    if (score < 40) return { ok: false, reason: 'viral_score_too_low', score }; // don't amplify weak content

    const postId = `amp_${Date.now()}`;
    this.queue.push({
      postId,
      content,
      product,
      originalRef,
      viralScore: score,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(), // 24h window
      amplifiedBy: [],
      totalAmplifications: 0,
    });

    // Keep queue lean (max 50 active posts)
    this.queue = this.queue
      .filter(p => new Date(p.expiresAt) > new Date())
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 50);

    this.save();
    return { ok: true, postId, viralScore: score };
  }

  // Get posts available for a member to amplify (excluding their own, not yet amplified)
  getAmplifyQueue(memberId, limit = 5) {
    const now = new Date();
    return this.queue
      .filter(p =>
        p.originalRef !== this.pool.find(m => m.memberId === memberId)?.refCode &&
        !p.amplifiedBy.includes(memberId) &&
        new Date(p.expiresAt) > now
      )
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, limit);
  }

  // Record that a member amplified a post
  recordAmplification(postId, memberId) {
    const post = this.queue.find(p => p.postId === postId);
    if (!post) return { ok: false, reason: 'post_not_found' };
    if (post.amplifiedBy.includes(memberId)) return { ok: false, reason: 'already_amplified' };

    post.amplifiedBy.push(memberId);
    post.totalAmplifications = post.amplifiedBy.length;
    this.save();
    return { ok: true, totalAmplifications: post.totalAmplifications };
  }

  stats() {
    return {
      network_size: this.pool.filter(m => m.active).length,
      active_posts:  this.queue.filter(p => new Date(p.expiresAt) > new Date()).length,
      total_amplifications: this.queue.reduce((s, p) => s + p.totalAmplifications, 0),
    };
  }
}

// ── Viral Velocity Tracker ────────────────────────────────────────────────────
// Tracks post performance over time to identify viral content for recycling
export class VelocityTracker {
  constructor(storage) {
    this.posts = storage.posts || []; // { postId, content, platform, postedAt, clicks, ref_code }
    this.save  = storage.save;
  }

  record(postId, content, platform, refCode) {
    this.posts.push({ postId, content, platform, postedAt: new Date().toISOString(), clicks: 0, refCode, viralScore: calcViralScore(content) });
    this.posts = this.posts.slice(-500); // keep last 500
    this.save();
  }

  addClick(postId) {
    const p = this.posts.find(p => p.postId === postId);
    if (p) { p.clicks = (p.clicks || 0) + 1; this.save(); }
  }

  // Get top-performing content worth recycling (posted >3 days ago, high viral score)
  getRecycleQueue(limit = 5) {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    return this.posts
      .filter(p => new Date(p.postedAt) < threeDaysAgo && p.viralScore >= 60)
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, limit);
  }
}
