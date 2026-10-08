"use server";

import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getProductsByIds } from "@/server/queries/catalog";
import type { ProductSummary } from "@imarhair/shared/catalog/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const productId = z.uuid();
const productIds = z.array(z.uuid()).max(200);

async function myWishlistId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("wishlists").select("id").maybeSingle();
  return data?.id ?? null;
}

/** Product ids on the signed-in shopper's wishlist ([] for guests). */
export async function getMyWishlistIds(): Promise<Result<string[]>> {
  if (!(await getSessionUser())) return { ok: true, data: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.from("wishlist_items").select("product_id").order("added_at");
  if (error) return { ok: false, error: "Could not load your wishlist." };
  return { ok: true, data: data.map((r) => r.product_id) };
}

/** Adds or removes a product. Returns whether it is now saved. */
export async function toggleWishlistItem(rawId: string): Promise<Result<{ saved: boolean }>> {
  const parsed = productId.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid product." };
  if (!(await getSessionUser())) return { ok: false, error: "Not signed in." };

  const wishlistId = await myWishlistId();
  if (!wishlistId) return { ok: false, error: "Wishlist not found." };
  const supabase = await createClient();

  const { data: removed, error: delError } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("wishlist_id", wishlistId)
    .eq("product_id", parsed.data)
    .select("id");
  if (delError) return { ok: false, error: "Could not update your wishlist." };
  if (removed.length) return { ok: true, data: { saved: false } };

  const { error } = await supabase.from("wishlist_items").insert({ wishlist_id: wishlistId, product_id: parsed.data });
  // 23505: already saved (double tap) — still saved.
  if (error && error.code !== "23505") return { ok: false, error: "Could not update your wishlist." };
  return { ok: true, data: { saved: true } };
}

/** Moves a guest's locally saved products into their account (no duplicates). */
export async function mergeGuestWishlist(rawIds: string[]): Promise<Result<null>> {
  const parsed = productIds.safeParse(rawIds);
  if (!parsed.success) return { ok: false, error: "Invalid wishlist." };
  if (!parsed.data.length) return { ok: true, data: null };
  if (!(await getSessionUser())) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_wishlist", { p_product_ids: parsed.data });
  if (error) return { ok: false, error: "Could not save your wishlist." };
  return { ok: true, data: null };
}

/** Card data for a list of product ids (public catalogue data). */
export async function getWishlistProducts(rawIds: string[]): Promise<Result<ProductSummary[]>> {
  const parsed = productIds.safeParse(rawIds);
  if (!parsed.success) return { ok: false, error: "Invalid wishlist." };
  return { ok: true, data: await getProductsByIds(parsed.data) };
}
