import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { createAdminAuth } from './middleware.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';
import { pageMeta, renderIndex, robots, sitemap } from './seo.js';

export function createApp({ store, config, mailer, payments }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    next();
  });

  // In development the Vite dev server proxies /api, so CORS is only needed
  // when the frontend is hosted on a different domain from the API.
  if (config.corsOrigin) app.use('/api', cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));

  app.use(express.json({ limit: '100kb' }));

  const auth = createAdminAuth({ adminPassword: config.adminPassword, sessionSecret: config.sessionSecret });
  app.use('/api/admin', adminRoutes({ store, config, mailer, auth }));
  app.use('/api', publicRoutes({ store, config, mailer, payments }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  const uploadsDir = path.join(config.dataDir, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', fallthrough: false }));

  app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemap({ store, config })));
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(robots({ config })));

  // In production, the same server also serves the built React app, with the
  // right title, description and preview image filled in for each page.
  const indexFile = path.join(config.clientDist, 'index.html');
  if (existsSync(indexFile)) {
    const indexHtml = readFileSync(indexFile, 'utf8');
    app.use(express.static(config.clientDist, { index: false }));
    app.get('/{*splat}', (req, res) => {
      res.type('html').send(renderIndex(indexHtml, pageMeta(req.path, { store, config })));
    });
  }

  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (error instanceof multer.MulterError) {
      const messages = { LIMIT_FILE_SIZE: 'Each image must be 8 MB or smaller', LIMIT_FILE_COUNT: 'Too many images', LIMIT_UNEXPECTED_FILE: 'Too many images' };
      return res.status(400).json({ error: messages[error.code] || error.message });
    }
    if (error.status && error.status < 500) {
      return res.status(error.status).json({ error: error.expose ? error.message : 'Request failed' });
    }
    console.error(error);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}
