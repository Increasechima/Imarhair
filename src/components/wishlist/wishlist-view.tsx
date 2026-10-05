"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { getWishlistProducts } from "@/server/actions/wishlist";
import type { ProductSummary } from "@/lib/catalog/types";

// Shared by /wishlist (guests) and /account/wishlist (signed in).
export function WishlistView() {
  const { ids, ready, signedIn } = useWishlist();
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [error, setError] = useState(false);
  const key = [...ids].sort().join(",");

  useEffect(() => {
    if (!ready || !key) return;
    let cancelled = false;
    getWishlistProducts(key.split(",")).then((res) => {
      if (cancelled) return;
      if (res.ok) setProducts(res.data);
      else setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, ready]);

  if (error) {
    return <p className="text-body text-error">We couldn&rsquo;t load your wishlist. Please refresh the page.</p>;
  }
  const empty = ready && !key;
  if (!empty && (!ready || products === null)) return <ProductGridSkeleton count={4} />;

  // Keep removed items out immediately (ids update before the refetch lands).
  const visible = empty ? [] : (products ?? []).filter((p) => ids.has(p.id));
  if (visible.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-h3">Save the looks you love.</p>
        <p className="text-body mt-2 text-taupe">Tap the heart on any product to keep it here.</p>
        <ButtonLink href="/shop" className="mt-8">
          Shop hair
        </ButtonLink>
      </div>
    );
  }
  return (
    <>
      {signedIn === false && (
        <p className="text-small mb-6 text-taupe">
          Your wishlist is saved on this device.{" "}
          <Link href="/login?next=/account/wishlist" className="text-ink underline underline-offset-4">
            Sign in
          </Link>{" "}
          to keep it on all your devices.
        </p>
      )}
      <ProductGrid products={visible} />
    </>
  );
}
