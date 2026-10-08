import "server-only";
import { siteUrl } from "@/lib/env";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import type { SessionUser } from "@/lib/supabase/server";

/**
 * One-time sign-in link that opens the website's checkout as the app's
 * signed-in shopper (the in-app browser has no website cookie).
 *
 * - The user comes ONLY from a verified access token (see api-auth.ts), never
 *   from the request body, and the generated link must belong to that user id.
 * - generateLink sends no email. The token is single-use and short-lived
 *   (Supabase's email OTP expiry) and is redeemed by our own /auth/confirm,
 *   which sets the session cookie server-side and redirects to /checkout.
 * - No access or refresh token ever appears in a URL.
 */
export async function createCheckoutHandoff(user: SessionUser): Promise<string | null> {
  if (!user.email) return null;
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (error || !data.properties?.hashed_token || data.user?.id !== user.id) {
    console.error("checkout handoff failed", { code: error?.code, mismatch: data?.user?.id !== user.id });
    return null;
  }
  const url = new URL("/auth/confirm", siteUrl);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", "/checkout");
  return url.toString();
}
