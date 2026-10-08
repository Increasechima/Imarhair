-- Live bag sync: cart_items writes ping `cart:<user_id>`, and only that user
-- may receive it. Run with: pnpm test:db (or pnpm verify:remote).
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

create or replace function pg_temp.as_user(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create or replace function pg_temp.pings(p_uid uuid) returns int language sql as $$
  select count(*)::int from realtime.messages
  where topic = 'cart:' || p_uid::text and event = 'changed' and extension = 'broadcast' and private;
$$;
grant execute on function pg_temp.pings(uuid) to authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'rt-ada@example.com',  now()),
  ('00000000-0000-0000-0000-0000000000c2', 'rt-bisi@example.com', now());

create temp table v on commit drop as
  select id, row_number() over (order by id) n from public.product_variants order by id limit 2;
grant select on v to authenticated;

select ok(
  exists (select 1 from pg_inherits i join pg_class c on c.oid = i.inhrelid
          where i.inhparent = 'realtime.messages'::regclass
            and c.relname = 'messages_' || to_char(now() at time zone 'utc', 'YYYY_MM_DD')),
  'precondition: realtime.messages has today''s partition (Realtime creates it once a client connects)');
select is((select count(*)::int from v), 2, 'fixture: two variants exist');
select is(
  (select count(*)::int from pg_trigger where tgrelid = 'public.cart_items'::regclass and tgname like 'cart_items_notify_%'),
  3, 'cart_items has insert/update/delete notify triggers');

-- ---------------------------------------------------------------------------
-- writes ping the owner's topic, once per statement
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.cart_items (cart_id, variant_id, quantity)
  select (select id from public.carts where user_id = '00000000-0000-0000-0000-0000000000c1'), v.id, 1 from v;
reset role;
select is(pg_temp.pings('00000000-0000-0000-0000-0000000000c1'), 1, 'a two-line insert sends one ping');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.cart_items set quantity = 2 where variant_id = (select id from v where n = 1);
reset role;
select is(pg_temp.pings('00000000-0000-0000-0000-0000000000c1'), 2, 'a quantity update sends a ping');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
delete from public.cart_items where variant_id in (select id from v);
reset role;
select is(pg_temp.pings('00000000-0000-0000-0000-0000000000c1'), 3, 'a two-line delete sends one ping');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.merge_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from v where n = 1), 'quantity', 1)));
reset role;
select ok(pg_temp.pings('00000000-0000-0000-0000-0000000000c1') > 3, 'merge_cart pings');

select is(pg_temp.pings('00000000-0000-0000-0000-0000000000c2'), 0, 'another user''s topic gets nothing');

-- realtime.send adds its own message id; nothing else may be in the payload.
select is(
  (select payload - 'id' from realtime.messages where topic = 'cart:00000000-0000-0000-0000-0000000000c1' limit 1),
  '{}'::jsonb, 'pings carry no bag data');

-- ---------------------------------------------------------------------------
-- Realtime Authorization (what the Realtime server checks on join)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select set_config('realtime.topic', 'cart:00000000-0000-0000-0000-0000000000c1', true);
select ok(pg_temp.pings('00000000-0000-0000-0000-0000000000c1') > 0, 'owner can receive on their cart topic');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select set_config('realtime.topic', 'cart:00000000-0000-0000-0000-0000000000c1', true);
select is(pg_temp.pings('00000000-0000-0000-0000-0000000000c1'), 0, 'another user cannot receive on that topic');
select throws_ok(
  $$ insert into realtime.messages (topic, extension, event, payload, private)
     values ('cart:00000000-0000-0000-0000-0000000000c1', 'broadcast', 'changed', '{}', true) $$,
  '42501', null, 'clients cannot send on a cart topic');
reset role;

select is(
  (select has_function_privilege('authenticated', 'public.notify_cart_changed()', 'execute')),
  false, 'notify_cart_changed is not callable by clients');

select * from finish();
rollback;
