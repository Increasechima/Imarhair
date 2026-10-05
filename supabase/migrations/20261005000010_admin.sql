-- M4: admin operations (prd.md §6.18). Every function checks is_admin()
-- itself, so calling it directly with a customer's session fails.
-- Catalogue edits (products, variants, images, reviews, discount codes) go
-- through the existing admin RLS policies; stock and order status go through
-- these functions (AGENTS.md rule 8).

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.assert_admin() from public, anon;
grant execute on function public.assert_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Order status changes. Allowed transitions:
--   pending_payment    → cancelled
--   paid               → processing | cancelled | refunded
--   processing         → ready_for_dispatch | shipped | cancelled | refunded
--   ready_for_dispatch → shipped | cancelled | refunded
--   shipped            → delivered | refunded
--   delivered          → refunded
-- Same status = tracking/note update only. Stock: cancelling an unpaid order
-- releases its hold; cancelling a paid order that hasn't shipped restocks it.
-- Refunds don't restock (returned items are counted back in by hand).
-- Returns the email to send (or null).
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_order_status(
  p_order_id         uuid,
  p_to_status        public.order_status,
  p_note             text default null,
  p_tracking_number  text default null,
  p_tracking_url     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order   public.orders%rowtype;
  v_allowed public.order_status[];
  v_item    record;
begin
  perform public.assert_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if nullif(trim(coalesce(p_tracking_url, '')), '') is not null and p_tracking_url !~ '^https://' then
    raise exception 'INVALID_TRACKING_URL' using errcode = '22023';
  end if;

  if p_to_status = v_order.status then
    update public.orders
    set tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
        tracking_url = coalesce(nullif(trim(p_tracking_url), ''), tracking_url)
    where id = p_order_id;
    if nullif(trim(coalesce(p_note, '')), '') is not null or nullif(trim(coalesce(p_tracking_number, '')), '') is not null then
      insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
      values (p_order_id, v_order.status, v_order.status,
              coalesce(nullif(trim(p_note), ''), 'Tracking updated'), auth.uid());
    end if;
    return jsonb_build_object('from_status', v_order.status, 'to_status', v_order.status, 'email', null);
  end if;

  v_allowed := case v_order.status
    when 'pending_payment'    then array['cancelled']::public.order_status[]
    when 'paid'               then array['processing', 'cancelled', 'refunded']::public.order_status[]
    when 'processing'         then array['ready_for_dispatch', 'shipped', 'cancelled', 'refunded']::public.order_status[]
    when 'ready_for_dispatch' then array['shipped', 'cancelled', 'refunded']::public.order_status[]
    when 'shipped'            then array['delivered', 'refunded']::public.order_status[]
    when 'delivered'          then array['refunded']::public.order_status[]
    else array[]::public.order_status[]
  end;
  if not (p_to_status = any (v_allowed)) then
    raise exception 'INVALID_TRANSITION' using errcode = '22023',
      detail = format('%s → %s is not allowed', v_order.status, p_to_status);
  end if;

  if p_to_status = 'cancelled' then
    if v_order.status = 'pending_payment' then
      for v_item in
        select r.id, r.variant_id, r.quantity from public.inventory_reservations r
        where r.order_id = p_order_id and r.status = 'active' order by r.variant_id
      loop
        update public.inventory set reserved = greatest(reserved - v_item.quantity, 0) where variant_id = v_item.variant_id;
        update public.inventory_reservations set status = 'released' where id = v_item.id;
      end loop;
    else
      for v_item in
        select oi.variant_id, oi.quantity from public.order_items oi
        where oi.order_id = p_order_id and oi.variant_id is not null order by oi.variant_id
      loop
        update public.inventory set on_hand = on_hand + v_item.quantity where variant_id = v_item.variant_id;
      end loop;
    end if;
  end if;

  update public.orders
  set status = p_to_status,
      cancelled_at = case when p_to_status = 'cancelled' then now() else cancelled_at end,
      cancel_reason = case when p_to_status = 'cancelled' then coalesce(nullif(trim(p_note), ''), 'Cancelled by Imarhair') else cancel_reason end,
      tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
      tracking_url = coalesce(nullif(trim(p_tracking_url), ''), tracking_url)
  where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_order.status, p_to_status, nullif(trim(p_note), ''), auth.uid());

  return jsonb_build_object(
    'from_status', v_order.status,
    'to_status', p_to_status,
    'email', case p_to_status
      when 'processing' then 'order_processing'
      when 'shipped'    then 'order_shipped'
      when 'delivered'  then 'order_delivered'
      when 'cancelled'  then 'order_cancelled'
      when 'refunded'   then 'order_refunded'
    end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Stock: set the physical count. Can't go below what pending checkouts hold.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_stock(p_variant_id uuid, p_on_hand int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserved int;
begin
  perform public.assert_admin();
  if p_on_hand is null or p_on_hand < 0 or p_on_hand > 100000 then
    raise exception 'INVALID_STOCK' using errcode = '22023';
  end if;
  select reserved into v_reserved from public.inventory where variant_id = p_variant_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_on_hand < v_reserved then
    raise exception 'BELOW_RESERVED' using errcode = '22023',
      detail = format('%s units are held by checkouts in progress', v_reserved);
  end if;
  update public.inventory set on_hand = p_on_hand where variant_id = p_variant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard numbers (prd.md §6.18). "Today" is the Lagos day.
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_paid  public.order_status[] := array['paid', 'processing', 'ready_for_dispatch', 'shipped', 'delivered']::public.order_status[];
  v_result jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'today_orders',   (select count(*) from public.orders where paid_at >= v_today and status = any (v_paid)),
    'today_revenue',  (select coalesce(sum(total), 0) from public.orders where paid_at >= v_today and status = any (v_paid)),
    'week_orders',    (select count(*) from public.orders where paid_at >= v_today - interval '6 days' and status = any (v_paid)),
    'week_revenue',   (select coalesce(sum(total), 0) from public.orders where paid_at >= v_today - interval '6 days' and status = any (v_paid)),
    'needs_action',   (select count(*) from public.orders where status in ('paid', 'processing', 'ready_for_dispatch')),
    'awaiting_payment', (select count(*) from public.orders where status = 'pending_payment'),
    'low_stock', coalesce((
      select jsonb_agg(row_to_json(s) order by s.available, s.product_name)
      from (
        select v.id as variant_id, p.id as product_id, p.name as product_name, v.sku,
               concat_ws(' · ', case when v.length_inches is not null then v.length_inches || '"' end, v.density, v.colour) as variant_label,
               greatest(i.on_hand - i.reserved, 0) as available, i.low_stock_threshold
        from public.inventory i
        join public.product_variants v on v.id = i.variant_id
        join public.products p on p.id = v.product_id
        where p.is_published and v.is_active and i.on_hand - i.reserved <= i.low_stock_threshold
        order by greatest(i.on_hand - i.reserved, 0), p.name
        limit 12
      ) s
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers with email (from auth.users) and order totals.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_customers(
  p_search  text default null,
  p_limit   int default 50,
  p_offset  int default 0,
  p_id      uuid default null
)
returns table (
  id uuid, email text, full_name text, phone text, created_at timestamptz,
  orders_count bigint, total_spent bigint, last_order_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, u.email::text, p.full_name, p.phone, p.created_at,
         count(o.id) filter (where o.status not in ('pending_payment', 'cancelled')) as orders_count,
         coalesce(sum(o.total) filter (where o.status in ('paid', 'processing', 'ready_for_dispatch', 'shipped', 'delivered')), 0)::bigint as total_spent,
         max(o.created_at) as last_order_at,
         count(*) over () as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.orders o on o.user_id = p.id
  where (p_id is null or p.id = p_id)
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or u.email ilike '%' || replace(replace(trim(p_search), '%', ''), '_', '') || '%'
      or p.full_name ilike '%' || replace(replace(trim(p_search), '%', ''), '_', '') || '%'
      or p.phone ilike '%' || replace(replace(trim(p_search), '%', ''), '_', '') || '%'
    )
  group by p.id, u.email
  order by max(o.created_at) desc nulls last, p.created_at desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, public.order_status, text, text, text) from public, anon;
revoke execute on function public.admin_set_stock(uuid, int) from public, anon;
revoke execute on function public.admin_dashboard() from public, anon;
revoke execute on function public.admin_list_customers(text, int, int, uuid) from public, anon;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text, text, text) to authenticated;
grant execute on function public.admin_set_stock(uuid, int) to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_list_customers(text, int, int, uuid) to authenticated;

-- Admin list/search performance.
create index if not exists orders_order_number_trgm_idx on public.orders using gin (order_number extensions.gin_trgm_ops);
create index if not exists orders_contact_name_trgm_idx on public.orders using gin (contact_name extensions.gin_trgm_ops);
create index if not exists reviews_created_idx on public.reviews (created_at desc);
