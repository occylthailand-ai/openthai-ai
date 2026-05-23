// app/verified/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const MESSAGES = {
  success: { icon:"✦", title:"ยืนยันอีเมลสำเร็จ",   sub:"บัญชีของคุณพร้อมใช้งานแล้ว สามารถเข้าสู่ระบบได้เลย",  color:"var(--green)",  cta:"เข้าสู่ระบบ", href:"/?auth=login" },
  already: { icon:"◇", title:"ยืนยันแล้ว",           sub:"อีเมลนี้ถูกยืนยันแล้ว เข้าสู่ระบบได้เลย",           color:"var(--gold)",   cta:"เข้าสู่ระบบ", href:"/?auth=login" },
  expired: { icon:"⚠", title:"ลิงก์หมดอายุ",        sub:"ลิงก์ยืนยันหมดอายุแล้ว กรุณาเข้าสู่ระบบและขอลิงก์ใหม่", color:"var(--red)",    cta:"กลับหน้าหลัก", href:"/" },
  invalid: { icon:"✕", title:"ลิงก์ไม่ถูกต้อง",     sub:"ลิงก์นี้ไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง",         color:"var(--red)",    cta:"กลับหน้าหลัก", href:"/" },
};

// Inner component uses useSearchParams — must be wrapped in Suspense
function VerifiedContent() {
  const params = useSearchParams();
  const status = (params.get("status") ?? "invalid") as keyof typeof MESSAGES;
  const m = MESSAGES[status] ?? MESSAGES.invalid;

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{textAlign:"center",maxWidth:"400px"}}>
        <div style={{fontSize:"48px",color:m.color,marginBottom:"20px",fontFamily:"'Cormorant Garamond',serif"}}>{m.icon}</div>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:600,marginBottom:"12px"}}>{m.title}</h1>
        <p style={{fontSize:"14px",color:"var(--muted2)",lineHeight:1.7,marginBottom:"32px"}}>{m.sub}</p>
        <Link href={m.href} className="btn-gold" style={{display:"inline-flex",textDecoration:"none"}}>{m.cta}</Link>
      </div>
    </div>
  );
}

// Default export wraps in Suspense (required when using useSearchParams in Next.js 14)
export default function VerifiedPage() {
  return (
    <Suspense fallback={null}>
      <VerifiedContent />
    </Suspense>
  );
}
