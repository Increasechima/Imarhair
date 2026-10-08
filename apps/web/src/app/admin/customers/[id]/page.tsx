import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Empty, Table } from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@imarhair/shared/money";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: rows }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.rpc("admin_list_customers", { p_id: id, p_limit: 1 }),
    supabase.from("addresses").select("id, full_name, phone, line1, line2, city, state, country, is_default").eq("user_id", id),
    supabase.from("orders").select("order_number, created_at, total, status").eq("user_id", id).order("created_at", { ascending: false }),
  ]);
  const c = rows?.[0];
  if (!c) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/customers" className="text-small text-taupe hover:underline">
        ← Customers
      </Link>
      <AdminHeader title={c.full_name || c.email} description={`Customer since ${new Date(c.created_at).toLocaleDateString("en-NG", { dateStyle: "long" })}`} />

      <div className="grid gap-8 sm:grid-cols-3">
        <section className="border border-line bg-white p-5">
          <h2 className="text-label text-taupe">Contact</h2>
          <p className="text-small mt-2">
            <a href={`mailto:${c.email}`} className="underline underline-offset-4">
              {c.email}
            </a>
            <br />
            {c.phone ?? "No phone saved"}
          </p>
        </section>
        <section className="border border-line bg-white p-5">
          <h2 className="text-label text-taupe">Lifetime</h2>
          <p className="text-h3 mt-2 tabular-nums">{formatNaira(Number(c.total_spent))}</p>
          <p className="text-small text-taupe">{Number(c.orders_count)} paid orders</p>
        </section>
        <section className="border border-line bg-white p-5">
          <h2 className="text-label text-taupe">Saved addresses</h2>
          {addresses?.length ? (
            <ul className="text-small mt-2 space-y-2">
              {addresses.map((a) => (
                <li key={a.id}>
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state}
                  {a.is_default && <span className="text-taupe"> (default)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small mt-2 text-taupe">None</p>
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-h3 mb-3">Orders</h2>
        {orders?.length ? (
          <Table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_number}>
                  <td>
                    <Link href={`/admin/orders/${o.order_number}`} className="underline underline-offset-4">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="text-taupe">{new Date(o.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                  <td className="tabular-nums">{formatNaira(o.total)}</td>
                  <td>
                    <StatusChip status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No orders yet.</Empty>
        )}
      </section>
    </div>
  );
}
