# NIRVA — local shops, delivered

A working prototype: customers browse and search live stock across nearby shops,
buy for delivery or book for pickup, track orders, and leave reviews with
photos/videos. Suppliers manage their own listings and stock status. Admins have
full control over products, suppliers, customers, and orders.

Frontend is plain HTML/CSS/JS (no build step) — deploys straight to GitHub Pages
or Vercel. Backend is Supabase (Postgres + Auth + Storage + Realtime).

## One-time backend setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) — see
   the step-by-step in this project's chat history, or Supabase's own quickstart.
2. **Run the schema**: open Supabase → SQL Editor → New query → paste in the
   entire contents of `supabase-schema.sql` → Run. This creates every table,
   security policy, and the storage bucket for review photos/videos.
   (This `.sql` file is a one-time setup script — it never gets deployed as
   part of the website itself.)
3. **Get your credentials**: Supabase → Project Settings → API → copy the
   **Project URL** and **anon public** key.
4. **Paste them into `js/data.js`**, right near the top:
   ```js
   const SUPABASE_URL = "https://xxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key-here";
   ```
5. Deploy the whole folder to GitHub Pages or Vercel as normal — see below.

## Pages

| File | What it does |
|---|---|
| `index.html` | Homepage — search, category filter, sort, product grid (live from Supabase) |
| `product.html` | Product detail — buy now (delivery), book (pickup), reviews with real photo/video upload |
| `cart.html` | Cart (kept in the browser — no need to save an in-progress cart to the database) |
| `checkout.html` | Delivery address form, or pickup/booking confirmation — creates a real order |
| `track.html` | Live order tracking — updates automatically via Supabase Realtime when a supplier/admin changes the order status |
| `login.html` | Real Customer / Supplier / Admin accounts via Supabase Auth |
| `supplier-dashboard.html` | A shop owner's own products — add, edit, delete, mark available/sold out/unavailable, see their orders |
| `admin-dashboard.html` | Full control panel — all products, shops, customers, and order statuses |

## Deploying

**Vercel**: Add New Project → import your GitHub repo → Framework preset "Other" →
leave Build Command / Output Directory blank → Deploy.

**GitHub Pages**: repo Settings → Pages → Source: "Deploy from a branch",
branch `main`, folder `/ (root)`.

Either way, once deployed, go back to Supabase → Authentication → URL
Configuration and add your live URL (e.g. `https://nirva.vercel.app`) as an
allowed redirect URL.

## Making the first admin account

There's no public admin signup — that's intentional. After you've created your
Supabase project:
1. Sign up once through `login.html` using the **Customer** tab (any email/password).
2. In Supabase → Table Editor → `profiles`, find that row and change its
   `role` column from `customer` to `admin`.
3. Log in again through the **Admin** tab with the same email/password.

## Known simplifications (next steps, not blockers)

- **Distance/location**: shop distance (km) isn't calculated yet — the map on
  product/checkout pages is a visual placeholder, not real GPS. Next step:
  add `lat`/`lng` capture on signup and use the browser's geolocation +
  a real maps API (Google Maps or Mapbox) for actual distance and routing.
- **Live rider GPS**: `track.html` moves a marker based on order *status*
  (placed → packed → out for delivery → delivered), not a real rider's live
  location. Real GPS tracking needs a rider-facing app or page sending
  coordinates into the `orders` table (`rider_lat`/`rider_lng` columns are
  already there, ready for this).
- **Payments**: checkout records the order but doesn't charge anyone yet.
  For India, Razorpay is the standard next step for the "Buy now" flow;
  "Book for pickup" can reasonably stay pay-at-shop.
- **Deleting a supplier/customer's login itself** (not just their shop or
  data) needs Supabase's privileged service-role key, which should never sit
  in frontend code — that needs a small server function (a Supabase Edge
  Function) rather than a button on this static site.
