# Imarhair

The online store for **Imarhair Limited**: premium wigs, bundles and haircare for elegant women.

> *Classy. Confident. IMAR.*

Built with Next.js, Supabase, Paystack and Mailgun. The site is simple for customers to use and secure behind the scenes.

## Documentation

| Doc | Purpose |
|---|---|
| [prd.md](prd.md) | Product requirements: what we're building and why |
| [Architecture.md](Architecture.md) | Stack, data model, RLS, payment and cart flows, security |
| [Style.md](Style.md) | Design tokens and component specifications |
| [Taste.md](Taste.md) | Brand feel, voice and design judgement |
| [AGENTS.md](AGENTS.md) | Rules and conventions for contributors and AI agents |

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19, TypeScript) on **Vercel**
- **Supabase**: Postgres with Row Level Security, Auth (email + Google), Storage
- **Paystack** payments (provider-agnostic interface)
- **Mailgun** transactional email (branded HTML + text templates)
- **Tailwind CSS v4**, Radix UI, lucide-react
- Vitest · Playwright · pgTAP

## Prerequisites

- **Node.js 20.9+** (24 LTS recommended) and **pnpm** via Corepack (`corepack enable`; the version is pinned in `package.json`)
- **Docker Desktop**, for local Supabase (`pnpm db:start`). The Supabase CLI is a dev dependency, so run it as `pnpm exec supabase …`
- Accounts: Supabase, Paystack (test mode), Mailgun, Google Cloud (for OAuth)

## Getting started

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env.local
#    fill in values (see table below)

# 3. Local database (migrations + seed products)
pnpm db:start        # supabase start
pnpm db:reset        # migrations + seed products
pnpm db:types

# 4. Run
pnpm dev
# → http://localhost:3000
```

`pnpm db:start` prints the local API URL and keys. Put the URL and anon/publishable key in `.env.local`. Local Supabase Studio runs at http://localhost:54323, and confirmation and reset emails sent locally appear in the mail catcher at http://localhost:54324.

### Make yourself an admin (local)

Sign up through the site, then run this in Studio's SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Then open http://localhost:3000/admin.

## Environment variables

Secrets go in `.env.local` (git-ignored). **Never commit secrets.** Variables without a `NEXT_PUBLIC_` prefix are server-only.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | e.g. `http://localhost:3000` / `https://imarhair.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (safe because RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server** | Service-role key. Used only in `src/server/privileged/**` |
| `PAYMENT_PROVIDER` | server | `paystack` (default) |
| `PAYMENT_PUBLIC_KEY` | server | Paystack public key (`pk_test_…` / `pk_live_…`) |
| `PAYMENT_SECRET_KEY` | **server** | Paystack secret key. Also used to verify webhook signatures |
| `MAILGUN_API_KEY` | **server** | Mailgun private API key |
| `MAILGUN_DOMAIN` | server | e.g. `mg.imarhair.com` |
| `MAILGUN_API_BASE` | server | `https://api.mailgun.net` (US) or `https://api.eu.mailgun.net` (EU) |
| `EMAIL_FROM` | server | e.g. `Imarhair <orders@imarhair.com>` |
| `EMAIL_TRANSPORT` | server | `mailgun` or `log` (prints emails to the console in dev) |
| `SUPPORT_EMAIL` / `SUPPORT_PHONE` | server | Shown in emails and the footer |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **server/CLI** | Used by `supabase/config.toml` for local Google OAuth only. In production they are set in the Supabase dashboard. |

The [`.env.example`](.env.example) file lists every variable with empty values.

## Service setup

### Supabase
1. Create a project (choose the region closest to Nigeria, e.g. `eu-west`).
2. Apply migrations through the **session pooler**. The direct `db.<ref>.supabase.co` host is IPv6-only and fails on many networks. Copy the "Session pooler" connection string from Dashboard → Connect, URL-encode the password (`@` becomes `%40`), then run:
   ```bash
   pnpm exec supabase db push --db-url "postgresql://postgres.<ref>:<url-encoded-password>@aws-0-<region>.pooler.supabase.com:5432/postgres" --include-seed
   ```
   Leave out `--include-seed` for production once real products are loaded. The current dev project is `hoyxvuxaigwuabahcclx` (eu-west-1). Its M1 migrations and seed were applied and verified on 4 Oct 2026.
3. **Auth → URL configuration:** set Site URL and add `https://<domain>/auth/callback` to the redirect URLs.
4. **Auth → SMTP:** enable custom SMTP using your Mailgun SMTP credentials, and paste the branded templates from `supabase/templates/`.
5. Turn on the `pg_cron` extension. The migration schedules `release_expired_reservations()`.

### Verifying a hosted project
Run this after every `db push`, and before each milestone is signed off:

```bash
pnpm verify:remote                     # schema + RLS + grants + pgTAP + live Auth/API (~1 min)
pnpm build && pnpm start               # in another terminal
pnpm verify:e2e                        # real browser at 375px; VERIFY_BASE_URL defaults to http://localhost:3000
```

- Both commands need `SUPABASE_DB_URL` and `VERIFY_REMOTE_PROJECT_REF` in `.env.local`. They refuse to run unless `VERIFY_REMOTE_PROJECT_REF` matches the project in `NEXT_PUBLIC_SUPABASE_URL`, because they **create and delete test users** (`imar-verify-*@example.com`). Never point them at production.
- Test users are created with the Admin API, so no emails are sent. Everything they create is deleted, and leftovers from an aborted run are cleaned up at the start of the next one.
- `supabase test db` needs Docker; `verify:remote` runs the same `supabase/tests/*.test.sql` files directly.

### Google sign-in
1. Google Cloud Console → APIs & Services → **OAuth consent screen** (External, app name *Imarhair*, logo, support email).
2. **Credentials → Create OAuth client ID** → Web application.
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (local: `http://127.0.0.1:54321/auth/v1/callback`)
3. Paste the client ID and secret into **Supabase → Auth → Providers → Google**.

### Paystack
1. Get test keys from Dashboard → Settings → API Keys & Webhooks.
2. Set the **Webhook URL** to `https://<domain>/api/webhooks/paystack`.
   - For local testing, expose your dev server with a tunnel (e.g. `ngrok http 3000`) and use that URL.
3. Use [Paystack test cards](https://paystack.com/docs/payments/test-payments/) to try successful and failed payments.

### Mailgun
1. Add and verify a sending domain (e.g. `mg.imarhair.com`) with SPF, DKIM, and a DMARC record.
2. Create a sending API key and set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`.
3. In development, use `EMAIL_TRANSPORT=log` or a Mailgun sandbox domain with authorised recipients.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:db` | RLS and SQL tests (pgTAP) |
| `pnpm verify:e2e:checkout` | Browser checkout tests only (guest, declined + retry, two-device bag) |
| `pnpm dev:reseed-catalog` / `pnpm dev:catalog-images` | Reload the dev catalogue / upload its photos (dev project only) |
| `pnpm db:types` / `pnpm db:types:remote` | Regenerate Supabase TypeScript types (local Docker / hosted project) |
| `pnpm verify:remote` | Check the hosted project: schema, RLS, grants, the pgTAP suite and live Auth/API tests |
| `pnpm verify:e2e` | Browser tests of the running app against the hosted project (needs Chrome or Edge) |

## Deployment

- **Vercel:** import the repo and add the environment variables for Preview (test keys, staging Supabase) and Production (live keys, prod Supabase).
- **Database:** CI runs `supabase db push` against the target project when changes merge to `main`.
- **Pre-launch checklist:**
  - [ ] Live Paystack keys and webhook URL set, and one real payment plus refund tested
  - [ ] Mailgun domain verified, and confirmation email received in Gmail and Outlook
  - [ ] Google OAuth consent screen published
  - [ ] Google brand verification (Branding: logo, live domain, privacy policy, then Verification centre), so the consent screen shows "Imarhair" instead of the Supabase address
  - [ ] Optional: Supabase custom domain (e.g. `auth.imarhair.com`), so Google shows your domain. Then update the Google redirect URI to match
  - [ ] Legal pages (Privacy, Terms, Returns, Shipping) approved by Imarhair
  - [ ] Delivery rates and support contacts set in admin and config
  - [ ] Lighthouse mobile ≥ 90 on Home and a PDP
  - [ ] Seed/dev products removed or unpublished, and real catalogue loaded

## Project status

✅ **M1 Foundation complete.** This covers the Next.js 16 app shell, design tokens, header, footer, mobile menu, the full Supabase schema with RLS and seed data, email and Google auth, and protected account and admin areas.

✅ **M2 Browse complete.** This covers the full home page, Shop with URL filters/sort/Load more, Collections (with a Haircare "Coming soon" notify-me page), product pages with gallery, variant chips, live price and stock, quick-add, a browser-side bag with toast and header count, typo-tolerant search, and a wishlist that merges into the account on sign-in. It also adds `sitemap.xml` and `robots.txt`. Product photography is still to come; a branded placeholder shows until images are uploaded.

✅ **M3 Buy complete.** This covers the persistent bag (Supabase for signed-in shoppers, browser for guests, merged on sign-in, shared across devices), the bag drawer and `/cart`, single-page checkout with live server pricing, Nigerian states, saved addresses and discount codes, stock reserved for 30 minutes while paying, Paystack plus a dev-only mock provider, server-side verification via callback and signed webhook, idempotent payment confirmation, declined payment with retry, the order confirmation page, the confirmation email (Mailgun or console), and account order history and detail. The dev catalogue now uses Imarhair's photos, and the home page has a hero image.

✅ **M4 Account & Admin complete.** Admin (`/admin`, admins only) covers:
- a dashboard (sales today and this week, orders to fulfil, low stock);
- orders (search, filter, status changes with customer emails, tracking, payments, history);
- products (create and edit, options with prices and stock, photo upload from phone or computer, publish, featured and best seller);
- inventory, customers, reviews (real ones only, with the customer's consent) and discount codes.

Customers get saved addresses, account settings, and an account home showing their bag and wishlist. Catalogue edits appear in the shop immediately.

⏭ **Next: M5 Content & polish.** This covers About, Contact, FAQ, Shipping, Returns, Privacy and Terms, rate limiting, security headers, and performance and accessibility passes. After that comes deployment (Vercel plus a production Supabase project), then Paystack and Mailgun.

---

© Imarhair Limited. All rights reserved.
