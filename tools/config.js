/**
 * config.js — โหลด .env และ export config สำหรับทุก tool
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// โหลด .env ถ้ามี
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

export const config = {
  // Facebook
  FB_ACCESS_TOKEN:    process.env.FB_ACCESS_TOKEN    || '',
  FB_APP_ID:          process.env.FB_APP_ID          || '',
  FB_APP_SECRET:      process.env.FB_APP_SECRET      || '',
  FB_COOKIES_PATH:    process.env.FB_COOKIES_PATH    || join(__dirname, 'session', 'fb-cookies.json'),

  // AI
  ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY  || '',
  OPENAI_API_KEY:     process.env.OPENAI_API_KEY     || '',
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY     || '',

  // Chrome
  CHROME_PATH:        process.env.CHROME_PATH        || '',

  // Output
  OUTPUT_DIR:         process.env.OUTPUT_DIR         || join(__dirname, 'output'),

  // Chat upload (optional webhook)
  CHAT_WEBHOOK_URL:   process.env.CHAT_WEBHOOK_URL   || '',
  SLACK_WEBHOOK_URL:  process.env.SLACK_WEBHOOK_URL  || '',
  LINE_NOTIFY_TOKEN:  process.env.LINE_NOTIFY_TOKEN  || '',
};

export default config;
