-- Reviews, newsletter, contact messages, Instagram tiles, image storage.

-- ---------------------------------------------------------------------------
-- reviews: only approved reviews are ever public. No invented reviews.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products (id) on delete cascade,
  user_id              uuid references public.profiles (id) on delete set null,
  order_id             uuid references public.orders (id) on delete set null,
  author_display_name  text not null check (char_length(author_display_name) between 1 and 60),
  rating               smallint not null check (rating between 1 and 5),
  title                text check (char_length(title) <= 120),
  body                 text not null check (char_length(body) between 2 and 4000),
  source               text not null check (source in ('verified_purchase', 'imported')),
  is_approved          boolean not null default false,
  approved_by          uuid references public.profiles (id) on delete set null,
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  constraint reviews_approval_consistent check (not is_approved or approved_at is not null)
);

create index reviews_product_approved_idx on public.reviews (product_id, created_at desc) where is_approved;
create index reviews_user_idx on public.reviews (user_id);
create index reviews_order_idx on public.reviews (order_id);

-- ---------------------------------------------------------------------------
-- newsletter
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       extensions.citext not null unique
                check (email::text ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source      text not null default 'footer'
                check (source in ('footer', 'coming_soon_haircare', 'checkout', 'account')),
  status      text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contact messages
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       extensions.citext not null,
  phone       text check (char_length(phone) <= 32),
  message     text not null check (char_length(message) between 5 and 4000),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- instagram tiles (admin-managed; no live Instagram API in v1)
-- ---------------------------------------------------------------------------
create table public.instagram_tiles (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null,
  alt         text not null,
  link_url    text not null check (link_url ~ '^https://'),
  position    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reviews                 enable row level security;
alter table public.newsletter_subscribers  enable row level security;
alter table public.contact_messages        enable row level security;
alter table public.instagram_tiles         enable row level security;

create policy "reviews: public read approved" on public.reviews
  for select to anon, authenticated
  using (
    is_approved
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "reviews: admin write" on public.reviews
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Anyone may subscribe / send a message (rate-limited in the server action).
-- Nobody but admins can read them back.
create policy "newsletter: anyone subscribes" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (status = 'subscribed');
create policy "newsletter: admin all" on public.newsletter_subscribers
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "contact: anyone sends" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "contact: admin read" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));

create policy "instagram: public read active" on public.instagram_tiles
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "instagram: admin write" on public.instagram_tiles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke insert, update, delete, truncate on public.reviews, public.instagram_tiles from anon;
revoke all on public.newsletter_subscribers, public.contact_messages from anon;
grant insert (email, source) on public.newsletter_subscribers to anon;
grant insert (name, email, phone, message) on public.contact_messages to anon;
revoke insert on public.newsletter_subscribers, public.contact_messages from authenticated;
grant insert (email, source) on public.newsletter_subscribers to authenticated;
grant insert (name, email, phone, message) on public.contact_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public-read product image bucket, admin-only writes.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "product-images: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
