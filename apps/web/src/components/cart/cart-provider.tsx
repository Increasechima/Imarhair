"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSignedIn } from "@/components/auth/session-provider";
import { createClient } from "@/lib/supabase/browser";
import { addLine, guestCartStore, MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart/guest-cart";
import {
  addToAccountCart,
  getCart,
  mergeGuestCart,
  removeFromAccountCart,
  setAccountCartQuantity,
  type CartState,
} from "@/server/actions/cart";
import type { CartView } from "@imarhair/shared/orders";
import { CART_CHANGED_EVENT, cartTopic } from "@imarhair/shared/api";

// The bag (prd.md §6.6–6.7, Architecture.md §8.1).
// - Guests: lines in localStorage (works offline-first, survives reloads).
// - Signed in: Supabase cart_items, so the bag follows the shopper across devices
//   (web and the mobile app). Every write pings a private Realtime topic and
//   each open client re-fetches, so changes show up instantly everywhere.
// - On sign-in: guest lines merge into the account bag (quantities add up).
// Prices/stock are always computed on the server (quote_order).

type CartContextValue = {
  lines: CartLine[];
  count: number;
  /** Server-priced view; null while loading. */
  view: CartView | null;
  signedIn: boolean | null;
  error: string | null;
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  /** Removes lines locally (e.g. after a guest's order is paid). */
  forget: (variantIds: string[]) => void;
  refresh: () => Promise<void>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const EMPTY_VIEW: CartView = { lines: [], subtotal: 0, issues: 0 };

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const toServerLines = (lines: CartLine[]) => lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
const fromState = (s: CartState): CartLine[] => s.lines.map((l) => ({ variantId: l.variant_id, quantity: l.quantity }));
const keyOf = (lines: CartLine[]) => lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");

export function CartProvider({ children }: { children: ReactNode }) {
  const signedIn = useSignedIn();
  const guestLines = useSyncExternalStore(guestCartStore.subscribe, guestCartStore.get, guestCartStore.serverSnapshot);
  const [account, setAccount] = useState<CartState | null>(null);
  const [guestView, setGuestView] = useState<{ key: string; view: CartView } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Bumped on every account-bag write; a background sync that started before
  // a write must not overwrite the newer state it returns.
  const version = useRef(0);
  const loaded = useRef(false);
  const lastSync = useRef(0);

  // Signed-out → signed-in: merge the guest bag into the account bag, then load it.
  useEffect(() => {
    if (signedIn !== true) {
      loaded.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const pending = guestCartStore.get();
      const v = ++version.current;
      const res = pending.length ? await mergeGuestCart(toServerLines(pending)) : await getCart();
      if (cancelled) return;
      if (res.ok) {
        if (pending.length) guestCartStore.set([]);
        if (v === version.current) setAccount(res.data);
        loaded.current = true;
        lastSync.current = Date.now();
        setError(null);
      } else {
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const pullAccount = useCallback(async () => {
    if (signedIn !== true || !loaded.current) return;
    lastSync.current = Date.now();
    const v = version.current;
    const res = await getCart();
    if (res.ok && v === version.current) setAccount(res.data);
  }, [signedIn]);

  // Fallback for missed pings (sleeping laptop, dropped socket): re-sync on
  // every page change and whenever the shopper returns to this tab (throttled).
  const syncAccount = useCallback(async () => {
    if (Date.now() - lastSync.current < 3000) return;
    await pullAccount();
  }, [pullAccount]);

  // Live sync: another device (or this one) changed the bag → re-fetch it.
  // The ping carries no data; prices always come from the server.
  useEffect(() => {
    if (signedIn !== true) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (cancelled || !userId) return;
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(cartTopic(userId), { config: { private: true } })
        .on("broadcast", { event: CART_CHANGED_EVENT }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => void pullAccount(), 250);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [signedIn, pullAccount]);

  useEffect(() => {
    void syncAccount();
  }, [pathname, syncAccount]);

  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === "visible") void syncAccount();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [syncAccount]);

  // Guests: price the local lines on the server whenever they change.
  const guestKey = keyOf(guestLines);
  useEffect(() => {
    if (signedIn !== false || !guestKey) return;
    let cancelled = false;
    getCart(toServerLines(guestCartStore.get())).then((res) => {
      if (cancelled) return;
      if (res.ok) setGuestView({ key: guestKey, view: res.data.view });
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, guestKey]);

  const lines = useMemo(() => (signedIn ? (account ? fromState(account) : []) : guestLines), [signedIn, account, guestLines]);
  const view: CartView | null = signedIn
    ? (account?.view ?? null)
    : !guestKey
      ? EMPTY_VIEW
      : guestView?.key === guestKey
        ? guestView.view
        : null;

  const applyAccount = useCallback((res: Awaited<ReturnType<typeof getCart>>) => {
    version.current++;
    if (res.ok) {
      setAccount(res.data);
      setError(null);
      return true;
    }
    setError(res.error);
    return false;
  }, []);

  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      if (signedIn) return applyAccount(await addToAccountCart(variantId, quantity));
      guestCartStore.set(addLine(guestCartStore.get(), variantId, quantity));
      return true;
    },
    [signedIn, applyAccount],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      const q = Math.max(1, Math.min(MAX_LINE_QUANTITY, quantity));
      if (signedIn) {
        applyAccount(await setAccountCartQuantity(variantId, q));
        return;
      }
      guestCartStore.set(guestCartStore.get().map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)));
    },
    [signedIn, applyAccount],
  );

  const remove = useCallback(
    async (variantId: string) => {
      if (signedIn) {
        applyAccount(await removeFromAccountCart(variantId));
        return;
      }
      guestCartStore.set(guestCartStore.get().filter((l) => l.variantId !== variantId));
    },
    [signedIn, applyAccount],
  );

  const forget = useCallback((variantIds: string[]) => {
    const drop = new Set(variantIds);
    const current = guestCartStore.get();
    if (current.some((l) => drop.has(l.variantId))) {
      guestCartStore.set(current.filter((l) => !drop.has(l.variantId)));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (signedIn) {
      applyAccount(await getCart());
    } else if (guestCartStore.get().length) {
      const res = await getCart(toServerLines(guestCartStore.get()));
      if (res.ok) setGuestView({ key: keyOf(guestCartStore.get()), view: res.data.view });
    }
  }, [signedIn, applyAccount]);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      view,
      signedIn,
      error,
      add,
      setQuantity,
      remove,
      forget,
      refresh,
      drawerOpen,
      setDrawerOpen,
    }),
    [lines, view, signedIn, error, add, setQuantity, remove, forget, refresh, drawerOpen],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
