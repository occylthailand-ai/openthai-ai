// app/api/admin/route.ts — Admin data API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function checkAdmin(req: NextRequest) {
  const db    = supabaseAdmin();
  const token = req.headers.get("authorization")?.replace("Bearer ","") ?? "";
  const { data:{ user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data } = await db.from("aff_users").select("is_admin").eq("id",user.id).single();
  return data?.is_admin ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({error:"Unauthorized"},{status:401});

  const db  = supabaseAdmin();
  const tab = req.nextUrl.searchParams.get("tab") ?? "overview";

  if (tab === "overview") {
    const [
      {count: total_users},
      {data: commSum},
      {data: wdSum},
      {data: pendComm},
      {data: pendWd},
    ] = await Promise.all([
      db.from("aff_users").select("*",{count:"exact",head:true}),
      db.from("aff_commissions").select("commission").in("status",["approved","paid"]),
      db.from("aff_withdrawals").select("amount").eq("status","completed"),
      db.from("aff_commissions").select("id",{count:"exact",head:true}).eq("status","pending"),
      db.from("aff_withdrawals").select("id",{count:"exact",head:true}).eq("status","requested"),
    ]);

    return NextResponse.json({
      total_users,
      total_comm:          commSum?.reduce((s:number,c:any)=>s+c.commission,0)??0,
      total_paid:          wdSum?.reduce((s:number,w:any)=>s+w.amount,0)??0,
      pending_commissions: (pendComm as any)?.count ?? 0,
      pending_withdrawals: (pendWd as any)?.count ?? 0,
    });
  }

  if (tab === "affiliates") {
    const { data } = await db
      .from("aff_users")
      .select(`*, aff_user_stats(total_earned, balance)`)
      .order("created_at",{ascending:false})
      .limit(100);
    return NextResponse.json({ users: data ?? [] });
  }

  if (tab === "commissions") {
    const { data } = await db
      .from("aff_commissions")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(100);
    return NextResponse.json({ commissions: data ?? [] });
  }

  if (tab === "withdrawals") {
    const { data } = await db
      .from("aff_withdrawals")
      .select("*")
      .order("requested_at",{ascending:false})
      .limit(100);
    return NextResponse.json({ withdrawals: data ?? [] });
  }

  return NextResponse.json({});
}

// PATCH /api/admin/commission
// PATCH /api/admin/withdraw
// — ดูไฟล์แยก
