import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// All settings come from environment variables (or server/.env).
// See server/.env.example for what each one does.
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 5050),
    dataDir: path.resolve(serverRoot, env.DATA_DIR || 'data'),
    clientDist: path.resolve(serverRoot, '../client/dist'),
    publicUrl: (env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, ''),
    corsOrigin: env.CORS_ORIGIN || '',
    trustProxy: env.TRUST_PROXY === 'true',
    adminPassword: env.ADMIN_PASSWORD || '',
    currency: (env.CURRENCY || 'usd').toLowerCase(),
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    notifyEmail: env.NOTIFY_EMAIL || '',
    fromEmail: env.FROM_EMAIL || '',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT || 587),
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || ''
    }
  };
}
