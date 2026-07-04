// Centralized rate-limit config — single place that defines every limiter used
// across the API. These 22 limiters used to be declared inline, scattered
// throughout server.js next to wherever they were first used. Config values
// are unchanged from before this move (verified against the original file);
// this only removes the duplication of "where do I go to see/adjust the
// policy for route X".
import rateLimit from 'express-rate-limit';

// กันการ brute-force admin key (แยกจาก paymentLimiter)
export const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many requests' } });

// DISABLE_RATE_LIMIT=1 ปิด generate limiter เฉพาะตอนรัน smoke test (ไม่มีผลกับ production)
const _generateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 นาที
  max: 10,                    // สูงสุด 10 req/min ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ส่งคำขอบ่อยเกินไป กรุณารอ 1 นาทีแล้วลองใหม่' },
});
export const generateLimiter = process.env.DISABLE_RATE_LIMIT === '1' ? (req, res, next) => next() : _generateLimiter;

export const affiliateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 นาที
  max: 5,                     // สมัคร affiliate 5 ครั้ง/15 นาที ต่อ IP
  message: { error: 'ส่งคำขอสมัครบ่อยเกินไป กรุณารอแล้วลองใหม่' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 นาที
  max: 20,                    // login 20 ครั้ง/15 นาที ต่อ IP
  message: { error: 'พยายาม login บ่อยเกินไป กรุณารอ 15 นาที' },
});

export const shopLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, message: { success: false, error: 'สั่งซื้อบ่อยเกินไป' } });

export const broadcastLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, message: { success: false, error: 'ส่ง broadcast บ่อยเกินไป' } });

export const affClickLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { success: false } });

export const withdrawLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { success: false, error: 'ขอถอนบ่อยเกินไป กรุณารอ' } });

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'ส่งข้อความบ่อยเกินไป กรุณารอ 1 ชั่วโมง' },
});

export const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 3,                    // กรอกอีเมล 3 ครั้ง/ชั่วโมง ต่อ IP
  message: { success: false, message: 'ส่งคำขอบ่อยเกินไป กรุณารอแล้วลองใหม่' },
});

export const lineLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'ส่ง LINE บ่อยเกินไป' } });

export const competitorLimiter = rateLimit({ windowMs: 60000, max: 5, message: { error: 'วิเคราะห์บ่อยเกินไป' } });

export const diagnoseLimiter = rateLimit({ windowMs: 60000, max: 5, message: { error: 'วิเคราะห์บ่อยเกินไป' } });

export const mcpLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'MCP rate limit exceeded' } });

export const voiceLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Voice API rate limit exceeded' } });

export const memoryLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Memory API rate limit exceeded' } });

export const webhookLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Webhook API rate limit' } });

export const tenantLimiter = rateLimit({ windowMs: 15 * 60000, max: 10, message: { error: 'Tenant API rate limit' } });

export const videoLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'Video API rate limit — 10/min' } });

export const paymentLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'Payment rate limit' } });

export const quickpayLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: { success: false, error: 'สร้าง QR บ่อยเกินไป กรุณารอสักครู่' } });

export const corpLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Corporate API rate limit' } });
