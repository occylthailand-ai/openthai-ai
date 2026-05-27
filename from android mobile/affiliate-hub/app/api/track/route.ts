// app/api/track/route.ts
// บันทึก click เมื่อมีคนคลิกลิงก์ affiliate
// ใช้ URL: /api/track?ref=SOMCHAI99&redirect=https://openthai.ai/product

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const ref      = req.nextUrl.searchParams.get("ref") ?? "";
  const redirect = req.nextUrl.searchParams.get("redirect") ?? process.env.NEXT_PUBLIC_APP_URL ?? "/";
  const channel  = req.nextUrl.searchParams.get("ch") ?? "direct";

  if (ref) {
    const db = supabaseAdmin();

    // บันทึก click (fire-and-forget — ไม่รอ)
    db.from("aff_clicks").insert({
      ref_code:   ref,
      ip:         req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "",
      channel,
    }).then(() => {});

    // เซต cookie เก็บ ref สำหรับ conversion tracking (30 วัน)
    const response = NextResponse.redirect(redirect);
    response.cookies.set("affiliate_ref", ref, {
      maxAge:   30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      path:     "/",
    });
    return response;
  }

  return NextResponse.redirect(redirect);
}

/* ══════════════════════════════════════════════════════
   app/api/commission/route.ts
   บันทึก commission หลังจากมีการซื้อสินค้าจริง
   เรียกจาก: Omise webhook หรือ internal order system
══════════════════════════════════════════════════════ */
// (แยกไฟล์ด้านล่าง)
