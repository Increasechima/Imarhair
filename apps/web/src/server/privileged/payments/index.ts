import "server-only";
import { serverEnv } from "@/server/env";
import { mockProvider } from "./mock";
import { paystack } from "./paystack";
import type { PaymentProvider, ProviderId } from "./provider";

export type { PaymentProvider, ProviderId, VerifiedPayment } from "./provider";
export { PaymentProviderError } from "./provider";

/** The provider new payments are started with (PAYMENT_PROVIDER). */
export function getPaymentProvider(): PaymentProvider {
  return serverEnv.paymentProvider === "mock" ? mockProvider : paystack;
}

/** The provider a stored payment was made with (payments.provider). */
export function providerFor(id: string): PaymentProvider {
  if (id === "paystack") return paystack;
  if (id === "mock") {
    // Still gated: mock payments can't be verified where mocks are forbidden.
    if (serverEnv.paymentProvider !== "mock") throw new Error("Mock payments are disabled here.");
    return mockProvider;
  }
  throw new Error(`Unknown payment provider ${id}`);
}

export const PROVIDER_IDS: ProviderId[] = ["paystack", "mock"];
