// app/api/webhook/omise/route.ts
// Omise จะส่ง webhook มาทุกครั้งที่มีการชำระเงิน

import { NextRequest, NextResponse } from "next/server";
import Omise from "omise";
import crypto from "crypto";

const omise = Omise({
  secretKey:  process.env.OMISE_SECRET_KEY ?? "",
  publicKey:  process.env.OMISE_PUBLIC_KEY ?? "",
  omiseVersion: "2019-05-29",
});

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("x-omise-webhook-signature") ?? "";

  // ── ตรวจ HMAC signature ─────────────────────────────
  const expected = crypto
    .createHmac("sha256", process.env.OMISE_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    console.warn("Omise webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  // จัดการเฉพาะ charge.complete
  if (event.key === "charge.complete" && event.data?.status === "successful") {
    const charge = event.data;
    const ref    = charge.metadata?.affiliate_ref;   // ต้องส่งมาตอนสร้าง charge

    if (ref) {
      // เรียก commission API
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/commission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_code:        ref,
          buyer_name:      charge.card?.name ?? charge.customer_info?.name,
          product:         charge.description ?? "Purchase",
          order_amount:    charge.amount / 100,    // Omise ใช้ satang (สตางค์)
          omise_charge_id: charge.id,
          secret:          process.env.INTERNAL_API_SECRET,
        }),
      });
    }
  }

  return NextResponse.json({ received: true });
}
