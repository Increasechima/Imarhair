<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) and human contributors working in this repo.

## Read first

| Doc | Read it when |
|---|---|
| [prd.md](prd.md) | Before building any feature. It defines **what** to build and what not to build. |
| [Architecture.md](Architecture.md) | Before touching data, auth, cart, checkout, payments, email or admin |
| [Style.md](Style.md) | Before writing any UI. Use its tokens and component specs. |
| [Taste.md](Taste.md) | When the spec doesn't cover a design or copy decision |

**The north star:** can a first-time visitor go from the homepage to a paid wig order with minimal friction? Don't add complexity that doesn't serve that.

## Repo layout

pnpm workspace:

| Path | What |
|---|---|
| `apps/web` | The Next.js storefront and admin (`@imarhair/web`). Deployed on Vercel with Root Directory `apps/web`. |
| `apps/mobile` | The Expo (React Native) app (`@imarhair/mobile`). Read `apps/mobile/AGENTS.md` before touching it. |
| `packages/shared` | Platform-free TS used by both apps (`@imarhair/shared/*`): DB types, Zod schemas, money, bag lines, catalogue queries and helpers, the `/api/v1` contract. No Node, DOM-only or React Native APIs. |
| `supabase/`, `scripts/` | Migrations, pgTAP tests, verify scripts (repo root). |

The app and the website use the **same Supabase project and Auth** and the **same server code**: catalogue reads run the shared queries, and the bag goes through `apps/web/src/server/cart.ts` (server actions on the web, `/api/v1/*` routes for the app).

## Stack at a glance

Next.js 16 App Router (Turbopack) · React 19 · TypeScript strict · Tailwind v4 · Supabase (Postgres, Auth, Storage) via `@supabase/ssr` · Zod 4 · Paystack (plus a dev-only mock) behind `PaymentProvider` · Mailgun · Vitest · pgTAP · a CDP-driven browser suite (`pnpm verify:e2e`) · pnpm.

Next 16 specifics already in use:
- `apps/web/src/proxy.ts` replaces `middleware.ts`.
- `params`, `searchParams`, `cookies()` and `headers()` are async only.
- Use the generated `PageProps<"/route">` and `LayoutProps<"/route">` helpers.
- `revalidateTag(tag, "max")` takes a second argument.

## Commands

```bash
pnpm install
pnpm dev                  # Next dev server on :3000
pnpm dev:mobile           # Expo dev server (apps/mobile; needs apps/mobile/.env.local)
pnpm db:start             # local Supabase (needs Docker)
pnpm db:reset             # apply migrations + seed.sql
pnpm db:types             # regenerate packages/shared/src/database.types.ts from local Supabase (Docker)
pnpm db:types:remote      # same, from the hosted project in SUPABASE_DB_URL (no Docker)
pnpm lint && pnpm typecheck
pnpm test                 # Vitest
pnpm test:db              # pgTAP RLS tests (supabase test db, needs Docker)
pnpm verify:remote        # hosted dev project: schema, RLS, grants, pgTAP, live Auth/API
pnpm verify:e2e           # browser tests of the running app against the hosted project
pnpm verify:e2e:checkout  # browser checkout only (needs the app running with PAYMENT_PROVIDER=mock)
```

Before you call a task done, run `pnpm lint`, `pnpm typecheck` and `pnpm test`. If you changed SQL, apply it and run `pnpm verify:remote` (or `supabase db reset` and `pnpm test:db` locally). Add checks to `scripts/verify-remote/` for any new table, policy or RPC.

## Hard rules (never break)

1. **No hardcoded products, prices or stock in components.** All catalogue data comes from Supabase. Fixtures belong in `supabase/seed.sql` or test files only.
2. **No secrets in client code.** Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` (and their `EXPO_PUBLIC_*` twins in the app) may be public. Everything in the mobile app ships to devices. The service-role key, payment secret and Mailgun key are used only in `apps/web/src/server/privileged/**`, and every file there begins with `import 'server-only'`.
3. **Never mark an order paid without server-side verification.** Use `confirmPayment()` only. The payment amount and currency must match the order.
4. **Never store card numbers, CVV, PINs or similar.** Strip sensitive fields from provider payloads before saving them.
5. **Every new table has RLS enabled, policies, and a pgTAP test.** No exceptions. The only policy-less tables are service-role-only ones (e.g. `rate_limits`): RLS on, no grants to `anon`/`authenticated`, listed in `SERVICE_ONLY` in `scripts/verify-remote/schema.mjs`.
6. **Money is integer kobo** (`bigint` in SQL, `number` in TS). Format only at the edge with `formatNaira()` from `@imarhair/shared/money`. No floats for money.
7. **Prices are computed on the server.** Never trust a price, total or discount sent from the client.
8. **Stock changes go through the SQL functions** (`create_pending_order`, `mark_order_paid`, `release_expired_reservations`, admin inventory RPCs). No ad-hoc `update inventory`.
9. **Don't clear the cart before payment is verified.** Only the purchased lines are removed, inside `mark_order_paid`.
10. **No fake reviews.** The storefront shows only `reviews.is_approved = true`, and seed data contains no reviews.
11. **Don't commit `.env*` files** other than `.env.example`.
12. **Never edit an applied migration.** Add a new one.

## Conventions

### Code
- Server Components by default. Add `'use client'` only for interactive islands (cart, gallery, variant picker, forms, toasts).
- Data reads go in `apps/web/src/server/queries/*` (user-scoped Supabase client). Mutations go in `apps/web/src/server/actions/*` (`'use server'`, Zod-validated, return `{ ok: true, data } | { ok: false, error }`). Form actions used with `useActionState` return a typed form state instead (see `AuthFormState` in `apps/web/src/server/actions/auth.ts`). Anything the mobile app also needs goes in a plain server module that takes a user-scoped Supabase client (like `server/cart.ts`), wrapped by both a server action and an `/api/v1` route.
- Redirect targets from user input (`?next=`) always go through `safeNextPath()`.
- Name files in kebab-case and components in PascalCase. One component per file in `components/`.
- Use the `@/` import alias for the app's own `src/`, and `@imarhair/shared/<module>` for shared code.
- Validate all external input with Zod schemas from `@imarhair/shared/validation/*` (admin-only schemas: `apps/web/src/lib/validation/`). Share schemas between client forms and server actions.
- After regenerating DB types, use `Tables<'products'>` etc. Don't hand-write row types.
- Don't add a new dependency without a clear reason. Check whether the platform or an existing dependency already does it. Note any new dependency in the PR description.

### UI
- Use the design tokens (`bg-ivory`, `text-ink`, `text-taupe`, `border-line`, `font-display`, …). **Never hardcode raw hex values or arbitrary pixel sizes.**
- Build mobile-first at 375px, then scale up.
- Large radii, gradients, drop shadows on cards and decorative animation are not allowed. See the "AI-generated smell" list in Taste.md.
- Copy comes from the microcopy bank in Taste.md. Use "Queen" sparingly.
- Every interactive element needs a visible focus state, a ≥44px tap target and an accessible name.
- Every async view needs loading, empty and error states.

### Database
- Write migrations as `supabase/migrations/<timestamp>_<snake_name>.sql`, generated by `supabase migration new`.
- Business-critical multi-step writes belong in a Postgres function inside one transaction. Use `security definer` with `set search_path = ''` and fully-qualified names.
- Lock rows in a consistent order (`order by id`) to avoid deadlocks.
- Add indexes for every foreign key and every filter/sort column used by the storefront.
- Lessons already learned (each one caused a real bug):
  - **`citext` under `search_path = ''`:** a bare `=` silently becomes case-sensitive text equality. Write `col operator(extensions.=) value::extensions.citext`.
  - **Column-level grants:** `revoke update (col)` does nothing while a table-level grant exists. Revoke the table privilege, then `grant update (allowed_cols)`.
  - **Functions called from policies:** anything a public-read policy calls (e.g. `is_admin()`) needs `EXECUTE` for `anon` too, or every anonymous read fails.
  - **Named constraints:** `check (total >= 0)` on a column `total` is auto-named `<table>_total_check`. Don't reuse that name for a table constraint.
  - **pgTAP:** test descriptions are SQL strings, so use `'single quotes'` (`''` for an apostrophe). `"double quotes"` are identifiers. A data-modifying `WITH` can't be nested inside `is(...)`, so run the statement first and assert afterwards.
- **Zod 4 + checkboxes:** an unticked checkbox is *absent* from FormData. `z.union([z.literal("on"), z.undefined()])` still makes the key required in Zod 4; use `z.string().optional().transform((v) => v === "on")`.
- The hosted DB is reached through the session pooler (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`), because the direct host is IPv6-only.

### Git
- Branches are named `feat/…`, `fix/…`, `chore/…`. Use Conventional Commits.
- Keep PRs small, and give UI changes a screenshot at 375px and 1440px.

## Where things live

| Need | Location |
|---|---|
| Design tokens | `apps/web/src/app/globals.css` |
| Supabase clients | `apps/web/src/lib/supabase/{browser,server,proxy}.ts`; service role (from M3): `apps/web/src/server/privileged/supabase-admin.ts` |
| Session refresh + route guard | `apps/web/src/proxy.ts` |
| Auth | `apps/web/src/server/actions/auth.ts`, `apps/web/src/components/auth/`, `apps/web/src/app/auth/{callback,confirm}/route.ts`, `supabase/templates/` |
| Brand constants and nav | `apps/web/src/lib/site.ts` |
| Catalogue reads (cacheable, anon) | `apps/web/src/lib/supabase/catalog.ts`, `apps/web/src/server/queries/catalog.ts`, SQL view `product_listing`, RPC `search_products` |
| Catalogue helpers (pure, unit-tested) | `packages/shared/src/catalog/` (`shop-params.ts` URL filters, `variants.ts` option logic, `format.ts` price/attribute labels, `queries.ts` the catalogue reads both apps run) |
| Product UI | `apps/web/src/components/product/` (card, quick-add, gallery, purchase panel), `apps/web/src/components/shop/` (filters, listing) |
| Wishlist | `apps/web/src/components/wishlist/`, `apps/web/src/server/actions/wishlist.ts`, SQL `merge_wishlist` |
| DB types | `packages/shared/src/database.types.ts`, regenerated with `pnpm db:types:remote` after any migration |
| Migrations / RLS tests | `supabase/migrations/`, `supabase/tests/` |
| Cart logic | `apps/web/src/server/cart.ts` (shared by server actions and `/api/v1`), `apps/web/src/components/cart/cart-provider.tsx`, `apps/web/src/server/actions/cart.ts`, SQL `merge_cart` |
| Live bag sync (web ↔ app) | SQL triggers `cart_items_notify_*` → `realtime.send` on private topic `cart:<user_id>` (receive-only policy on `realtime.messages`); clients re-fetch on the ping. Topic helper in `@imarhair/shared/api` |
| Mobile API | `apps/web/src/app/api/v1/` (Bearer auth via `apps/web/src/server/api-auth.ts`); contract in `packages/shared/src/api.ts`; checkout handoff in `apps/web/src/server/privileged/checkout-handoff.ts`; guest app checkout at `/checkout/from-app` |
| Mobile app | `apps/mobile/src/app/` (Expo Router screens), `src/providers/` (auth, bag), `src/lib/` (Supabase, API client, secure storage), `src/theme.ts` (Style.md tokens) |
| Checkout and orders | `apps/web/src/server/actions/checkout.ts`, `apps/web/src/server/privileged/orders.ts`, SQL `create_pending_order`, `mark_order_paid` |
| Payment provider | `apps/web/src/server/privileged/payments/` |
| Webhook | `apps/web/src/app/api/webhooks/paystack/route.ts` |
| Emails | `apps/web/src/server/privileged/email/` (`templates.ts`, `send.ts` with once-only `email_log`, `mailgun.ts`) |
| Nigerian states | `packages/shared/src/ng-states.ts` |
| Pricing (single source of truth) | SQL `quote_order`, called by `quote()` in `apps/web/src/server/privileged/orders.ts` for the bag, checkout summary and order creation |
| Order pages | `apps/web/src/app/(store)/checkout/confirmation/[orderNumber]`, `apps/web/src/app/(store)/account/orders`, `apps/web/src/components/order/` |
| Admin pages | `apps/web/src/app/admin/` (dashboard, orders, products, inventory, customers, reviews, discounts), `apps/web/src/components/admin/` |
| Admin writes | `apps/web/src/server/actions/admin/` (each re-checks `isAdmin()`), SQL `admin_update_order_status`, `admin_set_stock`, `admin_dashboard`, `admin_list_customers` |
| Forms that keep input on error | `useSubmitAction()` in `apps/web/src/lib/use-submit-action.ts` (React 19 resets `<form action>` fields after every submit) |
| Dev catalogue tools | `pnpm dev:reseed-catalog`, `pnpm dev:catalog-images` (dev project only) |
| Seed data | `supabase/seed.sql` |
| Content pages | `apps/web/src/app/(store)/{about,contact,faq,shipping,returns,privacy,terms}`, `apps/web/src/components/content/` (`ContentPage` with a dev-only draft banner, `prose-imar` styles, `ContactForm`), `apps/web/src/server/actions/contact.ts` |
| Rate limiting | `apps/web/src/server/privileged/rate-limit.ts` (`rateLimit(bucket)`), SQL `check_rate_limit` |
| Security headers / CSP | `next.config.ts` |

## When unsure

- If a product decision isn't covered by the PRD, choose the simpler customer experience and leave a `// DECISION:` comment plus a note in the PR.
- If a security or payment question comes up, stop and ask. Don't guess.
- Check the Open Questions table in prd.md §12 before inventing business rules (delivery fees, returns, shipping zones).
