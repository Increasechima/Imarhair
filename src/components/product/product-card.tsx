import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/product/price";
import { WishlistButton } from "@/components/product/wishlist-button";
import { QuickAdd } from "@/components/product/quick-add";
import { attributeLine, priceDisplay, productBadge } from "@/lib/catalog/format";
import type { ProductSummary } from "@/lib/catalog/types";

export const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

// Style.md §6 Product card: no border, no shadow, no rounded corners.
export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const href = `/shop/${product.slug}`;
  const price = priceDisplay(product);
  const badge = productBadge(product);
  const attrs = attributeLine(product);
  const [first, second] = product.imagePaths;

  return (
    <article className="group flex w-full min-w-0 flex-col">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <ProductImage path={first} alt={product.imageAlts[0] ?? product.name} sizes={CARD_SIZES} priority={priority} />
          {second && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-out) [@media(hover:hover)]:group-hover:opacity-100">
              <ProductImage path={second} alt="" sizes={CARD_SIZES} />
            </div>
          )}
        </Link>
        {badge && (
          <span className="pointer-events-none absolute top-3 left-3 text-badge bg-white px-2 py-1 text-ink">
            {badge}
          </span>
        )}
        <WishlistButton productId={product.id} productName={product.name} onImage className="absolute top-1 right-1" />
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-body font-medium">
          <Link href={href} className="hover:underline hover:decoration-1 hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>
        {attrs && <p className="text-small mt-0.5 line-clamp-2 text-taupe">{attrs}</p>}
        <Price className="mt-1.5" label={price.label} compareAt={price.compareAt} />
        <div className="mt-auto pt-3">
          <QuickAdd product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 lg:gap-x-6" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="animate-[pulse_1.6s_ease-in-out_infinite]">
          <div className="aspect-4/5 bg-sand" />
          <div className="mt-3 h-4 w-3/4 bg-sand" />
          <div className="mt-2 h-3 w-1/2 bg-sand" />
          <div className="mt-2 h-4 w-1/3 bg-sand" />
        </li>
      ))}
    </ul>
  );
}
