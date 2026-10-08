import { EMPTY_LINES, sanitizeLines, type CartLine } from "@imarhair/shared/cart-lines";
import { secureStorage } from "@/lib/secure-storage";

// Guest bag kept on the device (same shape and rules as the website's
// localStorage bag). Only variant ids and quantities; prices come from the server.
const KEY = "imar.cart.v1";

export async function loadGuestLines(): Promise<CartLine[]> {
  try {
    const raw = await secureStorage.getItem(KEY);
    return raw ? sanitizeLines(JSON.parse(raw)) : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

export async function saveGuestLines(lines: CartLine[]): Promise<void> {
  if (lines.length) await secureStorage.setItem(KEY, JSON.stringify(lines));
  else await secureStorage.removeItem(KEY);
}
