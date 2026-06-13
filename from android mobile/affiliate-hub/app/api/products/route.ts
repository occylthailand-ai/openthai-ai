// app/api/products/route.ts
// Public product catalog — used by affiliates to browse & share

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category  = searchParams.get("category");
  const search    = searchParams.get("q");
  const limit     = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset    = Number(searchParams.get("offset") ?? 0);

  const db = supabaseAdmin();
  let query = db
    .from("aff_products")
    .select("id, name, short_desc, price, image_url, category, commission_rate, product_url, aff_producers(company, logo_url)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (search)   query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [], total: data?.length ?? 0 });
}
