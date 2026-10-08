import type { NextRequest } from "next/server";
import { apiAuth, json, unauthorized } from "@/server/api-auth";
import { createCheckoutHandoff } from "@/server/privileged/checkout-handoff";
import { rateLimit } from "@/server/privileged/rate-limit";

// POST /api/v1/checkout/handoff → { url }: open it in the in-app browser to
// land on the website's checkout already signed in. See checkout-handoff.ts.
export async function POST(request: NextRequest) {
  const auth = await apiAuth(request);
  if (!auth) return unauthorized();
  if (!(await rateLimit("checkoutHandoff", auth.user.id))) {
    return json({ ok: false, error: "Too many attempts. Please wait a few minutes and try again." }, 429);
  }
  const url = await createCheckoutHandoff(auth.user);
  if (!url) return json({ ok: false, error: "We couldn't open checkout. Please try again." }, 500);
  return json({ ok: true, data: { url } });
}
