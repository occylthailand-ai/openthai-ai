// lib/promptpay.ts
// ── PromptPay QR (collect) + SCB API (payout) ────────────

import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/* ═══════════════════════════════════════════════════════
   1. RECEIVE MONEY — Generate PromptPay QR
   ═══════════════════════════════════════════════════════ */

/**
 * สร้าง QR Code PromptPay สำหรับรับเงิน
 * @param phoneOrId  เบอร์โทร "0812345678" หรือเลขบัตร "1234500000001"
 * @param amount     จำนวนเงิน (บาท) — ใส่ 0 เพื่อไม่ระบุ
 * @returns          data URL ของรูป PNG
 */
export async function generatePromptPayQR(
  phoneOrId: string,
  amount: number = 0
): Promise<string> {
  const payload = generatePayload(phoneOrId, { amount });
  const dataURL = await QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: "#030407", light: "#ffffff" },
  });
  return dataURL;
}

/* ═══════════════════════════════════════════════════════
   2. SEND MONEY — SCB Business API (payout)
   ═══════════════════════════════════════════════════════ */

const SCB_BASE = "https://api.scb.co.th";

type SCBTokenResponse = { accessToken: string; expiresIn: number };
type SCBTransferResult = {
  transactionId: string;
  status: "success" | "failed";
  errorCode?: string;
  errorDescription?: string;
};

let _scbToken: string | null = null;
let _scbTokenExp = 0;

/** ขอ Access Token จาก SCB */
async function getSCBToken(): Promise<string> {
  if (_scbToken && Date.now() < _scbTokenExp) return _scbToken;

  const res = await fetch(`${SCB_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "resourceOwnerId": process.env.SCB_APP_ID!,
      "requestUId": crypto.randomUUID(),
      "accept-language": "EN",
    },
    body: JSON.stringify({
      applicationKey: process.env.SCB_API_KEY,
      applicationSecret: process.env.SCB_API_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`SCB auth failed: ${res.status}`);
  const data: { data: SCBTokenResponse } = await res.json();
  _scbToken = data.data.accessToken;
  _scbTokenExp = Date.now() + (data.data.expiresIn - 60) * 1000;
  return _scbToken;
}

/**
 * โอนเงินผ่าน PromptPay (SCB → ปลายทาง)
 * @param toPhone    เบอร์โทรปลายทาง
 * @param amount     จำนวนเงิน (บาท)
 * @param ref        reference สำหรับ audit
 */
export async function scbTransferPromptPay(
  toPhone: string,
  amount: number,
  ref: string
): Promise<SCBTransferResult> {
  const token = await getSCBToken();
  const transactionId = crypto.randomUUID();

  const res = await fetch(`${SCB_BASE}/v1/payment/transferto/promptpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "resourceOwnerId": process.env.SCB_APP_ID!,
      "requestUId": transactionId,
      "accept-language": "TH",
    },
    body: JSON.stringify({
      payAmount: amount,
      payeeProxy: toPhone,           // เบอร์ PromptPay
      payeeProxyType: "MSISDN",      // หรือ "NATID" ถ้าเป็นเลขบัตร
      payeeAccountType: "BANKAC",
      senderBankCode: "014",         // SCB = 014
      senderAccountNo: process.env.SCB_ACCOUNT_NO,
      receiverBankCode: "promptpay",
      toAccountType: "PROMPTPAY",
      transactionType: "TRAN",
      ref1: ref.slice(0, 13),
      ref2: "AFFILIATE",
      ref3: "HUB",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { transactionId, status: "failed", errorDescription: JSON.stringify(err) };
  }

  const data = await res.json();
  return {
    transactionId: data.data?.transactionId ?? transactionId,
    status: data.data?.status === "success" ? "success" : "failed",
  };
}

/**
 * โอนเงินเข้าธนาคาร (SCB → บัญชีธนาคารอื่น)
 */
export async function scbTransferBank(
  toBankCode: string,  // "004" = Kasikorn, "006" = Krungsri, etc.
  toAccount: string,
  amount: number,
  ref: string
): Promise<SCBTransferResult> {
  const token = await getSCBToken();
  const transactionId = crypto.randomUUID();

  const res = await fetch(`${SCB_BASE}/v1/payment/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "resourceOwnerId": process.env.SCB_APP_ID!,
      "requestUId": transactionId,
      "accept-language": "TH",
    },
    body: JSON.stringify({
      payAmount: amount,
      recvAccountNo: toAccount,
      recvBankCode: toBankCode,
      sendAccountNo: process.env.SCB_ACCOUNT_NO,
      ref1: ref.slice(0, 13),
      ref2: "AFFILIATE",
    }),
  });

  if (!res.ok) {
    return { transactionId, status: "failed" };
  }

  const data = await res.json();
  return {
    transactionId: data.data?.transactionId ?? transactionId,
    status: "success",
  };
}

/** ตรวจสอบสถานะ transaction */
export async function checkSCBTransaction(transactionId: string) {
  const token = await getSCBToken();
  const res = await fetch(`${SCB_BASE}/v1/payment/transaction/${transactionId}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "resourceOwnerId": process.env.SCB_APP_ID!,
      "requestUId": crypto.randomUUID(),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

/* ═══════════════════════════════════════════════════════
   Bank Codes (ไทย) — reference
   ═══════════════════════════════════════════════════════
   002 BBL (กรุงเทพ)
   004 KBANK (กสิกรไทย)
   006 KTB (กรุงไทย)
   011 TTB (ทหารไทยธนชาต)
   014 SCB (ไทยพาณิชย์)
   022 CIMB
   024 UOB
   025 BAY (กรุงศรี)
   033 GHB (ออมสิน)
   034 BAAC (ธกส.)
   069 KKP
   098 TISCO
*/
export const BANK_CODES: Record<string, string> = {
  "BBL":   "002", "KBANK": "004", "KTB":   "006",
  "TTB":   "011", "SCB":   "014", "CIMB":  "022",
  "UOB":   "024", "BAY":   "025", "GSB":   "030",
  "GHB":   "033", "BAAC":  "034", "KKP":   "069",
  "TISCO": "098",
};
