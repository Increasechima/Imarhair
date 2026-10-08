import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { quote, type Line } from "@/server/privileged/orders";
import type { ApiResult, CartState } from "@imarhair/shared/api";
import { guestLinesSchema } from "@imarhair/shared/validation/checkout";
import { toCartView } from "@imarhair/shared/orders";
import type { Database } from "@imarhair/shared/database.types";

// The bag (prd.md §6.6–6.7), shared by the web's server actions and the
// mobile app's /api/v1 routes. Every function takes a USER-SCOPED client
// (cookie session on the web, bearer token from the app), so RLS applies and
// a shopper can only ever touch their own cart. Prices and stock always come
// from the database (quote_order).

type Db = SupabaseClient<Database>;
export type Result<T> = ApiResult<T>;
export type { CartState };

const variantId = z.uuid();
const quantity = z.number().int().min(1).max(10);

async function accountLines(db: Db): Promise<Line[]> {
  const { data, error } = await db.from("cart_items").select("variant_id, quantity").order("added_at");
  if (error) throw new Error("Could not load your bag.");
  return data.map((r) => ({ variant_id: r.variant_id, quantity: r.quantity }));
}

async function state(lines: Line[]): Promise<CartState> {
  return { lines, view: toCartView(await quote(lines)) };
}

/** The signed-in shopper's bag with live prices/stock. */
export async function loadAccountCart(db: Db): Promise<Result<CartState>> {
  try {
    return { ok: true, data: await state(await accountLines(db)) };
  } catch (e) {
    console.error("loadAccountCart failed", (e as Error).message);
    return { ok: false, error: "We couldn't load your bag. Please refresh." };
  }
}

/** Prices a guest's locally kept lines. Nothing is stored. */
export async function priceGuestLines(rawLines: unknown): Promise<Result<CartState>> {
  const parsed = guestLinesSchema.safeParse(rawLines ?? []);
  if (!parsed.success) return { ok: false, error: "Invalid bag." };
  try {
    return { ok: true, data: await state(parsed.data) };
  } catch (e) {
    console.error("priceGuestLines failed", (e as Error).message);
    return { ok: false, error: "We couldn't load your bag. Please refresh." };
  }
}

async function mutate(
  db: Db,
  run: () => PromiseLike<{ error: { code?: string; message: string } | null }>,
): Promise<Result<CartState>> {
  const { error } = await run();
  if (error) {
    console.error("cart mutation failed", { code: error.code });
    return { ok: false, error: "We couldn't update your bag. Please try again." };
  }
  return loadAccountCart(db);
}

/** Adds to the signed-in bag (quantities add up, capped at 10 and at stock). */
export async function addToCart(db: Db, rawId: unknown, rawQty: unknown): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  const qty = quantity.safeParse(rawQty);
  if (!id.success || !qty.success) return { ok: false, error: "Invalid item." };
  return mutate(db, () => db.rpc("merge_cart", { p_lines: [{ variant_id: id.data, quantity: qty.data }] }));
}

export async function setCartQuantity(db: Db, rawId: unknown, rawQty: unknown): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  const qty = quantity.safeParse(rawQty);
  if (!id.success || !qty.success) return { ok: false, error: "Invalid quantity." };
  return mutate(db, () => db.from("cart_items").update({ quantity: qty.data }).eq("variant_id", id.data));
}

export async function removeFromCart(db: Db, rawId: unknown): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid item." };
  return mutate(db, () => db.from("cart_items").delete().eq("variant_id", id.data));
}

/** Guest bag → account bag on sign-in (same variant: quantities add up). */
export async function mergeIntoCart(db: Db, rawLines: unknown): Promise<Result<CartState>> {
  const parsed = guestLinesSchema.safeParse(rawLines);
  if (!parsed.success) return { ok: false, error: "Invalid bag." };
  if (!parsed.data.length) return loadAccountCart(db);
  return mutate(db, () => db.rpc("merge_cart", { p_lines: parsed.data }));
}
