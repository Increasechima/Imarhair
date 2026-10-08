import type { NextRequest } from "next/server";
import { apiAuth, resultJson, unauthorized } from "@/server/api-auth";
import { loadAccountCart } from "@/server/cart";

// GET /api/v1/cart: the signed-in shopper's bag, priced on the server.
export async function GET(request: NextRequest) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  return resultJson(await loadAccountCart(auth.db));
}
