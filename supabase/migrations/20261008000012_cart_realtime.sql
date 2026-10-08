-- Live bag sync across devices (web ↔ mobile).
--
-- Any write to cart_items (web or app, merge_cart, mark_order_paid removing
-- purchased lines, admin) broadcasts a "changed" ping on the private Realtime
-- topic `cart:<user_id>`. The payload is empty on purpose: clients re-fetch
-- the bag from the server, so prices and stock still come only from
-- quote_order and no cart data travels over Realtime.
--
-- Statement-level triggers send one ping per affected cart per statement, so
-- a merge of many lines is one message, not one per row.

create or replace function public.notify_cart_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  -- Transition tables only exist for their own event; each branch is planned
  -- only when it runs.
  if tg_op = 'DELETE' then
    for v_user in
      select distinct c.user_id from old_rows r join public.carts c on c.id = r.cart_id
    loop
      perform realtime.send('{}'::jsonb, 'changed', 'cart:' || v_user::text, true);
    end loop;
  else
    for v_user in
      select distinct c.user_id from new_rows r join public.carts c on c.id = r.cart_id
    loop
      perform realtime.send('{}'::jsonb, 'changed', 'cart:' || v_user::text, true);
    end loop;
  end if;
  return null;
end;
$$;

revoke execute on function public.notify_cart_changed() from public, anon, authenticated;

create trigger cart_items_notify_insert
  after insert on public.cart_items
  referencing new table as new_rows
  for each statement execute function public.notify_cart_changed();

create trigger cart_items_notify_update
  after update on public.cart_items
  referencing new table as new_rows
  for each statement execute function public.notify_cart_changed();

create trigger cart_items_notify_delete
  after delete on public.cart_items
  referencing old table as old_rows
  for each statement execute function public.notify_cart_changed();

-- Realtime Authorization: a signed-in user may receive broadcasts on their own
-- cart topic only. No insert policy, so clients can't send on it; only the
-- database (above) can. Clients must join with `config: { private: true }`.
create policy "cart topic: owner receives" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'cart:' || (select auth.uid())::text
  );
