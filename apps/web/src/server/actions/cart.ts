"use server";

import { createClient, getSessionUser } from "@/lib/supabase/server";
import {
  addToCart,
  loadAccountCart,
  mergeIntoCart,
  priceGuestLines,
  removeFromCart,
  setCartQuantity,
  type CartState,
  type Result,
} from "@/server/cart";
import type { Line } from "@/server/privileged/orders";

// The web's bag actions: thin wrappers over src/server/cart.ts (the same code
// the mobile app reaches through /api/v1/cart). Signed-in shoppers use their
// cookie session; guests post their localStorage lines to be priced.

export type { CartState };
const NOT_SIGNED_IN = { ok: false, error: "Not signed in." } as const;

/** Current bag with live prices/stock. Guests pass their local lines. */
export async function getCart(guestLines?: Line[]): Promise<Result<CartState>> {
  if (await getSessionUser()) return loadAccountCart(await createClient());
  return priceGuestLines(guestLines);
}

export async function addToAccountCart(rawId: string, rawQty: number): Promise<Result<CartState>> {
  if (!(await getSessionUser())) return NOT_SIGNED_IN;
  return addToCart(await createClient(), rawId, rawQty);
}

export async function setAccountCartQuantity(rawId: string, rawQty: number): Promise<Result<CartState>> {
  if (!(await getSessionUser())) return NOT_SIGNED_IN;
  return setCartQuantity(await createClient(), rawId, rawQty);
}

export async function removeFromAccountCart(rawId: string): Promise<Result<CartState>> {
  if (!(await getSessionUser())) return NOT_SIGNED_IN;
  return removeFromCart(await createClient(), rawId);
}

/** Guest bag → account bag on sign-in (same variant: quantities add up). */
export async function mergeGuestCart(rawLines: Line[]): Promise<Result<CartState>> {
  if (!(await getSessionUser())) return NOT_SIGNED_IN;
  return mergeIntoCart(await createClient(), rawLines);
}
