/**
 * fb-api.js — Facebook Graph API Client อัตโนมัติ
 *
 * วิธีใช้:
 *   node fb-api.js --me                        # ดูข้อมูลตัวเอง
 *   node fb-api.js --pages                     # ดู Pages ที่ดูแล
 *   node fb-api.js --page <PAGE_ID>            # ดู posts ของ Page
 *   node fb-api.js --post <POST_ID>            # ดู engagement ของโพสต์
 *   node fb-api.js --insights <PAGE_ID>        # ดู Page Insights
 *   node fb-api.js --search <keyword>          # ค้นหาใน Graph
 *   node fb-api.js --token <token>             # ทดสอบ token
 *
 * ต้องมี FB_ACCESS_TOKEN ใน .env
 * ขอ token ได้ที่: https://developers.facebook.com/tools/explorer/
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GRAPH_URL = 'https://graph.facebook.com/v19.0';

// ── Helper: เรียก Facebook Graph API ─────────────────────────────────────────
async function graphGet(path, params = {}) {
  const { default: fetch } = await import('node-fetch');
  const token = config.FB_ACCESS_TOKEN;
  if (!token) throw new Error('FB_ACCESS_TOKEN ไม่ได้กำหนด — เพิ่มใน .env');

  const qs = new URLSearchParams({ access_token: token, ...params });
  const url = `${GRAPH_URL}/${path.replace(/^\//, '')}?${qs}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OpenthaiSocialBot/1.0' },
    timeout: 15000,
  });
  const data = await res.json();
  if (data.error) throw new Error(`FB API Error: ${data.error.message} (code: ${data.error.code})`);
  return data;
}

// ── ดูข้อมูล token และตัวเอง ─────────────────────────────────────────────────
async function getMe() {
  console.log('👤 ข้อมูลผู้ใช้...');
  const me = await graphGet('me', { fields: 'id,name,email,picture' });
  console.log(`\n✅ ชื่อ:  ${me.name}`);
  console.log(`   ID:    ${me.id}`);
  if (me.email) console.log(`   Email: ${me.email}`);
  return me;
}

// ── debug token ───────────────────────────────────────────────────────────────
async function debugToken(token) {
  const { default: fetch } = await import('node-fetch');
  console.log('🔑 ตรวจสอบ Token...');
  const t = token || config.FB_ACCESS_TOKEN;
  const appToken = config.FB_APP_ID && config.FB_APP_SECRET
    ? `${config.FB_APP_ID}|${config.FB_APP_SECRET}`
    : t;
  const qs = new URLSearchParams({ input_token: t, access_token: appToken });
  const res = await fetch(`${GRAPH_URL}/debug_token?${qs}`);
  const data = await res.json();
  if (data.data) {
    const d = data.data;
    const expiry = d.expires_at ? new Date(d.expires_at * 1000).toLocaleString('th-TH') : 'ไม่หมดอายุ';
    console.log(`\n✅ Token ใช้ได้: ${d.is_valid ? 'Yes' : 'No'}`);
    console.log(`   App ID:   ${d.app_id}`);
    console.log(`   User ID:  ${d.user_id}`);
    console.log(`   Type:     ${d.type}`);
    console.log(`   Expires:  ${expiry}`);
    console.log(`   Scopes:   ${(d.scopes || []).join(', ')}`);
  }
  return data;
}

// ── ดู Pages ที่ผู้ใช้ดูแล ───────────────────────────────────────────────────
async function getMyPages() {
  console.log('📄 Pages ที่คุณดูแล...');
  const data = await graphGet('me/accounts', { fields: 'id,name,category,fan_count,access_token' });
  const pages = data.data || [];
  if (!pages.length) { console.log('\n⚠️  ไม่พบ Pages ที่คุณดูแล'); return []; }

  console.log(`\n✅ พบ ${pages.length} Pages:`);
  pages.forEach((p, i) => {
    console.log(`\n  ${i + 1}. ${p.name}`);
    console.log(`     ID:       ${p.id}`);
    console.log(`     Category: ${p.category}`);
    console.log(`     Fans:     ${(p.fan_count || 0).toLocaleString()}`);
  });
  return pages;
}

// ── ดู Posts ของ Page ────────────────────────────────────────────────────────
async function getPagePosts(pageId, limit = 10) {
  console.log(`📰 Posts ของ Page ${pageId}...`);
  const data = await graphGet(`${pageId}/posts`, {
    fields: 'id,message,story,created_time,likes.summary(true),comments.summary(true),shares',
    limit,
  });
  const posts = data.data || [];
  if (!posts.length) { console.log('\n⚠️  ไม่พบ Posts'); return []; }

  console.log(`\n✅ ${posts.length} Posts ล่าสุด:\n${'─'.repeat(50)}`);
  posts.forEach((p, i) => {
    const text = (p.message || p.story || '(ไม่มีข้อความ)').slice(0, 100);
    const likes = p.likes?.summary?.total_count || 0;
    const comments = p.comments?.summary?.total_count || 0;
    const shares = p.shares?.count || 0;
    const date = new Date(p.created_time).toLocaleString('th-TH');
    console.log(`\n${i + 1}. [${date}]`);
    console.log(`   ${text}${text.length >= 100 ? '...' : ''}`);
    console.log(`   ❤️ ${likes}  💬 ${comments}  🔁 ${shares}   ID: ${p.id}`);
  });
  return posts;
}

// ── ดู engagement ของโพสต์ ───────────────────────────────────────────────────
async function getPostInsights(postId) {
  console.log(`📊 Insights ของโพสต์ ${postId}...`);
  const [post, insights] = await Promise.allSettled([
    graphGet(postId, { fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true)' }),
    graphGet(`${postId}/insights`, { metric: 'post_impressions,post_reach,post_clicks,post_video_views' }),
  ]);

  if (post.status === 'fulfilled') {
    const p = post.value;
    const text = (p.message || '(ไม่มีข้อความ)').slice(0, 200);
    console.log(`\n📝 เนื้อหา: ${text}`);
    console.log(`📅 วันที่: ${new Date(p.created_time).toLocaleString('th-TH')}`);
    console.log(`❤️  Likes: ${p.likes?.summary?.total_count || 0}`);
    console.log(`💬 Comments: ${p.comments?.summary?.total_count || 0}`);
    console.log(`🔁 Shares: ${p.shares?.count || 0}`);
    console.log(`😊 Reactions: ${p.reactions?.summary?.total_count || 0}`);
  }

  if (insights.status === 'fulfilled') {
    const metrics = insights.value.data || [];
    console.log('\n📈 Metrics:');
    metrics.forEach(m => {
      const val = m.values?.[0]?.value || 0;
      console.log(`   ${m.name}: ${typeof val === 'object' ? JSON.stringify(val) : val.toLocaleString()}`);
    });
  }
}

// ── ดู Page Insights ─────────────────────────────────────────────────────────
async function getPageInsights(pageId) {
  console.log(`📈 Page Insights: ${pageId}...`);
  const metrics = [
    'page_impressions_unique',
    'page_fan_adds',
    'page_fan_removes',
    'page_post_engagements',
    'page_views_total',
  ].join(',');

  const data = await graphGet(`${pageId}/insights`, {
    metric: metrics,
    period: 'day',
    since: Math.floor((Date.now() - 7 * 86400000) / 1000),
    until: Math.floor(Date.now() / 1000),
  });

  const items = data.data || [];
  console.log('\n📊 Insights 7 วันที่ผ่านมา:');
  items.forEach(m => {
    const sum = (m.values || []).reduce((a, v) => a + (typeof v.value === 'number' ? v.value : 0), 0);
    console.log(`   ${m.name}: ${sum.toLocaleString()} (รวม 7 วัน)`);
  });
  return items;
}

// ── บันทึกผลลัพธ์ ─────────────────────────────────────────────────────────────
function saveResult(filename, data) {
  if (!existsSync(config.OUTPUT_DIR)) mkdirSync(config.OUTPUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = join(config.OUTPUT_DIR, `${filename}-${ts}.json`);
  writeFileSync(path, JSON.stringify({ fetchedAt: new Date().toISOString(), ...data }, null, 2));
  console.log(`\n💾 บันทึก: ${path}`);
  return path;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📘 Facebook Graph API — Openthai.ai');
  console.log('='.repeat(50));

  const args = process.argv.slice(2);

  if (!args.length || args.includes('--help')) {
    console.log('\nวิธีใช้:');
    console.log('  node fb-api.js --me                   ดูข้อมูลตัวเอง');
    console.log('  node fb-api.js --pages                ดู Pages ที่ดูแล');
    console.log('  node fb-api.js --page <PAGE_ID>       ดู Posts ของ Page');
    console.log('  node fb-api.js --post <POST_ID>       ดู Insights โพสต์');
    console.log('  node fb-api.js --insights <PAGE_ID>   ดู Page Insights');
    console.log('  node fb-api.js --token [TOKEN]        ตรวจสอบ Token');
    console.log('\n💡 ขอ Token: https://developers.facebook.com/tools/explorer/');
    return;
  }

  if (!config.FB_ACCESS_TOKEN && !args.includes('--token')) {
    console.error('\n❌ ไม่มี FB_ACCESS_TOKEN');
    console.log('💡 เพิ่ม FB_ACCESS_TOKEN=EAAxxxx ใน .env');
    console.log('   ขอ Token ได้ที่: https://developers.facebook.com/tools/explorer/');
    process.exit(1);
  }

  try {
    if (args.includes('--me')) {
      const me = await getMe();
      saveResult('fb-me', me);
    }
    else if (args.includes('--token')) {
      const tokenArg = args[args.indexOf('--token') + 1];
      await debugToken(tokenArg);
    }
    else if (args.includes('--pages')) {
      const pages = await getMyPages();
      saveResult('fb-pages', { pages });
    }
    else if (args.includes('--page')) {
      const pageId = args[args.indexOf('--page') + 1];
      if (!pageId) { console.error('❌ ต้องระบุ PAGE_ID'); process.exit(1); }
      const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
      const posts = await getPagePosts(pageId, limit);
      saveResult('fb-page-posts', { pageId, posts });
    }
    else if (args.includes('--post')) {
      const postId = args[args.indexOf('--post') + 1];
      if (!postId) { console.error('❌ ต้องระบุ POST_ID'); process.exit(1); }
      await getPostInsights(postId);
    }
    else if (args.includes('--insights')) {
      const pageId = args[args.indexOf('--insights') + 1];
      if (!pageId) { console.error('❌ ต้องระบุ PAGE_ID'); process.exit(1); }
      const data = await getPageInsights(pageId);
      saveResult('fb-insights', { pageId, insights: data });
    }
    else {
      console.error('❌ ไม่รู้จัก argument นี้ — ใช้ --help');
    }
  } catch (e) {
    console.error(`\n❌ ${e.message}`);
    if (e.message.includes('OAuthException') || e.message.includes('token')) {
      console.log('\n💡 Token อาจหมดอายุหรือไม่มีสิทธิ์');
      console.log('   ขอ Token ใหม่: https://developers.facebook.com/tools/explorer/');
    }
    process.exit(1);
  }
}

main();
