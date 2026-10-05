-- Customer-owned data: carts, wishlists, addresses.
-- Customers can only ever touch their own rows (Architecture.md §6).

-- ---------------------------------------------------------------------------
-- carts: exactly one per user. cart_items unique per (cart, variant) so that
-- guest-cart merges add quantities instead of creating duplicate lines.
-- ---------------------------------------------------------------------------
create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  quantity    int not null check (quantity between 1 and 10),
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cart_items_cart_variant_unique unique (cart_id, variant_id)
);

create index cart_items_variant_idx on public.cart_items (variant_id);

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------------
create table public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.wishlist_items (
  id           uuid primary key default gen_random_uuid(),
  wishlist_id  uuid not null references public.wishlists (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  added_at     timestamptz not null default now(),
  constraint wishlist_items_unique unique (wishlist_id, product_id)
);

create index wishlist_items_product_idx on public.wishlist_items (product_id);

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 120),
  phone       text not null check (char_length(phone) between 7 and 32),
  line1       text not null check (char_length(line1) between 3 and 200),
  line2       text check (char_length(line2) <= 200),
  city        text not null check (char_length(city) between 2 and 80),
  state       text not null check (char_length(state) between 2 and 80),
  country     char(2) not null default 'NG' check (country ~ '^[A-Z]{2}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.carts           enable row level security;
alter table public.cart_items      enable row level security;
alter table public.wishlists       enable row level security;
alter table public.wishlist_items  enable row level security;
alter table public.addresses       enable row level security;

create policy "carts: own or admin read" on public.carts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "carts: insert own" on public.carts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "cart_items: own or admin read" on public.cart_items
  for select to authenticated
  using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "cart_items: insert own" on public.cart_items
  for insert to authenticated
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));
create policy "cart_items: update own" on public.cart_items
  for update to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));
create policy "cart_items: delete own" on public.cart_items
  for delete to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

create policy "wishlists: own or admin read" on public.wishlists
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "wishlists: insert own" on public.wishlists
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "wishlist_items: own or admin read" on public.wishlist_items
  for select to authenticated
  using (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "wishlist_items: insert own" on public.wishlist_items
  for insert to authenticated
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));
create policy "wishlist_items: delete own" on public.wishlist_items
  for delete to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));

create policy "addresses: own or admin read" on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "addresses: insert own" on public.addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "addresses: update own" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "addresses: delete own" on public.addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Guests never touch these tables directly; their cart lives in localStorage.
revoke all on public.carts, public.cart_items, public.wishlists,
  public.wishlist_items, public.addresses from anon;
-- A cart/wishlist row's owner can't be reassigned.
revoke update on public.carts, public.wishlists from authenticated;
-- Column-level revokes don't override a table-level grant, so revoke the table
-- grant and re-grant only the column a customer may change.
revoke update on public.cart_items from authenticated;
grant update (quantity) on public.cart_items to authenticated;
