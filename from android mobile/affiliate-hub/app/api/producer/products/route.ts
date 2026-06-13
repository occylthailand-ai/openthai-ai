// app/api/producer/products/route.ts
// GET  — list own products
// POST — submit new product

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getProducerFromToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);

  const db = supabaseAdmin();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return null;

  const { data: producer } = await db
    .from("aff_producers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return producer ?? null;
}

export async function GET(req: NextRequest) {
  const producer = await getProducerFromToken(req);
  if (!producer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("aff_products")
    .select("*")
    .eq("producer_id", producer.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  const producer = await getProducerFromToken(req);
  if (!producer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (producer.status !== "approved") {
    return NextResponse.json({ error: "บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณารอแอดมินตรวจสอบ" }, { status: 403 });
  }

  const { name, description, short_desc, price, image_url, category, product_url, sku } = await req.json();

  if (!name || !price) {
    return NextResponse.json({ error: "กรุณากรอกชื่อสินค้าและราคา" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("aff_products")
    .insert({
      producer_id:     producer.id,
      name,
      description:     description ?? null,
      short_desc:      short_desc ?? null,
      price:           Number(price),
      image_url:       image_url ?? null,
      category:        category ?? null,
      product_url:     product_url ?? null,
      sku:             sku ?? null,
      commission_rate: producer.commission_default ?? 0.35,
      status:          "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, product: data });
}
