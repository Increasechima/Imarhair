import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

// prd.md §6.15 — RLS limits this to the signed-in customer's own orders.
export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("order_number, total, status, created_at, order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-h1 mb-8">Orders</h1>
      {orders && orders.length > 0 ? (
        <ul className="border-t border-line">
          {orders.map((o) => {
            const items = o.order_items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.order_number} className="border-b border-line">
                <Link href={`/account/orders/${o.order_number}`} className="flex min-h-20 items-center justify-between gap-4 py-4 hover:bg-white/60">
                  <span>
                    <span className="text-body block font-medium">Order #{o.order_number}</span>
                    <span className="text-small text-taupe">
                      {new Date(o.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {items}{" "}
                      {items === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-2">
                    <span className="text-price">{formatNaira(o.total)}</span>
                    <StatusChip status={o.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-10">
          <p className="text-body text-taupe">You haven&rsquo;t placed an order yet.</p>
          <ButtonLink href="/shop" className="mt-6">
            Shop hair
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
