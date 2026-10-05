// Structural checks on the live database: migrations, RLS, triggers, function
// and column privileges. Read-only.
import { readdirSync } from "node:fs";

export async function verifySchema(db, r) {
  r.section("Schema (live database)");

  const localMigrations = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).map((f) => f.split("_")[0]).sort();
  const applied = (await db.query("select version from supabase_migrations.schema_migrations order by version")).rows.map((x) => x.version);
  const missing = localMigrations.filter((v) => !applied.includes(v));
  r.check(missing.length === 0, "all local migrations are applied", missing.length ? `missing ${missing.join(", ")}` : `${applied.length}`);

  const tables = (await db.query(`
    select c.relname, c.relrowsecurity rls, count(p.polname)::int policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    left join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public' and c.relkind = 'r'
    group by c.relname, c.relrowsecurity`)).rows;
  const noRls = tables.filter((t) => !t.rls).map((t) => t.relname);
  // Service-role-only tables: RLS on with no policies = deny every client role.
  const SERVICE_ONLY = ["rate_limits"];
  const noPolicies = tables.filter((t) => t.policies === 0 && !SERVICE_ONLY.includes(t.relname)).map((t) => t.relname);
  r.check(noRls.length === 0, `RLS enabled on all ${tables.length} public tables`, noRls.join(", "));
  r.check(noPolicies.length === 0, "every client-facing public table has at least one policy", noPolicies.join(", "));
  const serviceGrants = (await db.query(`select count(*)::int n from information_schema.role_table_grants
    where table_schema = 'public' and table_name = any($1) and grantee in ('anon', 'authenticated')`, [SERVICE_ONLY])).rows[0].n;
  r.check(serviceGrants === 0, "service-only tables grant nothing to anon/authenticated", SERVICE_ONLY.join(", "));

  const triggers = (await db.query(
    "select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal")).rows.map((t) => t.tgname);
  r.check(triggers.includes("on_auth_user_created") && triggers.includes("on_auth_user_email_confirmed"),
    "auth.users signup + email-confirmed triggers installed", triggers.join(", "));

  // [function, security definer?, anon may execute?, authenticated may execute?]
  const expectedFns = [
    ["claim_guest_orders", true, false, false],
    ["handle_new_user", true, false, false],
    ["handle_user_email_confirmed", true, false, false],
    ["create_inventory_for_variant", true, false, false],
    ["next_order_number", true, false, false],
    ["is_admin", true, true, true],
    ["merge_cart", false, false, true],
    ["merge_wishlist", false, false, true],
    ["search_products", false, true, true],
    ["quote_order", true, false, false],
    ["create_pending_order", true, false, false],
    ["mark_order_paid", true, false, false],
    ["prepare_payment_retry", true, false, false],
    ["release_expired_reservations", true, false, false],
    ["assert_admin", true, false, true],
    ["admin_update_order_status", true, false, true],
    ["admin_set_stock", true, false, true],
    ["admin_dashboard", true, false, true],
    ["admin_list_customers", true, false, true],
  ];
  const fns = Object.fromEntries((await db.query(`
    select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') cfg,
      has_function_privilege('anon', p.oid, 'execute') anon_x,
      has_function_privilege('authenticated', p.oid, 'execute') auth_x
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`)).rows.map((f) => [f.proname, f]));
  for (const [name, secdef, anonX, authX] of expectedFns) {
    const f = fns[name];
    r.check(!!f && f.prosecdef === secdef && f.anon_x === anonX && f.auth_x === authX && f.cfg.includes('search_path=""'),
      `function ${name}: definer=${secdef}, anon=${anonX}, authenticated=${authX}, empty search_path`,
      f ? `definer=${f.prosecdef} anon=${f.anon_x} auth=${f.auth_x}` : "missing");
  }

  const priv = [
    ["anon", "table", "public.inventory", null, "select", false],
    ["anon", "table", "public.products", null, "select", true],
    ["anon", "table", "public.products", null, "insert", false],
    ["anon", "table", "public.variant_availability", null, "select", true],
    ["anon", "table", "public.newsletter_subscribers", null, "select", false],
    ["anon", "column", "public.newsletter_subscribers", "email", "insert", true],
    ["anon", "column", "public.newsletter_subscribers", "status", "insert", false],
    ["authenticated", "table", "public.profiles", null, "update", false],
    ["authenticated", "column", "public.profiles", "role", "update", false],
    ["authenticated", "column", "public.profiles", "full_name", "update", true],
    ["authenticated", "column", "public.cart_items", "variant_id", "update", false],
    ["authenticated", "column", "public.cart_items", "quantity", "update", true],
    ["authenticated", "table", "public.orders", null, "insert", false],
    ["authenticated", "column", "public.orders", "status", "update", false],
    ["authenticated", "table", "public.payments", null, "insert", false],
  ];
  for (const [role, kind, rel, col, action, expected] of priv) {
    const sql = kind === "table"
      ? "select has_table_privilege($1, $2, $3) g"
      : "select has_column_privilege($1, $2, $4, $3) g";
    const params = kind === "table" ? [role, rel, action] : [role, rel, action, col];
    const granted = (await db.query(sql, params)).rows[0].g;
    r.check(granted === expected, `${role} ${expected ? "can" : "cannot"} ${action} ${rel}${col ? `.${col}` : ""}`);
  }

  const view = (await db.query(
    "select c.reloptions from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'product_listing'")).rows[0];
  r.check(view?.reloptions?.includes("security_invoker=true"), "product_listing view runs with the caller's RLS (security_invoker)", JSON.stringify(view?.reloptions));
  const anonListing = (await db.query("select has_table_privilege('anon', 'public.product_listing', 'select') g")).rows[0].g;
  r.check(anonListing === true, "anon can read product_listing");

  const bucket = (await db.query("select public from storage.buckets where id = 'product-images'")).rows[0];
  const bucketPolicies = (await db.query(
    "select count(*)::int n from pg_policy where polrelid = 'storage.objects'::regclass and polname like 'product-images:%'")).rows[0].n;
  r.check(bucket?.public === true && bucketPolicies === 4, "product-images bucket is public-read with 4 policies", `${bucketPolicies}`);

  const reviews = (await db.query("select count(*)::int n from public.reviews where is_approved and source = 'imported' and approved_by is null")).rows[0].n;
  r.check(reviews === 0, "no approved reviews without an approving admin");
}
