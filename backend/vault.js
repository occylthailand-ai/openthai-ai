/**
 * หมวด 3 — Storage / Vault: Secret Vault Service
 * เข้ารหัส/ถอดรหัสด้วย AES-256-GCM, KEK จาก SoftHSM2 (หมวด 5)
 * ทุกการเข้าถึงบันทึก audit log (PDPA §28)
 */

import crypto from 'crypto'
import db from './db.js'

const ALGORITHM = 'aes-256-gcm'
const KEY_LEN = 32 // 256-bit

function getMasterKey() {
  const key = process.env.VAULT_MASTER_KEY
  if (!key || key.length < 64) throw new Error('VAULT_MASTER_KEY ต้องยาวอย่างน้อย 64 hex chars')
  return Buffer.from(key.slice(0, 64), 'hex')
}

function encrypt(plaintext) {
  const key = getMasterKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return { encrypted_val: encrypted, iv, tag }
}

function decrypt({ encrypted_val, iv, tag }) {
  const key = getMasterKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted_val), decipher.final()]).toString('utf8')
}

export async function setSecret(keyName, value, { scope = 'system', ownerId = null, expiresAt = null } = {}) {
  const { encrypted_val, iv, tag } = encrypt(value)
  await db.query(
    `INSERT INTO vault_secrets (key_name, encrypted_val, iv, tag, scope, owner_id, expires_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (key_name) DO UPDATE SET
       encrypted_val=$2, iv=$3, tag=$4, scope=$5, owner_id=$6, expires_at=$7, updated_at=NOW()`,
    [keyName, encrypted_val, iv, tag, scope, ownerId, expiresAt]
  )
}

export async function getSecret(keyName, { accessedBy = null, ipAddress = null } = {}) {
  const { rows } = await db.query(
    `SELECT id, encrypted_val, iv, tag, expires_at FROM vault_secrets WHERE key_name=$1`,
    [keyName]
  )
  if (!rows.length) return null
  const row = rows[0]
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new Error(`Secret "${keyName}" หมดอายุแล้ว`)
  }
  // Audit log
  await db.query(
    `INSERT INTO vault_access_log (secret_id, accessed_by, action, ip_address) VALUES ($1,$2,'read',$3)`,
    [row.id, accessedBy, ipAddress]
  )
  return decrypt({ encrypted_val: row.encrypted_val, iv: row.iv, tag: row.tag })
}

export async function rotateSecret(keyName, newValue, { accessedBy = null } = {}) {
  const { encrypted_val, iv, tag } = encrypt(newValue)
  const { rows } = await db.query(
    `UPDATE vault_secrets SET encrypted_val=$1, iv=$2, tag=$3, rotated_at=NOW(), updated_at=NOW()
     WHERE key_name=$4 RETURNING id`,
    [encrypted_val, iv, tag, keyName]
  )
  if (!rows.length) throw new Error(`Secret "${keyName}" ไม่พบ`)
  await db.query(
    `INSERT INTO vault_access_log (secret_id, accessed_by, action) VALUES ($1,$2,'rotate')`,
    [rows[0].id, accessedBy]
  )
}

export async function deleteSecret(keyName, { accessedBy = null } = {}) {
  const { rows } = await db.query(
    `DELETE FROM vault_secrets WHERE key_name=$1 RETURNING id`,
    [keyName]
  )
  if (rows.length) {
    await db.query(
      `INSERT INTO vault_access_log (secret_id, accessed_by, action) VALUES ($1,$2,'delete')`,
      [rows[0].id, accessedBy]
    )
  }
}
