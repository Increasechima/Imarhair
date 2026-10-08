import "server-only";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import { getPaymentProvider, PaymentProviderError, providerFor } from "@/server/privileged/payments";
import { sendOrderEmail } from "@/server/privileged/email/send";
import { ORDER_VIEW_SELECT, quoteSchema, toOrderView, type OrderView, type Quote } from "@imarhair/shared/orders";
import type { Json } from "@imarhair/shared/database.types";

// Checkout + payment orchestration (Architecture.md §8). Business-critical
// writes happen inside SQL functions; this module validates, calls them, and
// talks to the payment provider. Uses the service role: callers must pass a
// verified user id (or null for guests) — never trust ids from the browser.

export type Line = { variant_id: string; quantity: number };

export async function quote(
  lines: Line[],
  opts: { country?: string | null; state?: string | null; deliveryMethod?: string | null; discountCode?: string | null } = {},
): Promise<Quote> {
  if (lines.length === 0) {
    return {
      lines: [], subtotal: 0, zone: "lagos", delivery: null, delivery_fee: 0, discount: 0,
      discount_code_id: null, discount_error: null, discount_min_subtotal: null, total: 0, issues: 0,
    };
  }
  const { data, error } = await supabaseAdmin().rpc("quote_order", {
    p_lines: lines as unknown as Json,
    p_country: opts.country ?? "NG",
    p_state: opts.state ?? "",
    p_delivery_method: opts.deliveryMethod ?? "", // "" = no delivery method chosen yet
    p_discount_code: opts.discountCode ?? "", // "" = no code
    p_lock: false,
  });
  if (error) throw new Error(`quote_order failed: ${error.message}`);
  return quoteSchema.parse(data);
}

export type NewOrder = {
  userId: string | null;
  email: string;
  contactName: string;
  contactPhone: string;
  shipping: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; country: string };
  deliveryMethod: string;
  discountCode?: string;
  lines: Line[];
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; redirectUrl: string }
  | { ok: false; code: "CHECKOUT_INVALID"; quote: Quote | null }
  | { ok: false; code: "PAYMENT_UNAVAILABLE"; orderNumber: string; accessToken: string };

export async function placeOrder(input: NewOrder, callbackOrigin: string): Promise<PlaceOrderResult> {
  const { data, error } = await supabaseAdmin().rpc("create_pending_order", {
    p_order: {
      user_id: input.userId,
      email: input.email,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      shipping: input.shipping,
      delivery_method: input.deliveryMethod,
      discount_code: input.discountCode || null,
      lines: input.lines,
    } as unknown as Json,
  });

  if (error) {
    if (error.message === "CHECKOUT_INVALID") {
      let parsed: Quote | null = null;
      try {
        parsed = quoteSchema.parse(JSON.parse(error.details ?? "null"));
      } catch {
        parsed = null;
      }
      return { ok: false, code: "CHECKOUT_INVALID", quote: parsed };
    }
    throw new Error(`create_pending_order failed: ${error.message}`);
  }

  const order = data as { order_id: string; order_number: string; access_token: string; email: string; total: number };
  try {
    const redirectUrl = await startPaymentAttempt(
      { id: order.order_id, orderNumber: order.order_number, total: order.total, email: order.email },
      callbackOrigin,
    );
    return { ok: true, orderNumber: order.order_number, redirectUrl };
  } catch (e) {
    console.error("payment initialize failed", { order: order.order_number, message: (e as Error).message });
    return { ok: false, code: "PAYMENT_UNAVAILABLE", orderNumber: order.order_number, accessToken: order.access_token };
  }
}

/** Creates a payments row (one per attempt) and asks the provider for a pay page. */
export async function startPaymentAttempt(
  order: { id: string; orderNumber: string; total: number; email: string },
  callbackOrigin: string,
): Promise<string> {
  const db = supabaseAdmin();
  const provider = getPaymentProvider();
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("order_id", order.id);
  const reference = `${order.orderNumber}-P${(count ?? 0) + 1}`;

  const { error } = await db.from("payments").insert({
    order_id: order.id,
    provider: provider.id,
    reference,
    amount: order.total,
    currency: "NGN",
    status: "initialized",
  });
  if (error) throw new Error(`payment row insert failed: ${error.message}`);

  try {
    const { redirectUrl } = await provider.initialize({
      reference,
      amountKobo: order.total,
      email: order.email,
      callbackUrl: `${callbackOrigin}/checkout/callback`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });
    return redirectUrl;
  } catch (e) {
    await db
      .from("payments")
      .update({ status: "failed", raw: { initialize_error: (e as Error).message.slice(0, 300) } })
      .eq("reference", reference);
    throw e instanceof PaymentProviderError ? e : new PaymentProviderError((e as Error).message);
  }
}

export type ConfirmOutcome = "paid" | "failed" | "pending" | "mismatch" | "not_found";

/**
 * Verifies a payment with the provider (the source of truth) and, on success,
 * marks the order paid via SQL. Safe to call any number of times (callback,
 * webhook, page refresh): mark_order_paid is idempotent and the confirmation
 * email is only sent on the first transition to paid.
 */
export async function confirmPayment(reference: string): Promise<{
  outcome: ConfirmOutcome;
  orderNumber?: string;
  accessToken?: string;
}> {
  const db = supabaseAdmin();
  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, provider, status, orders(order_number, access_token)")
    .eq("reference", reference)
    .maybeSingle();
  if (!payment || !payment.orders) return { outcome: "not_found" };
  const ref = { orderNumber: payment.orders.order_number, accessToken: payment.orders.access_token };

  const verified = await providerFor(payment.provider).verify(reference);

  if (verified.status === "success") {
    const { data: result, error } = await db.rpc("mark_order_paid", {
      p_reference: reference,
      p_amount: verified.amountKobo,
      p_currency: verified.currency,
      p_channel: verified.channel ?? "",
      p_provider_txn: verified.providerTransactionId ?? "",
      p_paid_at: verified.paidAt ?? new Date().toISOString(),
      p_raw: verified.raw as Json,
    });
    if (error) throw new Error(`mark_order_paid failed: ${error.message}`);

    if (result === "paid" || result === "paid_stock_conflict") {
      if (result === "paid_stock_conflict") {
        console.error("ALERT: order paid after its stock ran out — fulfil or refund", { order: ref.orderNumber, reference });
      }
      await sendOrderEmail(payment.order_id, "order_confirmation");
    }
    if (result === "amount_mismatch") {
      console.error("ALERT: payment amount/currency mismatch", { order: ref.orderNumber, reference });
      return { outcome: "mismatch", ...ref };
    }
    return { outcome: result === "not_found" ? "not_found" : "paid", ...ref };
  }

  if (verified.status === "failed" || verified.status === "abandoned") {
    await db
      .from("payments")
      .update({ status: verified.status, raw: verified.raw as Json })
      .eq("id", payment.id)
      .eq("status", "initialized");
    return { outcome: "failed", ...ref };
  }
  return { outcome: "pending", ...ref };
}

function tokensMatch(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Loads an order for its rightful viewer only: the signed-in owner, or anyone
 * holding the order's unguessable access token (guest confirmation links).
 */
export async function getOrderForViewer(
  orderNumber: string,
  viewer: { token?: string | null; userId?: string | null },
): Promise<OrderView | null> {
  if (!/^IMR-\d{8}-\d{3,}$/.test(orderNumber)) return null;
  const { data } = await supabaseAdmin().from("orders").select(ORDER_VIEW_SELECT).eq("order_number", orderNumber).maybeSingle();
  if (!data) return null;
  const order = data as unknown as Parameters<typeof toOrderView>[0];
  const ownsIt = Boolean(viewer.userId && order.user_id === viewer.userId);
  const hasToken = Boolean(viewer.token && tokensMatch(viewer.token, order.access_token));
  return ownsIt || hasToken ? toOrderView(order) : null;
}

/** Retry payment for a still-pending order (stock hold extended or re-taken). */
export async function retryPayment(order: OrderView, callbackOrigin: string): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  if (order.status !== "pending_payment") return { ok: false, error: "This order can no longer be paid." };
  const { error } = await supabaseAdmin().rpc("prepare_payment_retry", { p_order_id: order.id });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "INSUFFICIENT_STOCK"
          ? "Sorry, some items sold out while you were paying. Please return to your bag."
          : "This order can no longer be paid.",
    };
  }
  try {
    const redirectUrl = await startPaymentAttempt(
      { id: order.id, orderNumber: order.orderNumber, total: order.total, email: order.email },
      callbackOrigin,
    );
    return { ok: true, redirectUrl };
  } catch {
    return { ok: false, error: "Payment is temporarily unavailable. Please try again in a moment." };
  }
}
