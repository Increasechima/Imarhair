-- RLS and core-function tests. Run with: pnpm test:db  (supabase test db)
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function pg_temp.as_user(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create or replace function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.com',  now(), '{"full_name":"Ada Obi"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bisi@example.com', now(), '{"name":"Bisi"}');

-- ---------------------------------------------------------------------------
-- RLS is on everywhere
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled');

-- ---------------------------------------------------------------------------
-- signup trigger
-- ---------------------------------------------------------------------------
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ada Obi', 'profile created with name from metadata');
select is((select count(*)::int from public.carts where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')), 2, 'cart created per user');
select is((select count(*)::int from public.wishlists where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')), 2, 'wishlist created per user');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select is((select count(*)::int from public.products where not is_published), 0, 'anon sees no unpublished products');
select ok((select count(*) from public.products) > 0, 'anon sees published products');
select throws_ok('select * from public.inventory', '42501', null, 'anon cannot read inventory');
select ok((select count(*) from public.variant_availability) > 0, 'anon can read availability');
select throws_ok($$ select public.merge_cart('[]'::jsonb) $$, '42501', null, 'anon cannot merge carts');
select throws_ok('select public.next_order_number()', '42501', null, 'anon cannot mint order numbers');
select lives_ok($$ insert into public.newsletter_subscribers (email) values ('new@example.com') $$, 'anon can subscribe');
select throws_ok('select * from public.newsletter_subscribers', '42501', null, 'anon cannot list subscribers');
reset role;

-- ---------------------------------------------------------------------------
-- cart merge (as Ada)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok(format($$ select public.merge_cart('%s'::jsonb) $$, json_build_array(
  json_build_object('variant_id', (select id from public.product_variants where sku = 'IMR-CL-BOB08-NB'), 'quantity', 2),
  json_build_object('variant_id', (select id from public.product_variants where sku = 'IMR-CL-BOB08-NB'), 'quantity', 1),
  json_build_object('variant_id', (select id from public.product_variants where sku = 'IMR-PR-BNC16-350'), 'quantity', 5)
)), 'merge_cart runs for signed-in user');
select is((select quantity from public.cart_items ci join public.product_variants v on v.id = ci.variant_id where v.sku = 'IMR-CL-BOB08-NB'),
  3, 'duplicate lines merge by adding quantities');
select is((select quantity from public.cart_items ci join public.product_variants v on v.id = ci.variant_id where v.sku = 'IMR-PR-BNC16-350'),
  1, 'quantity clamped to available stock');
select lives_ok(format($$ select public.merge_cart('%s'::jsonb) $$, json_build_array(
  json_build_object('variant_id', (select id from public.product_variants where sku = 'IMR-CL-BOB08-NB'), 'quantity', 9)
)), 'second merge runs');
select is((select quantity from public.cart_items ci join public.product_variants v on v.id = ci.variant_id where v.sku = 'IMR-CL-BOB08-NB'),
  10, 'merge into existing line caps at 10');
select is(public.is_admin(), false, 'customer is not admin');
select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$, '42501', null,
  'customer cannot promote herself');
reset role;

-- ---------------------------------------------------------------------------
-- isolation (as Bisi)
-- ---------------------------------------------------------------------------
select set_config('test.ada_cart',
  (select id::text from public.carts where user_id = '00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.cart_items), 0, 'Bisi cannot see Ada''s cart items');
select is((select count(*)::int from public.carts), 1, 'Bisi sees only her own cart');
select throws_ok(
  $$ insert into public.cart_items (cart_id, variant_id, quantity)
     select current_setting('test.ada_cart')::uuid, v.id, 1
     from public.product_variants v where v.sku = 'IMR-CL-BOB08-NB' $$,
  '42501', null, 'Bisi cannot add to Ada''s cart');
-- RLS silently filters the row (0 rows updated); verified after reset role below.
update public.profiles set full_name = 'hacked' where id = '00000000-0000-0000-0000-00000000000a';
select throws_ok(
  $$ insert into public.orders (order_number, email, subtotal, total, contact_name, contact_phone, shipping_name,
       shipping_phone, shipping_line1, shipping_city, shipping_state, shipping_country, delivery_method_code, delivery_method_name)
     values ('IMR-20261004-999', 'b@x.co', 1, 1, 'b', '1', 'b', '1', 'l', 'c', 's', 'NG', 'standard', 'Standard') $$,
  '42501', null, 'customers cannot create orders directly');
reset role;
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ada Obi', 'Bisi cannot update Ada''s profile');

-- ---------------------------------------------------------------------------
-- order numbers + guest order claiming
-- ---------------------------------------------------------------------------
select matches(public.next_order_number(), '^IMR-[0-9]{8}-[0-9]{3}$', 'order number format');

insert into public.orders (order_number, email, subtotal, total, contact_name, contact_phone, shipping_name,
  shipping_phone, shipping_line1, shipping_city, shipping_state, shipping_country, delivery_method_code, delivery_method_name)
values (public.next_order_number(), 'Chi@Example.com', 100, 100, 'c', '1', 'c', '1', 'l', 'c', 's', 'NG', 'standard', 'Standard');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'chi@example.com');
select is((select count(*)::int from public.orders where user_id = '00000000-0000-0000-0000-00000000000c'),
  0, 'unverified signup does not claim guest orders');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000000c';
select is((select count(*)::int from public.orders where user_id = '00000000-0000-0000-0000-00000000000c'),
  1, 'verified email claims guest orders (case-insensitive)');

-- ---------------------------------------------------------------------------
-- rate_limits: service role only
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select throws_ok('select * from public.rate_limits', '42501', null, 'anon cannot read rate_limits');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.check_rate_limit('contact:xxxxxxxx', 1, 60) $$, '42501', null, 'customers cannot call check_rate_limit');
reset role;

-- ---------------------------------------------------------------------------
-- admin
-- ---------------------------------------------------------------------------
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is(public.is_admin(), true, 'admin recognised');
select ok((select count(*) from public.products where not is_published) > 0, 'admin sees unpublished products');
reset role;

select * from finish();
rollback;
