"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

/** Removes purchased items from a guest's local bag once the order is paid. */
export function ForgetPurchased({ variantIds }: { variantIds: string[] }) {
  const { forget, refresh, signedIn } = useCart();
  const key = variantIds.join(",");
  useEffect(() => {
    forget(key ? key.split(",") : []);
    if (signedIn) void refresh(); // account bag was cleared on the server
  }, [key, forget, refresh, signedIn]);
  return null;
}

/** While a payment is still being confirmed, re-check every 2s (up to ~20s). */
export function AwaitPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 10) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [tries, router]);

  if (tries < 10) {
    return (
      <p className="text-small mt-4 flex items-center justify-center gap-2 text-taupe" aria-live="polite">
        <span className="size-3 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" aria-hidden />
        Checking with the payment provider…
      </p>
    );
  }
  return (
    <button type="button" onClick={() => setTries(0)} className="text-label mt-6 inline-flex min-h-11 items-center underline underline-offset-4">
      Check again
    </button>
  );
}
