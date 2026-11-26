// Starter catalogue written to data/shop.json the first time the server runs.
// Replace it from the admin: edit or delete these products and add your own.
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const created = '2026-11-01T10:00:00.000Z';

const variant = (id, options, price, stock, extra = {}) => ({ id, options, price, compareAtPrice: null, sku: '', stock, ...extra });

export const seed = {
  products: [
    {
      id: 1,
      title: 'Golden Bloom Wall Hanging',
      handle: 'golden-bloom-wall-hanging',
      description: 'Hand-painted cotton wall hanging in warm yellows and ochres, finished with stitched detail and a wooden hanging rod.\n\nOne of a kind.',
      productType: 'Fabric painting',
      vendor: '',
      tags: ['wall art', 'one of a kind'],
      status: 'active',
      images: [photo('photo-1513364776144-60967b0f800f'), photo('photo-1524758631624-e2822e304c36')],
      options: [],
      variants: [variant('0a1b2c3d4e', [], 220, 1, { sku: 'FP-GOLD-01' })],
      createdAt: created
    },
    {
      id: 2,
      title: 'Mini Fabric Study',
      handle: 'mini-fabric-study',
      description: 'A small painting on unbleached cotton. Sized for a shelf or a gallery wall.\n\nMaterials: fabric paint on cotton.\nSize: 20 × 25 cm, unframed.',
      productType: 'Fabric painting',
      vendor: '',
      tags: ['wall art', 'small'],
      status: 'active',
      images: [photo('photo-1524758631624-e2822e304c36')],
      options: [],
      variants: [variant('1b2c3d4e5f', [], 28, 6, { sku: 'FP-MINI' })],
      createdAt: '2026-11-03T10:00:00.000Z'
    },
    {
      id: 3,
      title: 'Crochet Pouch',
      handle: 'crochet-pouch',
      description: 'A small zip pouch crocheted in cotton yarn and lined with linen.\n\nSize: 15 × 12 cm.\nCare: hand wash cold, dry flat.',
      productType: 'Crochet',
      vendor: '',
      tags: ['accessories', 'gift'],
      status: 'active',
      images: [photo('photo-1487412912498-0447578fcca8')],
      options: [{ name: 'Colour', values: ['Sand', 'Sage', 'Rust'] }],
      variants: [
        variant('2c3d4e5f6a', ['Sand'], 24, 4, { sku: 'CR-POUCH-SAND' }),
        variant('3d4e5f6a7b', ['Sage'], 24, 2, { sku: 'CR-POUCH-SAGE' }),
        variant('4e5f6a7b8c', ['Rust'], 24, 0, { sku: 'CR-POUCH-RUST' })
      ],
      createdAt: '2026-11-05T10:00:00.000Z'
    },
    {
      id: 4,
      title: 'Ocean Crochet Throw',
      handle: 'ocean-crochet-throw',
      description: 'A layered throw in blues and sea greens, crocheted in a merino and cotton blend.\n\nCare: hand wash cold, dry flat.',
      productType: 'Crochet',
      vendor: '',
      tags: ['home', 'blanket'],
      status: 'active',
      images: [photo('photo-1512436991641-6745cdb1723f')],
      options: [{ name: 'Size', values: ['Lap (90 × 120 cm)', 'Bed (130 × 160 cm)'] }],
      variants: [
        variant('5f6a7b8c9d', ['Lap (90 × 120 cm)'], 140, 2, { sku: 'CR-THROW-LAP', compareAtPrice: 160 }),
        variant('6a7b8c9d0e', ['Bed (130 × 160 cm)'], 190, 1, { sku: 'CR-THROW-BED' })
      ],
      createdAt: '2026-11-08T10:00:00.000Z'
    },
    {
      id: 5,
      title: 'Woven Basket',
      handle: 'woven-basket',
      description: 'A small basket woven from natural fibre and hand-dyed cotton cord.\n\nSize: 30 cm wide.',
      productType: 'Home',
      vendor: '',
      tags: ['home'],
      status: 'active',
      images: [photo('photo-1509440159596-0249088772ff')],
      options: [],
      variants: [variant('7b8c9d0e1f', [], 65, 0, { sku: 'HM-BASKET' })],
      createdAt: '2026-11-10T10:00:00.000Z'
    }
  ],
  collections: [
    { id: 1, title: 'Fabric paintings', handle: 'fabric-paintings', description: 'Paintings on cotton and linen.', image: '', productIds: [1, 2] },
    { id: 2, title: 'Crochet', handle: 'crochet', description: 'Crocheted accessories and throws.', image: '', productIds: [4, 3] },
    { id: 3, title: 'Home', handle: 'home', description: 'Pieces for the home.', image: '', productIds: [4, 5, 1] }
  ],
  pages: [
    {
      id: 1,
      title: 'About',
      handle: 'about',
      body: 'Every piece in this shop is made by hand in a small studio, one at a time.\n\nThe work covers fabric painting, crochet and other fibre techniques, using cotton, linen, wool and plant fibres wherever possible.\n\nCustom orders are welcome. Get in touch through the contact page.',
      published: true
    },
    {
      id: 2,
      title: 'Shipping & returns',
      handle: 'shipping-returns',
      body: '## Shipping\n\nOrders ship within 3–5 business days. Shipping costs are shown at checkout before you pay. You will get an email with tracking information when your order ships.\n\n## Returns\n\nContact us within 14 days of delivery to arrange a return. Items must be unused and in their original condition. Custom orders cannot be returned.\n\n## Damaged items\n\nIf something arrives damaged, send a photo within 3 days of delivery and we will repair, replace or refund it.',
      published: true
    },
    {
      id: 3,
      title: 'FAQ',
      handle: 'faq',
      body: '## Is everything handmade?\n\nYes. Each piece is made by hand, so colours and sizes can vary slightly.\n\n## Do you take custom orders?\n\nYes. Use the contact page and choose "Custom order".\n\n## How do I care for crochet pieces?\n\nHand wash cold with a gentle detergent and dry flat.\n\n## Where do you ship?\n\nWorldwide. Rates are shown at checkout.',
      published: true
    }
  ],
  discounts: [
    { id: 1, code: 'WELCOME10', type: 'percent', amount: 10, minSubtotal: 0, usageLimit: 0, expiresAt: '', active: true, uses: 0 }
  ],
  orders: [],
  messages: [],
  subscribers: [],
  settings: []
};
