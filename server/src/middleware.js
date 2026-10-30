import { createHash, timingSafeEqual } from 'node:crypto';

// Fixed-window, per-IP rate limiter. Good enough for a single-server site;
// it keeps bots from flooding the comment and contact forms.
export function rateLimit({ windowMs, max }) {
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
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    }
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

export function requireAdmin(adminPassword) {
  return (req, res, next) => {
    if (!adminPassword) {
      return res.status(503).json({ error: 'The admin area is disabled. Set ADMIN_PASSWORD in server/.env to turn it on.' });
    }
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !timingSafeEqual(digest(token), digest(adminPassword))) {
      return res.status(401).json({ error: 'Incorrect admin password' });
    }
    next();
  };
}
