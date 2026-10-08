import type { NextRequest } from "next/server";
import { apiAuth, readJson, resultJson, unauthorized } from "@/server/api-auth";
import { removeFromCart, setCartQuantity } from "@/server/cart";

// PATCH /api/v1/cart/lines/:variantId { quantity }
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/v1/cart/lines/[variantId]">) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  const { variantId } = await ctx.params;
  const body = (await readJson(request)) as { quantity?: unknown } | undefined;
  return resultJson(await setCartQuantity(auth.db, variantId, body?.quantity));
}

// DELETE /api/v1/cart/lines/:variantId
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/v1/cart/lines/[variantId]">) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  const { variantId } = await ctx.params;
  return resultJson(await removeFromCart(auth.db, variantId));
}
