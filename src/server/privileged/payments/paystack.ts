import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";
import {
  PaymentProviderError,
  type InitializeInput,
  type PaymentProvider,
  type VerifiedPayment,
  type WebhookResult,
} from "./provider";

const API = "https://api.paystack.co";

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };
type PaystackTransaction = {
  id: number;
  status: string; // success | failed | abandoned | ongoing | pending | processing | queued | reversed
  reference: string;
  amount: number; // kobo
  currency: string;
  channel?: string;
  paid_at?: string | null;
  gateway_response?: string;
  fees?: number | null;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${serverEnv.paystackSecretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PaymentProviderError("Could not reach Paystack");
  }
  const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !body?.status) {
    throw new PaymentProviderError(`Paystack ${path.split("/")[2]} failed: ${body?.message ?? res.status}`, res.status >= 500);
  }
  return body.data;
}

/** Whitelist of non-sensitive fields kept in payments.raw (never card data). */
function sanitize(t: PaystackTransaction): Record<string, unknown> {
  return {
    id: t.id,
    status: t.status,
    reference: t.reference,
    amount: t.amount,
    currency: t.currency,
    channel: t.channel ?? null,
    paid_at: t.paid_at ?? null,
    gateway_response: t.gateway_response ?? null,
    fees: t.fees ?? null,
  };
}

function mapStatus(s: string): VerifiedPayment["status"] {
  if (s === "success") return "success";
  if (s === "failed" || s === "reversed") return "failed";
  if (s === "abandoned") return "abandoned";
  return "pending";
}

export const paystack: PaymentProvider = {
  id: "paystack",

  async initialize(input: InitializeInput) {
    const data = await call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { order_id: input.metadata.orderId, order_number: input.metadata.orderNumber },
      }),
    });
    return { redirectUrl: data.authorization_url };
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    const t = await call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
    return {
      reference: t.reference,
      status: mapStatus(t.status),
      amountKobo: t.amount,
      currency: t.currency,
      channel: t.channel,
      paidAt: t.paid_at ?? undefined,
      providerTransactionId: String(t.id),
      raw: sanitize(t),
    };
  },

  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    // HMAC-SHA512 of the raw body with the secret key, constant-time compare.
    const signature = headers.get("x-paystack-signature") ?? "";
    const expected = createHmac("sha512", serverEnv.paystackSecretKey).update(rawBody).digest("hex");
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad_signature" };

    let event: { event?: string; data?: PaystackTransaction };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "unparseable" };
    }
    const data = event.data;
    const type =
      event.event === "charge.success" ? "payment.success" : event.event === "charge.failed" ? "payment.failed" : "other";
    return {
      ok: true,
      eventId: `${event.event ?? "unknown"}:${data?.id ?? data?.reference ?? "?"}`,
      type,
      reference: data?.reference ?? null,
      payload: { event: event.event, data: data ? sanitize(data) : null },
    };
  },
};
