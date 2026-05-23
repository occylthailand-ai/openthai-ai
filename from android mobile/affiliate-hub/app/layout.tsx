// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Affiliate Hub — รายได้ที่ทำงานแทนคุณ",
  description: "แชร์ลิงก์ รับ commission 35% ทุกยอดขาย โอนเข้า PromptPay อัตโนมัติ",
  keywords:    "affiliate, commission, PromptPay, passive income, รายได้เสริม",
  openGraph: {
    title:       "Affiliate Hub",
    description: "แชร์ลิงก์ รับ commission 35%",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Sarabun:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
