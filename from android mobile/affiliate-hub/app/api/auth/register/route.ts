// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

const schema = z.object({
  name:     z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  email:    z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

/** สร้าง ref_code จากชื่อ + random */
function makeRefCode(name: string): string {
  const base = name
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Zก-๙]/g, "")
    .slice(0, 6)
    .toUpperCase();
  const rand = Math.floor(Math.random() * 900 + 100).toString();
  return (base || "USER") + rand;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = schema.parse(body);

    const db = supabaseAdmin();

    // ── 1. Register with Supabase Auth ──────────────────
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: false,       // เราจะส่ง email เอง
    });

    if (authErr) {
      if (authErr.message.includes("already registered")) {
        return NextResponse.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, { status: 409 });
      }
      throw authErr;
    }

    const userId  = authData.user!.id;
    const refCode = makeRefCode(name);

    // ── 2. สร้าง verify token ────────────────────────────
    const token      = crypto.randomBytes(32).toString("hex");
    const tokenHash  = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // ── 3. Insert user profile ───────────────────────────
    const { error: dbErr } = await db.from("aff_users").insert({
      id:               userId,
      email,
      name,
      ref_code:         refCode,
      email_verified:   false,
      verify_token:     tokenHash,
      verify_expires_at: expiresAt,
    });

    if (dbErr) throw dbErr;

    // ── 4. ส่ง verification email ────────────────────────
    await sendVerificationEmail(email, name, token);

    return NextResponse.json({
      success: true,
      message: "สมัครสมาชิกแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยัน",
      ref_code: refCode,
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("register error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
