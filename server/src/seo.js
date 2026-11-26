import { findByHandle, isListed } from './catalog.js';
import { getSettings } from './settings.js';

// The storefront renders in the browser, but link previews (WhatsApp,
// Instagram, Pinterest) and search engines read the raw HTML. So when serving
// the built site, the server fills in the title, description and image for
// each product, collection and page.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const firstParagraph = (text) => String(text || '').replace(/^#+\s*/gm, '').split(/\n{2,}/).find(Boolean)?.slice(0, 200) || '';

export function pageMeta(pathname, { store, config }) {
  const settings = getSettings(store, config);
  const absolute = (url) => (url && url.startsWith('/') ? `${config.publicUrl}${url}` : url);
  const products = store.where('products', isListed);
  const base = {
    title: settings.storeName,
    description: settings.seoDescription || settings.tagline,
    image: absolute(products[0]?.images[0] || ''),
    url: `${config.publicUrl}${pathname === '/' ? '' : pathname}`,
    type: 'website',
    jsonLd: null
  };
  const titled = (title) => `${title} · ${settings.storeName}`;

  const [, section, handle] = pathname.match(/^\/(products|collections|pages)\/([a-z0-9-]+)$/) || [];

  if (section === 'products') {
    const product = findByHandle(store, 'products', handle);
    if (!product || !isListed(product)) return base;
    const prices = product.variants.map((variant) => variant.price);
    const inStock = product.variants.some((variant) => variant.stock > 0);
    const meta = {
      ...base,
      title: titled(product.title),
      description: firstParagraph(product.description) || base.description,
      image: absolute(product.images[0]) || base.image,
      type: 'product'
    };
    meta.jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: firstParagraph(product.description),
      image: product.images.map(absolute),
      sku: product.variants[0].sku || undefined,
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        priceCurrency: settings.currency.toUpperCase(),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        url: meta.url
      }
    };
    return meta;
  }

  if (section === 'collections') {
    if (handle === 'all') return { ...base, title: titled('All products') };
    const collection = findByHandle(store, 'collections', handle);
    if (!collection) return base;
    return {
      ...base,
      title: titled(collection.title),
      description: collection.description || base.description,
      image: absolute(collection.image) || base.image
    };
  }

  if (section === 'pages') {
    const page = findByHandle(store, 'pages', handle);
    if (!page || !page.published) return base;
    return { ...base, title: titled(page.title), description: firstParagraph(page.body) || base.description };
  }

  const fixed = { '/cart': 'Cart', '/search': 'Search', '/contact': 'Contact', '/orders/lookup': 'Find your order' };
  return fixed[pathname] ? { ...base, title: titled(fixed[pathname]) } : base;
}

export function renderIndex(html, meta) {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
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
    '/',
    '/collections/all',
    ...store.all('collections').map((item) => `/collections/${item.handle}`),
    ...store.where('products', isListed).map((item) => `/products/${item.handle}`),
    ...store.where('pages', (page) => page.published).map((item) => `/pages/${item.handle}`),
    '/contact'
  ];
  const urls = paths.map((path) => `  <url><loc>${escapeHtml(config.publicUrl + path)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robots({ config }) {
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /orders/',
    'Disallow: /api/',
    `Sitemap: ${config.publicUrl}/sitemap.xml`,
    ''
  ].join('\n');
}
