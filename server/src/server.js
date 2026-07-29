import express from 'express';
import cors from 'cors';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 5000);

const artworks = [
  {
    id: 1,
    title: 'Golden Bloom Wall Hanging',
    category: 'Fabric Painting',
    description: 'A vibrant hand-painted cotton piece inspired by marigold fields.',
    story: 'Painted in layers of warm color and stitched detail to echo the rhythm of summer gardens.',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80',
    featured: true
  },
  {
    id: 2,
    title: 'Ocean Crochet Throw',
    category: 'Crochet',
    description: 'A cozy layered blanket made with soft blue and sea-green yarns.',
    story: 'A calm palette of sea tones woven into an heirloom-style blanket.',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    featured: true
  },
  {
    id: 3,
    title: 'Woven Memory Basket',
    category: 'Other',
    description: 'A sculptural basket woven from natural fibers and dyed cord.',
    story: 'A tactile piece shaped around gathered textures and rhythm.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
    featured: false
  }
];

const products = [
  {
    id: 1,
    title: 'Mini Fabric Study',
    category: 'Fabric Painting',
    description: 'A small handmade print for a gallery wall.',
    price: 28,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 2,
    title: 'Crochet Pocket Pouch',
    category: 'Crochet',
    description: 'A soft pouch for everyday essentials.',
    price: 24,
    image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80'
  }
];

const commentsByArtwork = {
  1: [{ id: 1, name: 'Alicia', message: 'The color transitions are stunning.' }],
  2: [{ id: 2, name: 'Jules', message: 'This would brighten any room.' }]
};

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/artworks', (req, res) => {
  res.json(artworks);
});

app.get('/api/artworks/:id', (req, res) => {
  const artwork = artworks.find((item) => String(item.id) === req.params.id);
  if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
  res.json(artwork);
});

app.get('/api/artworks/:id/comments', (req, res) => {
  res.json(commentsByArtwork[req.params.id] || []);
});

app.post('/api/artworks/:id/comments', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });
  const comment = { id: Date.now(), name, message };
  commentsByArtwork[req.params.id] = [...(commentsByArtwork[req.params.id] || []), comment];
  res.status(201).json(comment);
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find((item) => String(item.id) === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/contact', (req, res) => {
  res.status(200).json({ ok: true });
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Artist Studio API running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy. Trying ${port + 1} instead...`);
      startServer(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
}

startServer(DEFAULT_PORT);
