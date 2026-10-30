// Starter content written to data/db.json the first time the server runs.
// After that, the artist manages everything from the /admin page.
export const seed = {
  artworks: [
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
  ],
  products: [
    {
      id: 1,
      title: 'Mini Fabric Study',
      category: 'Fabric Painting',
      description: 'A small handmade print for a gallery wall.',
      price: 28,
      stock: 5,
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 2,
      title: 'Crochet Pocket Pouch',
      category: 'Crochet',
      description: 'A soft pouch for everyday essentials.',
      price: 24,
      stock: 3,
      image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80'
    }
  ],
  comments: [
    { id: 1, artworkId: 1, name: 'Alicia', message: 'The color transitions are stunning.', createdAt: '2026-01-10T12:00:00.000Z' },
    { id: 2, artworkId: 2, name: 'Jules', message: 'This would brighten any room.', createdAt: '2026-01-12T12:00:00.000Z' }
  ],
  messages: [],
  orders: []
};
