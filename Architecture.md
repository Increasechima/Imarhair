# Imarhair — Architecture

This is the technical design for the store described in [prd.md](prd.md). If the code and this document disagree, update one of them in the same change.

---

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict)** | Server Components keep client JS small, which matters on Nigerian mobile networks. Server Actions and Route Handlers keep secrets on the server. Built-in image optimisation, metadata and sitemap support. |
| Styling | **Tailwind CSS v4** with design tokens from [Style.md](Style.md) | Tokens are in one place and nothing unused ships |
| UI primitives | **Radix UI** (Dialog, Popover, Accordion) + own components | Accessible behaviour without imposing a visual style |
| Icons | **lucide-react** | Thin-stroke, tree-shakeable |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, pg_cron) | Required by the brief. RLS gives database-level security. |
| Supabase client | **@supabase/ssr** | Cookie-based sessions shared by server and client |
| Validation | **Zod** | One schema shared by forms and server |
| Forms | **react-hook-form** + Zod resolver | Only on checkout, auth and admin forms |
| Client state | React context + `useSyncExternalStore` for cart/wishlist | No global state library needed |
| Payments | **Paystack** (default) behind a `PaymentProvider` interface | Nigerian methods: card, bank transfer, USSD. Swappable. |
| Email | **Mailgun** (HTTP API for transactional mail, SMTP for Supabase Auth mail) with plain TypeScript HTML/text templates | Required by the brief. No template dependency; table-based inline HTML is what email clients need anyway |
| Hosting | **Vercel** (app) + **Supabase Cloud** (data) | Zero-ops, edge CDN, preview deploys |
| Tests | **Vitest** (unit), **Playwright** (E2E), **pgTAP** (RLS/SQL) | |
| Package manager | **pnpm** | |

## 2. High-level diagram

```
                ┌──────────────────────── Browser ───────────────────────┐
                │ RSC pages · small client islands (cart, gallery, forms)│
                │ Guest cart/wishlist in localStorage                     │
                └───────────────┬─────────────────────────────┬──────────┘
                                │ HTTPS                       │ redirect to pay
                ┌───────────────▼─────────────┐      ┌────────▼─────────┐
                │      Next.js on Vercel      │      │  Paystack        │
                │  Server Components (reads)  │◄─────┤  hosted checkout │
                │  Server Actions (mutations) │ webhook (HMAC signed)   │
                │  Route Handlers (webhooks,  │─────►│  Verify API      │
                │   payment callback, OG)     │      └──────────────────┘
                │  proxy.ts (session refresh, │
                │   coarse route protection)  │      ┌──────────────────┐
                └───┬───────────────┬─────────┘─────►│  Mailgun         │
                    │ anon/user JWT │ service role   └──────────────────┘
                ┌───▼───────────────▼─────────┐
                │          Supabase           │
                │ Postgres + RLS · Auth ·     │
                │ Storage (product images) ·  │
                │ pg_cron (expire reservations)│
                └─────────────────────────────┘
```

**Trust boundaries:**
- The browser is untrusted.
- Server code that uses the **user's session** is limited by RLS.
- A small set of server-only modules use the **service-role** key (payments, webhooks, emails, admin mutations, order creation). They live under `src/server/privileged/`. A lint rule and the `server-only` import stop them from being imported into client code.

## 3. Repository layout

```
.
├─ prd.md · Taste.md · Style.md · Architecture.md · AGENTS.md · README.md
├─ public/brand/                    # logo, monogram, favicon sources
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                   # SQL migrations (schema, RLS, functions)
│  ├─ seed.sql                      # dev products, collections, delivery rates
│  └─ tests/                        # pgTAP RLS tests
├─ supabase/assets/catalog/         # dev product photos (uploaded by pnpm dev:catalog-images)
├─ src/
│  ├─ app/
│  │  ├─ (store)/                   # storefront layout: header + footer
│  │  │  ├─ page.tsx                # Home
│  │  │  ├─ shop/page.tsx
│  │  │  ├─ shop/[slug]/page.tsx    # PDP
│  │  │  ├─ collections/page.tsx
│  │  │  ├─ collections/[slug]/page.tsx
│  │  │  ├─ search/page.tsx
│  │  │  ├─ cart/page.tsx
│  │  │  ├─ checkout/page.tsx
│  │  │  ├─ checkout/callback/route.ts          # provider redirect → verify
│  │  │  ├─ checkout/confirmation/[orderNumber]/page.tsx
│  │  │  ├─ wishlist/page.tsx       # guest wishlist
│  │  │  ├─ (content)/about|contact|faq|shipping|returns|privacy|terms/
│  │  │  └─ account/                # protected
│  │  │     ├─ page.tsx · orders/ · orders/[orderNumber]/ · wishlist/ · addresses/ · settings/
│  │  ├─ (auth)/login · signup · forgot-password · reset-password
│  │  ├─ auth/callback/route.ts     # OAuth + email-link code exchange
│  │  ├─ admin/                     # protected, admin role
│  │  │  ├─ page.tsx · products/ · orders/ · customers/ · inventory/ · reviews/ · discounts/
│  │  ├─ api/webhooks/paystack/route.ts
│  │  ├─ sitemap.ts · robots.ts · not-found.tsx · error.tsx
│  │  └─ globals.css                # tokens (Style.md)
│  ├─ components/
│  │  ├─ ui/                        # Button, Input, Select, Chip, Drawer, Sheet, Toast, Skeleton…
│  │  ├─ layout/                    # Header, MobileMenu, Footer, AnnouncementBar
│  │  ├─ product/                   # ProductCard, ProductGrid, Gallery, VariantPicker, QuickAdd
│  │  ├─ cart/                      # CartProvider, CartDrawer, CartLine
│  │  ├─ checkout/                  # CheckoutForm, AddressFields, DeliveryMethods, OrderSummary
│  │  └─ admin/
│  ├─ lib/
│  │  ├─ supabase/{browser,server,proxy}.ts
│  │  ├─ money.ts                   # kobo ⇄ display, formatNaira()
│  │  ├─ ng-states.ts               # 36 states + FCT
│  │  ├─ validation/                # Zod schemas (address, checkout, product…)
│  │  ├─ seo.ts                     # metadata + JSON-LD helpers
│  │  ├─ env.ts                     # public env access (server secrets: src/server/env.ts)
│  │  ├─ site.ts                    # brand constants, nav
│  │  └─ utils.ts                   # cn(), safeNextPath()
│  ├─ server/
│  │  ├─ queries/                   # read helpers used by RSC (user-scoped client)
│  │  ├─ actions/                   # 'use server' actions (cart, wishlist, checkout, account)
│  │  └─ privileged/                # service-role only: payments, orders, email, admin
│  │     ├─ supabase-admin.ts
│  │     ├─ payments/{provider.ts, paystack.ts, index.ts}
│  │     ├─ orders.ts               # createPendingOrder, confirmPayment
│  │     └─ email/{mailgun.ts, send.ts}
│  └─ proxy.ts                      # Next 16 name for middleware
└─ tests/e2e/                       # Playwright
```

## 4. Rendering and caching

| Route | Strategy |
|---|---|
| Home, Collections index, PDP (`generateStaticParams`), content pages | **Static + ISR** (`revalidate = 300`). Every catalogue read carries the `catalog` cache tag, so admin saves can call `revalidateTag("catalog", "max")` |
| Shop, Collection, Search | Dynamic RSC (reads `searchParams`). Their catalogue fetches still come from the tagged data cache |
| Stock and price on PDP | Rendered at ISR time, so they can be up to 5 minutes stale. That's acceptable because stock and price are **re-checked on the server when adding to the bag and at checkout** (M3). The quick-add picker fetches fresh options through a server action |
| Cart, Checkout, Account, Admin | Dynamic, `no-store`, behind auth where relevant |

- Admin mutations call `revalidateTag(tag, "max")` (Next 16 requires the second argument), or `updateTag(tag)` when the admin must see the change immediately.
- **Images:** `next/image` with Supabase Storage as a remote pattern. The hero uses `priority`. Everything below the fold is lazy. Formats are AVIF/WebP. Real `sizes` attributes are required.
- **Catalogue client:** public reads go through `catalogClient()` (`src/lib/supabase/catalog.ts`). It uses the anon key with no cookies and a custom `fetch` adding `{ next: { revalidate: 300, tags: ["catalog"] } }`. Because it never reads the visitor's session, product pages can be prerendered. RLS still limits it to published data. Session-dependent reads (account, wishlist, admin) use the cookie-based server client.
- **Route groups for loading states:** `/shop`'s skeleton lives in `shop/(listing)/loading.tsx`. If it sat in `shop/`, it would also wrap `/shop/[slug]`, and streaming would start before `notFound()` ran, turning real 404s into status-200 "soft 404s".
- **Client islands:** StoreProviders (toast, bag, wishlist), header bag count, gallery, purchase panel, quick-add, filters/sort, forms. Everything else is a Server Component.
- **Auth state on the client:** sign-in and sign-out run in server actions, so the browser Supabase client gets no auth event. Providers that care (wishlist now, bag in M3) re-read the session cookie on every route change and run the guest → account merge on the signed-out → signed-in edge.

## 5. Data model

All tables live in `public`. Money is stored as `bigint` in **kobo**. Timestamps are `timestamptz` with default `now()`. Every table has `id uuid primary key default gen_random_uuid()` unless stated otherwise. Every table has RLS **enabled**.

### 5.1 Entity overview

```
auth.users 1─1 profiles
profiles 1─1 carts 1─* cart_items *─1 product_variants
profiles 1─1 wishlists 1─* wishlist_items *─1 products
profiles 1─* addresses
profiles 1─* orders 1─* order_items
                  orders 1─* payments
                  orders 1─* order_status_history
categories 1─* products *─1 collections
products 1─* product_variants 1─1 inventory
products 1─* product_images
products 1─* reviews
```

### 5.2 Tables

**profiles** — `id uuid pk references auth.users on delete cascade`, `full_name text`, `phone text`, `role text check (role in ('customer','admin')) default 'customer'`, `marketing_opt_in bool default false`, `created_at`, `updated_at`. Created by a trigger on `auth.users` insert.

**categories** — `name`, `slug unique`, `kind text check (kind in ('wig','bundle','haircare'))`, `sort_order int`.
*`kind` decides which product card variant is used.*

**collections** — `name`, `slug unique`, `description`, `hero_image_path`, `status text check (status in ('active','coming_soon','hidden'))`, `sort_order`.
*Seed: Imar Classic, Imar Prime, Bundles (active), Haircare (coming_soon).*

**products** — `name`, `slug unique`, `description text`, `details jsonb` (structured attributes for the accordion), `care text`, `category_id fk`, `collection_id fk`, `base_price bigint`, `compare_at_price bigint null` (original price when on sale), `is_published bool default false`, `is_featured bool`, `is_best_seller bool`, `sales_count int default 0` (for "Best Selling" sort), `search tsvector generated` (name weight A + description weight C; collection and category names are matched by joins in `search_products`, because generated columns cannot reference other tables), `created_at`, `updated_at`.
Indexes: `(is_published, is_featured)`, `(collection_id)`, `(category_id)`, GIN on `search`, `pg_trgm` GIN on `name`.

**product_variants** — `product_id fk on delete cascade`, `sku text unique`, `length_inches smallint null`, `density text null` (e.g. `200g`, `180%`), `colour text null`, `lace_type text null` (e.g. `5x5 Swiss Lace`, `13x4 HD Lace`, `Closure`), `price bigint` (overrides base price), `compare_at_price bigint null`, `is_default bool`, `is_active bool default true`, `position int`.
Unique: `(product_id, length_inches, density, colour, lace_type)` (nulls not distinct).
*Availability is derived from `inventory`, never stored here.*

**inventory** — `variant_id uuid pk fk`, `on_hand int not null check (on_hand >= 0)`, `reserved int not null default 0 check (reserved >= 0 and reserved <= on_hand)`, `low_stock_threshold int default 3`, `updated_at`.
*available = on_hand − reserved.* A view `variant_availability` exposes `variant_id, available, is_in_stock` to the public.

**inventory_reservations** — `order_id fk`, `variant_id fk`, `quantity int`, `expires_at timestamptz`, `status text check (status in ('active','committed','released'))`. Index on `(status, expires_at)`.

**product_images** — `product_id fk`, `variant_id fk null`, `storage_path text`, `alt text not null`, `position int`, `width int`, `height int`.

**carts** — `user_id uuid unique fk profiles`, `updated_at`. *One cart per user.*
**cart_items** — `cart_id fk on delete cascade`, `variant_id fk`, `quantity int check (quantity between 1 and 10)`, `added_at`. **Unique `(cart_id, variant_id)`**. This is what makes merging possible without duplicates.

**wishlists** — `user_id unique fk`. **wishlist_items** — `wishlist_id fk`, `product_id fk`, unique `(wishlist_id, product_id)`.

**addresses** — `user_id fk`, `full_name`, `phone`, `line1`, `line2`, `city`, `state`, `country char(2) default 'NG'`, `is_default bool`.

**delivery_methods** — `code text unique` (`standard`, `express`), `name`, `description`, `is_active`, `sort_order`.
**delivery_rates** — `method_id fk`, `zone text check (zone in ('lagos','nigeria','international'))`, `price bigint`, `eta_min_days int`, `eta_max_days int`. Unique `(method_id, zone)`.
*Zone is resolved from country + state on the server.*

**discount_codes** — `code citext unique`, `type text check (type in ('percent','fixed'))`, `value int`, `min_subtotal bigint`, `starts_at`, `ends_at`, `usage_limit int null`, `times_used int default 0`, `is_active`.

**orders** — `order_number text unique` (`IMR-YYYYMMDD-NNN`), `user_id fk null` (null for guests), `email citext not null`, `access_token text unique` (random 32 bytes, base64url, for guest confirmation access), `status order_status`, `subtotal`, `delivery_fee`, `discount_total`, `total` (all bigint), `currency char(3) default 'NGN'`, `discount_code_id fk null`, `shipping_name`, `shipping_phone`, `shipping_line1`, `shipping_line2`, `shipping_city`, `shipping_state`, `shipping_country`, `delivery_method_code`, `delivery_method_name`, `delivery_eta_text`, `tracking_number`, `tracking_url`, `paid_at`, `cancelled_at`, `cancel_reason`, `created_at`, `updated_at`.
`order_status` enum: `pending_payment, paid, processing, ready_for_dispatch, shipped, delivered, cancelled, refunded`.
Indexes: `(user_id, created_at desc)`, `(status, created_at desc)`, `(email)`.
*Address, delivery and prices are **snapshotted**. Later edits to products or addresses never change a past order.*

**order_items** — `order_id fk on delete cascade`, `variant_id fk null on delete set null`, `product_name`, `variant_label` (e.g. `16" · 300g · 5x5 Swiss Lace`), `sku`, `image_path`, `unit_price bigint`, `quantity int`, `line_total bigint`.

**order_status_history** — `order_id fk`, `from_status`, `to_status`, `note`, `changed_by uuid null`, `created_at`.

**order_number_counters** — `day date pk`, `last_value int`. Used by `next_order_number()`.

**payments** — `order_id fk`, `provider text` (`paystack`), `reference text unique` (our reference, sent to the provider), `provider_transaction_id text`, `status text check (status in ('initialized','success','failed','abandoned','refunded'))`, `amount bigint`, `currency`, `channel text` (card/bank_transfer/ussd…), `paid_at`, `raw jsonb` (provider response with **sensitive fields stripped**: no authorization codes, no card BIN beyond what the provider masks), `created_at`.
*A new payment row is created for every attempt, so one order can have several attempts.*

**webhook_events** — `provider`, `event_id text`, `type`, `received_at`, `processed_at`, `payload jsonb`. Unique `(provider, event_id)`. Used for idempotency.

**email_log** — `order_id fk null`, `user_id null`, `type text`, `to_email`, `provider_message_id`, `status`, `error`, `created_at`. Partial unique `(order_id, type)` where `order_id is not null`. A given order email is never sent twice.

**reviews** — `product_id fk`, `user_id fk null`, `order_id fk null`, `author_display_name`, `rating smallint check 1..5`, `title`, `body`, `source text check (source in ('verified_purchase','imported'))`, `is_approved bool default false`, `approved_by`, `approved_at`, `created_at`.
*The storefront reads approved reviews only. The seed contains **no** reviews.*

**newsletter_subscribers** — `email citext unique`, `source text` (`footer`, `coming_soon_haircare`…), `status text check (status in ('subscribed','unsubscribed'))`, `created_at`.

**contact_messages** — `name`, `email`, `phone`, `message`, `created_at`.

**instagram_tiles** — `image_path`, `alt`, `link_url`, `position`, `is_active`. Managed by admin.

## 6. Row Level Security

A helper function `public.is_admin()` is defined as `security definer`, `stable`, with `search_path = ''`. It checks `profiles.role = 'admin'` for `auth.uid()`.

| Table | anon | authenticated (own rows) | admin |
|---|---|---|---|
| categories, collections (non-hidden), instagram_tiles (active) | select | select | all |
| products | select where `is_published` | same | all |
| product_variants, product_images | select where parent product is published | same | all |
| variant_availability (view, `security_invoker = off`, exposes only `available`) | select | select | — |
| inventory, inventory_reservations | — | — | all |
| profiles | — | select/update own (cannot change `role`, enforced by trigger) | all |
| carts, cart_items | — | all where `cart.user_id = auth.uid()` | select |
| wishlists, wishlist_items | — | all own | select |
| addresses | — | all own | select |
| orders | — | select own (`user_id = auth.uid()`) | all |
| order_items, order_status_history, payments | — | select where parent order is own | all |
| reviews | select where `is_approved` | same + select own | all |
| delivery_methods, delivery_rates | select active | select active | all |
| discount_codes | — (validated by RPC only) | — | all |
| newsletter_subscribers, contact_messages | insert only (through server action with rate limit) | insert | all |
| webhook_events, email_log, order_number_counters | — | — | select |

Further rules:
- **Customers can never insert or update** `orders`, `order_items`, `payments` or `inventory` directly. Those writes happen only in privileged server code or `security definer` functions that check their inputs.
- RLS is tested with pgTAP in `supabase/tests/`. A new table without RLS policies and a test fails CI.

## 7. Payments (provider-agnostic)

**Implemented in M3:** `src/server/privileged/payments/{provider,paystack,mock,index}.ts`. Next to Paystack there is a **development-only `mock` provider** (`PAYMENT_PROVIDER=mock`). It redirects to `/dev/mock-pay`, where you choose *Pay successfully*, *Simulate a declined payment* or *Cancel*. Its `verify()` reads that choice back, so the whole checkout runs through the same verification and `mark_order_paid` path as Paystack, without keys or money. `src/server/env.ts` refuses `mock` on the live deployment (`VERCEL_ENV=production`), and in production builds unless `ALLOW_MOCK_PAYMENTS=true`.

```ts
// src/server/privileged/payments/provider.ts
export interface PaymentProvider {
  readonly id: 'paystack' | 'flutterwave';
  initialize(input: {
    reference: string;          // our payments.reference
    amountKobo: number;
    email: string;
    callbackUrl: string;
    metadata: { orderId: string; orderNumber: string };
  }): Promise<{ redirectUrl: string; providerTransactionId?: string }>;

  verify(reference: string): Promise<VerifiedPayment>;  // calls provider API

  parseWebhook(rawBody: string, headers: Headers): Promise<
    | { ok: true; eventId: string; type: 'payment.success' | 'payment.failed' | 'refund.processed' | 'other'; reference: string }
    | { ok: false; reason: 'bad_signature' | 'unparseable' }
  >;
}

export type VerifiedPayment = {
  reference: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountKobo: number;
  currency: string;
  channel?: string;
  paidAt?: string;
  providerTransactionId?: string;
  raw: unknown;                 // sanitised before storage
};
```

`payments/index.ts` exports `getPaymentProvider()`, which is chosen by the `PAYMENT_PROVIDER` env var. The rest of the app only knows the interface.

**Paystack specifics:**
- Initialise with `POST /transaction/initialize`. Paystack takes amounts in kobo.
- Verify with `GET /transaction/verify/:reference`.
- Webhooks are checked against `x-paystack-signature`, which is an HMAC-SHA512 of the **raw body** with `PAYMENT_SECRET_KEY`. The check uses a constant-time comparison. Optionally the request can also be checked against Paystack's published IP list.
- Hosted checkout (redirect) is used rather than the inline popup. It works better on low-end devices and keeps all card entry on Paystack's domain.

## 8. Critical flows

### 8.1 Guest cart → user cart merge

1. Guest cart is `localStorage['imar.cart.v1'] = [{ variantId, quantity }]`. To display it, the client calls `getCartLinesPreview(variantIds)`, which returns current prices, stock and images from the server.
2. On `SIGNED_IN` (via `onAuthStateChange`) or right after the auth callback redirect, the client calls the server action `mergeGuestCart(lines)`.
3. The action validates the input with Zod (at most 50 lines, quantity 1–10) and calls RPC `merge_cart(p_lines jsonb)`. This is `security invoker`, so RLS applies.
   ```sql
   insert into cart_items (cart_id, variant_id, quantity)
   select v_cart_id, l.variant_id, least(l.quantity, 10)
   from jsonb_to_recordset(p_lines) as l(variant_id uuid, quantity int)
   join product_variants pv on pv.id = l.variant_id and pv.is_active
   on conflict (cart_id, variant_id)
   do update set quantity = least(cart_items.quantity + excluded.quantity, 10);
   ```
   Quantities are then clamped to `available` from `variant_availability`. The function returns the merged cart.
4. When the call succeeds, the client clears localStorage and hydrates the CartProvider from the server result. If it fails, the local cart stays and the merge is retried on the next page load.
5. Wishlists merge the same way through RPC `merge_wishlist`.

**Signed-in cart operations** (`addToCart`, `updateQuantity`, `removeLine`) are server actions that write to `cart_items`. The UI updates optimistically and rolls back on error.

### 8.2 Checkout → pending order → payment

The server action `placeOrder(input)`:

1. Validates the input with Zod (contact, address, Nigerian state when the country is NG, delivery method, discount code).
2. Loads the cart from the server: the DB cart for signed-in users, or the posted guest lines for guests. **Prices come only from the database.**
3. Calls RPC `create_pending_order(...)`. This is `security definer` and runs as **one transaction**:
   - It locks the inventory rows for the variants involved: `select … from inventory where variant_id = any(...) order by variant_id for update`. The fixed order avoids deadlocks.
   - It checks `on_hand - reserved >= qty` for every line. If any line fails, it raises `INSUFFICIENT_STOCK` with the variant IDs.
   - It increments `reserved` and inserts `inventory_reservations` rows with `expires_at = now() + interval '30 minutes'`.
   - It validates and applies the discount code.
   - It computes the delivery fee from `delivery_rates` and the resolved zone.
   - It generates `order_number` through `next_order_number()`, which does an upsert on `order_number_counters` for today in the Africa/Lagos timezone and returns the next value.
   - It inserts `orders` (status `pending_payment`), `order_items` (snapshots) and `order_status_history`.
4. Creates a `payments` row (`initialized`, reference `IMR-<orderNumber>-<attempt>`) and calls `provider.initialize(...)`.
5. Returns `redirectUrl`. The client redirects to Paystack.

**The cart is not cleared at this point.**

If the action gets `INSUFFICIENT_STOCK`, the UI shows which lines changed and lets the customer adjust them.

### 8.3 Payment confirmation (idempotent)

There are two entry points, and both call `confirmPayment(reference)`:

- **Callback:** `GET /checkout/callback?reference=…`, where Paystack sends the customer back.
- **Webhook:** `POST /api/webhooks/paystack`. Signature is checked first, then `webhook_events` is inserted. On a unique conflict the handler returns 200 straight away.

`confirmPayment(reference)`:
1. `provider.verify(reference)`. This is the source of truth.
2. If the status is `success`, it calls RPC `mark_order_paid(p_reference, p_amount, p_currency, p_payload)`. This is `security definer` and runs as one transaction:
   - Locks the payment and order rows `for update`.
   - **If the order is already `paid` or later, it returns `already_paid`** (idempotent).
   - Checks that `amount = orders.total` and that `currency = 'NGN'`. On a mismatch it flags the payment and raises an alert. The order is **not** marked paid.
   - Commits the reservations: `on_hand -= qty`, `reserved -= qty`, reservation status set to `committed`.
   - **Late payment after the reservation expired:** it tries to decrement `on_hand` directly with `where on_hand - reserved >= qty`. If there isn't enough stock, the order goes to `paid` with a `stock_conflict` note and admin is alerted to fulfil or refund. This is rare and is never silently oversold.
   - Sets order `status = 'paid'` and `paid_at`, and inserts status history.
   - Increments `discount_codes.times_used` and `products.sales_count`.
   - Deletes the purchased variants from the user's `cart_items`. Only the purchased lines are removed, so anything added afterwards is kept.
3. If the result is `paid` (not `already_paid`), it sends the order confirmation email via `sendOrderEmail(orderId, 'order_confirmation')`. Email runs after the commit, is guarded by `email_log`, and failures are logged without being thrown.
4. Guest checkout: the client clears the local cart on the confirmation page **only once the server reports `paid`**.
5. The callback redirects to `/checkout/confirmation/[orderNumber]?t=<access_token>`. That page shows "Confirming your payment…" while the order is still `pending_payment` and polls for up to about 20s.

If the verify status is `failed` or `abandoned`, the payment row is updated and the order stays `pending_payment`. The customer sees **Retry payment**, which creates a new payment attempt for the same order. The reservation is extended if it is still valid, or re-reserved if it has expired.

### 8.4 Reservation expiry

`pg_cron` runs every 5 minutes and calls `release_expired_reservations()`. That function marks expired active reservations `released`, decrements `inventory.reserved`, and cancels `pending_payment` orders that have no active reservation and no successful payment (`cancel_reason = 'payment_not_completed'`). Expiry cancellation sends no email.

### 8.5 Admin status change

The server action `updateOrderStatus(orderId, toStatus, { trackingNumber?, trackingUrl?, note? })`:
- Requires `is_admin()`. **Implemented in M4** as SQL `admin_update_order_status` (transition graph enforced in SQL; cancelling an unpaid order releases its hold, cancelling a paid unshipped order restocks; refunds don't restock) called from `changeOrderStatus` in `src/server/actions/admin/operations.ts`.
- Checks the transition against an allowed graph (e.g. `paid → processing → ready_for_dispatch → shipped → delivered`. `cancelled` is allowed from pending/paid/processing. `refunded` is allowed from any paid state).
- Writes history.
- Triggers the matching email.
- `refunded` records the refund. The actual refund is started from the provider dashboard in v1, with `provider.refund()` as a later addition.

### 8.6 Guest order claiming

The trigger on `auth.users` (insert, plus email-confirmed update) runs `update orders set user_id = new.id where user_id is null and email = new.email`, but only once the email is **verified**. Google accounts count as verified.

## 9. Security

- **Secrets:** server-only env vars, read only in server code (`src/server/env.ts`, `server-only`). Public values go through `src/lib/env.ts`, which throws a clear error if one is missing. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_SITE_URL`) reach the browser. **The service-role key, payment secret and Mailgun key never have a `NEXT_PUBLIC_` prefix.**
- **`server-only`** is imported at the top of every module in `src/server/privileged/**`.
- **Proxy** (`src/proxy.ts`, Next 16's replacement for middleware) refreshes the Supabase session and redirects guests from `/account/**` and `/admin/**` to `/login?next=…`. The admin layout checks the role and returns 404 for non-admins, and every admin action **re-checks** `is_admin()` on the server, because the proxy alone is not trusted.
- **Validation:** every server action and route handler parses input with Zod. All IDs are UUID-validated.
- **Authorization:** the user-scoped Supabase client is used by default, so RLS enforces ownership. Privileged code checks ownership explicitly, e.g. `order.user_id === session.user.id || accessToken matches`.
- **Webhooks:** raw body, HMAC check, constant-time comparison, idempotency table, and a 200 response only after the event has been safely stored.
- **Payment integrity:** an order is paid only after server verification and an amount/currency match. A client success message never changes anything.
- **Rate limiting:** newsletter, contact, login-adjacent actions and `placeOrder` are limited per IP and per email (Vercel KV / Upstash, or a Postgres-based limiter).
- **Headers:** CSP (self, Supabase, Paystack, Google OAuth, fonts), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS.
- **Uploads:** admin-only Storage bucket policy for writes, public read for `product-images`, MIME/size checks, and resizing via the Next image optimiser.
- **PII:** only the minimum is collected. Stored payment provider payloads are stripped of sensitive fields. Logs never include addresses or phone numbers.

## 10. Auth details

- Supabase Auth with Email (confirm email ON) and Google providers.
- Google OAuth: create an OAuth client in Google Cloud Console, set its authorised redirect URI to `https://<project>.supabase.co/auth/v1/callback`, then add the client ID and secret to **Supabase Dashboard → Auth → Providers → Google**. The app itself never sees the Google secret at runtime. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are kept in env only for `supabase/config.toml` during local development.
- Flow: `signInWithOAuth({ provider: 'google', options: { redirectTo: SITE_URL + '/auth/callback?next=…' } })`. Then `/auth/callback` calls `exchangeCodeForSession` and redirects.
- Email links: the branded templates in `supabase/templates/` link to `/auth/confirm?token_hash=…&type=email|recovery`, which calls `verifyOtp`. This works even when the link is opened on a different device from the one that signed up, unlike the PKCE `?code=` flow. `/auth/callback` still handles Google OAuth and any default-template PKCE links.
- Password reset: `resetPasswordForEmail` → email → `/auth/confirm?type=recovery` → `/reset-password` → `updateUser({ password })`.
- Auth emails go through **Supabase custom SMTP set to Mailgun SMTP**, using branded templates kept in `supabase/templates/`.

## 11. Email

- `src/server/privileged/email/mailgun.ts` is a thin HTTP client (`POST https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages`, or the EU base URL through `MAILGUN_API_BASE`).
- Templates live in `src/server/privileged/email/templates.ts` as plain functions returning `{ subject, html, text }` (table-based, inline styles, Style.md §10). `EMAIL_TRANSPORT=log` prints emails to the server log in development.
- `sendOrderEmail(orderId, type)` loads the order snapshot, renders, sends, and writes `email_log`. If the log insert hits a unique violation, the email has already been sent, so the function exits.
- Types: `welcome`, `order_confirmation`, `order_processing`, `order_shipped`, `order_delivered`, `order_cancelled`, `order_refunded`.

## 12. Search and filtering

- **Read model:** `product_listing` (migration 7) is a `security_invoker` view with one row per product. It holds category/collection, min/max price, variant count, the lengths array, default-variant attributes, `in_stock`, the first two image paths, and a `search` tsvector (name A, collection and category B, description C).
- **Search:** `search_products(p_q)` returns `setof product_listing`. It uses full-text search (`websearch_to_tsquery`) plus a `pg_trgm` `word_similarity > 0.55` fallback for typos: "bouncey" and "primee" match, while "bob" doesn't pull in "bouncy" or "body". Because it returns view rows, PostgREST filters, sort, range and `count` chain onto it exactly as they do for the view.
- **Filters** live in the URL (`?category=wigs,bundles&length=14,16&price=100k-250k&stock=1&sort=price-asc&page=2`). They are parsed and sanitised by `parseShopParams()` (`src/lib/catalog/shop-params.ts`) and map to PostgREST filters on the view: `in` for slugs, `ov` (overlaps) for lengths, `max_price >= band.min and min_price < band.max` for price bands, and `in_stock = true`. Pagination is "Load more", which shows `page × 24` rows.
- The "Best Selling" sort uses `sales_count`. "Featured" orders by `is_featured desc, position`.

## 13. SEO

- `generateMetadata` on every page sets the title template `%s | Imarhair`, description, canonical and Open Graph image (the product's first image).
- The PDP includes `Product` JSON-LD with `offers` (price in NGN, availability) and `aggregateRating` only when approved reviews exist.
- `sitemap.ts` lists static pages, active collections and published products with their `updated_at`.
- `robots.ts` disallows `/account`, `/admin`, `/checkout`, `/cart` and `/api`.

## 14. Environments and config

| Env | Supabase | Payments | Mail |
|---|---|---|---|
| local | `supabase start` (Docker) | Paystack **test** keys | Mailgun sandbox domain or a log-only adapter (`EMAIL_TRANSPORT=log`) |
| preview (Vercel) | Supabase staging project | test keys | sandbox |
| production | Supabase prod project | **live** keys | verified sending domain (e.g. `mg.imarhair.com`) with SPF/DKIM/DMARC |

Migrations are applied with `supabase db push` from CI on merge to `main`. They must never be edited in the dashboard by hand.

## 15. Observability

- Vercel logs and Supabase logs, plus **Sentry** (or Vercel's equivalent) for errors.
- Structured logs for `placeOrder`, `confirmPayment` and webhooks: order number, reference, outcome. No PII.
- An admin alert email goes out on: amount mismatch, stock conflict after late payment, and webhook signature failures above a threshold.

## 16. Testing strategy

| Layer | What |
|---|---|
| Unit (Vitest) | money formatting, zone resolution, Zod schemas, cart merge reducer, status transition graph |
| SQL (pgTAP) | RLS: user A cannot read B's cart, orders or addresses. anon sees only published products. `create_pending_order` concurrency: two buyers, one unit, one succeeds. `mark_order_paid` is idempotent. |
| E2E (Playwright, mobile + desktop) | **Golden path:** home → PDP → variant → add → checkout (guest) → Paystack test card → confirmation → email logged. Cart persists across two browser contexts after login. Failed payment keeps the cart and retry works. Admin status change sends email. |
| Manual pre-launch | One real live-key payment and refund. Lighthouse mobile ≥ 90 performance on Home and PDP. |

## 17. Architecture decisions (summary)

| # | Decision | Alternatives considered |
|---|---|---|
| ADR-1 | Next.js App Router on Vercel | Remix, SvelteKit: fine choices, but Next has the best Supabase SSR and image story |
| ADR-2 | Money stored as integer kobo | numeric(12,2): integers avoid float bugs and match Paystack |
| ADR-3 | Reserve stock at order creation (30 min TTL) and commit on paid | Decrement only on paid: risks selling the last unit to two people who both pay |
| ADR-4 | Guest checkout allowed | Forced login: hurts the primary success metric |
| ADR-5 | Hosted payment page (redirect) | Inline popup: heavier JS, weaker on low-end devices |
| ADR-6 | Business-critical writes happen in Postgres `security definer` functions | App-level multi-query transactions: harder to make atomic over PostgREST |
| ADR-7 | Product content in Supabase. Legal/policy pages as code | Headless CMS: unnecessary in v1 |
