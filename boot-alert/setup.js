#!/usr/bin/env node
/**
 * Boot Alert — ตัวช่วยตั้งค่าอัตโนมัติ (interactive wizard)
 * รัน:  node setup.js
 *
 * ถาม-ตอบทีละขั้น → เขียนไฟล์ .env ให้เอง → หา Telegram chat_id ให้เอง
 * → ยิงทดสอบให้ คุณแค่วางโทเค็น/กด /start เท่านั้น
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { stdin, stdout } from 'process';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '.env');

// อ่านบรรทัดแบบ queue — ทำงานได้ทั้ง terminal จริงและ input ที่ pipe เข้ามา
const _lineQ = [];
let _waiter = null;
const rl = readline.createInterface({ input: stdin });
rl.on('line', (line) => {
  if (_waiter) { const w = _waiter; _waiter = null; w(line); }
  else _lineQ.push(line);
});
let _closed = false;
rl.on('close', () => { _closed = true; if (_waiter) { const w = _waiter; _waiter = null; w(''); } });
function readLine() {
  return new Promise((resolve) => {
    if (_lineQ.length) return resolve(_lineQ.shift());
    if (_closed) return resolve('');
    _waiter = resolve;
  });
}

const ask = async (q, def = '') => {
  stdout.write(def ? `${q} [${def}]: ` : `${q}: `);
  const a = (await readLine()).trim();
  return a || def;
};
const yes = async (q, def = true) => {
  const a = (await ask(`${q} (${def ? 'Y/n' : 'y/N'})`)).toLowerCase();
  return a ? a.startsWith('y') : def;
};
const tgBase = () => process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

// หา chat_id จาก getUpdates (วน retry จนกว่าจะเจอ หรือกรอกเอง)
async function resolveTelegramChats(token) {
  for (;;) {
    let data = {};
    try {
      const res = await fetch(`${tgBase()}/bot${token}/getUpdates`);
      data = await res.json();
    } catch (e) { console.log('  ⚠️  ต่อ Telegram ไม่ได้: ' + e.message); }

    if (data.ok === false) {
      console.log('  ❌ โทเค็นไม่ถูกต้อง: ' + (data.description || '') );
      const t = await ask('  วางโทเค็นใหม่ (เว้นว่าง=ข้าม)');
      if (!t) return { token, chats: [] };
      token = t; continue;
    }

    const chats = new Map();
    for (const u of data.result || []) {
      const c = u.message?.chat || u.channel_post?.chat;
      if (c) chats.set(String(c.id), c.title || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || c.type);
    }
    if (chats.size > 0) {
      console.log('  ✅ พบแชท:');
      for (const [id, name] of chats) console.log(`     ${id}  (${name})`);
      const pick = await ask('  ใช้ chat_id ไหนบ้าง (คั่น comma)', [...chats.keys()].join(','));
      return { token, chats: pick.split(',').map(s => s.trim()).filter(Boolean) };
    }

    console.log('  ยังไม่พบแชท — เปิด Telegram, ทักบอทของคุณ แล้วพิมพ์ /start');
    if (!(await yes('  ทัก /start แล้ว ลองหาอีกครั้งไหม', true))) {
      const manual = await ask('  กรอก chat_id เองก็ได้ (เว้นว่าง=ข้าม)');
      return { token, chats: manual ? manual.split(',').map(s => s.trim()).filter(Boolean) : [] };
    }
  }
}

function writeEnv(obj) {
  // อ่านของเดิม (ถ้ามี) แล้ว merge ทับเฉพาะคีย์ที่ตั้งใหม่
  const lines = [];
  lines.push('# สร้างโดย setup.js — ' + new Date().toLocaleString('th-TH'));
  for (const [k, v] of Object.entries(obj)) lines.push(`${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
}

(async () => {
  console.log('\n🔔 Boot Alert — ตัวช่วยตั้งค่า\n──────────────────────────────');

  if (fs.existsSync(ENV_PATH) && !(await yes('มีไฟล์ .env อยู่แล้ว เขียนทับไหม', false))) {
    console.log('ยกเลิก — ไม่แก้ไฟล์เดิม'); rl.close(); return;
  }

  const env = {};

  const useTg  = await yes('ใช้ Telegram (ฟรี เด้งทันที)', true);
  const useSms = await yes('ใช้ SMS ผ่าน THSMS (เสียค่าส่ง)', false);
  const channels = [];
  if (useTg)  channels.push('telegram');
  if (useSms) channels.push('thsms');
  if (channels.length === 0) { console.log('ไม่ได้เลือกช่องทางใดเลย — ยกเลิก'); rl.close(); return; }
  env.CHANNELS = channels.join(',');

  if (useTg) {
    console.log('\n📨 Telegram');
    console.log('  ขั้นแรก: เปิด Telegram → ทักบอท @BotFather → /newbot → ก็อปโทเค็นมา');
    const token = await ask('  วาง TELEGRAM_BOT_TOKEN');
    env.TELEGRAM_BOT_TOKEN = token;
    if (token) {
      const r = await resolveTelegramChats(token);
      env.TELEGRAM_BOT_TOKEN = r.token;
      env.TELEGRAM_CHAT_IDS = r.chats.join(',');
    } else {
      env.TELEGRAM_CHAT_IDS = '';
    }
  }

  if (useSms) {
    console.log('\n💳 THSMS');
    env.THSMS_API_KEY = await ask('  วาง THSMS_API_KEY');
    env.SMS_SENDER    = await ask('  ชื่อผู้ส่งที่อนุมัติแล้ว (Sender name)', 'Openthai');
    env.ALERT_NUMBERS = await ask('  เบอร์รับ SMS (คั่น comma)', '0972560801,0658714008');
  }

  writeEnv(env);
  console.log('\n✅ เขียนไฟล์ .env เรียบร้อย');

  if (await yes('\nยิงทดสอบเลยไหม (ส่งแจ้งเตือนจริงทุกช่องทาง)', true)) {
    console.log('──────────────────────────────');
    spawnSync(process.execPath, [path.join(__dirname, 'notify.js'), '--test'], { stdio: 'inherit' });
    console.log('──────────────────────────────');
    console.log('ถ้าได้รับแจ้งเตือนครบ → ติดตั้งให้เริ่มทุกบูตด้วยสคริปต์ใน README ได้เลย');
  } else {
    console.log('ทดสอบเองภายหลัง:  node notify.js --test');
  }
  rl.close();
})();
