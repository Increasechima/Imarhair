"use client";

import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatNaira } from "@/lib/money";

/** Account home: what's in the bag right now (prd.md §6.10). */
export function BagSummary() {
  const { count, view, setDrawerOpen } = useCart();
  if (count === 0) {
    return <p className="text-body py-6 text-taupe">Your bag is empty.</p>;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-5">
      <p className="text-body">
        {count} {count === 1 ? "item" : "items"}
        {view && <span className="text-taupe"> · {formatNaira(view.subtotal)}</span>}
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          View bag
        </Button>
        <ButtonLink href="/checkout">Checkout</ButtonLink>
      </div>
    </div>
  );
}
