import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { serverEnv } from "@/server/env";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import { mockPaymentDecision } from "@/server/actions/checkout";
import { formatNaira } from "@imarhair/shared/money";

export const metadata: Metadata = { title: "Test payment", robots: { index: false, follow: false } };
// Decided per request: never prerender (the build environment refuses mocks).
export const dynamic = "force-dynamic";

// DEVELOPMENT ONLY stand-in for the provider's hosted payment page.
// 404s unless PAYMENT_PROVIDER=mock (which is refused on the live site).
export default async function MockPayPage(props: PageProps<"/dev/mock-pay">) {
  let enabled = false;
  try {
    enabled = serverEnv.paymentProvider === "mock";
  } catch {
    enabled = false;
  }
  if (!enabled) notFound();

  const { reference } = await props.searchParams;
  if (typeof reference !== "string") notFound();
  const { data: payment } = await supabaseAdmin()
    .from("payments")
    .select("amount, status, orders(order_number, email)")
    .eq("reference", reference)
    .eq("provider", "mock")
    .maybeSingle();
  if (!payment) notFound();

  return (
    <div className="container-page flex flex-1 items-center justify-center py-16">
      <div className="w-full max-w-sm border border-dashed border-warning bg-white p-6 text-center">
        <p className="text-label text-warning">Test mode · no real money</p>
        <h1 className="text-h2 mt-4">{formatNaira(payment.amount)}</h1>
        <p className="text-small mt-2 text-taupe">
          Order #{payment.orders?.order_number} · {payment.orders?.email}
        </p>
        <form action={mockPaymentDecision} className="mt-8 flex flex-col gap-3">
          <input type="hidden" name="reference" value={reference} />
          <Button type="submit" name="outcome" value="success" fullWidth>
            Pay successfully
          </Button>
          <Button type="submit" name="outcome" value="failed" variant="secondary" fullWidth>
            Simulate a declined payment
          </Button>
          <Button type="submit" name="outcome" value="abandoned" variant="text">
            Cancel and go back
          </Button>
        </form>
        <p className="text-small mt-6 text-stone">Reference {reference}</p>
      </div>
    </div>
  );
}
