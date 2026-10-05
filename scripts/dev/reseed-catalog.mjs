// pnpm dev:reseed-catalog: replace the DEV project's catalogue with
// supabase/seed.sql (categories, collections, products, variants, stock,
// delivery). Customer accounts and orders are left alone; carts/wishlists lose
// lines for products that no longer exist. Refuses to run unless
// VERIFY_REMOTE_PROJECT_REF names the project (never point it at production).
import { readFileSync } from "node:fs";
import { connectDb, loadConfig } from "../verify-remote/lib.mjs";

const cfg = loadConfig();
const db = await connectDb(cfg);
console.log(`Reseeding catalogue on ${cfg.ref}`);

try {
  await db.query("begin");
  await db.query(`
    delete from public.instagram_tiles;
    delete from public.product_images;
    delete from public.products;          -- cascades to variants, inventory, cart/wishlist lines
    delete from public.collections;
    delete from public.categories;
    delete from public.delivery_rates;
    delete from public.delivery_methods;
  `);
  await db.query(readFileSync("supabase/seed.sql", "utf8"));
  await db.query("commit");
  const { rows } = await db.query(
    "select count(*) filter (where is_published)::int published, count(*)::int total from public.products",
  );
  console.log(`Done: ${rows[0].published} published / ${rows[0].total} products. Now run pnpm dev:catalog-images.`);
} catch (e) {
  await db.query("rollback");
  console.error("Reseed failed, nothing changed:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
