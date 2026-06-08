// ตัวช่วย spawn เซิร์ฟเวอร์จริงสำหรับ integration test แล้วรอจน /api/health ตอบ 200
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BACKEND_DIR = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export async function startServer({ port, env = {}, readyMs = 20000 } = {}) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + readyMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (r.status === 200) {
        return {
          base,
          stop: () => new Promise((res) => { child.once('exit', () => res()); child.kill('SIGKILL'); }),
          log: () => log,
        };
      }
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  child.kill('SIGKILL');
  throw new Error(`server ไม่พร้อมภายใน ${readyMs}ms\n--- log ---\n${log}`);
}
