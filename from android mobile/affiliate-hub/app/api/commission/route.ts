// app/api/commission/route.ts
// บันทึก commission — เรียกโดย internal order system

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { sendCommissionAlert } from "@/lib/email";

const schema = z.object({
  ref_code:     z.string(),
  buyer_name:   z.string().optional(),
  product:      z.string(),
  order_amount: z.number().positive(),
  omise_charge_id: z.string().optional(),
  // secret key สำหรับ internal calls
  secret:       z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    // ตรวจ internal secret
    if (body.secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db   = supabaseAdmin();
    const rate = parseFloat(process.env.COMMISSION_RATE ?? "0.35");
    const comm = Math.floor(body.order_amount * rate * 100) / 100;

    // หา user จาก ref_code
    const { data: users } = await db
      .from("aff_users")
      .select("id, email, name")
      .eq("ref_code", body.ref_code)
      .limit(1);

    if (!users?.length) {
      return NextResponse.json({ error: "ref_code not found" }, { status: 404 });
    }

    const user = users[0];

    // บันทึก commission
    const { data: commRow, error } = await db
      .from("aff_commissions")
      .insert({
        user_id:         user.id,
        ref_code:        body.ref_code,
        buyer_name:      body.buyer_name,
        product:         body.product,
        order_amount:    body.order_amount,
        rate,
        commission:      comm,
        status:          "approved",
        omise_charge_id: body.omise_charge_id,
        approved_at:     new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // อัปเดต click ที่ convert แล้ว
    await db
      .from("aff_clicks")
      .update({ converted: true })
      .eq("ref_code", body.ref_code)
      .eq("converted", false)
      .order("created_at", { ascending: false })
      .limit(1);

    // อัปเดต level
    await updateLevel(db, user.id);

    // ส่งอีเมลแจ้งเตือน
    const { data: stats } = await db
      .from("aff_user_stats")
      .select("balance")
      .eq("id", user.id)
      .single();

    await sendCommissionAlert(
      user.email, user.name, comm,
      body.product,
      stats?.balance ?? comm
    ).catch(console.error);

    return NextResponse.json({ success: true, commission: comm, id: commRow.id });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("commission error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function updateLevel(db: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data } = await db
    .from("aff_user_stats")
    .select("total_earned")
    .eq("id", userId)
    .single();

  const earned = data?.total_earned ?? 0;
  const level  = earned >= 100000 ? "Platinum" : earned >= 30000 ? "Gold" : "Silver";

  await db.from("aff_users").update({ level }).eq("id", userId);
}

/* ══════════════════════════════════════════════════════
   app/api/webhook/omise/route.ts
   รับ webhook จาก Omise เมื่อการชำระเงินสำเร็จ
══════════════════════════════════════════════════════ */
// ดูไฟล์ app/api/webhook/omise/route.ts
