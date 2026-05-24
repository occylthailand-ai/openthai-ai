/**
 * Notification Service — DIR-010 (Hermes)
 * Priority: LINE → Email (Resend) → Console log
 * LINE_NOTIFY_TOKEN ยังไม่มี → fallback ไป email อัตโนมัติ
 */
import https from 'https';
import http  from 'http';

const LINE_TOKEN   = process.env.LINE_NOTIFY_TOKEN || '';
const RESEND_KEY   = process.env.RESEND_API_KEY   || '';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL       || 'zuejai@openthai-ai.com';
const SITE_URL     = process.env.FRONTEND_URL      || 'https://openthai-ai.com';

// ─── LINE Notify ─────────────────────────────────────────────────────────────
async function sendLine(message) {
  if (!LINE_TOKEN) return { ok: false, reason: 'LINE_NOTIFY_TOKEN ไม่ได้ตั้ง (OBS-004)' };

  return new Promise((resolve) => {
    const body = new URLSearchParams({ message }).toString();
    const opts = {
      hostname: 'notify-api.line.me',
      path: '/api/notify',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: parsed.status === 200, raw: parsed });
        } catch {
          resolve({ ok: false, reason: 'parse error' });
        }
      });
    });

    // 8 second timeout to prevent LINE Notify requests from hanging indefinitely
    const timeout = setTimeout(() => {
      req.destroy();
      resolve({ ok: false, reason: 'LINE Notify request timed out after 8 seconds' });
    }, 8000);
    req.on('close', () => clearTimeout(timeout));

    req.on('error', (e) => resolve({ ok: false, reason: e.message }));
    req.write(body);
    req.end();
  });
}

// ─── Email via Resend API ─────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!RESEND_KEY) return { ok: false, reason: 'RESEND_API_KEY ไม่ได้ตั้ง' };

  return new Promise((resolve) => {
    const body = JSON.stringify({
      from: 'Mythos <noreply@openthai-ai.com>',
      to,
      subject,
      html,
    });

    const opts = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: !!parsed.id, id: parsed.id, raw: parsed });
        } catch {
          resolve({ ok: false, reason: 'parse error' });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: e.message }));
    req.write(body);
    req.end();
  });
}

// ─── Notification Queue (in-memory — ใช้จนกว่าจะมี Redis) ─────────────────────
const queue = [];
let queueProcessing = false;

async function processQueue() {
  if (queueProcessing || queue.length === 0) return;
  queueProcessing = true;
  while (queue.length > 0) {
    const job = queue.shift();
    try { await job(); } catch (e) { console.error('[Hermes] queue error:', e.message); }
  }
  queueProcessing = false;
}

// ─── Main: notify() — ส่ง LINE → fallback email ──────────────────────────────
export async function notify({ message, subject, html, priority = 'normal' }) {
  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const fullMsg   = `[OpenThai AI]\n${message}\n\n⏰ ${timestamp}`;

  const send = async () => {
    // 1️⃣ ลอง LINE ก่อน
    const lineResult = await sendLine(fullMsg);
    if (lineResult.ok) {
      console.log(`[Hermes] ✅ LINE sent: ${message.slice(0, 60)}`);
      return { channel: 'line', ok: true };
    }

    // 2️⃣ fallback → Email
    if (RESEND_KEY) {
      const emailResult = await sendEmail({
        to: ADMIN_EMAIL,
        subject: subject || `[OpenThai AI] ${message.slice(0, 60)}`,
        html: html || `<p>${message.replace(/\n/g, '<br>')}</p><p style="color:#888;font-size:12px">⏰ ${timestamp}</p>`,
      });
      if (emailResult.ok) {
        console.log(`[Hermes] ✅ Email sent (LINE fallback): ${subject || message.slice(0, 60)}`);
        return { channel: 'email', ok: true, id: emailResult.id };
      }
    }

    // 3️⃣ last resort → console
    console.warn(`[Hermes] ⚠️ No notification channel — OBS-004 pending. Message: ${message}`);
    return { channel: 'console', ok: false };
  };

  // CRITICAL → ส่งทันที, normal → queue
  if (priority === 'critical') {
    return send();
  } else {
    queue.push(send);
    processQueue();
    return { queued: true };
  }
}

// ─── Pre-built notification templates ────────────────────────────────────────
export async function notifyNewUser(email, plan) {
  // Escape email to prevent control characters or newlines from injecting extra fields
  const safeEmail = String(email).replace(/[\r\n\t]/g, ' ').slice(0, 254);
  return notify({
    message: `🎉 User ใหม่!\nEmail: ${safeEmail}\nแผน: ${plan}\n\n📊 ${SITE_URL}/admin`,
    subject: `[OpenThai AI] User ใหม่: ${safeEmail}`,
    priority: 'normal',
  });
}

export async function notifyPayment(email, plan, amount) {
  return notify({
    message: `💰 ชำระเงินสำเร็จ!\nEmail: ${email}\nแผน: ${plan}\nจำนวน: ฿${amount}`,
    subject: `[OpenThai AI] Payment ฿${amount} — ${plan}`,
    priority: 'critical',
  });
}

export async function notifySystemAlert(message, severity = 'WARN') {
  const icon = severity === 'CRITICAL' ? '🚨' : '⚠️';
  return notify({
    message: `${icon} System Alert [${severity}]\n${message}\n\n📊 ${SITE_URL}/board`,
    subject: `[OpenThai AI] ${severity}: ${message.slice(0, 60)}`,
    priority: severity === 'CRITICAL' ? 'critical' : 'normal',
  });
}

export async function notifyDailyReport({ users, revenue, aiRequests, uptime }) {
  const msg = `📊 รายงานประจำวัน OpenThai AI
👥 Users: ${users}
💰 Revenue: ฿${revenue}
🤖 AI Requests: ${aiRequests}
⏱️ Uptime: ${uptime}%
📋 ${SITE_URL}/board`;

  return notify({
    message: msg,
    subject: `[OpenThai AI] Daily Report — ${new Date().toLocaleDateString('th-TH')}`,
    priority: 'normal',
  });
}

export async function notifyNewAffiliate(name, email, refCode) {
  return notify({
    message: `🤝 Affiliate ใหม่!\nชื่อ: ${name}\nEmail: ${email}\nRef code: ${refCode}`,
    subject: `[OpenThai AI] Affiliate ใหม่: ${name}`,
    priority: 'normal',
  });
}
