import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/server/privileged/orders";

// The payment provider sends the shopper back here (?reference=…). We verify
// with the provider before showing anything; the redirect itself proves nothing.
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  if (!reference || !/^[A-Za-z0-9-]{6,80}$/.test(reference)) {
    return NextResponse.redirect(new URL("/cart", request.url));
  }

  try {
    const result = await confirmPayment(reference);
    if (!result.orderNumber) return NextResponse.redirect(new URL("/cart", request.url));
    const url = new URL(`/checkout/confirmation/${result.orderNumber}`, request.url);
    url.searchParams.set("t", result.accessToken!);
    if (result.outcome !== "paid") url.searchParams.set("payment", result.outcome);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("payment callback failed", { reference, message: (e as Error).message });
    return NextResponse.redirect(new URL(`/cart?payment=error`, request.url));
  }
}
