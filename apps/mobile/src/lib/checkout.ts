import * as WebBrowser from "expo-web-browser";
import { formatLinesParam, type CartLine } from "@imarhair/shared/cart-lines";
import { api } from "@/lib/api";
import { env } from "@/lib/env";

// Checkout runs on the website (Paystack, pricing, order creation stay in one
// place) inside an in-app browser.
// - Signed in: a single-use sign-in link from /api/v1/checkout/handoff lands
//   on /checkout already signed in, with the account bag.
// - Guest (never forced to sign up): /checkout/from-app carries only variant
//   ids and quantities; the website loads them into its guest bag.
export async function openCheckout(opts: { signedIn: boolean; lines: CartLine[] }): Promise<string | null> {
  let url: string;
  if (opts.signedIn) {
    const res = await api.checkoutHandoff();
    if (!res.ok) return res.error;
    url = res.data.url;
  } else {
    url = `${env.siteUrl}/checkout/from-app?lines=${encodeURIComponent(formatLinesParam(opts.lines))}`;
  }
  await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  return null;
}
