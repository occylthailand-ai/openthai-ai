// backend/autopost.js — OpenThaiAi Auto-Post Engine
// โพสต์ข้อความที่สร้างด้วย AI ไปทุกแพลตฟอร์มพร้อมกัน + affiliate link อัตโนมัติ
// แพลตฟอร์มที่รองรับ: Facebook Page, Instagram, TikTok, Twitter/X, LINE OA, Telegram, YouTube

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';

// ─── Platform configs ─────────────────────────────────────────────────────────
const PLATFORM_CONFIGS = {
  facebook: {
    name: 'Facebook',
    icon: '📘',
    maxChars: 63206,
    hashtagStyle: 'end',   // hashtags at end
    linkStyle: 'inline',
    enabled: () => !!(process.env.FB_PAGE_ID && process.env.FB_ACCESS_TOKEN),
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    maxChars: 2200,
    hashtagStyle: 'end',
    linkStyle: 'bio',      // link in bio only
    enabled: () => !!(process.env.IG_USER_ID && process.env.FB_ACCESS_TOKEN),
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    maxChars: 2200,
    hashtagStyle: 'inline',
    linkStyle: 'bio',
    enabled: () => !!(process.env.TIKTOK_ACCESS_TOKEN),
  },
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    maxChars: 280,
    hashtagStyle: 'inline',
    linkStyle: 'inline',
    enabled: () => !!(process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_API_KEY),
  },
  line: {
    name: 'LINE OA',
    icon: '💚',
    maxChars: 5000,
    hashtagStyle: 'none',
    linkStyle: 'inline',
    enabled: () => !!(process.env.LINE_CHANNEL_ACCESS_TOKEN),
  },
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    maxChars: 4096,
    hashtagStyle: 'end',
    linkStyle: 'inline',
    enabled: () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID),
  },
  youtube: {
    name: 'YouTube Community',
    icon: '▶️',
    maxChars: 5000,
    hashtagStyle: 'end',
    linkStyle: 'inline',
    enabled: () => !!(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID),
  },
};

// ─── Format content per platform ─────────────────────────────────────────────
function formatForPlatform(platform, content, trackingLink, hashtags = []) {
  const cfg = PLATFORM_CONFIGS[platform];
  if (!cfg) return null;

  const { hook, body, cta } = content;
  const tags = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');

  let text = '';
  if (platform === 'twitter') {
    // Twitter: hook only + link (280 chars)
    const linkPart = trackingLink ? ` ${trackingLink}` : '';
    const tagPart = tags ? ` ${tags.split(' ').slice(0, 3).join(' ')}` : '';
    text = `${hook}${linkPart}${tagPart}`.slice(0, 280);
  } else if (platform === 'instagram' || platform === 'tiktok') {
    // IG/TT: hook + body + cta (no link in post, put in bio)
    text = `${hook}\n\n${body}\n\n${cta}\n\n👇 ลิ้งในไบโอ\n\n${tags}`;
    text = text.slice(0, cfg.maxChars);
  } else if (platform === 'line') {
    // LINE: clean format, no hashtags
    text = `${hook}\n\n${body}\n\n${cta}\n\n🔗 ${trackingLink || ''}`;
  } else {
    // Facebook, Telegram, YouTube: full format
    const linkSection = trackingLink ? `\n\n🔗 ${trackingLink}` : '';
    const tagSection = tags ? `\n\n${tags}` : '';
    text = `${hook}\n\n${body}\n\n${cta}${linkSection}${tagSection}`;
    text = text.slice(0, cfg.maxChars);
  }
  return text;
}

// ─── Platform API callers ─────────────────────────────────────────────────────
async function postToFacebook(text, imageUrl) {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_ACCESS_TOKEN;
  const params = new URLSearchParams({ message: text, access_token: token });
  if (imageUrl) params.set('link', imageUrl);
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST', body: params,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Facebook API error');
  return { platform: 'facebook', post_id: data.id, url: `https://facebook.com/${data.id}` };
}

async function postToInstagram(text, imageUrl) {
  const igUserId = process.env.IG_USER_ID;
  const token = process.env.FB_ACCESS_TOKEN;
  if (!imageUrl) throw new Error('Instagram requires an image URL');
  // Step 1: Create media container
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    body: new URLSearchParams({ image_url: imageUrl, caption: text, access_token: token }),
  });
  const container = await createRes.json();
  if (container.error) throw new Error(container.error.message);
  // Step 2: Publish
  const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  });
  const pub = await pubRes.json();
  if (pub.error) throw new Error(pub.error.message);
  return { platform: 'instagram', post_id: pub.id, url: `https://instagram.com/p/${pub.id}` };
}

async function postToTwitter(text) {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Twitter API error');
  return { platform: 'twitter', post_id: data.data.id, url: `https://x.com/i/web/status/${data.data.id}` };
}

async function postToLine(text) {
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text }],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `LINE API error ${res.status}`);
  }
  return { platform: 'line', post_id: `line_${Date.now()}`, url: null };
}

async function postToTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Telegram API error');
  return { platform: 'telegram', post_id: String(data.result.message_id), url: `https://t.me/c/${chatId}/${data.result.message_id}` };
}

async function postToTikTok(text) {
  // TikTok Business API — text post (requires approved business account)
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/text/init/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      post_info: { title: text, privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
      source_info: { source: 'PULL_FROM_URL', video_url: process.env.TIKTOK_DEFAULT_VIDEO_URL || '' },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== 'ok') throw new Error(data.error?.message || 'TikTok API error');
  return { platform: 'tiktok', post_id: data.data?.publish_id || `tt_${Date.now()}`, url: null };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function createAutoPost(dataDir, deps = {}) {
  const POSTS_FILE = join(dataDir, 'autoposts.json');
  const { kvPush = async () => {}, addLog = () => {}, createTrackingLink = null } = deps;

  function loadPosts() {
    try {
      if (existsSync(POSTS_FILE)) return JSON.parse(readFileSync(POSTS_FILE, 'utf8'));
    } catch (_) {}
    return [];
  }

  function savePosts(posts) {
    try { writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8'); } catch (_) {}
  }

  // ── List enabled platforms ──────────────────────────────────────────────────
  function getEnabledPlatforms() {
    return Object.entries(PLATFORM_CONFIGS)
      .filter(([, cfg]) => cfg.enabled())
      .map(([id, cfg]) => ({ id, name: cfg.name, icon: cfg.icon }));
  }

  // ── Broadcast to all selected platforms — parallel via Promise.allSettled ──
  async function broadcast({ content, hashtags = [], imageUrl = null, affiliateRef = null, productId = null, targetPlatforms = null }) {
    const batchId = `post_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const platforms = targetPlatforms || Object.keys(PLATFORM_CONFIGS).filter(p => PLATFORM_CONFIGS[p].enabled());

    const TIMEOUT_MS = 12000;
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms))]);

    const settled = await Promise.allSettled(platforms.map(async (platform) => {
      const cfg = PLATFORM_CONFIGS[platform];
      if (!cfg) return { platform, status: 'skipped', reason: 'unknown platform' };
      if (!cfg.enabled()) return { platform, status: 'skipped', reason: 'no credentials' };

      let trackingLink = null;
      if (createTrackingLink && affiliateRef) {
        try {
          const tl = await withTimeout(createTrackingLink({ affiliateRef, platform, postBatchId: batchId, productId }), 3000);
          trackingLink = tl.shortUrl;
        } catch (_) {}
      }

      const text = formatForPlatform(platform, content, trackingLink, hashtags);
      if (!text) return { platform, status: 'skipped', reason: 'format error' };

      let result;
      if (platform === 'facebook') result = await withTimeout(postToFacebook(text, imageUrl), TIMEOUT_MS);
      else if (platform === 'instagram') result = await withTimeout(postToInstagram(text, imageUrl), TIMEOUT_MS);
      else if (platform === 'twitter') result = await withTimeout(postToTwitter(text), TIMEOUT_MS);
      else if (platform === 'line') result = await withTimeout(postToLine(text), TIMEOUT_MS);
      else if (platform === 'telegram') result = await withTimeout(postToTelegram(text), TIMEOUT_MS);
      else if (platform === 'tiktok') result = await withTimeout(postToTikTok(text), TIMEOUT_MS);
      else result = { platform, post_id: `mock_${Date.now()}`, url: null };

      addLog('info', 'AutoPost', `✅ โพสต์ ${cfg.name} สำเร็จ post_id=${result.post_id}`);
      return { ...result, status: 'success', tracking_link: trackingLink, text_preview: text.slice(0, 100) };
    }));

    const results = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value;
      const platform = platforms[i];
      const err = s.reason?.message || 'unknown error';
      addLog('warn', 'AutoPost', `⚠️ โพสต์ ${platform} ล้มเหลว: ${err}`);
      return { platform, status: 'error', error: err };
    });

    // บันทึก batch
    const posts = loadPosts();
    const batch = {
      id: batchId,
      created_at: new Date().toISOString(),
      content,
      hashtags,
      affiliate_ref: affiliateRef,
      product_id: productId,
      platforms: results,
      success_count: results.filter(r => r.status === 'success').length,
      total_count: results.length,
    };
    posts.unshift(batch);
    savePosts(posts.slice(0, 500)); // keep last 500 batches
    await kvPush('autopost:last_batch', { id: batchId, time: batch.created_at, success: batch.success_count });

    return batch;
  }

  // ── Get post history ────────────────────────────────────────────────────────
  function getHistory(limit = 20) {
    return loadPosts().slice(0, limit);
  }

  // ── Express router ──────────────────────────────────────────────────────────
  function buildRouter(express) {
    const router = express.Router();

    // GET /api/autopost/platforms — รายชื่อ platform ที่เปิดใช้ได้
    router.get('/api/autopost/platforms', (req, res) => {
      const all = Object.entries(PLATFORM_CONFIGS).map(([id, cfg]) => ({
        id, name: cfg.name, icon: cfg.icon,
        enabled: cfg.enabled(),
        maxChars: cfg.maxChars,
        linkStyle: cfg.linkStyle,
      }));
      res.json({ success: true, platforms: all });
    });

    // GET /api/autopost/history — ประวัติโพสต์
    router.get('/api/autopost/history', (req, res) => {
      const limit = Math.min(parseInt(req.query.limit || '20'), 100);
      res.json({ success: true, posts: getHistory(limit) });
    });

    return router;
  }

  return { broadcast, getHistory, getEnabledPlatforms, buildRouter, PLATFORM_CONFIGS };
}
