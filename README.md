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
app/                    ready-to-run copy (start.mjs, bundled server, built store)
Start Store.cmd         Windows launcher · Start Store.command (Mac) · start.sh
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

## Run it (no setup)

1. Download the project (green **Code** button on GitHub, then **Download ZIP**) and unzip it.
2. Start it:
   - **Windows:** double-click **`Start Store.cmd`**
   - **Mac:** double-click **`Start Store.command`** (first time: right-click it and choose **Open**)
   - **Linux:** run `sh start.sh`
3. Your browser opens the store. The window shows the admin link and password.

That's all: there's nothing to install. The launcher uses your Node.js if it is version 20 or newer; otherwise it downloads the official Node.js from nodejs.org into a `.runtime` folder inside the project (one time, about 30 MB; nothing is installed on your computer). If port 5050 is busy it picks the next free one. Keep the window open while you use the store; close it to stop.

On first run it creates `server/.env` with a random admin password. Change `ADMIN_PASSWORD` there if you like, then start again.

If Windows shows "Windows protected your PC", click **More info**, then **Run anyway** (the file is a plain script you can open in Notepad to read).

## Develop

For changing the code (needs Node.js 22.12+ or 20.19+):

```powershell
npm run dev            # installs on first run, starts the API and a live-reloading store
```

Store: http://localhost:5173 · Admin: http://localhost:5173/admin (set `ADMIN_PASSWORD` in `server/.env`).

After changing code, run `npm run package` to rebuild the ready-to-run copy in `app/`, and commit it. CI checks it is up to date.

### If something doesn't start

| You see | Fix |
|---|---|
| "Could not download Node.js" | Check your internet connection, or install the LTS version from https://nodejs.org and start again. |
| "This store needs Node.js 22.12 or newer" (`npm run dev`) | Use the Start Store file instead, or install the LTS version from https://nodejs.org. |
| `running scripts is disabled on this system` (PowerShell) | Use the Start Store file, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| "Could not connect to the store" in the browser | The window running the store was closed. Start it again. |

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

The ready-to-run copy needs only Node.js, so on a server you can simply run:

```sh
node app/start.mjs
```

On a host such as Render or Railway, set `PUBLIC_URL`, `ADMIN_PASSWORD` and `TRUST_PROXY=true` (plus Stripe and email settings if used), and keep `server/data` on a persistent disk (or point `DATA_DIR` at one).
