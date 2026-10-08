import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CART_CHANGED_EVENT, cartTopic, type ApiResult, type CartState } from "@imarhair/shared/api";
import { addLine, MAX_LINE_QUANTITY, type CartLine } from "@imarhair/shared/cart-lines";
import type { CartView } from "@imarhair/shared/orders";
import { api } from "@/lib/api";
import { loadGuestLines, saveGuestLines } from "@/lib/guest-cart";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

// The bag, matching the website (prd.md §6.6–6.7, Architecture.md §8.1):
// - Guests: lines on the device, priced by the server.
// - Signed in: the account bag via /api/v1/cart. A private Realtime ping on
//   cart:<user_id> fires on every change from ANY device, and we re-fetch, so
//   adding on the web shows up here instantly (and vice versa).
// - On sign-in: the guest bag merges into the account bag (quantities add up).

type CartValue = {
  lines: CartLine[];
  count: number;
  /** Server-priced view; null while loading. */
  view: CartView | null;
  error: string | null;
  loading: boolean;
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartValue | null>(null);
const EMPTY_VIEW: CartView = { lines: [], subtotal: 0, issues: 0 };

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const toServer = (lines: CartLine[]) => lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
const fromServer = (s: CartState): CartLine[] => s.lines.map((l) => ({ variantId: l.variant_id, quantity: l.quantity }));

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session === undefined ? undefined : (session?.user.id ?? null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [view, setView] = useState<CartView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped on every write; a fetch that started before a write must not
  // overwrite the newer state it returns.
  const version = useRef(0);

  const apply = useCallback((res: ApiResult<CartState>, v = ++version.current) => {
    if (v !== version.current) return res.ok;
    if (res.ok) {
      setLines(fromServer(res.data));
      setView(res.data.view);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
    return res.ok;
  }, []);

  const pull = useCallback(async () => {
    const v = version.current;
    if (userId) {
      apply(await api.cart(), v);
      return;
    }
    const guest = await loadGuestLines();
    if (!guest.length) {
      setLines([]);
      setView(EMPTY_VIEW);
      setLoading(false);
      return;
    }
    setLines(guest);
    const res = await api.priceGuest(toServer(guest));
    if (v !== version.current) return;
    if (res.ok) setView(res.data.view);
    else setError(res.error);
    setLoading(false);
  }, [userId, apply]);

  // Initial load, and signed-out → signed-in: merge the guest bag first.
  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    (async () => {
      if (userId) {
        const guest = await loadGuestLines();
        if (guest.length) {
          const res = await api.merge(toServer(guest));
          if (cancelled) return;
          // Keep the guest bag if the merge failed; it's retried next launch.
          if (res.ok) await saveGuestLines([]);
          apply(res);
          return;
        }
      }
      if (!cancelled) await pull();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pull, apply]);

  // Live sync: any device changed this account's bag → re-fetch.
  useEffect(() => {
    if (!userId) return;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(cartTopic(userId), { config: { private: true } })
        .on("broadcast", { event: CART_CHANGED_EVENT }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => void pull(), 250);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, pull]);

  // Pings can be missed while the app is in the background: re-sync on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void pull();
    });
    return () => sub.remove();
  }, [pull]);

  const writeGuest = useCallback(
    async (next: CartLine[]) => {
      version.current++;
      setLines(next);
      await saveGuestLines(next);
      await pull();
    },
    [pull],
  );

  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      if (userId) return apply(await api.addLine(variantId, quantity));
      await writeGuest(addLine(await loadGuestLines(), variantId, quantity));
      return true;
    },
    [userId, apply, writeGuest],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      const q = Math.max(1, Math.min(MAX_LINE_QUANTITY, quantity));
      if (userId) {
        apply(await api.setQuantity(variantId, q));
        return;
      }
      await writeGuest((await loadGuestLines()).map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)));
    },
    [userId, apply, writeGuest],
  );

  const remove = useCallback(
    async (variantId: string) => {
      if (userId) {
        apply(await api.removeLine(variantId));
        return;
      }
      await writeGuest((await loadGuestLines()).filter((l) => l.variantId !== variantId));
    },
    [userId, apply, writeGuest],
  );

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      view,
      error,
      loading,
      add,
      setQuantity,
      remove,
      refresh: pull,
    }),
    [lines, view, error, loading, add, setQuantity, remove, pull],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
