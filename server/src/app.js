import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

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

  app.use('/api/admin', adminRoutes({ store, config }));
  app.use('/api', publicRoutes({ store, config, mailer, payments }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  const uploadsDir = path.join(config.dataDir, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', fallthrough: false }));

  // In production, the same server also serves the built React app.
  const indexHtml = path.join(config.clientDist, 'index.html');
  if (existsSync(indexHtml)) {
    app.use(express.static(config.clientDist, { index: false }));
    app.get('/{*splat}', (req, res) => res.sendFile(indexHtml));
  }

  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 8 MB or smaller' : error.message;
      return res.status(400).json({ error: message });
    }
    if (error.status && error.status < 500) {
      return res.status(error.status).json({ error: error.expose ? error.message : 'Request failed' });
    }
    console.error(error);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}
