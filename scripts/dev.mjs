// Runs the whole store locally with one command: `npm run dev`
//
// 1. Checks the Node.js version and explains what to do if it's too old.
// 2. Installs dependencies if they are missing.
// 3. Creates server/.env from the example on first run.
// 4. Starts the API and the storefront together in this one terminal.
//
// Written with plain, widely supported syntax so the version check can
// still print its message on old Node.js versions.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

function fail(lines) {
  console.error(`\n${lines.join('\n')}\n`);
  process.exit(1);
}

// ---- 1. Node.js version (Vite needs 20.19+ or 22.12+) ----
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 23;
if (!nodeOk) {
  fail([
    `This store needs Node.js 22.12 or newer (or 20.19+). You have Node.js ${process.versions.node}.`,
    '',
    'Fix: download the "LTS" version from https://nodejs.org, install it,',
    'then close and reopen VS Code (or your terminal) and run `npm run dev` again.'
  ]);
}

function run(args, cwd) {
  // shell: true lets Windows find npm.cmd; the arguments here are fixed, not user input.
  const result = spawnSync(npm, args, { cwd, stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) fail([`"npm ${args.join(' ')}" failed in ${path.relative(root, cwd) || '.'}. See the messages above.`]);
}

// ---- 2. Dependencies ----
for (const part of ['server', 'client']) {
  const dir = path.join(root, part);
  if (!existsSync(path.join(dir, 'node_modules'))) {
    console.log(`Installing ${part} dependencies (first run only)…`);
    run(['install'], dir);
  }
}

// ---- 3. server/.env ----
const envFile = path.join(root, 'server', '.env');
if (!existsSync(envFile)) {
  copyFileSync(path.join(root, 'server', '.env.example'), envFile);
  console.log('Created server/.env from server/.env.example.');
}
const hasAdminPassword = /^ADMIN_PASSWORD=[ \t]*\S/m.test(readFileSync(envFile, 'utf8'));

// ---- 4. Start both parts ----
const children = [];
let stopping = false;

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}

function start(name, args, onLine) {
  const child = spawn(npm, args, { cwd: root, shell: isWindows, env: { ...process.env, FORCE_COLOR: '1' } });
  children.push(child);
  const forward = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        out.write(`[${name}] ${line}\n`);
        // Match on the text without colour codes.
        if (onLine) onLine(line.replace(/\x1b\[[0-9;]*m/g, ''));
      }
    });
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (stopping) return;
    console.error(`\n[${name}] stopped (exit code ${code}). Stopping the store.`);
    stopAll(code || 1);
  });
  return child;
}

let shown = false;
start('api', ['run', '--silent', 'dev:server'], (line) => {
  if (line.includes('already in use')) {
    console.error('\nAnother program is using port 5050. Close other terminals running the store, or restart VS Code, then try again.');
  }
});
start('web', ['run', '--silent', 'dev:client'], (line) => {
  if (!shown && line.includes('Local:')) {
    shown = true;
    console.log('\n  Store is running:');
    console.log('    Store  http://localhost:5173');
    console.log(`    Admin  http://localhost:5173/admin${hasAdminPassword ? '' : '  (set ADMIN_PASSWORD in server/.env first, then restart)'}`);
    console.log('  Press Ctrl+C to stop.\n');
  }
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
