# Artist Studio

A portfolio and shop website for an artist working in fabric painting, crochet, and other handmade fiber art.

- **Portfolio** with category filters and a comment thread on each piece
- **Shop** with stock tracking, a cart that survives page reloads, and checkout
- **Payments** through Stripe Checkout, or take orders and invoice buyers yourself
- **Contact form** that saves messages and can email them to you
- **Admin page** (`/admin`) to add, edit and remove artworks and products, upload photos, and manage orders, messages and comments

## Structure

```
client/   React 18 + React Router 7, built with Vite
  src/api.js            every call to the backend
  src/state/            site data, cart (saved in localStorage) and cart helpers
  src/pages/            one file per page; pages/admin/ is the admin area
  src/components/       layout, cards and status messages
server/   Express 5 API
  src/app.js            builds the app (routes, uploads, serving the built client)
  src/routes/           public.js (site) and admin.js (password protected)
  src/store.js          JSON-file database, saved to server/data/db.json
  src/seed.js           starter content written on first run
  src/payments.js       Stripe Checkout (optional)
  src/mailer.js         email notifications (optional)
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
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL` | Emails to you for new messages and orders. Without them, everything is still saved and visible in `/admin`. |
| `PUBLIC_URL` | The site's public address, used for Stripe's return links. |

## Your data

Artworks, products, comments, messages and orders are saved in `server/data/db.json`, and uploaded photos in `server/data/uploads/`. This folder is not committed to git because it contains customer details, so **back it up**. Delete `db.json` to reset to the starter content.

## Tests and checks

```powershell
npm test               # server API tests + client cart tests
npm run lint           # ESLint for the client
```

GitHub Actions runs tests, lint and a production build on every push (`.github/workflows/ci.yml`).

## Deploying

The Express server can serve the built site itself, so you only need one Node process:

```powershell
npm run setup
npm run build          # builds client/dist
npm start              # serves the site and the API on PORT
```

On a host such as Render or Railway, set `PUBLIC_URL`, `ADMIN_PASSWORD`, `TRUST_PROXY=true`, and Stripe and email settings if you use them. Make sure `server/data` is on a persistent disk, or set `DATA_DIR` to one.
