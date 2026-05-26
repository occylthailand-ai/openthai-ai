#!/usr/bin/env node
// Stdio MCP bridge — Claude Code ↔ openthai-ai backend (http://localhost:8000)
// Run via: node mcp-server.js
// Claude Code config: see .claude/settings.json

import { createInterface } from 'readline';

const BACKEND = process.env.OPENTHAI_URL || 'http://localhost:8000';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function err(id, code, message) {
  send({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
}

async function proxy(rpc) {
  const { id } = rpc;
  try {
    const res = await fetch(`${BACKEND}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MCP-Client': 'claude-code' },
      body: JSON.stringify(rpc),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      err(id, -32603, `Backend HTTP ${res.status}: ${await res.text()}`);
      return;
    }

    const data = await res.json();
    // Notifications return null → no response
    if (data !== null) send(data);
  } catch (e) {
    if (e.name === 'TimeoutError') {
      err(id, -32603, 'Backend timeout (30s)');
    } else if (e.code === 'ECONNREFUSED') {
      err(id, -32603, `Backend not reachable at ${BACKEND}. Start the server: cd backend && npm start`);
    } else {
      err(id, -32603, e.message);
    }
  }
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const rpc = JSON.parse(trimmed);
    await proxy(rpc);
  } catch {
    err(null, -32700, 'Parse error — expected JSON-RPC line');
  }
});

rl.on('close', () => process.exit(0));
process.stderr.write(`[openthai-mcp] bridge ready → ${BACKEND}\n`);
