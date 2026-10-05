-- M3: checkout, stock reservation, payment confirmation (Architecture.md §8).
-- Every function here is SECURITY DEFINER and callable only by the service
-- role (privileged server code). Customers never write orders/payments/stock.

-- ---------------------------------------------------------------------------
-- quote_order: the single source of truth for checkout pricing.
-- p_lines: [{ "variant_id": uuid, "quantity": int }]. Duplicate variants are
-- summed. With p_lock = true the inventory rows are locked FOR UPDATE (in
-- variant_id order, to avoid deadlocks) so the quote stays valid for the
-- rest of the calling transaction.
-- ---------------------------------------------------------------------------
create or replace function public.quote_order(
  p_lines            jsonb,
  p_country          text,
  p_state            text,
  p_delivery_method  text,
  p_discount_code    text,
  p_lock             boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lines      jsonb;
  v_subtotal   bigint := 0;
  v_issues     int := 0;
  v_zone       text;
  v_delivery   jsonb;
  v_fee        bigint := 0;
  v_discount   bigint := 0;
  v_code       public.discount_codes%rowtype;
  v_code_error text;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0
     or jsonb_array_length(p_lines) > 50 then
    raise exception 'CHECKOUT_INVALID' using errcode = 'P0001', detail = 'lines';
  end if;

  if p_lock then
    perform 1
    from public.inventory i
    where i.variant_id in (
      select (l ->> 'variant_id')::uuid from jsonb_array_elements(p_lines) l
    )
    order by i.variant_id
    for update;
  end if;

  with wanted as (
    select (l ->> 'variant_id')::uuid as variant_id,
           least(sum((l ->> 'quantity')::int), 10)::int as quantity
    from jsonb_array_elements(p_lines) l
    where (l ->> 'quantity')::int between 1 and 10
    group by 1
  ),
  priced as (
    select
      w.variant_id,
      w.quantity,
      v.product_id,
      p.name  as product_name,
      p.slug,
      v.sku,
      concat_ws(' · ',
        case when v.length_inches is not null then v.length_inches || '"' end,
        v.density, v.colour, v.lace_type)                     as variant_label,
      (select pi.storage_path from public.product_images pi
        where pi.product_id = p.id order by pi.position limit 1) as image_path,
      v.price                                                 as unit_price,
      greatest(coalesce(i.on_hand - i.reserved, 0), 0)        as available,
      case
        when v.id is null or not v.is_active or not p.is_published then 'unavailable'
        when coalesce(i.on_hand - i.reserved, 0) <= 0 then 'sold_out'
        when coalesce(i.on_hand - i.reserved, 0) < w.quantity then 'insufficient'
      end                                                     as issue
    from wanted w
    left join public.product_variants v on v.id = w.variant_id
    left join public.products p on p.id = v.product_id
    left join public.inventory i on i.variant_id = v.id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'variant_id', variant_id, 'product_id', product_id, 'product_name', product_name, 'slug', slug,
      'sku', sku, 'variant_label', variant_label, 'image_path', image_path,
      'unit_price', unit_price, 'quantity', quantity,
      'line_total', coalesce(unit_price, 0) * quantity,
      'available', available, 'issue', issue
    ) order by product_name, variant_label), '[]'::jsonb),
    coalesce(sum(unit_price * quantity) filter (where issue is null), 0),
    count(*) filter (where issue is not null)
  into v_lines, v_subtotal, v_issues
  from priced;

  -- Delivery (zone from the address; prd.md Q3 placeholder prices).
  v_zone := case
    when upper(coalesce(p_country, '')) = 'NG' then
      case when p_state = 'Lagos' then 'lagos' else 'nigeria' end
    else 'international'
  end;

  if p_delivery_method is not null then
    select jsonb_build_object(
             'code', m.code, 'name', m.name, 'zone', v_zone, 'fee', r.price,
             'eta_min_days', r.eta_min_days, 'eta_max_days', r.eta_max_days,
             'eta_text', case
               when r.eta_max_days <= 1 then 'Same or next working day'
               else r.eta_min_days || '–' || r.eta_max_days || ' working days'
             end),
           r.price
    into v_delivery, v_fee
    from public.delivery_methods m
    join public.delivery_rates r on r.method_id = m.id and r.zone = v_zone
    where m.code = p_delivery_method and m.is_active;
  end if;

  -- Discount code.
  if nullif(trim(coalesce(p_discount_code, '')), '') is not null then
    select * into v_code
    from public.discount_codes d
    where d.code operator(extensions.=) trim(p_discount_code)::extensions.citext;

    if v_code.id is null or not v_code.is_active
       or (v_code.starts_at is not null and v_code.starts_at > now())
       or (v_code.ends_at is not null and v_code.ends_at <= now())
       or (v_code.usage_limit is not null and v_code.times_used >= v_code.usage_limit) then
      v_code_error := 'invalid';
    elsif v_subtotal < v_code.min_subtotal then
      v_code_error := 'min_subtotal';
    else
      v_discount := case v_code.type
        when 'percent' then (v_subtotal * v_code.value) / 100
        else least(v_code.value::bigint, v_subtotal)
      end;
    end if;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'zone', v_zone,
    'delivery', v_delivery,
    'delivery_fee', coalesce(v_fee, 0),
    'discount', v_discount,
    'discount_code_id', case when v_code_error is null then v_code.id end,
    'discount_error', v_code_error,
    'discount_min_subtotal', v_code.min_subtotal,
    'total', v_subtotal + coalesce(v_fee, 0) - v_discount,
    'issues', v_issues
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_pending_order: one transaction — lock stock, re-price, reserve stock
-- for 30 minutes, snapshot the order. Raises CHECKOUT_INVALID (detail = the
-- quote as JSON) if anything changed since the shopper last saw it.
-- ---------------------------------------------------------------------------
create or replace function public.create_pending_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote   jsonb;
  v_order   public.orders%rowtype;
  v_ship    jsonb := p_order -> 'shipping';
  v_line    jsonb;
begin
  if coalesce(p_order ->> 'email', '') = '' or coalesce(p_order ->> 'contact_name', '') = ''
     or v_ship is null or coalesce(v_ship ->> 'line1', '') = '' then
    raise exception 'CHECKOUT_INVALID' using errcode = 'P0001', detail = '{"reason":"missing_fields"}';
  end if;

  v_quote := public.quote_order(
    p_order -> 'lines', v_ship ->> 'country', v_ship ->> 'state',
    p_order ->> 'delivery_method', p_order ->> 'discount_code', true
  );

  if (v_quote ->> 'issues')::int > 0
     or v_quote -> 'delivery' is null or jsonb_typeof(v_quote -> 'delivery') = 'null'
     or v_quote ->> 'discount_error' is not null then
    raise exception 'CHECKOUT_INVALID' using errcode = 'P0001', detail = v_quote::text;
  end if;

  insert into public.orders (
    order_number, user_id, email, status, subtotal, delivery_fee, discount_total, total,
    discount_code_id, contact_name, contact_phone,
    shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_country,
    delivery_method_code, delivery_method_name, delivery_eta_text, notes
  ) values (
    public.next_order_number(),
    nullif(p_order ->> 'user_id', '')::uuid,
    lower(trim(p_order ->> 'email')),
    'pending_payment',
    (v_quote ->> 'subtotal')::bigint,
    (v_quote ->> 'delivery_fee')::bigint,
    (v_quote ->> 'discount')::bigint,
    (v_quote ->> 'total')::bigint,
    nullif(v_quote ->> 'discount_code_id', '')::uuid,
    p_order ->> 'contact_name',
    p_order ->> 'contact_phone',
    v_ship ->> 'name', v_ship ->> 'phone', v_ship ->> 'line1', nullif(v_ship ->> 'line2', ''),
    v_ship ->> 'city', v_ship ->> 'state', upper(v_ship ->> 'country'),
    v_quote -> 'delivery' ->> 'code', v_quote -> 'delivery' ->> 'name', v_quote -> 'delivery' ->> 'eta_text',
    nullif(p_order ->> 'notes', '')
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(v_quote -> 'lines') loop
    insert into public.order_items (
      order_id, variant_id, product_id, product_name, variant_label, sku, image_path, unit_price, quantity, line_total
    ) values (
      v_order.id,
      (v_line ->> 'variant_id')::uuid,
      (v_line ->> 'product_id')::uuid,
      v_line ->> 'product_name',
      nullif(v_line ->> 'variant_label', ''),
      v_line ->> 'sku',
      v_line ->> 'image_path',
      (v_line ->> 'unit_price')::bigint,
      (v_line ->> 'quantity')::int,
      (v_line ->> 'line_total')::bigint
    );

    update public.inventory
    set reserved = reserved + (v_line ->> 'quantity')::int
    where variant_id = (v_line ->> 'variant_id')::uuid;

    insert into public.inventory_reservations (order_id, variant_id, quantity, expires_at)
    values (v_order.id, (v_line ->> 'variant_id')::uuid, (v_line ->> 'quantity')::int, now() + interval '30 minutes');
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order.id, null, 'pending_payment', 'Order placed');

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'email', v_order.email,
    'total', v_order.total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid: called only after the provider's Verify API confirmed the
-- payment. Idempotent. Returns:
--   'paid'                – newly paid
--   'paid_stock_conflict' – paid late, after its stock was sold (admin alert)
--   'already_paid'        – nothing to do
--   'amount_mismatch'     – amount/currency differ; order NOT marked paid
--   'not_found'
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_reference     text,
  p_amount        bigint,
  p_currency      text,
  p_channel       text,
  p_provider_txn  text,
  p_paid_at       timestamptz,
  p_raw           jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment   public.payments%rowtype;
  v_order     public.orders%rowtype;
  v_item      record;
  v_conflict  boolean := false;
  v_rows      int;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if v_payment.id is null then
    return 'not_found';
  end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;

  if v_order.status not in ('pending_payment', 'cancelled') then
    update public.payments
    set status = 'success', amount = p_amount, channel = coalesce(p_channel, channel),
        provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id),
        paid_at = coalesce(p_paid_at, paid_at, now()), raw = coalesce(p_raw, raw)
    where id = v_payment.id and status <> 'success';
    return 'already_paid';
  end if;

  if p_amount <> v_order.total or upper(coalesce(p_currency, '')) <> v_order.currency then
    update public.payments set raw = p_raw where id = v_payment.id;
    insert into public.order_status_history (order_id, from_status, to_status, note)
    values (v_order.id, v_order.status, v_order.status,
            format('Payment %s amount/currency mismatch: got %s %s, expected %s %s',
                   p_reference, p_amount, p_currency, v_order.total, v_order.currency));
    return 'amount_mismatch';
  end if;

  -- Commit stock: active reservations become sales.
  for v_item in
    select r.id, r.variant_id, r.quantity
    from public.inventory_reservations r
    where r.order_id = v_order.id and r.status = 'active'
    order by r.variant_id
  loop
    update public.inventory
    set on_hand = on_hand - v_item.quantity, reserved = reserved - v_item.quantity
    where variant_id = v_item.variant_id;
    update public.inventory_reservations set status = 'committed' where id = v_item.id;
  end loop;

  -- Lines whose reservation already expired: take stock if it's still there.
  for v_item in
    select oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.variant_id is not null
      and not exists (
        select 1 from public.inventory_reservations r
        where r.order_id = v_order.id and r.variant_id = oi.variant_id and r.status = 'committed'
      )
    order by oi.variant_id
  loop
    update public.inventory
    set on_hand = on_hand - v_item.quantity
    where variant_id = v_item.variant_id and on_hand - reserved >= v_item.quantity;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      v_conflict := true;
    end if;
  end loop;

  update public.orders
  set status = 'paid', paid_at = coalesce(p_paid_at, now()), cancelled_at = null, cancel_reason = null
  where id = v_order.id;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order.id, v_order.status, 'paid',
          case when v_conflict then 'STOCK CONFLICT: paid after reservation expired and stock ran out — fulfil or refund'
               else 'Payment verified (' || coalesce(p_channel, 'unknown channel') || ')' end);

  update public.payments
  set status = 'success', amount = p_amount, currency = upper(p_currency), channel = p_channel,
      provider_transaction_id = p_provider_txn, paid_at = coalesce(p_paid_at, now()), raw = p_raw
  where id = v_payment.id;

  if v_order.discount_code_id is not null then
    update public.discount_codes set times_used = times_used + 1 where id = v_order.discount_code_id;
  end if;

  update public.products p
  set sales_count = p.sales_count + s.qty
  from (
    select product_id, sum(quantity)::int as qty
    from public.order_items where order_id = v_order.id and product_id is not null
    group by product_id
  ) s
  where p.id = s.product_id;

  -- Remove only the purchased lines from the shopper's bag.
  if v_order.user_id is not null then
    delete from public.cart_items ci
    using public.carts c
    where ci.cart_id = c.id
      and c.user_id = v_order.user_id
      and ci.variant_id in (select oi.variant_id from public.order_items oi where oi.order_id = v_order.id);
  end if;

  return case when v_conflict then 'paid_stock_conflict' else 'paid' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- prepare_payment_retry: keep (or re-take) the stock hold for another 30 min
-- before a new payment attempt. Raises INSUFFICIENT_STOCK if it's gone.
-- ---------------------------------------------------------------------------
create or replace function public.prepare_payment_retry(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order  public.orders%rowtype;
  v_item   record;
  v_rows   int;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.status <> 'pending_payment' then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = 'P0001';
  end if;

  perform 1 from public.inventory i
  where i.variant_id in (select oi.variant_id from public.order_items oi where oi.order_id = p_order_id)
  order by i.variant_id
  for update;

  for v_item in
    select oi.variant_id, oi.quantity,
           (select r.id from public.inventory_reservations r
             where r.order_id = p_order_id and r.variant_id = oi.variant_id and r.status = 'active'
             limit 1) as reservation_id
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
    order by oi.variant_id
  loop
    if v_item.reservation_id is not null then
      update public.inventory_reservations
      set expires_at = now() + interval '30 minutes'
      where id = v_item.reservation_id;
    else
      update public.inventory
      set reserved = reserved + v_item.quantity
      where variant_id = v_item.variant_id and on_hand - reserved >= v_item.quantity;
      get diagnostics v_rows = row_count;
      if v_rows = 0 then
        raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
      end if;
      insert into public.inventory_reservations (order_id, variant_id, quantity, expires_at)
      values (p_order_id, v_item.variant_id, v_item.quantity, now() + interval '30 minutes');
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_expired_reservations: give back stock held by abandoned checkouts
-- and cancel those orders. Runs every 5 minutes (pg_cron, below).
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released int := 0;
  v_item     record;
begin
  for v_item in
    select r.id, r.variant_id, r.quantity
    from public.inventory_reservations r
    where r.status = 'active' and r.expires_at < now()
    order by r.variant_id
    for update skip locked
  loop
    update public.inventory set reserved = greatest(reserved - v_item.quantity, 0) where variant_id = v_item.variant_id;
    update public.inventory_reservations set status = 'released' where id = v_item.id;
    v_released := v_released + 1;
  end loop;

  with expired as (
    update public.orders o
    set status = 'cancelled', cancelled_at = now(), cancel_reason = 'payment_not_completed'
    where o.status = 'pending_payment'
      and o.created_at < now() - interval '30 minutes'
      and not exists (
        select 1 from public.inventory_reservations r where r.order_id = o.id and r.status = 'active'
      )
      and not exists (
        select 1 from public.payments p where p.order_id = o.id and p.status = 'success'
      )
    returning o.id
  )
  insert into public.order_status_history (order_id, from_status, to_status, note)
  select id, 'pending_payment', 'cancelled', 'Payment not completed in time; stock released' from expired;

  return v_released;
end;
$$;

-- Privileged server code only (service role). Never anon/authenticated.
revoke execute on function public.quote_order(jsonb, text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.create_pending_order(jsonb) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, bigint, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.prepare_payment_retry(uuid) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.quote_order(jsonb, text, text, text, text, boolean) to service_role;
grant execute on function public.create_pending_order(jsonb) to service_role;
grant execute on function public.mark_order_paid(text, bigint, text, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.prepare_payment_retry(uuid) to service_role;
grant execute on function public.release_expired_reservations() to service_role;

create index if not exists payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- Schedule the reservation sweep (Supabase ships pg_cron; skipped elsewhere).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule(
      'imar-release-expired-reservations',
      '*/5 * * * *',
      'select public.release_expired_reservations()'
    );
  end if;
end;
$$;
