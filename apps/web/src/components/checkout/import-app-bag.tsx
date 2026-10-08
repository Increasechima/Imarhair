"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CartLine } from "@imarhair/shared/cart-lines";
import { guestCartStore } from "@/lib/cart/guest-cart";

/** Replaces this browser's guest bag with the app's, then opens checkout. */
export function ImportAppBag({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  useEffect(() => {
    // DECISION: replace rather than add, so checkout shows exactly the app's bag.
    guestCartStore.set(lines);
    router.replace(lines.length ? "/checkout" : "/cart");
  }, [lines, router]);

  return (
    <p className="container-page text-body py-16 text-taupe" role="status">
      Opening checkout…
    </p>
  );
}
