// Variant option logic for the product page and quick-add (prd.md §6.5).
// Pure functions: given a product's variants and the shopper's selection,
// work out which option chips to show and in what state.
import { lengthLabel } from "./format";
import type { VariantOption } from "./types";

export const OPTION_KEYS = ["lengthInches", "density", "colour", "laceType"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];
export type OptionValue = string | number;
export type Selection = Partial<Record<OptionKey, OptionValue>>;

const OPTION_LABELS: Record<OptionKey, string> = {
  lengthInches: "Length",
  density: "Density",
  colour: "Colour",
  laceType: "Lace",
};

export type OptionGroup = {
  key: OptionKey;
  label: string;
  values: { value: OptionValue; label: string }[];
};

/** Only option types with more than one value become chip groups. */
export function optionGroups(variants: VariantOption[]): OptionGroup[] {
  return OPTION_KEYS.flatMap((key) => {
    const values = [...new Set(variants.map((v) => v[key]).filter((x): x is OptionValue => x != null))];
    if (values.length < 2) return [];
    values.sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))));
    return [
      {
        key,
        label: OPTION_LABELS[key],
        values: values.map((value) => ({
          value,
          label: key === "lengthInches" ? lengthLabel(value as number) : String(value),
        })),
      },
    ];
  });
}

export function selectionFor(variant: VariantOption, groups: OptionGroup[]): Selection {
  return Object.fromEntries(groups.map((g) => [g.key, variant[g.key] ?? undefined]));
}

const matches = (v: VariantOption, sel: Selection) =>
  Object.entries(sel).every(([k, val]) => val === undefined || v[k as OptionKey] === val);

export function findVariant(variants: VariantOption[], sel: Selection): VariantOption | null {
  return variants.find((v) => matches(v, sel)) ?? null;
}

/** Default selection: the default variant if in stock, else the first in-stock one. */
export function initialVariant(variants: VariantOption[]): VariantOption | null {
  return (
    variants.find((v) => v.isDefault && v.available > 0) ??
    variants.find((v) => v.available > 0) ??
    variants.find((v) => v.isDefault) ??
    variants[0] ??
    null
  );
}

export type ValueState = "selected" | "available" | "sold-out";

/**
 * State of one chip given the current selection:
 * - "sold-out": every variant with this value (and the other current choices)
 *   is out of stock → struck through and not selectable.
 * - otherwise selectable. If the exact combination doesn't exist, choosing it
 *   moves the other options to the closest variant (see choose()).
 */
export function valueState(variants: VariantOption[], sel: Selection, key: OptionKey, value: OptionValue): ValueState {
  if (sel[key] === value) return "selected";
  const withValue = variants.filter((v) => v[key] === value);
  const sameOthers = withValue.filter((v) => matches(v, { ...sel, [key]: value }));
  const pool = sameOthers.length ? sameOthers : withValue;
  return pool.some((v) => v.available > 0) ? "available" : "sold-out";
}

/** New selection after choosing key=value, keeping as many other choices as possible. */
export function choose(variants: VariantOption[], sel: Selection, key: OptionKey, value: OptionValue): Selection {
  const next = { ...sel, [key]: value };
  const exact = variants.find((v) => matches(v, next) && v.available > 0) ?? variants.find((v) => matches(v, next));
  if (exact) return next;
  const candidates = variants.filter((v) => v[key] === value);
  const score = (v: VariantOption) =>
    (v.available > 0 ? 100 : 0) + Object.entries(sel).filter(([k, val]) => k !== key && v[k as OptionKey] === val).length;
  const best = candidates.sort((a, b) => score(b) - score(a))[0];
  if (!best) return sel;
  return Object.fromEntries(Object.keys(next).map((k) => [k, best[k as OptionKey] ?? undefined]));
}

export function maxQuantity(variant: VariantOption | null): number {
  return variant ? Math.max(0, Math.min(10, variant.available)) : 0;
}

/** "16\" · 300g · 5x5 Swiss Lace" — stored on cart lines and orders. */
export function variantLabel(v: Pick<VariantOption, OptionKey>): string {
  return [v.lengthInches != null ? lengthLabel(v.lengthInches) : null, v.density, v.colour, v.laceType]
    .filter(Boolean)
    .join(" · ");
}
