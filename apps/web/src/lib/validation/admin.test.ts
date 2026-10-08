import { describe, expect, it } from "vitest";
import { discountSchema, nairaField, productSchema, reviewSchema, statusChangeSchema, variantSchema } from "./admin";
import { slugify } from "@/lib/slug";

const CAT = "11111111-1111-4111-8111-111111111111";

describe("slugify", () => {
  it("makes URL-safe slugs that match the DB check", () => {
    expect(slugify('Imar Prime 16" Bouncy Unit')).toBe("imar-prime-16-bouncy-unit");
    expect(slugify("  Crème Brûlée — 5x5 Lace!! ")).toBe("creme-brulee-5x5-lace");
    expect(slugify("Queen's Bob")).toBe("queens-bob");
  });
});

describe("naira input", () => {
  it.each([
    ["158000", 15_800_000],
    ["158,000", 15_800_000],
    ["₦158,000", 15_800_000],
    ["18500.50", 1_850_050],
  ])("%s → %d kobo", (input, kobo) => {
    expect(nairaField.parse(input)).toBe(kobo);
  });
  it.each(["", "abc", "-5", "1.234"])("rejects %j", (input) => {
    expect(nairaField.safeParse(input).success).toBe(false);
  });
});

describe("product form", () => {
  it("derives the slug and parses details lines", () => {
    const r = productSchema.parse({
      name: 'Imar Classic 8" Straight Bob',
      categoryId: CAT,
      collectionId: "",
      details: "Hair: 100% human hair\nLength: 8\"\n\n",
      isPublished: "on",
    });
    expect(r.slug).toBe("imar-classic-8-straight-bob");
    expect(r.details).toEqual({ Hair: "100% human hair", Length: '8"' });
    expect(r.collectionId).toBeNull();
    expect(r.isPublished).toBe(true);
    expect(r.isFeatured).toBe(false);
  });
  it("rejects malformed details and bad slugs", () => {
    expect(productSchema.safeParse({ name: "Bob", categoryId: CAT, collectionId: "", details: "no colon here" }).success).toBe(false);
    expect(productSchema.safeParse({ name: "Bob", slug: "Bad Slug!", categoryId: CAT, collectionId: "" }).success).toBe(false);
  });
});

describe("variant form", () => {
  it("parses a typical wig option", () => {
    const v = variantSchema.parse({ sku: "imr-pr-bnc16-300", lengthInches: '16"', density: "300g", price: "480000", compareAtPrice: "", isActive: "on", stock: "4" });
    expect(v).toMatchObject({ sku: "IMR-PR-BNC16-300", lengthInches: 16, price: 48_000_000, compareAtPrice: null, isActive: true, isDefault: false, stock: 4 });
  });
  it("requires the 'was' price to be higher than the price", () => {
    expect(variantSchema.safeParse({ sku: "X1", price: "100", compareAtPrice: "90" }).success).toBe(false);
  });
});

describe("discounts", () => {
  it("percent codes are whole numbers 1–100", () => {
    expect(discountSchema.parse({ code: "queen10", type: "percent", value: "10" })).toMatchObject({ code: "QUEEN10", value: 10 });
    expect(discountSchema.safeParse({ code: "BAD", type: "percent", value: "150" }).success).toBe(false);
  });
  it("fixed codes are typed in naira and stored in kobo", () => {
    expect(discountSchema.parse({ code: "TENK", type: "fixed", value: "10,000", minSubtotal: "100000" })).toMatchObject({ value: 1_000_000, minSubtotal: 10_000_000 });
  });
});

describe("order status + reviews", () => {
  it("tracking links must be https", () => {
    const base = { orderId: CAT, toStatus: "shipped" };
    expect(statusChangeSchema.safeParse({ ...base, trackingUrl: "http://track.example" }).success).toBe(false);
    expect(statusChangeSchema.parse({ ...base, trackingUrl: "https://track.example/1", notify: "on" })).toMatchObject({ notify: true });
  });
  it("reviews need the customer's consent", () => {
    const base = { productId: CAT, authorDisplayName: "Ada O.", rating: "5", body: "Gorgeous unit" };
    expect(reviewSchema.safeParse(base).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, consent: "on" }).success).toBe(true);
  });
});
