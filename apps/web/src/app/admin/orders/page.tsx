import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, adminInput, Empty, Pager, Table } from "@/components/admin/admin-ui";
import { StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@imarhair/shared/money";
import { ORDER_STATUS_LABEL } from "@imarhair/shared/orders";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 25;
const OPEN = ["paid", "processing", "ready_for_dispatch"] as const;

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\w@.\- ]/g, "").trim().slice(0, 80) : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("order_number, created_at, contact_name, email, total, status, delivery_method_name, shipping_state", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status === "open") query = query.in("status", [...OPEN]);
  else if (status in ORDER_STATUS_LABEL) query = query.eq("status", status as "paid");
  if (q) query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%,contact_name.ilike.%${q}%`);
  const { data: orders, count } = await query;

  const href = (p: number) => `/admin/orders?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(p) })}`;

  return (
    <div>
      <AdminHeader title="Orders" description="Search by order number, email or name." />
      <form className="mb-4 flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="IMR-20261005-001, email or name" className={`${adminInput} max-w-xs`} aria-label="Search orders" />
        <select name="status" defaultValue={status} className={`${adminInput} max-w-56`} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="open">To fulfil (paid → ready)</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="text-small h-10 border border-ink px-4">
          Filter
        </button>
      </form>

      {orders?.length ? (
        <Table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Delivery</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.order_number}>
                <td>
                  <Link href={`/admin/orders/${o.order_number}`} className="font-medium underline underline-offset-4">
                    {o.order_number}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-taupe">
                  {new Date(o.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td>
                  {o.contact_name}
                  <span className="block text-taupe">{o.email}</span>
                </td>
                <td className="text-taupe">
                  {o.delivery_method_name}
                  <span className="block">{o.shipping_state}</span>
                </td>
                <td className="tabular-nums">{formatNaira(o.total)}</td>
                <td>
                  <StatusChip status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No orders match.</Empty>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={count ?? 0} href={href} />
    </div>
  );
}
