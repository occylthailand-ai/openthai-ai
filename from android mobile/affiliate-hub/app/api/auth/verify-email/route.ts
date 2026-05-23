// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const APP   = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!token) {
    return NextResponse.redirect(`${APP}/verified?status=invalid`);
  }

  const db        = supabaseAdmin();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // หา user ที่ token ตรงกันและยังไม่หมดอายุ
  const { data: users, error } = await db
    .from("aff_users")
    .select("id, name, email_verified, verify_expires_at")
    .eq("verify_token", tokenHash)
    .limit(1);

  if (error || !users?.length) {
    return NextResponse.redirect(`${APP}/verified?status=invalid`);
  }

  const user = users[0];

  if (user.email_verified) {
    return NextResponse.redirect(`${APP}/verified?status=already`);
  }

  if (new Date(user.verify_expires_at) < new Date()) {
    return NextResponse.redirect(`${APP}/verified?status=expired`);
  }

  // ยืนยัน
  await db.from("aff_users").update({
    email_verified:   true,
    verify_token:     null,
    verify_expires_at: null,
  }).eq("id", user.id);

  // ยืนยัน Supabase Auth ด้วย
  await db.auth.admin.updateUserById(user.id, { email_confirm: true });

  return NextResponse.redirect(`${APP}/verified?status=success`);
}
