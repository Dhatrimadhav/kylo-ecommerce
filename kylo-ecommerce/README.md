# KYLO — Fashion E-Commerce Platform

A full-stack, production-oriented e-commerce platform for the KYLO clothing brand.
Next.js 14 (App Router) + TypeScript + Tailwind CSS, PostgreSQL via Prisma, NextAuth
credentials auth, and Razorpay for Indian payments (UPI / cards / net banking /
wallets), with Cash on Delivery support and a role-gated admin panel.

> **Scope note.** This repository is a complete, working core: catalog, search &
> filters, cart, wishlist, addresses, coupons, checkout (Razorpay + COD),
> server-verified payments, transactional inventory, order tracking, reviews, and
> an admin dashboard/products/orders panel — all backed by real APIs and a real
> database, not mocked data. A few things are deliberately left as clearly marked
> stubs for you to wire up to your own accounts: outbound email (AWS SES), S3
> image upload from the admin UI (the API already accepts image URLs — you can
> point them at any bucket/CDN today), and a richer "Add Product" admin form (the
> `POST /api/admin/products` API is complete; the UI currently expects you to call
> it directly or extend `src/app/admin/products/page.tsx`).

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (`src/app/api/**`) |
| Database | PostgreSQL, via Prisma ORM |
| Auth | NextAuth (credentials provider, JWT sessions, role field) |
| Payments | Razorpay Orders API + HMAC signature verification + webhook |
| Storage (prod) | AWS S3 for product images |
| Email (prod) | AWS SES (stubbed in `src/lib/email.ts`) |
| Deployment | Docker image; AWS ECS Fargate + RDS + S3 + CloudFront, or Vercel |

## 2. Project structure

```
kylo-ecommerce/
  prisma/
    schema.prisma        # users, addresses, products, variants, cart, orders, coupons, reviews...
    seed.ts               # sample KYLO products, admin + test customer, KYLO10 coupon
  src/
    app/
      (shop)/              # customer shop routes: /shop /product/[slug] /cart /checkout /wishlist
      (auth)/               # /login /register /forgot-password
      account/              # /account/orders /account/addresses
      admin/                # /admin/login /admin/dashboard /admin/products /admin/orders
      api/                  # every REST endpoint (see section 6)
      about, contact, privacy-policy, terms, shipping-policy, return-policy, faq
      sitemap.ts, robots.ts
    components/            # Header, Footer, ProductCard, ProductBuyBox, ShopFilters, etc.
    lib/                    # prisma client, auth config, razorpay client, pricing engine,
                             # create-order transaction, email stub, admin guard
    middleware.ts           # protects /admin/* and /account/*
  Dockerfile
  docker-compose.yml        # local Postgres + app
  .env.example
```

## 3. Local development

**Prerequisites:** Node.js 20+, Docker (for local Postgres) or your own PostgreSQL instance, a free [Razorpay test account](https://dashboard.razorpay.com/signup).

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars and fill them in (see section 5)
cp .env.example .env

# 3. Start a local Postgres (or point DATABASE_URL at your own)
docker compose up -d db

# 4. Generate the Prisma client, create tables, and seed sample data
npx prisma generate
npx prisma db push
npm run db:seed

# 5. Run the dev server
npm run dev
```

Visit **http://localhost:3000**.

- Customer test login: `customer@kylo.in` / `Customer123!`
- Admin login (**http://localhost:3000/admin/login**): `admin@kylo.in` / `ChangeMe123!`
  (both are set via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` — change them before seeding)
- Test coupon: `KYLO10` (10% off, capped at ₹500, minimum order ₹999)
- Razorpay test cards / UPI: use Razorpay's [test mode credentials](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
  while `RAZORPAY_KEY_ID` is a `rzp_test_...` key — no real money moves.

## 4. Testing the core flow end-to-end

1. Register a new customer account (or use the seeded one).
2. Browse `/shop`, filter by size/colour/category, open a product.
3. Select a size + colour, **Add to Bag**, then **Buy Now**.
4. On `/checkout`, add a delivery address, optionally apply `KYLO10`.
5. Pick **Razorpay** and pay with a Razorpay test card, or pick **Cash on Delivery**.
6. You land on the confirmation page; check `/account/orders` — the order and its
   tracking bar appear, and (for Razorpay) the payment was verified server-side
   before the order or stock changed at all.
7. Log into `/admin/login` with the admin account: the dashboard shows the sale,
   `/admin/orders` lets you advance its status (Confirmed → Packed → Shipped →
   Delivered), and `/admin/products` shows the stock that was just decremented.
8. Back as the customer, once the order shows `DELIVERED` you can leave a review
   on that product (reviews are gated to verified purchasers, enforced server-side).

## 5. Environment variables

See `.env.example` for the full list. The ones you must set before anything works:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app's public URL (`http://localhost:3000` locally) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` — exposed to the browser (public key only, never the secret) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used once, by `npm run db:seed`, to create the admin account |

AWS variables (`AWS_S3_BUCKET`, `SES_FROM_EMAIL`, etc.) are only needed once you
wire up real image upload / email — see `DEPLOYMENT.md`.

## 6. API reference (summary)

All bodies are JSON. Admin routes require a signed-in session with `role: ADMIN`.

```
POST   /api/auth/register
POST   /api/auth/[...nextauth]        # NextAuth sign-in/out, handled by the library

GET    /api/products                  # ?category=&size=&color=&minPrice=&maxPrice=&q=&sort=&page=
GET    /api/products/:slug

GET    /api/cart                      POST /api/cart                 {productId, variantId, quantity}
PUT    /api/cart/:id  {quantity}      DELETE /api/cart/:id

GET    /api/wishlist                  POST /api/wishlist {productId}   DELETE /api/wishlist {productId}

GET    /api/addresses                 POST /api/addresses {fullName, mobile, houseNo, street, area, city, state, pincode, landmark?, isDefault?}
DELETE /api/addresses/:id

POST   /api/coupons/apply {code}

POST   /api/payments/create  {addressId, couponCode?, paymentMethod: 'RAZORPAY'|'COD'}
POST   /api/payments/verify  {addressId, couponCode?, razorpay_order_id, razorpay_payment_id, razorpay_signature}
POST   /api/payments/webhook                 # Razorpay server callback (configure in Razorpay dashboard)

GET    /api/orders                    POST /api/orders {addressId, couponCode?, paymentMethod: 'COD'}
GET    /api/orders/:id

POST   /api/reviews {productId, rating, comment?, imageUrl?}   # only for verified purchasers

GET    /api/admin/stats
GET    /api/admin/products            POST /api/admin/products {..., variants:[{size,color,stock}], images:[{url}]}
PUT    /api/admin/products/:id        DELETE /api/admin/products/:id     PATCH /api/admin/products/:id {variantId, stock}
GET    /api/admin/orders              PATCH /api/admin/orders/:id {status?, paymentStatus?}
GET/POST /api/admin/categories
```

## 7. Security notes (already implemented)

- Passwords hashed with bcrypt (12 rounds); sessions are signed JWTs via NextAuth.
- Razorpay payments are **never** trusted from the client: `/api/payments/verify`
  recomputes the HMAC-SHA256 signature server-side against `RAZORPAY_KEY_SECRET`
  before an order is created or stock is touched. A webhook endpoint is included
  as the authoritative fallback for dropped connections.
- Order creation, stock decrement, and coupon usage increment happen inside a
  single Prisma `$transaction`, so two shoppers racing for the last unit of a
  size/colour can't oversell it.
- Every admin API route calls `requireAdmin()`; `middleware.ts` also blocks
  `/admin/*` and `/account/*` pages at the edge for signed-out / non-admin users.
- All input is validated with `zod` before touching the database.
- Pricing (subtotal, coupon discount, shipping, GST) is always recomputed
  server-side in `src/lib/pricing.ts` — the client only ever displays numbers the
  server already agreed to.

## 8. What to build next

- Admin "Add / Edit Product" form with image upload to S3 (the API is ready — see
  `POST /api/admin/products`).
- Wire `src/lib/email.ts` to AWS SES for order-confirmation / shipping emails.
- Wire `/forgot-password` to a real reset-token flow (currently a UI stub).
- Add automated tests (this repo does not include a test suite).
- Add a real logo/favicon (placeholder text-based wordmark is used today).

See `DEPLOYMENT.md` for how to take this to production on AWS.

