-- M2: storefront read model.
-- product_listing gives every product card/grid what it needs in one row.
-- security_invoker = true, so the caller's RLS applies: anon sees published
-- products only, admins see everything.

create view public.product_listing
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.is_featured,
  p.is_best_seller,
  p.position,
  p.sales_count,
  p.created_at,
  c.slug                       as category_slug,
  c.name                       as category_name,
  c.kind                       as category_kind,
  col.slug                     as collection_slug,
  col.name                     as collection_name,
  col.status                   as collection_status,
  v.min_price,
  v.max_price,
  v.variant_count,
  v.lengths,
  v.min_length,
  v.max_length,
  dv.id                        as default_variant_id,
  dv.price                     as default_price,
  coalesce(dv.compare_at_price, p.compare_at_price) as default_compare_at_price,
  dv.length_inches             as default_length,
  dv.density                   as default_density,
  dv.colour                    as default_colour,
  dv.lace_type                 as default_lace_type,
  coalesce(a.in_stock, false)  as in_stock,
  coalesce(img.paths, '{}')    as image_paths,
  coalesce(img.alts, '{}')     as image_alts,
  p.search
    || setweight(to_tsvector('english', coalesce(col.name, '') || ' ' || coalesce(c.name, '')), 'B')
                               as search
from public.products p
join public.categories c on c.id = p.category_id
left join public.collections col on col.id = p.collection_id
left join lateral (
  select
    min(pv.price)                                  as min_price,
    max(pv.price)                                  as max_price,
    count(*)::int                                  as variant_count,
    array_agg(distinct pv.length_inches order by pv.length_inches)
      filter (where pv.length_inches is not null)  as lengths,
    min(pv.length_inches)                          as min_length,
    max(pv.length_inches)                          as max_length
  from public.product_variants pv
  where pv.product_id = p.id and pv.is_active
) v on true
left join lateral (
  select pv.*
  from public.product_variants pv
  where pv.product_id = p.id and pv.is_active
  order by pv.is_default desc, pv.position, pv.price
  limit 1
) dv on true
left join lateral (
  select bool_or(va.is_in_stock) as in_stock
  from public.variant_availability va
  where va.product_id = p.id
) a on true
left join lateral (
  select array_agg(i.storage_path order by i.position) as paths,
         array_agg(i.alt order by i.position)          as alts
  from (
    select pi.storage_path, pi.alt, pi.position
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.position
    limit 2
  ) i
) img on true;

grant select on public.product_listing to anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_products: full-text search over name/description/collection/category,
-- with a trigram fallback so small typos ("bouncey", "primee") still match.
-- Returns product_listing rows, so PostgREST filters/sort/range chain onto it.
-- ---------------------------------------------------------------------------
create or replace function public.search_products(p_q text)
returns setof public.product_listing
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select left(trim(coalesce(p_q, '')), 100) as text
  ), tsq as (
    select q.text, websearch_to_tsquery('english', q.text) as query from q
  )
  select pl.*
  from public.product_listing pl, tsq
  where tsq.text <> ''
    and (
      pl.search @@ tsq.query
      -- 0.55: catches "bouncey" (0.63), "primee" (0.71), "deepwave" (0.58)
      -- without "bob" matching "bouncy"/"body" (0.50).
      or extensions.word_similarity(tsq.text, pl.name) > 0.55
      or strpos(lower(pl.name), lower(tsq.text)) > 0
    )
  order by
    ts_rank(pl.search, tsq.query) desc,
    extensions.word_similarity(tsq.text, pl.name) desc,
    pl.position
$$;

revoke execute on function public.search_products(text) from public;
grant execute on function public.search_products(text) to anon, authenticated;
