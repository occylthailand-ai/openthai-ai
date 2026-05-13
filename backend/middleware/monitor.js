// ─────────────────────────────────────────────────────────────────────────────
// OpenThai AI — Performance & Error Monitoring Middleware
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_VERCEL = !!process.env.VERCEL;
const METRICS_DIR = IS_VERCEL ? '/tmp/openthai-metrics' : join(__dirname, '../data/metrics');

function ensureDir() {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true });
}

// ── In-memory counters (reset on cold start) ─────────────────────────────────
const counters = {
  requests_total: 0,
  requests_error: 0,
  ai_generate_total: 0,
  ai_generate_claude: 0,
  ai_generate_gemini: 0,
  ai_generate_mock: 0,
  ai_tokens_used: 0,
  response_times: [],   // เก็บ 1000 ล่าสุด
};

// ── Response time tracking ────────────────────────────────────────────────────
export function perfMiddleware(req, res, next) {
  const start = Date.now();
  counters.requests_total++;

  res.on('finish', () => {
    const ms = Date.now() - start;
    if (counters.response_times.length >= 1000) counters.response_times.shift();
    counters.response_times.push({ path: req.path, ms, status: res.statusCode, ts: Date.now() });
    if (res.statusCode >= 500) counters.requests_error++;
    // log slow requests (>3 วินาที)
    if (ms > 3000) {
      console.warn(`[SLOW] ${req.method} ${req.path} — ${ms}ms`);
    }
  });

  next();
}

// ── AI usage tracker ──────────────────────────────────────────────────────────
export function trackAiUsage({ source, tokensUsed = 0 }) {
  counters.ai_generate_total++;
  if (source === 'claude')  counters.ai_generate_claude++;
  if (source === 'gemini')  counters.ai_generate_gemini++;
  if (source === 'mock')    counters.ai_generate_mock++;
  counters.ai_tokens_used += tokensUsed;
}

// ── คำนวณ percentile ──────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p / 100)];
}

// ── GET /api/health ────────────────────────────────────────────────────────────
export function healthHandler(req, res) {
  const times = counters.response_times.map((r) => r.ms);
  const recentErrors = counters.response_times.filter((r) => r.status >= 500 && Date.now() - r.ts < 300000).length;

  res.json({
    status:    recentErrors > 10 ? 'degraded' : 'ok',
    version:   process.env.npm_package_version || '1.0.0',
    uptime_s:  Math.floor(process.uptime()),
    ts:        new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
    ai: {
      claude_available:  !!process.env.ANTHROPIC_API_KEY,
      gemini_available:  !!process.env.GEMINI_API_KEY,
      generate_total:    counters.ai_generate_total,
      claude_pct:        counters.ai_generate_total ? Math.round(counters.ai_generate_claude / counters.ai_generate_total * 100) : 0,
      gemini_pct:        counters.ai_generate_total ? Math.round(counters.ai_generate_gemini / counters.ai_generate_total * 100) : 0,
      mock_pct:          counters.ai_generate_total ? Math.round(counters.ai_generate_mock    / counters.ai_generate_total * 100) : 0,
      tokens_used:       counters.ai_tokens_used,
    },
    requests: {
      total:     counters.requests_total,
      errors:    counters.requests_error,
      error_pct: counters.requests_total ? Math.round(counters.requests_error / counters.requests_total * 100) : 0,
    },
    latency_ms: {
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
    },
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
}

// ── GET /api/metrics (admin only) ─────────────────────────────────────────────
export function metricsHandler(req, res) {
  const recent = counters.response_times.slice(-100);
  res.json({
    counters,
    recent_requests: recent,
    slowest: [...counters.response_times].sort((a, b) => b.ms - a.ms).slice(0, 10),
  });
}

// ── Error logger ──────────────────────────────────────────────────────────────
export function logError(err, context = {}) {
  const entry = {
    ts:      new Date().toISOString(),
    message: err.message,
    stack:   err.stack?.split('\n').slice(0, 5).join(' | '),
    ...context,
  };
  console.error('[ERROR]', JSON.stringify(entry));

  // เขียนลงไฟล์ (local เท่านั้น — Vercel ใช้ console)
  if (!IS_VERCEL) {
    try {
      ensureDir();
      const file = join(METRICS_DIR, 'errors.jsonl');
      writeFileSync(file, JSON.stringify(entry) + '\n', { flag: 'a' });
    } catch { /* non-fatal */ }
  }
}

// ── Express error handler (ใส่เป็น middleware ตัวสุดท้าย) ─────────────────
export function errorHandler(err, req, res, next) {
  logError(err, { path: req.path, method: req.method, userId: req.user?.id });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
}
