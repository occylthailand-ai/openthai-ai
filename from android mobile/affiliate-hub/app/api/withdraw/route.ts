// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { scbTransferPromptPay, scbTransferBank, BANK_CODES } from "@/lib/promptpay";
import { sendWithdrawConfirmation } from "@/lib/email";

const MIN_WITHDRAW = 100; // ขั้นต่ำ 100 บาท

const schema = z.object({
  method:      z.enum(["promptpay", "bank"]),
  destination: z.string().min(10, "กรุณากรอกข้อมูลให้ครบ"),
  bank_code:   z.string().optional(),   // required if method=bank
  amount:      z.number().optional(),   // ถ้าไม่ระบุ = ถอนทั้งหมด
});

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────
  const db          = supabaseAdmin();
  const authHeader  = req.headers.get("authorization") ?? "";
  const token       = authHeader.replace("Bearer ", "");

  const { data: { user: authUser }, error: authErr } =
    await db.auth.getUser(token);

  if (authErr || !authUser) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  // ── Validate ─────────────────────────────────────────
  const body = schema.parse(await req.json());

  if (body.method === "bank" && !body.bank_code) {
    return NextResponse.json({ error: "กรุณาระบุธนาคาร" }, { status: 400 });
  }

  // ── ดึง balance ─────────────────────────────────────
  const { data: stats } = await db
    .from("aff_user_stats")
    .select("balance")
    .eq("id", authUser.id)
    .single();

  const balance = stats?.balance ?? 0;

  if (balance < MIN_WITHDRAW) {
    return NextResponse.json({
      error: `ยอดขั้นต่ำในการถอนคือ ฿${MIN_WITHDRAW.toLocaleString()}`,
    }, { status: 400 });
  }

  const amount = body.amount
    ? Math.min(body.amount, balance)
    : balance;

  if (amount < MIN_WITHDRAW) {
    return NextResponse.json({ error: "จำนวนน้อยเกินไป" }, { status: 400 });
  }

  // ── ตรวจ email verification ─────────────────────────
  const { data: profile } = await db
    .from("aff_users")
    .select("email, name, email_verified")
    .eq("id", authUser.id)
    .single();

  if (!profile?.email_verified) {
    return NextResponse.json({
      error: "กรุณายืนยันอีเมลก่อนถอนเงิน",
    }, { status: 403 });
  }

  // ── สร้าง withdrawal record ─────────────────────────
  const { data: wd, error: wdErr } = await db
    .from("aff_withdrawals")
    .insert({
      user_id:     authUser.id,
      amount,
      method:      body.method,
      destination: body.destination,
      status:      "processing",
    })
    .select()
    .single();

  if (wdErr) throw wdErr;

  // ── โอนเงินจริง (SCB API) ────────────────────────────
  let transferResult;

  try {
    if (body.method === "promptpay") {
      transferResult = await scbTransferPromptPay(
        body.destination,
        amount,
        wd.id
      );
    } else {
      const bankCode = BANK_CODES[body.bank_code!] ?? body.bank_code!;
      transferResult = await scbTransferBank(
        bankCode,
        body.destination,
        amount,
        wd.id
      );
    }

    // อัปเดตสถานะ
    const success = transferResult.status === "success";
    await db.from("aff_withdrawals").update({
      status:          success ? "completed" : "failed",
      scb_transfer_id: transferResult.transactionId,
      completed_at:    success ? new Date().toISOString() : null,
      note:            !success ? transferResult.errorDescription : null,
    }).eq("id", wd.id);

    if (success) {
      // หัก commission ที่ approved → paid
      await db
        .from("aff_commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("user_id", authUser.id)
        .eq("status", "approved");
    }

    // ส่งอีเมลยืนยัน
    await sendWithdrawConfirmation(
      profile.email, profile.name, amount,
      body.method, body.destination
    ).catch(console.error);

    return NextResponse.json({
      success,
      withdrawal_id:   wd.id,
      transfer_id:     transferResult.transactionId,
      status:          success ? "completed" : "failed",
      message:         success
        ? `โอน ฿${amount.toLocaleString()} สำเร็จแล้ว`
        : "การโอนเงินล้มเหลว กรุณาติดต่อทีมงาน",
    });

  } catch (err) {
    // SCB API error — อัปเดตเป็น failed แต่ไม่ลบ record
    await db.from("aff_withdrawals").update({ status: "failed" }).eq("id", wd.id);
    console.error("withdraw transfer error:", err);
    return NextResponse.json({
      error: "การโอนเงินล้มเหลว ทีมงานจะดำเนินการให้ใน 24 ชม.",
    }, { status: 500 });
  }
}

/* GET: ดึงประวัติการถอน */
export async function GET(req: NextRequest) {
  const db         = supabaseAdmin();
  const authHeader = req.headers.get("authorization") ?? "";
  const token      = authHeader.replace("Bearer ", "");

  const { data: { user: authUser } } = await db.auth.getUser(token);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await db
    .from("aff_withdrawals")
    .select("*")
    .eq("user_id", authUser.id)
    .order("requested_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ withdrawals: data ?? [] });
}
