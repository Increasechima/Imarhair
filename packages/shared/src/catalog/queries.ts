import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { PAGE_SIZE, PRICE_BANDS, type ShopParams } from "./shop-params";
import { toProductSummary, type ProductImageInfo, type ProductSummary, type VariantOption } from "./types";

// Public catalogue reads, shared by the website (server, cached) and the
// mobile app (device). Pass an ANON client: everything here is limited by RLS
// to published products and must never depend on the visitor's session.

export type CatalogDb = SupabaseClient<Database>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function summaries(rows: Parameters<typeof toProductSummary>[0][] | null): ProductSummary[] {
  return (rows ?? []).map(toProductSummary).filter((p): p is ProductSummary => p !== null);
}

function fail(what: string, error: { message: string; code?: string }): never {
  console.error(`catalog.${what} failed`, { code: error.code, message: error.message });
  throw new Error(`Could not load ${what}`);
}

// ---------------------------------------------------------------------------
// Collections & facets
// ---------------------------------------------------------------------------
export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImagePath: string | null;
  status: "active" | "coming_soon" | "hidden";
};

export async function listCollections(db: CatalogDb): Promise<Collection[]> {
  const { data, error } = await db
    .from("collections")
    .select("id, name, slug, description, hero_image_path, status")
    .neq("status", "hidden")
    .order("sort_order");
  if (error) fail("collections", error);
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    heroImagePath: c.hero_image_path,
    status: c.status as Collection["status"],
  }));
}

export async function getCollection(db: CatalogDb, slug: string): Promise<Collection | null> {
  if (!SLUG.test(slug)) return null;
  return (await listCollections(db)).find((c) => c.slug === slug) ?? null;
}

export type Facets = {
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  lengths: number[];
};

export async function getFacets(db: CatalogDb): Promise<Facets> {
  const [cats, lengths, collections] = await Promise.all([
    db.from("categories").select("slug, name, kind").order("sort_order"),
    db
      .from("product_variants")
      .select("length_inches")
      .eq("is_active", true)
      .not("length_inches", "is", null),
    listCollections(db),
  ]);
  if (cats.error) fail("categories", cats.error);
  if (lengths.error) fail("lengths", lengths.error);
  const listed = await db.from("product_listing").select("category_slug");
  const liveCategories = new Set((listed.data ?? []).map((r) => r.category_slug));
  return {
    // Hide categories with nothing published yet (e.g. Haircare before launch).
    categories: cats.data
      .filter((c) => liveCategories.has(c.slug))
      .map((c) => ({ slug: c.slug, name: c.name })),
    collections: collections
      .filter((c) => c.status === "active")
      .map((c) => ({ slug: c.slug, name: c.name })),
    lengths: [...new Set(lengths.data.map((r) => r.length_inches!))].sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Product lists
// ---------------------------------------------------------------------------
export async function listProducts(
  db: CatalogDb,
  params: ShopParams,
  scope: { collectionSlug?: string } = {},
): Promise<{ products: ProductSummary[]; total: number }> {
  let query = params.q
    ? db.rpc("search_products", { p_q: params.q }, { count: "exact" }).select("*")
    : db.from("product_listing").select("*", { count: "exact" });

  const collections = scope.collectionSlug ? [scope.collectionSlug] : params.collections;
  if (params.categories.length) query = query.in("category_slug", params.categories);
  if (collections.length) query = query.in("collection_slug", collections);
  if (params.lengths.length) query = query.overlaps("lengths", params.lengths);
  const band = PRICE_BANDS.find((b) => b.value === params.price);
  if (band?.min != null) query = query.gte("max_price", band.min);
  if (band?.max != null) query = query.lt("min_price", band.max);
  if (params.inStock) query = query.eq("in_stock", true);

  switch (params.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "best-selling":
      query = query.order("sales_count", { ascending: false });
      break;
    case "price-asc":
      query = query.order("min_price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("min_price", { ascending: false });
      break;
    default:
      // Search results keep relevance order; otherwise merchandised order.
      if (!params.q) {
        query = query
          .order("is_featured", { ascending: false })
          .order("position", { ascending: true })
          .order("created_at", { ascending: false });
      }
  }
  if (params.sort !== "featured" || !params.q) query = query.order("id");

  const { data, error, count } = await query.range(0, params.page * PAGE_SIZE - 1);
  if (error) fail("products", error);
  return { products: summaries(data), total: count ?? 0 };
}

export async function getBestSellers(db: CatalogDb, limit = 6): Promise<ProductSummary[]> {
  const { data, error } = await db
    .from("product_listing")
    .select("*")
    .eq("is_best_seller", true)
    .order("sales_count", { ascending: false })
    .limit(limit);
  if (error) fail("best sellers", error);
  return summaries(data);
}

export async function getProductsByIds(db: CatalogDb, ids: string[]): Promise<ProductSummary[]> {
  const valid = ids.filter((id) => UUID.test(id)).slice(0, 100);
  if (!valid.length) return [];
  const { data, error } = await db.from("product_listing").select("*").in("id", valid);
  if (error) fail("products by id", error);
  const byId = new Map(summaries(data).map((p) => [p.id, p]));
  return valid.map((id) => byId.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

export async function getRelatedProducts(
  db: CatalogDb,
  product: { id: string; collectionSlug: string | null },
  limit = 4,
) {
  if (!product.collectionSlug) return [];
  const { data } = await db
    .from("product_listing")
    .select("*")
    .eq("collection_slug", product.collectionSlug)
    .neq("id", product.id)
    .order("is_best_seller", { ascending: false })
    .limit(limit);
  return summaries(data);
}

export async function listProductSlugs(db: CatalogDb) {
  const { data, error } = await db.from("products").select("slug, updated_at");
  if (error) fail("product slugs", error);
  return data;
}

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------
export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  details: [string, string][];
  care: string | null;
  kind: "wig" | "bundle" | "haircare";
  categoryName: string;
  categorySlug: string;
  collectionName: string | null;
  collectionSlug: string | null;
  collectionStatus: string | null;
  variants: VariantOption[];
  images: ProductImageInfo[];
  updatedAt: string;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
};

export async function getProductOptions(db: CatalogDb, productId: string): Promise<VariantOption[]> {
  if (!UUID.test(productId)) return [];
  const [variants, availability] = await Promise.all([
    db
      .from("product_variants")
      .select(
        "id, sku, length_inches, density, colour, lace_type, price, compare_at_price, is_default, position",
      )
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("position"),
    db.from("variant_availability").select("variant_id, available, is_low_stock").eq("product_id", productId),
  ]);
  if (variants.error) fail("variants", variants.error);
  if (availability.error) fail("availability", availability.error);
  const stock = new Map(availability.data.map((a) => [a.variant_id, a]));
  return variants.data.map((v) => ({
    id: v.id,
    sku: v.sku,
    lengthInches: v.length_inches,
    density: v.density,
    colour: v.colour,
    laceType: v.lace_type,
    price: v.price,
    compareAtPrice: v.compare_at_price,
    isDefault: v.is_default,
    available: stock.get(v.id)?.available ?? 0,
    isLowStock: stock.get(v.id)?.is_low_stock ?? false,
  }));
}

export async function getProduct(db: CatalogDb, slug: string): Promise<ProductDetail | null> {
  if (!SLUG.test(slug)) return null;
  const { data, error } = await db
    .from("products")
    .select(
      `id, slug, name, description, details, care, updated_at,
       category:categories!inner(name, slug, kind),
       collection:collections(name, slug, status),
       product_images(storage_path, alt, position)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("product", error);
  if (!data) return null;

  const details =
    data.details && typeof data.details === "object" && !Array.isArray(data.details)
      ? Object.entries(data.details as Record<string, unknown>)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .map(([k, v]) => [k, String(v)] as [string, string])
      : [];

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    details,
    care: data.care,
    kind: data.category.kind as ProductDetail["kind"],
    categoryName: data.category.name,
    categorySlug: data.category.slug,
    collectionName: data.collection?.name ?? null,
    collectionSlug: data.collection?.slug ?? null,
    collectionStatus: data.collection?.status ?? null,
    variants: await getProductOptions(db, data.id),
    images: [...data.product_images]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ path: i.storage_path, alt: i.alt })),
    updatedAt: data.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Reviews & social (only approved, real reviews — prd.md §6.1)
// ---------------------------------------------------------------------------
export async function getApprovedReviews(
  db: CatalogDb,
  opts: { productId?: string; limit?: number } = {},
): Promise<Review[]> {
  let query = db
    .from("reviews")
    .select("id, author_display_name, rating, title, body, created_at")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 6);
  if (opts.productId) query = query.eq("product_id", opts.productId);
  const { data, error } = await query;
  if (error) fail("reviews", error);
  return data.map((r) => ({
    id: r.id,
    author: r.author_display_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function getInstagramTiles(db: CatalogDb) {
  const { data, error } = await db
    .from("instagram_tiles")
    .select("id, image_path, alt, link_url")
    .eq("is_active", true)
    .order("position")
    .limit(6);
  if (error) fail("instagram tiles", error);
  return data;
}
