import type { NextRequest } from "next/server";
import { readJson, resultJson } from "@/server/api-auth";
import { priceGuestLines } from "@/server/cart";

// POST /api/v1/cart/price { lines }: prices a guest's bag (kept on the device). Stores nothing.
export async function POST(request: NextRequest) {
  const body = (await readJson(request)) as { lines?: unknown } | undefined;
  return resultJson(await priceGuestLines(body?.lines));
}
