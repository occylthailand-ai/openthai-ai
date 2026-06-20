#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// sync-drive.js — OpenThaiAi Auto-Sync สำหรับ Google Drive
// อัปเดต Sync Status Document + upload ไฟล์สำคัญขึ้น Google Drive
// รัน: node sync/sync-drive.js
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'child_process';
import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(__dirname, '..');
const LOG_FILE = join(__dirname, 'sync.log');
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID || '1YgSgwC6rcSvwryhCfCK4gjwqHHKd9Cpp';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

function runGit(cmd) {
  try { return execSync(`git -C "${REPO_DIR}" ${cmd}`, { encoding: 'utf8' }).trim(); }
  catch (_) { return ''; }
}

// ── รวบรวม git info ───────────────────────────────────────────────────────────
function getGitInfo() {
  return {
    hash:    runGit('rev-parse HEAD').slice(0, 12),
    branch:  runGit('rev-parse --abbrev-ref HEAD'),
    message: runGit('log -1 --pretty=%s'),
    date:    runGit('log -1 --pretty=%ci'),
    author:  runGit('log -1 --pretty=%an'),
    files:   runGit('diff --name-only HEAD~1 HEAD 2>/dev/null || echo ""'),
  };
}

// ── สร้าง sync status text ────────────────────────────────────────────────────
function buildSyncStatus(git) {
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const changedFiles = git.files.split('\n').filter(Boolean).slice(0, 20);

  return `═══════════════════════════════════════════════
OpenThaiAi — Sync Status อัตโนมัติ
วันที่ซิ้ง: ${now} (ICT)
═══════════════════════════════════════════════

✅ Commit:  ${git.hash}
✅ Branch:  ${git.branch}
✅ Message: ${git.message}
✅ Date:    ${git.date}
✅ Author:  ${git.author}

══════════════════════════════════════════════
📁 ไฟล์ที่เปลี่ยนแปลงล่าสุด
══════════════════════════════════════════════
${changedFiles.map(f => `  · ${f}`).join('\n') || '  (ไม่มีการเปลี่ยนแปลง)'}

══════════════════════════════════════════════
📱 สถานะการซิ้ง 4 จุด
══════════════════════════════════════════════

1. 💻 คอมพิวเตอร์
   คำสั่ง: git pull origin ${git.branch}
   Script: ./sync/sync-computer.sh
   Cron:   ดู sync/install-cron.sh

2. 📱 มือถือ (Vercel)
   ✅ ซิ้งอัตโนมัติทุกครั้งที่ push code
   Script: ./sync/sync-mobile.sh (manual trigger)
   URL:    ตั้งค่า VERCEL_DEPLOY_HOOK_URL ใน config.env

3. ☁️ Google Drive
   ✅ อัปเดตแล้ว (ไฟล์นี้)
   Script: node sync/sync-drive.js
   Folder: https://drive.google.com/drive/folders/${GDRIVE_FOLDER_ID}

4. 🔷 OneDrive
   Script (Linux/Mac): ./sync/sync-onedrive.sh
   Script (Windows):   sync\\sync-onedrive.bat
   Tool:   rclone (https://rclone.org/install/)
   Config: rclone config → ตั้งชื่อ remote "onedrive"

══════════════════════════════════════════════
⚡ วิธีตั้งค่าซิ้งอัตโนมัติ (Cron)
══════════════════════════════════════════════

Linux/Mac:
  chmod +x sync/*.sh
  bash sync/install-cron.sh

Windows:
  sync\\install-task.bat (ดับเบิ้ลคลิก)

═══════════════════════════════════════════════
อัปเดตอัตโนมัติโดย sync-drive.js
`;
}

// ── อัปเดตไฟล์ใน Google Drive ผ่าน API ─────────────────────────────────────
async function uploadToGoogleDrive(title, content) {
  const OAUTH_TOKEN = process.env.GOOGLE_OAUTH_TOKEN;
  const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  // ─── วิธี 1: ใช้ OAuth token ────────────────────────────────────────────────
  if (OAUTH_TOKEN) {
    log('🔑 ใช้ OAuth token สำหรับ Google Drive API...');

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OAUTH_TOKEN}`,
        'Content-Type': 'multipart/related; boundary=boundary',
      },
      body: [
        '--boundary',
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify({
          name: title,
          parents: [GDRIVE_FOLDER_ID],
          mimeType: 'application/vnd.google-apps.document',
        }),
        '--boundary',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        content,
        '--boundary--',
      ].join('\r\n'),
    });

    const result = await createRes.json();
    if (createRes.ok) {
      log(`✅ อัปเดต Google Drive สำเร็จ: ${result.id}`);
      return result;
    } else {
      throw new Error(result.error?.message || 'Google Drive API error');
    }
  }

  // ─── วิธี 2: บันทึก local แล้วแจ้งให้ user upload ─────────────────────────
  log('ℹ️  ไม่มี GOOGLE_OAUTH_TOKEN — บันทึก sync status ลงไฟล์ local แทน');
  const statusFile = join(__dirname, `sync-status-${Date.now()}.txt`);
  import('fs').then(({ writeFileSync }) => writeFileSync(statusFile, content, 'utf8'));
  log(`📄 Sync status บันทึกที่: ${statusFile}`);
  log('💡 ตั้งค่า GOOGLE_OAUTH_TOKEN เพื่อ upload อัตโนมัติ');
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════');
  log('☁️  OpenThaiAi Google Drive Sync เริ่มต้น');

  const git = getGitInfo();
  log(`📌 Commit: ${git.hash} on ${git.branch}`);
  log(`📝 Message: ${git.message}`);

  const statusContent = buildSyncStatus(git);
  const title = `🔄 OpenThaiAi - Sync Status [${new Date().toISOString().slice(0, 10)}]`;

  try {
    await uploadToGoogleDrive(title, statusContent);
  } catch (err) {
    log(`⚠️  Google Drive upload ล้มเหลว: ${err.message}`);
    log('💡 โค้ดยัง sync อยู่บน git ปกติ');
  }

  log('🎉 Google Drive Sync เสร็จสมบูรณ์');
  log('═══════════════════════════════════════════');
}

main().catch(err => {
  log(`❌ Error: ${err.message}`);
  process.exit(1);
});
