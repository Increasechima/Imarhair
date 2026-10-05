"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  productName,
  className,
  onImage = false,
}: {
  productId: string;
  productName: string;
  className?: string;
  /** Adds a soft backing so the heart stays visible on dark photos. */
  onImage?: boolean;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={cn(
        "inline-flex size-11 items-center justify-center text-ink transition-colors duration-(--duration-fast)",
        className,
      )}
    >
      {onImage && <span className="absolute size-8 rounded-pill bg-ivory/85" aria-hidden />}
      <Heart
        className={cn("relative", onImage ? "size-4.5" : "size-5", saved && "fill-gold text-gold")}
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  );
}
