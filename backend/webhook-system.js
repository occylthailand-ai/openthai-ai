// OpenThai AI — Webhook / Event System
// Push events to registered subscriber endpoints instead of polling.
//
// Event types:
//   agent.completed      — AI agent ran successfully (hook, caption, score)
//   content.generated    — Manual /api/generate called
//   watchdog.healed      — Auto-heal fixed a stuck agent
//   system.error         — Error logged (level=error)
//   tenant.created       — New tenant registered
//   affiliate.joined     — New affiliate signed up
//
// Security: each webhook has an HMAC-SHA256 secret.
// Delivery: up to 3 retries (0s → 5s → 30s backoff). Non-blocking.
//
// Endpoints registered in server.js:
//   POST   /api/webhooks          — register a webhook
//   GET    /api/webhooks          — list webhooks (admin / tenant-scoped)
//   DELETE /api/webhooks/:id      — unregister
//   POST   /api/webhooks/:id/test — fire a test event

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHmac, randomBytes } from 'crypto';

const WEBHOOK_FILE = (writeDir) => join(writeDir, 'webhooks.json');
const DELIVERY_LOG = (writeDir) => join(writeDir, 'webhook_deliveries.json');
const MAX_DELIVERIES = 200;

// ── Storage ───────────────────────────────────────────────────────────────────

function load(file) {
  try { if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')); } catch (_) {}
  return [];
}

function save(file, data, writeDir) {
  try {
    if (!existsSync(writeDir)) mkdirSync(writeDir, { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('[webhook] save error:', e.message); }
}

// ── HMAC signature ────────────────────────────────────────────────────────────

function sign(secret, payload) {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

// ── HTTP delivery with retry ──────────────────────────────────────────────────

async function deliverOnce(url, payload, sig, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method:  'POST',
      signal:  ctrl.signal,
      headers: {
        'Content-Type':          'application/json',
        'X-OpenThai-Signature':  sig,
        'X-OpenThai-Event':      JSON.parse(payload).event,
        'User-Agent':            'OpenThaiAI-Webhook/2.0',
      },
      body: payload,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(tid);
  }
}

async function deliverWithRetry(hook, payload, sig) {
  const delays = [0, 5000, 30000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await new Promise(r => setTimeout(r, delays[attempt]));
    const result = await deliverOnce(hook.url, payload, sig);
    if (result.ok) return { ...result, attempt };
    if (attempt === delays.length - 1) return { ...result, attempt, failed: true };
  }
}

// ── Public factory ────────────────────────────────────────────────────────────

export function createWebhookSystem(writeDir) {
  const webhooks   = load(WEBHOOK_FILE(writeDir));
  const deliveries = load(DELIVERY_LOG(writeDir));

  const flush = () => {
    save(WEBHOOK_FILE(writeDir), webhooks, writeDir);
  };
  const flushLog = () => {
    save(DELIVERY_LOG(writeDir), deliveries.slice(0, MAX_DELIVERIES), writeDir);
  };

  return {
    // Register a new webhook
    register({ tenantId = 'global', url, events = ['*'], description = '' }) {
      if (!url) throw new Error('url is required');
      try { new URL(url); } catch { throw new Error('Invalid URL'); }

      const secret = randomBytes(20).toString('hex');
      const hook = {
        id:          `wh_${Date.now()}_${randomBytes(4).toString('hex')}`,
        tenantId,
        url,
        events,       // ['*'] = all events
        description,
        secret,
        active:      true,
        createdAt:   new Date().toISOString(),
        lastDelivery: null,
        deliveryCount: 0,
        failCount:    0,
      };
      webhooks.push(hook);
      flush();
      return { id: hook.id, secret, events, url, message: 'Webhook registered. Save the secret — it will not be shown again.' };
    },

    // List webhooks (optionally filtered by tenantId)
    list({ tenantId, adminView = false } = {}) {
      let list = tenantId ? webhooks.filter(w => w.tenantId === tenantId) : webhooks;
      return list.map(w => ({
        id:            w.id,
        url:           w.url,
        events:        w.events,
        description:   w.description,
        active:        w.active,
        createdAt:     w.createdAt,
        lastDelivery:  w.lastDelivery,
        deliveryCount: w.deliveryCount,
        failCount:     w.failCount,
        ...(adminView ? { tenantId: w.tenantId } : {}),
      }));
    },

    // Unregister
    remove(id) {
      const idx = webhooks.findIndex(w => w.id === id);
      if (idx < 0) return { deleted: false };
      webhooks.splice(idx, 1);
      flush();
      return { deleted: true, id };
    },

    // Dispatch an event to all matching webhooks (fire-and-forget)
    dispatch(event, data = {}, tenantId = null) {
      const payload = JSON.stringify({
        event,
        tenantId: tenantId || 'global',
        ts:       new Date().toISOString(),
        data,
      });

      const targets = webhooks.filter(w => {
        if (!w.active) return false;
        if (tenantId && w.tenantId !== 'global' && w.tenantId !== tenantId) return false;
        return w.events.includes('*') || w.events.includes(event);
      });

      if (!targets.length) return;

      // Non-blocking — deliver in background
      for (const hook of targets) {
        const sig = sign(hook.secret, payload);

        (async () => {
          const result = await deliverWithRetry(hook, payload, sig);
          hook.lastDelivery = new Date().toISOString();
          hook.deliveryCount++;
          if (result.failed) hook.failCount++;

          // Auto-disable after 20 consecutive failures
          if (hook.failCount > 20) {
            hook.active = false;
            console.warn(`[webhook] 🔕 Auto-disabled ${hook.id} (${hook.url}) — too many failures`);
          }
          flush();

          // Log delivery
          deliveries.unshift({
            ts:         hook.lastDelivery,
            hookId:     hook.id,
            url:        hook.url,
            event,
            status:     result.status,
            ok:         result.ok,
            attempt:    result.attempt,
            failed:     !!result.failed,
          });
          flushLog();
        })();
      }
    },

    // Test fire a webhook
    async test(id) {
      const hook = webhooks.find(w => w.id === id);
      if (!hook) throw new Error('Webhook not found');

      const payload = JSON.stringify({
        event:    'webhook.test',
        tenantId: hook.tenantId,
        ts:       new Date().toISOString(),
        data:     { message: '✅ OpenThai AI Webhook test — connection verified!' },
      });

      const sig    = sign(hook.secret, payload);
      const result = await deliverOnce(hook.url, payload, sig);
      return { url: hook.url, ...result };
    },

    // Delivery log (admin)
    logs({ limit = 50 } = {}) {
      return deliveries.slice(0, limit);
    },

    webhooks,
  };
}
