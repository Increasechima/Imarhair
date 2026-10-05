import { createLocalStore, UUID_RE } from "@/lib/local-store";

// Guest bag (Architecture.md §8.1): only variant ids and quantities are kept
// in the browser. Prices and stock always come from the server.
export type CartLine = { variantId: string; quantity: number };

export const MAX_LINE_QUANTITY = 10;
export const MAX_LINES = 50;

const EMPTY: CartLine[] = [];

export function sanitizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return EMPTY;
  const merged = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { variantId, quantity } = item as Record<string, unknown>;
    if (typeof variantId !== "string" || !UUID_RE.test(variantId)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    merged.set(variantId, Math.min(MAX_LINE_QUANTITY, (merged.get(variantId) ?? 0) + quantity));
  }
  return [...merged].slice(0, MAX_LINES).map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Adds quantity to a line (or creates it), capped at the per-line maximum. */
export function addLine(lines: CartLine[], variantId: string, quantity: number): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) {
    return lines.map((l) =>
      l.variantId === variantId ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l,
    );
  }
  return sanitizeLines([...lines, { variantId, quantity }]);
}

export const guestCartStore = createLocalStore<CartLine[]>("imar.cart.v1", EMPTY, sanitizeLines);
