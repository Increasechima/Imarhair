-- Catalogue: categories, collections, products, variants, images, inventory.
-- Public can read published catalogue data; only admins write.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind        text not null check (kind in ('wig', 'bundle', 'haircare')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------
create table public.collections (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description      text,
  hero_image_path  text,
  status           text not null default 'active' check (status in ('active', 'coming_soon', 'hidden')),
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 160),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description       text,
  details           jsonb not null default '{}'::jsonb,
  care              text,
  category_id       uuid not null references public.categories (id) on delete restrict,
  collection_id     uuid references public.collections (id) on delete set null,
  base_price        bigint not null check (base_price >= 0),
  compare_at_price  bigint check (compare_at_price is null or compare_at_price > base_price),
  is_published      boolean not null default false,
  is_featured       boolean not null default false,
  is_best_seller    boolean not null default false,
  position          int not null default 0,
  sales_count       int not null default 0 check (sales_count >= 0),
  search            tsvector generated always as (
                      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(description, '')), 'C')
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_published_featured_idx on public.products (is_published, is_featured, position);
create index products_published_best_seller_idx on public.products (is_published, is_best_seller);
create index products_category_idx on public.products (category_id);
create index products_collection_idx on public.products (collection_id);
create index products_created_at_idx on public.products (created_at desc);
create index products_search_idx on public.products using gin (search);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete cascade,
  sku               text not null unique,
  length_inches     smallint check (length_inches between 4 and 40),
  density           text,   -- e.g. '200g', '180%'
  colour            text,   -- e.g. 'Natural Black'
  lace_type         text,   -- e.g. '5x5 Swiss Lace', '13x4 HD Lace'
  price             bigint not null check (price >= 0),
  compare_at_price  bigint check (compare_at_price is null or compare_at_price > price),
  is_default        boolean not null default false,
  is_active         boolean not null default true,
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint product_variants_options_unique
    unique nulls not distinct (product_id, length_inches, density, colour, lace_type)
);

create index product_variants_product_idx on public.product_variants (product_id, position);
create index product_variants_length_idx on public.product_variants (length_inches) where is_active;
create unique index product_variants_one_default_idx
  on public.product_variants (product_id) where is_default;

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  variant_id    uuid references public.product_variants (id) on delete set null,
  storage_path  text not null,
  alt           text not null check (char_length(alt) between 3 and 200),
  position      int not null default 0,
  width         int check (width > 0),
  height        int check (height > 0),
  created_at    timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, position);
create index product_images_variant_idx on public.product_images (variant_id);

-- ---------------------------------------------------------------------------
-- inventory (one row per variant). available = on_hand - reserved.
-- Only changed through SQL functions (create_pending_order, mark_order_paid…)
-- or by admins.
-- ---------------------------------------------------------------------------
create table public.inventory (
  variant_id           uuid primary key references public.product_variants (id) on delete cascade,
  on_hand              int not null default 0 check (on_hand >= 0),
  reserved             int not null default 0 check (reserved >= 0),
  low_stock_threshold  int not null default 3 check (low_stock_threshold >= 0),
  updated_at           timestamptz not null default now(),
  constraint inventory_reserved_lte_on_hand check (reserved <= on_hand)
);

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- Every variant gets an inventory row automatically.
create or replace function public.create_inventory_for_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (variant_id) values (new.id)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_inventory_for_variant() from public, anon, authenticated;

create trigger product_variants_create_inventory
  after insert on public.product_variants
  for each row execute function public.create_inventory_for_variant();

-- ---------------------------------------------------------------------------
-- Public stock view. Runs as owner (bypasses inventory RLS) but only exposes
-- availability for active variants of published products.
-- ---------------------------------------------------------------------------
create view public.variant_availability
with (security_invoker = false)
as
select
  v.id                                         as variant_id,
  v.product_id,
  greatest(i.on_hand - i.reserved, 0)          as available,
  (i.on_hand - i.reserved) > 0                 as is_in_stock,
  (i.on_hand - i.reserved) between 1 and i.low_stock_threshold as is_low_stock
from public.product_variants v
join public.products p   on p.id = v.product_id
join public.inventory i  on i.variant_id = v.id
where p.is_published and v.is_active;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories        enable row level security;
alter table public.collections       enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.product_images    enable row level security;
alter table public.inventory         enable row level security;

create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admin write" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "collections: public read visible" on public.collections
  for select to anon, authenticated using (status <> 'hidden' or (select public.is_admin()));
create policy "collections: admin write" on public.collections
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "products: public read published" on public.products
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "products: admin write" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "variants: public read if product published" on public.product_variants
  for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.products p where p.id = product_id and p.is_published
    ))
    or (select public.is_admin())
  );
create policy "variants: admin write" on public.product_variants
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "images: public read if product published" on public.product_images
  for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    or (select public.is_admin())
  );
create policy "images: admin write" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "inventory: admin only" on public.inventory
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Grants: anon is read-only on the catalogue; writes are policy-gated to admins.
revoke insert, update, delete, truncate on
  public.categories, public.collections, public.products,
  public.product_variants, public.product_images, public.inventory
  from anon;
revoke all on public.inventory from anon;
grant select on public.variant_availability to anon, authenticated;
