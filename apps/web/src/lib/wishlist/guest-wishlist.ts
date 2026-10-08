import { createLocalStore, UUID_RE } from "@/lib/local-store";

const EMPTY: string[] = [];

export function sanitizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return EMPTY;
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)))].slice(0, 200);
}

/** Guest wishlist: product ids only. Merged into the account on sign-in. */
export const guestWishlistStore = createLocalStore<string[]>("imar.wishlist.v1", EMPTY, sanitizeIds);
