import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { OrderDelivery, OrderItems, OrderTotals, StatusChip } from "@/components/order/order-details";
import { AwaitPayment, ForgetPurchased } from "@/components/order/confirmation-client";
import { getSessionUser } from "@/lib/supabase/server";
import { getOrderForViewer } from "@/server/privileged/orders";
import { retryPaymentAction } from "@/server/actions/checkout";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

const PAID = new Set(["paid", "processing", "ready_for_dispatch", "shipped", "delivered"]);

// prd.md §6.14. Visible only to the order's owner or the holder of its
// private link (?t=access_token).
export default async function ConfirmationPage(props: PageProps<"/checkout/confirmation/[orderNumber]">) {
  const { orderNumber } = await props.params;
  const sp = await props.searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const payment = typeof sp.payment === "string" ? sp.payment : null;
  const retryError = typeof sp.retry_error === "string" ? sp.retry_error.slice(0, 200) : null;

  const user = await getSessionUser();
  const order = await getOrderForViewer(orderNumber, { token, userId: user?.id });
  if (!order) notFound();

  const paid = PAID.has(order.status);
  const failed =
    order.status === "pending_payment" &&
    (payment === "failed" || payment === "unavailable" || order.latestPaymentStatus === "failed" || order.latestPaymentStatus === "abandoned");
  const confirming = order.status === "pending_payment" && !failed;

  return (
    <div className="container-page py-10 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          {paid && (
            <>
              <CircleCheck className="mx-auto size-10 text-success" strokeWidth={1.25} aria-hidden />
              <h1 className="text-h1 mt-4">Order Confirmed!</h1>
              <p className="text-body-lg mt-3 text-taupe">Thank you for shopping with Imarhair, Queen.</p>
              <p className="text-body mt-1 text-taupe">Your payment was successful and we&rsquo;ve received your order.</p>
              <ForgetPurchased variantIds={order.items.map((i) => i.variantId).filter((v): v is string => Boolean(v))} />
            </>
          )}
          {confirming && (
            <>
              <h1 className="text-h1">Confirming your payment…</h1>
              <p className="text-body mt-3 text-taupe">This usually takes a few seconds. Please don&rsquo;t pay again.</p>
              <AwaitPayment />
            </>
          )}
          {failed && (
            <>
              <CircleAlert className="mx-auto size-10 text-error" strokeWidth={1.25} aria-hidden />
              <h1 className="text-h1 mt-4">
                {payment === "unavailable" ? "Payment is temporarily unavailable" : "Your payment didn't go through"}
              </h1>
              <p className="text-body mt-3 text-taupe">
                Your bag is saved, and we&rsquo;re holding your items for a little while. You can try again now.
              </p>
            </>
          )}
          {order.status === "cancelled" && (
            <>
              <h1 className="text-h1">This order was cancelled</h1>
              <p className="text-body mt-3 text-taupe">
                The payment wasn&rsquo;t completed in time, so the items were released. You haven&rsquo;t been charged.
              </p>
            </>
          )}
          {order.status === "refunded" && <h1 className="text-h1">This order was refunded</h1>}

          <p className="text-label mt-8">Order #{order.orderNumber}</p>
          <div className="mt-3">
            <StatusChip status={order.status} />
          </div>
        </header>

        {retryError && (
          <p role="alert" className="text-small mt-8 border-l-2 border-error bg-white px-4 py-3 text-error">
            {retryError}
          </p>
        )}

        {failed && (
          <form action={retryPaymentAction} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <input type="hidden" name="token" value={order.accessToken} />
            <Button type="submit" size="lg">
              Retry payment · {formatNaira(order.total)}
            </Button>
            <ButtonLink href="/cart" variant="secondary" size="lg">
              Back to bag
            </ButtonLink>
          </form>
        )}

        <section aria-label="Order details" className="mt-12">
          <OrderItems order={order} />
          <OrderTotals order={order} />
        </section>
        <section aria-label="Delivery" className="mt-10 border-t border-line pt-8">
          <OrderDelivery order={order} />
          <p className="text-small mt-6 text-taupe">A confirmation has been sent to {order.email}.</p>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {paid &&
            (order.isGuest ? (
              <ButtonLink href={`/signup?next=${encodeURIComponent("/account/orders")}`}>Create an account to track</ButtonLink>
            ) : (
              <ButtonLink href={`/account/orders/${order.orderNumber}`}>View my order</ButtonLink>
            ))}
          <ButtonLink href="/shop" variant="secondary">
            Continue shopping
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
