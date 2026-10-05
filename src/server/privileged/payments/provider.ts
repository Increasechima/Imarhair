import "server-only";

// Provider-agnostic payment interface (Architecture.md §7). The rest of the
// app only talks to this; swapping Paystack for another provider means one
// new implementation file.

export type ProviderId = "paystack" | "mock";

export type InitializeInput = {
  reference: string;
  amountKobo: number;
  email: string;
  callbackUrl: string;
  metadata: { orderId: string; orderNumber: string };
};

export type VerifiedPayment = {
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending";
  amountKobo: number;
  currency: string;
  channel?: string;
  paidAt?: string;
  providerTransactionId?: string;
  /** Already stripped of sensitive fields (card data, authorization codes). */
  raw: Record<string, unknown>;
};

export type WebhookResult =
  | { ok: true; eventId: string; type: "payment.success" | "payment.failed" | "other"; reference: string | null; payload: unknown }
  | { ok: false; reason: "bad_signature" | "unparseable" };

export interface PaymentProvider {
  readonly id: ProviderId;
  initialize(input: InitializeInput): Promise<{ redirectUrl: string; providerTransactionId?: string }>;
  verify(reference: string): Promise<VerifiedPayment>;
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
}

export class PaymentProviderError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
