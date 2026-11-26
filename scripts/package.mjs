// Builds the ready-to-run copy of the store in app/: `npm run package`
//
//   app/server.mjs   the whole API and its libraries in one file
//   app/public/      the built storefront
//
// app/start.mjs runs it with nothing but Node.js: no npm install, no build.
// Run this after changing the code, and commit the result.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

function npm(args, cwd) {
  const result = spawnSync(isWindows ? 'npm.cmd' : 'npm', args, { cwd, stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) process.exit(result.status || 1);
}

for (const part of ['server', 'client']) {
  if (!existsSync(path.join(root, part, 'node_modules'))) npm(['install'], path.join(root, part));
}

console.log('Building the storefront…');
npm(['run', 'build'], path.join(root, 'client'));

console.log('Bundling the server…');
const esbuild = createRequire(path.join(root, 'server', 'package.json'))('esbuild');
await esbuild.build({
  entryPoints: [path.join(root, 'server', 'src', 'server.js')],
  outfile: path.join(root, 'app', 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  legalComments: 'none',
  // Express and friends are CommonJS and call require(); give them one.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  logLevel: 'warning'
});

rmSync(path.join(root, 'app', 'public'), { recursive: true, force: true });
cpSync(path.join(root, 'client', 'dist'), path.join(root, 'app', 'public'), { recursive: true });
console.log('Done: app/server.mjs and app/public are up to date.');
