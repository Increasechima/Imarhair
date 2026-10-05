// pnpm verify:e2e (part 2) — real browser checkout against the running app,
// backed by the hosted dev project, using PAYMENT_PROVIDER=mock on the app.
// Covers: guest purchase, declined payment + retry, and the persistent bag
// across two isolated "devices" for a signed-in customer (prd.md §9).
// Restores stock and sales counts it consumed, and deletes everything it made.
import { connectDb, createReporter, loadConfig, runId, serviceClient, sweepTestData, TEST_PREFIX } from "./lib.mjs";
import { launch } from "./browser.mjs";

const cfg = loadConfig();
const BASE = (process.env.VERIFY_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const r = createReporter();
const db = await connectDb(cfg);
const admin = serviceClient(cfg);
const run = runId();
// pg returns bigint (money) columns as strings; coerce numeric-looking fields.
const numeric = (row) => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && /^-?\d+$/.test(v) ? Number(v) : v]));
const one = async (sql, params) => numeric((await db.query(sql, params)).rows[0]);
const naira = (kobo) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

try {
  const probe = await fetch(`${BASE}/dev/mock-pay?reference=probe`);
  if (probe.status === 500) throw new Error("app error on /dev/mock-pay");
} catch (e) {
  console.error(`App not reachable at ${BASE} (${e.message}). Start it with PAYMENT_PROVIDER=mock.`);
  process.exit(2);
}

const stock = (await db.query("select variant_id, on_hand, reserved from public.inventory")).rows;
const sales = (await db.query("select id, sales_count from public.products")).rows;
const browser = await launch({ shotsDir: "test-results/verify-e2e" });
const guestEmail = `${TEST_PREFIX}guest-${run}@example.com`;
const userEmail = `${TEST_PREFIX}buyer-${run}@example.com`;
const password = `Queen-${run}-2026`;
let userId;

async function fillCheckout(page, { email } = {}) {
  await page.waitFor(async () => Boolean(await page.evaluate("!!document.querySelector('input[name=fullName]')")));
  await page.fill("input[name=fullName]", "Ada Verify");
  if (email) await page.fill("input[name=email]", email);
  await page.fill("input[name=phone]", "0803 000 0000");
  await page.fill("input[name=line1]", "12 Admiralty Way");
  await page.fill("input[name=city]", "Lekki");
  await page.fill("select[name=state]", "Lagos");
}
const pay = (page) => page.click("form button[type=submit]");

try {
  await sweepTestData(cfg, db);
  const lagosStandard = (await one(`select r.price from public.delivery_rates r join public.delivery_methods m on m.id = r.method_id
    where m.code = 'standard' and r.zone = 'lagos'`)).price;

  // ---------------------------------------------------------------- guest
  r.section("Guest checkout (mock payment provider)");
  const guest = await browser.newDevice("guest");
  const bob = await one(`select v.id, v.price, i.on_hand from public.product_variants v join public.inventory i on i.variant_id = v.id
    where v.sku = 'IMR-CL-BOB08-CU'`);
  await guest.go(`${BASE}/shop/imar-classic-8-straight-bob`);
  await guest.clickText("main button", "Add to Cart");
  r.check(await guest.waitFor(async () => (await guest.bagLabel()) === "Bag, 1 item"), "add to bag as a guest", await guest.bagLabel());
  await guest.click('a[aria-label^="Bag"]');
  r.check(await guest.waitText("Your bag (1)") && (await guest.waitText(naira(bob.price))), "bag drawer shows the line with its server price");
  await guest.shot("checkout-drawer");

  await guest.go(`${BASE}/checkout`);
  await fillCheckout(guest, { email: guestEmail });
  const expected = bob.price + lagosStandard;
  r.check(await guest.waitText(`Pay ${naira(expected)}`), `checkout total = item + Lagos standard delivery (${naira(expected)})`);
  await guest.shot("checkout-form");
  await pay(guest);
  r.check(await guest.waitFor(async () => (await guest.path()).startsWith("/dev/mock-pay")), "Pay Now opens the payment page", await guest.path());
  const pending = await one("select status, total from public.orders where email = $1", [guestEmail]);
  r.check(pending?.status === "pending_payment" && pending.total === expected, "order is Pending Payment before paying", JSON.stringify(pending));
  const held = await one("select on_hand, reserved from public.inventory where variant_id = $1", [bob.id]);
  r.check(held.reserved === 1 && held.on_hand === bob.on_hand, "stock reserved (not yet sold) while paying");
  await guest.clickText("button", "Pay successfully");
  r.check(await guest.waitText("Order Confirmed!"), "confirmation page after verified payment");
  await guest.shot("checkout-confirmed");
  const paid = await one(`select o.id, o.status, o.order_number, o.paid_at is not null as has_paid_at,
      (select count(*)::int from public.payments p where p.order_id = o.id and p.status = 'success') as payments
    from public.orders o where o.email = $1`, [guestEmail]);
  r.check(paid.status === "paid" && paid.has_paid_at && paid.payments === 1, "order marked Paid only after server verification", JSON.stringify(paid));
  r.check(/^IMR-\d{8}-\d{3,}$/.test(paid.order_number) && (await guest.text()).includes(paid.order_number), `order number shown (${paid.order_number})`);
  const after = await one("select on_hand, reserved from public.inventory where variant_id = $1", [bob.id]);
  r.check(after.on_hand === bob.on_hand - 1 && after.reserved === 0, "stock committed: on_hand −1, hold released", JSON.stringify(after));
  const mail = await one("select count(*)::int n from public.email_log where order_id = $1 and type = 'order_confirmation' and status = 'sent'", [paid.id]);
  r.check(mail.n === 1, "order confirmation email sent exactly once");
  r.check(await guest.waitFor(async () => (await guest.bagLabel()) === "Bag"), "purchased item removed from the guest bag", await guest.bagLabel());

  r.section("Declined payment → bag kept → retry");
  await guest.go(`${BASE}/shop/imar-straight-bundle`);
  await guest.clickText("main button", "Add to Cart");
  await guest.waitFor(async () => (await guest.bagLabel()) === "Bag, 1 item");
  await guest.go(`${BASE}/checkout`);
  await fillCheckout(guest, { email: guestEmail });
  await guest.waitText("Pay ₦");
  await guest.waitFor(async () => Boolean(await guest.evaluate("!document.querySelector('form button[type=submit]')?.disabled")));
  await pay(guest);
  await guest.waitFor(async () => (await guest.path()).startsWith("/dev/mock-pay"));
  await guest.clickText("button", "Simulate a declined payment");
  r.check(await guest.waitText("Your payment didn't go through"), "declined payment shows a clear message");
  const declined = await one(`select o.status, (select status from public.payments p where p.order_id = o.id order by created_at desc limit 1) as pay
    from public.orders o where o.email = $1 and o.status <> 'paid'`, [guestEmail]);
  r.check(declined?.status === "pending_payment" && declined?.pay === "failed", "order stays Pending Payment; attempt recorded as failed", JSON.stringify(declined));
  r.check(await guest.waitFor(async () => (await guest.bagLabel()) === "Bag, 1 item"), "bag NOT cleared after a failed payment", await guest.bagLabel());
  await guest.shot("checkout-declined");
  await guest.clickText("button", "Retry payment");
  r.check(await guest.waitFor(async () => (await guest.path()).startsWith("/dev/mock-pay")), "retry opens a new payment attempt");
  await guest.clickText("button", "Pay successfully");
  r.check(await guest.waitText("Order Confirmed!"), "retry succeeds");
  const retried = await one(`select (select count(*)::int from public.payments p where p.order_id = o.id) as attempts, o.status
    from public.orders o where o.email = $1 order by created_at desc limit 1`, [guestEmail]);
  r.check(retried.status === "paid" && retried.attempts === 2, "same order paid on the second attempt", JSON.stringify(retried));

  // ---------------------------------------------------------------- signed in, two devices
  r.section("Persistent bag across devices (signed in)");
  const { data: u, error } = await admin.auth.admin.createUser({ email: userEmail, password, email_confirm: true, user_metadata: { full_name: "Chioma Verify" } });
  if (error) throw error;
  userId = u.user.id;
  const signIn = async (page, next) => {
    await page.go(`${BASE}/login?next=${encodeURIComponent(next)}`);
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', password);
    await page.click('form button[type="submit"]');
    return page.waitFor(async () => (await page.path()) === next);
  };

  const laptop = await browser.newDevice("laptop");
  r.check(await signIn(laptop, "/shop/imar-classic-straight-fringe-unit"), "signed in on device 1");
  await laptop.settle();
  await laptop.clickText("main button", "Add to Cart");
  r.check(await laptop.waitFor(async () => (await laptop.bagLabel()) === "Bag, 1 item"), "device 1: added to bag");
  const saved = await one(`select count(*)::int n from public.cart_items ci join public.carts c on c.id = ci.cart_id where c.user_id = $1`, [userId]);
  r.check(saved.n === 1, "bag line stored in Supabase against the user");

  const phone = await browser.newDevice("phone");
  r.check(await signIn(phone, "/"), "signed in on device 2 (fresh browser, empty storage)");
  r.check(await phone.waitFor(async () => (await phone.bagLabel()) === "Bag, 1 item"), "device 2: bag restored from Supabase", await phone.bagLabel());
  await phone.shot("checkout-second-device");

  r.section("Live sync between devices");
  await phone.go(`${BASE}/shop/imar-straight-bundle`);
  await phone.clickText("main button", "Add to Cart");
  r.check(await phone.waitFor(async () => (await phone.bagLabel()) === "Bag, 2 items"), "device 2: adds a second item");
  await new Promise((res) => setTimeout(res, 3200)); // past the 3s sync throttle
  await laptop.go(`${BASE}/collections`);
  r.check(await laptop.waitFor(async () => (await laptop.bagLabel()) === "Bag, 2 items"), "device 1: moving to another page picks up the new item", await laptop.bagLabel());
  await phone.click('a[aria-label^="Bag"]');
  await phone.waitText("Your bag (2)");
  await phone.evaluate(`(() => { const li = [...document.querySelectorAll('[role=dialog] li')].find(l => l.textContent.includes('Imar Straight Bundle'));
    [...(li?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'Remove')?.click(); })()`);
  r.check(await phone.waitFor(async () => (await phone.bagLabel()) === "Bag, 1 item"), "device 2: removes it");
  await phone.evaluate("document.querySelector('[role=dialog] button[aria-label=\"Close bag\"]')?.click()");
  await new Promise((res) => setTimeout(res, 3200));
  await laptop.evaluate("window.dispatchEvent(new Event('focus'))"); // shopper returns to the laptop tab
  r.check(await laptop.waitFor(async () => (await laptop.bagLabel()) === "Bag, 1 item"), "device 1: returning to the tab drops the removed item", await laptop.bagLabel());

  await phone.go(`${BASE}/checkout`);
  const prefilled = await phone.evaluate("document.querySelector('input[name=email]')?.value");
  r.check(prefilled === userEmail, "checkout pre-fills the account email");
  await fillCheckout(phone);
  await phone.waitText("Pay ₦");
  await phone.waitFor(async () => Boolean(await phone.evaluate("!document.querySelector('form button[type=submit]')?.disabled")));
  await pay(phone);
  await phone.waitFor(async () => (await phone.path()).startsWith("/dev/mock-pay"));
  await phone.clickText("button", "Pay successfully");
  r.check(await phone.waitText("Order Confirmed!"), "signed-in purchase confirmed");
  r.check(await phone.waitText("View my order"), "confirmation offers View my order");
  const order = await one("select order_number, user_id from public.orders where email = $1", [userEmail]);
  r.check(order?.user_id === userId, "order linked to the customer");
  const left = await one(`select count(*)::int n from public.cart_items ci join public.carts c on c.id = ci.cart_id where c.user_id = $1`, [userId]);
  r.check(left.n === 0, "purchased line removed from the Supabase bag");
  const addr = await one("select count(*)::int n from public.addresses where user_id = $1", [userId]);
  r.check(addr.n === 1, "address saved for next time");
  await phone.go(`${BASE}/account/orders`);
  r.check(await phone.waitText(`Order #${order.order_number}`), "order appears in the account");
  await phone.go(`${BASE}/account/orders/${order.order_number}`);
  r.check((await phone.waitText("Paid")) && (await phone.waitText("12 Admiralty Way")), "order detail shows status and address");
  await phone.shot("account-order");

  await laptop.click('a[aria-label^="Bag"]');
  r.check(await laptop.waitText("Your bag is empty."), "device 1 sees the bag emptied after purchase on device 2");

  r.section("Access control");
  const guestOrder = await one("select order_number from public.orders where email = $1 order by created_at limit 1", [guestEmail]);
  const noToken = await fetch(`${BASE}/checkout/confirmation/${guestOrder.order_number}`);
  r.check(noToken.status === 404, "guest confirmation page needs its private token", noToken.status);
  const wrongToken = await fetch(`${BASE}/checkout/confirmation/${guestOrder.order_number}?t=${"0".repeat(64)}`);
  r.check(wrongToken.status === 404, "wrong token is rejected", wrongToken.status);
  await phone.go(`${BASE}/account/orders/${guestOrder.order_number}`);
  r.check(await phone.waitText("This page has moved on"), "a customer cannot open someone else's order");
} catch (e) {
  r.check(false, "checkout e2e aborted", e.message);
} finally {
  browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  await sweepTestData(cfg, db);
  // Put back the stock and sales counts the test purchases consumed.
  for (const s of stock) {
    await db.query("update public.inventory set on_hand = $2, reserved = $3 where variant_id = $1 and (on_hand <> $2 or reserved <> $3)", [s.variant_id, s.on_hand, s.reserved]);
  }
  for (const p of sales) {
    await db.query("update public.products set sales_count = $2 where id = $1 and sales_count <> $2", [p.id, p.sales_count]);
  }
  await db.end();
  const { passed, failed } = r.state;
  console.log(`\nScreenshots: test-results/verify-e2e/\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
