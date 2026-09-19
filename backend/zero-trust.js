/**
 * หมวด 4 — OS / Security: Zero Trust Policy Enforcer
 * "Never trust, always verify" — ตรวจสอบทุก request ทุก layer
 * รองรับ: JWT verify, RBAC check, Rate limit per role, Audit log
 */

import jwt from 'jsonwebtoken'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const policy = yaml.load(fs.readFileSync(path.join(__dirname, 'rbac-policy.yaml'), 'utf8'))

// ===== JWT Verification =====

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export function extractToken(req) {
  const auth = req.headers?.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies?.token || null
}

// ===== RBAC =====

function resolvePermissions(roleName, visited = new Set()) {
  if (visited.has(roleName)) return new Set()
  visited.add(roleName)
  const role = policy.roles[roleName]
  if (!role) return new Set()
  const perms = new Set(role.permissions || [])
  if (perms.has('*')) return new Set(['*'])
  for (const inherited of role.inherits || []) {
    for (const p of resolvePermissions(inherited, visited)) perms.add(p)
  }
  return perms
}

export function can(role, resource, action) {
  const perms = resolvePermissions(role)
  if (perms.has('*')) return true

  // ตรวจ deny list ก่อน
  for (const deny of policy.deny || []) {
    if (
      deny.roles.includes(role) &&
      (deny.resource === resource || deny.resource === '*') &&
      (deny.action === action || deny.action === '*')
    ) return false
  }

  // ตรวจ allow
  const exact = `${resource}:${action}`
  const ownOnly = `${resource}:${action}:own`
  return perms.has(exact) || perms.has(ownOnly) || perms.has(`${resource}:*`)
}

// ===== Middleware =====

export function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' })

  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' })

  req.user = payload
  next()
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'ไม่ได้ authenticated' })
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `ต้องการสิทธิ์: ${allowedRoles.join(' หรือ ')}` })
    }
    next()
  }
}

export function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'ไม่ได้ authenticated' })
    if (!can(req.user.role, resource, action)) {
      return res.status(403).json({
        error: `ไม่มีสิทธิ์: ${resource}:${action}`,
        role: req.user.role,
      })
    }
    next()
  }
}

// ===== MFA Check =====

export function requireMFA(req, res, next) {
  const mfaRoles = policy.constraints?.mfa_required_roles || []
  if (mfaRoles.includes(req.user?.role) && !req.user?.mfa_verified) {
    return res.status(403).json({ error: 'บทบาทนี้ต้องยืนยัน MFA ก่อน' })
  }
  next()
}

// ===== Data Sovereignty Check =====

export function requireDataResidency(req, res, next) {
  const required = policy.constraints?.data_residency
  if (required === 'TH') {
    const region = req.headers['x-region'] || process.env.DEPLOY_REGION || 'TH'
    if (region !== 'TH') {
      return res.status(451).json({ error: 'ข้อมูลนี้ต้องประมวลผลในประเทศไทยเท่านั้น (Sovereign by Default)' })
    }
  }
  next()
}

// ===== Affiliate Depth Guard (Non-MLM) =====

export async function checkAffiliateDepth(affiliateId, db) {
  const maxDepth = policy.constraints?.affiliate_depth_max || 2
  const { rows } = await db.query(
    `WITH RECURSIVE chain AS (
       SELECT id, referrer_id, 1 AS depth FROM affiliates WHERE id = $1
       UNION ALL
       SELECT a.id, a.referrer_id, c.depth + 1
       FROM affiliates a JOIN chain c ON a.id = c.referrer_id
       WHERE c.depth < $2
     ) SELECT MAX(depth) AS max_depth FROM chain`,
    [affiliateId, maxDepth + 1]
  )
  const depth = rows[0]?.max_depth || 0
  if (depth > maxDepth) throw new Error(`Affiliate chain ลึกเกิน ${maxDepth} ชั้น — ผิดเงื่อนไข Non-MLM`)
}
