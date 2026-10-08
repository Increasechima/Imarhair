import type { CartView } from "./orders";

// Contract for the web app's /api/v1 routes, used by the mobile app.
// Authenticated routes take `Authorization: Bearer <supabase access token>`.
//
//   GET    /api/v1/cart                       → ApiResult<CartState>   (auth)
//   POST   /api/v1/cart/lines                 { variantId, quantity }  (auth)
//   PATCH  /api/v1/cart/lines/:variantId      { quantity }             (auth)
//   DELETE /api/v1/cart/lines/:variantId                               (auth)
//   POST   /api/v1/cart/merge                 { lines: ServerLine[] }  (auth) guest bag → account bag
//   POST   /api/v1/cart/price                 { lines: ServerLine[] }  guest bag pricing, stores nothing
//   POST   /api/v1/checkout/handoff           → ApiResult<{ url }>     (auth) one-time web checkout sign-in
//
// Every cart response is the whole bag, priced on the server.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type ServerLine = { variant_id: string; quantity: number };
export type CartState = { lines: ServerLine[]; view: CartView };
export type CheckoutHandoff = { url: string };

/** Realtime topic that announces changes to a user's bag (payload carries no bag data). */
export const cartTopic = (userId: string) => `cart:${userId}`;
export const CART_CHANGED_EVENT = "changed";
