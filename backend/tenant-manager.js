// Openthai.ai — Multi-Tenant Manager
// Each tenant (store/business) gets:
//   - Isolated agent space  (agents_<id>.json)
//   - Isolated memory space (memory_<id>.json)
//   - Unique API key        (otai_sk_...)
//   - Brand settings        (name, tone, default platform)
//   - Plan tier             (free → starter → pro → enterprise)
//
// Auth: X-API-Key header OR Bearer JWT (admin bypass)
//
// Endpoints registered in server.js:
//   POST  /api/tenants/register   — create tenant (public)
//   POST  /api/tenants/login      — tenant login → JWT
//   GET   /api/tenants/me         — current tenant info
//   PATCH /api/tenants/me         — update tenant settings
//   GET   /api/tenants            — list all tenants (admin)
//   POST  /api/tenants/:id/rotate-key — rotate API key (tenant owner)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';

const TENANT_FILE = (writeDir) => join(writeDir, 'tenants.json');

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  free:       { agents: 1,  generates_per_day: 10,  memory_slots: 100,  webhooks: 1,  price_thb: 0    },
  starter:    { agents: 3,  generates_per_day: 100, memory_slots: 500,  webhooks: 3,  price_thb: 299  },
  pro:        { agents: 10, generates_per_day: 500, memory_slots: 2000, webhooks: 10, price_thb: 799  },
  enterprise: { agents: 99, generates_per_day: 9999,memory_slots: 9999, webhooks: 50, price_thb: 2499 },
};

// ── Storage ───────────────────────────────────────────────────────────────────

function loadTenants(writeDir) {
  try {
    const f = TENANT_FILE(writeDir);
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  } catch (_) {}
  return [];
}

function saveTenants(writeDir, data) {
  try {
    if (!existsSync(writeDir)) mkdirSync(writeDir, { recursive: true });
    writeFileSync(TENANT_FILE(writeDir), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('[tenant] save error:', e.message); }
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function generateApiKey() {
  return 'otai_sk_' + randomBytes(24).toString('base64url');
}

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function signTenantToken(tenant) {
  const secret = process.env.JWT_SECRET || 'openthai-jwt-secret-2026';
  return jwt.sign(
    { tenantId: tenant.id, plan: tenant.plan, role: 'tenant' },
    secret,
    { expiresIn: '30d' },
  );
}

function verifyTenantToken(token) {
  const secret = process.env.JWT_SECRET || 'openthai-jwt-secret-2026';
  try { return jwt.verify(token, secret); } catch { return null; }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createTenantManager(writeDir) {
  const tenants = loadTenants(writeDir);

  const flush = () => saveTenants(writeDir, tenants);

  const mgr = {
    tenants,

    // Create new tenant
    register({ name, email, plan = 'free', businessType = '', contactPhone = '' }) {
      if (!name?.trim() || !email?.trim()) throw new Error('name และ email จำเป็นต้องมี');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('อีเมลไม่ถูกต้อง');
      if (!PLANS[plan]) throw new Error(`plan ไม่ถูกต้อง: ${plan}`);

      const existing = tenants.find(t => t.email === email.toLowerCase().trim());
      if (existing) throw new Error('อีเมลนี้ลงทะเบียนไปแล้ว');

      const rawKey = generateApiKey();
      const tenant = {
        id:          `tenant_${Date.now()}_${randomBytes(4).toString('hex')}`,
        name:        name.trim().slice(0, 100),
        email:       email.toLowerCase().trim(),
        apiKeyHash:  hashKey(rawKey),       // never store raw key
        plan,
        planLimits:  PLANS[plan],
        businessType: businessType.slice(0, 100),
        contactPhone: contactPhone.slice(0, 20),
        settings: {
          default_platform: 'TikTok',
          default_lang:     'ภาษาไทย',
          default_category: 'ทั่วไป',
          default_style:    'sales',
          brand_name:       name.trim(),
          tone:             'friendly',
        },
        usage: { generates_today: 0, last_usage_date: null },
        active:    true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      tenants.push(tenant);
      flush();

      // Return raw key ONCE — never stored
      return { tenant: mgr.safeView(tenant), apiKey: rawKey };
    },

    // Verify API key → returns tenant or null
    verifyApiKey(key) {
      if (!key?.startsWith('otai_sk_')) return null;
      const h = hashKey(key);
      return tenants.find(t => t.apiKeyHash === h && t.active) || null;
    },

    // Verify tenant JWT → returns tenant or null
    verifyToken(token) {
      const payload = verifyTenantToken(token);
      if (!payload?.tenantId) return null;
      return tenants.find(t => t.id === payload.tenantId && t.active) || null;
    },

    // Login → JWT.
    // SECURITY: the API key is the ONLY tenant credential (register returns it once; email is not
    // secret). The old code had an `else if (email)` branch that issued a valid 30-day JWT for ANY
    // tenant given just its email and no secret at all — a full authentication bypass (impersonate,
    // read/patch settings, rotate the victim's API key, burn their quota). Login now REQUIRES a
    // valid API key; email, if supplied, is only an optional consistency check, never an auth path.
    login({ email, apiKey }) {
      const tenant = apiKey ? mgr.verifyApiKey(apiKey) : null;
      if (!tenant) throw new Error('ต้องระบุ API key ที่ถูกต้องเพื่อเข้าสู่ระบบ');
      if (email && tenant.email !== email.toLowerCase().trim()) {
        throw new Error('อีเมลไม่ตรงกับ API key');
      }
      const token = signTenantToken(tenant);
      return { token, tenant: mgr.safeView(tenant) };
    },

    // Get by ID
    getById(id) {
      return tenants.find(t => t.id === id) || null;
    },

    // Update settings
    update(id, patch) {
      const t = tenants.find(t => t.id === id);
      if (!t) throw new Error('ไม่พบ Tenant');

      const allowedFields = ['name', 'businessType', 'contactPhone', 'settings'];
      for (const k of allowedFields) {
        if (patch[k] !== undefined) {
          if (k === 'settings') t.settings = { ...t.settings, ...patch.settings };
          else t[k] = patch[k];
        }
      }
      t.updatedAt = new Date().toISOString();
      flush();
      return mgr.safeView(t);
    },

    // Rotate API key
    rotateKey(id) {
      const t = tenants.find(t => t.id === id);
      if (!t) throw new Error('ไม่พบ Tenant');
      const rawKey = generateApiKey();
      t.apiKeyHash = hashKey(rawKey);
      t.updatedAt  = new Date().toISOString();
      flush();
      return { apiKey: rawKey, message: 'API key ใหม่ — บันทึกไว้ในที่ปลอดภัย จะไม่แสดงอีกครั้ง' };
    },

    // Track daily usage
    trackUsage(id) {
      const t = tenants.find(t => t.id === id);
      if (!t) return;
      const today = new Date().toISOString().slice(0, 10);
      if (t.usage.last_usage_date !== today) {
        t.usage.generates_today = 0;
        t.usage.last_usage_date = today;
      }
      t.usage.generates_today++;
      flush();
      return t.usage.generates_today <= t.planLimits.generates_per_day;
    },

    // Check daily limit
    withinLimit(id) {
      const t = tenants.find(t => t.id === id);
      if (!t) return false;
      const today = new Date().toISOString().slice(0, 10);
      if (t.usage.last_usage_date !== today) return true;
      return t.usage.generates_today < t.planLimits.generates_per_day;
    },

    // Safe public view (strip apiKeyHash)
    safeView(t) {
      if (!t) return null;
      const { apiKeyHash, ...safe } = t;
      return safe;
    },

    // Admin list
    listAll() {
      return tenants.map(t => mgr.safeView(t));
    },

    // PDPA (ม.30 access / ม.33 erasure) — a tenant account holds real personal data
    // (name, email, contactPhone, businessType, brand_name), but the data-subject-rights
    // flow in server.js only knew about waitlist/consents/producers/portalLeads/affiliates,
    // so a tenant who asked to see or delete their data got "0 records / removed 0" while the
    // account sat untouched in tenants.json. These two give that flow a way to reach tenants.
    // findByEmail returns the SAFE view (apiKeyHash stripped) so an access export never leaks
    // the key hash.
    findByEmail(email) {
      const e = String(email || '').toLowerCase().trim();
      return tenants.filter(t => (t.email || '').toLowerCase() === e).map(t => mgr.safeView(t));
    },
    eraseByEmail(email) {
      const e = String(email || '').toLowerCase().trim();
      let removed = 0;
      for (let i = tenants.length - 1; i >= 0; i--) {
        if ((tenants[i].email || '').toLowerCase() === e) { tenants.splice(i, 1); removed++; }
      }
      if (removed) flush();
      return { removed };
    },
  };

  return mgr;
}

// ── Express middleware factory ─────────────────────────────────────────────────
// Usage: app.use('/api/...', requireTenant(tenantMgr))
// Sets req.tenant if valid X-API-Key header or Bearer JWT (role=tenant)

export function requireTenant(tenantMgr) {
  return (req, res, next) => {
    // 1. X-API-Key header
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const tenant = tenantMgr.verifyApiKey(apiKey);
      if (!tenant) return res.status(401).json({ success: false, message: 'API key ไม่ถูกต้องหรือหมดอายุ' });
      req.tenant = tenant;
      return next();
    }

    // 2. Bearer JWT (tenant-role)
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const tenant = tenantMgr.verifyToken(auth.slice(7));
      if (tenant) {
        req.tenant = tenant;
        return next();
      }
    }

    return res.status(401).json({ success: false, message: 'ต้องการ X-API-Key หรือ Bearer token' });
  };
}
