import "server-only";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import type { InitializeInput, PaymentProvider, VerifiedPayment } from "./provider";

// DEVELOPMENT ONLY. Simulates a hosted payment page so the whole checkout can
// be exercised without real money or provider keys. serverEnv refuses to
// select it on the live deployment. The "payment page" (/dev/mock-pay) records
// the shopper's choice on the payment row; verify() reads it back, just as a
// real provider's Verify API would report the outcome.

export const mockProvider: PaymentProvider = {
  id: "mock",

  async initialize(input: InitializeInput) {
    const url = new URL("/dev/mock-pay", input.callbackUrl);
    url.searchParams.set("reference", input.reference);
    return { redirectUrl: url.toString() };
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    const { data } = await supabaseAdmin()
      .from("payments")
      .select("amount, currency, raw")
      .eq("reference", reference)
      .maybeSingle();
    const outcome = (data?.raw as { mock_outcome?: string } | null)?.mock_outcome;
    return {
      reference,
      status: outcome === "success" ? "success" : outcome === "failed" ? "failed" : outcome === "abandoned" ? "abandoned" : "pending",
      amountKobo: data?.amount ?? 0,
      currency: data?.currency ?? "NGN",
      channel: "mock",
      paidAt: outcome === "success" ? new Date().toISOString() : undefined,
      providerTransactionId: `mock_${reference}`,
      raw: { mock: true, mock_outcome: outcome ?? null },
    };
  },

  async parseWebhook() {
    return { ok: false, reason: "bad_signature" };
  },
};
