import type { Tables } from "../database.types";

type ListingRow = Tables<"product_listing">;

/** A product as shown on cards and grids (non-null view of product_listing). */
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  kind: "wig" | "bundle" | "haircare";
  categorySlug: string;
  collectionSlug: string | null;
  collectionName: string | null;
  collectionStatus: string | null;
  minPrice: number;
  maxPrice: number;
  variantCount: number;
  lengths: number[];
  defaultVariantId: string | null;
  defaultPrice: number;
  compareAtPrice: number | null;
  defaultLength: number | null;
  defaultDensity: string | null;
  defaultColour: string | null;
  defaultLaceType: string | null;
  inStock: boolean;
  imagePaths: string[];
  imageAlts: string[];
};

const KINDS = new Set(["wig", "bundle", "haircare"]);

/** Maps a product_listing row; returns null for rows missing required data. */
export function toProductSummary(row: ListingRow): ProductSummary | null {
  if (!row.id || !row.slug || !row.name || row.min_price == null || row.default_price == null) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: (KINDS.has(row.category_kind ?? "") ? row.category_kind : "wig") as ProductSummary["kind"],
    categorySlug: row.category_slug ?? "",
    collectionSlug: row.collection_slug,
    collectionName: row.collection_name,
    collectionStatus: row.collection_status,
    minPrice: row.min_price,
    maxPrice: row.max_price ?? row.min_price,
    variantCount: row.variant_count ?? 0,
    lengths: row.lengths ?? [],
    defaultVariantId: row.default_variant_id,
    defaultPrice: row.default_price,
    compareAtPrice: row.default_compare_at_price,
    defaultLength: row.default_length,
    defaultDensity: row.default_density,
    defaultColour: row.default_colour,
    defaultLaceType: row.default_lace_type,
    inStock: row.in_stock ?? false,
    imagePaths: row.image_paths ?? [],
    imageAlts: row.image_alts ?? [],
  };
}

export type VariantOption = {
  id: string;
  sku: string;
  lengthInches: number | null;
  density: string | null;
  colour: string | null;
  laceType: string | null;
  price: number;
  compareAtPrice: number | null;
  isDefault: boolean;
  available: number;
  isLowStock: boolean;
};

export type ProductImageInfo = { path: string; alt: string };
