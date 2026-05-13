# ADR 002 — AI Hybrid Routing: Claude → Gemini → Mock

**Status:** Accepted  
**Date:** 2026-05-11

## Context
ต้องการ AI generate ที่ stable แม้ API key หมดหรือมีปัญหา

## Decision
ใช้ smart router: **Claude** (primary) → **Gemini** (fallback) → **Mock** (last resort)

## เหตุผล
- Claude ให้ผล output ดีที่สุดสำหรับภาษาไทย
- Gemini ฟรีและเป็น fallback ที่ดี
- Mock ป้องกัน user เห็น error ในกรณีที่ API ทั้งหมดล่ม

## Consequences
- ✅ Uptime สูงขึ้น
- ✅ Cost management: ใช้ Claude เมื่อจำเป็น
- ⚠️ ต้อง monitor ว่า traffic ไหลไปที่ไหน (ดูจาก /api/health → ai.claude_pct)
