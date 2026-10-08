import Link from "next/link";
import { AdminHeader, Empty, Table } from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@imarhair/shared/money";

type Dashboard = {
  today_orders: number;
  today_revenue: number;
  week_orders: number;
  week_revenue: number;
  needs_action: number;
  awaiting_payment: number;
  low_stock: { variant_id: string; product_id: string; product_name: string; sku: string; variant_label: string; available: number }[];
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [{ data }, { data: queue }] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase
      .from("orders")
      .select("order_number, contact_name, total, status, paid_at")
      .in("status", ["paid", "processing", "ready_for_dispatch"])
      .order("paid_at", { ascending: true })
      .limit(10),
  ]);
  const d = data as Dashboard | null;

  const stats = [
    { label: "Paid today", value: d ? `${d.today_orders} · ${formatNaira(Number(d.today_revenue))}` : "—" },
    { label: "Last 7 days", value: d ? `${d.week_orders} · ${formatNaira(Number(d.week_revenue))}` : "—" },
    { label: "To fulfil", value: d?.needs_action ?? "—", href: "/admin/orders?status=open" },
    { label: "Awaiting payment", value: d?.awaiting_payment ?? "—", href: "/admin/orders?status=pending_payment" },
  ];

  return (
    <div>
      <AdminHeader title="Dashboard" />
      <dl className="grid grid-cols-2 border border-line lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-line p-4 even:border-l lg:border-l lg:first:border-l-0 [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0">
            <dt className="text-label text-taupe">{s.label}</dt>
            <dd className="text-h3 mt-2 tabular-nums">
              {s.href ? (
                <Link href={s.href} className="hover:underline">
                  {s.value}
                </Link>
              ) : (
                s.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3 mb-3">Orders to fulfil</h2>
          {queue?.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((o) => (
                  <tr key={o.order_number}>
                    <td>
                      <Link href={`/admin/orders/${o.order_number}`} className="underline underline-offset-4">
                        {o.order_number}
                      </Link>
                    </td>
                    <td>{o.contact_name}</td>
                    <td className="tabular-nums">{formatNaira(o.total)}</td>
                    <td>
                      <StatusChip status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>Nothing waiting. Paid orders appear here until they ship.</Empty>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-3">Low stock</h2>
          {d?.low_stock.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {d.low_stock.map((v) => (
                  <tr key={v.variant_id}>
                    <td>
                      <Link href={`/admin/products/${v.product_id}`} className="underline underline-offset-4">
                        {v.product_name}
                      </Link>
                    </td>
                    <td className="text-taupe">{v.variant_label || v.sku}</td>
                    <td className={v.available === 0 ? "font-medium text-error" : "text-warning"}>{v.available === 0 ? "Sold out" : v.available}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>All published variants are well stocked.</Empty>
          )}
          <Link href="/admin/inventory?low=1" className="text-small mt-3 inline-block underline underline-offset-4">
            Manage stock
          </Link>
        </section>
      </div>
    </div>
  );
}
