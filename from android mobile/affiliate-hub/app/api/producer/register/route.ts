// app/api/producer/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password, contact_name, company, phone, website, category, description } = await req.json();

    if (!email || !password || !contact_name || !company) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // 1. Create Supabase Auth user
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authErr) {
      if (authErr.message?.toLowerCase().includes("already registered")) {
        return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
      }
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return NextResponse.json({ error: "สร้างบัญชีไม่สำเร็จ" }, { status: 500 });
    }

    // 2. Insert into aff_producers
    const { error: dbErr } = await db.from("aff_producers").insert({
      auth_user_id:  authUserId,
      email,
      contact_name,
      company,
      phone:         phone ?? null,
      website:       website ?? null,
      category:      category ?? null,
      description:   description ?? null,
      status:        "pending",
      email_verified: false,
    });

    if (dbErr) {
      // Rollback Auth user
      await db.auth.admin.deleteUser(authUserId);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "สมัครสำเร็จ กรุณารอการอนุมัติจากแอดมิน" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
