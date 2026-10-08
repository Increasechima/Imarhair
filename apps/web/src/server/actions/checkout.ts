"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { confirmPayment, getOrderForViewer, placeOrder, quote, retryPayment, type Line } from "@/server/privileged/orders";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import { serverEnv } from "@/server/env";
import { callbackOrigin } from "@/server/request-origin";
import { rateLimit } from "@/server/privileged/rate-limit";
import { checkoutSchema, guestLinesSchema, type CheckoutInput } from "@imarhair/shared/validation/checkout";
import { fieldErrors, type FieldErrors } from "@imarhair/shared/validation/auth";
import { toCartView, type CartView, type Quote } from "@imarhair/shared/orders";

async function linesFor(guestLines: unknown): Promise<Line[] | null> {
  if (await getSessionUser()) {
    const supabase = await createClient();
    const { data } = await supabase.from("cart_items").select("variant_id, quantity").order("added_at");
    return (data ?? []).map((r) => ({ variant_id: r.variant_id, quantity: r.quantity }));
  }
  const parsed = guestLinesSchema.safeParse(guestLines ?? []);
  return parsed.success ? parsed.data : null;
}

export type CheckoutQuote = {
  view: CartView;
  subtotal: number;
  deliveryFee: number;
  deliveryName: string | null;
  deliveryEta: string | null;
  discount: number;
  discountError: Quote["discount_error"];
  discountMinSubtotal: number | null;
  total: number;
  issues: number;
};

const quoteInput = z.object({
  country: z.string().max(2).optional(),
  state: z.string().max(80).optional(),
  deliveryMethod: z.string().max(40).optional(),
  discountCode: z.string().max(40).optional(),
});

/** Live order summary for the checkout page — the same SQL pricing the order uses. */
export async function quoteCheckout(
  rawInput: z.input<typeof quoteInput>,
  guestLines?: Line[],
): Promise<{ ok: true; data: CheckoutQuote } | { ok: false; error: string }> {
  const input = quoteInput.safeParse(rawInput);
  const lines = await linesFor(guestLines);
  if (!input.success || !lines) return { ok: false, error: "Invalid checkout." };
  try {
    const q = await quote(lines, {
      country: input.data.country,
      state: input.data.state,
      deliveryMethod: input.data.deliveryMethod,
      discountCode: input.data.discountCode,
    });
    return {
      ok: true,
      data: {
        view: toCartView(q),
        subtotal: q.subtotal,
        deliveryFee: q.delivery_fee,
        deliveryName: q.delivery?.name ?? null,
        deliveryEta: q.delivery?.eta_text ?? null,
        discount: q.discount,
        discountError: q.discount_error,
        discountMinSubtotal: q.discount_min_subtotal,
        total: q.total,
        issues: q.issues,
      },
    };
  } catch (e) {
    console.error("quoteCheckout failed", (e as Error).message);
    return { ok: false, error: "We couldn't calculate your total. Please try again." };
  }
}

export type PlaceOrderState =
  | { status: "error"; message: string; fieldErrors?: FieldErrors; stockChanged?: boolean }
  | { status: "redirect"; url: string };

/**
 * PAY NOW. Validates, re-prices and reserves stock in one SQL transaction,
 * then starts a payment and returns the provider's payment page URL.
 * The order only becomes Paid after server-side verification.
 */
export async function placeOrderAction(input: CheckoutInput, guestLines?: Line[]): Promise<PlaceOrderState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const user = await getSessionUser();
  const lines = await linesFor(guestLines);
  if (!lines?.length) return { status: "error", message: "Your bag is empty." };

  const d = parsed.data;
  if (!(await rateLimit("placeOrder"))) {
    return { status: "error", message: "Too many checkout attempts. Please wait a few minutes and try again." };
  }
  let result;
  try {
    result = await placeOrder(
      {
        userId: user?.id ?? null,
        email: user?.email ?? d.email,
        contactName: d.fullName,
        contactPhone: d.phone,
        shipping: { name: d.fullName, phone: d.phone, line1: d.line1, line2: d.line2, city: d.city, state: d.state, country: d.country },
        deliveryMethod: d.deliveryMethod,
        discountCode: d.discountCode || undefined,
        lines,
      },
      await callbackOrigin(),
    );
  } catch (e) {
    console.error("placeOrder failed", (e as Error).message);
    return { status: "error", message: "Something went wrong placing your order. You have not been charged. Please try again." };
  }

  if (!result.ok && result.code === "CHECKOUT_INVALID") {
    const q = result.quote;
    if (q?.discount_error) {
      return { status: "error", message: "That discount code can't be used.", fieldErrors: { discountCode: "This code isn't valid for your order." } };
    }
    if (q && !q.delivery) {
      return { status: "error", message: "Choose a delivery option.", fieldErrors: { deliveryMethod: "Choose a delivery option." } };
    }
    return {
      status: "error",
      stockChanged: true,
      message: "Some items in your bag just changed (price or stock). Please review your bag and try again.",
    };
  }
  if (!result.ok) {
    // Order exists and stock is held; the shopper can retry from the order page.
    return {
      status: "redirect",
      url: `/checkout/confirmation/${result.orderNumber}?t=${result.accessToken}&payment=unavailable`,
    };
  }

  if (user && d.saveAddress) await saveAddress(user.id, d).catch(() => undefined);
  return { status: "redirect", url: result.redirectUrl };
}

async function saveAddress(userId: string, d: z.output<typeof checkoutSchema>) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("addresses")
    .select("id")
    .eq("line1", d.line1)
    .eq("city", d.city)
    .eq("state", d.state)
    .limit(1);
  if (existing?.length) return;
  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  await supabase.from("addresses").insert({
    user_id: userId,
    full_name: d.fullName,
    phone: d.phone,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    state: d.state,
    country: d.country,
    is_default: !count,
  });
}

/** "Retry payment" on the confirmation page (form action). */
export async function retryPaymentAction(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const token = String(formData.get("token") ?? "");
  const user = await getSessionUser();
  const order = await getOrderForViewer(orderNumber, { token, userId: user?.id });
  if (!order) redirect("/");
  const result = await retryPayment(order, await callbackOrigin());
  if (!result.ok) {
    redirect(`/checkout/confirmation/${order.orderNumber}?t=${order.accessToken}&retry_error=${encodeURIComponent(result.error)}`);
  }
  redirect(result.redirectUrl);
}

/** DEVELOPMENT ONLY: the mock payment page's Pay / Fail buttons. */
export async function mockPaymentDecision(formData: FormData) {
  if (serverEnv.paymentProvider !== "mock") redirect("/");
  const reference = String(formData.get("reference") ?? "");
  const outcome = formData.get("outcome") === "success" ? "success" : formData.get("outcome") === "abandoned" ? "abandoned" : "failed";
  await supabaseAdmin()
    .from("payments")
    .update({ raw: { mock: true, mock_outcome: outcome } })
    .eq("reference", reference)
    .eq("provider", "mock")
    .eq("status", "initialized");
  // Same verification path as /checkout/callback, but redirect straight to a
  // page (a server-action redirect to a route handler confuses the client router).
  const result = await confirmPayment(reference);
  if (!result.orderNumber) redirect("/cart");
  const qs = new URLSearchParams({ t: result.accessToken! });
  if (result.outcome !== "paid") qs.set("payment", result.outcome);
  redirect(`/checkout/confirmation/${result.orderNumber}?${qs}`);
}
