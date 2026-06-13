/**
 * Vercel Serverless Entry Point
 * รับ request ทุก /api/* แล้วส่งต่อให้ Express app ใน backend/server.js
 *
 * Local dev: server.js เรียก app.listen() เอง (IS_VERCEL=false)
 * Vercel:    ไฟล์นี้ export app เป็น default handler — Vercel จัดการ HTTP เอง
 */
import { app } from '../backend/server.js';

export default app;
