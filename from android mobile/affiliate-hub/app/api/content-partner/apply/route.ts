import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { name, email, platform, followers, channel_url, content_type, collab_idea } = await req.json();

  if (!name || !email || !channel_url) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("partner_content_applications").insert({
    name, email, platform, followers, channel_url, content_type, collab_idea,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "อีเมลนี้ยื่นสมัครแล้ว" }, { status: 409 });
    return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
