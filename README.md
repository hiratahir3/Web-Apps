# Lumière by Yasra — Full-Stack

Luxury candle house with public storefront, customer accounts, full checkout (COD + Stripe), and an admin dashboard.

## Architecture

```
Frontend (public/)  ─┐
                     ├─►  Express API (server.js + routes/)  ─►  SQLite (data/lumiere.sqlite)
Admin Dashboard     ─┘                          │
                                                ├─►  Stripe Checkout (optional)
                                                └─►  WhatsApp via Twilio (optional)
```

## Quick start

```bash
cd Web-Apps
npm install
cp .env.example .env       # then edit secrets
npm run seed               # creates products + bootstrap admin
npm start                  # → http://localhost:3000
```

The seed script prints the admin email/password (defaults: `yasra@lumiere.local` / `ChangeMe!2026`).

## Routes

### Public pages
- `/` — homepage, hero, collection, about, gifting, contact
- `/account.html` — customer sign-up / sign-in / order history / profile
- `/checkout.html` — full checkout (delivery + payment)
- `/order-success.html?id=N` — confirmation
- `/admin.html` — admin dashboard (protected)

### API
| Method | Path | Notes |
|---|---|---|
| GET | `/api/products` | List active products |
| GET | `/api/products/:idOrSlug` | One product |
| POST | `/api/auth/signup` | Create customer account |
| POST | `/api/auth/login` | Customer sign-in |
| POST | `/api/auth/admin/login` | Admin sign-in |
| GET | `/api/auth/me` | Current session |
| PUT | `/api/auth/me` | Update profile |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/orders` | Place order (guest or signed-in) |
| GET | `/api/orders/me` | Authenticated user's orders |
| GET | `/api/orders/:id` | Single order |
| POST | `/api/contacts` | Send a contact message |
| GET | `/api/admin/summary` | Dashboard stats |
| GET/POST/PUT/DELETE | `/api/admin/products[...]` | Manage products |
| GET/PATCH | `/api/admin/orders[...]` | Manage orders |
| GET/PATCH/DELETE | `/api/admin/contacts[...]` | Inbox |
| POST | `/api/stripe/webhook` | Stripe → mark paid |

## Database

SQLite via `better-sqlite3`, file at `data/lumiere.sqlite`. Tables match the architecture diagram:

- **products** — `id, slug, name, note, description, price, image, badge, card_class, glow_class, stock, active`
- **users** — customer accounts
- **admins** — admin accounts (bootstrap one via seed)
- **orders** — `customer_*, address, city, subtotal, shipping, total, status, payment_method, payment_status`
- **order_items** — line snapshots
- **contacts** — homepage contact form

## Payments

- **COD** is always enabled.
- **Stripe** activates automatically when `STRIPE_SECRET_KEY` is set in `.env`. Orders create a Stripe Checkout session and redirect; the webhook flips `payment_status='paid'` and `status='confirmed'`.
- Webhook endpoint: `POST /api/stripe/webhook` — point Stripe CLI / dashboard at it.

## WhatsApp notifications (optional)

If `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `OWNER_WHATSAPP` are all set, every new order pings the owner. Otherwise, falls back to console logs.

## Deploying

Designed for **Railway** or **Render** free tier. Procfile-free — just set `start: node server.js`. Persistent disk needed for `data/`. Set env vars in dashboard.

To go live: buy domain → point DNS at host → set `PUBLIC_URL` and Stripe keys → done.

## Project layout

```
Web-Apps/
├── server.js
├── package.json
├── .env.example
├── db/
│   ├── index.js          # schema + connection
│   └── seed.js           # seed products + bootstrap admin
├── middleware/
│   ├── auth.js           # JWT cookie + role guards
│   └── notify.js         # WhatsApp helper
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   ├── admin.js
│   ├── contacts.js
│   └── stripeWebhook.js
└── public/
    ├── index.html        # storefront
    ├── account.html      # user portal
    ├── checkout.html
    ├── order-success.html
    ├── admin.html        # admin portal
    ├── 404.html
    ├── styles.css
    ├── app.js            # cart + auth helpers
    └── images/
```
