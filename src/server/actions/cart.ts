"use server";

import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { quote, type Line } from "@/server/privileged/orders";
import { guestLinesSchema } from "@/lib/validation/checkout";
import { toCartView, type CartView } from "@/lib/orders";

// The bag (prd.md §6.6–6.7). Signed-in shoppers: Supabase cart_items (RLS,
// via the user's session). Guests: lines are posted from localStorage and
// only priced here. Prices and stock always come from the database.

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type CartState = { lines: Line[]; view: CartView };

const variantId = z.uuid();
const quantity = z.number().int().min(1).max(10);

async function accountLines(): Promise<Line[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cart_items").select("variant_id, quantity").order("added_at");
  if (error) throw new Error("Could not load your bag.");
  return data.map((r) => ({ variant_id: r.variant_id, quantity: r.quantity }));
}

async function state(lines: Line[]): Promise<CartState> {
  return { lines, view: toCartView(await quote(lines)) };
}

/** Current bag with live prices/stock. Guests pass their local lines. */
export async function getCart(guestLines?: Line[]): Promise<Result<CartState>> {
  try {
    if (await getSessionUser()) return { ok: true, data: await state(await accountLines()) };
    const parsed = guestLinesSchema.safeParse(guestLines ?? []);
    if (!parsed.success) return { ok: false, error: "Invalid bag." };
    return { ok: true, data: await state(parsed.data) };
  } catch (e) {
    console.error("getCart failed", (e as Error).message);
    return { ok: false, error: "We couldn't load your bag. Please refresh." };
  }
}

async function mutate(run: () => PromiseLike<{ error: { code?: string; message: string } | null }>): Promise<Result<CartState>> {
  if (!(await getSessionUser())) return { ok: false, error: "Not signed in." };
  const { error } = await run();
  if (error) {
    console.error("cart mutation failed", { code: error.code });
    return { ok: false, error: "We couldn't update your bag. Please try again." };
  }
  return { ok: true, data: await state(await accountLines()) };
}

/** Adds to the signed-in bag (quantities add up, capped at 10 and at stock). */
export async function addToAccountCart(rawId: string, rawQty: number): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  const qty = quantity.safeParse(rawQty);
  if (!id.success || !qty.success) return { ok: false, error: "Invalid item." };
  const supabase = await createClient();
  return mutate(() => supabase.rpc("merge_cart", { p_lines: [{ variant_id: id.data, quantity: qty.data }] }));
}

export async function setAccountCartQuantity(rawId: string, rawQty: number): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  const qty = quantity.safeParse(rawQty);
  if (!id.success || !qty.success) return { ok: false, error: "Invalid quantity." };
  const supabase = await createClient();
  return mutate(() => supabase.from("cart_items").update({ quantity: qty.data }).eq("variant_id", id.data));
}

export async function removeFromAccountCart(rawId: string): Promise<Result<CartState>> {
  const id = variantId.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid item." };
  const supabase = await createClient();
  return mutate(() => supabase.from("cart_items").delete().eq("variant_id", id.data));
}

/** Guest bag → account bag on sign-in (same variant: quantities add up). */
export async function mergeGuestCart(rawLines: Line[]): Promise<Result<CartState>> {
  const parsed = guestLinesSchema.safeParse(rawLines);
  if (!parsed.success) return { ok: false, error: "Invalid bag." };
  if (!parsed.data.length) return getCart();
  const supabase = await createClient();
  return mutate(() => supabase.rpc("merge_cart", { p_lines: parsed.data }));
}
