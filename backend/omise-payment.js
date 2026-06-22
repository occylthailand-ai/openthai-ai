// Openthai.ai — Omise Payment System
// PromptPay QR · Credit Card · Subscription Billing
// Docs: https://docs.opn.ooo/

import { createHmac, timingSafeEqual } from 'crypto';

const OMISE_API_URL = 'https://api.omise.co';

// ── Omise REST helper ─────────────────────────────────────────────────────────
async function omise(method, path, body = null, usePublicKey = false) {
  const key = usePublicKey
    ? process.env.OMISE_PUBLIC_KEY
    : process.env.OMISE_SECRET_KEY;
  if (!key) throw new Error('OMISE_SECRET_KEY not configured');

  const opts = {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${OMISE_API_URL}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Omise HTTP ${res.status}`);
  return data;
}

// ── Plans ─────────────────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  free:    { name: 'Free',    price_thb: 0,   interval: null,    omise_plan_id: null },
  pro:     { name: 'Pro',     price_thb: 20,  interval: 'month', omise_plan_id: process.env.OMISE_PLAN_PRO     || null },
  premier: { name: 'Premier', price_thb: 30,  interval: 'month', omise_plan_id: process.env.OMISE_PLAN_PREMIER || null },
};

// ── PromptPay QR Charge ───────────────────────────────────────────────────────
export async function createPromptPayCharge({ amount_thb, description, metadata = {} }) {
  // Step 1: สร้าง source PromptPay
  const source = await omise('POST', '/sources', {
    type: 'promptpay',
    amount: amount_thb * 100,  // Omise ใช้สตางค์
    currency: 'thb',
  });

  // Step 2: สร้าง charge
  const charge = await omise('POST', '/charges', {
    amount: amount_thb * 100,
    currency: 'thb',
    source: source.id,
    description,
    metadata,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 นาที
  });

  return {
    charge_id:   charge.id,
    status:      charge.status,
    amount_thb,
    qr_image_url: charge.source?.scannable_code?.image?.download_uri || null,
    expires_at:  charge.expires_at,
    promptpay_ref: charge.source?.reference || null,
  };
}

// ── Credit / Debit Card Charge ────────────────────────────────────────────────
// `token` มาจาก Omise.js ฝั่ง client (tokenize บัตรแบบ PCI-compliant — เลขบัตร
// ไม่เคยผ่าน server ของเรา). รองรับ 3-D Secure ผ่าน authorize_uri + return_uri.
export async function createCardCharge({ amount_thb, token, description, metadata = {}, return_uri = null }) {
  const charge = await omise('POST', '/charges', {
    amount: amount_thb * 100,   // Omise ใช้สตางค์
    currency: 'thb',
    card: token,
    description,
    metadata,
    ...(return_uri ? { return_uri } : {}),
  });

  return {
    charge_id:     charge.id,
    status:        charge.status,        // pending | successful | failed
    paid:          charge.paid,
    amount_thb,
    authorize_uri: charge.authorize_uri || null,  // ถ้าต้องทำ 3-D Secure
    authorized:    charge.authorized,
    failure_message: charge.failure_message || null,
  };
}

// ── Create / Get Omise Customer ───────────────────────────────────────────────
export async function createOrGetCustomer({ email, name, card_token = null }) {
  const customer = await omise('POST', '/customers', {
    email,
    description: name,
    ...(card_token ? { card: card_token } : {}),
  });
  return { customer_id: customer.id, email: customer.email };
}

// ── Create Subscription (recurring) ──────────────────────────────────────────
export async function createSubscription({ customer_id, plan_key }) {
  const plan = SUBSCRIPTION_PLANS[plan_key];
  if (!plan) throw new Error(`Unknown plan: ${plan_key}`);
  if (!plan.omise_plan_id) throw new Error(`Omise plan ID not configured for: ${plan_key}`);

  const sub = await omise('POST', '/subscriptions', {
    customer: customer_id,
    plan:     plan.omise_plan_id,
  });
  return {
    subscription_id: sub.id,
    status:  sub.status,
    plan:    plan_key,
    amount_thb: plan.price_thb,
    next_charge_at: sub.next_charge_at,
  };
}

// ── Retrieve Charge Status ────────────────────────────────────────────────────
export async function getChargeStatus(charge_id) {
  const charge = await omise('GET', `/charges/${charge_id}`);
  return {
    charge_id,
    status: charge.status,  // pending | successful | failed | expired
    paid:   charge.paid,
    amount_thb: charge.amount / 100,
    paid_at: charge.paid_at,
  };
}

// ── Cancel Subscription ────────────────────────────────────────────────────────
export async function cancelSubscription(subscription_id) {
  const sub = await omise('DELETE', `/subscriptions/${subscription_id}`);
  return { subscription_id, status: sub.status };
}

// ── Verify Omise Webhook Signature ─────────────────────────────────────────────
export function verifyOmiseWebhook(rawBody, signatureHeader) {
  const secret = process.env.OMISE_WEBHOOK_SECRET;
  if (!secret) {
    // ⚠️ Fail-closed ใน production: ไม่มี secret = ปฏิเสธทุก webhook (กัน webhook ปลอม)
    // โหมด local dev เท่านั้นที่ข้ามการตรวจได้ เพื่อความสะดวกตอนทดสอบ
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    return !isProd;
  }
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // timing-safe compare
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ── Create Omise Plans (run once at setup) ─────────────────────────────────────
export async function ensureOmisePlans() {
  const results = {};
  for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.price_thb === 0 || plan.omise_plan_id) { results[key] = plan.omise_plan_id; continue; }
    try {
      const created = await omise('POST', '/plans', {
        name:     plan.name,
        amount:   plan.price_thb * 100,
        currency: 'thb',
        interval: plan.interval,
        interval_count: 1,
      });
      results[key] = created.id;
      console.log(`[omise] Plan created: ${key} → ${created.id}`);
    } catch (e) {
      console.warn(`[omise] Plan ${key} error:`, e.message);
    }
  }
  return results;
}
