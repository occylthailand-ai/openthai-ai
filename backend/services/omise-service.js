/**
 * Omise Payment Service — DIR-004 (Plutus)
 * รองรับ: PromptPay QR, Credit Card, TrueMoney, Bank App-to-App
 * Docs: https://docs.opn.ooo/
 */
import https from 'https';
import crypto from 'crypto';

const OMISE_SECRET = process.env.OMISE_SECRET_KEY || '';
const OMISE_PUBLIC = process.env.OMISE_PUBLIC_KEY || '';
const BASE_URL     = 'api.omise.co';

// ─── Internal helper ──────────────────────────────────────────────────────────
function omiseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${OMISE_SECRET}:`).toString('base64');
    const bodyStr = body ? JSON.stringify(body) : null;

    const opts = {
      hostname: BASE_URL,
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.object === 'error') reject(new Error(parsed.message));
          else resolve(parsed);
        } catch (e) { reject(e); }
      });
    });

    // 10 second timeout to prevent hanging requests
    const timeout = setTimeout(() => {
      req.destroy(new Error('Omise request timed out after 10 seconds'));
    }, 10000);
    req.on('close', () => clearTimeout(timeout));

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Amount validation helper ─────────────────────────────────────────────────
function validateAmountTHB(amountTHB) {
  if (typeof amountTHB !== 'number' || isNaN(amountTHB)) {
    throw new Error('amountTHB must be a valid number');
  }
  if (amountTHB <= 0) {
    throw new Error('amountTHB must be a positive number');
  }
  if (amountTHB > 999999) {
    throw new Error('amountTHB exceeds maximum allowed amount of 999999');
  }
}

// ─── 1. สร้าง PromptPay QR Source ────────────────────────────────────────────
export async function createPromptPaySource(amountTHB) {
  validateAmountTHB(amountTHB);
  const amountSatang = Math.round(amountTHB * 100); // Omise ใช้ satang (สตางค์)
  const source = await omiseRequest('POST', '/sources', {
    type: 'promptpay',
    amount: amountSatang,
    currency: 'THB',
  });
  return source;
}

// ─── 2. สร้าง Charge (เรียกเก็บเงิน) ─────────────────────────────────────────
export async function createCharge({
  amountTHB,
  sourceId,       // PromptPay source ID หรือ token จาก card
  description,
  orderId,        // idempotency key — ป้องกัน double charge
  metadata = {},
}) {
  validateAmountTHB(amountTHB);
  const amountSatang = Math.round(amountTHB * 100);
  const charge = await omiseRequest('POST', '/charges', {
    amount: amountSatang,
    currency: 'THB',
    source: sourceId,
    description,
    metadata: { order_id: orderId, ...metadata },
    return_uri: `${process.env.FRONTEND_URL || 'https://openthai-ai.com'}/payment/callback`,
  });
  return charge;
}

// ─── 3. Void/Cancel Charge (ยกเลิก QR ที่ยังไม่ได้สแกน) ─────────────────────
export async function voidCharge(chargeId) {
  const result = await omiseRequest('POST', `/charges/${chargeId}/expire`);
  return result;
}

// ─── 4. ดึงสถานะ Charge ───────────────────────────────────────────────────────
export async function getCharge(chargeId) {
  return omiseRequest('GET', `/charges/${chargeId}`);
}

// ─── 5. สร้าง Customer (เก็บ card สำหรับ recurring) ──────────────────────────
export async function createCustomer({ email, description, token }) {
  return omiseRequest('POST', '/customers', { email, description, card: token });
}

// ─── 6. App-to-App (Mobile Banking DeepLink) ──────────────────────────────────
// Supported: KBank, SCB, KTB, BAY, TMB — ผ่าน internet_banking source type
export async function createInternetBankingSource(bank, amountTHB) {
  const bankCodes = {
    kbank:  'internet_banking_kbank',
    scb:    'internet_banking_scb',
    ktb:    'internet_banking_ktb',
    bay:    'internet_banking_bay',
    bbl:    'internet_banking_bbl',
  };
  const sourceType = bankCodes[bank.toLowerCase()];
  if (!sourceType) throw new Error(`ไม่รองรับธนาคาร: ${bank}`);

  const source = await omiseRequest('POST', '/sources', {
    type: sourceType,
    amount: Math.round(amountTHB * 100),
    currency: 'THB',
  });
  return source;
}

// ─── 7. TrueMoney Wallet ────────────────────────────────────────────────────
export async function createTrueMoneySource(phoneNumber, amountTHB) {
  return omiseRequest('POST', '/sources', {
    type: 'truemoney',
    amount: Math.round(amountTHB * 100),
    currency: 'THB',
    phone_number: phoneNumber,
  });
}

// ─── 8. Webhook Event Handler ─────────────────────────────────────────────────
// ใช้ใน /api/payment/webhook — Omise จะ POST event เมื่อสถานะเปลี่ยน
export function parseWebhookEvent(rawBody, signature, webhookSecret) {
  // TODO: SECURITY REQUIREMENT — Omise webhook signature verification must be enabled before
  // going live. Set OMISE_WEBHOOK_SECRET in .env and uncomment the verification block below.
  // Without this check, any party can spoof payment events (e.g. fake "charge.complete").
  // Reference: https://docs.opn.ooo/webhooks#signature-verification
  if (webhookSecret) {
    const computed = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const trusted = Buffer.from(signature || '');
    const actual  = Buffer.from(computed);
    if (trusted.length !== actual.length || !crypto.timingSafeEqual(trusted, actual)) {
      throw new Error('Invalid webhook signature — possible spoofed event');
    }
  }
  return JSON.parse(rawBody);
}

// ─── 9. สร้าง QR พร้อม expiry 30 นาที ─────────────────────────────────────────
export async function createQRWithExpiry(amountTHB, orderId) {
  const source  = await createPromptPaySource(amountTHB);
  const charge  = await createCharge({ amountTHB, sourceId: source.id, description: `OpenThai AI — Order ${orderId}`, orderId });

  // QR หมดอายุใน 30 นาที — Omise จะ expire อัตโนมัติ
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    chargeId:   charge.id,
    sourceId:   source.id,
    qrCodeUrl:  source.scannable_code?.image?.download_uri || null,
    amount:     amountTHB,
    currency:   'THB',
    expiresAt,
    status:     charge.status,   // 'pending' | 'successful' | 'failed'
  };
}

// ─── 10. Plan → Amount Mapping ────────────────────────────────────────────────
export const PLAN_PRICES = {
  free:     0,
  pro:      149,
  business: 299,
};

export function getPlanPrice(plan) {
  return PLAN_PRICES[plan] || 0;
}
