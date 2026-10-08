import type { ApiResult, CartState, CheckoutHandoff, ServerLine } from "@imarhair/shared/api";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

// Client for the website's /api/v1 routes (contract: @imarhair/shared/api).
// Prices, stock and totals always come from these responses, never the app.

const OFFLINE = "Check your connection and try again.";

async function token(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function call<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<ApiResult<T>> {
  const send = async (jwt: string | null) =>
    fetch(`${env.siteUrl}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

  try {
    let jwt: string | null = null;
    if (init.auth !== false) {
      jwt = await token();
      if (!jwt) return { ok: false, error: "Please sign in again." };
    }
    let res = await send(jwt);
    // Access token expired mid-flight: refresh once and retry.
    if (res.status === 401 && init.auth !== false) {
      jwt = await token(true);
      if (!jwt) return { ok: false, error: "Please sign in again." };
      res = await send(jwt);
    }
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, error: OFFLINE };
  }
}

export const api = {
  cart: () => call<CartState>("/cart"),
  addLine: (variantId: string, quantity: number) =>
    call<CartState>("/cart/lines", { method: "POST", body: { variantId, quantity } }),
  setQuantity: (variantId: string, quantity: number) =>
    call<CartState>(`/cart/lines/${encodeURIComponent(variantId)}`, { method: "PATCH", body: { quantity } }),
  removeLine: (variantId: string) => call<CartState>(`/cart/lines/${encodeURIComponent(variantId)}`, { method: "DELETE" }),
  merge: (lines: ServerLine[]) => call<CartState>("/cart/merge", { method: "POST", body: { lines } }),
  priceGuest: (lines: ServerLine[]) => call<CartState>("/cart/price", { method: "POST", body: { lines }, auth: false }),
  checkoutHandoff: () => call<CheckoutHandoff>("/checkout/handoff", { method: "POST" }),
};
