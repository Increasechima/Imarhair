"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSignedIn } from "@/components/auth/session-provider";
import { guestWishlistStore } from "@/lib/wishlist/guest-wishlist";
import { getMyWishlistIds, mergeGuestWishlist, toggleWishlistItem } from "@/server/actions/wishlist";
import { useToast } from "@/components/ui/toast";

type WishlistContextValue = {
  ids: ReadonlySet<string>;
  /** null until we know whether the shopper is signed in. */
  signedIn: boolean | null;
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

// Guests: product ids in localStorage. Signed in: Supabase wishlist_items.
// On sign-in, guest ids are merged into the account and cleared (prd.md §6.8).
export function WishlistProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const guestIds = useSyncExternalStore(
    guestWishlistStore.subscribe,
    guestWishlistStore.get,
    guestWishlistStore.serverSnapshot,
  );
  const signedIn = useSignedIn();
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const ready = signedIn === false || (signedIn === true && accountLoaded);

  // On the signed-out → signed-in edge: merge the guest list, then load the account's.
  useEffect(() => {
    if (signedIn !== true) return;
    let cancelled = false;
    (async () => {
      const pending = guestWishlistStore.get();
      if (pending.length) {
        const merged = await mergeGuestWishlist(pending);
        if (merged.ok) guestWishlistStore.set([]);
      }
      const res = await getMyWishlistIds();
      if (cancelled) return;
      setAccountIds(res.ok ? res.data : []);
      setAccountLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const toggle = useCallback(
    (productId: string) => {
      if (!signedIn) {
        const current = guestWishlistStore.get();
        guestWishlistStore.set(
          current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
        );
        return;
      }
      // Optimistic, rolled back if the server says no.
      const wasSaved = accountIds.includes(productId);
      setAccountIds((ids) => (wasSaved ? ids.filter((id) => id !== productId) : [...ids, productId]));
      void toggleWishlistItem(productId).then((res) => {
        if (!res.ok) {
          setAccountIds((ids) => (wasSaved ? [...ids, productId] : ids.filter((id) => id !== productId)));
          toast({ title: "Couldn't update your wishlist", description: "Please try again.", tone: "error" });
        }
      });
    },
    [signedIn, accountIds, toast],
  );

  const value = useMemo(() => {
    const ids = new Set(signedIn ? accountIds : guestIds);
    return { ids, signedIn, ready, has: (id: string) => ids.has(id), toggle };
  }, [signedIn, accountIds, guestIds, ready, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
