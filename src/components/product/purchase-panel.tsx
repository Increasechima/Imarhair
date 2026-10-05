"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/product/price";
import { VariantChips } from "@/components/product/variant-chips";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { WishlistButton } from "@/components/product/wishlist-button";
import { useAddToBag } from "@/components/product/use-add-to-bag";
import { formatNaira } from "@/lib/money";
import {
  choose,
  findVariant,
  initialVariant,
  maxQuantity,
  optionGroups,
  selectionFor,
  variantLabel,
  type Selection,
} from "@/lib/catalog/variants";
import type { VariantOption } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

// prd.md §6.5 purchase section: variant chips, live price, stock message,
// quantity, ADD TO CART / BUY NOW, sticky mobile bar.
export function PurchasePanel({
  productId,
  productName,
  imagePath,
  variants,
  comingSoon,
}: {
  productId: string;
  productName: string;
  imagePath: string | null;
  variants: VariantOption[];
  comingSoon: boolean;
}) {
  const router = useRouter();
  const addToBag = useAddToBag();
  const groups = optionGroups(variants);
  const [selection, setSelection] = useState<Selection>(() => {
    const start = initialVariant(variants);
    return start ? selectionFor(start, groups) : {};
  });
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const variant = findVariant(variants, selection);
  const max = maxQuantity(variant);
  const soldOut = !variant || variant.available === 0;
  const qty = Math.min(quantity, Math.max(1, max));

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [adding, setAdding] = useState(false);

  async function add() {
    if (!variant || soldOut || adding) return false;
    setAdding(true);
    const ok = await addToBag({ variantId: variant.id, quantity: qty, name: productName, variantLabel: variantLabel(variant), imagePath });
    setAdding(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
    return ok;
  }

  const price = variant ? formatNaira(variant.price) : formatNaira(Math.min(...variants.map((v) => v.price)));
  const compareAt = variant?.compareAtPrice && variant.compareAtPrice > variant.price ? formatNaira(variant.compareAtPrice) : null;

  const stockMessage = comingSoon
    ? "Coming soon"
    : soldOut
      ? "Sold out"
      : variant!.available <= 3
        ? `Only ${variant!.available} left`
        : "In stock";

  const addLabel = comingSoon ? "Coming soon" : soldOut ? "Sold out" : added ? "✓ Added" : "Add to Cart";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <Price label={price} compareAt={compareAt} size="lg" />
        <WishlistButton productId={productId} productName={productName} className="-mt-2 -mr-2" />
      </div>

      {groups.length > 0 && (
        <div className="mt-8">
          <VariantChips
            groups={groups}
            variants={variants}
            selection={selection}
            onChoose={(k, v) => setSelection(choose(variants, selection, k, v))}
            idPrefix="pdp"
          />
        </div>
      )}

      <p
        className={cn(
          "text-small mt-6 flex items-center gap-2",
          soldOut || comingSoon ? "text-error" : variant!.available <= 3 ? "text-warning" : "text-success",
        )}
        aria-live="polite"
      >
        <span className="size-1.5 rounded-pill bg-current" aria-hidden />
        {stockMessage}
      </p>

      <div ref={ctaRef} className="mt-6 flex flex-col gap-3">
        {!soldOut && !comingSoon && (
          <div className="flex items-center gap-4">
            <span className="text-label">Quantity</span>
            <QuantityStepper value={qty} max={max} onChange={setQuantity} />
          </div>
        )}
        <Button size="lg" fullWidth disabled={soldOut || comingSoon} onClick={add} loading={adding} className="mt-2">
          {addLabel}
        </Button>
        {!soldOut && !comingSoon && (
          <Button
            size="lg"
            variant="secondary"
            fullWidth
            onClick={() => {
              void add().then((ok) => ok && router.push("/checkout"));
            }}
          >
            Buy Now
          </Button>
        )}
      </div>

      {/* Sticky mobile purchase bar once the main button scrolls away. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur-sm transition-transform duration-(--duration-base) ease-(--ease-out) lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-small truncate text-taupe">{variant ? variantLabel(variant) || productName : productName}</p>
            <p className="text-price">{price}</p>
          </div>
          <Button disabled={soldOut || comingSoon} onClick={add} tabIndex={showSticky ? 0 : -1} className="shrink-0">
            {addLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
