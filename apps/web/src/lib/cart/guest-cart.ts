import { createLocalStore } from "@/lib/local-store";
import { EMPTY_LINES, sanitizeLines, type CartLine } from "@imarhair/shared/cart-lines";

export { addLine, MAX_LINE_QUANTITY, MAX_LINES, sanitizeLines, type CartLine } from "@imarhair/shared/cart-lines";

// Guest bag (Architecture.md §8.1), kept in localStorage.
export const guestCartStore = createLocalStore<CartLine[]>("imar.cart.v1", EMPTY_LINES, sanitizeLines);
