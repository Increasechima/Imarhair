import type { NextRequest } from "next/server";
import { apiAuth, readJson, resultJson, unauthorized } from "@/server/api-auth";
import { addToCart } from "@/server/cart";

// POST /api/v1/cart/lines { variantId, quantity }: quantities add up (capped at 10 and stock).
export async function POST(request: NextRequest) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  const body = (await readJson(request)) as { variantId?: unknown; quantity?: unknown } | undefined;
  return resultJson(await addToCart(auth.db, body?.variantId, body?.quantity));
}
