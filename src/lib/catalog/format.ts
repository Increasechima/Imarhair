import { formatNaira } from "@/lib/money";
import type { ProductSummary } from "./types";

export const lengthLabel = (inches: number) => `${inches}"`;

/** "16\"" or "10\"–24\"" for products sold in several lengths. */
export function lengthRangeLabel(lengths: number[]): string | null {
  if (lengths.length === 0) return null;
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  return min === max ? lengthLabel(min) : `${lengthLabel(min)}–${lengthLabel(max)}`;
}

/**
 * One muted attribute line for wig/bundle cards (prd.md §6.2):
 * length · colour · volume · closure, e.g. `16" · Natural Black · 300g · 5x5 Swiss Lace`.
 */
export function attributeLine(p: ProductSummary): string | null {
  if (p.kind === "haircare") return null;
  const parts = [
    lengthRangeLabel(p.lengths),
    p.defaultColour,
    p.defaultDensity,
    p.defaultLaceType,
  ].filter((x): x is string => Boolean(x));
  return parts.length ? parts.join(" · ") : null;
}

export type PriceDisplay = {
  /** Main price text, e.g. "₦480,000" or "From ₦210,000". */
  label: string;
  /** Original price when on sale (struck through). */
  compareAt: string | null;
};

export function priceDisplay(p: Pick<ProductSummary, "minPrice" | "maxPrice" | "defaultPrice" | "compareAtPrice">): PriceDisplay {
  const varies = p.maxPrice > p.minPrice;
  const onSale = !varies && p.compareAtPrice != null && p.compareAtPrice > p.defaultPrice;
  return {
    label: varies ? `From ${formatNaira(p.minPrice)}` : formatNaira(p.defaultPrice),
    compareAt: onSale ? formatNaira(p.compareAtPrice!) : null,
  };
}

/** Card badge, or null. Only Sale / Sold out / Coming soon are allowed (prd.md §6.2). */
export function productBadge(p: ProductSummary): "Coming soon" | "Sold out" | "Sale" | null {
  if (p.collectionStatus === "coming_soon") return "Coming soon";
  if (!p.inStock) return "Sold out";
  if (p.compareAtPrice != null && p.compareAtPrice > p.defaultPrice && p.maxPrice === p.minPrice) return "Sale";
  return null;
}
