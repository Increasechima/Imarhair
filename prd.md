# Imarhair — Product Requirements Document

| | |
|---|---|
| **Product** | Imarhair online store |
| **Owner** | Imarhair Limited |
| **Status** | Draft v1 — 4 Oct 2026 |
| **Companion docs** | [Taste.md](Taste.md) · [Style.md](Style.md) · [Architecture.md](Architecture.md) · [AGENTS.md](AGENTS.md) · [README.md](README.md) |

---

## 1. Summary

Imarhair sells premium wigs, bundles and (soon) haircare products to women. We are building a premium e-commerce site that feels like a fashion/beauty brand, not a marketplace. Shopping should take very little effort:

**Discover → Browse → Product → Add to Cart → Checkout → Pay → Confirmation**

Our main success metric is one question:

> **Can a first-time visitor go from the homepage to a successful wig purchase with minimal friction?**

When a feature competes with that journey, the journey wins.

## 2. Goals

1. **Convert.** A first-time mobile visitor can buy in under 3 minutes and in 6 taps or fewer from product to payment.
2. **Look premium.** The site should be as good as a well-designed fashion store. Nothing about it should look generic or AI-generated.
3. **Persist.** The cart and wishlist follow a logged-in customer across devices.
4. **Be trustworthy.** Payments are verified on the server, stock never oversells, and order status is always clear.
5. **Be self-serve.** Imarhair staff manage products, stock and orders without a developer.

### Non-goals (v1)

- Marketplace, multi-vendor or seller features
- Loyalty points, gift cards, subscriptions, referral programmes
- Live chat (link to WhatsApp/Instagram instead)
- Multi-currency pricing (NGN only in v1; see Open Questions)
- Customer-written reviews from the storefront (staff add and approve reviews in v1; see §6.12)
- Blog / CMS

## 3. Users

| User | Needs |
|---|---|
| **First-time visitor** (mostly mobile, Nigerian mobile networks, often comes from Instagram) | Understand the brand fast, find a wig, trust the store, pay without friction |
| **Returning customer** | Pick up her saved cart on any device, reorder, track an order |
| **Imarhair admin/staff** | Add products and variants, manage stock, process orders, update status and tracking |

## 4. Core user journey

```
Home → Shop → Product → Choose variant → Add to Cart
     → Continue shopping OR Checkout
     → Sign in only if wanted (guest checkout allowed)
     → Contact + Delivery → Delivery method → Pay
     → Order Confirmation → Order History
```

- No account is needed to browse, add to cart or check out.
- Checkout offers sign-in as an optional shortcut that pre-fills saved addresses.
- Leaving and coming back keeps the cart (local storage for guests, Supabase for signed-in users).
- Logging in on another device restores the cart from Supabase.

## 5. Information architecture

### Primary navigation
- Left/centre: **Shop · Collections · About**
- Right: **Search · Account · Cart (with count)**
- Mobile: hamburger menu, logo in the centre, cart icon always visible

### Pages

| Group | Pages | Route |
|---|---|---|
| Main | Home | `/` |
| | Shop (all products) | `/shop` |
| | Product detail | `/shop/[slug]` e.g. `/shop/imar-prime-bouncy-unit` |
| | Collections index | `/collections` |
| | Collection | `/collections/[slug]` |
| | Search results | `/search?q=` |
| | About | `/about` |
| | Contact | `/contact` |
| | FAQ | `/faq` |
| | Shipping & Delivery | `/shipping` |
| | Returns Policy | `/returns` |
| Customer | Login / Sign up | `/login`, `/signup` |
| | Forgot / reset password | `/forgot-password`, `/reset-password` |
| | Cart | `/cart` (plus slide-out cart drawer) |
| | Checkout | `/checkout` |
| | Order confirmation | `/checkout/confirmation/[orderNumber]` |
| | Account home | `/account` |
| | Orders / Order detail | `/account/orders`, `/account/orders/[orderNumber]` |
| | Wishlist | `/account/wishlist` (`/wishlist` for guests) |
| | Saved addresses | `/account/addresses` |
| | Account settings | `/account/settings` |
| Legal | Privacy Policy, Terms & Conditions | `/privacy`, `/terms` |
| Admin | Dashboard, Products, Orders, Customers, Inventory | `/admin/*` |

Only Shop, Collections and About go in the primary nav. Everything else is in the footer, the account menu, or the flow itself.

## 6. Functional requirements

### 6.1 Homepage

Sections in order. Do not add more.

1. **Hero.** Full-bleed editorial Imarhair image.
   - Headline: **Classy. Confident. IMAR** (updated by Imarhair, 4 Oct 2026; the original brief said "Confidence")
   - Supporting: **Wigs, bundles and haircare products for elegant women**
   - Primary CTA: **SHOP HAIR** → `/shop`
   - Secondary CTA: **EXPLORE COLLECTIONS** → `/collections`
   - *(The client's brief words the copy slightly differently. See Open Questions Q1.)*
2. **Featured collections.** Four tiles: **Imar Classic**, **Imar Prime**, **Bundles**, **Haircare**. Haircare shows a **Coming Soon** label. Its tile goes to a holding page with a newsletter "notify me" signup, not to an empty grid.
3. **Best Sellers.** 4–6 products where `is_best_seller = true`. On mobile they scroll sideways, on desktop they sit in a grid.
4. **Brand section.** One image and a short statement, e.g. *"Hair that makes you feel confident."* No more than 3 sentences, plus a link to About.
5. **Reviews.** Shown **only** when the database has approved reviews. If there are none, the whole section is hidden. Never use placeholder or invented reviews.
6. **Instagram.** **Follow @imarhair**: a 4–6 image grid of brand images managed by admin (no live Instagram API in v1), linking to the Instagram profile.
7. **Footer** (see 6.14).

### 6.2 Product cards

There are two card variants, chosen by category type.

| Field | Wig / Bundle card | Haircare card |
|---|---|---|
| Image (second image on hover, desktop) | ✓ | ✓ |
| Name | ✓ | ✓ |
| Key attributes: length · colour · volume (density/weight) · closure | ✓ one muted line, e.g. `16" · Natural Black · 300g · 5x5 Lace` | — |
| Price, with sale price and strike-through when on sale | ✓ | ✓ |
| Wishlist heart | ✓ | ✓ |
| Add to Cart | ✓ | ✓ |
| Sold out / Coming soon state | ✓ | ✓ |

- The attribute line shows the **default variant**. If a product has several lengths, the card shows the range, e.g. `10"–20"`, and the price shows as **From ₦X**.
- **Quick add:** If a product has exactly one purchasable variant, Add to Cart adds it straight away. If it has several, Add to Cart opens a small variant picker (a bottom sheet on mobile, a popover on desktop) so the customer can add without leaving the page.
- Keep cards uncluttered. Badges are limited to **Sale**, **Sold out** and **Coming soon**.

### 6.3 Shop page

- Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop.
- **Search** across name, collection and category.
- **Filters:** Category, Collection, Length, Price range, Availability (In stock only). On mobile they open from a **Filter** button into a full-height sheet with an **Apply (N results)** button.
- **Sort:** Featured (default), Newest, Best Selling, Price low→high, Price high→low.
- Filters and sort live in the URL query string, so links can be shared and the back button works.
- Paginate with a **Load more** button (24 per page). No infinite scroll, so the footer stays reachable.
- The empty state offers a "Clear filters" action.

### 6.4 Collections

- `/collections` shows a tile for each collection.
- `/collections/[slug]` shows a short editorial header (image and 1–2 lines), then the same grid and filters as Shop, scoped to that collection.
- Coming-soon collections show a notify-me signup instead of a grid.

### 6.5 Product detail page (PDP)

- **Gallery:** main image and thumbnails. Swipe on mobile. Tap or click to open full-screen zoom with pinch-zoom on mobile. Images are lazy-loaded except the first.
- **Info:** name, price (updates when the variant changes), short description, variant selectors, quantity, **ADD TO CART** and **BUY NOW**.
- **Variants:** Show only the option types that exist for the product: Length, Density/Weight, Colour, Lace/Closure type. Use button chips, not dropdowns. Combinations that aren't available are shown disabled. Out-of-stock combinations are struck through and can't be selected.
- **Price** reflects the selected variant. If a sale is active, it shows the sale price next to the original price struck through.
- **Stock messaging:** "In stock", "Only 2 left" (when 3 or fewer), or "Sold out". When the selected variant is sold out, the CTA becomes disabled **Sold out**.
- **Add to Cart feedback:** the button briefly shows ✓ **Added**. A toast or mini-drawer says **"Added to your bag"** with **View Cart** and **Continue Shopping**. It does not open a blocking modal.
- **Buy Now** adds the item to the cart and goes straight to `/checkout`.
- **Accordions** below: Product details (structured attributes), Care, Shipping & Returns summary.
- **Reviews:** approved reviews for this product only. Hidden if there are none.
- **Mobile:** a sticky bottom bar with price and **ADD TO CART** appears once the main CTA scrolls out of view.
- **SEO:** product JSON-LD (Product, Offer, AggregateRating only when approved reviews exist).

### 6.6 Cart

- There is a **cart drawer** (slides in from the right, or full-screen on mobile) and a `/cart` page with the same contents.
- Each line shows image, name, variant summary, a quantity stepper, line price and **Remove**.
- The summary shows **Subtotal**, **Delivery** ("Calculated at checkout" until an address is entered), and **Total**.
- The primary CTA is **CHECKOUT**. The secondary CTA is **Continue shopping**.
- Quantity can't go above available stock (and never above 10 per line). If stock has dropped since the item was added, the line explains it and adjusts.
- Prices always come from the server. The client never decides the price.
- Empty state: a short line, an image, and **Shop hair**.

### 6.7 Persistent cart (core requirement)

- **Signed-in users:** the cart is stored in Supabase (`carts` → `cart_items`) against `user_id`. Every change writes to the database. localStorage is **not** the source of truth for signed-in users.
- **Guests:** the cart is stored in `localStorage` as `{variantId, quantity}[]` and works without a network round-trip.
- **Merge on sign-in / sign-up:** guest lines are merged into the user's cart on the server in one transaction. Lines for the same variant **add their quantities together**, capped at available stock and the per-line max. No duplicate lines. After a successful merge, the local cart is cleared and the UI shows the merged cart.
- **Cross-device:** adding a wig on a laptop, then logging in on a phone later, shows the wig in the phone's cart.
- **Sign-out:** the client cart is cleared. The server cart stays.

### 6.8 Wishlist

- Tap the heart to toggle. It fills in straight away (optimistic update).
- Guests' wishlists are stored locally and merged into Supabase on sign-in, without duplicates.
- `/account/wishlist` (or `/wishlist` for guests) is a product grid with **Move to bag**.
- Empty state: "Save the looks you love" plus **Shop hair**.

### 6.9 Authentication (Supabase Auth)

- Email + password: sign up, log in, log out, forgot password, reset password, email verification.
- **Continue with Google** (Google OAuth configured in Google Cloud Console, then Supabase).
- We don't build any custom auth or store passwords ourselves, and no auth secrets go in client code.
- Auth pages are a single centred card with the Google button on top, then "or", then the email form.
- After auth, the customer goes back to where they were (`?next=`), e.g. back to checkout.

### 6.10 Account

The account menu holds **Orders · Wishlist · Saved Addresses · Account Settings · Logout**.

The account home shows:
- **Welcome back, Queen.**
- **Recent orders** (last 3)
- **Wishlist** preview (4)
- **Current cart** summary with a link to the cart

Settings cover name, phone, email (through Supabase), password change, and newsletter opt-in/out.

### 6.11 Checkout (single page)

The layout is one page with clearly separated sections and the order summary on the right (desktop) or collapsible at the top (mobile).

1. **Contact:** full name, email, phone (Nigerian format validation, with an international format allowed).
2. **Delivery address:** address line(s), city, state (dropdown of the 36 Nigerian states + FCT when the country is Nigeria), country. Signed-in customers pick from saved addresses, and there is a "Save this address" checkbox.
3. **Delivery method:** e.g. **Standard Delivery** and **Express Delivery**. Each shows its price and ETA, with the price depending on the destination zone (Lagos / rest of Nigeria / international).
4. **Discount code:** a collapsed "Have a discount code?" link that opens an input.
5. **Payment:** the provider's available methods (card, bank transfer, USSD, etc.) are presented by the provider.
6. **Order summary:** products, subtotal, delivery, discount, **Total**.
7. **PAY NOW** button. It shows the total and has a processing state that disables double-submits.

Rules:
- Guest checkout is allowed. Sign-in is offered as an optional link at the top ("Have an account? Sign in for faster checkout").
- When the customer presses Pay, the server checks the cart again: it re-prices, re-checks stock, and re-checks the discount. If anything changed, the customer sees a clear inline message before paying.
- Inline field validation runs on blur. The page scrolls to the first error on submit.

### 6.12 Payments

- The default provider is **Paystack**. It suits Nigeria and supports card, bank transfer, USSD and others. The code is written against a provider-agnostic `PaymentProvider` interface so Flutterwave or another provider can be swapped in (see Architecture.md §7).
- Card numbers, CVV, PINs and other sensitive payment data are **never** stored. Only the provider reference, status, amount, channel and the provider's non-sensitive metadata are stored.
- An order is marked **Paid** **only** after the server verifies the payment, either through the provider's Verify API or a signed webhook. The amount and currency must match the order. A success message on the frontend is never enough.
- The webhook handler is idempotent. Duplicate events are harmless.

### 6.13 Order flow

```
Cart → Checkout → Create order (Pending Payment) + reserve stock
     → Initialize payment → Customer pays
     → Server verifies (callback verify + webhook)
     → Paid: commit stock, clear purchased cart lines, send confirmation email
     → Confirmation page → appears in account
```

**Failed or abandoned payment:** the order stays **Pending Payment**. The cart is **not** cleared. The customer can **Retry payment** from the confirmation/failed page or from their order. Stock reservations expire after 30 minutes and the order is then cancelled automatically (status "Cancelled", reason "payment not completed").

**Order number format:** `IMR-YYYYMMDD-NNN`, a sequence that restarts each day in Africa/Lagos time, e.g. `IMR-20261004-001`.

**Order statuses:** Pending Payment · Paid · Processing · Ready for Dispatch · Shipped · Delivered · Cancelled · Refunded. Admin can change them. Every change is recorded in a status history.

### 6.14 Order confirmation

- **Order Confirmed!**
- *Thank you for shopping with Imarhair, Queen.*
- **Order #IMR-20261004-001**
- *Your payment was successful and we've received your order.*
- The page lists products, total, delivery address, delivery method and expected delivery window.
- CTAs: **VIEW MY ORDER** (signed in) / **CREATE AN ACCOUNT TO TRACK** (guest) and **CONTINUE SHOPPING**.
- Guests reach this page through an unguessable access token in the URL. Signed-in customers reach it through their session.
- If the page loads before verification finishes, it shows "Confirming your payment…", polls the server for a short time, and then shows the result.

### 6.15 Order history

- The list shows order number, date, total (e.g. ₦480,000), and status chips (e.g. **Paid · Processing**).
- The detail page shows products, variants, quantities, prices, totals, payment status, delivery address, delivery method, order status timeline, and tracking number/link when available.
- When a guest later signs up or signs in with the **same verified email**, their earlier guest orders are attached to the account.

### 6.16 Emails (Mailgun)

Every email uses the same branded template (logo, ivory background, black/gold, plain-text fallback).

| Trigger | Email |
|---|---|
| Sign-up | Welcome |
| Auth | Email verification, Password reset (sent by Supabase Auth through Mailgun SMTP with branded templates) |
| Payment verified | Order confirmation (doubles as payment confirmation) |
| Status → Processing | Your order is being prepared |
| Status → Shipped | Shipped, with tracking |
| Status → Delivered | Delivered |
| Status → Cancelled | Cancelled |
| Status → Refunded | Refund notification |

The order confirmation contains the customer's name, order number, products, quantities, prices, total, delivery address, delivery method and support contact. Each email is sent once per (order, type), so we keep a log to avoid duplicates.

### 6.17 Footer

The footer has Shop, Collections, About, Contact, FAQ, Shipping, Returns, Privacy, Terms, Instagram, customer support (email, phone/WhatsApp, hours), and a newsletter signup with a single email field. Newsletter signups are stored in `newsletter_subscribers`.

### 6.18 Admin (`/admin`, admin role only)

The admin area should work well rather than look elaborate. It uses tables, forms and search.

- **Dashboard:** today's and the last 7 days' paid orders and revenue, orders needing action (Paid but not yet Processing), and low-stock variants.
- **Products:** list and search. Create and edit name, slug, description, category, collection, base price, sale price, images (upload to Supabase Storage, reorder, alt text), variants (SKU, length, density, colour, lace type, price, stock), published, featured and best-seller flags.
- **Inventory:** a table of variants with editable stock and low-stock highlighting.
- **Orders:** list, search (order number, email, name), filter by status. The detail page shows the customer, items, payment status and provider reference, a status changer (which triggers emails), and tracking number/URL.
- **Customers:** list and search. The detail page shows profile, addresses, and order history.
- **Reviews:** create, approve and unapprove reviews (e.g. reviews collected from real customers over Instagram/WhatsApp with their permission). Only approved reviews are shown on the storefront.
- **Discount codes:** create, enable and disable codes (percent or fixed, minimum subtotal, expiry, usage limit).

### 6.19 Content pages

About, Contact (form → email to support + stored), FAQ (accordion), Shipping & Delivery, Returns, Privacy, Terms. They are written as static MDX/TSX content in v1. **The legal and policy copy must be supplied or approved by Imarhair.** Until then they are clearly marked placeholders in development only.

## 7. Data and content requirements

- Products, variants, images, prices and stock come **only from Supabase**. Nothing is hardcoded in components.
- Money is stored as an integer in **kobo** (₦1 = 100 kobo) and formatted as `₦480,000` for display.
- **Development seed data** should look realistic. Examples:
  - **Imar Classic 8" Straight Bob**: 200g, ₦158,000
  - **Imar Prime 16" Bouncy Unit**: 300g, 5x5 Swiss Lace, ₦480,000
  - Further Imar Classic, Imar Prime, Bundles and Haircare (coming soon) products
- The seed must **not** include reviews presented as genuine.

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | LCP < 2.5s and INP < 200ms at p75 on a mid-range Android over 4G. Product pages are mostly server-rendered. Initial JS on the home page should be < 150 KB gz. Images are AVIF/WebP, responsive sizes, lazy below the fold. |
| **Mobile-first** | Design at 375px first. Every flow works one-handed, tap targets ≥ 44px, no horizontal scroll. |
| **Accessibility** | WCAG 2.2 AA: contrast, focus states, keyboard navigation, labelled inputs, alt text, reduced-motion support. |
| **Security** | RLS on every table. Protected customer and admin routes. Server-only service-role key. Signed webhooks. Zod validation on every input. See Architecture.md §9. |
| **SEO** | Clean URLs, per-page titles/descriptions, Open Graph, Product JSON-LD, `sitemap.xml`, `robots.txt`, canonical URLs. |
| **Reliability** | Payment confirmation is idempotent. No overselling under concurrency. Email failures never block an order. |
| **Privacy** | NDPA-aware (Nigeria Data Protection Act 2023): collect only what fulfilment needs, have a privacy policy, offer newsletter opt-out. |

## 9. UX states (must exist)

Loading/skeletons, empty cart, empty wishlist, empty search results, form errors, success toasts, "Added to your bag", payment processing, payment failed + retry, out of stock, coming soon, 404 and 500 pages styled to the brand.

## 10. Success metrics

- Home → Purchase conversion rate (primary)
- Add-to-cart rate from PDP
- Checkout start → paid rate (target ≥ 60%)
- Median time from first PDP view to payment
- Share of signed-in carts restored on a second device
- Oversell incidents: **0**
- Payment-marked-paid-without-verification incidents: **0**

## 11. Release plan

| Milestone | Scope |
|---|---|
| **M1 Foundation** | Repo, design tokens, layout, Supabase schema + RLS + seed, auth |
| **M2 Browse** | Home, Shop, Collections, PDP, Search, wishlist |
| **M3 Buy** | Guest cart, persistent cart + merge, checkout, Paystack, webhooks, confirmation, emails |
| **M4 Account & Admin** | Account, orders, addresses; admin products/inventory/orders/customers/reviews |
| **M5 Polish & launch** | Content pages, SEO, performance pass, accessibility pass, live keys, smoke test with a real ₦ payment |

## 12. Open questions

| # | Question | Default until answered |
|---|---|---|
| Q1 | ✅ Resolved 4 Oct 2026: headline is *"Classy. Confident. IMAR"*. Remaining: the brief says, *"Wigs and Bundles and haircare products for Elegant Women"* and CTA *"SHOP HAIR and haircare products"*. Is lightly tightened wording acceptable (§6.1)? | Use the tightened wording, keep the headline exactly as given |
| Q2 | Is Paystack the preferred provider, or Flutterwave? | Paystack |
| Q3 | Delivery prices and ETAs per zone (Lagos / other states / international)? | Placeholder values in `delivery_rates`, editable by admin |
| Q4 | Do we ship internationally in v1? If so, NGN only? | Nigeria only at launch, schema supports international |
| Q5 | Brand gold hex value from the official brand guide? | `#C4922B`, sampled from the logo |
| Q6 | Final product photography for every SKU? | Use the supplied Imarhair images, plus neutral placeholders in dev only |
| Q7 | Support channels (WhatsApp number, email, hours)? | Placeholders in config |
| Q8 | Returns policy terms (wigs are often final sale for hygiene reasons)? | Imarhair to supply |
