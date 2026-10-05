-- Auth lifecycle hooks and guest → account merge functions.

-- ---------------------------------------------------------------------------
-- Attach guest orders to an account once its email is verified
-- (Architecture.md §8.6). Never on an unverified email.
-- ---------------------------------------------------------------------------
create or replace function public.claim_guest_orders(p_user_id uuid, p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set user_id = p_user_id
  where user_id is null
    -- With search_path = '' a bare `=` resolves to case-sensitive text
    -- equality; qualify citext's operator explicitly.
    and email operator(extensions.=) p_email::extensions.citext;
$$;

revoke execute on function public.claim_guest_orders(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- New auth user → profile, cart, wishlist (+ claim orders if already verified,
-- e.g. Google sign-in).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), 120), '')
  )
  on conflict (id) do nothing;

  insert into public.carts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.wishlists (user_id) values (new.id) on conflict (user_id) do nothing;

  if new.email_confirmed_at is not null and new.email is not null then
    perform public.claim_guest_orders(new.id, new.email);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.claim_guest_orders(new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_user_email_confirmed() from public, anon, authenticated;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null and new.email is not null)
  execute function public.handle_user_email_confirmed();

-- ---------------------------------------------------------------------------
-- merge_cart: guest localStorage lines → the signed-in user's cart.
-- SECURITY INVOKER: runs as the caller, so RLS still applies.
-- Same variant ⇒ quantities add up (capped at 10 and at available stock).
-- p_lines: [{ "variant_id": uuid, "quantity": int }, …] (max 50)
-- ---------------------------------------------------------------------------
create or replace function public.merge_cart(p_lines jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_cart  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 50 then
    raise exception 'invalid cart lines' using errcode = '22023';
  end if;

  insert into public.carts (user_id) values (v_uid) on conflict (user_id) do nothing;
  select c.id into v_cart from public.carts c where c.user_id = v_uid;

  insert into public.cart_items (cart_id, variant_id, quantity)
  select v_cart, l.variant_id, least(sum(l.quantity), 10)
  from jsonb_to_recordset(p_lines) as l(variant_id uuid, quantity int)
  join public.variant_availability a on a.variant_id = l.variant_id  -- active + published only
  where l.quantity between 1 and 10
  group by l.variant_id
  on conflict (cart_id, variant_id)
  do update set quantity = least(public.cart_items.quantity + excluded.quantity, 10);

  -- Never hold more than is in stock. Sold-out lines are kept (the cart UI
  -- explains them) rather than silently deleted.
  update public.cart_items ci
  set quantity = a.available
  from public.variant_availability a
  where ci.cart_id = v_cart
    and a.variant_id = ci.variant_id
    and a.available > 0
    and ci.quantity > a.available;
end;
$$;

revoke execute on function public.merge_cart(jsonb) from public, anon;
grant execute on function public.merge_cart(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- merge_wishlist: guest wishlist product ids → user's wishlist (no duplicates).
-- ---------------------------------------------------------------------------
create or replace function public.merge_wishlist(p_product_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_wishlist  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_product_ids is null or cardinality(p_product_ids) > 200 then
    raise exception 'invalid wishlist' using errcode = '22023';
  end if;

  insert into public.wishlists (user_id) values (v_uid) on conflict (user_id) do nothing;
  select w.id into v_wishlist from public.wishlists w where w.user_id = v_uid;

  insert into public.wishlist_items (wishlist_id, product_id)
  select v_wishlist, p.id
  from public.products p
  where p.id = any (p_product_ids) and p.is_published
  on conflict (wishlist_id, product_id) do nothing;
end;
$$;

revoke execute on function public.merge_wishlist(uuid[]) from public, anon;
grant execute on function public.merge_wishlist(uuid[]) to authenticated;
