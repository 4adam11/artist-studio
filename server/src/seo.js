import { getSettings } from './settings.js';

// The React app renders in the browser, but link previews (WhatsApp,
// Instagram, Facebook, Pinterest) and search engines read the raw HTML.
// So when serving the built site, the server fills in the page title,
// description and image for each product, artwork and journal post.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const STATIC_PAGES = {
  '/': null,
  '/shop': ['Shop', 'Original handmade fabric paintings, crochet and fiber pieces.'],
  '/portfolio': ['Portfolio', 'A gallery of fabric paintings, crochet and fiber art.'],
  '/commissions': ['Commissions', 'Have a one-of-a-kind piece made for your home or someone you love.'],
  '/journal': ['Journal', 'Stories, works in progress and life in the studio.'],
  '/events': ['Events', 'Markets, exhibitions and workshops where you can see the work in person.'],
  '/about': ['About', 'About the artist and the studio.'],
  '/faq': ['FAQ', 'Answers to common questions about orders, shipping and commissions.'],
  '/shipping-returns': ['Shipping & returns', 'How orders are packed, shipped and returned.'],
  '/contact': ['Contact', 'Get in touch with the studio.']
};

export function pageMeta(pathname, { store, config }) {
  const settings = getSettings(store);
  const site = 'Artist Studio';
  const absolute = (url) => (url && url.startsWith('/') ? `${config.publicUrl}${url}` : url);
  const base = {
    title: site,
    description: settings.siteDescription,
    image: absolute(store.all('artworks').find((item) => item.featured)?.image || ''),
    url: `${config.publicUrl}${pathname === '/' ? '' : pathname}`,
    type: 'website',
    jsonLd: null
  };

  const match = pathname.match(/^\/(shop|portfolio|journal)\/(\d+)$/);
  if (match) {
    const [, section, id] = match;
    const collection = { shop: 'products', portfolio: 'artworks', journal: 'posts' }[section];
    const item = store.find(collection, id);
    if (!item || (collection === 'posts' && !item.published)) return base;

    const meta = {
      ...base,
      title: `${item.title} · ${site}`,
      description: item.excerpt || item.description,
      image: absolute(item.image),
      type: collection === 'posts' ? 'article' : 'website'
    };
    if (collection === 'products') {
      meta.jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.title,
        description: item.description,
        image: [item.image, ...(item.gallery || [])].map(absolute),
        category: item.category,
        offers: {
          '@type': 'Offer',
          price: item.price.toFixed(2),
          priceCurrency: config.currency.toUpperCase(),
          availability: item.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          url: meta.url
        }
      };
    }
    return meta;
  }

  const page = STATIC_PAGES[pathname];
  if (page) return { ...base, title: `${page[0]} · ${site}`, description: page[1] };
  return base;
}

export function renderIndex(html, meta) {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    `<meta property="og:site_name" content="Artist Studio" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    meta.image && `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    meta.jsonLd && `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
  ].filter(Boolean).join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace('</head>', `    ${tags}\n  </head>`);
}

export function sitemap({ store, config }) {
  const paths = [
    ...Object.keys(STATIC_PAGES),
    ...store.all('products').map((item) => `/shop/${item.id}`),
    ...store.all('artworks').map((item) => `/portfolio/${item.id}`),
    ...store.where('posts', (post) => post.published).map((item) => `/journal/${item.id}`)
  ];
  const urls = paths.map((path) => `  <url><loc>${escapeHtml(config.publicUrl + (path === '/' ? '/' : path))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robots({ config }) {
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /order/',
    'Disallow: /api/',
    `Sitemap: ${config.publicUrl}/sitemap.xml`,
    ''
  ].join('\n');
}
