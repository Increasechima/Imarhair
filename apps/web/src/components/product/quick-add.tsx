"use client";

import { useState, useTransition } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/product/price";
import { VariantChips } from "@/components/product/variant-chips";
import { useAddToBag } from "@/components/product/use-add-to-bag";
import { getQuickAddOptions } from "@/server/actions/catalog";
import { formatNaira } from "@imarhair/shared/money";
import {
  choose,
  findVariant,
  initialVariant,
  optionGroups,
  selectionFor,
  variantLabel,
  type Selection,
} from "@imarhair/shared/catalog/variants";
import type { ProductSummary, VariantOption } from "@imarhair/shared/catalog/types";

// Card "Add to Cart" (prd.md §6.2): one variant → add straight away; several →
// a small picker (bottom sheet on mobile, centred panel on desktop).
export function QuickAdd({ product }: { product: ProductSummary }) {
  const addToBag = useAddToBag();
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<VariantOption[] | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [added, setAdded] = useState(false);

  const comingSoon = product.collectionStatus === "coming_soon";
  const imagePath = product.imagePaths[0] ?? null;

  if (comingSoon || !product.inStock) {
    return (
      <Button variant="secondary" fullWidth disabled className="h-11 lg:h-11">
        {comingSoon ? "Coming soon" : "Sold out"}
      </Button>
    );
  }

  function flashAdded() {
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleClick() {
    if (product.variantCount === 1 && product.defaultVariantId) {
      void addToBag({ variantId: product.defaultVariantId, quantity: 1, name: product.name, imagePath }).then(
        (ok) => ok && flashAdded(),
      );
      return;
    }
    setOpen(true);
    if (variants) return;
    startLoading(async () => {
      const res = await getQuickAddOptions(product.id);
      if (!res.ok) return setError(res.error);
      const start = initialVariant(res.data);
      setVariants(res.data);
      if (start) setSelection(selectionFor(start, optionGroups(res.data)));
    });
  }

  const groups = variants ? optionGroups(variants) : [];
  const variant = variants ? findVariant(variants, selection) : null;
  const canAdd = Boolean(variant && variant.available > 0);

  return (
    <>
      <Button variant="secondary" fullWidth onClick={handleClick} className="h-11 lg:h-11" aria-haspopup={product.variantCount > 1 ? "dialog" : undefined}>
        {added ? "✓ Added" : "Add to Cart"}
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade-in_250ms_var(--ease-out)]" />
          <Dialog.Content
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto bg-ivory p-4 pb-6 shadow-(--shadow-overlay) data-[state=open]:animate-[rise-in_350ms_var(--ease-out)] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-h3">{product.name}</Dialog.Title>
                <Dialog.Description className="sr-only">Choose options and add to your bag</Dialog.Description>
                <Price
                  className="mt-1"
                  label={variant ? formatNaira(variant.price) : formatNaira(product.minPrice)}
                  compareAt={variant?.compareAtPrice ? formatNaira(variant.compareAtPrice) : null}
                />
              </div>
              <Dialog.Close aria-label="Close" className="-m-2 inline-flex size-11 shrink-0 items-center justify-center">
                <X className="size-5" strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <div className="mt-6 min-h-24">
              {error ? (
                <p className="text-small text-error">{error}</p>
              ) : loading || !variants ? (
                <div className="flex gap-2" aria-label="Loading options">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-11 w-14 animate-pulse bg-sand" />
                  ))}
                </div>
              ) : (
                <VariantChips
                  groups={groups}
                  variants={variants}
                  selection={selection}
                  onChoose={(k, v) => setSelection(choose(variants, selection, k, v))}
                  idPrefix={`qa-${product.id}`}
                />
              )}
            </div>

            <Button
              fullWidth
              className="mt-6"
              disabled={!canAdd}
              onClick={() => {
                if (!variant) return;
                setOpen(false);
                void addToBag({
                  variantId: variant.id,
                  quantity: 1,
                  name: product.name,
                  variantLabel: variantLabel(variant),
                  imagePath,
                }).then((ok) => ok && flashAdded());
              }}
            >
              {variant && variant.available === 0 ? "Sold out" : "Add to Cart"}
            </Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
