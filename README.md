# AURORA — clothing store on Cloudflare Pages

A real, fully working store: catalog, cart, favorites, checkout via WhatsApp/Telegram
and an **admin panel where you upload your own products and photos**.

Everything runs on the **Cloudflare free plan** — no servers, no databases to rent,
no monthly fees. One-time 5-minute setup in the Cloudflare dashboard.

---

## What's inside

| Page | URL | What it does |
|---|---|---|
| Home | `/` | Hero, featured products, categories, reviews, FAQ |
| Catalog | `/catalog` | Filters, search, sorting, favorites |
| About | `/about` | Brand story |
| Contact | `/contacts` | Contact form → WhatsApp |
| **Admin** | `/admin` | **Your product management panel** — products, sizes and color variants, each color with its own photos |

Cart, checkout, product photos and the admin panel are powered by
Cloudflare Pages Functions + **KV** (products) + **R2** (photos).

---

## Setup — 10 minutes, one time

### Step 0. Deploy the site to Cloudflare Pages

1. Create a GitHub repository and push this project (see below).
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings: **Build command — empty**, **Output directory — `/`**.
4. Click **Save and Deploy**. Your site is live at `https://<project>.pages.dev`.

### Step 1. Create a KV namespace (stores products)

Dashboard → **Storage & Databases → KV → Create a namespace** → name it `aurora-products`.

### Step 2. Create an R2 bucket (stores photos)

Dashboard → **Storage & Databases → R2 → Create bucket** → name it `aurora-media`.
(The first time, R2 asks you to enable it — free, no card needed.)

### Step 3. Bind them to your Pages project

Dashboard → **Workers & Pages → your project → Settings → Bindings → Add**:

| Type | Variable name | Resource |
|---|---|---|
| KV Namespace | `PRODUCTS` | `aurora-products` |
| R2 Bucket | `MEDIA` | `aurora-media` |

### Step 4. Add admin secrets

Same page → **Settings → Variables and Secrets → Add** (Production **and** Preview):

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | your password for `/admin` |
| `SESSION_SECRET` | any long random string (e.g. from a password manager) |

### Step 5. Redeploy and open the admin

Deployments → **Retry deployment** (bindings apply after redeploy).
Open `https://<your-site>.pages.dev/admin`, sign in and add your products.
The catalog on the site updates **instantly** after you hit Save.

> Until the bindings are configured, the storefront shows sample products
> with a "Demo mode" note — the site never looks broken.

---

## Local development

```bash
cp .dev.vars.example .dev.vars   # then edit ADMIN_PASSWORD
npx wrangler pages dev . --port 8790 --kv PRODUCTS --r2 MEDIA
```

Open `http://localhost:8790` — full site + API with local KV/R2 emulation.

---

## Customizing the store

All storefront settings live at the top of `js/main.js`:

```js
const AURORA_CONFIG = {
  telegram: 'aurora_store',     // your Telegram without @
  whatsapp: '79000000000',      // WhatsApp number, digits only
  freeShippingFrom: 70,         // free shipping threshold
  promoCodes: { AURORA10: 10 }, // promo code -> % off
};
```

Currency symbol — `js/store.js` → `currency: '$'` (change to `€`, `£`, `₽`…).
Categories — `js/store.js` → `categories` (used by both the storefront and the admin).

Everything else (colors, fonts) — CSS variables at the top of `css/base.css`.

---

## Pushing to GitHub

```bash
git remote add origin https://github.com/<your-username>/aurora-store.git
git push -u origin main
```

After that every `git push` redeploys the site automatically.

## Troubleshooting

- **Admin says "Not configured yet"** — bindings or env vars are missing (Steps 1–4), then redeploy.
- **Upload fails** — R2 binding `MEDIA` is missing, or the file is over 5 MB / not an image.
- **Products don't show up** — check that the KV binding variable is named exactly `PRODUCTS` and you redeployed after adding bindings.
- **Changed password?** — just update `ADMIN_PASSWORD` in Variables; old sessions stay valid for max 7 days.

---

© 2026 AURORA — wear the light ✦
