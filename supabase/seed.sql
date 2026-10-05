-- Development seed data. Realistic, but NOT production catalogue.
-- Prices are in kobo (₦1 = 100 kobo).
-- Deliberately contains NO reviews: reviews must come from real customers.
-- Product images live in supabase/assets/catalog and are uploaded by `pnpm dev:catalog-images`.

-- ---------------------------------------------------------------------------
-- categories & collections
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, kind, sort_order) values
  ('Wigs',     'wigs',     'wig',      1),
  ('Bundles',  'bundles',  'bundle',   2),
  ('Haircare', 'haircare', 'haircare', 3);

insert into public.collections (name, slug, description, status, sort_order) values
  ('Imar Classic', 'imar-classic',
   'Everyday elegance. Soft, natural units made to be worn and loved.', 'active', 1),
  ('Imar Prime', 'imar-prime',
   'Our finest units. Fuller density, premium lace, made to turn heads.', 'active', 2),
  ('Bundles', 'bundles',
   'Raw-quality bundles and closures for the install you have in mind.', 'active', 3),
  ('Haircare', 'haircare',
   'Care for your hair and your units. Launching soon.', 'coming_soon', 4);

-- ---------------------------------------------------------------------------
-- products (PLACEHOLDER names/details matched to Imarhair's photos; Imarhair
-- will replace them through the admin in M4).
-- ---------------------------------------------------------------------------
insert into public.products
  (name, slug, description, details, care, category_id, collection_id,
   base_price, compare_at_price, is_published, is_featured, is_best_seller, position, sales_count)
select
  p.name, p.slug, p.description, p.details::jsonb, p.care,
  (select id from public.categories where slug = p.category),
  (select id from public.collections where slug = p.collection),
  p.base_price, p.compare_at_price, p.is_published, p.is_featured, p.is_best_seller, p.position, p.sales_count
from (values
  -- Imar Classic ------------------------------------------------------------
  ('Imar Classic 8" Straight Bob', 'imar-classic-8-straight-bob',
   'A sleek, chin-length bob with a soft natural part. Light enough for every day, polished enough for every occasion.',
   '{"Hair":"100% human hair","Texture":"Silky straight","Length":"8\"","Weight":"200g","Lace":"5x5 HD lace closure","Cap":"Medium, adjustable straps and combs"}',
   'Wash with sulphate-free shampoo every 7–10 wears. Air dry on a wig stand. Use low heat with a heat protectant.',
   'wigs', 'imar-classic', 15800000, null::bigint, true, true, true, 1, 42),

  ('Imar Classic 12" Layered Bob', 'imar-classic-12-layered-bob',
   'Soft face-framing layers in a rich chocolate brown, with a feathered flip at the ends.',
   '{"Hair":"100% human hair","Texture":"Layered, soft flip","Length":"12\"","Colour":"Chocolate brown (#4)","Weight":"200g","Lace":"4x4 HD lace closure","Cap":"Medium, adjustable straps and combs"}',
   'Set the layers with a round brush on low heat. Wrap at night with a silk scarf.',
   'wigs', 'imar-classic', 17500000, 19500000, true, true, false, 2, 18),

  ('Imar Classic Straight Fringe Unit', 'imar-classic-straight-fringe-unit',
   'Bone-straight with a full, blunt fringe. Glueless and ready to wear in minutes.',
   '{"Hair":"100% human hair","Texture":"Straight with fringe","Weight":"180g","Lace":"Glueless, no lace","Cap":"Medium, adjustable straps"}',
   'Trim the fringe only with sharp scissors. Flat iron at no more than 180°C.',
   'wigs', 'imar-classic', 16500000, null, true, false, false, 3, 12),

  ('Imar Classic Body Wave Unit', 'imar-classic-body-wave-unit',
   'Long, glossy body waves in honey brown with natural movement. Choose your length.',
   '{"Hair":"100% human hair","Texture":"Body wave","Colour":"Honey brown","Weight":"250g","Lace":"13x4 HD lace frontal","Cap":"Medium, adjustable straps and combs"}',
   'Detangle gently from the ends up. Refresh waves with water and a light leave-in conditioner.',
   'wigs', 'imar-classic', 26500000, null, true, true, true, 4, 35),

  -- Imar Prime --------------------------------------------------------------
  ('Imar Prime 16" Bouncy Unit', 'imar-prime-16-bouncy-unit',
   'Full, bouncy curls with body that lasts. Our signature Prime density on a melt-away Swiss lace.',
   '{"Hair":"100% virgin human hair","Texture":"Bouncy curls","Length":"16\"","Weight":"300g","Lace":"5x5 Swiss lace","Cap":"Medium, adjustable straps and combs"}',
   'Wash every 10–14 wears. Finger-detangle when damp. Store in a silk bag.',
   'wigs', 'imar-prime', 48000000, null, true, true, true, 1, 58),

  ('Imar Prime 12" Burgundy Bob', 'imar-prime-12-burgundy-bob',
   'A sharp, swingy bob in deep burgundy (99J) on a 13x4 HD frontal for a flawless hairline.',
   '{"Hair":"100% virgin human hair","Texture":"Bone straight","Length":"12\"","Colour":"Burgundy (99J)","Weight":"250g","Lace":"13x4 HD lace frontal","Cap":"Medium, adjustable straps and combs"}',
   'Use colour-safe, sulphate-free products. Flat iron at no more than 180°C.',
   'wigs', 'imar-prime', 42000000, null, true, true, false, 2, 21),

  ('Imar Prime 14" Chocolate Curly Bob', 'imar-prime-14-chocolate-curly-bob',
   'Defined, springy curls in chocolate brown with volume from root to tip.',
   '{"Hair":"100% virgin human hair","Texture":"Deep curl","Length":"14\"","Colour":"Chocolate brown (#4)","Weight":"300g","Lace":"5x5 HD lace closure","Cap":"Medium, adjustable straps and combs"}',
   'Keep curls hydrated with water and leave-in conditioner. Never brush when dry.',
   'wigs', 'imar-prime', 45000000, null, true, false, false, 3, 9),

  ('Imar Prime 20" Deep Wave Unit', 'imar-prime-20-deep-wave-unit',
   'Defined deep waves with volume from root to tip.',
   '{"Hair":"100% virgin human hair","Texture":"Deep wave","Length":"20\"","Weight":"300g","Lace":"5x5 Swiss lace","Cap":"Medium, adjustable straps and combs"}',
   'Keep curls hydrated with water and leave-in conditioner. Do not brush when dry.',
   'wigs', 'imar-prime', 56000000, null, true, false, false, 4, 19),

  -- Bundles -----------------------------------------------------------------
  ('Imar Straight Bundle', 'imar-straight-bundle',
   'Single straight bundle, 100g. Most installs use 3 bundles plus a closure.',
   '{"Hair":"100% virgin human hair","Texture":"Straight","Weight":"100g per bundle"}',
   'Co-wash gently. Seal ends with a light serum.',
   'bundles', 'bundles', 4500000, null, true, false, true, 1, 64),

  ('Imar Body Wave Bundle', 'imar-body-wave-bundle',
   'Single honey-brown body wave bundle, 100g. Soft, full movement.',
   '{"Hair":"100% virgin human hair","Texture":"Body wave","Colour":"Honey brown","Weight":"100g per bundle"}',
   'Co-wash gently. Refresh waves with water and leave-in conditioner.',
   'bundles', 'bundles', 5200000, null, true, false, false, 2, 30),

  ('Imar 5x5 HD Lace Closure', 'imar-5x5-hd-lace-closure',
   'Pre-plucked 5x5 HD lace closure to finish your install.',
   '{"Hair":"100% virgin human hair","Lace":"5x5 HD lace","Weight":"50g"}',
   'Bleach knots with care. Avoid heavy glue on the lace.',
   'bundles', 'bundles', 6500000, null, true, false, false, 3, 22),

  -- Haircare (coming soon: unpublished) --------------------------------------
  ('Imar Silk Shine Serum', 'imar-silk-shine-serum',
   'Lightweight serum for shine and softness without build-up.',
   '{"Size":"100ml","For":"Wigs, bundles and natural hair"}',
   null, 'haircare', 'haircare', 1850000, null, false, false, false, 1, 0),

  ('Imar Gentle Wig Shampoo', 'imar-gentle-wig-shampoo',
   'Sulphate-free cleanser made for human hair units.',
   '{"Size":"250ml","For":"Wigs and bundles"}',
   null, 'haircare', 'haircare', 1500000, null, false, false, false, 2, 0)
) as p(name, slug, description, details, care, category, collection,
       base_price, compare_at_price, is_published, is_featured, is_best_seller, position, sales_count);

-- ---------------------------------------------------------------------------
-- variants (inventory rows are created by trigger; stock set below)
-- ---------------------------------------------------------------------------
insert into public.product_variants
  (product_id, sku, length_inches, density, colour, lace_type, price, compare_at_price, is_default, position)
select
  (select id from public.products where slug = v.product_slug),
  v.sku, v.length_inches, v.density, v.colour, v.lace_type, v.price, v.compare_at_price, v.is_default, v.position
from (values
  ('imar-classic-8-straight-bob', 'IMR-CL-BOB08-CU', 8::smallint, '200g', 'Copper', '5x5 HD Lace Closure', 15800000::bigint, null::bigint, true, 1),
  ('imar-classic-8-straight-bob', 'IMR-CL-BOB08-NB', 8, '200g', 'Natural Black', '5x5 HD Lace Closure', 15800000, null, false, 2),

  ('imar-classic-12-layered-bob', 'IMR-CL-LB12-CB', 12, '200g', 'Chocolate Brown', '4x4 HD Lace Closure', 17500000, 19500000, true, 1),

  ('imar-classic-straight-fringe-unit', 'IMR-CL-FR14', 14, '180g', 'Natural Black', 'Glueless Fringe', 16500000, null, true,  1),
  ('imar-classic-straight-fringe-unit', 'IMR-CL-FR16', 16, '180g', 'Natural Black', 'Glueless Fringe', 18500000, null, false, 2),
  ('imar-classic-straight-fringe-unit', 'IMR-CL-FR18', 18, '180g', 'Natural Black', 'Glueless Fringe', 20500000, null, false, 3),

  ('imar-classic-body-wave-unit', 'IMR-CL-BW18', 18, '250g', 'Honey Brown', '13x4 HD Lace Frontal', 26500000, null, true,  1),
  ('imar-classic-body-wave-unit', 'IMR-CL-BW20', 20, '250g', 'Honey Brown', '13x4 HD Lace Frontal', 30000000, null, false, 2),
  ('imar-classic-body-wave-unit', 'IMR-CL-BW22', 22, '250g', 'Honey Brown', '13x4 HD Lace Frontal', 33500000, null, false, 3),
  ('imar-classic-body-wave-unit', 'IMR-CL-BW24', 24, '250g', 'Honey Brown', '13x4 HD Lace Frontal', 37000000, null, false, 4),

  ('imar-prime-16-bouncy-unit', 'IMR-PR-BNC16-300', 16, '300g', 'Natural Black', '5x5 Swiss Lace', 48000000, null, true,  1),
  ('imar-prime-16-bouncy-unit', 'IMR-PR-BNC16-350', 16, '350g', 'Natural Black', '5x5 Swiss Lace', 54000000, null, false, 2),

  ('imar-prime-12-burgundy-bob', 'IMR-PR-BB12-99J', 12, '250g', 'Burgundy (99J)', '13x4 HD Lace Frontal', 42000000, null, true, 1),

  ('imar-prime-14-chocolate-curly-bob', 'IMR-PR-CC14-300', 14, '300g', 'Chocolate Brown', '5x5 HD Lace Closure', 45000000, null, true,  1),
  ('imar-prime-14-chocolate-curly-bob', 'IMR-PR-CC14-350', 14, '350g', 'Chocolate Brown', '5x5 HD Lace Closure', 50000000, null, false, 2),

  ('imar-prime-20-deep-wave-unit', 'IMR-PR-DW20', 20, '300g', 'Natural Black', '5x5 Swiss Lace', 56000000, null, true, 1),

  ('imar-straight-bundle', 'IMR-BD-ST10', 10, '100g', 'Natural Black', null, 4500000,  null, true,  1),
  ('imar-straight-bundle', 'IMR-BD-ST14', 14, '100g', 'Natural Black', null, 6000000,  null, false, 2),
  ('imar-straight-bundle', 'IMR-BD-ST18', 18, '100g', 'Natural Black', null, 7800000,  null, false, 3),
  ('imar-straight-bundle', 'IMR-BD-ST22', 22, '100g', 'Natural Black', null, 9500000,  null, false, 4),
  ('imar-straight-bundle', 'IMR-BD-ST24', 24, '100g', 'Natural Black', null, 11000000, null, false, 5),

  ('imar-body-wave-bundle', 'IMR-BD-BW12', 12, '100g', 'Honey Brown', null, 5200000, null, true,  1),
  ('imar-body-wave-bundle', 'IMR-BD-BW16', 16, '100g', 'Honey Brown', null, 7200000, null, false, 2),
  ('imar-body-wave-bundle', 'IMR-BD-BW20', 20, '100g', 'Honey Brown', null, 9200000, null, false, 3),

  ('imar-5x5-hd-lace-closure', 'IMR-BD-CL5X5-14', 14, '50g', 'Natural Black', '5x5 HD Lace', 6500000, null, true,  1),
  ('imar-5x5-hd-lace-closure', 'IMR-BD-CL5X5-18', 18, '50g', 'Natural Black', '5x5 HD Lace', 7500000, null, false, 2),

  ('imar-silk-shine-serum',   'IMR-HC-SERUM-100',   null, null, null, null, 1850000, null, true, 1),
  ('imar-gentle-wig-shampoo', 'IMR-HC-SHAMPOO-250', null, null, null, null, 1500000, null, true, 1)
) as v(product_slug, sku, length_inches, density, colour, lace_type, price, compare_at_price, is_default, position);

-- Stock: a mix of healthy, low (≤3) and sold-out so every UI state is testable.
-- Tests rely on: IMR-CL-BOB08-NB ≥ 10, IMR-PR-BNC16-350 = 1, IMR-CL-BW24 = 0.
update public.inventory i
set on_hand = s.on_hand
from (values
  ('IMR-CL-BOB08-CU', 8), ('IMR-CL-BOB08-NB', 12),
  ('IMR-CL-LB12-CB', 5),
  ('IMR-CL-FR14', 6), ('IMR-CL-FR16', 4), ('IMR-CL-FR18', 2),
  ('IMR-CL-BW18', 6), ('IMR-CL-BW20', 8), ('IMR-CL-BW22', 3), ('IMR-CL-BW24', 0),
  ('IMR-PR-BNC16-300', 4), ('IMR-PR-BNC16-350', 1),
  ('IMR-PR-BB12-99J', 3),
  ('IMR-PR-CC14-300', 2), ('IMR-PR-CC14-350', 0),
  ('IMR-PR-DW20', 3),
  ('IMR-BD-ST10', 30), ('IMR-BD-ST14', 30), ('IMR-BD-ST18', 25), ('IMR-BD-ST22', 15), ('IMR-BD-ST24', 10),
  ('IMR-BD-BW12', 20), ('IMR-BD-BW16', 20), ('IMR-BD-BW20', 12),
  ('IMR-BD-CL5X5-14', 10), ('IMR-BD-CL5X5-18', 8),
  ('IMR-HC-SERUM-100', 0), ('IMR-HC-SHAMPOO-250', 0)
) as s(sku, on_hand)
join public.product_variants v on v.sku = s.sku
where i.variant_id = v.id;

-- ---------------------------------------------------------------------------
-- delivery (PLACEHOLDER prices — confirm with Imarhair, prd.md Q3)
-- ---------------------------------------------------------------------------
insert into public.delivery_methods (code, name, description, sort_order) values
  ('standard', 'Standard Delivery', 'Tracked delivery to your door.', 1),
  ('express',  'Express Delivery',  'Priority dispatch and delivery.', 2);

insert into public.delivery_rates (method_id, zone, price, eta_min_days, eta_max_days)
select (select id from public.delivery_methods where code = r.code), r.zone, r.price, r.eta_min, r.eta_max
from (values
  ('standard', 'lagos',          500000::bigint,  1, 3),
  ('standard', 'nigeria',       1000000,  3, 5),
  ('standard', 'international', 6000000,  7, 14),
  ('express',  'lagos',         1000000,  0, 1),
  ('express',  'nigeria',       2000000,  1, 2),
  ('express',  'international', 12000000, 3, 5)
) as r(code, zone, price, eta_min, eta_max);
