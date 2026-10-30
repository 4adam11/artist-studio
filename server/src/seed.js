// Starter content written to data/db.json the first time the server runs.
// After that, the artist manages everything from the /admin page.
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const seed = {
  artworks: [
    {
      id: 1,
      title: 'Golden Bloom Wall Hanging',
      category: 'Fabric Painting',
      description: 'A vibrant hand-painted cotton piece inspired by marigold fields.',
      story: 'Painted in layers of warm color and stitched detail to echo the rhythm of summer gardens.',
      image: photo('photo-1513364776144-60967b0f800f'),
      gallery: [photo('photo-1524758631624-e2822e304c36')],
      materials: 'Fabric paint on cotton, embroidery thread',
      dimensions: '60 × 90 cm',
      year: '2025',
      featured: true
    },
    {
      id: 2,
      title: 'Ocean Crochet Throw',
      category: 'Crochet',
      description: 'A cozy layered blanket made with soft blue and sea-green yarns.',
      story: 'A calm palette of sea tones woven into an heirloom-style blanket.',
      image: photo('photo-1512436991641-6745cdb1723f'),
      gallery: [],
      materials: 'Merino and cotton blend yarn',
      dimensions: '130 × 160 cm',
      year: '2025',
      featured: true
    },
    {
      id: 3,
      title: 'Woven Memory Basket',
      category: 'Other',
      description: 'A sculptural basket woven from natural fibers and dyed cord.',
      story: 'A tactile piece shaped around gathered textures and rhythm.',
      image: photo('photo-1509440159596-0249088772ff'),
      gallery: [],
      materials: 'Natural fiber, hand-dyed cotton cord',
      dimensions: '30 cm wide',
      year: '2024',
      featured: false
    }
  ],
  products: [
    {
      id: 1,
      title: 'Mini Fabric Study',
      category: 'Fabric Painting',
      description: 'A small handmade painting on cotton, ready for a gallery wall.',
      price: 28,
      stock: 5,
      image: photo('photo-1524758631624-e2822e304c36'),
      gallery: [photo('photo-1513364776144-60967b0f800f')],
      materials: 'Fabric paint on unbleached cotton',
      dimensions: '20 × 25 cm, unframed',
      care: 'Keep out of direct sunlight. Dust gently with a soft brush.'
    },
    {
      id: 2,
      title: 'Crochet Pocket Pouch',
      category: 'Crochet',
      description: 'A soft pouch for everyday essentials.',
      price: 24,
      stock: 3,
      image: photo('photo-1487412912498-0447578fcca8'),
      gallery: [photo('photo-1512436991641-6745cdb1723f')],
      materials: '100% cotton yarn, wooden button',
      dimensions: '15 × 12 cm',
      care: 'Hand wash cold and dry flat.'
    }
  ],
  comments: [
    { id: 1, artworkId: 1, name: 'Alicia', message: 'The color transitions are stunning.', createdAt: '2026-01-10T12:00:00.000Z' },
    { id: 2, artworkId: 2, name: 'Jules', message: 'This would brighten any room.', createdAt: '2026-01-12T12:00:00.000Z' }
  ],
  posts: [
    {
      id: 1,
      title: 'Behind the Golden Bloom',
      excerpt: 'How a summer walk through marigold fields turned into a layered fabric painting.',
      body: 'Every piece starts long before the paint touches the cotton.\n\nFor Golden Bloom, it began with a walk through marigold fields at the end of summer, and a pocket full of photos of the light between the rows.\n\nThe painting was built up in thin layers over two weeks, with stitched details added last to bring back the texture of the petals.',
      image: photo('photo-1513364776144-60967b0f800f'),
      published: true,
      createdAt: '2026-09-02T10:00:00.000Z'
    }
  ],
  events: [
    {
      id: 1,
      title: 'Winter Makers Market',
      date: '2026-12-12',
      endDate: '2026-12-13',
      location: 'Town Hall, Main Street',
      description: 'Come and see new pieces in person, plus small gifts made just for the market.',
      link: ''
    }
  ],
  discounts: [
    { id: 1, code: 'WELCOME10', type: 'percent', amount: 10, minSubtotal: 0, expiresAt: '', active: true, uses: 0 }
  ],
  reviews: [],
  messages: [],
  orders: [],
  commissions: [],
  subscribers: [],
  stockAlerts: [],
  settings: []
};
