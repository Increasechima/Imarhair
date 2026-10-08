import type { Metadata } from "next";
import { parseLinesParam } from "@imarhair/shared/cart-lines";
import { ImportAppBag } from "@/components/checkout/import-app-bag";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

// The mobile app opens this in an in-app browser for GUEST checkout: the bag
// (variant ids + quantities only, never prices) becomes this browser's guest
// bag, then we continue to /checkout, which prices everything on the server.
// Signed-in app shoppers use /api/v1/checkout/handoff instead.
export default async function FromAppPage({ searchParams }: PageProps<"/checkout/from-app">) {
  const { lines } = await searchParams;
  return <ImportAppBag lines={parseLinesParam(typeof lines === "string" ? lines : null)} />;
}
