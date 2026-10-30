import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Fixed-window, per-IP rate limiter. Good enough for a single-server site;
// it keeps bots from flooding the forms and guessing the admin password.
export function rateLimit({ windowMs, max, message = 'Too many requests. Please wait a few minutes and try again.' }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [key, entry] of hits) if (now - entry.start > windowMs) hits.delete(key);
    }

    const entry = hits.get(req.ip);
    if (!entry || now - entry.start > windowMs) {
      hits.set(req.ip, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ error: message });
    next();
  };
}

// Forms include a hidden "website" field that people never see or fill in.
// Bots usually fill every field, so if it has a value we quietly pretend the
// request worked without saving anything.
export function isSpam(body) {
  return Boolean(body && body.website);
}

const digest = (value) => createHash('sha256').update(String(value)).digest();
const sameSecret = (a, b) => timingSafeEqual(digest(a), digest(b));

// Admin sessions: logging in with the password returns a signed token that
// expires after `sessionHours`. The browser keeps the token, never the
// password. Changing ADMIN_PASSWORD (or SESSION_SECRET) logs everyone out.
export function createAdminAuth({ adminPassword, sessionSecret = '', sessionHours = 12 }) {
  const key = digest(`artist-studio-admin:${sessionSecret}:${adminPassword}`);
  const sign = (body) => createHmac('sha256', key).update(body).digest('base64url');

  function verify(token) {
    const [body, signature] = String(token).split('.');
    if (!body || !signature || !sameSecret(signature, sign(body))) return false;
    try {
      return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now();
    } catch {
      return false;
    }
  }

  return {
    enabled: Boolean(adminPassword),

    login(password) {
      if (!adminPassword || !password || !sameSecret(password, adminPassword)) return null;
      const expiresAt = Date.now() + sessionHours * 60 * 60 * 1000;
      const body = Buffer.from(JSON.stringify({ exp: expiresAt })).toString('base64url');
      return { token: `${body}.${sign(body)}`, expiresAt };
    },

    require(req, res, next) {
      if (!adminPassword) {
        return res.status(503).json({ error: 'The admin area is disabled. Set ADMIN_PASSWORD in server/.env to turn it on.' });
      }
      const header = req.get('authorization') || '';
      if (!verify(header.startsWith('Bearer ') ? header.slice(7) : '')) {
        return res.status(401).json({ error: 'Your admin session has expired. Please log in again.' });
      }
      next();
    }
  };
}
