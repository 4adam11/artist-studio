import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware.js';
import { ORDER_STATUSES } from '../orders.js';
import { artworkSchema, productSchema, validate } from '../validate.js';

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const newestFirst = (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function adminRoutes({ store, config }) {
  const router = Router();
  router.use(requireAdmin(config.adminPassword));

  const upload = multer({
    storage: multer.diskStorage({
      destination: path.join(config.dataDir, 'uploads'),
      filename: (req, file, done) => done(null, `${Date.now()}-${randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`)
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, done) => {
      if (IMAGE_TYPES[file.mimetype]) return done(null, true);
      const error = new Error('Please upload a JPG, PNG, WebP or GIF image');
      error.status = 400;
      error.expose = true;
      done(error);
    }
  });

  router.get('/session', (req, res) => {
    res.json({ ok: true });
  });

  router.post('/uploads', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image was uploaded' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });

  // Create / update / delete for the two kinds of content the artist manages.
  for (const [collection, schema] of [['artworks', artworkSchema], ['products', productSchema]]) {
    router.post(`/${collection}`, async (req, res) => {
      const { value, error } = validate(req.body, schema);
      if (error) return res.status(400).json({ error });
      res.status(201).json(await store.insert(collection, value));
    });

    router.put(`/${collection}/:id`, async (req, res) => {
      const { value, error } = validate(req.body, schema, { partial: true });
      if (error) return res.status(400).json({ error });
      const item = await store.update(collection, req.params.id, value);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });

    router.delete(`/${collection}/:id`, async (req, res) => {
      const removed = await store.remove(collection, req.params.id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      if (collection === 'artworks') {
        await store.removeWhere('comments', (comment) => comment.artworkId === Number(req.params.id));
      }
      res.status(204).end();
    });
  }

  router.get('/comments', (req, res) => {
    const comments = newestFirst(store.all('comments')).map((comment) => ({
      ...comment,
      artworkTitle: store.find('artworks', comment.artworkId)?.title || 'Deleted artwork'
    }));
    res.json(comments);
  });

  router.delete('/comments/:id', async (req, res) => {
    if (!(await store.remove('comments', req.params.id))) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  router.get('/messages', (req, res) => {
    res.json(newestFirst(store.all('messages')));
  });

  router.patch('/messages/:id', async (req, res) => {
    const { value, error } = validate(req.body, { read: { type: 'boolean', required: true } });
    if (error) return res.status(400).json({ error });
    const message = await store.update('messages', req.params.id, value);
    if (!message) return res.status(404).json({ error: 'Not found' });
    res.json(message);
  });

  router.delete('/messages/:id', async (req, res) => {
    if (!(await store.remove('messages', req.params.id))) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  router.get('/orders', (req, res) => {
    res.json(newestFirst(store.all('orders')));
  });

  router.patch('/orders/:id', async (req, res) => {
    if (!ORDER_STATUSES.includes(req.body?.status)) {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const order = await store.update('orders', req.params.id, { status: req.body.status });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  });

  return router;
}
