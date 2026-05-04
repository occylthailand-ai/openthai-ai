import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USED_CODES_FILE = path.join(__dirname, '.used-recovery-codes.json');

// ─── JWT ─────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES = '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Express middleware — ตรวจ JWT ใน Authorization header
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

// ─── Password hashing ─────────────────────────────────────────────────────────
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function checkPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

// ─── Admin users (from .env or defaults) ─────────────────────────────────────
// Format in .env:  ADMIN_USERS=username:hashedpw,username2:hashedpw2
// Or use ADMIN_PASSWORD_PLAIN for dev (auto-hashed at startup)
let _adminUsers = null;

export async function getAdminUsers() {
  if (_adminUsers) return _adminUsers;

  _adminUsers = [];

  // Load from ADMIN_USERS env (production — pre-hashed)
  if (process.env.ADMIN_USERS) {
    for (const entry of process.env.ADMIN_USERS.split(',')) {
      const [username, hashedPw] = entry.trim().split(':');
      if (username && hashedPw) {
        _adminUsers.push({ username, password: hashedPw, role: 'admin' });
      }
    }
  }

  // Dev fallback: ADMIN_USERNAME + ADMIN_PASSWORD_PLAIN
  if (_adminUsers.length === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const plain = process.env.ADMIN_PASSWORD_PLAIN || '1234';
    const hashed = await hashPassword(plain);
    _adminUsers.push({ username, password: hashed, role: 'admin' });
    console.log(`[auth] default admin: ${username} / ${plain}  ← เปลี่ยนใน .env ด้วย!`);
  }

  return _adminUsers;
}

// ─── Admin Override Key ───────────────────────────────────────────────────────
// ADMIN_OVERRIDE_KEY ใน .env — ใช้ login ฉุกเฉินได้เลย ไม่ต้องรู้ username/password
export function checkOverrideKey(key) {
  const overrideKey = process.env.ADMIN_OVERRIDE_KEY;
  if (!overrideKey || !key) return false;
  // ใช้ timingSafeEqual เพื่อป้องกัน timing attack
  try {
    const a = Buffer.from(overrideKey);
    const b = Buffer.from(key);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Recovery Codes ───────────────────────────────────────────────────────────
// RECOVERY_CODES ใน .env — comma-separated, ใช้ได้ครั้งเดียว (one-time)
// ถ้าไม่มี ระบบจะ generate ให้ตอน startup

function loadUsedCodes() {
  try {
    return JSON.parse(fs.readFileSync(USED_CODES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsedCode(code) {
  const used = loadUsedCodes();
  used.push({ code: hashCodeForStorage(code), usedAt: new Date().toISOString() });
  fs.writeFileSync(USED_CODES_FILE, JSON.stringify(used, null, 2));
}

function hashCodeForStorage(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g).join('-')
  );
}

export function useRecoveryCode(inputCode) {
  const codesRaw = process.env.RECOVERY_CODES || '';
  const validCodes = codesRaw.split(',').map(c => c.trim()).filter(Boolean);

  if (validCodes.length === 0) return false;

  const used = loadUsedCodes().map(u => u.code);
  const inputHash = hashCodeForStorage(inputCode.trim().toUpperCase());

  const matched = validCodes.some(code =>
    hashCodeForStorage(code.toUpperCase()) === inputHash
  );

  if (!matched) return false;
  if (used.includes(inputHash)) return false; // already used

  saveUsedCode(inputCode.trim().toUpperCase());
  return true;
}

// ─── Google OAuth helpers ─────────────────────────────────────────────────────
export function getGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback';
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback';

  // Exchange code → access_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenRes.json();
  if (tokens.error) throw new Error(tokens.error_description || tokens.error);

  // Get user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  return profileRes.json();
}
