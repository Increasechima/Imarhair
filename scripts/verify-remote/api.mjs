// Live checks through Supabase Auth + PostgREST with the app's own keys.
// Test users are created with the Admin API (no emails are sent) and every
// user/row created here is deleted in `finally`.
import { anonClient, serviceClient, TEST_PREFIX } from "./lib.mjs";

export async function verifyApi(cfg, db, r, run) {
  const admin = serviceClient(cfg);
  const anon = anonClient(cfg);
  const email = (who) => `${TEST_PREFIX}${who}-${run}@example.com`;
  const password = `Queen-${run}-2026`;
  const userIds = [];
  // Digits only (order_number check constraint); 1999-01-01 keeps them clear of real orders.
  const seq = String(Date.now()).slice(-4);
  const orderNumbers = [`IMR-19990101-${seq}1`, `IMR-19990101-${seq}2`];

  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const signIn = async (address) => {
    const c = anonClient(cfg);
    const { data, error } = await c.auth.signInWithPassword({ email: address, password });
    if (error) throw new Error(`sign-in failed for ${address}: ${error.code}`);
    return { c, user: data.user, session: data.session };
  };

  try {
    // ------------------------------------------------------------ anonymous
    r.section("Anonymous visitor (anon key)");
    const counts = await one(`select count(*) filter (where is_published)::int published,
      count(*) filter (where not is_published)::int unpublished from public.products`);
    const prods = await anon.from("products").select("id, is_published");
    r.check(!prods.error && prods.data.length === counts.published && prods.data.every((p) => p.is_published),
      `sees exactly the ${counts.published} published products`, prods.error?.message ?? prods.data.length);
    const pubVariants = (await one(`select count(*)::int n from public.product_variants v join public.products p on p.id = v.product_id
      where p.is_published and v.is_active`)).n;
    const vars = await anon.from("product_variants").select("id");
    r.check(!vars.error && vars.data.length === pubVariants, "sees only active variants of published products", vars.data?.length);
    const listing = await anon.from("product_listing").select("id, slug");
    r.check(!listing.error && listing.data.length === counts.published, "product_listing shows only published products", listing.error?.message ?? listing.data.length);
    const hiddenSlug = (await one("select slug from public.products where not is_published limit 1"))?.slug;
    if (hiddenSlug) {
      const word = hiddenSlug.split("-").slice(1, 3).join(" ");
      const found = await anon.rpc("search_products", { p_q: word }).select("slug");
      r.check(!found.error && !found.data.some((p) => p.slug === hiddenSlug), "search never returns unpublished products", found.error?.message ?? word);
    }
    const typo = await anon.rpc("search_products", { p_q: "bouncey" }).select("slug");
    r.check(!typo.error && Array.isArray(typo.data), "search_products callable by anon", typo.error?.message);
    const inv = await anon.from("inventory").select("variant_id");
    r.check(inv.error?.code === "42501", "inventory table is denied", inv.error?.code ?? "readable!");
    const av = await anon.from("variant_availability").select("variant_id");
    r.check(!av.error && av.data.length === pubVariants, "stock availability view is readable", av.data?.length);
    const unapproved = await anon.from("reviews").select("id").eq("is_approved", false);
    r.check(!unapproved.error && unapproved.data.length === 0, "unapproved reviews are hidden");
    const nl = email("news");
    const n1 = await anon.from("newsletter_subscribers").insert({ email: nl, source: "footer" });
    r.check(!n1.error, "newsletter subscribe works", n1.error?.message);
    const n2 = await anon.from("newsletter_subscribers").insert({ email: nl.toUpperCase(), source: "footer" });
    r.check(n2.error?.code === "23505", "duplicate subscription (any case) rejected", n2.error?.code);
    const nRead = await anon.from("newsletter_subscribers").select("email");
    r.check(!!nRead.error, "subscriber list is not readable", nRead.error?.code ?? "readable!");
    for (const fn of [["merge_cart", { p_lines: [] }], ["merge_wishlist", { p_product_ids: [] }], ["next_order_number", {}]]) {
      const res = await anon.rpc(fn[0], fn[1]);
      r.check(!!res.error, `anon cannot call ${fn[0]}`, res.error?.code ?? "allowed!");
    }

    // ------------------------------------------------------------ auth
    r.section("Auth (real Supabase Auth)");
    for (const [who, meta, confirm] of [["ada", { full_name: "Ada Verify" }, true], ["bisi", { name: "Bisi Verify" }, true], ["chi", {}, false]]) {
      const { data, error } = await admin.auth.admin.createUser({ email: email(who), password, email_confirm: confirm, user_metadata: meta });
      r.check(!error, `create ${confirm ? "confirmed" : "unconfirmed"} user ${who}`, error?.message);
      if (data?.user) userIds.push(data.user.id);
    }
    const [adaId, bisiId, chiId] = userIds;
    const created = (await db.query(`select p.full_name, p.role,
        (select count(*) from public.carts c where c.user_id = p.id)::int carts,
        (select count(*) from public.wishlists w where w.user_id = p.id)::int wishlists
      from public.profiles p where p.id = any($1::uuid[]) order by p.created_at`, [userIds])).rows;
    r.check(created.length === 3 && created.every((p) => p.carts === 1 && p.wishlists === 1 && p.role === "customer"),
      "signup trigger: profile + cart + wishlist, role customer");
    r.check(created.some((p) => p.full_name === "Ada Verify") && created.some((p) => p.full_name === "Bisi Verify"),
      "profile name taken from full_name / name metadata");
    const wrong = await anonClient(cfg).auth.signInWithPassword({ email: email("ada"), password: "Wrong-password-1" });
    r.check(wrong.error?.code === "invalid_credentials", "wrong password rejected", wrong.error?.code);
    const unconf = await anonClient(cfg).auth.signInWithPassword({ email: email("chi"), password });
    r.check(unconf.error?.code === "email_not_confirmed", "unconfirmed email cannot sign in", unconf.error?.code);
    const weak = await admin.auth.admin.createUser({ email: email("weak"), password: "abc", email_confirm: true });
    if (weak.data?.user) userIds.push(weak.data.user.id);
    r.check(!!weak.error, "weak password rejected by Auth policy", weak.error?.code ?? "accepted!");
    const A = await signIn(email("ada"));
    const B = await signIn(email("bisi"));
    r.check(A.user.id === adaId && !!A.session.access_token, "confirmed user signs in");
    const claims = await A.c.auth.getClaims();
    r.check(claims.data?.claims?.sub === adaId, "getClaims() verifies the JWT");
    const refreshed = await A.c.auth.refreshSession();
    r.check(!refreshed.error && !!refreshed.data.session, "session refresh works", refreshed.error?.message);

    // ------------------------------------------------------------ customer data
    r.section("Customer data operations (through RLS)");
    const prof = await A.c.from("profiles").select("id");
    r.check(prof.data?.length === 1 && prof.data[0].id === adaId, "reads only her own profile");
    const nameUpd = await A.c.from("profiles").update({ full_name: "Ada V." }).eq("id", adaId).select("full_name");
    r.check(nameUpd.data?.[0]?.full_name === "Ada V.", "updates her own name", nameUpd.error?.message);
    const roleUpd = await A.c.from("profiles").update({ role: "admin" }).eq("id", adaId);
    r.check(roleUpd.error?.code === "42501", "cannot make herself admin", roleUpd.error?.code ?? "allowed!");
    r.check((await A.c.rpc("is_admin")).data === false, "is_admin() is false for a customer");

    const plenty = await one(`select variant_id id, available from public.variant_availability where available >= 10 limit 1`);
    const low = await one(`select variant_id id, available from public.variant_availability where available between 1 and 4 limit 1`);
    const hidden = await one(`select v.id from public.product_variants v join public.products p on p.id = v.product_id where not p.is_published limit 1`);
    if (!plenty) {
      r.skip("cart merge checks", "no published variant with ≥ 10 in stock");
    } else {
      const lines = [{ variant_id: plenty.id, quantity: 2 }, { variant_id: plenty.id, quantity: 1 }];
      if (low) lines.push({ variant_id: low.id, quantity: low.available + 3 > 10 ? 10 : low.available + 3 });
      if (hidden) lines.push({ variant_id: hidden.id, quantity: 1 });
      const merge = await A.c.rpc("merge_cart", { p_lines: lines });
      r.check(!merge.error, "merge_cart (guest bag → account) succeeds", merge.error?.message);
      const qty = async () => Object.fromEntries(((await A.c.from("cart_items").select("variant_id, quantity")).data ?? []).map((l) => [l.variant_id, l.quantity]));
      let q = await qty();
      r.check(q[plenty.id] === 3, "duplicate guest lines add up instead of duplicating", q[plenty.id]);
      if (low) r.check(q[low.id] === low.available, "quantity clamped to available stock", `${q[low.id]}/${low.available}`);
      else r.skip("stock clamp", "no low-stock variant");
      if (hidden) r.check(q[hidden.id] === undefined, "unpublished variant is not merged");
      await A.c.rpc("merge_cart", { p_lines: [{ variant_id: plenty.id, quantity: 9 }] });
      q = await qty();
      r.check(q[plenty.id] === Math.min(10, plenty.available), "merging again adds to the line, capped at 10/stock", q[plenty.id]);
      const upd = await A.c.from("cart_items").update({ quantity: 2 }).eq("variant_id", plenty.id).select("quantity");
      r.check(upd.data?.[0]?.quantity === 2, "changes a line's quantity", upd.error?.message);
      const over = await A.c.from("cart_items").update({ quantity: 11 }).eq("variant_id", plenty.id);
      r.check(over.error?.code === "23514", "quantity above 10 rejected", over.error?.code);
      if (low) {
        const repoint = await A.c.from("cart_items").update({ variant_id: low.id }).eq("variant_id", plenty.id);
        r.check(repoint.error?.code === "42501", "cannot repoint a line to another variant", repoint.error?.code);
      }
      const before = (await one("select on_hand from public.inventory where variant_id = $1", [plenty.id])).on_hand;
      await A.c.from("inventory").update({ on_hand: before + 100 }).eq("variant_id", plenty.id);
      const after = (await one("select on_hand from public.inventory where variant_id = $1", [plenty.id])).on_hand;
      r.check(after === before, "customer cannot change stock");
    }
    const addr = await A.c.from("addresses").insert({ user_id: adaId, full_name: "Ada Verify", phone: "08030000000",
      line1: "12 Admiralty Way", city: "Lekki", state: "Lagos", is_default: true });
    r.check(!addr.error, "saves an address", addr.error?.message);
    const pubIds = ((await anon.from("products").select("id").limit(2)).data ?? []).map((p) => p.id);
    if (pubIds.length === 2) {
      const wl = await A.c.rpc("merge_wishlist", { p_product_ids: [pubIds[0], pubIds[0], pubIds[1]] });
      const items = await A.c.from("wishlist_items").select("product_id");
      r.check(!wl.error && items.data?.length === 2, "wishlist merge de-duplicates", wl.error?.message ?? items.data?.length);
    }
    const directOrder = await A.c.from("orders").insert({ order_number: orderNumbers[0], email: email("ada"), subtotal: 1, total: 1,
      contact_name: "a", contact_phone: "1", shipping_name: "a", shipping_phone: "1", shipping_line1: "l", shipping_city: "c",
      shipping_state: "s", shipping_country: "NG", delivery_method_code: "standard", delivery_method_name: "S" });
    r.check(directOrder.error?.code === "42501", "cannot create orders directly", directOrder.error?.code ?? "allowed!");

    // ------------------------------------------------------------ isolation
    r.section("Isolation between customers");
    r.check(((await B.c.from("cart_items").select("id")).data ?? []).length === 0, "B sees none of A's cart lines");
    r.check(((await B.c.from("addresses").select("id")).data ?? []).length === 0, "B sees none of A's addresses");
    const adaCart = (await one("select id from public.carts where user_id = $1", [adaId])).id;
    if (plenty) {
      const bIns = await B.c.from("cart_items").insert({ cart_id: adaCart, variant_id: plenty.id, quantity: 1 });
      r.check(bIns.error?.code === "42501", "B cannot add to A's cart", bIns.error?.code ?? "inserted!");
    }
    const bUpd = await B.c.from("profiles").update({ full_name: "hacked" }).eq("id", adaId).select("id");
    r.check(bUpd.data?.length === 0, "B cannot edit A's profile");
    const bDel = await B.c.from("addresses").delete().eq("user_id", adaId).select("id");
    r.check(bDel.data?.length === 0, "B cannot delete A's address");
    const bAddr = await B.c.from("addresses").insert({ user_id: adaId, full_name: "x", phone: "08030000000", line1: "xxx", city: "Ikeja", state: "Lagos" });
    r.check(bAddr.error?.code === "42501", "B cannot create an address owned by A", bAddr.error?.code);

    // ------------------------------------------------------------ orders
    r.section("Orders + guest order claiming");
    const mkOrder = (order_number, address, user_id) => admin.from("orders").insert({ order_number, email: address, user_id,
      subtotal: 48000000, delivery_fee: 500000, total: 48500000, contact_name: "Verify", contact_phone: "08030000000",
      shipping_name: "Verify", shipping_phone: "08030000000", shipping_line1: "1 Test Rd", shipping_city: "Lekki",
      shipping_state: "Lagos", shipping_country: "NG", delivery_method_code: "standard", delivery_method_name: "Standard Delivery",
    }).select("access_token").single();
    const o1 = await mkOrder(orderNumbers[0], email("ada"), adaId);
    r.check(!o1.error && o1.data.access_token.length === 64, "order created with a 64-char access token", o1.error?.message);
    const o2 = await mkOrder(orderNumbers[1], email("chi").toUpperCase(), null);
    r.check(!o2.error, "guest order created (uppercase email)", o2.error?.message);
    const aOrders = await A.c.from("orders").select("order_number");
    r.check(aOrders.data?.length === 1 && aOrders.data[0].order_number === orderNumbers[0], "customer sees her own order");
    r.check(((await B.c.from("orders").select("id")).data ?? []).length === 0, "other customers cannot see it");
    const st = await A.c.from("orders").update({ status: "delivered" }).eq("order_number", orderNumbers[0]);
    r.check(st.error?.code === "42501", "customer cannot change order status", st.error?.code ?? "allowed!");
    const claimedBefore = (await one("select user_id from public.orders where order_number = $1", [orderNumbers[1]])).user_id;
    r.check(claimedBefore === null, "unverified account does not claim the guest order");
    const conf = await admin.auth.admin.updateUserById(chiId, { email_confirm: true });
    r.check(!conf.error, "email verification through Auth", conf.error?.message);
    const claimedAfter = (await one("select user_id from public.orders where order_number = $1", [orderNumbers[1]])).user_id;
    r.check(claimedAfter === chiId, "verification claims the guest order (case-insensitive)");
    const C = await signIn(email("chi"));
    r.check(((await C.c.from("orders").select("id")).data ?? []).length === 1, "claimed order appears in her account");

    // ------------------------------------------------------------ admin
    r.section("Admin role");
    await db.query("update public.profiles set role = 'admin' where id = $1", [adaId]);
    const A2 = await signIn(email("ada"));
    r.check((await A2.c.rpc("is_admin")).data === true, "promoted user is admin");
    const all = await A2.c.from("products").select("id");
    r.check(all.data?.length === counts.published + counts.unpublished, "admin sees unpublished products too", all.data?.length);
    const carts = await A2.c.from("carts").select("user_id").in("user_id", [adaId, bisiId, chiId]);
    r.check(carts.data?.length === 3, "admin can read other customers' carts", carts.data?.length);
    const adminInv = await A2.c.from("inventory").select("variant_id").limit(1);
    r.check(!adminInv.error, "admin can read inventory", adminInv.error?.message);
    const tr = await A2.c.from("orders").update({ tracking_number: "TRK-VERIFY" }).eq("order_number", orderNumbers[0]).select("tracking_number");
    r.check(tr.data?.[0]?.tracking_number === "TRK-VERIFY", "admin can add tracking", tr.error?.message);

    r.section("Admin SQL functions (M4)");
    for (const [fn, args] of [
      ["admin_dashboard", {}],
      ["admin_list_customers", {}],
      ["admin_set_stock", { p_variant_id: "00000000-0000-0000-0000-000000000000", p_on_hand: 1 }],
      ["admin_update_order_status", { p_order_id: "00000000-0000-0000-0000-000000000000", p_to_status: "cancelled" }],
    ]) {
      const res = await B.c.rpc(fn, args);
      r.check(res.error?.code === "42501", `customers cannot call ${fn}`, res.error?.code ?? "allowed!");
    }
    const dash = await A2.c.rpc("admin_dashboard");
    r.check(!dash.error && typeof dash.data?.needs_action === "number", "admin can read the dashboard", dash.error?.message);
    const people = await A2.c.rpc("admin_list_customers", { p_search: email("bisi") });
    r.check(people.data?.length === 1 && people.data[0].email === email("bisi"), "admin can search customers by email", people.data?.length);
    const bad = await A2.c.rpc("admin_update_order_status", { p_order_id: (await one("select id from public.orders where order_number = $1", [orderNumbers[0]])).id, p_to_status: "delivered" });
    r.check(bad.error?.message === "INVALID_TRANSITION", "illegal status jumps are refused (pending → delivered)", bad.error?.message);

    // ------------------------------------------------------------ checkout SQL (M3)
    r.section("Checkout SQL: pricing, reservations, payment confirmation");
    const stockBefore = (await db.query("select variant_id, on_hand, reserved from public.inventory")).rows;
    const salesBefore = (await db.query("select id, sales_count from public.products")).rows;
    const buyer = email("checkout");
    try {
      const forAnon = await anonClient(cfg).rpc("quote_order", { p_lines: [], p_country: "NG", p_state: "Lagos", p_delivery_method: "", p_discount_code: "", p_lock: false });
      r.check(!!forAnon.error, "anon cannot call quote_order", forAnon.error?.code);
      const forUser = await A.c.rpc("create_pending_order", { p_order: {} });
      r.check(!!forUser.error, "customers cannot call create_pending_order", forUser.error?.code);

      const lastOne = await one(`select va.variant_id as id, v.price from public.variant_availability va
        join public.product_variants v on v.id = va.variant_id where va.available = 1 limit 1`);
      const orderFor = (lines) => ({
        email: buyer, contact_name: "Verify Buyer", contact_phone: "08030000000", delivery_method: "standard",
        shipping: { name: "Verify Buyer", phone: "08030000000", line1: "1 Test Rd", city: "Lekki", state: "Lagos", country: "NG" },
        lines,
      });
      if (!lastOne) {
        r.skip("last-unit race", "no variant with exactly 1 in stock");
      } else {
        const [x, y] = await Promise.all([
          admin.rpc("create_pending_order", { p_order: orderFor([{ variant_id: lastOne.id, quantity: 1 }]) }),
          admin.rpc("create_pending_order", { p_order: orderFor([{ variant_id: lastOne.id, quantity: 1 }]) }),
        ]);
        const winners = [x, y].filter((res) => !res.error);
        const losers = [x, y].filter((res) => res.error?.message === "CHECKOUT_INVALID");
        r.check(winners.length === 1 && losers.length === 1, "two simultaneous buyers, one unit: exactly one order is placed",
          `${winners.length} placed / ${losers.length} refused`);
        const placed = winners[0]?.data;
        if (placed) {
          const rate = (await one(`select r.price from public.delivery_rates r join public.delivery_methods m on m.id = r.method_id
            where m.code = 'standard' and r.zone = 'lagos'`)).price;
          r.check(Number(placed.total) === Number(lastOne.price) + Number(rate), "order total priced on the server", placed.total);
          const ref = `${placed.order_number}-PV`;
          await db.query("insert into public.payments (order_id, provider, reference, amount) values ($1, 'paystack', $2, $3)", [placed.order_id, ref, placed.total]);
          const call = (amount) => admin.rpc("mark_order_paid", {
            p_reference: ref, p_amount: amount, p_currency: "NGN", p_channel: "card", p_provider_txn: "verify",
            p_paid_at: new Date().toISOString(), p_raw: { verify: true },
          });
          r.check((await call(1)).data === "amount_mismatch", "wrong amount is refused");
          r.check((await one("select status from public.orders where id = $1", [placed.order_id])).status === "pending_payment", "order stays pending after a mismatch");
          r.check((await call(Number(placed.total))).data === "paid", "verified amount marks the order paid");
          r.check((await call(Number(placed.total))).data === "already_paid", "confirming twice is a no-op (idempotent)");
          const inv = await one("select on_hand, reserved from public.inventory where variant_id = $1", [lastOne.id]);
          r.check(inv.on_hand === 0 && inv.reserved === 0, "last unit sold exactly once", JSON.stringify(inv));
        }
      }
    } finally {
      await db.query("delete from public.orders where email = $1", [buyer]);
      for (const s of stockBefore) {
        await db.query("update public.inventory set on_hand = $2, reserved = $3 where variant_id = $1 and (on_hand <> $2 or reserved <> $3)", [s.variant_id, s.on_hand, s.reserved]);
      }
      for (const p of salesBefore) {
        await db.query("update public.products set sales_count = $2 where id = $1 and sales_count <> $2", [p.id, p.sales_count]);
      }
    }
  } finally {
    await db.query("delete from public.orders where order_number = any($1)", [orderNumbers]);
    await db.query(`delete from public.newsletter_subscribers where email::text like '${TEST_PREFIX}%'`);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }
}
