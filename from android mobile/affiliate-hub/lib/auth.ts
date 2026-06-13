// lib/auth.ts
"use client";
import { supabase } from "./supabase";
import type { User } from "./supabase";

/* ── Sign Up ─────────────────────────────────────────── */
export async function signUp(name: string, email: string, password: string) {
  const res = await fetch("/api/auth/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "สมัครไม่สำเร็จ");
  return data;
}

/* ── Sign In ─────────────────────────────────────────── */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Invalid login")) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    throw new Error(error.message);
  }
  return data;
}

/* ── Sign Out ────────────────────────────────────────── */
export async function signOut() {
  await supabase.auth.signOut();
}

/* ── Get session token (for API calls) ──────────────── */
export async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/* ── Fetch current user profile ─────────────────────── */
export async function getProfile(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("aff_users")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

/* ── Fetch user stats ─────────────────────────────────── */
export async function getStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("aff_user_stats")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

/* ── Fetch commissions ───────────────────────────────── */
export async function getCommissions(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("aff_commissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/* ── Request withdrawal ──────────────────────────────── */
export async function requestWithdraw(
  method: "promptpay" | "bank",
  destination: string,
  bankCode?: string,
  amount?: number
) {
  const token = await getToken();
  const res = await fetch("/api/withdraw", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ method, destination, bank_code: bankCode, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

/* ── Resend verification email ───────────────────────── */
export async function resendVerification(email: string) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new Error(error.message);
}
