# ADR 001 — เลือกใช้ Vercel แทน AWS/GCP

**Status:** Accepted  
**Date:** 2026-05-03  
**Author:** Zuejai (OpenThai AI Founder)

## Context
ต้องการ deploy frontend React + backend Node.js ให้เร็วและราคาถูกสำหรับ startup

## Decision
ใช้ **Vercel Hobby Plan** สำหรับ frontend + backend serverless

## ทำไมถึงเลือก Vercel
| เกณฑ์ | Vercel | AWS | GCP |
|-------|--------|-----|-----|
| ความเร็ว setup | ✅ 5 นาที | ❌ ชั่วโมง | ❌ ชั่วโมง |
| ราคา (ตอนนี้) | ✅ ฟรี | 🟡 $5-20/เดือน | 🟡 $5-20/เดือน |
| Custom domain | ✅ ฟรี | 🟡 ต้องตั้งเพิ่ม | 🟡 ต้องตั้งเพิ่ม |
| Git auto-deploy | ✅ built-in | ❌ ต้องตั้ง CI/CD | ❌ ต้องตั้ง CI/CD |
| Learning curve | ✅ ต่ำ | ❌ สูงมาก | ❌ สูง |

## ข้อจำกัดที่รับรู้
- Hobby plan: Cron job รันได้ครั้งเดียวต่อวันเท่านั้น
- Serverless function timeout: 10 วินาที (ต้องระวัง AI generation)
- ไม่มี persistent storage → ต้องใช้ Supabase แยก

## Consequences
- ✅ Deploy ได้ทันที ราคาถูก
- ✅ เหมาะกับ MVP/startup stage
- ⚠️ เมื่อ traffic เพิ่ม ต้อง upgrade เป็น Vercel Pro ($20/เดือน) หรือย้ายไป Railway/Render
