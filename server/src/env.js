import { existsSync, readFileSync } from 'node:fs';

// Reads KEY=value lines from a .env file into process.env, without
// overriding variables that are already set (so a host's settings win).
// Done here instead of with `node --env-file` so it works on every
// supported Node.js version.
export function loadEnvFile(file) {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}
