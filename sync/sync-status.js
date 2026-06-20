#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// sync-status.js — ตรวจสอบสถานะ Sync ทั้ง 4 จุดแบบ Real-time
// รัน: node sync/sync-status.js
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(__dirname, '..');
const LOG_FILE = join(__dirname, 'sync.log');
const CONFIG_FILE = join(__dirname, 'config.env');

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', cwd: REPO_DIR }).trim(); }
  catch (_) { return ''; }
}

function loadConfig() {
  const cfg = {};
  if (existsSync(CONFIG_FILE)) {
    readFileSync(CONFIG_FILE, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !m[1].startsWith('#')) cfg[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
  return cfg;
}

async function checkVercel(cfg) {
  if (!cfg.VERCEL_DEPLOY_HOOK_URL) return { status: '⚠️', msg: 'ยังไม่ตั้งค่า VERCEL_DEPLOY_HOOK_URL' };
  try {
    const res = await fetch(cfg.VERCEL_DEPLOY_HOOK_URL.replace('/deploy/', '/'), { method: 'HEAD' });
    return res.ok
      ? { status: '✅', msg: 'Vercel hook พร้อมใช้' }
      : { status: '⚠️', msg: `Vercel hook status ${res.status}` };
  } catch (_) {
    return { status: '⚠️', msg: 'ไม่สามารถเชื่อมต่อ Vercel' };
  }
}

function checkRclone() {
  const has = run('which rclone 2>/dev/null || where rclone 2>/dev/null');
  if (!has) return { status: '⚠️', msg: 'ไม่พบ rclone — ติดตั้งที่ rclone.org/install' };
  const remotes = run('rclone listremotes 2>/dev/null');
  if (remotes.includes('onedrive:')) return { status: '✅', msg: `rclone remote "onedrive" พร้อมใช้` };
  return { status: '⚠️', msg: 'รัน rclone config เพื่อตั้งค่า OneDrive' };
}

function getLastSyncTime() {
  if (!existsSync(LOG_FILE)) return 'ยังไม่เคย sync';
  const stat = statSync(LOG_FILE);
  const diff = Date.now() - stat.mtimeMs;
  if (diff < 60000) return 'เมื่อกี้นี้';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
}

async function main() {
  const cfg = loadConfig();

  // Git Info
  const hash   = run('git rev-parse HEAD').slice(0, 8) || '—';
  const branch = run('git rev-parse --abbrev-ref HEAD') || '—';
  const msg    = run('git log -1 --pretty=%s') || '—';
  const remote = run(`git rev-parse origin/${branch} 2>/dev/null`).slice(0, 8) || '—';
  const isUpToDate = hash === remote;

  // Checks
  const vercel = await checkVercel(cfg);
  const rclone = checkRclone();
  const hasCron = run("crontab -l 2>/dev/null | grep -c 'OpenThaiAi'") !== '0';
  const lastSync = getLastSyncTime();

  console.log(`
╔════════════════════════════════════════════════╗
║  📊 OpenThaiAi Sync Status                     ║
╠════════════════════════════════════════════════╣
║  🕐 ตรวจสอบล่าสุด: ${new Date().toLocaleString('th-TH')}
╠════════════════════════════════════════════════╣

  📌 Git Info
     Commit:  ${hash} (${branch})
     Message: ${msg}
     Remote:  ${isUpToDate ? '✅ ตรงกับ remote' : `⚠️ remote = ${remote} (ต่าง!)`}
     Last sync log: ${lastSync}

──────────────────────────────────────────────────
  1. 💻 คอมพิวเตอร์ (Git)
     ${isUpToDate ? '✅ โค้ดเป็นเวอร์ชั่นล่าสุด' : '⚠️  มีอัปเดตใหม่ — รัน git pull'}
     Cron: ${hasCron ? '✅ ติดตั้งแล้ว (ทุก 6 ชั่วโมง)' : '⚠️  ยังไม่ติดตั้ง — รัน install-cron.sh'}
     Script: bash sync/sync-computer.sh

  2. 📱 มือถือ (Vercel)
     ${vercel.status} ${vercel.msg}
     Script: bash sync/sync-mobile.sh

  3. ☁️  Google Drive
     ${cfg.GOOGLE_OAUTH_TOKEN ? '✅ OAuth token ตั้งค่าแล้ว' : '⚠️  ยังไม่ตั้งค่า GOOGLE_OAUTH_TOKEN'}
     Folder: https://drive.google.com/drive/folders/${cfg.GDRIVE_FOLDER_ID || '1YgSgwC6rcSvwryhCfCK4gjwqHHKd9Cpp'}
     Script: node sync/sync-drive.js

  4. 🔷 OneDrive
     ${rclone.status} ${rclone.msg}
     Script: bash sync/sync-onedrive.sh (Mac/Linux)
             sync\\sync-onedrive.bat (Windows)

──────────────────────────────────────────────────
  🚀 ซิ้งทั้งหมดตอนนี้: bash sync/sync-all.sh
  ⏰  ติดตั้ง auto-sync:  bash sync/install-cron.sh
  📄 ดู log:             tail -f sync/sync.log

╚════════════════════════════════════════════════╝
`);
}

main().catch(console.error);
