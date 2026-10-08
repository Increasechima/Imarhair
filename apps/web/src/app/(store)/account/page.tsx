import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { createClient, getProfile } from "@/lib/supabase/server";
import { formatNaira } from "@imarhair/shared/money";
import { ORDER_STATUS_LABEL as statusLabel } from "@imarhair/shared/orders";
import { BagSummary } from "@/components/account/bag-summary";
import { ProductGrid } from "@/components/product/product-card";
import { getProductsByIds } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

// prd.md §6.10: welcome, recent orders, current bag, wishlist.
export default async function AccountPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const [{ data: orders }, { data: saved }] = await Promise.all([
    supabase.from("orders").select("order_number, total, status, created_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("wishlist_items").select("product_id").order("added_at", { ascending: false }).limit(4),
  ]);
  const wishlist = await getProductsByIds((saved ?? []).map((s) => s.product_id));

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div>
      <h1 className="text-h1">Welcome back, Queen.</h1>
      {firstName && <p className="text-body mt-2 text-taupe">Signed in as {firstName}.</p>}

      <section className="mt-12" aria-labelledby="recent-orders">
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <h2 id="recent-orders" className="text-h3">
            Recent orders
          </h2>
          {orders && orders.length > 0 && (
            <Link href="/account/orders" className="text-label underline underline-offset-4">
              View all
            </Link>
          )}
        </div>

        {orders && orders.length > 0 ? (
          <ul>
            {orders.map((order) => (
              <li key={order.order_number} className="border-b border-line">
                <Link
                  href={`/account/orders/${order.order_number}`}
                  className="flex min-h-16 items-center justify-between gap-4 py-4"
                >
                  <span>
                    <span className="text-body block font-medium">Order #{order.order_number}</span>
                    <span className="text-small text-taupe">
                      {new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} ·{" "}
                      {statusLabel[order.status] ?? order.status}
                    </span>
                  </span>
                  <span className="text-price">{formatNaira(Number(order.total))}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10">
            <p className="text-body text-taupe">You haven&rsquo;t placed an order yet.</p>
            <ButtonLink href="/shop" className="mt-6">
              Shop hair
            </ButtonLink>
          </div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="bag-h">
        <h2 id="bag-h" className="text-h3 border-b border-line pb-3">
          Your bag
        </h2>
        <BagSummary />
      </section>

      <section className="mt-12" aria-labelledby="wishlist-h">
        <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
          <h2 id="wishlist-h" className="text-h3">
            Wishlist
          </h2>
          {wishlist.length > 0 && (
            <Link href="/account/wishlist" className="text-label underline underline-offset-4">
              View all
            </Link>
          )}
        </div>
        {wishlist.length ? (
          <ProductGrid products={wishlist} />
        ) : (
          <p className="text-body text-taupe">Save the looks you love. Tap the heart on any product.</p>
        )}
      </section>
    </div>
  );
}
