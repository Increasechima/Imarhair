import { describe, expect, it } from "vitest";
import { attributeLine, lengthRangeLabel, priceDisplay, productBadge } from "./format";
import { parseShopParams, shopQueryString } from "./shop-params";
import { choose, findVariant, initialVariant, maxQuantity, optionGroups, selectionFor, valueState, variantLabel } from "./variants";
import type { ProductSummary, VariantOption } from "./types";

const summary = (over: Partial<ProductSummary> = {}): ProductSummary => ({
  id: "p1", slug: "imar-prime-16-bouncy-unit", name: "Imar Prime 16\" Bouncy Unit", kind: "wig",
  categorySlug: "wigs", collectionSlug: "imar-prime", collectionName: "Imar Prime", collectionStatus: "active",
  minPrice: 48_000_000, maxPrice: 48_000_000, variantCount: 1, lengths: [16], defaultVariantId: "v1",
  defaultPrice: 48_000_000, compareAtPrice: null, defaultLength: 16, defaultDensity: "300g",
  defaultColour: "Natural Black", defaultLaceType: "5x5 Swiss Lace", inStock: true, imagePaths: [], imageAlts: [],
  ...over,
});

const variant = (over: Partial<VariantOption>): VariantOption => ({
  id: "v", sku: "SKU", lengthInches: null, density: null, colour: "Natural Black", laceType: null,
  price: 1, compareAtPrice: null, isDefault: false, available: 5, isLowStock: false, ...over,
});

describe("format", () => {
  it("builds the card attribute line", () => {
    expect(attributeLine(summary())).toBe('16" · Natural Black · 300g · 5x5 Swiss Lace');
    expect(attributeLine(summary({ lengths: [10, 14, 24], defaultLaceType: null }))).toBe('10"–24" · Natural Black · 300g');
    expect(attributeLine(summary({ kind: "haircare" }))).toBeNull();
  });

  it("labels length ranges", () => {
    expect(lengthRangeLabel([])).toBeNull();
    expect(lengthRangeLabel([16])).toBe('16"');
  });

  it("shows From pricing and sale prices", () => {
    expect(priceDisplay(summary())).toEqual({ label: "₦480,000", compareAt: null });
    expect(priceDisplay(summary({ maxPrice: 54_000_000 }))).toEqual({ label: "From ₦480,000", compareAt: null });
    expect(priceDisplay(summary({ defaultPrice: 19_500_000, minPrice: 19_500_000, maxPrice: 19_500_000, compareAtPrice: 22_500_000 })))
      .toEqual({ label: "₦195,000", compareAt: "₦225,000" });
  });

  it("picks one badge in priority order", () => {
    expect(productBadge(summary())).toBeNull();
    expect(productBadge(summary({ inStock: false }))).toBe("Sold out");
    expect(productBadge(summary({ collectionStatus: "coming_soon", inStock: false }))).toBe("Coming soon");
    expect(productBadge(summary({ compareAtPrice: 50_000_000 }))).toBe("Sale");
  });
});

describe("shop params", () => {
  it("parses and sanitises URL params", () => {
    const p = parseShopParams({
      q: "  bob ", category: "wigs,BUNDLES,bad slug!", length: "16,14,16,99,abc", price: "100k-250k",
      stock: "1", sort: "price-asc", page: "2",
    });
    expect(p).toEqual({ q: "bob", categories: ["wigs", "bundles"], collections: [], lengths: [14, 16],
      price: "100k-250k", inStock: true, sort: "price-asc", page: 2 });
  });

  it("falls back to defaults for junk", () => {
    expect(parseShopParams({ sort: "drop table", price: "free", page: "-1" })).toMatchObject({ sort: "featured", price: null, page: 1 });
  });

  it("round-trips to a compact query string", () => {
    const p = parseShopParams({ category: "wigs", length: "14,16", sort: "newest" });
    expect(shopQueryString(p)).toBe("?category=wigs&length=14,16&sort=newest");
    expect(shopQueryString(parseShopParams({}))).toBe("");
  });
});

describe("variants", () => {
  // Body Wave Unit: lengths 14–20, 18" low stock, 20" sold out.
  const bodyWave = [
    variant({ id: "14", lengthInches: 14, price: 21, isDefault: true }),
    variant({ id: "16", lengthInches: 16, price: 23 }),
    variant({ id: "18", lengthInches: 18, price: 26, available: 1, isLowStock: true }),
    variant({ id: "20", lengthInches: 20, price: 30, available: 0 }),
  ];

  it("only makes chip groups for options with several values", () => {
    const groups = optionGroups(bodyWave);
    expect(groups.map((g) => g.key)).toEqual(["lengthInches"]);
    expect(groups[0].values.map((v) => v.label)).toEqual(['14"', '16"', '18"', '20"']);
  });

  it("selects, disables sold-out values and finds the variant", () => {
    const groups = optionGroups(bodyWave);
    const start = initialVariant(bodyWave)!;
    expect(start.id).toBe("14");
    const sel = selectionFor(start, groups);
    expect(valueState(bodyWave, sel, "lengthInches", 14)).toBe("selected");
    expect(valueState(bodyWave, sel, "lengthInches", 20)).toBe("sold-out");
    const next = choose(bodyWave, sel, "lengthInches", 18);
    expect(findVariant(bodyWave, next)?.id).toBe("18");
    expect(maxQuantity(findVariant(bodyWave, next))).toBe(1);
  });

  it("moves other options to the nearest existing combination", () => {
    // 16" only exists at 300g; 18" exists at 300g and 350g.
    const vs = [
      variant({ id: "a", lengthInches: 16, density: "300g", isDefault: true }),
      variant({ id: "b", lengthInches: 18, density: "300g" }),
      variant({ id: "c", lengthInches: 18, density: "350g" }),
    ];
    const groups = optionGroups(vs);
    let sel = selectionFor(vs[2], groups); // 18" 350g
    sel = choose(vs, sel, "lengthInches", 16);
    expect(findVariant(vs, sel)?.id).toBe("a");
  });

  it("starts on an in-stock variant when the default is sold out", () => {
    expect(initialVariant([variant({ id: "x", isDefault: true, available: 0 }), variant({ id: "y" })])?.id).toBe("y");
  });

  it("labels a variant", () => {
    expect(variantLabel({ lengthInches: 16, density: "300g", colour: null, laceType: "5x5 Swiss Lace" })).toBe('16" · 300g · 5x5 Swiss Lace');
  });
});
