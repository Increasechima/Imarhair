import type { NextRequest } from "next/server";
import { apiAuth, readJson, resultJson, unauthorized } from "@/server/api-auth";
import { mergeIntoCart } from "@/server/cart";

// POST /api/v1/cart/merge { lines }: the app's guest bag → account bag after sign-in.
export async function POST(request: NextRequest) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  const body = (await readJson(request)) as { lines?: unknown } | undefined;
  return resultJson(await mergeIntoCart(auth.db, body?.lines));
}
