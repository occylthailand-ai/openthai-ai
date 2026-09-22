/**
 * PDPA Consent Management — พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
 *
 * บันทึก: ใครยินยอม · เมื่อไหร่ · ยินยอมอะไร · เวอร์ชัน Privacy Notice ไหน
 * ใช้งาน: import { createConsentRouter } from './consent.js'
 *          app.use('/api/consent', createConsentRouter(WRITE_DATA_DIR))
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHmac } from 'node:crypto';

// เวอร์ชัน Privacy Notice — เพิ่มทุกครั้งที่แก้ไขนโยบาย
export const PRIVACY_NOTICE_VERSION = '1.0.0';

// วัตถุประสงค์การประมวลผลข้อมูลทั้งหมดที่ต้องขอ consent แยก
export const CONSENT_PURPOSES = {
  service:     { id: 'service',     label: 'บริการหลัก',          basis: 'สัญญา',        required: true },
  analytics:   { id: 'analytics',   label: 'วิเคราะห์การใช้งาน',  basis: 'ความยินยอม',   required: false },
  marketing:   { id: 'marketing',   label: 'ข่าวสารและโปรโมชัน',  basis: 'ความยินยอม',   required: false },
  ai_training: { id: 'ai_training', label: 'ปรับปรุงโมเดล AI',     basis: 'ความยินยอม',   required: false },
};

function getConsentLog(dataDir) {
  const dir = join(dataDir, 'consent');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, 'consent-log.jsonl');
  return { dir, file };
}

function appendConsentEntry(dataDir, entry) {
  const { file } = getConsentLog(dataDir);
  writeFileSync(file, JSON.stringify(entry) + '\n', { flag: 'a' });
}

function getUserConsents(dataDir, userId) {
  const { file } = getConsentLog(dataDir);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return lines
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(e => e && e.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// สร้าง fingerprint สำหรับ anonymous tracking (ไม่เก็บ IP จริง)
function makeFingerprint(req) {
  const ua  = req.headers['user-agent'] || '';
  const ip  = req.ip || '';
  const key = process.env.VAULT_MASTER_KEY || 'openthai-pdpa-fingerprint-v1';
  return createHmac('sha256', key).update(ip + ua).digest('hex').slice(0, 16);
}

export function createConsentRouter(dataDir) {
  const router = Router();

  // GET /api/consent/purposes — รายการวัตถุประสงค์ทั้งหมด
  router.get('/purposes', (req, res) => {
    res.json({
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      purposes: Object.values(CONSENT_PURPOSES),
    });
  });

  // GET /api/consent/status?userId=xxx — ดูสถานะ consent ปัจจุบัน
  router.get('/status', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const history = getUserConsents(dataDir, userId);
    const latest  = {};
    for (const entry of history) {
      for (const [purpose, granted] of Object.entries(entry.consents || {})) {
        if (!(purpose in latest)) latest[purpose] = { granted, timestamp: entry.timestamp, version: entry.version };
      }
    }

    res.json({
      userId,
      currentVersion: PRIVACY_NOTICE_VERSION,
      needsReConsent: history.length === 0 || history[0]?.version !== PRIVACY_NOTICE_VERSION,
      consents: latest,
    });
  });

  // POST /api/consent/record — บันทึก consent ใหม่ (ให้หรือถอน)
  router.post('/record', (req, res) => {
    const { userId, consents, action = 'grant' } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId required' });
    }
    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({ error: 'consents object required' });
    }

    // ห้ามถอน consent ฐาน "สัญญา" — ถ้าถอนต้องยกเลิกบัญชี
    if (action === 'withdraw' && consents.service === false) {
      return res.status(400).json({
        error: 'การถอนความยินยอมบริการหลักต้องดำเนินการผ่านการยกเลิกบัญชีโดยตรง',
        contactEmail: 'privacy@openthai-ai.com',
      });
    }

    // ตรวจว่า purpose ทั้งหมดถูกต้อง
    const unknownPurposes = Object.keys(consents).filter(p => !(p in CONSENT_PURPOSES));
    if (unknownPurposes.length > 0) {
      return res.status(400).json({ error: `ไม่รู้จักวัตถุประสงค์: ${unknownPurposes.join(', ')}` });
    }

    const entry = {
      userId,
      action,
      consents,
      version:       PRIVACY_NOTICE_VERSION,
      timestamp:     new Date().toISOString(),
      fingerprint:   makeFingerprint(req),
      userAgent:     (req.headers['user-agent'] || '').slice(0, 200),
    };

    try {
      appendConsentEntry(dataDir, entry);
      res.json({ ok: true, recorded: entry.timestamp, version: PRIVACY_NOTICE_VERSION });
    } catch (err) {
      console.error('[consent] write error:', err.message);
      res.status(500).json({ error: 'บันทึกความยินยอมไม่สำเร็จ' });
    }
  });

  // POST /api/consent/withdraw-all — ถอนความยินยอมทั้งหมด (Right to Withdraw)
  router.post('/withdraw-all', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const withdrawEntry = {
      userId,
      action: 'withdraw-all',
      consents: Object.fromEntries(
        Object.keys(CONSENT_PURPOSES)
          .filter(p => CONSENT_PURPOSES[p].basis === 'ความยินยอม')
          .map(p => [p, false])
      ),
      version:     PRIVACY_NOTICE_VERSION,
      timestamp:   new Date().toISOString(),
      fingerprint: makeFingerprint(req),
    };

    try {
      appendConsentEntry(dataDir, withdrawEntry);
      res.json({
        ok: true,
        message: 'ถอนความยินยอมทั้งหมดที่ถอนได้สำเร็จ ข้อมูลที่ประมวลผลบนฐาน "สัญญา" ยังคงอยู่',
        withdrawnAt: withdrawEntry.timestamp,
      });
    } catch (err) {
      res.status(500).json({ error: 'บันทึกการถอนความยินยอมไม่สำเร็จ' });
    }
  });

  // GET /api/consent/history?userId=xxx — ประวัติ consent ทั้งหมด (Right of Access)
  router.get('/history', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const history = getUserConsents(dataDir, userId);
    res.json({ userId, count: history.length, history });
  });

  // POST /api/consent/consumer — portal สาธารณะ บันทึก consent แบบ anonymous
  router.post('/consumer', (req, res) => {
    const { purposes } = req.body;
    if (!purposes || typeof purposes !== 'object') {
      return res.status(400).json({ error: 'purposes required' });
    }

    const anonId = 'anon_' + makeFingerprint(req);
    const entry = {
      userId:      anonId,
      action:      'grant',
      consents:    purposes,
      version:     PRIVACY_NOTICE_VERSION,
      timestamp:   new Date().toISOString(),
      fingerprint: makeFingerprint(req),
      source:      'consumer-portal',
    };

    try {
      appendConsentEntry(dataDir, entry);
      res.json({ ok: true, anonId, recorded: entry.timestamp });
    } catch {
      res.status(500).json({ error: 'บันทึกไม่สำเร็จ' });
    }
  });

  return router;
}
