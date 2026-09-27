#!/usr/bin/env node
/**
 * Boot Alert — แจ้งเตือน SMS เข้ามือถือเมื่อ "เครื่องนี้ถูกเปิด"
 *
 * - ตรวจ "การบูตใหม่" ด้วย boot-time (ข้ามแพลตฟอร์ม Win/Mac/Linux)
 * - บูตใหม่ → ส่ง SMS หาทุกเบอร์ใน ALERT_NUMBERS ทันที
 * - รันค้างไว้เป็น daemon เพื่อให้ service จัดการ auto-restart ได้
 *   (ถ้าถูก kill แล้ว service สั่งรันใหม่ จะ "ไม่ส่งซ้ำ" ในบูตเดิม — กันสแปม)
 *
 * หมายเหตุสำคัญ (ความปลอดภัยของตัวคุณเอง):
 *   โปรแกรมนี้ออกแบบให้ "ทนทาน + เริ่มเองทุกบูต + เด้งกลับเมื่อถูกปิด"
 *   แต่ผู้ดูแลเครื่อง (admin/root) ยัง "ถอนได้" เสมอ — ดู uninstall ใน README
 *   ซอฟต์แวร์ที่จงใจถอนไม่ได้แม้เจ้าของ = เทคนิค malware และเสี่ยงย้อนกลับมาทำร้ายคุณเอง
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── โหลด .env แบบเบาๆ (ไม่ต้องพึ่ง dependency) ────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
})();

const CONFIG = {
  // ช่องทางที่จะแจ้งเตือน — ใส่หลายอันคั่น comma ได้ เช่น "telegram,thsms"
  // (ถ้าไม่ตั้ง CHANNELS จะ fallback ไป SMS_PROVIDER เดิมเพื่อความเข้ากันได้)
  channels: (process.env.CHANNELS || process.env.SMS_PROVIDER || 'thsms')
              .toLowerCase().split(',').map(s => s.trim()).filter(Boolean),
  sender:   process.env.SMS_SENDER || '',
  numbers:  (process.env.ALERT_NUMBERS || '0972560801,0658714008')
              .split(',').map(s => s.trim()).filter(Boolean),
  // Telegram
  tgToken:  process.env.TELEGRAM_BOT_TOKEN || '',
  tgChats:  (process.env.TELEGRAM_CHAT_IDS || '')
              .split(',').map(s => s.trim()).filter(Boolean),
  heartbeatHours: Number(process.env.HEARTBEAT_HOURS || 0), // 0 = ปิด
  stateFile: process.env.STATE_FILE || path.join(__dirname, '.boot-state.json'),
  logFile:   process.env.LOG_FILE   || path.join(__dirname, 'boot-alert.log'),
};
const SMS_CHANNELS = new Set(['thsms', 'smsmkt', 'custom']);

// ─── utils ─────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(CONFIG.logFile, line + '\n'); } catch (_) {}
}

// เวลาบูตของเครื่อง (ms) — ใช้เป็น "ลายเซ็นของการบูตครั้งนี้"
function bootSignature() {
  // os.uptime() = วินาทีตั้งแต่บูต → เวลาบูต = now - uptime
  return Math.round((Date.now() - os.uptime() * 1000) / 1000); // ปัดเป็นวินาที
}

function readState() {
  try { return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8')); } catch { return {}; }
}
function writeState(s) {
  try { fs.writeFileSync(CONFIG.stateFile, JSON.stringify(s, null, 2)); } catch (e) { log('writeState error: ' + e.message); }
}

// แปลงเบอร์ไทย 0xxxxxxxxx → 66xxxxxxxxx (ตัด 0 นำหน้า)
function toIntlTH(num) {
  let n = String(num).replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('66')) return n;
  if (n.startsWith('0')) return '66' + n.slice(1);
  return n;
}

function localIPs() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const i of ifaces[name] || []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out.join(', ') || 'unknown';
}

function buildMessage(kind = 'boot') {
  const when = new Date().toLocaleString('th-TH', { hour12: false });
  const host = os.hostname();
  const user = os.userInfo().username;
  const head = kind === 'heartbeat' ? 'Openthai เครื่องยังออนไลน์' : '⚠️ เครื่องถูกเปิดใช้งาน';
  return `${head}\nเครื่อง: ${host} (${user})\nเวลา: ${when}\nIP: ${localIPs()}`;
}

// ─── SMS providers ──────────────────────────────────────────────────────────────
// หมายเหตุ: endpoint/รูปแบบ payload ของแต่ละเจ้าอาจเปลี่ยน — ตรวจกับเอกสารผู้ให้บริการ
// แล้วปรับใน .env (โดยเฉพาะ provider=custom ที่ตั้งค่าได้ทุกอย่าง)
async function sendSms(provider, to, message) {
  const intl = toIntlTH(to);

  if (provider === 'thsms') {
    // THSMS (thsms.com) — REST + Bearer token
    // endpoint override ได้ผ่าน THSMS_API_URL เผื่อ dashboard ของคุณใช้ path ต่าง
    const url = process.env.THSMS_API_URL || 'https://thsms.com/api/rest';
    if (!process.env.THSMS_API_KEY) throw new Error('ยังไม่ได้ตั้ง THSMS_API_KEY ใน .env');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.THSMS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ sender: CONFIG.sender, to: intl, message }),
    });
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (_) {}
    // THSMS แจ้ง error เป็น { error: { name, message } }
    if (!res.ok || data?.error) {
      const msg = data?.error?.message || data?.message || raw || `HTTP ${res.status}`;
      throw new Error(`THSMS: ${msg}`);
    }
    const d = data?.data || data || {};
    return { uuid: d.uuid || null, status: d.status || 'sent', credit: d.credit_balance ?? d.credit ?? null };
  }

  if (provider === 'smsmkt') {
    // SMSMKT (smsmkt.com) — api_key/secret_key
    const res = await fetch('https://portal-otp.smsmkt.com/api/send-message', {
      method: 'POST',
      headers: {
        'api_key':    process.env.SMSMKT_API_KEY || '',
        'secret_key': process.env.SMSMKT_SECRET_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sender: CONFIG.sender, phone: intl, message }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`SMSMKT HTTP ${res.status}: ${text}`);
    return text;
  }

  if (provider === 'custom') {
    // ตั้งค่าได้ทุกอย่างผ่าน .env — ใช้กับ gateway ไหนก็ได้
    // SMS_URL, SMS_METHOD, SMS_HEADERS (JSON), SMS_BODY (template มี {to} {message} {sender})
    const url = process.env.SMS_URL;
    if (!url) throw new Error('custom provider ต้องตั้ง SMS_URL ใน .env');
    const headers = JSON.parse(process.env.SMS_HEADERS || '{"Content-Type":"application/json"}');
    const bodyTpl = process.env.SMS_BODY || '{"to":"{to}","message":"{message}","sender":"{sender}"}';
    const body = bodyTpl
      .replace(/{to}/g, intl)
      .replace(/{message}/g, message.replace(/\n/g, '\\n'))
      .replace(/{sender}/g, CONFIG.sender);
    const res = await fetch(url, { method: process.env.SMS_METHOD || 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) throw new Error(`custom HTTP ${res.status}: ${text}`);
    return text;
  }

  throw new Error(`ไม่รู้จัก SMS provider: ${provider}`);
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
// ฟรี เด้งเข้าแอปทันที — ต้องมี TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_IDS
async function sendTelegramOne(chatId, message) {
  if (!CONFIG.tgToken) throw new Error('ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN ใน .env');
  const res = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${CONFIG.tgToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(`Telegram: ${data?.description || `HTTP ${res.status}`}`);
  }
  return { status: 'sent', message_id: data?.result?.message_id || null };
}

// ─── dispatch ทุก channel + ทุกผู้รับ ─────────────────────────────────────────
async function sendToAll(kind) {
  const message = buildMessage(kind);
  // สร้างรายการงาน: [label, promiseFactory]
  const jobs = [];
  for (const ch of CONFIG.channels) {
    if (SMS_CHANNELS.has(ch)) {
      for (const n of CONFIG.numbers) jobs.push([`${ch}:${n}`, () => sendSms(ch, n, message)]);
    } else if (ch === 'telegram') {
      if (CONFIG.tgChats.length === 0) jobs.push(['telegram', () => { throw new Error('ยังไม่ได้ตั้ง TELEGRAM_CHAT_IDS'); }]);
      for (const c of CONFIG.tgChats) jobs.push([`telegram:${c}`, () => sendTelegramOne(c, message)]);
    } else {
      jobs.push([ch, () => { throw new Error(`ไม่รู้จัก channel: ${ch}`); }]);
    }
  }

  log(`ส่ง ${kind} ผ่าน [${CONFIG.channels.join(', ')}] → ${jobs.length} ปลายทาง`);
  const results = await Promise.allSettled(jobs.map(([, fn]) => fn()));
  results.forEach((r, i) => {
    const label = jobs[i][0];
    if (r.status === 'fulfilled') {
      const v = r.value;
      const info = v && typeof v === 'object'
        ? ' (' + [v.status, v.uuid && `uuid=${v.uuid}`, v.message_id && `msg=${v.message_id}`, v.credit != null && `credit=${v.credit}`].filter(Boolean).join(', ') + ')'
        : '';
      log(`  ✓ ${label} OK${info}`);
    } else {
      log(`  ✗ ${label} FAIL: ${r.reason?.message || r.reason}`);
    }
  });
  return results;
}

// ─── main ────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isTest   = args.includes('--test') || args.includes('--force');
const isOnce   = args.includes('--once'); // ส่งครั้งเดียวแล้วจบ (สำหรับ cron @reboot)
const isTgId   = args.includes('--tg-chatid'); // ช่วยหา chat_id ของ Telegram

// ดึง chat_id จาก getUpdates (ทักบอทก่อน แล้วรันคำสั่งนี้)
async function showTelegramChatIds() {
  if (!CONFIG.tgToken) { log('ตั้ง TELEGRAM_BOT_TOKEN ใน .env ก่อน'); return; }
  const res = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${CONFIG.tgToken}/getUpdates`);
  const data = await res.json();
  if (!data.ok) { log('Telegram error: ' + (data.description || res.status)); return; }
  const chats = new Map();
  for (const u of data.result || []) {
    const c = u.message?.chat || u.channel_post?.chat;
    if (c) chats.set(c.id, c.title || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || c.type);
  }
  if (chats.size === 0) {
    log('ยังไม่พบแชท — เปิด Telegram ทักบอทของคุณ (พิมพ์ /start) แล้วรันคำสั่งนี้อีกครั้ง');
  } else {
    log('พบ chat_id ต่อไปนี้ — ใส่ใน TELEGRAM_CHAT_IDS:');
    for (const [id, name] of chats) log(`  ${id}  (${name})`);
  }
}

async function checkAndAlert() {
  const sig = bootSignature();
  const state = readState();
  // bootSignature อาจคลาดเคลื่อน ±ไม่กี่วิ → ถือว่าบูตใหม่เมื่อต่างเกิน 5 วิ
  const isNewBoot = !state.bootSig || Math.abs(state.bootSig - sig) > 5;
  if (isNewBoot) {
    await sendToAll('boot');
    writeState({ bootSig: sig, lastBootAlert: new Date().toISOString() });
  } else {
    log('บูตเดิม (เคยแจ้งไปแล้ว) — ไม่ส่งซ้ำ');
  }
}

(async () => {
  try {
    if (isTgId) { await showTelegramChatIds(); return; }

    if (isTest) {
      log('โหมดทดสอบ — ส่งแจ้งเตือนทันที');
      await sendToAll('boot');
      log('เสร็จสิ้นการทดสอบ');
      return;
    }

    await checkAndAlert();

    if (isOnce) { log('โหมด --once จบการทำงาน'); return; }

    // daemon: อยู่ค้างไว้ให้ service ดูแล auto-restart + heartbeat (ถ้าเปิด)
    log('เข้าโหมด daemon — เฝ้าเครื่อง 24/7');
    if (CONFIG.heartbeatHours > 0) {
      setInterval(() => sendToAll('heartbeat').catch(e => log('heartbeat error: ' + e.message)),
                  CONFIG.heartbeatHours * 3600 * 1000);
    }
    // กันบางกรณี service รันใหม่ในบูตเดิม: เช็คเป็นระยะว่ามีบูตใหม่ไหม (เผื่อ uptime rollover)
    setInterval(() => checkAndAlert().catch(e => log('recheck error: ' + e.message)), 60 * 1000);
    process.stdin.resume(); // คงโปรเซสไว้
  } catch (e) {
    log('FATAL: ' + (e.stack || e.message));
    process.exit(1);
  }
})();
