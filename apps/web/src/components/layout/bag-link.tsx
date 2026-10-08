"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

// Header bag icon with item count (Style.md §5: a bag, not a cart). Opens the
// drawer; still a real link to /cart for new tabs and no-JS.
export function BagLink({ className }: { className?: string }) {
  const { count, setDrawerOpen } = useCart();
  return (
    <Link
      href="/cart"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setDrawerOpen(true);
      }}
      aria-label={count ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag"}
      aria-haspopup="dialog"
      className={className}
    >
      <span className="relative inline-flex">
        <ShoppingBag className="size-5 lg:size-6" strokeWidth={1.5} />
        {count > 0 && (
          <span className="text-badge absolute -top-1.5 -right-2 inline-flex size-4.5 items-center justify-center rounded-pill bg-ink tracking-normal text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
    </Link>
  );
}
