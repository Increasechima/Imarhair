"use client";

import { useCallback } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/product/product-image";

/** Adds to the bag and shows "Added to your bag" (Taste.md microcopy). */
export function useAddToBag() {
  const { add, setDrawerOpen } = useCart();
  const toast = useToast();

  return useCallback(
    async (item: { variantId: string; quantity: number; name: string; variantLabel?: string; imagePath?: string | null }) => {
      const ok = await add(item.variantId, item.quantity);
      if (!ok) {
        toast({ title: "Couldn't add to your bag", description: "Please try again.", tone: "error" });
        return false;
      }
      toast({
        title: "Added to your bag",
        description: [item.name, item.variantLabel].filter(Boolean).join(" · "),
        media: <ProductImage path={item.imagePath} alt="" sizes="56px" />,
        actions: [{ label: "View Cart", onClick: () => setDrawerOpen(true), primary: true }, { label: "Continue Shopping" }],
      });
      return true;
    },
    [add, setDrawerOpen, toast],
  );
}
