// pnpm dev:catalog-images: upload supabase/assets/catalog/*.webp to the
// product-images bucket and link them to products, collections and the
// Instagram grid. Idempotent. DEV project only (VERIFY_REMOTE_PROJECT_REF).
// In production, images are managed in the admin (M4).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { connectDb, loadConfig, serviceClient } from "../verify-remote/lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [dirname(require.resolve("next/package.json"))] }));

const DIR = "supabase/assets/catalog";
const BUCKET = "product-images";

// slug → images in display order. Alt text describes the hair, not the person.
const PRODUCTS = {
  "imar-classic-8-straight-bob": [["classic-8-straight-bob", 'Imar Classic 8" Straight Bob in copper, worn with a side part']],
  "imar-classic-12-layered-bob": [["classic-12-layered-bob", 'Imar Classic 12" Layered Bob in chocolate brown with a feathered flip']],
  "imar-classic-straight-fringe-unit": [["classic-straight-fringe", "Imar Classic Straight Fringe Unit, black, on a mannequin"]],
  "imar-classic-body-wave-unit": [["classic-body-wave", "Imar Classic Body Wave Unit in honey brown, long and voluminous"]],
  "imar-prime-16-bouncy-unit": [["prime-16-bouncy", 'Imar Prime 16" Bouncy Unit, natural black curls, on a mannequin']],
  "imar-prime-12-burgundy-bob": [
    ["prime-12-burgundy-bob", 'Imar Prime 12" Burgundy Bob showing the HD lace frontal'],
    ["prime-12-burgundy-texture", "Close-up of the burgundy (99J) straight hair"],
  ],
  "imar-prime-14-chocolate-curly-bob": [["prime-14-curly-bob", 'Imar Prime 14" Chocolate Curly Bob on a mannequin']],
  "imar-prime-20-deep-wave-unit": [["prime-20-deep-wave", 'Imar Prime 20" Deep Wave Unit, natural black, on a mannequin']],
  "imar-straight-bundle": [["bundle-straight", "Close-up of Imar natural black straight hair"]],
  "imar-body-wave-bundle": [["bundle-body-wave", "Close-up of Imar honey brown body wave hair"]],
  "imar-5x5-hd-lace-closure": [["closure-5x5", "Close-up of an HD lace hairline and parting"]],
};

const COLLECTIONS = {
  "imar-classic": "classic-12-layered-bob",
  "imar-prime": "prime-16-bouncy",
  bundles: "bundle-body-wave",
};

const INSTAGRAM = [
  ["classic-body-wave", "Honey brown body wave unit"],
  ["classic-8-straight-bob", "Copper straight bob"],
  ["prime-14-curly-bob", "Chocolate curly bob"],
  ["prime-12-burgundy-bob", "Burgundy bob with HD lace"],
  ["classic-12-layered-bob", "Chocolate layered bob"],
  ["prime-20-deep-wave", "Natural black deep wave unit"],
];

const cfg = loadConfig();
const storage = serviceClient(cfg).storage.from(BUCKET);
const db = await connectDb(cfg);
const pathFor = (name) => `catalog/${name}.webp`;

try {
  const names = new Set([...Object.values(PRODUCTS).flat().map(([n]) => n), ...Object.values(COLLECTIONS), ...INSTAGRAM.map(([n]) => n)]);
  const dims = {};
  for (const name of names) {
    const file = readFileSync(`${DIR}/${name}.webp`);
    const meta = await sharp(file).metadata();
    dims[name] = { width: meta.width, height: meta.height };
    const { error } = await storage.upload(pathFor(name), file, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`upload ${name}: ${error.message}`);
    console.log(`uploaded ${pathFor(name)} (${meta.width}x${meta.height})`);
  }

  await db.query("begin");
  for (const [slug, images] of Object.entries(PRODUCTS)) {
    const { rows } = await db.query("select id from public.products where slug = $1", [slug]);
    if (!rows[0]) {
      console.warn(`! product ${slug} not found, skipped`);
      continue;
    }
    await db.query("delete from public.product_images where product_id = $1", [rows[0].id]);
    for (const [i, [name, alt]] of images.entries()) {
      await db.query(
        "insert into public.product_images (product_id, storage_path, alt, position, width, height) values ($1, $2, $3, $4, $5, $6)",
        [rows[0].id, pathFor(name), alt, i, dims[name].width, dims[name].height],
      );
    }
  }
  for (const [slug, name] of Object.entries(COLLECTIONS)) {
    await db.query("update public.collections set hero_image_path = $2 where slug = $1", [slug, pathFor(name)]);
  }
  await db.query("delete from public.instagram_tiles");
  for (const [i, [name, alt]] of INSTAGRAM.entries()) {
    await db.query(
      "insert into public.instagram_tiles (image_path, alt, link_url, position) values ($1, $2, $3, $4)",
      [pathFor(name), alt, "https://www.instagram.com/imarhair", i],
    );
  }
  await db.query("commit");
  console.log("Linked images to products, collections and the Instagram grid.");
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
