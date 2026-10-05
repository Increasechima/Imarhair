// Shop/collection/search filter state lives in the URL so links are shareable
// and Back works (prd.md §6.3). Shared by server queries and client controls.

export const PAGE_SIZE = 24;

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "best-selling", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;
export type SortKey = (typeof SORTS)[number]["value"];

// Bands in kobo. A product matches if any of its prices fall in the band.
export const PRICE_BANDS = [
  { value: "under-100k", label: "Under ₦100,000", min: null, max: 10_000_000 },
  { value: "100k-250k", label: "₦100,000 – ₦250,000", min: 10_000_000, max: 25_000_000 },
  { value: "250k-500k", label: "₦250,000 – ₦500,000", min: 25_000_000, max: 50_000_000 },
  { value: "500k-plus", label: "₦500,000 and above", min: 50_000_000, max: null },
] as const;
export type PriceBand = (typeof PRICE_BANDS)[number]["value"];

export type ShopParams = {
  q: string;
  categories: string[];
  collections: string[];
  lengths: number[];
  price: PriceBand | null;
  inStock: boolean;
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const slugList = (v: string | string[] | undefined) =>
  first(v)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    .slice(0, 10);

export function parseShopParams(raw: RawParams): ShopParams {
  const sort = first(raw.sort);
  const price = first(raw.price);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 100),
    categories: slugList(raw.category),
    collections: slugList(raw.collection),
    lengths: [
      ...new Set(
        first(raw.length)
          .split(",")
          .map((s) => Number.parseInt(s, 10))
          .filter((n) => Number.isInteger(n) && n >= 4 && n <= 40),
      ),
    ]
      .sort((a, b) => a - b)
      .slice(0, 20),
    price: PRICE_BANDS.some((b) => b.value === price) ? (price as PriceBand) : null,
    inStock: first(raw.stock) === "1",
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortKey) : "featured",
    page: Number.isInteger(page) && page >= 1 && page <= 50 ? page : 1,
  };
}

/** Serialises params back to a query string, omitting defaults. */
export function shopQueryString(p: Partial<ShopParams>): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.categories?.length) sp.set("category", p.categories.join(","));
  if (p.collections?.length) sp.set("collection", p.collections.join(","));
  if (p.lengths?.length) sp.set("length", p.lengths.join(","));
  if (p.price) sp.set("price", p.price);
  if (p.inStock) sp.set("stock", "1");
  if (p.sort && p.sort !== "featured") sp.set("sort", p.sort);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `?${s.replace(/%2C/g, ",")}` : "";
}

export function activeFilterCount(p: ShopParams, scope: { lockCollection?: boolean } = {}): number {
  return (
    p.categories.length +
    (scope.lockCollection ? 0 : p.collections.length) +
    p.lengths.length +
    (p.price ? 1 : 0) +
    (p.inStock ? 1 : 0)
  );
}
