// app/api/admin/products/route.ts
// GET   — list all products + producers (admin)
// PATCH — approve/reject product or producer

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function checkAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const db = supabaseAdmin();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return false;
  const { data } = await db.from("aff_users").select("is_admin").eq("id", user.id).single();
  return data?.is_admin === true;
}

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "products";
  const db = supabaseAdmin();

  if (type === "producers") {
    const { data, error } = await db
      .from("aff_producers")
      .select("*, aff_products(count)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ producers: data ?? [] });
  }

  // products with producer info
  const { data, error } = await db
    .from("aff_products")
    .select("*, aff_producers(company, contact_name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, type, status, admin_notes } = body;

  if (!id || !type || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const table = type === "producer" ? "aff_producers" : "aff_products";

  const updates: Record<string, unknown> = { status };
  if (admin_notes) updates.admin_notes = admin_notes;
  if (status === "approved") updates.approved_at = new Date().toISOString();

  const { error } = await db.from(table).update(updates).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approving product → set to 'active'
  if (type === "product" && status === "approved") {
    await db.from("aff_products").update({ status: "active" }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
