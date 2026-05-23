// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Browser client (uses anon key + RLS) ─────────────────
export const supabase = createClient(url, anon);

// ── Server client (bypasses RLS — server-only) ───────────
export const supabaseAdmin = () => createClient(url, svc, {
  auth: { persistSession: false },
});

// ── Types ────────────────────────────────────────────────
export type User = {
  id: string;
  email: string;
  name: string;
  ref_code: string;
  email_verified: boolean;
  level: "Silver" | "Gold" | "Platinum";
  promptpay_id?: string;
  bank_account?: string;
  created_at: string;
};

export type Commission = {
  id: string;
  user_id: string;
  ref_code: string;
  buyer_name?: string;
  product: string;
  order_amount: number;
  rate: number;
  commission: number;
  status: "pending" | "approved" | "paid";
  created_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  method: "promptpay" | "bank";
  destination: string;
  status: "requested" | "processing" | "completed" | "failed";
  requested_at: string;
};

export type UserStats = {
  total_clicks: number;
  total_referrals: number;
  total_earned: number;
  balance: number;
  level: string;
};

export type Producer = {
  id: string;
  auth_user_id: string;
  email: string;
  contact_name: string;
  company: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  category?: string;
  description?: string;
  email_verified: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  bank_account?: string;
  bank_name?: string;
  promptpay_id?: string;
  commission_default: number;
  admin_notes?: string;
  created_at: string;
  approved_at?: string;
};

export type Product = {
  id: string;
  producer_id: string;
  name: string;
  description?: string;
  short_desc?: string;
  price: number;
  image_url?: string;
  category?: string;
  commission_rate: number;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  product_url?: string;
  sku?: string;
  admin_notes?: string;
  created_at: string;
  approved_at?: string;
};
