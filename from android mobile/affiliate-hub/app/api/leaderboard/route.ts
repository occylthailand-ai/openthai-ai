import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("aff_user_stats")
    .select("name, level, total_earned, total_referrals")
    .order("total_earned", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ leaderboard: [] });

  const leaderboard = (data ?? []).map((r: any, i: number) => ({
    rank: i + 1,
    name: r.name.length > 2 ? r.name.slice(0, 2) + "···" : r.name + "···",
    level: r.level as string,
    total_earned: Number(r.total_earned ?? 0),
    total_referrals: Number(r.total_referrals ?? 0),
  }));

  return NextResponse.json({ leaderboard });
}
