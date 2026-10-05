import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDelivery, OrderItems, OrderTotals, StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { ORDER_VIEW_SELECT, toOrderView } from "@/lib/orders";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderDetailPage(props: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  if (!/^IMR-\d{8}-\d{3,}$/.test(orderNumber)) notFound();
  const supabase = await createClient();
  // RLS: returns nothing unless this order belongs to the signed-in customer.
  const { data } = await supabase.from("orders").select(ORDER_VIEW_SELECT).eq("order_number", orderNumber).maybeSingle();
  if (!data) notFound();
  const order = toOrderView(data as unknown as Parameters<typeof toOrderView>[0]);

  return (
    <div>
      <Link href="/account/orders" className="text-small text-taupe hover:underline">
        ← All orders
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">Order #{order.orderNumber}</h1>
        <StatusChip status={order.status} />
      </div>
      <p className="text-small mt-2 text-taupe">
        Placed {new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "long" })}
        {order.paidAt && ` · Paid ${new Date(order.paidAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}`}
      </p>

      {order.status === "pending_payment" && (
        <div className="mt-6 border-l-2 border-warning bg-white px-4 py-3">
          <p className="text-small">This order hasn&rsquo;t been paid yet.</p>
          <ButtonLink href={`/checkout/confirmation/${order.orderNumber}?t=${order.accessToken}`} variant="text">
            Complete payment
          </ButtonLink>
        </div>
      )}

      <section aria-label="Items" className="mt-8">
        <OrderItems order={order} />
        <OrderTotals order={order} />
      </section>
      <section aria-label="Delivery" className="mt-10 border-t border-line pt-8">
        <OrderDelivery order={order} />
      </section>
    </div>
  );
}
