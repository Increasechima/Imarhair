import { z } from "zod";
import { nairaToKobo } from "@imarhair/shared/money";
import { SLUG_RE, slugify } from "@/lib/slug";

// Admin form schemas (prd.md §6.18). Money is typed in naira, stored in kobo.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

// Unticked checkboxes are simply absent from FormData, so the key must be optional
// (in Zod 4 a union containing z.undefined() still makes the key required).
const checkbox = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v === "on" || v === "true");

/** "158,000" / "158000" / "158000.50" naira → kobo. */
export const nairaField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[₦,\s]/g, ""))
  .pipe(z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, { error: "Enter an amount in naira, e.g. 158000" }))
  .transform((v) => nairaToKobo(Number(v)));

const optionalNaira = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.union([z.null(), nairaField]));

/** "Hair: 100% human hair" per line → { Hair: "100% human hair" }. */
export const detailsField = z
  .string()
  .max(4000)
  .optional()
  .transform((v, ctx) => {
    const out: Record<string, string> = {};
    for (const raw of (v ?? "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const i = line.indexOf(":");
      if (i < 1) {
        ctx.addIssue({ code: "custom", message: `"${line}" — write each detail as Label: value` });
        continue;
      }
      out[line.slice(0, i).trim().slice(0, 60)] = line.slice(i + 1).trim().slice(0, 200);
    }
    return out;
  });

export const productSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Enter a product name." }).max(160),
    slug: z.string().trim().max(80).optional(),
    description: optionalText(4000),
    care: optionalText(2000),
    details: detailsField,
    categoryId: z.uuid({ error: "Choose a category." }),
    collectionId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    position: z.coerce.number().int().min(0).max(9999).default(0),
    isPublished: checkbox,
    isFeatured: checkbox,
    isBestSeller: checkbox,
  })
  .transform((v) => ({ ...v, slug: v.slug ? v.slug : slugify(v.name) }))
  .refine((v) => SLUG_RE.test(v.slug), { path: ["slug"], error: "Use lowercase letters, numbers and dashes only." });

export const variantSchema = z
  .object({
    sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, { error: "SKU: letters, numbers and dashes (2–40)." }),
    lengthInches: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v.replace(/["”″]/g, "")) : null))
      .pipe(z.number().int().min(4).max(40).nullable()),
    density: optionalText(40),
    colour: optionalText(60),
    laceType: optionalText(60),
    price: nairaField,
    compareAtPrice: optionalNaira,
    isDefault: checkbox,
    isActive: checkbox,
    stock: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    path: ["compareAtPrice"],
    error: "The original price must be higher than the selling price.",
  });

export const reviewSchema = z.object({
  productId: z.uuid({ error: "Choose a product." }),
  authorDisplayName: z.string().trim().min(1, { error: "Enter the customer's display name." }).max(60),
  rating: z.coerce.number().int().min(1).max(5),
  title: optionalText(120),
  body: z.string().trim().min(2, { error: "Enter the review." }).max(4000),
  approve: checkbox,
  consent: checkbox.refine((v) => v, { error: "Confirm the customer agreed to publish this review." }),
});

export const discountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, { error: "Code: 3–40 letters, numbers, dashes." }),
    type: z.enum(["percent", "fixed"]),
    value: z.string().trim().min(1, { error: "Enter a value." }),
    minSubtotal: optionalNaira,
    endsAt: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? new Date(`${v}T23:59:59+01:00`).toISOString() : null)),
    usageLimit: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int().min(1).max(1_000_000).nullable()),
  })
  .transform((v, ctx) => {
    let value: number;
    if (v.type === "percent") {
      value = Number(v.value);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be a whole number from 1 to 100." });
        return z.NEVER;
      }
    } else {
      const parsed = nairaField.safeParse(v.value);
      if (!parsed.success || parsed.data < 100) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the discount in naira, e.g. 10000." });
        return z.NEVER;
      }
      value = parsed.data;
    }
    return { ...v, value };
  });

export const statusChangeSchema = z.object({
  orderId: z.uuid(),
  toStatus: z.enum(["pending_payment", "paid", "processing", "ready_for_dispatch", "shipped", "delivered", "cancelled", "refunded"]),
  note: optionalText(500),
  trackingNumber: optionalText(80),
  trackingUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.union([z.null(), z.url({ protocol: /^https$/, error: "Tracking link must start with https://" })])),
  notify: checkbox,
});

/** Flattens a ZodError to "Field: message" lines for compact admin forms. */
export function adminErrors(error: z.ZodError): string[] {
  return error.issues.map((i) => (i.path.length ? `${String(i.path[0])}: ${i.message}` : i.message));
}
