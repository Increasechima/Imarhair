// pnpm verify:e2e — drives a real headless browser (Edge/Chrome over CDP, 375px
// mobile viewport) through the running app, backed by the hosted project.
// Start the app first (pnpm build && pnpm start, or pnpm dev).
// Env: VERIFY_BASE_URL (default http://localhost:3000), BROWSER_PATH (optional).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectDb, createReporter, loadConfig, runId, serviceClient, sweepTestData, TEST_PREFIX } from "./lib.mjs";

const cfg = loadConfig();
const BASE = (process.env.VERIFY_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SHOTS = "test-results/verify-e2e";
const r = createReporter();
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const browserPath = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));
if (!browserPath) { console.error("No Chrome/Edge found. Set BROWSER_PATH."); process.exit(2); }
try { await fetch(BASE); } catch { console.error(`App not reachable at ${BASE}. Start it first.`); process.exit(2); }

const db = await connectDb(cfg);
const admin = serviceClient(cfg);
const run = runId();
const email = `${TEST_PREFIX}e2e-${run}@example.com`;
const password = `Queen-${run}-2026`;
let userId;

// ---- minimal CDP driver
const port = 9400 + Math.floor(Math.random() * 400);
const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "imar-verify-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); }
  catch { await sleep(200); }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener("open", res, { once: true }));
let msgId = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++msgId; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await send("Page.enable");

// Wait for load AND React hydration (hydrated nodes carry __reactFiber keys), so
// clicks never land on not-yet-interactive server HTML.
const hydrated = `(() => { const el = document.querySelector("header") ?? document.body; return document.readyState === "complete" && Object.keys(el).some((k) => k.startsWith("__reactFiber")); })()`;
const settle = async () => { await sleep(500); for (let i = 0; i < 80 && !(await evaluate(hydrated)); i++) await sleep(250); await sleep(300); };
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await settle(); };
const path = () => evaluate("location.pathname + location.search");
const text = () => evaluate("document.body.innerText");
const waitFor = async (pred, timeout = 15000) => { const t = Date.now(); while (Date.now() - t < timeout) { if (await pred()) return true; await sleep(300); } return false; };
const waitText = (s) => waitFor(async () => (await text()).replace(/’/g, "'").includes(s));
const fill = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const click = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.click() ?? false`);
const shot = async (name) => { mkdirSync(SHOTS, { recursive: true }); const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(s.result.data, "base64")); };
const noOverflow = () => evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth");

try {
  await sweepTestData(cfg, db);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Ngozi Verify" } });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Verifying ${BASE} against Supabase project ${cfg.ref}`);

  r.section("Pages render at 375px without horizontal scroll");
  for (const p of ["/", "/login", "/signup", "/forgot-password"]) {
    await go(p);
    r.check(await noOverflow(), `${p} fits the mobile viewport`);
  }

  r.section("Guest protection");
  await go("/account");
  r.check((await path()).startsWith("/login?next=%2Faccount"), "guest /account → /login?next=/account", await path());
  await go("/admin");
  r.check((await path()).startsWith("/login?next=%2Fadmin"), "guest /admin → /login", await path());

  r.section("Sign-in");
  await go("/login");
  await fill('input[name="email"]', "not-an-email"); await fill('input[name="password"]', "x");
  await click('form button[type="submit"]');
  r.check(await waitText("Enter a valid email address"), "invalid email shows inline error");
  await go("/login");
  await fill('input[name="email"]', email); await fill('input[name="password"]', "Wrong-password-1");
  await click('form button[type="submit"]');
  r.check(await waitText("don't match"), "wrong password shows friendly error");
  await go("/account");
  await fill('input[name="email"]', email); await fill('input[name="password"]', password);
  await click('form button[type="submit"]');
  r.check(await waitFor(async () => (await path()) === "/account"), "sign-in returns to the ?next page", await path());
  r.check(await waitText("Welcome back, Queen."), "account greets 'Welcome back, Queen.'");
  r.check((await text()).includes("Signed in as Ngozi"), "account shows the Supabase profile name");
  await shot("account");
  await go("/login");
  r.check((await path()) === "/account", "signed-in visitor to /login is sent to /account", await path());

  r.section("Admin gate");
  await go("/admin");
  r.check((await text()).includes("This page has moved on"), "customer gets a 404 on /admin");
  await db.query("update public.profiles set role = 'admin' where id = $1", [userId]);
  await go("/admin");
  const expected = (await db.query(`select (select count(*) from public.products)::text a,
    (select count(*) from public.products where is_published)::text b, (select count(*) from public.orders)::text c`)).rows[0];
  const shown = await evaluate("[...document.querySelectorAll('dd')].map(d => d.textContent.trim())");
  r.check(JSON.stringify(shown) === JSON.stringify([expected.a, expected.b, expected.c]), "admin dashboard shows live counts", JSON.stringify(shown));
  await shot("admin");

  r.section("Sign out");
  await go("/account");
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Log out')?.click()");
  r.check(await waitFor(async () => (await path()) === "/"), "log out returns home", await path());
  await go("/account");
  r.check((await path()).startsWith("/login"), "/account needs sign-in again", await path());

  r.section("Newsletter + auth link errors");
  await go("/");
  const nl = `${TEST_PREFIX}e2e-news-${run}@example.com`;
  await fill("#newsletter-email", nl);
  await click('footer form button[type="submit"]');
  r.check(await waitText("You're on the list"), "footer newsletter shows success");
  const row = (await db.query("select source from public.newsletter_subscribers where email = $1", [nl])).rows[0];
  r.check(row?.source === "footer", "subscriber stored in Supabase");
  await go("/auth/confirm?token_hash=bogus&type=email");
  r.check((await path()) === "/login?error=link_expired" && (await text()).includes("That link has expired"), "bad email link → expired message");
  await go("/auth/callback?code=bogus");
  r.check((await path()) === "/login?error=auth", "bad OAuth code → login error");

  r.section("Sign-up validation (no email is sent)");
  await go("/signup");
  await fill('input[name="fullName"]', "A"); await fill('input[name="email"]', "ngozi@example"); await fill('input[name="password"]', "short");
  await click('form button[type="submit"]');
  r.check(await waitFor(async () => { const t = await text(); return t.includes("Enter your name") && t.includes("Enter a valid email address") && t.includes("Use at least 8 characters"); }),
    "server-side field errors render");

  // ------------------------------------------------------------------ M2
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const productCount = async () => Number(await evaluate("document.querySelectorAll('main article h3').length"));
  const bagLabel = () => evaluate("document.querySelector('a[aria-label^=\"Bag\"]')?.getAttribute('aria-label')");
  const clickButtonInArticle = (heading, label) => evaluate(`(() => {
    const art = [...document.querySelectorAll('main article')].find(a => a.querySelector('h3')?.textContent.trim() === ${JSON.stringify(heading)});
    const btn = art && [...art.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)});
    if (!btn) return false; btn.click(); return true; })()`);
  const clickByText = (selector, label) => evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim() === ${JSON.stringify(label)});
    if (!el) return false; el.click(); return true; })()`);

  r.section("Home + catalogue pages");
  await evaluate("localStorage.clear()");
  await go("/");
  const home = await text();
  r.check(home.includes("Classy. Confident. IMAR") && home.includes("Find your look") && home.includes("Loved by our Queens"),
    "home shows hero, collections and best sellers");
  const reviewsApproved = (await one("select count(*)::int n from public.reviews where is_approved")).n;
  r.check(home.includes("From our customers") === reviewsApproved > 0, "reviews section only appears when approved reviews exist", `${reviewsApproved} approved`);
  r.check(await noOverflow(), "home fits 375px");
  const published = (await one("select count(*)::int n from public.products where is_published")).n;
  await go("/shop");
  r.check((await productCount()) === Math.min(published, 24) && (await noOverflow()), `shop lists all ${published} published products and fits 375px`);
  const len20 = (await one(`select count(distinct p.id)::int n from public.products p join public.product_variants v on v.product_id = p.id
    where p.is_published and v.is_active and v.length_inches = 20`)).n;
  await go("/shop?length=20");
  r.check((await productCount()) === len20, `length filter (20") matches the database`, `${len20}`);
  await go("/shop?sort=price-asc");
  const cheapest = (await one(`select p.name from public.products p join public.product_variants v on v.product_id = p.id
    where p.is_published and v.is_active group by p.id, p.name order by min(v.price), p.id limit 1`)).name;
  const firstName = await evaluate("document.querySelector('main article h3')?.textContent.trim()");
  r.check(firstName === cheapest, "price low→high puts the cheapest product first", firstName);
  await go("/search?q=bouncey");
  r.check((await text()).includes('Imar Prime 16" Bouncy Unit'), "search tolerates typos ('bouncey')");
  await go("/collections/haircare");
  r.check((await text()).includes("Be the first to know"), "Haircare shows Coming soon + notify me");
  const unpublished = (await one("select slug from public.products where not is_published limit 1"))?.slug;
  if (unpublished) {
    const status = (await fetch(`${BASE}/shop/${unpublished}`)).status;
    r.check(status === 404, "unpublished product returns 404", status);
  }

  r.section("Product page + bag");
  await go("/shop/imar-classic-body-wave-unit");
  const vPick = (await one("select price from public.product_variants where sku = 'IMR-CL-BW20'"))?.price;
  const fmt = (kobo) => `₦${(kobo / 100).toLocaleString("en-NG")}`;
  await clickByText('button[role="radio"]', '20"');
  r.check(await waitText(fmt(vPick)), `choosing 20" updates the price to ${fmt(vPick)}`);
  const soldOutChip = await evaluate(`[...document.querySelectorAll('button[role="radio"]')].find(b => b.textContent.startsWith('24"'))?.disabled`);
  const has24Stock = (await one("select available from public.variant_availability va join public.product_variants v on v.id = va.variant_id where v.sku = 'IMR-CL-BW24'"))?.available;
  r.check(soldOutChip === (has24Stock === 0), "sold-out length chip is disabled", `available=${has24Stock}`);
  await clickByText("main button", "Add to Cart");
  r.check(await waitText("Added to your bag"), "Add to Cart shows 'Added to your bag'");
  r.check(await waitFor(async () => (await bagLabel()) === "Bag, 1 item"), "bag count shows 1", await bagLabel());
  await shot("pdp-added");
  const stored = await evaluate("localStorage.getItem('imar.cart.v1')");
  const storedLines = JSON.parse(stored ?? "[]");
  const vPickId = (await one("select id from public.product_variants where sku = 'IMR-CL-BW20'")).id;
  r.check(storedLines.length === 1 && storedLines[0].variantId === vPickId && storedLines[0].quantity === 1, "bag stores only variant id + quantity");

  await go("/shop");
  const single = (await one(`select p.name from public.products p where p.is_published and
    (select count(*) from public.product_variants v where v.product_id = p.id and v.is_active) = 1
    and exists (select 1 from public.variant_availability va where va.product_id = p.id and va.available > 0) limit 1`))?.name;
  if (single) {
    await clickButtonInArticle(single, "Add to Cart");
    r.check(await waitFor(async () => (await bagLabel()) === "Bag, 2 items"), "quick add (one variant) adds straight to the bag", await bagLabel());
  }
  await clickButtonInArticle("Imar Classic Body Wave Unit", "Add to Cart");
  r.check(await waitFor(async () => await evaluate("!!document.querySelector('[role=dialog] button[role=radio]')")), "quick add (several variants) opens the option picker");
  await shot("quick-add");
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Add to Cart')?.click()");
  r.check(await waitFor(async () => (await bagLabel()) === "Bag, 3 items"), "adding from the picker increases the bag", await bagLabel());

  r.section("Wishlist (guest → account)");
  await evaluate("localStorage.removeItem('imar.wishlist.v1')");
  await go("/shop/imar-classic-straight-fringe-unit");
  await click('button[aria-label^="Save Imar Classic Straight Fringe Unit"]');
  r.check(await waitFor(async () => await evaluate("!!document.querySelector('button[aria-label^=\"Remove Imar Classic Straight Fringe Unit\"]')")), "guest heart toggles on");
  await go("/wishlist");
  r.check(await waitText("Imar Classic Straight Fringe Unit"), "guest /wishlist shows the saved product");
  await go("/login?next=%2Faccount%2Fwishlist");
  await fill('input[name="email"]', email); await fill('input[name="password"]', password);
  await click('form button[type="submit"]');
  r.check(await waitFor(async () => (await path()) === "/account/wishlist"), "sign-in returns to account wishlist", await path());
  r.check(await waitText("Imar Classic Straight Fringe Unit"), "guest wishlist merged into the account on sign-in");
  const saved = (await one(`select count(*)::int n from public.wishlist_items wi join public.wishlists w on w.id = wi.wishlist_id
    join public.products p on p.id = wi.product_id where w.user_id = $1 and p.slug = 'imar-classic-straight-fringe-unit'`, [userId])).n;
  r.check(saved === 1, "merged item stored in Supabase");
  r.check((await evaluate("localStorage.getItem('imar.wishlist.v1')")) === "[]", "local guest wishlist cleared after merge");
  await click('button[aria-label^="Remove Imar Classic Straight Fringe Unit"]');
  r.check(await waitFor(async () => (await one(`select count(*)::int n from public.wishlist_items wi join public.wishlists w on w.id = wi.wishlist_id where w.user_id = $1`, [userId])).n === 0),
    "removing while signed in deletes it in Supabase");
  r.check(await waitText("Save the looks you love."), "empty wishlist state shows");
} catch (e) {
  r.check(false, "e2e aborted", e.message);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  await sweepTestData(cfg, db);
  await db.end();
  ws.close();
  browser.kill();
  const { passed, failed } = r.state;
  console.log(`\nScreenshots: ${SHOTS}/\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
