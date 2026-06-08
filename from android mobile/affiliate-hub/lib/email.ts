// lib/email.ts — Resend email sender

import { Resend } from "resend";

// Lazy init — avoids crash at build time when RESEND_API_KEY is not yet set
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM ?? "noreply@OpenThaiAi.com";
const APP  = process.env.NEXT_PUBLIC_APP_URL ?? "https://OpenThaiAi.com";

/* ── 1. Email Verification ───────────────────────────── */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
) {
  const link = `${APP}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "✦ ยืนยันอีเมล — Affiliate Hub",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <!-- Logo -->
          <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#F0B429;margin-bottom:32px;">◆ AFFILIATE HUB</div>
          <!-- Heading -->
          <h1 style="font-size:28px;font-weight:300;color:#E8EAF0;margin:0 0 12px;line-height:1.3;">
            ยืนยันอีเมลของคุณ
          </h1>
          <p style="font-size:15px;color:#6A7490;margin:0 0 36px;line-height:1.7;">
            สวัสดี <strong style="color:#E8EAF0;">${name}</strong><br>
            คลิกปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มรับ Commission
          </p>
          <!-- CTA -->
          <a href="${link}" style="display:inline-block;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.35);border-radius:2px;padding:14px 48px;font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#F0B429;text-decoration:none;">
            ✦ ยืนยันอีเมล
          </a>
          <!-- Note -->
          <p style="font-size:12px;color:#3A4258;margin:32px 0 0;line-height:1.6;">
            ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง<br>
            หากคุณไม่ได้สมัคร ไม่ต้องดำเนินการใด
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(240,180,41,0.08);text-align:center;">
          <p style="font-size:11px;letter-spacing:2px;color:#3A4258;margin:0;">AFFILIATE HUB · openthai.ai</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

/* ── 2. Commission Alert ─────────────────────────────── */
export async function sendCommissionAlert(
  to: string,
  name: string,
  amount: number,
  product: string,
  totalBalance: number
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `✦ รับ Commission ฿${amount.toLocaleString()} — Affiliate Hub`,
    html: `
<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <div style="font-size:13px;letter-spacing:4px;color:#F0B429;margin-bottom:24px;">◆ AFFILIATE HUB</div>
          <div style="font-size:48px;font-weight:700;color:#06D6A0;margin:0 0 8px;">฿${amount.toLocaleString()}</div>
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6A7490;margin-bottom:32px;">Commission เข้าบัญชีแล้ว</div>
          <table width="100%" style="background:#0D1020;border:1px solid rgba(240,180,41,0.1);border-radius:3px;margin-bottom:32px;">
            <tr>
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">สินค้า</td>
              <td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${product}</td>
            </tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ยอดสะสม</td>
              <td style="padding:14px 20px;font-size:13px;color:#F0B429;font-weight:700;text-align:right;">฿${totalBalance.toLocaleString()}</td>
            </tr>
          </table>
          <a href="${APP}/dashboard" style="display:inline-block;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.3);border-radius:2px;padding:12px 36px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#F0B429;text-decoration:none;">
            ดู Dashboard →
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

/* ── 3. Withdrawal Confirmation ──────────────────────── */
export async function sendWithdrawConfirmation(
  to: string,
  name: string,
  amount: number,
  method: string,
  destination: string
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `✦ ถอนเงิน ฿${amount.toLocaleString()} — กำลังดำเนินการ`,
    html: `
<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <div style="font-size:13px;letter-spacing:4px;color:#F0B429;margin-bottom:24px;">◆ AFFILIATE HUB</div>
          <h2 style="font-size:22px;font-weight:400;color:#E8EAF0;margin:0 0 8px;">กำลังดำเนินการถอนเงิน</h2>
          <div style="font-size:36px;font-weight:700;color:#F0B429;margin:16px 0;">฿${amount.toLocaleString()}</div>
          <table width="100%" style="background:#0D1020;border:1px solid rgba(240,180,41,0.1);border-radius:3px;margin:24px 0 32px;">
            <tr><td style="padding:14px 20px;font-size:12px;color:#6A7490;">ช่องทาง</td><td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${method === "promptpay" ? "PromptPay" : "โอนธนาคาร"}</td></tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ปลายทาง</td>
              <td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${destination}</td>
            </tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ระยะเวลา</td>
              <td style="padding:14px 20px;font-size:13px;color:#06D6A0;text-align:right;">ภายใน 24 ชั่วโมง</td>
            </tr>
          </table>
          <p style="font-size:12px;color:#3A4258;line-height:1.7;margin:0;">หากมีคำถาม ติดต่อ <a href="mailto:support@OpenThaiAi.com" style="color:#F0B429;">support@OpenThaiAi.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
