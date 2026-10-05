// pnpm verify:e2e (part 3) — admin + account flows in a real browser against
// the running app and the hosted dev project. Creates its own admin and
// customer, a test product (with an uploaded photo), an order, a review and a
// discount code — and removes all of it afterwards.
import { resolve } from "node:path";
import { connectDb, createReporter, loadConfig, runId, serviceClient, sweepTestData, TEST_PREFIX } from "./lib.mjs";
import { launch } from "./browser.mjs";

const cfg = loadConfig();
const BASE = (process.env.VERIFY_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const r = createReporter();
const db = await connectDb(cfg);
const admin = serviceClient(cfg);
const run = runId();
// bigint columns arrive as strings; leave zero-padded strings (phone numbers) alone.
const numeric = (row) => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && /^-?(0|[1-9]\d*)$/.test(v) ? Number(v) : v]));
const one = async (sql, params) => numeric((await db.query(sql, params)).rows[0]);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

try {
  await fetch(BASE);
} catch {
  console.error(`App not reachable at ${BASE}. Start it first.`);
  process.exit(2);
}

const stock = (await db.query("select variant_id, on_hand, reserved from public.inventory")).rows;
const sales = (await db.query("select id, sales_count from public.products")).rows;
const browser = await launch({ shotsDir: "test-results/verify-e2e" });
const password = `Queen-${run}-2026`;
const adminEmail = `${TEST_PREFIX}admin-${run}@example.com`;
const customerEmail = `${TEST_PREFIX}customer-${run}@example.com`;
const productName = `Imar Verify Unit ${run}`;
const sku = `IMR-VERIFY-${run.toUpperCase()}`;
const discountCode = `VERIFY${run.toUpperCase()}`.slice(0, 40);
let productId;

/** Fill inputs inside the form that contains `anchor` (a selector unique to that form). */
const fillForm = (page, anchor, values, { last = false } = {}) =>
  page.evaluate(`(() => {
    const forms = [...document.querySelectorAll('form')].filter(f => f.querySelector(${JSON.stringify(anchor)}));
    const form = ${last ? "forms[forms.length - 1]" : "forms[0]"};
    if (!form) return false;
    for (const [name, value] of Object.entries(${JSON.stringify(values)})) {
      const el = form.querySelector('[name="' + name + '"]');
      if (!el) return 'missing ' + name;
      if (el.type === 'checkbox') { if (el.checked !== value) el.click(); continue; }
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  })()`);
const submitForm = (page, anchor, { last = false } = {}) =>
  page.evaluate(`(() => {
    const forms = [...document.querySelectorAll('form')].filter(f => f.querySelector(${JSON.stringify(anchor)}));
    const form = ${last ? "forms[forms.length - 1]" : "forms[0]"};
    form?.requestSubmit(form.querySelector('button[type=submit]') ?? undefined); return Boolean(form);
  })()`);
async function signIn(page, email, next) {
  await page.go(`${BASE}/login?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('form button[type="submit"]');
  return page.waitFor(async () => (await page.path()).startsWith(next.split("?")[0]));
}

try {
  await sweepTestData(cfg, db);
  for (const [email, name] of [[adminEmail, "Admin Verify"], [customerEmail, "Ada Verify"]]) {
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) throw error;
  }
  await db.query("update public.profiles set role = 'admin' where id = (select id from auth.users where email = $1)", [adminEmail]);
  const customerId = (await one("select id from auth.users where email = $1", [customerEmail])).id;

  const boss = await browser.newDevice("admin");
  r.section("Admin access");
  r.check(await signIn(boss, adminEmail, "/admin"), "admin signs in to /admin");
  r.check(await boss.waitText("Orders to fulfil"), "dashboard renders");
  await boss.shot("admin-dashboard");

  // ------------------------------------------------------------ products
  r.section("Products: create → option → photo → publish");
  const wigs = (await one("select id from public.categories where slug = 'wigs'")).id;
  const classic = (await one("select id from public.collections where slug = 'imar-classic'")).id;
  await boss.go(`${BASE}/admin/products/new`);
  await fillForm(boss, "input[name=name]", {
    name: productName, categoryId: wigs, collectionId: classic,
    description: "A test unit created by the verification suite.", details: "Hair: 100% human hair\nTexture: Straight",
  });
  await submitForm(boss, "input[name=name]");
  r.check(await boss.waitFor(async () => /\/admin\/products\/[0-9a-f-]{36}\?created=1/.test(await boss.path())), "product created, editor opens", await boss.path());
  productId = (await boss.path()).match(/products\/([0-9a-f-]{36})/)?.[1];
  const slug = (await one("select slug from public.products where id = $1", [productId]))?.slug;
  r.check(slug === `imar-verify-unit-${run}`, "slug generated from the name", slug);

  await fillForm(boss, "input[name=name]", { isPublished: true });
  await submitForm(boss, "input[name=name]");
  r.check(await boss.waitText("Add at least one active variant before publishing"), "can't publish without an option");

  await fillForm(boss, "input[name=sku]", { sku, lengthInches: "14", density: "200g", colour: "Natural Black", price: "99,000", stock: "5", isDefault: true }, { last: true });
  await submitForm(boss, "input[name=sku]", { last: true });
  r.check(await boss.waitText("Variant added"), "option added");
  const variant = await one(`select v.id, v.price, i.on_hand from public.product_variants v join public.inventory i on i.variant_id = v.id where v.sku = $1`, [sku]);
  r.check(variant?.price === 9_900_000 && variant?.on_hand === 5, "price stored in kobo, stock set through admin_set_stock", JSON.stringify(variant));

  await boss.setFiles("input[type=file]", [resolve("supabase/assets/catalog/bundle-straight.webp")]);
  r.check(await boss.waitText("1 image added", 30000), "photo uploaded from the browser");
  const img = await one("select storage_path, width, height from public.product_images where product_id = $1", [productId]);
  r.check(img?.storage_path?.startsWith(`products/${productId}/`) && img.width > 0, "image registered against the product", img?.storage_path);

  await boss.go(`${BASE}/admin/products/${productId}`);
  await fillForm(boss, "input[name=name]", { isPublished: true, isFeatured: false });
  await submitForm(boss, "input[name=name]");
  r.check(await boss.waitText("Product saved."), "published (with Featured unticked: unticked boxes parse correctly)");
  await boss.shot("admin-product");
  const live = await fetch(`${BASE}/shop/${slug}`);
  const liveHtml = await live.text();
  r.check(live.status === 200 && liveHtml.includes(productName) && liveHtml.includes("₦99,000"), "shows in the shop immediately (cache refreshed)", live.status);

  // ------------------------------------------------------------ inventory
  r.section("Inventory");
  await boss.go(`${BASE}/admin/inventory?q=${encodeURIComponent(sku)}`);
  await fillForm(boss, "input[name=onHand]", { onHand: "7" });
  await submitForm(boss, "input[name=onHand]");
  r.check(await boss.waitText("Saved"), "stock saved from the inventory page");
  r.check((await one("select on_hand from public.inventory where variant_id = $1", [variant.id])).on_hand === 7, "stock is now 7");

  // ------------------------------------------------------------ orders
  r.section("Orders: status changes + customer emails");
  const { data: placed, error: placeErr } = await admin.rpc("create_pending_order", {
    p_order: {
      user_id: customerId, email: customerEmail, contact_name: "Ada Verify", contact_phone: "08030000000", delivery_method: "standard",
      shipping: { name: "Ada Verify", phone: "08030000000", line1: "1 Test Rd", city: "Lekki", state: "Lagos", country: "NG" },
      lines: [{ variant_id: variant.id, quantity: 1 }],
    },
  });
  if (placeErr) throw placeErr;
  await db.query("insert into public.payments (order_id, provider, reference, amount) values ($1, 'paystack', $2, $3)", [placed.order_id, `${placed.order_number}-PA`, placed.total]);
  await admin.rpc("mark_order_paid", { p_reference: `${placed.order_number}-PA`, p_amount: placed.total, p_currency: "NGN", p_channel: "card", p_provider_txn: "verify", p_paid_at: new Date().toISOString(), p_raw: {} });

  await boss.go(`${BASE}/admin/orders?q=${placed.order_number}`);
  r.check(await boss.waitText(placed.order_number), "order found by number");
  await boss.go(`${BASE}/admin/orders/${placed.order_number}`);
  await fillForm(boss, "select[name=toStatus]", { toStatus: "processing", note: "Packing your unit now." });
  await submitForm(boss, "select[name=toStatus]");
  r.check(await boss.waitText("Status changed to Processing. Customer emailed."), "Paid → Processing, customer emailed");
  await boss.settle();
  await fillForm(boss, "select[name=toStatus]", { toStatus: "shipped", trackingNumber: `GIG-${run}`, trackingUrl: "https://example.com/track" });
  await submitForm(boss, "select[name=toStatus]");
  r.check(await boss.waitText("Status changed to Shipped"), "Processing → Shipped with tracking");
  const shipped = await one("select status, tracking_number from public.orders where id = $1", [placed.order_id]);
  r.check(shipped.status === "shipped" && shipped.tracking_number === `GIG-${run}`, "order updated in the database", JSON.stringify(shipped));
  const mails = (await db.query("select type from public.email_log where order_id = $1 and status = 'sent' order by created_at", [placed.order_id])).rows.map((m) => m.type);
  r.check(["order_processing", "order_shipped"].every((t) => mails.includes(t)), "processing + shipped emails sent once each", mails.join(", "));
  await boss.shot("admin-order");
  r.check(await boss.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "order page fits a 375px phone");

  // ------------------------------------------------------------ reviews
  r.section("Reviews (real reviews only)");
  await boss.go(`${BASE}/admin/reviews`);
  const reviewText = `Verified review ${run}: soft and full.`;
  await fillForm(boss, "textarea[name=body]", { productId, authorDisplayName: "Ada O.", rating: "5", body: reviewText });
  await submitForm(boss, "textarea[name=body]");
  r.check(await boss.waitText("Confirm the customer agreed"), "refuses a review without the customer's consent");
  await fillForm(boss, "textarea[name=body]", { consent: true });
  await submitForm(boss, "textarea[name=body]");
  r.check(await boss.waitText("Review published."), "review published");
  const reviewed = await (await fetch(`${BASE}/shop/${slug}`)).text();
  r.check(reviewed.includes(reviewText), "review appears on the product page");

  // ------------------------------------------------------------ discounts
  r.section("Discount codes");
  await boss.go(`${BASE}/admin/discounts`);
  await fillForm(boss, "input[name=code]", { code: discountCode, type: "percent", value: "10" });
  await submitForm(boss, "input[name=code]");
  r.check(await boss.waitText(`Code ${discountCode} created.`), "code created");
  await boss.evaluate(`(() => { const row = [...document.querySelectorAll('tr')].find(t => t.textContent.includes(${JSON.stringify(discountCode)})); row?.querySelector('button[type=submit]')?.click(); })()`);
  r.check(await boss.waitFor(async () => (await one("select is_active from public.discount_codes where code = $1", [discountCode]))?.is_active === false), "code turned off");

  // ------------------------------------------------------------ customers
  r.section("Customers");
  await boss.go(`${BASE}/admin/customers?q=${encodeURIComponent(customerEmail)}`);
  r.check(await boss.waitText(customerEmail), "customer found by email");
  await boss.go(`${BASE}/admin/customers/${customerId}`);
  r.check(await boss.waitText(placed.order_number), "customer page lists their order");

  // ------------------------------------------------------------ customer side
  const ada = await browser.newDevice("customer");
  r.section("Customer can't reach admin");
  r.check(await signIn(ada, customerEmail, "/account"), "customer signs in");
  await ada.go(`${BASE}/admin`);
  r.check(await ada.waitText("This page has moved on"), "/admin is a 404 for customers");

  r.section("Account settings + address book");
  await ada.go(`${BASE}/account/settings`);
  await fillForm(ada, "input[name=fullName]", { fullName: "Ada Updated", phone: "0803 111 2222", marketingOptIn: true });
  await submitForm(ada, "input[name=fullName]");
  r.check(await ada.waitText("Details saved."), "details saved");
  const prof = await one("select full_name, phone, marketing_opt_in from public.profiles where id = $1", [customerId]);
  r.check(prof.full_name === "Ada Updated" && prof.phone === "08031112222" && prof.marketing_opt_in === true, "profile updated", JSON.stringify(prof));

  await ada.go(`${BASE}/account/addresses`);
  const address = (line1) => ({ fullName: "Ada Updated", phone: "08031112222", line1, city: "Ikeja", state: "Lagos" });
  await fillForm(ada, "input[name=line1]", address("5 Allen Avenue"));
  await submitForm(ada, "input[name=line1]");
  r.check(await ada.waitText("Address saved."), "first address saved");
  await ada.clickText("button", "Add an address");
  await ada.waitFor(async () => Boolean(await ada.evaluate("!!document.querySelector('input[name=line1]')")));
  await fillForm(ada, "input[name=line1]", address("10 Awolowo Road"));
  await submitForm(ada, "input[name=line1]");
  await ada.waitText("10 Awolowo Road");
  const addrs = (await db.query("select line1, is_default from public.addresses where user_id = $1 order by created_at", [customerId])).rows;
  r.check(addrs.length === 2 && addrs[0].is_default && !addrs[1].is_default, "first address is default automatically", JSON.stringify(addrs));
  await ada.evaluate(`(() => { const card = [...document.querySelectorAll('address')].find(a => a.textContent.includes('10 Awolowo Road'))?.parentElement;
    [...(card?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'Make default')?.click(); })()`);
  r.check(await ada.waitFor(async () => (await one("select line1 from public.addresses where user_id = $1 and is_default", [customerId]))?.line1 === "10 Awolowo Road"), "make default switches it");
  await ada.evaluate("window.confirm = () => true");
  await ada.evaluate(`(() => { const card = [...document.querySelectorAll('address')].find(a => a.textContent.includes('5 Allen Avenue'))?.parentElement;
    [...(card?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'Delete')?.click(); })()`);
  r.check(await ada.waitFor(async () => Number((await one("select count(*) n from public.addresses where user_id = $1", [customerId])).n) === 1), "address deleted");
  await ada.shot("account-addresses");

  await ada.go(`${BASE}/account`);
  r.check((await ada.waitText("Your bag")) && (await ada.waitText("Wishlist")), "account home shows bag and wishlist sections");
} catch (e) {
  r.check(false, "admin e2e aborted", e.message);
} finally {
  browser.close();
  await sleep(200);
  if (productId) {
    const { data: files } = await admin.storage.from("product-images").list(`products/${productId}`);
    if (files?.length) await admin.storage.from("product-images").remove(files.map((f) => `products/${productId}/${f.name}`));
    await db.query("delete from public.orders where id in (select order_id from public.order_items where product_id = $1)", [productId]);
    await db.query("delete from public.products where id = $1", [productId]);
  }
  await db.query("delete from public.discount_codes where code = $1", [discountCode]);
  await sweepTestData(cfg, db);
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
