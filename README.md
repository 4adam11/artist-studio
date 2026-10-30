# Artist Studio

A portfolio and online shop for an artist working in fabric painting, crochet, and other handmade fiber art.

## Features

**Shopping**
- Shop with search, category filters, sorting and an "in stock only" toggle (filters are kept in the URL, so they can be shared)
- Product pages with a photo gallery and full-screen zoom, materials, size, care, shipping details, related pieces and a share button
- "One of a kind" / "Only 2 left" / "Sold out" badges; sold-out pieces offer **"Email me when it's back"**
- Slide-out cart with a **free-shipping progress bar**; cart is saved in the browser
- **Saved items** (heart button), no account needed
- Checkout with shipping address, **discount codes**, flat-rate shipping and free shipping over a set amount; the server calculates every total
- Card payments with **Stripe Checkout**, or take orders and invoice buyers yourself
- Order page with progress steps and tracking number
- **Reviews** with star ratings, held for approval, and marked "Verified buyer" when the email matches a purchase

**The studio**
- Portfolio with comments and a "Commission something similar" button
- **Commission requests** with budget, deadline and up to 3 inspiration photos
- **Journal** (blog) and **Events** (markets, exhibitions)
- **Newsletter** sign-up (footer, home page, after an order) with unsubscribe links
- About, FAQ, Shipping & returns and Contact pages, plus site-wide search

**Emails** (when SMTP is set up)
- To you: new orders, messages and commission requests
- To customers: order confirmation, "your order has shipped" with tracking, commission received, back in stock

**Admin page (`/admin`)**
- Overview: sales this month, orders to ship, new requests, reviews to approve, low stock
- Manage shop products, portfolio, journal, events and discount codes, with photo uploads
- Orders: change status, add a tracking number and email the buyer in one click
- Commissions: track status (new, quoted, in progress…) and keep private notes
- Approve reviews, read messages, moderate comments
- Subscribers: download the list as CSV (with unsubscribe links) and see who is waiting for a restock
- Settings: shipping prices, announcement bar, site description, social links

**Found online**
- Each product, artwork and journal post has its own title, description and image for link previews (WhatsApp, Instagram, Pinterest…), plus product data for Google, a sitemap and robots.txt

## Structure

```
client/   React 18 + React Router 7, built with Vite
  src/api.js            every call to the backend
  src/state/            site data, cart, saved items, and pure helpers (cart, catalogue)
  src/pages/            one file per page; pages/admin/ is the admin area
  src/components/       layout, header/footer, cards, gallery, cart drawer…
server/   Express 5 API
  src/app.js            builds the app (routes, uploads, serving the built client)
  src/routes/           public.js (site) and admin.js (login required)
  src/orders.js         prices, shipping, discounts, stock
  src/seo.js            link previews, sitemap, robots.txt
  src/store.js          JSON-file database, saved to server/data/db.json
  src/seed.js           starter content written on first run
  src/payments.js       Stripe Checkout (optional)
  src/mailer.js         emails (optional)
  test/                 API tests (node --test)
```

## Run locally

Requires **Node.js 22.9 or newer**.

```powershell
npm run setup          # installs server and client dependencies
```

Then start each part in its own terminal:

```powershell
npm run dev:server     # API on http://localhost:5050
npm run dev:client     # site on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server forwards `/api` and `/uploads` to the API, so the browser only uses one address.

If port 5050 is taken, set `PORT` in `server/.env` and start the client with `API_TARGET=http://localhost:<port>` set in the environment.

## Configuration

Copy `server/.env.example` to `server/.env`. Every setting is optional:

| Setting | What it turns on |
|---|---|
| `ADMIN_PASSWORD` | The `/admin` page. Without it the admin area stays disabled. |
| `STRIPE_SECRET_KEY` | Card payments through Stripe Checkout. Without it, checkout takes the order and you email the buyer to arrange payment. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL`, `FROM_EMAIL` | Emails to you and to customers. Without them, everything is still saved and visible in `/admin`. |
| `PUBLIC_URL` | The site's public address, used in emails, Stripe return links and link previews. |
| `CURRENCY` | Shop currency, e.g. `usd`, `eur`, `gbp`, `inr`. |

Shipping prices, the announcement bar and social links are changed on the admin **Settings** page.

## Your data

Everything (artworks, products, orders, messages, reviews, subscribers…) is saved in `server/data/db.json`, and uploaded photos in `server/data/uploads/`. This folder is not committed to git because it contains customer details, so **back it up**. Delete `db.json` to reset to the starter content.

## Tests and checks

```powershell
npm test               # server API tests + client tests
npm run lint           # ESLint for the client
```

GitHub Actions runs tests, lint and a production build on every push (`.github/workflows/ci.yml`).

## Deploying

The Express server serves the built site itself, so you only need one Node process:

```powershell
npm run setup
npm run build          # builds client/dist
npm start              # serves the site and the API on PORT
```

On a host such as Render or Railway, set `PUBLIC_URL`, `ADMIN_PASSWORD`, `TRUST_PROXY=true`, and Stripe and email settings if you use them. Make sure `server/data` is on a persistent disk, or set `DATA_DIR` to one.
