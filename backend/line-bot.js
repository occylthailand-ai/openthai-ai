// line-bot.js — LINE Messaging API webhook handler
import crypto from 'crypto';

export function verifyLineSignature(rawBody, signature, secret) {
  const hash = crypto.createHmac('SHA256', secret).update(rawBody).digest('base64');
  return hash === signature;
}

export async function replyLine(replyToken, messages, token) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── URL regex for Shopee / Lazada / shortened links ──────────────────────────
const PRODUCT_URL_RE = /https?:\/\/[^\s]*(shopee\.co\.th|lazada\.co\.th|shp\.ee)[^\s]*/i;

export async function handleLineWebhook(req, res, { generateFn, trendingFn, affiliateFn }) {
  const secret    = process.env.LINE_CHANNEL_SECRET;
  const token     = process.env.LINE_CHANNEL_TOKEN;
  const signature = req.headers['x-line-signature'] || '';

  // ── Normalise raw body → Buffer ───────────────────────────────────────────
  let rawBodyBuf;
  let body;
  const rawBody = req.body;

  if (Buffer.isBuffer(rawBody)) {
    rawBodyBuf = rawBody;
    try { body = JSON.parse(rawBody.toString()); } catch { res.status(200).json({ ok: true }); return; }
  } else if (typeof rawBody === 'string') {
    rawBodyBuf = Buffer.from(rawBody, 'utf8');
    try { body = JSON.parse(rawBody); } catch { res.status(200).json({ ok: true }); return; }
  } else if (rawBody && typeof rawBody === 'object') {
    rawBodyBuf = Buffer.from(JSON.stringify(rawBody), 'utf8');
    body = rawBody;
  } else {
    res.status(200).json({ ok: true });
    return;
  }

  // ── 1. Verify signature ───────────────────────────────────────────────────
  if (secret && signature) {
    if (!verifyLineSignature(rawBodyBuf, signature, secret)) {
      // Return 200 to avoid LINE retrying — but ignore the event
      res.status(200).json({ ok: true });
      return;
    }
  }
  // If no secret configured (dev mode), proceed anyway

  // Respond 200 immediately so LINE does not retry
  res.status(200).json({ ok: true });

  if (!token) return; // No token → can't reply

  // ── 2. Process events ─────────────────────────────────────────────────────
  for (const event of (body.events || [])) {
    const replyToken = event.replyToken;
    const eventType  = event.type;

    try {
      // ── follow event ──────────────────────────────────────────────────────
      if (eventType === 'follow' && replyToken) {
        const welcome =
          '🎉 ยินดีต้อนรับสู่ Openthai.ai!\n\n' +
          '🤖 เราช่วยสร้างคอนเทนต์ TikTok + Affiliate Link ให้คุณอัตโนมัติ\n\n' +
          'วิธีใช้:\n' +
          '• ส่งลิงก์สินค้า Shopee/Lazada → รับคอนเทนต์ TikTok ทันที\n' +
          '• พิมพ์ "เทรนด์" → ดูแฮชแท็กฮิต\n\n' +
          '🌐 openthai-ai.com';
        await replyLine(replyToken, [{ type: 'text', text: welcome }], token);
        continue;
      }

      // ── text message event ────────────────────────────────────────────────
      if (eventType === 'message' && event.message?.type === 'text' && replyToken) {
        const text = event.message.text?.trim() || '';

        // a. Product URL detected
        const urlMatch = text.match(PRODUCT_URL_RE);
        if (urlMatch) {
          const productUrl = urlMatch[0];

          try {
            // Generate content using the product URL as the product name/description
            const contentResult = await generateFn({
              product: productUrl,
              platform: 'TikTok',
              style: 'sales',
              lang: 'ภาษาไทย',
              audience: 'ทั่วไป',
            });

            const affiliateLink = affiliateFn ? affiliateFn(productUrl) : productUrl;
            const tags = (contentResult.hashtags || []).slice(0, 5).map(t => `#${t.replace(/^#/, '')}`).join(' ');

            const reply =
              `🎣 Hook:\n${contentResult.hook || ''}\n\n` +
              `📝 Caption:\n${contentResult.caption || ''}\n\n` +
              `🔗 Affiliate Link:\n${affiliateLink}\n\n` +
              `${tags}\n\n` +
              `สร้างด้วย Openthai.ai 🤖`;

            await replyLine(replyToken, [{ type: 'text', text: reply.slice(0, 5000) }], token);
          } catch (_err) {
            await replyLine(replyToken, [{
              type: 'text',
              text: '⚠️ ไม่สามารถสร้างคอนเทนต์ได้ขณะนี้ กรุณาลองใหม่ภายหลัง',
            }], token);
          }
          continue;
        }

        // b. Trending hashtags request
        if (/เทรนด์|trending|#/i.test(text)) {
          try {
            const trendData = await trendingFn();
            const topTags = (trendData.hashtags || [])
              .slice(0, 10)
              .map(h => `${h.tag} (${h.views})${h.hot ? ' 🔥' : ''}`)
              .join('\n');

            const reply =
              `🔥 แฮชแท็กฮิตบน TikTok ไทย:\n\n${topTags}\n\n` +
              `อัพเดต: ${new Date().toLocaleDateString('th-TH')}\n` +
              `สร้างด้วย Openthai.ai 🤖`;

            await replyLine(replyToken, [{ type: 'text', text: reply }], token);
          } catch (_err) {
            await replyLine(replyToken, [{
              type: 'text',
              text: '⚠️ ไม่สามารถดึงข้อมูลเทรนด์ได้ขณะนี้ กรุณาลองใหม่ภายหลัง',
            }], token);
          }
          continue;
        }

        // c. Help menu (default reply)
        const help =
          '🤖 Openthai.ai — สร้างคอนเทนต์ TikTok อัตโนมัติ\n\n' +
          'วิธีใช้:\n' +
          '• ส่งลิงก์สินค้า Shopee/Lazada → รับคอนเทนต์ TikTok ทันที\n' +
          '• พิมพ์ "เทรนด์" → ดูแฮชแท็กฮิต\n\n' +
          '🌐 openthai-ai.com';
        await replyLine(replyToken, [{ type: 'text', text: help }], token);
      }
    } catch (err) {
      console.error('[LINE Bot] Event handling error:', err.message);
    }
  }
}
