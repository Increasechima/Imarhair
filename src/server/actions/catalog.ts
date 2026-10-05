"use server";

import { z } from "zod";
import { getProductOptions } from "@/server/queries/catalog";
import type { VariantOption } from "@/lib/catalog/types";

/** Variants + live stock for the quick-add sheet on product cards. */
export async function getQuickAddOptions(
  rawId: string,
): Promise<{ ok: true; data: VariantOption[] } | { ok: false; error: string }> {
  const parsed = z.uuid().safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid product." };
  try {
    return { ok: true, data: await getProductOptions(parsed.data) };
  } catch {
    return { ok: false, error: "Could not load options. Please try again." };
  }
}
