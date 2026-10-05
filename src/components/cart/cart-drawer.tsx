"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { CartContents } from "@/components/cart/cart-contents";

// Style.md §6: slides in from the right; 420px on desktop, full screen on mobile.
export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, count, refresh } = useCart();
  const pathname = usePathname();

  // Close on navigation; refresh live stock/prices whenever it opens.
  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen]);
  useEffect(() => {
    if (drawerOpen) void refresh();
  }, [drawerOpen, refresh]);

  return (
    <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade-in_250ms_var(--ease-out)]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-ivory shadow-(--shadow-overlay) sm:max-w-md data-[state=open]:animate-[slide-in-right_350ms_var(--ease-out)]">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
            <Dialog.Title className="text-label">Your bag ({count})</Dialog.Title>
            <Dialog.Description className="sr-only">Items in your bag</Dialog.Description>
            <Dialog.Close aria-label="Close bag" className="-mr-2.5 inline-flex size-11 items-center justify-center">
              <X className="size-6" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6">
            <CartContents compact onNavigate={() => setDrawerOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
