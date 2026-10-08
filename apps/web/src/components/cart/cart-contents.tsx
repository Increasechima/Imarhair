"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { ProductImage } from "@/components/product/product-image";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { ButtonLink } from "@/components/ui/button";
import { formatNaira } from "@imarhair/shared/money";
import { ISSUE_MESSAGE } from "@imarhair/shared/orders";
import { cn } from "@/lib/utils";

// Shared by the cart drawer and /cart (prd.md §6.6).
export function CartContents({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { view, count, setQuantity, remove, error } = useCart();

  if (!view) {
    return (
      <div className="flex flex-col gap-6 py-6" aria-busy aria-label="Loading your bag">
        {[0, 1].map((i) => (
          <div key={i} className="flex animate-pulse gap-4">
            <div className="aspect-4/5 w-20 bg-sand" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 bg-sand" />
              <div className="h-3 w-1/2 bg-sand" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view.lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-h3">Your bag is empty.</p>
        <p className="text-body mt-2 text-taupe">Find something you love. It&rsquo;ll wait here for you.</p>
        <ButtonLink href="/shop" className="mt-8" onClick={onNavigate}>
          Shop hair
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {error && (
        <p role="alert" className="text-small mb-4 text-error">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line" aria-label={`Bag, ${count} items`}>
        {view.lines.map((line) => {
          const max = Math.max(1, Math.min(10, line.available || line.quantity));
          return (
            <li key={line.variantId} className="flex gap-4 py-5">
              <Link href={line.slug ? `/shop/${line.slug}` : "/shop"} onClick={onNavigate} className={cn("shrink-0", compact ? "w-20" : "w-24")} tabIndex={-1} aria-hidden>
                <ProductImage path={line.imagePath} alt="" sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {line.slug ? (
                      <Link href={`/shop/${line.slug}`} onClick={onNavigate} className="text-body font-medium hover:underline">
                        {line.productName}
                      </Link>
                    ) : (
                      <p className="text-body font-medium text-stone">Unavailable item</p>
                    )}
                    {line.variantLabel && <p className="text-small mt-0.5 text-taupe">{line.variantLabel}</p>}
                  </div>
                  <p className="text-price shrink-0">{line.unitPrice != null ? formatNaira(line.lineTotal) : "—"}</p>
                </div>

                {line.issue && (
                  <p className="text-small mt-2 flex items-start gap-1.5 text-error">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                    {ISSUE_MESSAGE[line.issue](line.available)}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  {line.issue === "unavailable" || line.issue === "sold_out" ? (
                    <span />
                  ) : (
                    <QuantityStepper
                      value={line.quantity}
                      max={max}
                      onChange={(q) => void setQuantity(line.variantId, q)}
                      label={`Quantity for ${line.productName}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(line.variantId)}
                    className="text-small inline-flex min-h-11 items-center text-taupe underline underline-offset-4 hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="mt-6 space-y-2">
        <div className="text-body flex justify-between">
          <dt className="text-taupe">Subtotal</dt>
          <dd className="text-price">{formatNaira(view.subtotal)}</dd>
        </div>
        <div className="text-body flex justify-between">
          <dt className="text-taupe">Delivery</dt>
          <dd className="text-small text-taupe">Calculated at checkout</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3">
          <dt className="text-body font-medium">Total</dt>
          <dd className="text-price">{formatNaira(view.subtotal)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3">
        {view.issues > 0 ? (
          <p className="text-small text-error" role="status">
            Update the highlighted items to continue.
          </p>
        ) : null}
        <ButtonLink
          href="/checkout"
          fullWidth
          size="lg"
          onClick={onNavigate}
          aria-disabled={view.issues > 0 || undefined}
          className={cn(view.issues > 0 && "pointer-events-none bg-sand text-stone")}
        >
          Checkout
        </ButtonLink>
        <ButtonLink href="/shop" variant="text" onClick={onNavigate} className="self-center">
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}
