# Store

A minimal online store with a Shopify-style admin. Sell anything: physical products with sizes, colours or other options, each with its own price, SKU and stock.

## What's included

**Storefront**
- Home page, collection pages, "All products", search
- Filters by product type and availability; sorting by price, date and name (kept in the URL)
- Product pages with a photo gallery and zoom, option pickers (sold-out choices are crossed out), sale prices, low-stock notes and related products
- Slide-out cart, saved in the browser
- Checkout with shipping address, a choice of shipping rates, discount codes, tax and a live total calculated by the server
- Card payments through Stripe Checkout, or take orders and mark them paid yourself
- Order status page, plus "Find your order" by order number and email
- Content pages (About, FAQ, Shipping & returns…), contact form, newsletter sign-up
- Link previews and product data for search engines, sitemap and robots.txt

**Admin (`/admin`)**
- **Home**: sales today / 7 days / 30 days, orders to fulfil, low stock, top products
- **Orders**: filter and search; mark as paid, fulfil with tracking number and link (emails the customer), cancel and restock, private notes
- **Products**: active / draft / archived; up to 3 options (e.g. Size, Colour) generating variants with their own price, compare-at price, SKU and stock; multiple photos (upload or URL, reorder); type, vendor, tags, collections, URL handle; duplicate
- **Collections**: hand-picked products in your chosen order
- **Customers**: built from orders, with total spent; CSV export
- **Discounts**: percentage, fixed amount or free shipping; minimum order, usage limit, end date
- **Pages**, **Messages**, **Subscribers** (CSV export with unsubscribe links)
- **Settings**: store name, tagline, announcement bar, featured collection, currency, tax rate, shipping rates (with free-shipping thresholds), social links

**Emails** (once SMTP is set up): new orders and messages to you; order confirmation and shipping confirmation to customers.

## Structure

```
client/                 React 18 + React Router 7 + Vite; Geist typeface
  src/styles.css        the whole design (colours and sizes are tokens at the top)
  src/pages/            storefront pages
  src/components/       header, footer, product card, gallery, cart drawer…
  src/state/            store data, cart, and pure helpers with tests
  src/admin/            the admin (loaded only when /admin is opened)
server/                 Express 5 API
  src/routes/public.js  storefront API
  src/routes/admin.js   admin API (login required)
  src/orders.js         prices, shipping, tax, discounts, stock
  src/validate.js       input rules for every form, products and variants
  src/seo.js            link previews, sitemap, robots.txt
  src/store.js          JSON-file database (server/data/shop.json)
  src/seed.js           sample products written on first run
  test/                 API tests
```

## Run locally

Requires **Node.js 22.12 or newer** (20.19+ also works). Check with `node -v`; get the "LTS" version from https://nodejs.org.

```powershell
npm run dev
```

That one command installs everything on the first run, creates `server/.env`, and starts the store. Open:

- Store: http://localhost:5173
- Admin: http://localhost:5173/admin (set `ADMIN_PASSWORD` in `server/.env` first, then run `npm run dev` again)

Press **Ctrl+C** to stop. The first run creates a few sample products, collections and pages; edit or delete them in the admin.

You can also start the two parts separately with `npm run dev:server` and `npm run dev:client`.

### If it doesn't start

| You see | Fix |
|---|---|
| `This store needs Node.js 22.12 or newer` | Install the LTS version from https://nodejs.org, then close and reopen VS Code. |
| `npm` or `node` "is not recognized" | Install Node.js, then close and reopen VS Code (restart the computer if it persists). |
| `running scripts is disabled on this system` (PowerShell) | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, and try again. |
| `Port 5050 is already in use` | The store is already running in another terminal. Close it (or restart VS Code). |
| The page says "Could not connect to the store" | The API part isn't running. Use `npm run dev`, which starts both parts. |
| `Missing script: "dev"` | You're on an old version of the code. Switch to the latest branch and run `git pull`. |

## Configuration

`server/.env` (see `server/.env.example`):

| Setting | What it does |
|---|---|
| `ADMIN_PASSWORD` | Turns on the admin. Without it the admin stays disabled. |
| `STRIPE_SECRET_KEY` | Card payments through Stripe Checkout. Without it, orders are placed unpaid and you mark them paid in the admin. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL`, `FROM_EMAIL` | Emails to you and to customers. Without them, everything is still visible in the admin. |
| `PUBLIC_URL` | The store's public address, used in emails, Stripe return links and link previews. |
| `CURRENCY` | Starting currency; change it later in Admin > Settings. |

Everything else (store name, shipping rates, tax, announcement, social links) is set in **Admin > Settings**.

## Your data

All store data is saved in `server/data/shop.json`, and uploaded photos in `server/data/uploads/`. The folder isn't committed to git because it contains customer details, so **back it up**. Delete `shop.json` to start again from the sample data.

## Tests and checks

```powershell
npm test               # API tests + storefront and admin logic tests
npm run lint
```

GitHub Actions runs tests, lint and a production build on every push.

## Deploying

The server also serves the built store, so one Node process runs everything:

```powershell
npm run setup
npm run build
npm start
```

On a host such as Render or Railway, set `PUBLIC_URL`, `ADMIN_PASSWORD` and `TRUST_PROXY=true` (plus Stripe and email settings if used), and keep `server/data` on a persistent disk (or point `DATA_DIR` at one).
