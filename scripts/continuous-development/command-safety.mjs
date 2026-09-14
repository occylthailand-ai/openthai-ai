import { spawn } from 'node:child_process';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { ValidationError } from './utils.mjs';

const BLOCKED_EXECUTABLES = new Set([
  'bash', 'bash.exe', 'cmd', 'cmd.exe', 'curl', 'curl.exe', 'docker', 'docker.exe',
  'gh', 'gh.exe', 'kubectl', 'kubectl.exe', 'powershell', 'powershell.exe',
  'pwsh', 'pwsh.exe', 'scp', 'scp.exe', 'sh', 'sh.exe', 'ssh', 'ssh.exe',
  'terraform', 'terraform.exe', 'vercel', 'vercel.exe', 'wget', 'wget.exe',
]);
const SHELL_META = /(?:[;&|`<>]|\$\(|\r|\n)/;
const SAFE_ENV_KEYS = [
  'PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'SystemRoot', 'TEMP', 'TMP',
  'HOME', 'USERPROFILE', 'CI', 'FORCE_COLOR', 'NO_COLOR',
];
const READ_ONLY_GIT_COMMANDS = new Set([
  'diff', 'grep', 'log', 'ls-files', 'rev-parse', 'show', 'status',
]);

function insideAnyRoot(candidate, roots) {
  return roots.some((root) => {
    const rel = relative(root, candidate);
    return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
  });
}

export function validateCommand(command, policy, workspaceRoot) {
  const problems = [];
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    throw new ValidationError('Command definition must be an object');
  }
  const executable = String(command.executable ?? '');
  const executableName = basename(executable).toLowerCase();
  if (!executable || executable !== basename(executable)) problems.push('command executable must be a bare allowlisted name');
  if (BLOCKED_EXECUTABLES.has(executableName)) problems.push(`command executable is always blocked: ${executable}`);
  if (!policy.allowedExecutables.includes(executable)) problems.push(`command executable is not allowlisted: ${executable}`);
  if (!Array.isArray(command.args) || command.args.some((arg) => typeof arg !== 'string')) {
    problems.push('command args must be an array of strings');
  } else {
    command.args.forEach((arg, index) => {
      if (SHELL_META.test(arg)) problems.push(`command args[${index}] contains blocked shell syntax`);
    });
  }
  if (executableName === 'node' || executableName === 'node.exe') {
    const firstScript = command.args?.findIndex((arg) => !arg.startsWith('-')) ?? -1;
    const runtimeFlags = firstScript < 0 ? command.args : command.args.slice(0, firstScript);
    if (runtimeFlags.some((arg) => ['-e', '--eval', '-p', '--print', '-r', '--require'].includes(arg))) {
      problems.push('dynamic Node.js evaluation and preload flags are blocked');
    }
  }
  if (executableName === 'git' || executableName === 'git.exe') {
    const gitCommand = command.args?.find((arg) => !arg.startsWith('-'));
    if (!READ_ONLY_GIT_COMMANDS.has(gitCommand)) {
      problems.push(`git ${gitCommand ?? '(missing command)'} is blocked; only read-only Git commands are allowed`);
    }
    if (command.args?.some((arg) => arg === '-c' || arg.startsWith('--config-env'))) {
      problems.push('Git config/alias overrides are blocked');
    }
  }
  if ((executableName === 'npm' || executableName === 'npm.cmd')
      && command.args?.some((arg) => /^(?:add|ci|deploy|exec|install|link|pack|publish|rebuild|remove|uninstall|update)$/i.test(arg)
        || /(?:^|:)(?:deploy|publish|release)(?:$|:)/i.test(arg))) {
    problems.push('npm dependency/release/deploy operations are blocked');
  }
  if (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 100 || command.timeoutMs > policy.maximumTimeoutMs) {
    problems.push(`command timeoutMs must be between 100 and ${policy.maximumTimeoutMs}`);
  }
  if (!Array.isArray(command.expectedExitCodes)
      || !command.expectedExitCodes.length
      || command.expectedExitCodes.some((code) => !Number.isInteger(code))) {
    problems.push('command expectedExitCodes must be a non-empty integer array');
  }
  if (typeof command.readOnly !== 'boolean') problems.push('command readOnly must be boolean');
  const cwd = resolve(workspaceRoot, command.cwd ?? '.');
  const roots = policy.workspaceRoots.map((root) => resolve(workspaceRoot, root));
  if (!insideAnyRoot(cwd, roots)) problems.push(`command cwd is outside workspace allowlist: ${command.cwd}`);
  if (problems.length) throw new ValidationError(`Unsafe command "${command.id ?? 'unknown'}"`, problems);
  return { ...command, executable, cwd };
}

function runtimeEnvironment(extra = {}) {
  const env = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return { ...env, ...extra };
}

export async function runCommand(command, policy, workspaceRoot, options = {}) {
  const safe = validateCommand(command, policy, workspaceRoot);
  if (options.forceFailure) {
    return {
      commandId: safe.id,
      simulated: true,
      timedOut: false,
      exitCode: 97,
      stdout: '',
      stderr: 'Injected failure',
      durationMs: 0,
    };
  }
  if (options.dryRun) {
    return {
      commandId: safe.id,
      simulated: true,
      timedOut: false,
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 0,
    };
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let timer;
    let forceKillTimer;
    const child = spawn(safe.executable, safe.args, {
      cwd: safe.cwd,
      env: runtimeEnvironment({
        CDE_IDEMPOTENCY_KEY: options.idempotencyKey ?? '',
        CDE_PROPOSAL_ID: options.proposalId ?? '',
      }),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const appendLimited = (current, chunk) => {
      const combined = current + chunk.toString('utf8');
      return combined.slice(0, policy.maximumOutputBytes);
    };
    child.stdout.on('data', (chunk) => { stdout = appendLimited(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendLimited(stderr, chunk); });
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
      rejectPromise(new Error(`Could not start command "${safe.id}": ${error.message}`, { cause: error }));
    });
    child.once('close', (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
      resolvePromise({
        commandId: safe.id,
        simulated: false,
        timedOut,
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      });
    });
    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      forceKillTimer.unref();
    }, safe.timeoutMs);
  });
}
