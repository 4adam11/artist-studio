// Starts the ready-to-run store. Used by "Start Store.cmd" (Windows),
// "Start Store.command" (Mac) and start.sh, or directly: node app/start.mjs
//
// - Creates server/.env on first run, with a random admin password
// - Picks a free port (5050 if available)
// - Starts the store and opens it in the browser
//
// Needs only Node.js 20 or newer; no npm install or build step.
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../server/src/env.js';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(appDir, '..');
const envFile = path.join(root, 'server', '.env');

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`\nNode.js ${process.versions.node} is too old (20 or newer is needed).`);
  console.error('Use "Start Store.cmd" (Windows) or start.sh (Mac/Linux): they download a suitable Node.js automatically.\n');
  process.exit(1);
}

// ---- Settings file and admin password ----
if (!existsSync(envFile)) copyFileSync(path.join(root, 'server', '.env.example'), envFile);
let envText = readFileSync(envFile, 'utf8');
let password = (envText.match(/^ADMIN_PASSWORD=[ \t]*(\S+)/m) || [])[1];
if (!password) {
  password = randomBytes(6).toString('base64url');
  envText = /^ADMIN_PASSWORD=.*$/m.test(envText)
    ? envText.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`)
    : `${envText.trimEnd()}\nADMIN_PASSWORD=${password}\n`;
  writeFileSync(envFile, envText);
}

// ---- A free port ----
function isFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port);
  });
}

const wanted = Number((envText.match(/^PORT=[ \t]*(\d+)/m) || [])[1] || 5050);
let port = wanted;
while (!(await isFree(port))) {
  port += 1;
  if (port > wanted + 50) {
    console.error('\nCould not find a free port. Close other programs and try again.\n');
    process.exit(1);
  }
}

// ---- Start the store in this process ----
// Read server/.env first so its settings win over the defaults below.
loadEnvFile(envFile);
const url = `http://localhost:${port}`;
process.env.PORT = String(port);
process.env.ENV_FILE = envFile;
process.env.CLIENT_DIST = path.join(appDir, 'public');
// Relative DATA_DIR values in .env are relative to server/, as in development.
process.env.DATA_DIR = path.resolve(root, 'server', process.env.DATA_DIR || 'data');
// A localhost PUBLIC_URL (like the development default) means "this computer".
if (!process.env.PUBLIC_URL || /^http:\/\/localhost(:\d+)?\/?$/.test(process.env.PUBLIC_URL)) process.env.PUBLIC_URL = url;
await import('./server.mjs');
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${url}/api/health`)).ok) break;
  } catch {
    // not listening yet
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}

console.log('\n  ─────────────────────────────────────────────');
console.log(`  Store   ${url}`);
console.log(`  Admin   ${url}/admin`);
console.log(`  Admin password: ${password}   (saved in server/.env)`);
console.log('  Keep this window open while you use the store.');
console.log('  Close it (or press Ctrl+C) to stop.');
console.log('  ─────────────────────────────────────────────\n');

if (!process.env.NO_BROWSER) {
  const opener = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(opener, () => {});
}
