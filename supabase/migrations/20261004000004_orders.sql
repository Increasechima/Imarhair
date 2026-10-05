-- Orders, payments, delivery, discounts and the bookkeeping tables around them.
-- Customers can READ their own orders; every write happens in privileged
-- server code or security-definer SQL functions (added in M3).

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'processing',
  'ready_for_dispatch',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- ---------------------------------------------------------------------------
-- delivery
-- ---------------------------------------------------------------------------
create table public.delivery_methods (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z_]+$'),
  name         text not null,
  description  text,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

create table public.delivery_rates (
  id            uuid primary key default gen_random_uuid(),
  method_id     uuid not null references public.delivery_methods (id) on delete cascade,
  zone          text not null check (zone in ('lagos', 'nigeria', 'international')),
  price         bigint not null check (price >= 0),
  eta_min_days  int not null check (eta_min_days >= 0),
  eta_max_days  int not null,
  constraint delivery_rates_eta_check check (eta_max_days >= eta_min_days),
  constraint delivery_rates_method_zone_unique unique (method_id, zone)
);

-- ---------------------------------------------------------------------------
-- discount codes
-- ---------------------------------------------------------------------------
create table public.discount_codes (
  id            uuid primary key default gen_random_uuid(),
  code          extensions.citext not null unique check (char_length(code) between 3 and 40),
  type          text not null check (type in ('percent', 'fixed')),
  value         int not null check (value > 0),
  min_subtotal  bigint not null default 0 check (min_subtotal >= 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  usage_limit   int check (usage_limit is null or usage_limit > 0),
  times_used    int not null default 0 check (times_used >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint discount_codes_percent_range check (type <> 'percent' or value between 1 and 100),
  constraint discount_codes_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- order numbers: IMR-YYYYMMDD-NNN, daily sequence in Africa/Lagos time
-- ---------------------------------------------------------------------------
create table public.order_number_counters (
  day         date primary key,
  last_value  int not null
);

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Africa/Lagos')::date;
  v_n   int;
begin
  insert into public.order_number_counters as c (day, last_value)
  values (v_day, 1)
  on conflict (day) do update set last_value = c.last_value + 1
  returning c.last_value into v_n;

  -- Pad to 3 digits; never truncate if a day exceeds 999 orders.
  return 'IMR-' || to_char(v_day, 'YYYYMMDD') || '-'
         || case when v_n < 1000 then lpad(v_n::text, 3, '0') else v_n::text end;
end;
$$;

revoke execute on function public.next_order_number() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- orders: address, delivery and prices are snapshotted at purchase time.
-- ---------------------------------------------------------------------------
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique check (order_number ~ '^IMR-[0-9]{8}-[0-9]{3,}$'),
  user_id               uuid references public.profiles (id) on delete set null,
  email                 extensions.citext not null,
  -- Unguessable token so guests can open their confirmation page.
  access_token          text not null unique
                          default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status                public.order_status not null default 'pending_payment',
  subtotal              bigint not null check (subtotal >= 0),
  delivery_fee          bigint not null default 0 check (delivery_fee >= 0),
  discount_total        bigint not null default 0 check (discount_total >= 0),
  total                 bigint not null check (total >= 0),
  currency              char(3) not null default 'NGN',
  discount_code_id      uuid references public.discount_codes (id) on delete set null,
  contact_name          text not null,
  contact_phone         text not null,
  shipping_name         text not null,
  shipping_phone        text not null,
  shipping_line1        text not null,
  shipping_line2        text,
  shipping_city         text not null,
  shipping_state        text not null,
  shipping_country      char(2) not null,
  delivery_method_code  text not null,
  delivery_method_name  text not null,
  delivery_eta_text     text,
  tracking_number       text,
  tracking_url          text check (tracking_url is null or tracking_url ~ '^https://'),
  notes                 text,
  paid_at               timestamptz,
  cancelled_at          timestamptz,
  cancel_reason         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint orders_total_consistent check (total = subtotal + delivery_fee - discount_total)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_email_idx on public.orders (email);
create index orders_discount_code_idx on public.orders (discount_code_id);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  variant_id     uuid references public.product_variants (id) on delete set null,
  product_id     uuid references public.products (id) on delete set null,
  product_name   text not null,
  variant_label  text,
  sku            text not null,
  image_path     text,
  unit_price     bigint not null check (unit_price >= 0),
  quantity       int not null check (quantity between 1 and 10),
  line_total     bigint not null,
  constraint order_items_line_total_consistent check (line_total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  note         text,
  changed_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------------------------------------------------------------------------
-- stock reservations (held while a pending order is being paid)
-- ---------------------------------------------------------------------------
create table public.inventory_reservations (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  quantity    int not null check (quantity > 0),
  expires_at  timestamptz not null,
  status      text not null default 'active' check (status in ('active', 'committed', 'released')),
  created_at  timestamptz not null default now()
);

create index inventory_reservations_status_expiry_idx on public.inventory_reservations (status, expires_at);
create index inventory_reservations_order_idx on public.inventory_reservations (order_id);
create index inventory_reservations_variant_idx on public.inventory_reservations (variant_id);

-- ---------------------------------------------------------------------------
-- payments: one row per attempt. NEVER store card numbers, CVV or PINs.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references public.orders (id) on delete cascade,
  provider                 text not null check (provider in ('paystack', 'flutterwave')),
  reference                text not null unique,
  provider_transaction_id  text,
  status                   text not null default 'initialized'
                             check (status in ('initialized', 'success', 'failed', 'abandoned', 'refunded')),
  amount                   bigint not null check (amount >= 0),
  currency                 char(3) not null default 'NGN',
  channel                  text,
  paid_at                  timestamptz,
  raw                      jsonb,   -- sanitised provider payload
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- webhook idempotency + email log
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  event_id      text not null,
  type          text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  constraint webhook_events_unique unique (provider, event_id)
);

create table public.email_log (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references public.orders (id) on delete set null,
  user_id              uuid references public.profiles (id) on delete set null,
  type                 text not null,
  to_email             extensions.citext not null,
  provider_message_id  text,
  status               text not null default 'sent' check (status in ('sent', 'failed')),
  error                text,
  created_at           timestamptz not null default now()
);

-- An order email of a given type is sent at most once.
create unique index email_log_order_type_idx on public.email_log (order_id, type)
  where order_id is not null and status = 'sent';
create index email_log_user_idx on public.email_log (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.delivery_methods        enable row level security;
alter table public.delivery_rates          enable row level security;
alter table public.discount_codes          enable row level security;
alter table public.order_number_counters   enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.order_status_history    enable row level security;
alter table public.inventory_reservations  enable row level security;
alter table public.payments                enable row level security;
alter table public.webhook_events          enable row level security;
alter table public.email_log               enable row level security;

create policy "delivery_methods: public read active" on public.delivery_methods
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "delivery_methods: admin write" on public.delivery_methods
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "delivery_rates: public read" on public.delivery_rates
  for select to anon, authenticated
  using (
    exists (select 1 from public.delivery_methods m where m.id = method_id and m.is_active)
    or (select public.is_admin())
  );
create policy "delivery_rates: admin write" on public.delivery_rates
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Discount codes are validated by SQL functions only; never listable by customers.
create policy "discount_codes: admin only" on public.discount_codes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "orders: own or admin read" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "orders: admin update" on public.orders
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "order_items: own or admin read" on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy "order_status_history: own or admin read" on public.order_status_history
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy "payments: own or admin read" on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy "inventory_reservations: admin read" on public.inventory_reservations
  for select to authenticated using ((select public.is_admin()));
create policy "order_number_counters: admin read" on public.order_number_counters
  for select to authenticated using ((select public.is_admin()));
create policy "webhook_events: admin read" on public.webhook_events
  for select to authenticated using ((select public.is_admin()));
create policy "email_log: admin read" on public.email_log
  for select to authenticated using ((select public.is_admin()));

-- Grants. Customers read their orders; only these order columns are admin-editable
-- through the user-scoped client (status changes go through updateOrderStatus).
revoke all on
  public.discount_codes, public.order_number_counters, public.orders, public.order_items,
  public.order_status_history, public.inventory_reservations, public.payments,
  public.webhook_events, public.email_log
  from anon;
revoke insert, update, delete, truncate on
  public.order_number_counters, public.orders, public.order_items,
  public.order_status_history, public.inventory_reservations, public.payments,
  public.webhook_events, public.email_log
  from authenticated;
grant update (tracking_number, tracking_url, notes) on public.orders to authenticated;
revoke insert, update, delete, truncate on public.delivery_methods, public.delivery_rates from anon;
