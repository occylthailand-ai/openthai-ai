// ── AI Worker — งานอัตโนมัติที่ทำงานต่อเนื่อง 24/7 พร้อมระบบคิดเงินชัดเจน ──────
//
// ผู้ใช้ตั้ง "งาน" (prompt + ตารางเวลา) ไว้ 1 ครั้ง ระบบจะรันให้อัตโนมัติตามรอบ
// (เรียกจาก node-cron ทุกนาทีตอนรันแบบ persistent server, หรือ Vercel Cron ตอนรันบน
// serverless — ดู server.js) แล้วเก็บ "ผลลัพธ์" (ข้อความ) ไว้ให้ผู้ใช้มาอ่าน/คัดลอกไปใช้เอง
//
// ขอบเขตโดยตั้งใจ (อ่าน DECISIONS_LOG.md ประกอบ):
//   • นี่คือเครื่องมือ "สร้างข้อความอัตโนมัติ" (draft เนื้อหา/สรุป/ไอเดีย) ไม่ใช่บอทโพสต์
//     แทนผู้ใช้ไปยังแพลตฟอร์มภายนอกที่ไม่ได้เป็นเจ้าของ — เหมือนกับนโยบายที่ /api/scheduler
//     ใช้อยู่แล้ว (ToS ของ Facebook/Instagram/TikTok ห้ามบอทสมัคร/โพสต์แทนบัญชีคนอื่น)
//   • ผู้ใช้ที่อยากกระจายผลลัพธ์ไปที่ LINE OA ของตัวเอง ใช้ /api/scheduler (broadcast ช่องที่ตัวเองเป็นเจ้าของ) ต่อได้เอง
//
// การคิดเงิน (สองชั้น ใช้ของจริงที่มีอยู่แล้วในระบบ ไม่ประดิษฐ์ระบบเงินใหม่):
//   1) แต่ละครั้งที่รันสำเร็จ หัก 1 เครดิตจาก credit ledger เดิม (credits.js — แจกฟรีจาก
//      welcome/streak/spin, ซื้อเพิ่มไม่ได้ตรง ๆ แต่ยิ่งใช้แอปสม่ำเสมอยิ่งได้เพิ่ม)
//   2) จำนวนงานสูงสุดต่อคน + ความถี่ต่ำสุดที่ตั้งได้ ผูกกับแผน subscription จริง
//      (SUBSCRIPTION_PLANS ใน omise-payment.js: free / pro / premier) ผ่าน AI_WORKER
//      config ใน config/limits.js — อัปเกรดแผนแล้วตั้งงานได้มากขึ้น/ถี่ขึ้นทันที
//
// Dual-mode persistence เหมือน credits.js: Supabase (ถาวรข้าม instance) → ไฟล์ JSON (fallback local)

import express from 'express';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RATE, AI, AI_WORKER } from './config/limits.js';
import { audit } from './audit.js';
import { log } from './logger.js';

const MAX_TITLE_LEN  = 80;
const MAX_PROMPT_LEN = 4000;
const MAX_RUNS_KEPT_PER_JOB = 30; // ตัดประวัติเก่าทิ้ง กันไฟล์/ตาราง runs โตไม่หยุด

const genId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();
const clampInt = (v, lo, hi, fallback) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
};

export function createAIWorker(dataDir, { credits, getEntitlement }) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  // ── file fallback store ──────────────────────────────────────────────────
  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const JOBS_FILE = join(dataDir, 'ai_worker_jobs.json');
  const RUNS_FILE = join(dataDir, 'ai_worker_runs.json');
  let jobsFile = [];
  let runsFile = [];
  try { if (existsSync(JOBS_FILE)) jobsFile = JSON.parse(readFileSync(JOBS_FILE, 'utf8')); } catch { jobsFile = []; }
  try { if (existsSync(RUNS_FILE)) runsFile = JSON.parse(readFileSync(RUNS_FILE, 'utf8')); } catch { runsFile = []; }
  const saveJobsFile = () => { try { writeFileSync(JOBS_FILE, JSON.stringify(jobsFile, null, 2), 'utf8'); } catch { /* ignore */ } };
  const saveRunsFile = () => { try { writeFileSync(RUNS_FILE, JSON.stringify(runsFile, null, 2), 'utf8'); } catch { /* ignore */ } };

  // ── Supabase REST helper (เหมือน credits.js) ─────────────────────────────
  async function sbReq(method, path, { body, params, prefer } = {}) {
    const url = new URL(`${SB_URL}/rest/v1${path}`);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || `Supabase HTTP ${res.status}`);
    return data;
  }

  const jobToRow = (j) => ({
    id: j.id, owner_id: j.ownerId, title: j.title, prompt: j.prompt, system_prompt: j.systemPrompt || null,
    interval_minutes: j.intervalMinutes, credits_per_run: j.creditsPerRun, active: j.active,
    next_run_at: j.nextRunAt, last_run_at: j.lastRunAt, last_status: j.lastStatus, run_count: j.runCount,
    created_at: j.createdAt, updated_at: nowIso(),
  });
  const rowToJob = (r) => ({
    id: r.id, ownerId: r.owner_id, title: r.title, prompt: r.prompt, systemPrompt: r.system_prompt,
    intervalMinutes: r.interval_minutes, creditsPerRun: r.credits_per_run, active: r.active,
    nextRunAt: r.next_run_at, lastRunAt: r.last_run_at, lastStatus: r.last_status, runCount: r.run_count,
    createdAt: r.created_at,
  });

  async function sbUpsertJob(j) {
    await sbReq('POST', '/ai_worker_jobs', { body: [jobToRow(j)], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  // ── Job CRUD ──────────────────────────────────────────────────────────────
  async function listJobs(ownerId) {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/ai_worker_jobs', { params: { owner_id: `eq.${ownerId}`, select: '*', order: 'created_at.asc' } });
        return (rows || []).map(rowToJob);
      } catch (e) { log.error('ai_worker_list_sb_failed', { err: e }); }
    }
    return jobsFile.filter((j) => j.ownerId === ownerId);
  }

  async function listAllActiveDueJobs() {
    const nowTs = Date.now();
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/ai_worker_jobs', {
          params: { active: 'eq.true', next_run_at: `lte.${new Date(nowTs).toISOString()}`, select: '*', order: 'next_run_at.asc', limit: '200' },
        });
        return (rows || []).map(rowToJob);
      } catch (e) { log.error('ai_worker_due_sb_failed', { err: e }); }
    }
    return jobsFile.filter((j) => j.active && new Date(j.nextRunAt).getTime() <= nowTs);
  }

  function planKeyFor(ownerId) {
    if (ownerId.startsWith('e:') && typeof getEntitlement === 'function') {
      try {
        const ent = getEntitlement(ownerId.slice(2));
        if (ent && AI_WORKER[ent.plan]) return ent.plan;
      } catch { /* fall through to free */ }
    }
    return 'free';
  }

  async function createJob(ownerId, input) {
    const title = String(input?.title || '').trim().slice(0, MAX_TITLE_LEN);
    const prompt = String(input?.prompt || '').trim().slice(0, MAX_PROMPT_LEN);
    const systemPrompt = input?.systemPrompt ? String(input.systemPrompt).trim().slice(0, 1000) : null;
    if (!title) throw Object.assign(new Error('ต้องการชื่องาน (title)'), { status: 400 });
    if (!prompt) throw Object.assign(new Error('ต้องการคำสั่งงาน (prompt)'), { status: 400 });

    const plan = planKeyFor(ownerId);
    const limits = AI_WORKER[plan];
    const existing = await listJobs(ownerId);
    if (existing.length >= limits.maxJobs) {
      throw Object.assign(new Error(
        `แผน ${plan} ตั้งงานอัตโนมัติได้สูงสุด ${limits.maxJobs} งาน — อัปเกรดแผนที่ /pricing เพื่อตั้งงานเพิ่ม`
      ), { status: 402 });
    }
    const intervalMinutes = Math.max(limits.minIntervalMinutes, clampInt(input?.intervalMinutes, 15, 43200, limits.minIntervalMinutes));

    const job = {
      id: genId('job'), ownerId, title, prompt, systemPrompt,
      intervalMinutes, creditsPerRun: 1, active: true,
      nextRunAt: nowIso(), lastRunAt: null, lastStatus: null, runCount: 0,
      createdAt: nowIso(),
    };

    if (useSB) { try { await sbUpsertJob(job); } catch (e) { log.error('ai_worker_create_sb_failed', { err: e }); jobsFile.push(job); saveJobsFile(); } }
    else { jobsFile.push(job); saveJobsFile(); }

    audit.log(ownerId, 'ai_worker_job_created', { jobId: job.id, plan, intervalMinutes });
    return job;
  }

  async function updateJob(ownerId, id, patch) {
    const jobs = await listJobs(ownerId);
    const job = jobs.find((j) => j.id === id);
    if (!job) throw Object.assign(new Error('ไม่พบงานนี้'), { status: 404 });

    if (typeof patch.active === 'boolean') job.active = patch.active;
    if (typeof patch.title === 'string') job.title = patch.title.trim().slice(0, MAX_TITLE_LEN) || job.title;
    if (typeof patch.prompt === 'string' && patch.prompt.trim()) job.prompt = patch.prompt.trim().slice(0, MAX_PROMPT_LEN);
    if (typeof patch.intervalMinutes !== 'undefined') {
      const plan = planKeyFor(ownerId);
      const limits = AI_WORKER[plan];
      job.intervalMinutes = Math.max(limits.minIntervalMinutes, clampInt(patch.intervalMinutes, 15, 43200, job.intervalMinutes));
    }

    if (useSB) { try { await sbUpsertJob(job); } catch (e) { log.error('ai_worker_update_sb_failed', { err: e }); } }
    else {
      const idx = jobsFile.findIndex((j) => j.id === id);
      if (idx >= 0) jobsFile[idx] = job;
      saveJobsFile();
    }
    return job;
  }

  async function deleteJob(ownerId, id) {
    if (useSB) {
      try { await sbReq('DELETE', '/ai_worker_jobs', { params: { id: `eq.${id}`, owner_id: `eq.${ownerId}` } }); return true; }
      catch (e) { log.error('ai_worker_delete_sb_failed', { err: e }); }
    }
    const before = jobsFile.length;
    jobsFile = jobsFile.filter((j) => !(j.id === id && j.ownerId === ownerId));
    saveJobsFile();
    return jobsFile.length < before;
  }

  async function getRuns(ownerId, jobId) {
    if (useSB) {
      try {
        const rows = await sbReq('GET', '/ai_worker_runs', {
          params: { job_id: `eq.${jobId}`, owner_id: `eq.${ownerId}`, select: '*', order: 'started_at.desc', limit: String(MAX_RUNS_KEPT_PER_JOB) },
        });
        return rows || [];
      } catch (e) { log.error('ai_worker_runs_sb_failed', { err: e }); }
    }
    return runsFile.filter((r) => r.jobId === jobId && r.ownerId === ownerId).slice(0, MAX_RUNS_KEPT_PER_JOB);
  }

  async function recordRun(run) {
    if (useSB) {
      try {
        await sbReq('POST', '/ai_worker_runs', {
          body: [{
            id: run.id, job_id: run.jobId, owner_id: run.ownerId, started_at: run.startedAt, finished_at: run.finishedAt,
            provider: run.provider, attempts: JSON.stringify(run.attempts || []), status: run.status,
            output_preview: run.outputPreview, error: run.error,
          }],
          prefer: 'return=minimal',
        });
        return;
      } catch (e) { log.error('ai_worker_record_run_sb_failed', { err: e }); }
    }
    runsFile.unshift(run);
    // เก็บล่าสุดต่อ job ไม่เกิน MAX_RUNS_KEPT_PER_JOB — กันไฟล์โตไม่หยุดเมื่อรันมานาน
    const byJob = new Map();
    runsFile = runsFile.filter((r) => {
      const n = (byJob.get(r.jobId) || 0) + 1;
      byJob.set(r.jobId, n);
      return n <= MAX_RUNS_KEPT_PER_JOB;
    });
    saveRunsFile();
  }

  // ── AI providers — fallback จริงตอน runtime (ไม่ใช่แค่เช็คว่ามี key) ────────
  // ลำดับ: Anthropic ตรง → OpenRouter (เผื่อ Anthropic ล่ม/โควตาหมด) → Gemini
  function buildProviders() {
    const providers = [];

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      providers.push({
        name: 'anthropic',
        run: async (systemPrompt, userPrompt) => {
          const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: AI.worker,
            system: systemPrompt || undefined,
            messages: [{ role: 'user', content: userPrompt }],
          });
          return msg.content[0]?.text?.trim() || '';
        },
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: 'openrouter',
        run: async (systemPrompt, userPrompt) => {
          const msgs = systemPrompt ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] : [{ role: 'user', content: userPrompt }];
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://www.openthai-ai.com',
              'X-Title': 'Openthai.ai AI Worker',
            },
            body: JSON.stringify({ model: 'anthropic/claude-haiku-4-5', max_tokens: AI.worker, messages: msgs }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || 'OpenRouter error');
          return data.choices?.[0]?.message?.content?.trim() || '';
        },
      });
    }

    if (process.env.GEMINI_API_KEY) {
      const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-flash-latest' });
      providers.push({
        name: 'gemini',
        run: async (systemPrompt, userPrompt) => {
          const combined = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
          const result = await gemini.generateContent(combined);
          return result.response.text().trim();
        },
      });
    }

    return providers;
  }

  async function runWithFallback(systemPrompt, userPrompt) {
    const providers = buildProviders();
    if (providers.length === 0) throw new Error('ไม่ได้ตั้งค่า AI provider ใด ๆ (ANTHROPIC_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY)');

    const attempts = [];
    for (const p of providers) {
      try {
        const text = await p.run(systemPrompt, userPrompt);
        attempts.push({ provider: p.name, ok: true });
        return { text, provider: p.name, attempts };
      } catch (e) {
        attempts.push({ provider: p.name, ok: false, error: e.message });
        log.error('ai_worker_provider_failed', { provider: p.name, err: e });
      }
    }
    const err = new Error(`ทุกช่องทาง AI ล้มเหลว: ${attempts.map((a) => `${a.provider}(${a.error})`).join(' → ')}`);
    err.attempts = attempts;
    throw err;
  }

  const WORKER_SYSTEM_PROMPT = 'คุณคือ AI Worker ของ Openthai.ai — ทำงานที่ผู้ใช้ตั้งไว้แบบสั้นกระชับ ตรงประเด็น เป็นภาษาไทยเป็นหลัก '
    + 'ผลลัพธ์คือ "ข้อความร่าง" ให้ผู้ใช้ไปตรวจสอบและนำไปใช้ต่อเอง ไม่ใช่การกระทำที่ผูกพันทางกฎหมาย/การเงินใด ๆ ในตัวมันเอง '
    + 'ห้ามอ้างว่าได้ดำเนินการ (โพสต์/ส่งเงิน/สมัคร) แทนผู้ใช้จริง — บอกแค่สิ่งที่ผู้ใช้ควรทำหรือข้อความที่ผู้ใช้เอาไปใช้ได้เท่านั้น';

  // ── รันงานหนึ่งงาน (ใช้ทั้งจาก cron และปุ่ม "รันตอนนี้") ────────────────────
  async function executeJob(job) {
    const startedAt = nowIso();
    let result;
    try {
      result = await runWithFallback(job.systemPrompt || WORKER_SYSTEM_PROMPT, job.prompt);
    } catch (e) {
      const run = {
        id: genId('run'), jobId: job.id, ownerId: job.ownerId, startedAt, finishedAt: nowIso(),
        provider: null, attempts: e.attempts || [], status: 'error', outputPreview: null, error: e.message,
      };
      await recordRun(run);
      job.lastRunAt = run.startedAt; job.lastStatus = 'error'; job.nextRunAt = new Date(Date.now() + job.intervalMinutes * 60_000).toISOString();
      if (useSB) { try { await sbUpsertJob(job); } catch { /* ignore */ } }
      else { const idx = jobsFile.findIndex((j) => j.id === job.id); if (idx >= 0) jobsFile[idx] = job; saveJobsFile(); }
      return run;
    }

    await credits.consumeCredit(job.ownerId).catch(() => {});
    const run = {
      id: genId('run'), jobId: job.id, ownerId: job.ownerId, startedAt, finishedAt: nowIso(),
      provider: result.provider, attempts: result.attempts, status: 'ok', outputPreview: result.text.slice(0, 4000), error: null,
    };
    await recordRun(run);
    job.lastRunAt = run.startedAt; job.lastStatus = 'ok'; job.runCount = (job.runCount || 0) + 1;
    job.nextRunAt = new Date(Date.now() + job.intervalMinutes * 60_000).toISOString();
    if (useSB) { try { await sbUpsertJob(job); } catch { /* ignore */ } }
    else { const idx = jobsFile.findIndex((j) => j.id === job.id); if (idx >= 0) jobsFile[idx] = job; saveJobsFile(); }
    return run;
  }

  async function runJobNow(ownerId, id) {
    const jobs = await listJobs(ownerId);
    const job = jobs.find((j) => j.id === id);
    if (!job) throw Object.assign(new Error('ไม่พบงานนี้'), { status: 404 });
    if (!(await credits.hasCredit(ownerId))) {
      throw Object.assign(new Error('เครดิตหมด — เช็คอินรายวัน/หมุนวงล้อเพื่อรับเครดิตเพิ่ม หรืออัปเกรดแผนที่ /pricing'), { status: 402 });
    }
    return executeJob(job);
  }

  // ── รอบอัตโนมัติ — เรียกจาก node-cron (local/Railway/Docker) ทุกนาที หรือ Vercel Cron ──
  async function runDueJobs() {
    const due = await listAllActiveDueJobs();
    let ran = 0, skippedNoCredit = 0, failed = 0;
    for (const job of due) {
      const hasCredit = await credits.hasCredit(job.ownerId).catch(() => false);
      if (!hasCredit) {
        skippedNoCredit += 1;
        job.lastStatus = 'paused_no_credit';
        job.nextRunAt = new Date(Date.now() + job.intervalMinutes * 60_000).toISOString();
        if (useSB) { try { await sbUpsertJob(job); } catch { /* ignore */ } }
        else { const idx = jobsFile.findIndex((j) => j.id === job.id); if (idx >= 0) jobsFile[idx] = job; saveJobsFile(); }
        continue;
      }
      try {
        const run = await executeJob(job);
        if (run.status === 'ok') ran += 1; else failed += 1;
      } catch (e) {
        failed += 1;
        log.error('ai_worker_run_due_failed', { jobId: job.id, err: e });
      }
    }
    if (due.length) log.info('ai_worker_cycle', { due: due.length, ran, skippedNoCredit, failed });
    return { due: due.length, ran, skippedNoCredit, failed };
  }

  // ── Routes ──────────────────────────────────────────────────────────────
  const listLimiter   = rateLimit({ ...RATE.aiWorker,    message: { success: false, error: 'เรียกบ่อยเกินไป กรุณารอสักครู่' } });
  const runNowLimiter = rateLimit({ ...RATE.aiWorkerRun, message: { success: false, error: 'รันบ่อยเกินไป กรุณารอสักครู่' } });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
    const status = e.status || 500;
    if (status >= 500) console.error('[ai-worker route]', e.message);
    res.status(status).json({ success: false, error: e.message || 'ai worker error' });
  });

  router.get('/api/ai-worker/plan', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    const plan = planKeyFor(ownerId);
    res.json({ success: true, plan, limits: AI_WORKER[plan], balance: (await credits.pub(ownerId)).balance });
  }));

  router.get('/api/ai-worker/jobs', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    res.json({ success: true, jobs: await listJobs(ownerId) });
  }));

  router.post('/api/ai-worker/jobs', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    const job = await createJob(ownerId, req.body || {});
    res.json({ success: true, job });
  }));

  router.patch('/api/ai-worker/jobs/:id', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    const job = await updateJob(ownerId, req.params.id, req.body || {});
    res.json({ success: true, job });
  }));

  router.delete('/api/ai-worker/jobs/:id', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    const ok = await deleteJob(ownerId, req.params.id);
    res.json({ success: ok });
  }));

  router.get('/api/ai-worker/jobs/:id/runs', listLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    res.json({ success: true, runs: await getRuns(ownerId, req.params.id) });
  }));

  router.post('/api/ai-worker/jobs/:id/run-now', runNowLimiter, wrap(async (req, res) => {
    const ownerId = credits.identityFrom(req);
    const run = await runJobNow(ownerId, req.params.id);
    res.json({ success: run.status === 'ok', run });
  }));

  // เรียกได้ทั้ง GET (Vercel Cron ยิงด้วย GET) และ POST (uptime pinger / manual trigger จาก admin)
  async function processHandler(req, res) {
    const result = await runDueJobs();
    res.json({ success: true, ...result, ran_at: nowIso() });
  }
  router.get('/api/ai-worker/process', wrap(async (req, res) => processHandler(req, res)));
  router.post('/api/ai-worker/process', wrap(async (req, res) => processHandler(req, res)));

  log.info('ai_worker_init', { mode: useSB ? 'supabase' : 'file' });
  return { router, runDueJobs, runWithFallback };
}
