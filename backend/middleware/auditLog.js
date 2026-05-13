// ─────────────────────────────────────────────────────────────────────────────
// OpenThai AI — Audit Log Middleware
// บันทึกทุก action สำคัญ: login, generate, payment, admin action
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_VERCEL = !!process.env.VERCEL;
const LOG_DIR   = IS_VERCEL ? '/tmp/openthai-audit' : join(__dirname, '../data/audit-logs');
const MAX_LOGS  = 10000; // เก็บสูงสุด 10,000 รายการต่อไฟล์

// ── สร้าง directory ถ้ายังไม่มี ──────────────────────────────────────────────
function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

// ── ชื่อไฟล์ log ตามวันที่ ─────────────────────────────────────────────────
function todayLogFile() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return join(LOG_DIR, `audit-${ymd}.jsonl`);
}

// ── เขียน log entry ────────────────────────────────────────────────────────
export function writeAuditLog(entry) {
  try {
    ensureLogDir();
    const file = todayLogFile();
    const line = JSON.stringify({
      ts:        new Date().toISOString(),
      ...entry,
    }) + '\n';
    writeFileSync(file, line, { flag: 'a', encoding: 'utf8' });
  } catch (err) {
    // ไม่ให้ audit log พัง crash server
    console.error('[AuditLog] write failed:', err.message);
  }
}

// ── อ่าน log ย้อนหลัง (สำหรับ admin) ────────────────────────────────────
export function readAuditLogs({ days = 7, limit = 200, action, userId } = {}) {
  try {
    ensureLogDir();
    const results = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const file = join(LOG_DIR, `audit-${ymd}.jsonl`);
      if (!existsSync(file)) continue;
      const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
      for (const line of lines.reverse()) {
        try {
          const entry = JSON.parse(line);
          if (action  && entry.action  !== action)  continue;
          if (userId  && entry.userId  !== userId)  continue;
          results.push(entry);
          if (results.length >= limit) return results;
        } catch { /* skip malformed line */ }
      }
    }
    return results;
  } catch (err) {
    console.error('[AuditLog] read failed:', err.message);
    return [];
  }
}

// ── Express Middleware — บันทึก request สำคัญอัตโนมัติ ──────────────────────
const TRACKED_PATTERNS = [
  { method: 'POST', path: '/api/auth/login',        action: 'AUTH_LOGIN' },
  { method: 'POST', path: '/api/auth/logout',       action: 'AUTH_LOGOUT' },
  { method: 'POST', path: '/api/generate',          action: 'AI_GENERATE' },
  { method: 'POST', path: '/api/generate-batch',    action: 'AI_GENERATE_BATCH' },
  { method: 'POST', path: '/api/affiliate/apply',   action: 'AFFILIATE_APPLY' },
  { method: 'GET',  path: '/api/admin',             action: 'ADMIN_ACCESS' },
  { method: 'POST', path: '/api/admin',             action: 'ADMIN_ACTION' },
  { method: 'POST', path: '/api/payment',           action: 'PAYMENT_INITIATE' },
];

export function auditMiddleware(req, res, next) {
  const match = TRACKED_PATTERNS.find(
    (p) => req.method === p.method && req.path.startsWith(p.path)
  );
  if (!match) return next();

  // hook res.json เพื่อจับ status code
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    writeAuditLog({
      action:   match.action,
      method:   req.method,
      path:     req.path,
      userId:   req.user?.id || req.user?.username || null,
      role:     req.user?.role || 'anonymous',
      ip:       req.ip || req.headers['x-forwarded-for'] || 'unknown',
      ua:       req.headers['user-agent']?.slice(0, 80) || '',
      status:   res.statusCode,
      success:  res.statusCode < 400,
      // บันทึก product name สำหรับ AI generate (ไม่บันทึก full content)
      meta: match.action === 'AI_GENERATE' ? { product: req.body?.product?.slice(0,50) } : undefined,
    });
    return originalJson(body);
  };

  next();
}

// ── Log helper functions สำหรับเรียกตรงๆ ──────────────────────────────────
export const audit = {
  login:   (userId, ip, success) => writeAuditLog({ action: 'AUTH_LOGIN',    userId, ip, success }),
  logout:  (userId, ip)          => writeAuditLog({ action: 'AUTH_LOGOUT',   userId, ip }),
  payment: (userId, plan, method, amount) => writeAuditLog({ action: 'PAYMENT', userId, plan, method, amount }),
  planChange: (userId, from, to) => writeAuditLog({ action: 'PLAN_CHANGE',   userId, from, to }),
  adminAction: (adminId, target, what) => writeAuditLog({ action: 'ADMIN_ACTION', adminId, target, what }),
};
