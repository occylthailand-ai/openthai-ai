#!/usr/bin/env node
// OpenThaiAi — Migrate Vector Memory: JSON files → Supabase pgvector
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... GEMINI_API_KEY=... node migrate-memory.js
//
// ขั้นตอน:
// 1. รัน SQL ใน Supabase: backend/migrations/001_pgvector.sql
// 2. ตั้งค่า env vars
// 3. รัน script นี้

import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { migrateFromJson } from '../vector-memory-supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

console.log('🚀 OpenThaiAi — Vector Memory Migration');
console.log('📂 Source:', DATA_DIR);
console.log('🗄️  Target: Supabase pgvector');
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  console.error('   Set them in backend/.env or export them before running');
  process.exit(1);
}

try {
  const { total, failed } = await migrateFromJson(DATA_DIR);
  console.log('');
  console.log(`✅ Migration complete: ${total} entries migrated, ${failed} failed`);
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
}
