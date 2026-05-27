import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { name, company, email, website, usecase, plan } = await req.json();

  if (!name || !email || !usecase) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("partner_api_applications").insert({
    name, company, email, website, usecase, plan,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "อีเมลนี้สมัครแล้ว" }, { status: 409 });
    return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
